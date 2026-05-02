import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Resend } from "resend";
import type { Request, Response, NextFunction, Express } from "express";
import { initializeApp as initFirebaseApp, getApps } from "firebase/app";
import { getFirestore, doc as fsDoc, getDoc as fsGetDoc, collection as fsCollection, addDoc as fsAddDoc, serverTimestamp as fsServerTimestamp } from "firebase/firestore";
import firebaseAppletConfig from "./firebase-applet-config.json";

dotenv.config();

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
    { key: CLIENT_ID,                           label: "NEXT_PUBLIC_CLIENT_ID",    feature: "Tenant scoping" },
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

const GEMINI_REST_MODEL = "gemini-1.5-flash";
const GEMINI_REST_BASE = "https://generativelanguage.googleapis.com/v1beta";

type GeminiChatPart = { role: "user" | "model"; parts: { text: string }[] };
type ClientStatus = "active" | "suspended" | "trial" | "maintenance" | "archived";
type PaymentProvider = "stripe" | "meshulam" | "yaadpay" | "authorize_net" | "square" | "other";

const CLIENT_ID =
  process.env.NEXT_PUBLIC_CLIENT_ID?.trim() ||
  process.env.VITE_CLIENT_ID?.trim() ||
  "";

let clientStateCache: { status: ClientStatus; provider: PaymentProvider; expiresAt: number } | null = null;
let statusDb: ReturnType<typeof getFirestore> | null = null;

function readServerFirebaseConfig(): Record<string, string> {
  const env = process.env;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = env[key]?.trim();
      if (value) return value;
    }
    return "";
  };

  const fileConfig = firebaseAppletConfig as Record<string, string>;
  return {
    apiKey: pick("VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY") || fileConfig.apiKey || "",
    authDomain: pick("VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") || fileConfig.authDomain || "",
    projectId: pick("VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID") || fileConfig.projectId || "",
    storageBucket: pick("VITE_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") || fileConfig.storageBucket || "",
    messagingSenderId: pick("VITE_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") || fileConfig.messagingSenderId || "",
    appId: pick("VITE_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID") || fileConfig.appId || "",
    measurementId: pick("VITE_FIREBASE_MEASUREMENT_ID", "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID") || fileConfig.measurementId || "",
    firestoreDatabaseId: pick("VITE_FIREBASE_DATABASE_ID", "NEXT_PUBLIC_FIREBASE_DATABASE_ID") || fileConfig.firestoreDatabaseId || "default",
  };
}

function getStatusDb() {
  if (statusDb) return statusDb;
  const cfg = readServerFirebaseConfig();
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  const ready = required.every((k) => typeof cfg[k] === "string" && cfg[k].trim() !== "");
  if (!ready) return null;
  const app = getApps()[0] ?? initFirebaseApp(cfg);
  statusDb = getFirestore(app, cfg.firestoreDatabaseId || "default");
  return statusDb;
}

async function getClientRuntimeState(): Promise<{ status: ClientStatus; provider: PaymentProvider }> {
  const now = Date.now();
  if (clientStateCache && clientStateCache.expiresAt > now) {
    return { status: clientStateCache.status, provider: clientStateCache.provider };
  }
  try {
    const db = getStatusDb();
    if (!db) return { status: "active", provider: "stripe" };
    const snap = await fsGetDoc(fsDoc(db, "clients", CLIENT_ID));
    const status = (snap.exists() ? (snap.data()?.status as ClientStatus | undefined) : undefined) ?? "active";
    const providerRaw = (snap.exists() ? (snap.data()?.defaultPaymentProvider as PaymentProvider | undefined) : undefined)
      ?? (process.env.PAYMENT_PROVIDER as PaymentProvider | undefined)
      ?? "stripe";
    const provider: PaymentProvider = ["stripe", "meshulam", "yaadpay", "authorize_net", "square", "other"].includes(providerRaw)
      ? providerRaw
      : "stripe";
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  // Vercel sets VERCEL_URL (no scheme) for the deployment hostname — allows POST /api/* without duplicating APP_URL.
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    set.add(`https://${host}`);
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
  const { status } = await getClientRuntimeState();
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

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

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

function buildCrmInsightPrompt(kpis: Record<string, unknown>, recentAppointments: unknown[]): string {
  return `You are a CRM analyst for a premium service business.

PERIOD METRICS:
${JSON.stringify(kpis, null, 2)}

RECENT APPOINTMENTS (sample, up to 20):
${JSON.stringify(recentAppointments.slice(0, 20), null, 2)}

Provide a short CRM snapshot: overall health, top 2-3 opportunities (e.g. upsell, rebooking gap, underused slot), and a churn risk note based on cancellation patterns.

OUTPUT FORMAT (JSON only, no prose outside the object):
{
  "summary": "1-2 sentence overall health summary",
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "churnRisk": "brief churn risk assessment"
}`;
}

function buildStrategicAnalysisPrompt(
  appointments: unknown[],
  staff: { name?: string }[],
  services: { name?: string }[],
): string {
  return `
      You are the "Strategic AI Advisor" for a premium service business called "Sector Missions".
      Your goal is to analyze the current appointment data and provide 3-4 highly tactical, actionable insights for the business owner.
      
      DATA:
      - Total Appointments: ${appointments.length}
      - Personnel (Staff): ${staff.map((s) => s.name).join(", ")}
      - Services: ${services.map((s) => s.name).join(", ")}
      
      RECENT APPOINTMENTS:
      ${JSON.stringify(appointments.slice(0, 20), null, 2)}
      
      INSTRUCTIONS:
      1. Identify peak time clusters.
      2. Suggest schedule optimizations (e.g., "Shift resources to Tuesday afternoon").
      3. Identify popular services and suggest bundling or promotions.
      4. Note any gaps in the schedule.
      
      OUTPUT FORMAT:
      Return a JSON object with:
      {
        "status": "summary of current state",
        "insights": [
          { "title": "Short title", "description": "Tactical advice", "impact": "High/Medium/Low" }
        ],
        "tacticalMetric": "A percentage or number representing optimization"
      }
    `;
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
          <p><strong>Appointment ID:</strong> ${data.appointmentId || 'N/A'}</p>
          <p><strong>Staff:</strong> ${data.details?.staff || 'N/A'}</p>
          <p><strong>Service:</strong> ${data.details?.service || 'N/A'}</p>
          <p><strong>Date:</strong> ${data.details?.date || 'N/A'}</p>
          <p><strong>Time:</strong> ${data.details?.time || 'N/A'}</p>
        </div>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 8px;">Customer Details</h3>
          <p style="margin: 4px 0;"><strong>Name:</strong> ${data.details?.customerName || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${data.details?.customerPhone || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${data.details?.customerEmail || 'N/A'}</p>
        </div>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This notification was sent automatically from your website template.</p>
      </div>
    `;
  } else {
    html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h2 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;">New Website Inquiry</h2>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>From:</strong> ${data.name} (&lt;${data.email}&gt;)</p>
          <p><strong>Subject:</strong> ${data.subject || 'General Inquiry'}</p>
        </div>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap;">
          <strong>Message:</strong><br/>
          ${data.message}
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
 * Uses the same Firebase client instance as the status checks.
 */
function writeInboxEntry(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
  source: "web" | "chat" | "manual";
}): void {
  const db = getStatusDb();
  if (!db || !CLIENT_ID) return;
  fsAddDoc(fsCollection(db, "contact_inbox"), {
    clientId: CLIENT_ID,
    name: params.name,
    email: params.email,
    subject: params.subject,
    message: params.message,
    source: params.source,
    status: "new",
    createdAt: fsServerTimestamp(),
  }).catch((err) => console.error("[InboxEntry] write failed:", err));
}

/**
 * Fire-and-forget: write a notification_logs document.
 */
function writeNotificationLog(params: {
  type: "booking" | "contact" | "reminder" | "marketing";
  recipient: string;
  subject?: string;
  status: "sent" | "failed" | "queued";
  providerMessageId?: string;
  error?: string;
}): void {
  const db = getStatusDb();
  if (!db || !CLIENT_ID) return;
  fsAddDoc(fsCollection(db, "notification_logs"), {
    clientId: CLIENT_ID,
    channel: "email",
    recipient: params.recipient,
    subject: params.subject,
    type: params.type,
    status: params.status,
    providerMessageId: params.providerMessageId,
    error: params.error,
    createdAt: fsServerTimestamp(),
  }).catch((err) => console.error("[NotificationLog] write failed:", err));
}

/** Express API routes (shared by local `server.ts` and Vercel `api/index.ts`). */
export function registerExpressRoutes(app: Express, port: number): void {
  if (!CLIENT_ID) {
    throw new Error(
      "Missing tenant id. Set NEXT_PUBLIC_CLIENT_ID and VITE_CLIENT_ID in environment variables.",
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
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        const appointmentId = session.metadata?.appointmentId;
        
        console.log(`Payment successful for appointment: ${appointmentId}`);
        
        // Trigger Notification
        await sendNotification(
          "New Confirmed Booking (Paid)",
          { 
            appointmentId, 
            details: { 
              customerEmail: session.customer_details?.email,
              amount: (session.amount_total! / 100).toFixed(2),
              paymentStatus: 'paid'
            } 
          },
          'booking'
        );
        break;
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
  app.use("/api", enforceClientActive);

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", clientId: CLIENT_ID });
  });

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
        const { kpis, recentAppointments } = body;
        if (typeof kpis !== "object" || kpis === null || !Array.isArray(recentAppointments)) {
          return res.status(400).json({
            error: 'For type "crm", kpis must be an object and recentAppointments must be an array.',
          });
        }
        if (recentAppointments.length > 100) {
          return res.status(400).json({ error: "Payload too large for CRM analysis." });
        }

        const prompt = buildCrmInsightPrompt(kpis as Record<string, unknown>, recentAppointments);
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

    const { messages, brand } = req.body ?? {};
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

    const hasPersona =
      brand &&
      typeof brand === "object" &&
      typeof (brand as { aiPersona?: unknown }).aiPersona === "string" &&
      String((brand as { aiPersona: string }).aiPersona).trim().length > 0;

    const instruction = hasPersona
      ? String((brand as { aiPersona: string }).aiPersona).trim()
      : brand && typeof brand.name === "string" && typeof brand.tagline === "string"
        ? `You are the AI Consulting Agent for ${brand.name}.
Tagline: ${brand.tagline}
Your job is to assist clients by providing information about our services, hours, location, and offering helpful advice.
Be sharp, professional, yet welcoming. Keep answers concise. Avoid complex formatting when possible.`
        : `You are the AI Consulting Agent for this business.
Assist clients with services, hours, location, and general inquiries.
Be sharp, professional, yet welcoming. Keep answers concise.`;

    try {
      const text = await geminiGenerateContent(apiKey, {
        contents,
        systemInstruction: instruction,
        temperature: 0.7,
      });
      return res.json({ text });
    } catch (err) {
      console.error("[AI Chat] Request failed:", err);
      return res.status(502).json({ error: "Chat request failed." });
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
              unit_amount: price, // amount in cents
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

if (isMainServerModule()) {
  void startServer();
}
