import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Resend } from "resend";
import { createVerify } from "crypto";
import type { Request, Response, NextFunction, Express } from "express";
import {
  ADMIN_TOOL_DECLARATIONS,
  ADMIN_TOOLS_PROMPT_FRAGMENT,
  AdminActionError,
  AdminToolValidationError,
  dispatchAdminAction,
  isKnownAction,
} from "./src/lib/ai/admin-tools";
import {
  conversationDocId,
  isValidPhone,
  normalizePhone,
  validateQueueMessageInput,
} from "./src/lib/whatsapp-inbox";
import {
  CRM_METRICS_CACHE_TTL_MS,
  CRM_METRICS_DOC_CAP,
  buildDemoCrmMetrics,
  computeCrmMetrics,
  isValidRange,
  rangeWindow,
  type CrmMetricsRange,
  type CrmMetricsResponse,
  type RawAppointment,
  type RawCustomer,
  type RawInboxItem,
  type RawLead,
} from "./src/lib/crm-metrics";
import {
  applyTagsPatch,
  isValidStage,
  validateTagsPatch,
} from "./src/lib/customer-pipeline";

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

type GeminiFunctionCall = { name: string; args: Record<string, unknown> };
type GeminiFunctionResponse = { name: string; response: Record<string, unknown> };
type GeminiPart =
  | { text: string }
  | { functionCall: GeminiFunctionCall }
  | { functionResponse: GeminiFunctionResponse };
type GeminiChatPart = { role: "user" | "model" | "function"; parts: GeminiPart[] };
type ClientStatus = "active" | "suspended" | "trial" | "maintenance" | "archived";
type PaymentProvider = "stripe" | "meshulam" | "yaadpay" | "authorize_net" | "square" | "other";

// Server + Vercel serverless: prefer explicit CLIENT_ID; VITE_* is build-time in some hosts and may be missing at runtime in /api.
const CLIENT_ID =
  process.env.CLIENT_ID?.trim() ||
  process.env.NEXT_PUBLIC_CLIENT_ID?.trim() ||
  process.env.VITE_CLIENT_ID?.trim() ||
  "";

let clientStateCache: { status: ClientStatus; provider: PaymentProvider; expiresAt: number } | null = null;

// CRM Metrics in-memory cache (Bloque D). Key = `${clientId}:${range}`,
// TTL = CRM_METRICS_CACHE_TTL_MS (60s). Per-process; reset on cold start.
const crmMetricsCache = new Map<string, { payload: CrmMetricsResponse; expiresAt: number }>();

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

async function reconcilePaidCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const appointmentId = session.metadata?.appointmentId;
  if (!appointmentId) {
    throw new Error("checkout session missing appointmentId metadata");
  }

  const sessionClientId = session.metadata?.clientId;
  if (sessionClientId && sessionClientId !== CLIENT_ID) {
    throw new Error(`checkout session clientId mismatch: ${sessionClientId}`);
  }

  if (session.payment_status !== "paid") {
    throw new Error(`checkout session is not paid: ${session.payment_status}`);
  }

  const db = await getAdminDb();
  if (!db) {
    throw new Error("Admin SDK is not configured; cannot reconcile paid booking");
  }

  const appointmentRef = db.collection("appointments").doc(appointmentId);
  const appointmentSnap = await appointmentRef.get();
  if (!appointmentSnap.exists) {
    throw new Error(`appointment not found for paid checkout session: ${appointmentId}`);
  }

  const appointmentClientId = appointmentSnap.data()?.clientId;
  if (appointmentClientId !== CLIENT_ID) {
    throw new Error(`appointment clientId mismatch for paid checkout session: ${appointmentId}`);
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const paymentStatus = session.metadata?.paymentMode === "deposit" ? "deposit_paid" : "paid";
  await appointmentRef.update({
    status: "confirmed",
    paymentStatus,
    amountPaidCents: session.amount_total ?? 0,
    stripeSessionId: session.id,
    paymentProvider: "stripe",
    paidAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
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

// ─── Firebase ID Token Verification (REST-only, no firebase-admin SDK) ───────
// Verifies Firebase Auth ID tokens by fetching Google's public x509 certs and
// validating the RS256 signature + iss/aud/exp claims. Mirrors api/index.ts so
// both runtimes (Express dev / Vercel serverless) behave identically.

type FirebaseIdTokenPayload = {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
};

let firebaseCertsCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function fetchFirebaseCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (firebaseCertsCache && firebaseCertsCache.expiresAt > now) return firebaseCertsCache.certs;
  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
  );
  if (!res.ok) throw new Error(`Failed to fetch Firebase certs: ${res.status}`);
  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAgeMatch = /max-age=(\d+)/.exec(cacheControl);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600_000;
  firebaseCertsCache = { certs, expiresAt: now + ttlMs };
  return certs;
}

function base64UrlDecode(s: string): Buffer {
  let v = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = v.length % 4;
  if (pad === 2) v += "==";
  else if (pad === 3) v += "=";
  else if (pad === 1) throw new Error("Invalid base64url");
  return Buffer.from(v, "base64");
}

async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdTokenPayload | null> {
  try {
    const projectId =
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
      process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
      console.warn("[Auth] FIREBASE_PROJECT_ID not set — cannot verify ID token.");
      return null;
    }

    const segments = idToken.split(".");
    if (segments.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = segments;

    const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8")) as { alg?: string; kid?: string };
    if (header.alg !== "RS256" || !header.kid) return null;

    const certs = await fetchFirebaseCerts();
    const certPem = certs[header.kid];
    if (!certPem) return null;

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);
    if (!verifier.verify(certPem, signature)) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as FirebaseIdTokenPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSec) return null;
    if (payload.iat > nowSec + 60) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!payload.sub) return null;
    return payload;
  } catch (err) {
    console.warn("[Auth] ID token verification failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function getAllowedAdminEmails(): Set<string> {
  const set = new Set<string>();
  const list = process.env.ADMIN_EMAILS?.trim();
  if (list) {
    for (const e of list.split(/[\s,]+/)) {
      const norm = e.trim().toLowerCase();
      if (norm) set.add(norm);
    }
  }
  const single = (process.env.ADMIN_EMAIL?.trim() || process.env.VITE_ADMIN_EMAIL?.trim() || "").toLowerCase();
  if (single) set.add(single);
  return set;
}

/**
 * Gate for admin-scoped endpoints. Validates a Firebase ID token from the
 * `Authorization: Bearer <token>` header, then checks the decoded email
 * against the per-deployment admin allowlist. Writes 401/403 directly on
 * failure (never leaks why) and returns null. On success, returns the
 * normalized email + uid for downstream logging.
 */
async function requireAdminAuth(req: Request, res: Response): Promise<{ email: string; uid: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const decoded = await verifyFirebaseIdToken(match[1]);
  if (!decoded || !decoded.email) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const allowed = getAllowedAdminEmails();
  if (allowed.size === 0) {
    console.warn("[Auth] No admin emails configured — denying admin request.");
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  const normalized = decoded.email.trim().toLowerCase();
  if (!allowed.has(normalized)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return { email: normalized, uid: decoded.sub };
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

const AI_RATE_LIMIT_WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60_000);
const AI_RATE_LIMIT_MAX_PER_WINDOW = Number(process.env.AI_RATE_LIMIT_MAX ?? 20);
const AI_RATE_LIMIT_ADMIN_MAX_PER_WINDOW = Number(process.env.AI_RATE_LIMIT_ADMIN_MAX ?? 100);
const aiRateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Admin-aware rate limit. Public callers: 20/min keyed by IP. Authenticated
// admins (valid Firebase ID token + email in ADMIN_EMAILS/VITE_ADMIN_EMAIL):
// 100/min keyed by email so long CRM chat sessions don't share a bucket with
// public visitors behind the same NAT. The route handler still enforces auth;
// this middleware only buckets.
function aiRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  void classifyAiRequest(req)
    .then(({ key, max }) => {
      const existing = aiRateLimitStore.get(key);
      if (!existing || existing.resetAt <= now) {
        aiRateLimitStore.set(key, { count: 1, resetAt: now + AI_RATE_LIMIT_WINDOW_MS });
        return next();
      }
      if (existing.count >= max) {
        return res.status(429).json({ error: "AI rate limit exceeded. Please try again shortly." });
      }
      existing.count += 1;
      return next();
    })
    .catch((err) => {
      // Token verification failure must not break the request — fall through to
      // the IP bucket. The route handler will reject the request later if auth
      // is actually required.
      console.warn("[aiRateLimit] classification failed:", err instanceof Error ? err.message : err);
      const key = `ai:ip:${getClientIp(req)}`;
      const existing = aiRateLimitStore.get(key);
      if (!existing || existing.resetAt <= now) {
        aiRateLimitStore.set(key, { count: 1, resetAt: now + AI_RATE_LIMIT_WINDOW_MS });
        return next();
      }
      if (existing.count >= AI_RATE_LIMIT_MAX_PER_WINDOW) {
        return res.status(429).json({ error: "AI rate limit exceeded. Please try again shortly." });
      }
      existing.count += 1;
      return next();
    });
}

async function classifyAiRequest(req: Request): Promise<{ key: string; max: number }> {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string") {
    const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (m) {
      const decoded = await verifyFirebaseIdToken(m[1]);
      if (decoded?.email) {
        const norm = decoded.email.trim().toLowerCase();
        if (getAllowedAdminEmails().has(norm)) {
          return { key: `ai:admin:${norm}`, max: AI_RATE_LIMIT_ADMIN_MAX_PER_WINDOW };
        }
      }
    }
  }
  return { key: `ai:ip:${getClientIp(req)}`, max: AI_RATE_LIMIT_MAX_PER_WINDOW };
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

type GeminiRichResult = {
  text: string;
  functionCalls: GeminiFunctionCall[];
  rawParts: GeminiPart[];
};

/**
 * Like geminiGenerateContent but exposes structured `functionCall` parts and
 * accepts a `tools` payload. Empty text is OK (model often returns only a
 * functionCall on the first turn).
 */
async function geminiGenerateRich(
  apiKey: string,
  opts: {
    contents: GeminiChatPart[];
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    tools?: Array<{ functionDeclarations: unknown[] }>;
  },
): Promise<GeminiRichResult> {
  const url = `${GEMINI_REST_BASE}/models/${GEMINI_REST_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: {
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.maxOutputTokens != null ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    },
  };
  if (opts.systemInstruction) body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  if (opts.tools) body.tools = opts.tools;

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
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  };
  if (!res.ok) throw new Error(data?.error?.message ?? res.statusText);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => ("text" in p && typeof p.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
  const functionCalls = parts
    .filter((p): p is { functionCall: GeminiFunctionCall } => "functionCall" in p && !!p.functionCall)
    .map((p) => ({
      name: p.functionCall.name,
      args: (p.functionCall.args ?? {}) as Record<string, unknown>,
    }));
  return { text, functionCalls, rawParts: parts };
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

        try {
          await reconcilePaidCheckoutSession(session);
        } catch (err) {
          console.error("[Stripe Webhook] Failed to reconcile paid booking:", err);
          return res.status(500).send("Failed to reconcile paid booking");
        }

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
  app.use("/api/ai", aiRateLimit);
  app.use("/api", attachTenantContext);

  // Health check — registered BEFORE enforceClientActive so it always
  // responds even when Firestore is unreachable or the tenant guard hangs.
  // ── Dynamic sitemap.xml ────────────────────────────────────────���────────
  app.get("/sitemap.xml", (_req, res) => {
    const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || "").replace(/\/$/, "");
    if (!siteUrl) {
      return res.status(404).send("SITE_URL not configured");
    }
    const pages = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/galeria", priority: "0.7", changefreq: "monthly" },
      { loc: "/reservar", priority: "0.9", changefreq: "weekly" },
    ];
    const today = new Date().toISOString().split("T")[0];
    const urls = pages.map(p =>
      `  <url><loc>${siteUrl}${p.loc}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
    ).join("\n");
    res.setHeader("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  });

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

    const { messages, brand, businessContext, mode, liveData, isDemoMode, clientId: reqClientId } = req.body ?? {};
    const isAdminMode = mode === "admin";
    const demoMode = isAdminMode && isDemoMode === true;

    // V1 — gate admin mode server-side. Without this check, any visitor can
    // POST {mode:"admin"} and receive the CRM system prompt + PII snapshot.
    // requireAdminAuth writes 401/403 and returns null on failure.
    if (isAdminMode) {
      const auth = await requireAdminAuth(req, res);
      if (!auth) return;
    }

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

    // ── RAG: private knowledge-base retrieval (ADMIN MODE ONLY) ──
    // Hard isolation guarantees:
    //   1. The whole block sits inside `if (isAdminMode && !demoMode)` — the
    //      public chat branch never reaches this code.
    //   2. clientId is taken from CLIENT_ID env (or reqClientId only if the
    //      admin pre-auth above accepted the call); never from businessContext.
    //   3. retrieveContext queries knowledge_docs/{clientId}/docs only — the
    //      tenant id is encoded in the Firestore path itself.
    let ragBlock = "";
    if (isAdminMode && !demoMode) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        const effectiveClientId = (typeof reqClientId === "string" && reqClientId) || CLIENT_ID;
        const lastUserMsg = [...contents].reverse().find((p) => p.role === "user");
        const queryText = lastUserMsg?.parts.find((p): p is { text: string } => "text" in p)?.text ?? "";
        if (apiKey && effectiveClientId && queryText.trim().length >= 4) {
          const db = await getAdminDb();
          if (db) {
            const { retrieveContext, formatContextBlock } = await import("./src/lib/knowledge-rag");
            const hits = await retrieveContext(db, apiKey, effectiveClientId, queryText, { topK: 5 });
            ragBlock = formatContextBlock(hits);
            if (hits.length > 0) {
              console.log(`[Knowledge RAG] injected ${hits.length} chunks (top sim=${hits[0].similarity.toFixed(2)}) for client=${effectiveClientId}`);
            }
          }
        }
      } catch (err) {
        console.warn("[Knowledge RAG] retrieval failed, continuing without context:", err instanceof Error ? err.message : err);
      }
    }

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
            .map((a: { id?: string; time?: string; client?: string; service?: string; staff?: string; status?: string; type?: string; amountPaidCents?: number; phone?: string }) => {
              const typeTag = a.type && a.type !== "appointment" ? ` [${a.type}]` : "";
              const paidTag = a.amountPaidCents ? ` — paid $${(a.amountPaidCents / 100).toFixed(0)}` : "";
              const phone = a.phone ? ` (${a.phone})` : "";
              const idTag = a.id ? ` (id:${a.id})` : "";
              return `• ${a.time} ${a.client}${phone} — ${a.service} with ${a.staff} [${a.status}]${typeTag}${paidTag}${idTag}`;
            }).join("\n");
        } else {
          todayBlock = "\n\nTODAY'S APPOINTMENTS: None";
        }

        // Upcoming appointments (next 14)
        let upcomingBlock = "";
        if (Array.isArray(ld.upcomingAppointments) && ld.upcomingAppointments.length > 0) {
          const next14 = ld.upcomingAppointments.slice(0, 14);
          upcomingBlock = "\n\nUPCOMING APPOINTMENTS:\n" + next14
            .map((a: { id?: string; date?: string; time?: string; client?: string; service?: string; staff?: string; staffId?: string; status?: string; duration?: number }) =>
              `• ${a.date} ${a.time} — ${a.client} — ${a.service} with ${a.staff} [${a.status}]${a.id ? ` (id:${a.id})` : ""}${a.staffId ? ` staffId:${a.staffId}` : ""}${a.duration ? ` ${a.duration}min` : ""}`)
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
              .map((a: { id?: string; date?: string; time?: string; client?: string; service?: string; staff?: string; status?: string; amountPaidCents?: number }) => {
                const paidTag = a.amountPaidCents ? ` — $${(a.amountPaidCents / 100).toFixed(0)}` : "";
                return `• ${a.date} ${a.time} — ${a.client} — ${a.service} (${a.staff}) [${a.status}]${paidTag}${a.id ? ` (id:${a.id})` : ""}`;
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
            .map((c: { id?: string; name?: string; phone?: string; email?: string; visitCount?: number; lastVisitAt?: string; notes?: string }) => {
              const parts = [`• ${c.name}`, c.phone, c.email, `visits: ${c.visitCount ?? 0}`];
              if (c.lastVisitAt) parts.push(`last visit: ${c.lastVisitAt}`);
              if (c.notes) parts.push(`note: ${c.notes}`);
              if (c.id) parts.push(`(id:${c.id})`);
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

${knowledgeBlock}${liveDataBlock}${ragBlock}

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

${ADMIN_TOOLS_PROMPT_FRAGMENT}`;
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
      // Non-admin path: keep the simple text-only flow.
      if (!isAdminMode) {
        const rawText = await geminiGenerateContent(apiKey, {
          contents,
          systemInstruction: instruction,
          temperature: 0.7,
        });
        return res.json({ text: rawText });
      }

      // Admin path: native function calling. Gemini may answer with a
      // functionCall part on turn 1; we execute it server-side, send the
      // functionResponse back to Gemini, and surface the final user-facing
      // text + execution result to the frontend.
      const first = await geminiGenerateRich(apiKey, {
        contents,
        systemInstruction: instruction,
        temperature: 0.7,
        maxOutputTokens: 800,
        tools: [{ functionDeclarations: ADMIN_TOOL_DECLARATIONS }],
      });

      // No tool call → just text. Includes the case where Gemini asked a
      // clarifying question because a required arg was missing.
      if (first.functionCalls.length === 0) {
        return res.json({ text: first.text });
      }

      // Take the first tool call this turn. The prompt enforces one per turn.
      const call = first.functionCalls[0];
      const effectiveClientId = (typeof reqClientId === "string" && reqClientId) || CLIENT_ID;

      if (!isKnownAction(call.name)) {
        return res.json({
          text: first.text || `I don't know how to call \`${call.name}\`.`,
        });
      }

      // Demo mode: skip Firestore writes; let the frontend show a demo label.
      if (demoMode) {
        return res.json({
          text: first.text,
          action: { type: call.name, data: call.args },
          actionResult: { ok: true, demo: true },
        });
      }

      if (!effectiveClientId) {
        return res.json({ text: "Cannot execute action: missing clientId on the request." });
      }

      const db = await getAdminDb();
      if (!db) {
        return res.json({
          text: "Cannot execute action: Firestore is not configured on the server.",
          action: { type: call.name, data: call.args },
          actionResult: { ok: false, error: "database_unavailable" },
        });
      }
      const { FieldValue } = await import("firebase-admin/firestore");

      let actionResult: { ok: true; result: Record<string, unknown> } | { ok: false; error: string; status?: number };
      let functionResponsePayload: Record<string, unknown>;
      try {
        const result = await dispatchAdminAction(
          { db, FieldValue, clientId: effectiveClientId },
          call.name,
          call.args,
        );
        actionResult = { ok: true, result: result as Record<string, unknown> };
        functionResponsePayload = result as Record<string, unknown>;
        console.log(`[AI Chat] tool ${call.name} ok for clientId=${effectiveClientId}`);
      } catch (err) {
        const status = err instanceof AdminActionError ? err.status
          : err instanceof AdminToolValidationError ? 400
          : 500;
        const msg = err instanceof Error ? err.message : String(err);
        actionResult = { ok: false, error: msg, status };
        functionResponsePayload = { error: msg };
        console.warn(`[AI Chat] tool ${call.name} FAILED:`, msg);
      }

      // Turn 2: send the function response back so Gemini can write the
      // user-facing confirmation text.
      const followup: GeminiChatPart[] = [
        ...contents,
        { role: "model", parts: [{ functionCall: call }] },
        { role: "user", parts: [{ functionResponse: { name: call.name, response: functionResponsePayload } }] },
      ];
      let finalText = first.text;
      try {
        const second = await geminiGenerateRich(apiKey, {
          contents: followup,
          systemInstruction: instruction,
          temperature: 0.5,
          maxOutputTokens: 400,
          tools: [{ functionDeclarations: ADMIN_TOOL_DECLARATIONS }],
        });
        if (second.text) finalText = second.text;
      } catch (err) {
        console.warn("[AI Chat] second-turn confirmation text failed:", err);
        if (!finalText) finalText = actionResult.ok ? "Done." : "Action could not be completed.";
      }

      return res.json({
        text: finalText,
        action: { type: call.name, data: call.args },
        actionResult,
      });
    } catch (err) {
      console.error("[AI Chat] Request failed:", err);
      return res.status(502).json({ error: "Chat request failed." });
    }
  });

  // ── AI Action endpoint: legacy bridge ─────────────────────────────────────
  // The native function-calling flow on /api/ai/chat executes tools server-side
  // already. This endpoint stays alive so demo-mode flows and any direct API
  // callers keep working. All 8 tools share the same dispatcher as the chat
  // path, so behaviour is identical here.
  app.post("/api/ai/action", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;

    try {
      const { type, data, clientId: reqClientId } = req.body ?? {};
      const effectiveClientId = reqClientId || CLIENT_ID;
      if (!effectiveClientId) {
        return res.status(400).json({ error: "clientId required" });
      }
      if (typeof type !== "string" || !isKnownAction(type)) {
        return res.status(400).json({ error: `Unknown action type: ${type}` });
      }

      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");

      const result = await dispatchAdminAction(
        { db, FieldValue, clientId: effectiveClientId },
        type,
        data ?? {},
      );
      console.log(`[AI Action] ${type} ok for clientId=${effectiveClientId}`);
      return res.json(result);
    } catch (err) {
      if (err instanceof AdminToolValidationError) {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof AdminActionError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[AI Action] Error:", err);
      return res.status(500).json({ error: "Action failed" });
    }
  });

  // ── Knowledge RAG: upload, list, delete documents for admin AI ───────────
  //
  // Storage: knowledge_docs/{clientId}/docs/{docId} + .../chunks/{chunkId}
  //
  // The body limit for /api/knowledge/upload is bumped to 20 MB (vs the global
  // 32 KB) because we accept files inline as base64 — a 10 MB raw file is
  // ~13.4 MB base64-encoded, so 20 MB leaves headroom for metadata. Tenant
  // isolation is enforced in two places:
  //   1. requireAdminAuth — only allowlisted emails pass.
  //   2. We always derive clientId from CLIENT_ID env (not the request body),
  //      so a malicious admin of tenant A can't read tenant B by lying.
  const knowledgeBodyParser = express.json({ limit: "20mb" });

  app.post("/api/knowledge/upload", knowledgeBodyParser, async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI features are not configured on the server." });
    }
    if (!CLIENT_ID) {
      return res.status(400).json({ error: "CLIENT_ID is not configured." });
    }

    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });

      const {
        chunkText,
        embedTexts,
        extractTextFromBuffer,
        MAX_DOCS_PER_CLIENT,
        MAX_TOTAL_BYTES_PER_CLIENT,
        MAX_CHUNKS_PER_DOC,
      } = await import("./src/lib/knowledge-rag");
      const { FieldValue } = await import("firebase-admin/firestore");

      const body = (req.body ?? {}) as Record<string, unknown>;
      const title = String(body.title ?? "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "title is required" });

      // Decide source: paste text vs file upload
      let rawText: string;
      let contentType: "pdf" | "txt" | "md" | "csv" | "manual";
      let source: "upload" | "manual-paste";

      if (typeof body.content === "string" && body.content.trim()) {
        rawText = body.content.trim();
        contentType = "manual";
        source = "manual-paste";
      } else if (typeof body.base64 === "string" && body.base64.length > 0) {
        const filename = String(body.filename ?? title);
        const mime = String(body.mimeType ?? "application/octet-stream");
        const buf = Buffer.from(body.base64, "base64");
        if (buf.length > 10 * 1024 * 1024) {
          return res.status(413).json({ error: "File exceeds 10 MB cap." });
        }
        try {
          const out = await extractTextFromBuffer(buf, mime, filename);
          rawText = out.text;
          contentType = out.contentType;
        } catch (err) {
          const reason = err instanceof Error ? err.message : "extract_failed";
          return res.status(415).json({ error: `Could not extract text: ${reason}` });
        }
        source = "upload";
      } else {
        return res.status(400).json({ error: "Provide either content (paste) or base64 (file)." });
      }

      if (!rawText || rawText.length < 10) {
        return res.status(400).json({ error: "Extracted text is too short to index." });
      }
      const rawBytes = Buffer.byteLength(rawText, "utf8");

      // Cap check — count docs and total bytes for this tenant
      const docsCol = db.collection("knowledge_docs").doc(CLIENT_ID).collection("docs");
      const existing = await docsCol.get();
      if (existing.size >= MAX_DOCS_PER_CLIENT) {
        return res.status(409).json({
          error: `Document cap reached (${MAX_DOCS_PER_CLIENT}). Delete an existing doc first.`,
        });
      }
      let totalBytes = 0;
      for (const d of existing.docs) {
        const v = d.data().rawTextChars;
        if (typeof v === "number") totalBytes += v;
      }
      if (totalBytes + rawBytes > MAX_TOTAL_BYTES_PER_CLIENT) {
        return res.status(409).json({
          error: `Total knowledge size would exceed ${Math.round(MAX_TOTAL_BYTES_PER_CLIENT / 1024 / 1024)} MB cap.`,
        });
      }

      // Create the parent doc in processing state
      const docRef = docsCol.doc();
      await docRef.set({
        clientId: CLIENT_ID,
        title,
        contentType,
        source,
        rawTextChars: rawBytes,
        chunkCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        uploadedBy: auth.email,
        status: "processing",
      });

      // Chunk + embed
      try {
        const pieces = chunkText(rawText);
        if (pieces.length === 0) {
          await docRef.update({ status: "failed", errorReason: "no_chunks_produced" });
          return res.status(422).json({ error: "Could not produce any chunks from this document." });
        }
        if (pieces.length > MAX_CHUNKS_PER_DOC) {
          await docRef.update({ status: "failed", errorReason: "too_many_chunks" });
          return res.status(413).json({ error: `Document produces too many chunks (${pieces.length}). Split it.` });
        }

        const vectors = await embedTexts(apiKey, pieces.map((p) => p.text));
        if (vectors.length !== pieces.length) {
          throw new Error(`Embedding count mismatch: ${vectors.length} vs ${pieces.length}`);
        }

        // Write chunks in batches (Firestore limit: 500 writes/batch)
        const chunksCol = docRef.collection("chunks");
        const BATCH = 100;
        for (let i = 0; i < pieces.length; i += BATCH) {
          const batch = db.batch();
          for (let j = 0; j < BATCH && i + j < pieces.length; j++) {
            const idx = i + j;
            const p = pieces[idx];
            batch.set(chunksCol.doc(), {
              docId: docRef.id,
              text: p.text,
              embedding: vectors[idx],
              index: idx,
              charStart: p.charStart,
              charEnd: p.charEnd,
            });
          }
          await batch.commit();
        }

        await docRef.update({ status: "indexed", chunkCount: pieces.length });
        console.log(`[Knowledge] indexed doc ${docRef.id} (${pieces.length} chunks) for client=${CLIENT_ID} by ${auth.email}`);
        return res.json({
          ok: true,
          doc: {
            id: docRef.id,
            title,
            contentType,
            source,
            rawTextChars: rawBytes,
            chunkCount: pieces.length,
            status: "indexed",
          },
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : "indexing_failed";
        await docRef.update({ status: "failed", errorReason: reason });
        console.warn(`[Knowledge] indexing failed for doc ${docRef.id}: ${reason}`);
        return res.status(502).json({ error: `Indexing failed: ${reason}` });
      }
    } catch (err) {
      console.error("[Knowledge Upload] error:", err);
      return res.status(500).json({ error: "Upload failed." });
    }
  });

  app.get("/api/knowledge/list", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });

    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const snap = await db
        .collection("knowledge_docs").doc(CLIENT_ID).collection("docs")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      const docs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "Untitled",
          contentType: data.contentType ?? "manual",
          source: data.source ?? "manual-paste",
          rawTextChars: data.rawTextChars ?? 0,
          chunkCount: data.chunkCount ?? 0,
          status: data.status ?? "indexed",
          errorReason: data.errorReason,
          uploadedBy: data.uploadedBy ?? "",
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        };
      });
      let totalBytes = 0;
      for (const d of docs) totalBytes += d.rawTextChars;
      return res.json({
        docs,
        counts: { docs: docs.length, maxDocs: 50, totalBytes, maxBytes: 10 * 1024 * 1024 },
      });
    } catch (err) {
      console.error("[Knowledge List] error:", err);
      return res.status(500).json({ error: "List failed." });
    }
  });

  app.get("/api/knowledge/preview/:docId", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });
    const docId = String(req.params.docId ?? "");
    if (!docId || docId.length > 100) return res.status(400).json({ error: "Invalid docId" });
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const ref = db.collection("knowledge_docs").doc(CLIENT_ID).collection("docs").doc(docId);
      const docSnap = await ref.get();
      if (!docSnap.exists) return res.status(404).json({ error: "Not found" });
      const chunksSnap = await ref.collection("chunks").orderBy("index").limit(3).get();
      return res.json({
        doc: { id: docSnap.id, title: docSnap.data()?.title ?? "Untitled" },
        chunks: chunksSnap.docs.map((c) => {
          const data = c.data();
          return { index: data.index, text: String(data.text ?? "").slice(0, 1000) };
        }),
      });
    } catch (err) {
      console.error("[Knowledge Preview] error:", err);
      return res.status(500).json({ error: "Preview failed." });
    }
  });

  app.delete("/api/knowledge/:docId", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });
    const docId = String(req.params.docId ?? "");
    if (!docId || docId.length > 100) return res.status(400).json({ error: "Invalid docId" });

    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const ref = db.collection("knowledge_docs").doc(CLIENT_ID).collection("docs").doc(docId);
      const docSnap = await ref.get();
      if (!docSnap.exists) return res.status(404).json({ error: "Not found" });

      // Delete chunks in batches of 500, looping until empty
      const chunksRef = ref.collection("chunks");
      while (true) {
        const batchSnap = await chunksRef.limit(500).get();
        if (batchSnap.empty) break;
        const batch = db.batch();
        batchSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        if (batchSnap.size < 500) break;
      }
      await ref.delete();
      console.log(`[Knowledge] deleted doc ${docId} for client=${CLIENT_ID} by ${auth.email}`);
      return res.json({ ok: true });
    } catch (err) {
      console.error("[Knowledge Delete] error:", err);
      return res.status(500).json({ error: "Delete failed." });
    }
  });

  // ── WhatsApp inbox: read conversation thread (Bloque C) ────────────────────
  app.get("/api/whatsapp/conversation", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const phoneRaw = typeof req.query.phone === "string" ? req.query.phone : "";
      const phone = normalizePhone(phoneRaw);
      if (!phone || !isValidPhone(phone)) {
        return res.status(400).json({ error: "phone is required and must be valid" });
      }
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const docId = conversationDocId(CLIENT_ID, phone);
      const snap = await db.collection("whatsapp_conversations").doc(docId).get();
      if (!snap.exists) {
        return res.json({ exists: false, phone, clientId: CLIENT_ID, messages: [] });
      }
      const data = snap.data() ?? {};
      if (data.clientId && data.clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch on conversation document" });
      }
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const lastMessageAt =
        data.lastMessageAt?.toDate?.()?.toISOString?.() ??
        (typeof data.lastMessageAt === "string" ? data.lastMessageAt : undefined);
      return res.json({
        exists: true,
        phone,
        clientId: CLIENT_ID,
        messages: messages.map((m: Record<string, unknown>) => ({
          role: m.role,
          text: m.text,
          timestamp:
            (m.timestamp as { toDate?: () => Date } | undefined)?.toDate?.()?.toISOString?.() ??
            (typeof m.timestamp === "string" ? m.timestamp : undefined),
        })),
        lastMessageAt,
      });
    } catch (err) {
      console.error("[WhatsApp Conversation] read failed:", err);
      return res.status(500).json({ error: "Failed to read conversation" });
    }
  });

  // ── WhatsApp outbox: queue message for agent to send (Bloque C) ────────────
  app.post("/api/whatsapp/queue-message", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const parsed = validateQueueMessageInput({
        phone: req.body?.phone,
        message: req.body?.message,
      });
      if (parsed.ok !== true) {
        const errorMessage = (parsed as { ok: false; error: string }).error;
        return res.status(400).json({ error: errorMessage });
      }
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");
      const ref = await db
        .collection("whatsapp_outbox")
        .doc(CLIENT_ID)
        .collection("queued")
        .add({
          clientId: CLIENT_ID,
          phone: parsed.phone,
          body: parsed.message,
          status: "queued",
          requestedBy: auth.email,
          createdAt: FieldValue.serverTimestamp(),
        });
      console.log(`[WhatsApp Queue] ${parsed.phone} queued by ${auth.email}, id=${ref.id}`);
      return res.json({ ok: true, id: ref.id });
    } catch (err) {
      console.error("[WhatsApp Queue] write failed:", err);
      return res.status(500).json({ error: "Failed to queue message" });
    }
  });

  // ── WhatsApp config: toggle agent pauseState (Bloque C) ────────────────────
  app.patch("/api/whatsapp/pause", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const paused = req.body?.paused;
      if (typeof paused !== "boolean") {
        return res.status(400).json({ error: "paused must be a boolean" });
      }
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");
      await db
        .collection("whatsapp_config")
        .doc(CLIENT_ID)
        .set(
          {
            clientId: CLIENT_ID,
            pauseState: paused,
            pausedBy: auth.email,
            pausedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      db.collection("hub_status_history")
        .add({
          clientId: CLIENT_ID,
          event: paused ? "whatsapp_agent_paused" : "whatsapp_agent_resumed",
          actor: auth.email,
          source: "crm_admin",
          createdAt: FieldValue.serverTimestamp(),
        })
        .catch((err) => console.error("[WhatsApp Pause] history log failed:", err));
      console.log(`[WhatsApp Pause] pauseState=${paused} by ${auth.email}`);
      return res.json({ ok: true, paused });
    } catch (err) {
      console.error("[WhatsApp Pause] update failed:", err);
      return res.status(500).json({ error: "Failed to update pause state" });
    }
  });

  app.get("/api/whatsapp/config", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const snap = await db.collection("whatsapp_config").doc(CLIENT_ID).get();
      const data = snap.exists ? (snap.data() ?? {}) : {};
      return res.json({
        clientId: CLIENT_ID,
        paused: data.pauseState === true,
        pausedBy: typeof data.pausedBy === "string" ? data.pausedBy : undefined,
        pausedAt: data.pausedAt?.toDate?.()?.toISOString?.() ?? undefined,
      });
    } catch (err) {
      console.error("[WhatsApp Config] read failed:", err);
      return res.status(500).json({ error: "Failed to read config" });
    }
  });

  // ── CRM Metrics: dashboard charts + KPIs (Bloque D) ────────────────────────
  // 60s in-memory cache keyed by (clientId, range). Demo deployments short-
  // circuit to mock data so the tour renders without Firestore. Doc reads are
  // capped at CRM_METRICS_DOC_CAP per collection to bound per-tenant cost.
  app.get("/api/crm-metrics", async (req, res) => {
    const rangeParam = typeof req.query.range === "string" ? req.query.range : "30d";
    if (!isValidRange(rangeParam)) {
      return res.status(400).json({ error: "range must be one of 7d, 30d, mtd, all" });
    }
    const range: CrmMetricsRange = rangeParam;

    // Demo short-circuit BEFORE auth — demo deployments serve mock data with
    // no Firebase user (tour mode bypasses login by design). The flag comes
    // from server env, not request input, so it can't be spoofed.
    const demoEnv = (process.env.VITE_DEMO_MODE ?? "").trim().toLowerCase();
    if (demoEnv === "true" || demoEnv === "1") {
      return res.json(buildDemoCrmMetrics(range, new Date()));
    }

    const auth = await requireAdminAuth(req, res);
    if (!auth) return;

    // Cache lookup
    const cacheKey = `${CLIENT_ID}:${range}`;
    const cached = crmMetricsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.payload);
    }

    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });

      const now = new Date();
      const win = rangeWindow(range, now);
      const { Timestamp } = await import("firebase-admin/firestore");

      // ── Appointments ────────────────────────────────────────────────────
      // Filter by booking date (string YYYY-MM-DD). "all" returns full set
      // (capped). Includes future bookings so upcomingAppointments works.
      let apptQuery = db
        .collection("appointments")
        .where("clientId", "==", CLIENT_ID) as FirebaseFirestore.Query;
      if (win.startIso) {
        apptQuery = apptQuery.where("date", ">=", win.startIso);
      }
      const apptSnap = await apptQuery.limit(CRM_METRICS_DOC_CAP).get();
      const appointments: RawAppointment[] = apptSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          status: typeof data.status === "string" ? data.status : "pending",
          serviceId: typeof data.serviceId === "string" ? data.serviceId : "",
          customerName: typeof data.customerName === "string" ? data.customerName : "",
          customerPhone: typeof data.customerPhone === "string" ? data.customerPhone : undefined,
          customerEmail: typeof data.customerEmail === "string" ? data.customerEmail : undefined,
          date: typeof data.date === "string" ? data.date : "",
          time: typeof data.time === "string" ? data.time : "",
          amountPaidCents: typeof data.amountPaidCents === "number" ? data.amountPaidCents : undefined,
          paymentStatus: typeof data.paymentStatus === "string" ? data.paymentStatus : undefined,
          createdAtMs: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : undefined,
        };
      });

      // ── Customers (small collection, full pull for visitCount cross-ref) ─
      const custSnap = await db
        .collection("customers")
        .where("clientId", "==", CLIENT_ID)
        .limit(CRM_METRICS_DOC_CAP)
        .get();
      const customers: RawCustomer[] = custSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          phone: typeof data.phone === "string" ? data.phone : undefined,
          email: typeof data.email === "string" ? data.email : undefined,
          visitCount: typeof data.visitCount === "number" ? data.visitCount : undefined,
        };
      });

      // ── Inbox ───────────────────────────────────────────────────────────
      const inboxSnap = await db
        .collection("contact_inbox")
        .where("clientId", "==", CLIENT_ID)
        .limit(CRM_METRICS_DOC_CAP)
        .get();
      const inbox: RawInboxItem[] = inboxSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          status: typeof data.status === "string" ? data.status : "new",
          createdAtMs: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : undefined,
        };
      });

      // ── Hub leads (optional — collection may not exist for every tenant) ─
      let leads: RawLead[] = [];
      try {
        const leadsSnap = await db
          .collection("hub_leads")
          .where("clientId", "==", CLIENT_ID)
          .limit(CRM_METRICS_DOC_CAP)
          .get();
        leads = leadsSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            createdAtMs: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : undefined,
          };
        });
      } catch (err) {
        console.warn("[CRM Metrics] hub_leads read failed (falling back to inbox):", err instanceof Error ? err.message : err);
      }

      const payload: CrmMetricsResponse = computeCrmMetrics({
        range,
        now,
        appointments,
        customers,
        inbox,
        leads,
      });

      crmMetricsCache.set(cacheKey, {
        payload,
        expiresAt: Date.now() + CRM_METRICS_CACHE_TTL_MS,
      });

      return res.json(payload);
    } catch (err) {
      console.error("[CRM Metrics] read failed:", err);
      return res.status(500).json({ error: "Failed to compute metrics" });
    }
  });

  // ── Customer pipeline: change stage (Bloque F) ─────────────────────────────
  app.patch("/api/customers/:customerId/stage", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const customerId = String(req.params.customerId ?? "").trim();
      if (!customerId) {
        return res.status(400).json({ error: "customerId is required" });
      }
      const stage = req.body?.stage;
      if (!isValidStage(stage)) {
        return res.status(400).json({ error: "stage must be one of lead, contacted, scheduled, converted, lost" });
      }
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");

      const ref = db.collection("customers").doc(customerId);
      const snap = await ref.get();
      if (!snap.exists) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const data = snap.data() ?? {};
      if (data.clientId && data.clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch on customer document" });
      }
      const previousStage = typeof data.stage === "string" ? data.stage : null;
      if (previousStage === stage) {
        return res.json({ ok: true, stage, unchanged: true });
      }
      await ref.update({
        stage,
        updatedAt: FieldValue.serverTimestamp(),
      });
      db.collection("hub_status_history")
        .add({
          clientId: CLIENT_ID,
          kind: "customer_stage_change",
          customerId,
          from: previousStage,
          to: stage,
          actor: auth.email,
          source: "crm_admin",
          createdAt: FieldValue.serverTimestamp(),
        })
        .catch((err) => console.error("[Customer Stage] history log failed:", err));
      console.log(`[Customer Stage] ${customerId}: ${previousStage ?? "∅"} → ${stage} by ${auth.email}`);
      return res.json({ ok: true, stage, from: previousStage });
    } catch (err) {
      console.error("[Customer Stage] update failed:", err);
      return res.status(500).json({ error: "Failed to update stage" });
    }
  });

  // ── Customer pipeline: add/remove tags (Bloque F) ──────────────────────────
  app.patch("/api/customers/:customerId/tags", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const customerId = String(req.params.customerId ?? "").trim();
      if (!customerId) {
        return res.status(400).json({ error: "customerId is required" });
      }
      const parsed = validateTagsPatch(req.body);
      if (parsed.ok !== true) {
        return res.status(400).json({ error: (parsed as { ok: false; error: string }).error });
      }
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");

      const ref = db.collection("customers").doc(customerId);
      const snap = await ref.get();
      if (!snap.exists) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const data = snap.data() ?? {};
      if (data.clientId && data.clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch on customer document" });
      }
      const existing: string[] = Array.isArray(data.tags)
        ? data.tags.filter((t: unknown): t is string => typeof t === "string")
        : [];
      const merged = applyTagsPatch(existing, parsed);
      // Write the merged array for read-after-write consistency. The cap is
      // enforced inside applyTagsPatch so the document never exceeds 20 tags.
      await ref.update({
        tags: merged,
        updatedAt: FieldValue.serverTimestamp(),
      });
      // Best-effort follow-up: arrayUnion / arrayRemove operators converge
      // concurrent edits at the Firestore level. Failure is non-fatal — the
      // merged array above is already authoritative for this caller.
      try {
        if (parsed.add.length > 0) {
          await ref.update({ tags: FieldValue.arrayUnion(...parsed.add) });
        }
        if (parsed.remove.length > 0) {
          await ref.update({ tags: FieldValue.arrayRemove(...parsed.remove) });
        }
      } catch (transformErr) {
        console.warn("[Customer Tags] transform fallback skipped:", transformErr);
      }
      console.log(`[Customer Tags] ${customerId} +${parsed.add.length} -${parsed.remove.length} by ${auth.email}`);
      return res.json({ ok: true, tags: merged });
    } catch (err) {
      console.error("[Customer Tags] update failed:", err);
      return res.status(500).json({ error: "Failed to update tags" });
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
          paymentMode: mode,
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
