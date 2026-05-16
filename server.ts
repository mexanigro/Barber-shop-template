import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Resend } from "resend";
import type { Request, Response, NextFunction, Express } from "express";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// ─── Startup Diagnostics ──────────────────────────────────────────────────────
// Runs once at boot. Logs which integrations are active vs unconfigured so
// developers cloning the template immediately know what still needs setup.
function logStartupStatus() {
  const tag = "[Template Setup]";
  const checks = [
    { key: process.env.GEMINI_API_KEY,         label: "GEMINI_API_KEY",          feature: "AI chat & style consultation" },
    { key: process.env.STRIPE_SECRET_KEY,       label: "STRIPE_SECRET_KEY",       feature: "Stripe payments" },
    { key: process.env.STRIPE_WEBHOOK_SECRET,   label: "STRIPE_WEBHOOK_SECRET",   feature: "Stripe webhook verification" },
    { key: process.env.VITE_STRIPE_PUBLISHABLE_KEY, label: "VITE_STRIPE_PUBLISHABLE_KEY", feature: "Stripe frontend" },
    { key: process.env.EMAIL_PROVIDER_API_KEY,  label: "EMAIL_PROVIDER_API_KEY",  feature: "Email notifications (Resend)" },
    { key: process.env.BUSINESS_OWNER_EMAIL,    label: "BUSINESS_OWNER_EMAIL",    feature: "Notification recipient" },
    { key: process.env.VITE_ADMIN_EMAIL,        label: "VITE_ADMIN_EMAIL",        feature: "Admin panel access" },
    { key: CLIENT_ID,                           label: "CLIENT_ID / NEXT_PUBLIC_CLIENT_ID", feature: "Tenant scoping" },
  ];

  console.log(`\n${tag} ─── Service Configuration Status ───`);
  let allGood = true;
  for (const { key, label, feature } of checks) {
    if (key && key.trim() !== "") {
      console.log(`  ✓  ${label.padEnd(32)} → ${feature}`);
    } else {
      console.warn(`  ✗  ${label.padEnd(32)} → ${feature} (DISABLED — add key to .env)`);
      allGood = false;
    }
  }
  if (allGood) {
    console.log(`${tag} All integrations configured.\n`);
  } else {
    console.warn(`${tag} Some features are disabled. See above for missing keys.\n`);
  }
}

const GEMINI_REST_MODEL = "gemini-2.5-flash";
const GEMINI_REST_BASE = "https://generativelanguage.googleapis.com/v1beta";

type GeminiChatPart = { role: "user" | "model"; parts: { text: string }[] };
type ClientStatus = "active" | "suspended" | "trial" | "maintenance" | "archived";
type PaymentProvider = "stripe" | "meshulam" | "yaadpay" | "authorize_net" | "square" | "other";

// Server + Vercel serverless: prefer explicit CLIENT_ID; VITE_* is build-time in some hosts and may be missing at runtime in /api.
const CLIENT_ID =
  process.env.CLIENT_ID?.trim() ||
  process.env.NEXT_PUBLIC_CLIENT_ID?.trim() ||
  process.env.VITE_CLIENT_ID?.trim() ||
  "";

let clientStateCache: { status: ClientStatus; provider: PaymentProvider; expiresAt: number } | null = null;

// ─── Firebase Admin SDK ───────────────────────────────────────────────────────
// Used server-side only (kill-switch, notification logs, contact inbox).
// getAdminApps() guard prevents re-initialization on Vercel hot reloads.
async function getAdminDb() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  console.log("[Admin SDK] PROJECT_ID:", !!projectId, "CLIENT_EMAIL:", !!clientEmail, "PRIVATE_KEY:", !!privateKey);
  if (!projectId || !clientEmail || !privateKey) return null;
  // Dynamic imports: firebase-admin is loaded on first call, not at module init.
  // This prevents the package from hanging the Vercel serverless cold start.
  const { initializeApp: initAdminApp, getApps: getAdminApps, cert } = await import("firebase-admin/app");
  const { getFirestore: getAdminFirestore } = await import("firebase-admin/firestore");
  const app =
    getAdminApps().length > 0
      ? getAdminApps()[0]!
      : initAdminApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const databaseId =
    process.env.FIREBASE_DATABASE_ID?.trim() ||
    process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
    "default";
  return getAdminFirestore(app, databaseId);
}

async function getClientRuntimeState(): Promise<{ status: ClientStatus; provider: PaymentProvider }> {
  const now = Date.now();
  if (clientStateCache && clientStateCache.expiresAt > now) {
    return { status: clientStateCache.status, provider: clientStateCache.provider };
  }
  try {
    const db = await getAdminDb();
    if (!db) {
      console.warn("[Tenant Guard] Admin SDK not configured — skipping kill-switch check, defaulting to active.");
      return { status: "active", provider: "stripe" };
    }
    // Admin SDK uses gRPC (not WebSockets) — no hanging in serverless cold starts.
    const snap = await db.collection("clients").doc(CLIENT_ID).get();
    const status = (snap.exists ? (snap.data()?.status as ClientStatus | undefined) : undefined) ?? "active";
    const providerRaw =
      (snap.exists ? (snap.data()?.defaultPaymentProvider as PaymentProvider | undefined) : undefined)
      ?? (process.env.PAYMENT_PROVIDER as PaymentProvider | undefined)
      ?? "stripe";
    const provider: PaymentProvider = ["stripe", "meshulam", "yaadpay", "authorize_net", "square", "other"].includes(providerRaw)
      ? providerRaw : "stripe";
    clientStateCache = { status, provider, expiresAt: now + 30_000 };
    return { status, provider };
  } catch (error) {
    console.error("[Tenant Guard] Failed to read client status:", error);
    return { status: "active", provider: "stripe" };
  }
}

function sanitizeText(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/\s+/g, " ").slice(0, maxLen);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value);
}

function isLikelyPhone(value: string): boolean {
  return /^[+\d()\-\s]{6,20}$/.test(value);
}

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return String(fwd[0]);
  return req.socket.remoteAddress ?? "unknown";
}

const RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000);
const RATE_LIMIT_MAX_PER_WINDOW = Number(process.env.API_RATE_LIMIT_MAX ?? 60);
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${ip}:${req.path}`;
  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (existing.count >= RATE_LIMIT_MAX_PER_WINDOW) {
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }
  existing.count += 1;
  return next();
}

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
}

function getAllowedOrigins(): Set<string> {
  const set = new Set<string>();
  if (process.env.NODE_ENV !== "production") {
    set.add("http://localhost:3000");
    set.add("http://127.0.0.1:3000");
  }
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) set.add(appUrl.replace(/\/+$/, ""));
  // VERCEL_PROJECT_PRODUCTION_URL is the production alias (e.g. my-app.vercel.app)
  // and matches the origin the browser actually sends. VERCEL_URL is the
  // deployment-specific hostname which usually differs from the production alias.
  for (const envKey of ["VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const) {
    const raw = process.env[envKey]?.trim();
    if (raw) {
      const host = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
      set.add(`https://${host}`);
    }
  }
  const extra = process.env.ALLOWED_ORIGINS?.trim();
  if (extra) {
    for (const o of extra.split(/[\s,]+/)) {
      const u = o.replace(/\/+$/, "");
      if (u) set.add(u);
    }
  }
  return set;
}

function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const origin = req.headers.origin;
  if (!origin) return next(); // native apps / same-origin non-browser clients

  const allowed = getAllowedOrigins();
  const normalizedOrigin = origin.replace(/\/+$/, "");
  if (allowed.has(normalizedOrigin)) return next();

  console.warn(`[Security] Blocked request from untrusted origin: ${normalizedOrigin}`);
  return res.status(403).json({ error: "Untrusted origin." });
}

function resolveRequestClientId(req: Request): string {
  const headerClientId = sanitizeText(req.headers["x-client-id"], 120);
  return headerClientId || CLIENT_ID;
}

function attachTenantContext(req: Request, res: Response, next: NextFunction) {
  const requestClientId = resolveRequestClientId(req);
  if (requestClientId !== CLIENT_ID) {
    return res.status(403).json({ error: "Tenant mismatch." });
  }
  res.setHeader("X-Client-Id", CLIENT_ID);
  next();
}

async function enforceClientActive(_req: Request, res: Response, next: NextFunction) {
  console.log("[enforceClientActive] calling getClientRuntimeState");
  const { status } = await getClientRuntimeState();
  console.log("[enforceClientActive] status:", status);
  if (status === "suspended" || status === "archived") {
    return res.status(423).json({ error: `Tenant is ${status}. Service is blocked.` });
  }
  next();
}

async function geminiGenerateContent(
  apiKey: string,
  opts: {
    contents: GeminiChatPart[];
    systemInstruction?: string;
    responseMimeType?: "application/json";
    temperature?: number;
  },
): Promise<string> {
  const url = `${GEMINI_REST_BASE}/models/${GEMINI_REST_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: {
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Awaited<ReturnType<typeof globalThis.fetch>>;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!res.ok) {
    throw new Error(data?.error?.message ?? res.statusText);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null || text === "") {
    throw new Error("Empty response from model");
  }
  return text;
}

let stripeInstance: Stripe | null = null;
const getStripe = (): Stripe | null => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.trim() === "") {
    return null;
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia" as any,
    });
  }
  return stripeInstance;
};

let resendInstance: Resend | null = null;
const getResend = () => {
  if (!resendInstance && process.env.EMAIL_PROVIDER_API_KEY) {
    resendInstance = new Resend(process.env.EMAIL_PROVIDER_API_KEY);
  }
  return resendInstance;
};

function buildCrmInsightPrompt(
  kpis: Record<string, unknown>,
  recentAppointments: unknown[],
  businessContext?: { services?: { name: string; duration: number; price: number }[]; staff?: { name: string; specialty: string }[] },
  uiLanguage?: string,
): string {
  const lang = uiLanguage === "he" ? "Hebrew" : uiLanguage === "ru" ? "Russian" : "English";

  const servicesBlock = businessContext?.services?.length
    ? `\nSERVICES OFFERED:\n${businessContext.services.map(s => `  - ${s.name}: ${s.duration}min, $${s.price}`).join("\n")}`
    : "";

  const staffBlock = businessContext?.staff?.length
    ? `\nSTAFF:\n${businessContext.staff.map(s => `  - ${s.name} (${s.specialty})`).join("\n")}`
    : "";

  return `You are an experienced business consultant analyzing a local service business (salon, barbershop, tattoo studio, aesthetics clinic, or similar).

Your job is to give the business owner SHORT, PRACTICAL, IMMEDIATELY ACTIONABLE advice they can use TODAY. You are talking to someone who may not have business training — use simple, direct language.

RULES:
- NEVER state the obvious. "You need more clients" or "cancellations hurt revenue" is useless — the owner already knows that.
- Instead, give SPECIFIC actions: what to do, when, and the expected effect.
- Each opportunity should be a concrete step, not a vague observation. Example: "Offer a 10% discount on Tuesday afternoons — your data shows Tuesdays have 60% fewer bookings than other weekdays" instead of "Consider filling slow periods."
- If metrics look bad, don't dwell on how bad they are. Jump straight to the fix.
- If metrics look good, suggest how to push further (raise prices, add premium services, expand hours on peak days).
- Base every suggestion on the actual data provided. Reference specific numbers, days, services, or staff members.
- Keep language warm and encouraging. This is a partner helping them grow, not an auditor pointing out failures.
- Answer in ${lang}.

PERIOD METRICS:
${JSON.stringify(kpis, null, 2)}
${servicesBlock}${staffBlock}

RECENT APPOINTMENTS (sample, up to 20):
${JSON.stringify(recentAppointments.slice(0, 20), null, 2)}

ANALYSIS GUIDELINES:
1. Look at which days/times have most bookings vs gaps — suggest specific schedule moves
2. Look at which services are popular vs underbooked — suggest bundles, combos, or pricing tweaks
3. Look at cancellation patterns — if specific days/services/staff have higher cancel rates, suggest fixes (reminders, deposits, rescheduling offers)
4. Look at staff utilization — if one staff member handles 70%+ of bookings, suggest load balancing or highlight them as a marketing asset
5. Look at new vs returning customer ratio — suggest retention tactics (loyalty discounts, rebooking at checkout) or acquisition tactics (referral incentives, social proof)
6. If there are very few bookings, focus on quick wins to get the first 10-20 clients (not generic "marketing" advice — specific channels that work for local service businesses)

OUTPUT FORMAT (JSON only, no prose outside the object):
{
  "summary": "1-2 sentence encouraging overall assessment with a specific highlight (e.g. 'Your Thursday bookings are strong — 40% of your revenue comes from that day alone')",
  "opportunities": ["specific actionable opportunity 1", "specific actionable opportunity 2", "specific actionable opportunity 3"],
  "churnRisk": "specific observation about cancellation patterns with a concrete suggestion to reduce them. If cancellations are low, say so positively and suggest how to keep it that way"
}`;
}

function buildStrategicAnalysisPrompt(
  appointments: unknown[],
  staff: { name?: string }[],
  services: { name?: string }[],
): string {
  return `You are a strategic operations advisor for a local service business. Give the owner 3-4 specific, actionable insights based on the data below. Be direct and practical — every suggestion should be something they can implement this week.

DATA:
- Total Appointments: ${appointments.length}
- Staff: ${staff.map((s) => s.name).join(", ")}
- Services: ${services.map((s) => s.name).join(", ")}

RECENT APPOINTMENTS:
${JSON.stringify(appointments.slice(0, 20), null, 2)}

ANALYSIS FOCUS:
1. Find peak time clusters and suggest how to maximize them (extend availability, add staff, premium pricing)
2. Find schedule gaps and suggest specific fills (targeted promotions on slow days, bundle offers)
3. Identify top services and suggest upsell combos (pair popular + underbooked services)
4. Check staff load balance and suggest redistribution if one person carries too much

RULES:
- Reference actual days, times, services, and staff names from the data
- Never give generic advice like "improve marketing" — say exactly what to do
- Keep each insight to 1-2 sentences max

OUTPUT FORMAT (JSON only):
{
  "status": "1-sentence snapshot of current operations health",
  "insights": [
    { "title": "Short title (5 words max)", "description": "Specific tactical advice referencing actual data", "impact": "High/Medium/Low" }
  ],
  "tacticalMetric": "One key number from the data that tells the story (e.g. '73% of bookings happen Mon-Wed')"
}`;
}

function buildStyleConsultationPrompt(userDescription: string, services: { name?: string; description?: string }[]): string {
  const safeQuote = JSON.stringify(userDescription ?? "");
  return `
      You are a world-class Style & Services Consultant.
      A customer is describing what they want: ${safeQuote}
      
      Our services: ${services.map((s) => `${s.name} (${s.description})`).join(" | ")}
      
      Suggest the best matching service and explain WHY in a brief, cool, "Mission Control" style tone.
      Limit response to 2 sentences.
      
      OUTPUT:
      {
        "serviceId": "id of the best service",
        "advice": "Cool tactical advice",
        "confidence": 0.95
      }
    `;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialized Notification Helpers
const sendNotification = async (subject: string, data: any, type: 'booking' | 'contact') => {
  // CONFIGURATION RECOVERY: These values should be provided via Environment Secrets
  const ownerEmail = process.env.BUSINESS_OWNER_EMAIL;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
  const resend = getResend();

  const toEmail = type === 'booking' 
    ? (process.env.BOOKING_NOTIFICATION_EMAIL || ownerEmail)
    : (process.env.CONTACT_NOTIFICATION_EMAIL || ownerEmail);

  if (!toEmail) {
    console.error("[Notification Layer] CRITICAL: No recipient email configured. Please set BUSINESS_OWNER_EMAIL.");
    writeNotificationLog({
      type,
      recipient: "(none)",
      subject,
      status: "failed",
      error: "No recipient email configured (set BUSINESS_OWNER_EMAIL or type-specific env).",
    });
    return { status: 'error', error: 'No recipient email' };
  }

  console.log(`[Notification Layer] Processing ${type} notification...`);
  
  let html = "";
  if (type === 'booking') {
    html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h2 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;">New Booking Request</h2>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Appointment ID:</strong> ${escapeHtml(data.appointmentId || 'N/A')}</p>
          <p><strong>Staff:</strong> ${escapeHtml(data.details?.staff || 'N/A')}</p>
          <p><strong>Service:</strong> ${escapeHtml(data.details?.service || 'N/A')}</p>
          <p><strong>Date:</strong> ${escapeHtml(data.details?.date || 'N/A')}</p>
          <p><strong>Time:</strong> ${escapeHtml(data.details?.time || 'N/A')}</p>
        </div>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 8px;">Customer Details</h3>
          <p style="margin: 4px 0;"><strong>Name:</strong> ${escapeHtml(data.details?.customerName || 'N/A')}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${escapeHtml(data.details?.customerPhone || 'N/A')}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(data.details?.customerEmail || 'N/A')}</p>
        </div>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This notification was sent automatically from your website template.</p>
      </div>
    `;
  } else {
    html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h2 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;">New Website Inquiry</h2>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>From:</strong> ${escapeHtml(data.name)} (&lt;${escapeHtml(data.email)}&gt;)</p>
          <p><strong>Subject:</strong> ${escapeHtml(data.subject || 'General Inquiry')}</p>
        </div>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap;">
          <strong>Message:</strong><br/>
          ${escapeHtml(data.message)}
        </div>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This notification was sent automatically from your website template.</p>
      </div>
    `;
  }

  if (!resend) {
    console.warn("[Notification Layer] Resend not configured. Logging data to console:");
    console.log(JSON.stringify({ to: toEmail, subject, redacted: true }, null, 2));
    writeNotificationLog({ type, recipient: toEmail, subject, status: 'queued' });
    return { status: 'logged_locally' };
  }

  try {
    const { data: resData, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("[Notification Layer] Resend error:", error);
      return { status: 'error', error };
    }

    console.log(`[Notification Layer] Email sent successfully: ${resData?.id}`);
    writeNotificationLog({ type, recipient: toEmail, subject, status: 'sent', providerMessageId: resData?.id });
    return { status: 'sent', id: resData?.id };
  } catch (err) {
    console.error("[Notification Layer] Failed to send email:", err);
    writeNotificationLog({ type, recipient: toEmail, subject, status: 'failed', error: String(err) });
    return { status: 'failed' };
  }
};

/**
 * Fire-and-forget: write a contact_inbox document.
 */
async function writeInboxEntry(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
  source: "web" | "chat" | "manual";
}): Promise<void> {
  const db = await getAdminDb();
  if (!db || !CLIENT_ID) return;
  const { FieldValue } = await import("firebase-admin/firestore");
  db.collection("contact_inbox").add({
    clientId: CLIENT_ID,
    name: params.name,
    email: params.email,
    subject: params.subject,
    message: params.message,
    source: params.source,
    status: "new",
    createdAt: FieldValue.serverTimestamp(),
  }).catch((err) => console.error("[InboxEntry] write failed:", err));
}

/**
 * Fire-and-forget: write a notification_logs document.
 */
async function writeNotificationLog(params: {
  type: "booking" | "contact" | "reminder" | "marketing";
  recipient: string;
  subject?: string;
  status: "sent" | "failed" | "queued";
  providerMessageId?: string;
  error?: string;
}): Promise<void> {
  const db = await getAdminDb();
  if (!db || !CLIENT_ID) return;
  const { FieldValue } = await import("firebase-admin/firestore");
  db.collection("notification_logs").add({
    clientId: CLIENT_ID,
    channel: "email",
    recipient: params.recipient,
    subject: params.subject,
    type: params.type,
    status: params.status,
    providerMessageId: params.providerMessageId,
    error: params.error,
    createdAt: FieldValue.serverTimestamp(),
  }).catch((err) => console.error("[NotificationLog] write failed:", err));
}

/** Express API routes (shared by local `server.ts` and Vercel `api/index.ts`). */
export function registerExpressRoutes(app: Express, port: number): void {
  if (!CLIENT_ID) {
    throw new Error(
      "Missing tenant id. Set CLIENT_ID (or NEXT_PUBLIC_CLIENT_ID / VITE_CLIENT_ID) in environment variables. On Vercel, set CLIENT_ID for /api serverless if VITE_CLIENT_ID is build-only.",
    );
  }

  app.disable("x-powered-by");
  app.use(securityHeaders);

  // Webhook endpoint MUST use raw body for signature verification
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      console.warn("[Template Setup] Missing STRIPE_SECRET_KEY — webhook endpoint disabled.");
      return res.status(503).json({ error: "Payment service not configured", status: 503 });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).send("Webhook signature or secret missing");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const appointmentId = session.metadata?.appointmentId;

        if (!appointmentId) {
          console.warn("Webhook: checkout.session.completed missing appointmentId in metadata");
          break;
        }

        const amountTotal = session.amount_total ?? 0;
        console.log(`Payment successful for appointment: ${appointmentId}`);

        await sendNotification(
          "New Confirmed Booking (Paid)",
          {
            appointmentId,
            details: {
              customerEmail: session.customer_details?.email ?? "unknown",
              amount: (amountTotal / 100).toFixed(2),
              paymentStatus: 'paid'
            }
          },
          'booking'
        );
        break;
      }
      case "checkout.session.expired":
        // Handle expired session
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Standard JSON parsing for other routes
  app.use(express.json({ limit: "32kb" }));
  app.use(requireTrustedOrigin);
  app.use("/api", rateLimit);
  app.use("/api", attachTenantContext);

  // Health check — registered BEFORE enforceClientActive so it always
  // responds even when Firestore is unreachable or the tenant guard hangs.
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", clientId: CLIENT_ID });
  });

  app.use("/api", enforceClientActive);

  app.get("/api/tenant/status", async (_req, res) => {
    const { status, provider } = await getClientRuntimeState();
    res.json({
      clientId: CLIENT_ID,
      status,
      paymentProvider: provider,
      active: status === "active" || status === "trial" || status === "maintenance",
    });
  });

  app.post("/api/ai/analyze", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "AI features are not configured on the server.",
      });
    }

    const body = req.body ?? {};
    const kind = body.type;

    try {
      if (kind === "strategic") {
        const { appointments, staff, services } = body;
        if (!Array.isArray(appointments) || !Array.isArray(staff) || !Array.isArray(services)) {
          return res.status(400).json({
            error: "For type \"strategic\", appointments, staff, and services must be arrays.",
          });
        }
        if (appointments.length > 500 || staff.length > 100 || services.length > 100) {
          return res.status(400).json({
            error: "Payload too large for strategic analysis.",
          });
        }

        const prompt = buildStrategicAnalysisPrompt(appointments, staff, services);
        const text = await geminiGenerateContent(apiKey, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          responseMimeType: "application/json",
        });

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return res.status(502).json({
            error: "The model returned invalid JSON.",
            raw: text,
          });
        }

        return res.json(parsed);
      }

      if (kind === "style") {
        const { userDescription, services } = body;
        if (typeof userDescription !== "string" || !Array.isArray(services)) {
          return res.status(400).json({
            error: "For type \"style\", userDescription must be a string and services must be an array.",
          });
        }
        if (userDescription.length > 800 || services.length > 100) {
          return res.status(400).json({
            error: "Payload too large for style analysis.",
          });
        }

        const prompt = buildStyleConsultationPrompt(userDescription, services);
        const text = await geminiGenerateContent(apiKey, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          responseMimeType: "application/json",
        });

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return res.status(502).json({
            error: "The model returned invalid JSON.",
            raw: text,
          });
        }

        return res.json(parsed);
      }

      if (kind === "crm") {
        const { kpis, recentAppointments, businessContext: bizCtx, uiLanguage } = body;
        if (typeof kpis !== "object" || kpis === null || !Array.isArray(recentAppointments)) {
          return res.status(400).json({
            error: 'For type "crm", kpis must be an object and recentAppointments must be an array.',
          });
        }
        if (recentAppointments.length > 100) {
          return res.status(400).json({ error: "Payload too large for CRM analysis." });
        }

        const prompt = buildCrmInsightPrompt(
          kpis as Record<string, unknown>,
          recentAppointments,
          bizCtx && typeof bizCtx === "object" ? bizCtx : undefined,
          typeof uiLanguage === "string" ? uiLanguage : undefined,
        );
        const text = await geminiGenerateContent(apiKey, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          responseMimeType: "application/json",
        });

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return res.status(502).json({ error: "The model returned invalid JSON.", raw: text });
        }

        return res.json(parsed);
      }

      return res.status(400).json({
        error: 'Body "type" must be "strategic", "style", or "crm".',
      });
    } catch (err) {
      console.error("[AI Analyze] Request failed:", err);
      return res.status(502).json({ error: "AI analysis request failed." });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI features are not configured on the server." });
    }

    const { messages, brand, businessContext, mode, liveData } = req.body ?? {};
    const isAdminMode = mode === "admin";
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array." });
    }
    if (messages.length > 30) {
      return res.status(400).json({ error: "Too many messages in a single request." });
    }

    const contents: GeminiChatPart[] = [];
    for (const m of messages) {
      if (
        !m ||
        (m.role !== "user" && m.role !== "model") ||
        typeof m.text !== "string"
      ) {
        return res.status(400).json({
          error: 'Each message must include role "user" or "model" and a string text field.',
        });
      }
      if (m.text.length > 1_000) {
        return res.status(400).json({ error: "Each message must be 1000 characters or less." });
      }
      contents.push({ role: m.role, parts: [{ text: m.text }] });
    }

    // ── Build business knowledge block from frontend context ──
    const ctx = businessContext && typeof businessContext === "object" ? businessContext : {};
    const knowledgeLines: string[] = [];

    if (Array.isArray(ctx.services) && ctx.services.length > 0) {
      const list = ctx.services
        .map((s: { name?: string; duration?: string; price?: string }) =>
          `• ${s.name ?? "?"}${s.duration ? ` (${s.duration})` : ""}${s.price ? ` — ${s.price}` : ""}`)
        .join("\n");
      knowledgeLines.push(`SERVICES:\n${list}`);
    }

    if (Array.isArray(ctx.staff) && ctx.staff.length > 0) {
      const list = ctx.staff
        .map((s: { name?: string; specialty?: string }) =>
          `• ${s.name ?? "?"}${s.specialty ? ` — ${s.specialty}` : ""}`)
        .join("\n");
      knowledgeLines.push(`TEAM:\n${list}`);
    }

    if (ctx.hours && typeof ctx.hours === "object") {
      const h = ctx.hours as Record<string, unknown>;
      const entries = Object.entries(h)
        .filter(([, v]) => v && typeof v === "object")
        .map(([day, v]) => {
          const slot = v as { open?: string; close?: string; closed?: boolean };
          return slot.closed ? `• ${day}: Closed` : `• ${day}: ${slot.open ?? "?"} – ${slot.close ?? "?"}`;
        })
        .join("\n");
      if (entries) knowledgeLines.push(`BUSINESS HOURS:\n${entries}`);
    }

    if (ctx.contact && typeof ctx.contact === "object") {
      const c = ctx.contact as { phone?: string; email?: string; address?: string };
      const parts: string[] = [];
      if (c.address) parts.push(`Address: ${c.address}`);
      if (c.phone) parts.push(`Phone: ${c.phone} (for general inquiries only — NOT for booking appointments)`);
      if (c.email) parts.push(`Email: ${c.email} (for general inquiries only — NOT for booking appointments)`);
      if (parts.length > 0) knowledgeLines.push(`CONTACT:\n${parts.join("\n")}`);
    }

    if (typeof ctx.cancellationPolicy === "string" && ctx.cancellationPolicy.trim()) {
      knowledgeLines.push(`CANCELLATION POLICY: ${ctx.cancellationPolicy.trim()}`);
    }

    if (typeof ctx.businessType === "string" && ctx.businessType.trim()) {
      knowledgeLines.push(`BUSINESS TYPE: ${ctx.businessType.trim()}`);
    }

    if (typeof ctx.businessName === "string" && ctx.businessName.trim()) {
      knowledgeLines.unshift(`BUSINESS NAME: ${ctx.businessName.trim()}`);
    }

    if (ctx.bookingRules && typeof ctx.bookingRules === "object") {
      const br = ctx.bookingRules as {
        bufferMinutes?: number; maxAdvanceBookingDays?: number;
        minAdvanceBookingHours?: number; autoConfirm?: boolean;
      };
      const parts: string[] = [];
      if (typeof br.maxAdvanceBookingDays === "number" && br.maxAdvanceBookingDays > 0)
        parts.push(`Clients can book up to ${br.maxAdvanceBookingDays} days in advance.`);
      if (typeof br.minAdvanceBookingHours === "number" && br.minAdvanceBookingHours > 0)
        parts.push(`Same-day bookings must be at least ${br.minAdvanceBookingHours} hours from now.`);
      if (typeof br.bufferMinutes === "number" && br.bufferMinutes > 0)
        parts.push(`There is a ${br.bufferMinutes}-minute buffer between appointments.`);
      if (br.autoConfirm === true)
        parts.push(`Bookings are confirmed automatically.`);
      else if (br.autoConfirm === false)
        parts.push(`Bookings require manual confirmation by the business.`);
      if (parts.length > 0)
        knowledgeLines.push(`BOOKING RULES:\n${parts.join("\n")}`);
    }

    const knowledgeBlock = knowledgeLines.length > 0
      ? `\n\n--- BUSINESS INFORMATION (use this to answer client questions) ---\n${knowledgeLines.join("\n\n")}\n--- END BUSINESS INFORMATION ---`
      : "";

    // ── Build system instruction ──
    let instruction: string;

    if (isAdminMode) {
      const businessName = brand?.name ?? "the business";

      // Build live CRM data block if available
      let liveDataBlock = "";
      if (liveData && typeof liveData === "object") {
        const ld = liveData as Record<string, unknown>;
        const kpiLines: string[] = [];
        if (typeof ld.totalBookings === "number") kpiLines.push(`Total bookings: ${ld.totalBookings}`);
        if (typeof ld.confirmed === "number") kpiLines.push(`Confirmed: ${ld.confirmed}`);
        if (typeof ld.pending === "number") kpiLines.push(`Pending: ${ld.pending}`);
        if (typeof ld.cancelled === "number") kpiLines.push(`Cancelled: ${ld.cancelled}`);
        if (typeof ld.completed === "number") kpiLines.push(`Completed: ${ld.completed}`);
        if (typeof ld.estimatedRevenue === "number") kpiLines.push(`Estimated revenue (catalogue prices): $${ld.estimatedRevenue.toFixed(0)}`);
        if (typeof ld.grossRevenue === "number") kpiLines.push(`Gross revenue (actual payments collected): $${ld.grossRevenue.toFixed(0)}`);
        if (typeof ld.paidAppointments === "number") kpiLines.push(`Paid appointments: ${ld.paidAppointments}`);
        if (typeof ld.freeConsultations === "number" && ld.freeConsultations > 0) kpiLines.push(`Free consultations: ${ld.freeConsultations}`);
        if (typeof ld.meetings === "number" && ld.meetings > 0) kpiLines.push(`Internal meetings: ${ld.meetings}`);
        if (typeof ld.totalCustomers === "number") kpiLines.push(`Total customers in database: ${ld.totalCustomers}`);

        // Today's appointments
        let todayBlock = "";
        if (Array.isArray(ld.todayAppointments) && ld.todayAppointments.length > 0) {
          todayBlock = "\n\nTODAY'S APPOINTMENTS:\n" + ld.todayAppointments
            .map((a: { time?: string; client?: string; service?: string; staff?: string; status?: string; type?: string; amountPaidCents?: number; phone?: string }) => {
              const typeTag = a.type && a.type !== "appointment" ? ` [${a.type}]` : "";
              const paidTag = a.amountPaidCents ? ` — paid $${(a.amountPaidCents / 100).toFixed(0)}` : "";
              const phone = a.phone ? ` (${a.phone})` : "";
              return `• ${a.time} ${a.client}${phone} — ${a.service} with ${a.staff} [${a.status}]${typeTag}${paidTag}`;
            }).join("\n");
        } else {
          todayBlock = "\n\nTODAY'S APPOINTMENTS: None";
        }

        // Upcoming appointments (next 14)
        let upcomingBlock = "";
        if (Array.isArray(ld.upcomingAppointments) && ld.upcomingAppointments.length > 0) {
          const next14 = ld.upcomingAppointments.slice(0, 14);
          upcomingBlock = "\n\nUPCOMING APPOINTMENTS:\n" + next14
            .map((a: { date?: string; time?: string; client?: string; service?: string; staff?: string; status?: string }) =>
              `• ${a.date} ${a.time} — ${a.client} — ${a.service} with ${a.staff} [${a.status}]`)
            .join("\n");
        }

        // Full appointment history (cap at 60 for token budget)
        let historyBlock = "";
        if (Array.isArray(ld.allAppointments) && ld.allAppointments.length > 0) {
          const past = ld.allAppointments
            .filter((a: { date?: string; status?: string }) => a.status === "completed" || a.status === "cancelled")
            .slice(-30);
          if (past.length > 0) {
            historyBlock = "\n\nPAST APPOINTMENTS (last 30):\n" + past
              .map((a: { date?: string; time?: string; client?: string; service?: string; staff?: string; status?: string; amountPaidCents?: number }) => {
                const paidTag = a.amountPaidCents ? ` — $${(a.amountPaidCents / 100).toFixed(0)}` : "";
                return `• ${a.date} ${a.time} — ${a.client} — ${a.service} (${a.staff}) [${a.status}]${paidTag}`;
              }).join("\n");
          }
        }

        // Staff performance
        let staffBlock = "";
        if (Array.isArray(ld.staffAvailability) && ld.staffAvailability.length > 0) {
          staffBlock = "\n\nSTAFF PERFORMANCE:\n" + ld.staffAvailability
            .map((s: { staffName?: string; totalAppointments?: number; estimatedRevenue?: number; bookedSlots?: string[] }) =>
              `• ${s.staffName}: ${s.totalAppointments} appointments — estimated revenue $${(s.estimatedRevenue ?? 0).toFixed(0)}`)
            .join("\n");
        }

        // Top services
        let servicesBlock = "";
        if (Array.isArray(ld.topServices) && ld.topServices.length > 0) {
          servicesBlock = "\n\nTOP SERVICES BY BOOKINGS:\n" + ld.topServices
            .map((s: { name?: string; count?: number; revenue?: number }) =>
              `• ${s.name}: ${s.count} bookings — $${(s.revenue ?? 0).toFixed(0)} revenue`)
            .join("\n");
        }

        // Busiest days
        let daysBlock = "";
        if (Array.isArray(ld.busiestDays) && ld.busiestDays.length > 0) {
          daysBlock = "\n\nBUSIEST DAYS: " + ld.busiestDays.map((d: { day?: string; count?: number }) => `${d.day} (${d.count})`).join(", ");
        }

        // Customers (first 30)
        let customersBlock = "";
        if (Array.isArray(ld.customers) && ld.customers.length > 0) {
          const top = ld.customers.slice(0, 30);
          customersBlock = "\n\nCUSTOMERS (top 30 by recency):\n" + top
            .map((c: { name?: string; phone?: string; email?: string; visitCount?: number; lastVisitAt?: string; notes?: string }) => {
              const parts = [`• ${c.name}`, c.phone, c.email, `visits: ${c.visitCount ?? 0}`];
              if (c.lastVisitAt) parts.push(`last visit: ${c.lastVisitAt}`);
              if (c.notes) parts.push(`note: ${c.notes}`);
              return parts.filter(Boolean).join(" | ");
            }).join("\n");
        }

        // Inbox messages
        let inboxBlock = "";
        if (Array.isArray(ld.inboxMessages) && ld.inboxMessages.length > 0) {
          inboxBlock = "\n\nINBOX MESSAGES (recent):\n" + ld.inboxMessages
            .map((m: { name?: string; subject?: string; message?: string; status?: string; createdAt?: string }) =>
              `• [${m.status}] ${m.createdAt} — ${m.name}: "${m.subject}" — ${m.message?.slice(0, 100)}`)
            .join("\n");
        }

        if (kpiLines.length > 0 || todayBlock) {
          liveDataBlock = `\n\n--- LIVE CRM DATA ---\nKPIs: ${kpiLines.join(" | ")}${todayBlock}${upcomingBlock}${staffBlock}${servicesBlock}${daysBlock}${customersBlock}${inboxBlock}${historyBlock}\n--- END LIVE CRM DATA ---`;
        }
      }

      instruction = `You are the CRM Assistant for ${businessName}. You are talking to the business OWNER or ADMIN, not a customer.

Your role is to help the admin manage their business through the CRM dashboard. You have access to real-time business data and can:
- Answer data questions: revenue, appointment counts, which staff is busiest, busiest days, service popularity
- Interpret metrics and KPIs and explain trends
- Suggest actions to improve the business (follow up with inactive customers, optimize scheduling, adjust pricing)
- Explain what each section does and how to use features
- Help troubleshoot issues with appointments, customer data, or settings
- Provide strategic advice based on actual business data

${knowledgeBlock}${liveDataBlock}

CRM SECTIONS:
- Overview: KPI cards, bookings trend chart, revenue by service, appointment type breakdown (paid/consultation/meeting), gross revenue, by-staff breakdown
- Appointments: calendar filter, daily appointment list with statuses (type column: paid/free consult/meeting), confirm/cancel actions, expanded row with amount paid
- Customers: customer list with search, booking history, walk-in registration
- Inbox: contact messages with status filters (new/read/replied/archived)
- Email log: notification audit trail

APPOINTMENT TYPES:
- "appointment" = paid service (default)
- "consultation" = free consultation (no charge)
- "meeting" = internal meeting (team sync, vendor, etc.)
Revenue calculations: "estimated revenue" uses catalogue service prices; "gross revenue" uses actual amountPaidCents from payments.
- Scheduling: staff schedules, breaks, date overrides
- Support: provider messaging thread

When the admin asks about data (revenue, bookings, busiest day, etc.), use the LIVE CRM DATA above to give specific numbers. If data is not available for their question, say so.
Keep answers practical, concise, and actionable. Use numbers when available.
Answer in the same language the admin writes to you.

SPECIAL CAPABILITIES — ACTION MODE:
You can perform real actions in the system. When the admin wants to do one of the following, collect all required info through conversation, then output a special JSON block at the END of your message (after your normal reply):

1. REGISTER A WALK-IN CUSTOMER (someone who arrived without an online booking):
   Collect: full name, phone number, service (optional), staff member (optional).
   When you have name + phone, append this JSON at the end of your message:
   |||ACTION:walk_in|||{"name":"Full Name","phone":"050-555-1234","serviceId":"service-id-or-empty","staffId":"staff-id-or-empty","duration":30}|||

2. SEND A SUPPORT REQUEST TO LIAM (for website changes: images, text, prices, services):
   When the admin asks to change something on the website (photo, text, price, color, service name, etc.), compose the request message and append:
   |||ACTION:support_request|||{"message":"The full request message describing what needs to be changed"}|||

IMPORTANT RULES FOR ACTIONS:
- Only output the |||ACTION:...||| block when you have collected all required info.
- Ask questions naturally, one at a time, to collect missing info.
- After outputting the action block, tell the admin the action will be processed.
- For walk-ins, use the service IDs from the business data above, or leave empty string if unknown.
- For support requests, write the message clearly so Liam understands exactly what to change.
- Only one action per response.`;
    } else {
      const hasPersona =
        brand &&
        typeof brand === "object" &&
        typeof (brand as { aiPersona?: unknown }).aiPersona === "string" &&
        String((brand as { aiPersona: string }).aiPersona).trim().length > 0;

      const persona = hasPersona
        ? String((brand as { aiPersona: string }).aiPersona).trim()
        : brand && typeof brand.name === "string" && typeof brand.tagline === "string"
          ? `You are the AI Consulting Agent for ${brand.name}.
Tagline: ${brand.tagline}
Your job is to assist clients by providing information about our services, hours, location, and offering helpful advice.
Be sharp, professional, yet welcoming. Keep answers concise. Avoid complex formatting when possible.`
          : `You are the AI Consulting Agent for this business.
Assist clients with services, hours, location, and general inquiries.
Be sharp, professional, yet welcoming. Keep answers concise.`;

      // Build staff availability block from live Firestore data (if available)
      let availabilityBlock = "";
      try {
        const adminDb = await getAdminDb();
        if (adminDb) {
          const clientIdForAvail = ctx.clientId as string || CLIENT_ID;
          const now = new Date();
          const todayStr = now.toISOString().slice(0, 10);
          // Look 14 days ahead
          const futureDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          const futureDateStr = futureDate.toISOString().slice(0, 10);

          const apptSnap = await adminDb.collection("appointments")
            .where("clientId", "==", clientIdForAvail)
            .where("date", ">=", todayStr)
            .where("date", "<=", futureDateStr)
            .where("status", "in", ["confirmed", "pending"])
            .get();

          if (!apptSnap.empty) {
            // Group booked slots by staff
            const bookedByStaff: Record<string, string[]> = {};
            apptSnap.forEach((doc) => {
              const d = doc.data();
              const staffId = d.staffId as string || "unknown";
              if (!bookedByStaff[staffId]) bookedByStaff[staffId] = [];
              bookedByStaff[staffId].push(`${d.date} ${d.time}`);
            });

            const staffLines = Object.entries(bookedByStaff).map(([sId, slots]) => {
              const staffName = Array.isArray(ctx.staff)
                ? (ctx.staff as { id?: string; name?: string }[]).find(s => s.id === sId)?.name ?? sId
                : sId;
              return `• ${staffName}: booked at ${slots.join(", ")}`;
            });

            availabilityBlock = `\n\nCURRENT AVAILABILITY (next 14 days — already booked slots):\n${staffLines.join("\n")}\nFor exact open slots, direct the client to the booking system on the website.`;
          } else {
            availabilityBlock = "\n\nCURRENT AVAILABILITY: No bookings found in the next 14 days — all slots appear open. Direct the client to book through the website.";
          }
        }
      } catch {
        // availability fetch failed silently — don't block the chat
      }

      const bookingGuidance = ctx.bookingEnabled !== false ? `
BOOKING — CRITICAL RULES:
- When a client wants to book, schedule, or asks about availability: tell them to click the "Book" button on the website. The booking system will guide them to pick a service, choose a staff member, select a date and time, and confirm.
- NEVER suggest the client call by phone or send an email to book. The website has a complete online booking system — always direct them there.
- NEVER share the business phone number or email as a way to schedule appointments.
- If the client asks about specific available time slots, tell them the booking system shows real-time availability — they should click the "Book" button to see what's open.
- If the business requires payment, the client will be asked to complete payment during the booking process.
- Keep the client ON the website. The goal is always to convert the conversation into a booking through the site's system.` : "";

      const whatsappGuidance = businessContext?.whatsappInChat && businessContext?.contact?.phone
        ? `\nWHATSAPP: If the client has a question the AI cannot answer, or explicitly asks to speak with a person, mention they can use the WhatsApp button at the top of this chat. But for bookings, always direct to the website booking system first.`
        : "";

      instruction = persona + knowledgeBlock + availabilityBlock + bookingGuidance + whatsappGuidance
        + "\n\nIMPORTANT: Answer in the same language the client writes to you. If they write in Hebrew, answer in Hebrew. If in English, answer in English. If in Russian, answer in Russian."
        + "\nIf you don't know something or it's not in the business information above, say so honestly — never invent information.";
    }

    try {
      const rawText = await geminiGenerateContent(apiKey, {
        contents,
        systemInstruction: instruction,
        temperature: 0.7,
      });

      // Parse action blocks from admin responses: |||ACTION:type|||{...}|||
      let responseText = rawText;
      let action: { type: string; data: Record<string, unknown> } | null = null;

      if (isAdminMode) {
        const actionMatch = rawText.match(/\|\|\|ACTION:(\w+)\|\|\|(.+?)\|\|\|/s);
        if (actionMatch) {
          const actionType = actionMatch[1];
          try {
            const actionData = JSON.parse(actionMatch[2].trim()) as Record<string, unknown>;
            action = { type: actionType, data: actionData };
          } catch {
            // ignore malformed JSON
          }
          // Strip the action block from the displayed text
          responseText = rawText.replace(/\|\|\|ACTION:\w+\|\|\|.+?\|\|\|/s, "").trim();
        }
      }

      return res.json({ text: responseText, ...(action ? { action } : {}) });
    } catch (err) {
      console.error("[AI Chat] Request failed:", err);
      return res.status(502).json({ error: "Chat request failed." });
    }
  });

  // ── AI Action endpoint: walk-in registration + support ticket ─────────────
  app.post("/api/ai/action", async (req, res) => {
    try {
      const { type, data, clientId: reqClientId } = req.body ?? {};
      const effectiveClientId = reqClientId || CLIENT_ID;
      if (!effectiveClientId) {
        return res.status(400).json({ error: "clientId required" });
      }

      if (type === "walk_in") {
        // Register a walk-in customer + completed appointment in Firestore
        const { name, phone, serviceId, staffId, duration } = data ?? {};
        if (!name || !phone) {
          return res.status(400).json({ error: "name and phone required for walk-in" });
        }

        const db = await getAdminDb();
        if (!db) return res.status(503).json({ error: "Database not available" });

        const { FieldValue } = await import("firebase-admin/firestore");
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 5);
        const email = `walkin_${Date.now()}@noemail.local`;

        // Upsert customer
        const simpleHash = (s: string) => {
          let h = 0;
          for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
          return Math.abs(h).toString(36);
        };
        const custDocId = `${effectiveClientId}_${simpleHash(email)}`;
        const custRef = db.collection("customers").doc(custDocId);
        await custRef.set({
          clientId: effectiveClientId,
          fullName: String(name).trim(),
          email,
          phone: String(phone).trim(),
          source: "manual",
          visitCount: FieldValue.increment(1),
          lastVisitAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Create appointment
        const apptRef = db.collection("appointments").doc();
        await apptRef.set({
          clientId: effectiveClientId,
          customerName: String(name).trim(),
          customerEmail: email,
          customerPhone: String(phone).trim(),
          serviceId: serviceId || "",
          staffId: staffId || "",
          date: dateStr,
          time: timeStr,
          duration: Number(duration) || 30,
          status: "completed",
          type: "appointment",
          createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`[AI Action] Walk-in registered: ${name} (${phone})`);
        return res.json({ success: true, appointmentId: apptRef.id });
      }

      if (type === "support_request") {
        // Create a provider_messages entry so Liam sees it in nichos-hub
        const { message } = data ?? {};
        if (!message) {
          return res.status(400).json({ error: "message required for support_request" });
        }

        const db = await getAdminDb();
        if (!db) return res.status(503).json({ error: "Database not available" });

        const { FieldValue } = await import("firebase-admin/firestore");
        const msgRef = db.collection("provider_messages").doc();
        await msgRef.set({
          clientId: effectiveClientId,
          businessName: process.env.BUSINESS_OWNER_EMAIL || effectiveClientId,
          message: String(message).trim(),
          sender: "client",
          status: "new",
          category: "maintenance",
          categoryReason: "Sent via AI chat assistant",
          createdAt: FieldValue.serverTimestamp(),
        });

        console.log(`[AI Action] Support ticket created for clientId=${effectiveClientId}`);
        return res.json({ success: true, messageId: msgRef.id });
      }

      return res.status(400).json({ error: `Unknown action type: ${type}` });
    } catch (err) {
      console.error("[AI Action] Error:", err);
      return res.status(500).json({ error: "Action failed" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const name = sanitizeText(req.body?.name, 120);
      const email = sanitizeText(req.body?.email, 200).toLowerCase();
      const subject = sanitizeText(req.body?.subject, 160);
      const message = sanitizeText(req.body?.message, 3_000);

      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email and message are required." });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format." });
      }

      console.log(`[Contact Form] Received inquiry from ${name} (${email})`);

      // Persist to contact_inbox (fire-and-forget, non-blocking)
      writeInboxEntry({ name, email, subject: subject || "General Inquiry", message, source: "web" });
      
      await sendNotification(
        `Website Inquiry: ${subject || 'General Contact'}`,
        { name, email, subject, message },
        'contact'
      );

      res.json({ success: true, message: "Thank you! Your message has been received." });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/notify-booking", async (req, res) => {
    // Used for unpaid/non-Stripe bookings
    try {
      const appointmentId = sanitizeText(req.body?.appointmentId, 120);
      const details = req.body?.details ?? {};
      const customerName = sanitizeText(details.customerName, 120);
      const customerEmail = sanitizeText(details.customerEmail, 200).toLowerCase();
      const customerPhone = sanitizeText(details.customerPhone, 40);
      const staff = sanitizeText(details.staff, 120);
      const service = sanitizeText(details.service, 160);
      const date = sanitizeText(details.date, 20);
      const time = sanitizeText(details.time, 20);

      if (!appointmentId || !customerName || !customerEmail || !customerPhone || !staff || !service || !date || !time) {
        return res.status(400).json({ error: "Invalid booking notification payload." });
      }
      if (!isValidEmail(customerEmail) || !isLikelyPhone(customerPhone)) {
        return res.status(400).json({ error: "Invalid customer contact details." });
      }

      await sendNotification(
        "New Booking Request",
        { appointmentId, details: { customerName, customerEmail, customerPhone, staff, service, date, time } },
        'booking'
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to process notification" });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        console.warn("[Template Setup] Missing STRIPE_SECRET_KEY — checkout session creation disabled.");
        return res.status(503).json({
          error: "Payment service not configured",
          status: 503,
          details: "Add STRIPE_SECRET_KEY to your .env file to enable payments.",
        });
      }

      const appointmentId = sanitizeText(req.body?.appointmentId, 120);
      const name = sanitizeText(req.body?.name, 160);
      const customerEmail = sanitizeText(req.body?.customerEmail, 200).toLowerCase();
      const mode = req.body?.mode === "deposit" ? "deposit" : "full";
      const price = Number(req.body?.price);

      if (!appointmentId || !name || !customerEmail) {
        return res.status(400).json({ error: "Invalid checkout payload." });
      }
      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: "Invalid customer email." });
      }
      if (!Number.isInteger(price) || price < 50 || price > 2_000_000) {
        return res.status(400).json({ error: "Invalid payment amount." });
      }

      const { provider } = await getClientRuntimeState();
      if (provider !== "stripe") {
        return res.status(501).json({
          error: `Payment provider "${provider}" is not implemented yet in this template.`,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: mode === 'deposit' ? `Deposit for ${name}` : name,
              },
              unit_amount: price,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL || `http://localhost:${port}`}/?booking_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || `http://localhost:${port}`}/?booking_status=cancelled`,
        metadata: {
          appointmentId: appointmentId,
          clientId: CLIENT_ID,
          paymentProvider: provider,
        },
      }, {
        idempotencyKey: `checkout_${CLIENT_ID}_${appointmentId}`,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session." });
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  registerExpressRoutes(app, PORT);

  // Vite middleware for development (dynamic import keeps Vite out of Vercel `/api` bundle)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      // Important: Disable standard vite server watching since we handle it
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    logStartupStatus();
  });
}

function isMainServerModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(entry);
  } catch {
    return false;
  }
}

if (!process.env.VERCEL && isMainServerModule()) {
  void startServer();
}
