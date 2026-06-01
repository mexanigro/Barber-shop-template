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
  GET_CRM_SNAPSHOT_DECLARATION,
  buildScopedToolsFragment,
  dispatchAdminAction,
  isKnownAction,
} from "./src/lib/ai/admin-tools";
import {
  dispatchStockAction,
  formatStockResult,
  listStockItemsByClient,
  fuzzyMatchStock,
  type StockActionResult,
} from "./src/lib/ai/stock-tools";
import {
  formatTasksResult,
  type TasksActionResult,
  type TasksLang,
} from "./src/lib/ai/tasks-tools";
import {
  ALL_ADMIN_TOOLS,
  isStubAction,
  routeAdminIntent,
  routePublicIntent,
  stubActionMessage,
  type AdminRouteResult,
  type AdminToolName,
} from "./src/lib/intent-router";
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
import {
  ADMIN_ROLES,
  canAssignRole,
  canRemoveRole,
  isAdminRole,
  isAdminStatus,
  normalizeAdminEmail,
  type AdminRole,
  type AdminUserStatus,
} from "./src/lib/admin-users";
import {
  TaskValidationError,
  createTask,
  deleteTask,
  getTask,
  isTaskPriority,
  isTaskStatus,
  listTasks,
  updateTask,
  validateCreateInput,
  validateUpdateInput,
  type TaskListFilters,
  type TaskStatus,
} from "./src/lib/tasks";

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
type PaymentProvider = "none" | "stripe" | "cardcom" | "paypal" | "meshulam" | "bit" | "yaadpay" | "authorize_net" | "square" | "other";
const VALID_PROVIDERS: PaymentProvider[] = ["none", "stripe", "cardcom", "paypal", "meshulam", "bit", "yaadpay", "authorize_net", "square", "other"];

// ─── Server Payment Gateway Adapter ──────────────────────────────────────────

interface CheckoutParams {
  appointmentId: string;
  customerEmail: string;
  serviceName: string;
  amountCents: number;
  mode: "full" | "deposit";
  successUrl: string;
  cancelUrl: string;
  clientId: string;
}

interface CheckoutResult {
  sessionId: string;
  redirectUrl: string;
}

interface WebhookEvent {
  type: string;
  appointmentId?: string;
  amountTotalCents?: number;
  paymentMode?: string;
}

interface ServerPaymentGateway {
  readonly provider: PaymentProvider;
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  verifyWebhookEvent(rawBody: Buffer, headers: Record<string, string>): WebhookEvent | null;
}

type PaymentCredentials = Record<string, string>;

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
    const snap = await db.collection("clients").doc(CLIENT_ID).get();
    const status = (snap.exists ? (snap.data()?.status as ClientStatus | undefined) : undefined) ?? "active";

    // Provider resolution: config/{clientId}.payment.provider (hub-managed) →
    // clients/{clientId}.defaultPaymentProvider (legacy) → env var → "stripe"
    let providerRaw: string | undefined;
    try {
      const configSnap = await db.collection("config").doc(CLIENT_ID).get();
      providerRaw = configSnap.exists ? (configSnap.data()?.payment?.provider as string | undefined) : undefined;
    } catch { /* config doc optional */ }

    if (!providerRaw) {
      providerRaw =
        (snap.exists ? (snap.data()?.defaultPaymentProvider as string | undefined) : undefined)
        ?? (process.env.PAYMENT_PROVIDER as string | undefined)
        ?? "stripe";
    }

    const provider: PaymentProvider = VALID_PROVIDERS.includes(providerRaw as PaymentProvider)
      ? (providerRaw as PaymentProvider) : "stripe";
    clientStateCache = { status, provider, expiresAt: now + 30_000 };
    return { status, provider };
  } catch (error) {
    console.error("[Tenant Guard] Failed to read client status:", error);
    return { status: "active", provider: "stripe" };
  }
}

async function reconcilePaidCheckout(params: {
  appointmentId: string;
  amountTotalCents: number;
  provider: PaymentProvider;
  sessionId: string;
  paymentMode?: string;
}): Promise<void> {
  const { appointmentId, amountTotalCents, provider, sessionId, paymentMode } = params;

  const db = await getAdminDb();
  if (!db) {
    throw new Error("Admin SDK is not configured; cannot reconcile paid booking");
  }

  const appointmentRef = db.collection("appointments").doc(appointmentId);
  const appointmentSnap = await appointmentRef.get();
  if (!appointmentSnap.exists) {
    throw new Error(`appointment not found for paid checkout: ${appointmentId}`);
  }

  const appointmentClientId = appointmentSnap.data()?.clientId;
  if (appointmentClientId !== CLIENT_ID) {
    throw new Error(`appointment clientId mismatch for paid checkout: ${appointmentId}`);
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const paymentStatus = paymentMode === "deposit" ? "deposit_paid" : "paid";
  await appointmentRef.update({
    status: "confirmed",
    paymentStatus,
    amountPaidCents: amountTotalCents,
    providerSessionId: sessionId,
    paymentProvider: provider,
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
 * Looks up a user in the per-tenant `admin_users` collection. Returns the
 * stored role + status (or null if no doc exists). Document id = lowercase
 * email, keyed by clientId field for flat-collection cross-tenant isolation.
 */
async function lookupAdminUser(
  normalizedEmail: string,
): Promise<{ role: AdminRole; status: AdminUserStatus } | null> {
  try {
    const db = await getAdminDb();
    if (!db) return null;
    const snap = await db.collection("admin_users").doc(normalizedEmail).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    if (data.clientId !== CLIENT_ID) return null;
    const role = isAdminRole(data.role) ? data.role : null;
    const status = isAdminStatus(data.status) ? data.status : "active";
    if (!role) return null;
    return { role, status };
  } catch (err) {
    console.warn("[Auth] admin_users lookup failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Gate for admin-scoped endpoints. Validates a Firebase ID token from the
 * `Authorization: Bearer <token>` header, then resolves the caller's role.
 *
 * Order:
 *   1. admin_users/{email} doc with matching clientId → use that role.
 *   2. Legacy `ADMIN_EMAILS` / `VITE_ADMIN_EMAIL` allowlist → role "owner".
 *
 * Writes 401/403 directly on failure (never leaks why) and returns null.
 * On success, returns the normalized email, uid, and role for downstream
 * logging + role-gated action checks.
 */
async function requireAdminAuth(
  req: Request,
  res: Response,
): Promise<{ email: string; uid: string; role: AdminRole } | null> {
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
  const normalized = decoded.email.trim().toLowerCase();

  // Primary path: per-tenant admin_users collection.
  const lookup = await lookupAdminUser(normalized);
  if (lookup) {
    if (lookup.status === "removed") {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }
    return { email: normalized, uid: decoded.sub, role: lookup.role };
  }

  // Legacy fallback: env-based allowlist → owner. Keeps clients that have not
  // migrated yet working without any extra setup.
  const allowed = getAllowedAdminEmails();
  if (allowed.size === 0) {
    console.warn("[Auth] No admin emails configured — denying admin request.");
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  if (!allowed.has(normalized)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return { email: normalized, uid: decoded.sub, role: "owner" };
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
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
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
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
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
  return { text, functionCalls, rawParts: parts, usage: data.usageMetadata };
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

// ─── Payment Gateway Builders ────────────────────────────────────────────────

function buildStripeGateway(creds: PaymentCredentials): ServerPaymentGateway {
  const secretKey = creds.secretKey || process.env.STRIPE_SECRET_KEY || "";
  const webhookSecret = creds.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secretKey) throw new Error("Stripe secret key not configured");

  const stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" as any });

  return {
    provider: "stripe",
    async createCheckoutSession(p) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: p.customerEmail,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: p.mode === "deposit" ? `Deposit for ${p.serviceName}` : p.serviceName },
            unit_amount: p.amountCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
        metadata: {
          appointmentId: p.appointmentId,
          clientId: p.clientId,
          paymentProvider: "stripe",
          paymentMode: p.mode,
        },
      }, {
        idempotencyKey: `checkout_${p.clientId}_${p.appointmentId}`,
      });
      return { sessionId: session.id, redirectUrl: session.url! };
    },

    verifyWebhookEvent(rawBody, headers) {
      const sig = headers["stripe-signature"];
      if (!sig || !webhookSecret) return null;
      try {
        const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        if (event.type === "checkout.session.completed") {
          const s = event.data.object as Stripe.Checkout.Session;
          return {
            type: event.type,
            appointmentId: s.metadata?.appointmentId,
            amountTotalCents: s.amount_total ?? 0,
            paymentMode: s.metadata?.paymentMode,
          };
        }
        return { type: event.type };
      } catch (err) {
        console.error("[Stripe] Webhook verification failed:", err instanceof Error ? err.message : err);
        return null;
      }
    },
  };
}

function buildCardcomGateway(creds: PaymentCredentials): ServerPaymentGateway {
  return {
    provider: "cardcom",
    async createCheckoutSession(p) {
      const terminalNumber = creds.terminalNumber;
      const apiName = creds.apiName;
      if (!terminalNumber || !apiName) {
        throw new Error("Cardcom credentials not configured (terminalNumber, apiName).");
      }

      // Cardcom Low Profile API — creates a hosted payment page
      const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TerminalNumber: Number(terminalNumber),
          ApiName: apiName,
          Amount: p.amountCents / 100,
          SuccessRedirectUrl: p.successUrl,
          FailedRedirectUrl: p.cancelUrl,
          WebhookUrl: `${p.successUrl.split("?")[0].replace(/\/$/, "")}/api/webhook`,
          Document: {
            To: p.customerEmail,
            CustomerName: p.serviceName,
          },
          CustomFields: {
            Field1: p.appointmentId,
            Field2: p.clientId,
            Field3: p.mode,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Cardcom API error ${response.status}: ${text}`);
      }

      const data = await response.json() as { LowProfileId?: string; Url?: string; ResponseCode?: number; Description?: string };
      if (!data.Url || !data.LowProfileId) {
        throw new Error(`Cardcom returned no URL: ${data.Description || "unknown error"}`);
      }

      return { sessionId: data.LowProfileId, redirectUrl: data.Url };
    },

    verifyWebhookEvent(rawBody, headers) {
      try {
        const body = JSON.parse(rawBody.toString("utf8"));
        const appointmentId = body.CustomFields?.Field1 || body.ReturnValue;
        if (!appointmentId) return null;
        const isSuccess = body.ResponseCode === 0 || body.OperationResponse === 0;
        if (!isSuccess) return null;
        return {
          type: "checkout.session.completed",
          appointmentId,
          amountTotalCents: Math.round((body.Amount ?? 0) * 100),
          paymentMode: body.CustomFields?.Field3,
        };
      } catch {
        console.error("[Cardcom] Webhook parse failed");
        return null;
      }
    },
  };
}

function buildManualGateway(): ServerPaymentGateway {
  return {
    provider: "none",
    async createCheckoutSession() {
      throw new Error("Manual payment mode — no online checkout session.");
    },
    verifyWebhookEvent() {
      return null;
    },
  };
}

function buildStubGateway(provider: PaymentProvider): ServerPaymentGateway {
  return {
    provider,
    async createCheckoutSession() {
      throw new Error(`Payment provider "${provider}" is not yet implemented. Contact support.`);
    },
    verifyWebhookEvent() {
      return null;
    },
  };
}

// Credential cache: { creds, expiresAt } per clientId. Short TTL for security.
let credentialCache: { creds: PaymentCredentials; expiresAt: number } | null = null;

async function getPaymentCredentials(): Promise<PaymentCredentials> {
  const now = Date.now();
  if (credentialCache && credentialCache.expiresAt > now) return credentialCache.creds;

  const db = await getAdminDb();
  if (!db) return {};

  try {
    const snap = await db.collection("payment_credentials").doc(CLIENT_ID).get();
    const creds = (snap.exists ? (snap.data() as PaymentCredentials) : {}) ?? {};
    credentialCache = { creds, expiresAt: now + 60_000 };
    return creds;
  } catch (err) {
    console.warn("[Payment] Failed to read credentials from Firestore:", err instanceof Error ? err.message : err);
    return {};
  }
}

async function resolvePaymentGateway(provider: PaymentProvider): Promise<ServerPaymentGateway> {
  const creds = await getPaymentCredentials();

  switch (provider) {
    case "stripe":
      return buildStripeGateway(creds);
    case "cardcom":
      return buildCardcomGateway(creds);
    case "none":
      return buildManualGateway();
    case "paypal":
    case "meshulam":
    case "bit":
    case "yaadpay":
    case "authorize_net":
    case "square":
      return buildStubGateway(provider);
    default:
      return buildStubGateway(provider);
  }
}

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

// ── Admin live-CRM-data block builder ─────────────────────────────────────
//
// Extracted so we can either inline the block in the system prompt (eager
// path, when the intent router flags includeSnapshot) or return it from the
// get_crm_snapshot tool's functionResponse on demand (lazy path).
//
// Output is the same shape regardless of caller — bracketed by sentinel
// markers so a downstream model parse stays robust to formatting drift.
function buildAdminLiveDataBlock(liveData: unknown): string {
  if (!liveData || typeof liveData !== "object") return "";
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

  let todayBlock = "\n\nTODAY'S APPOINTMENTS: None";
  if (Array.isArray(ld.todayAppointments) && ld.todayAppointments.length > 0) {
    todayBlock = "\n\nTODAY'S APPOINTMENTS:\n" + ld.todayAppointments
      .map((a: { id?: string; time?: string; client?: string; service?: string; staff?: string; status?: string; type?: string; amountPaidCents?: number; phone?: string }) => {
        const typeTag = a.type && a.type !== "appointment" ? ` [${a.type}]` : "";
        const paidTag = a.amountPaidCents ? ` — paid $${(a.amountPaidCents / 100).toFixed(0)}` : "";
        const phone = a.phone ? ` (${a.phone})` : "";
        const idTag = a.id ? ` (id:${a.id})` : "";
        return `• ${a.time} ${a.client}${phone} — ${a.service} with ${a.staff} [${a.status}]${typeTag}${paidTag}${idTag}`;
      }).join("\n");
  }

  let upcomingBlock = "";
  if (Array.isArray(ld.upcomingAppointments) && ld.upcomingAppointments.length > 0) {
    const next14 = ld.upcomingAppointments.slice(0, 14);
    upcomingBlock = "\n\nUPCOMING APPOINTMENTS:\n" + next14
      .map((a: { id?: string; date?: string; time?: string; client?: string; service?: string; staff?: string; staffId?: string; status?: string; duration?: number }) =>
        `• ${a.date} ${a.time} — ${a.client} — ${a.service} with ${a.staff} [${a.status}]${a.id ? ` (id:${a.id})` : ""}${a.staffId ? ` staffId:${a.staffId}` : ""}${a.duration ? ` ${a.duration}min` : ""}`)
      .join("\n");
  }

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

  let staffBlock = "";
  if (Array.isArray(ld.staffAvailability) && ld.staffAvailability.length > 0) {
    staffBlock = "\n\nSTAFF PERFORMANCE:\n" + ld.staffAvailability
      .map((s: { staffName?: string; totalAppointments?: number; estimatedRevenue?: number; bookedSlots?: string[] }) =>
        `• ${s.staffName}: ${s.totalAppointments} appointments — estimated revenue $${(s.estimatedRevenue ?? 0).toFixed(0)}`)
      .join("\n");
  }

  let servicesBlock = "";
  if (Array.isArray(ld.topServices) && ld.topServices.length > 0) {
    servicesBlock = "\n\nTOP SERVICES BY BOOKINGS:\n" + ld.topServices
      .map((s: { name?: string; count?: number; revenue?: number }) =>
        `• ${s.name}: ${s.count} bookings — $${(s.revenue ?? 0).toFixed(0)} revenue`)
      .join("\n");
  }

  let daysBlock = "";
  if (Array.isArray(ld.busiestDays) && ld.busiestDays.length > 0) {
    daysBlock = "\n\nBUSIEST DAYS: " + ld.busiestDays.map((d: { day?: string; count?: number }) => `${d.day} (${d.count})`).join(", ");
  }

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

  let inboxBlock = "";
  if (Array.isArray(ld.inboxMessages) && ld.inboxMessages.length > 0) {
    inboxBlock = "\n\nINBOX MESSAGES (recent):\n" + ld.inboxMessages
      .map((m: { name?: string; subject?: string; message?: string; status?: string; createdAt?: string }) =>
        `• [${m.status}] ${m.createdAt} — ${m.name}: "${m.subject}" — ${m.message?.slice(0, 100)}`)
      .join("\n");
  }

  if (kpiLines.length === 0 && !todayBlock) return "";
  return `\n\n--- LIVE CRM DATA ---\nKPIs: ${kpiLines.join(" | ")}${todayBlock}${upcomingBlock}${staffBlock}${servicesBlock}${daysBlock}${customersBlock}${inboxBlock}${historyBlock}\n--- END LIVE CRM DATA ---`;
}

// ── AI usage metrics — Firestore writer ──────────────────────────────────────
//
// Writes one document per query to
//   ai_usage_metrics/{clientId}/days/{YYYY-MM-DD}/queries/{auto}
// so future blocks can build per-day / per-client cost dashboards. Fire and
// forget — chat latency must NOT depend on metric writes. We swallow errors
// because failing to log a metric should never break the user-facing reply.
async function logAiUsage(params: {
  clientId: string;
  inputTokens: number;
  outputTokens: number;
  routingKind: "deterministic" | "model_with_scope" | "model_full";
  scope?: string;
  action?: string;
  latencyMs: number;
  isAdmin: boolean;
}): Promise<void> {
  try {
    const db = await getAdminDb();
    if (!db) return;
    const { FieldValue } = await import("firebase-admin/firestore");
    const day = new Date().toISOString().slice(0, 10);
    await db
      .collection("ai_usage_metrics")
      .doc(params.clientId)
      .collection("days")
      .doc(day)
      .collection("queries")
      .add({
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        routingKind: params.routingKind,
        scope: params.scope ?? null,
        action: params.action ?? null,
        latencyMs: params.latencyMs,
        isAdmin: params.isAdmin,
        createdAt: FieldValue.serverTimestamp(),
      });
    // Also bump a daily counter on the parent day doc for cheap dashboarding.
    await db
      .collection("ai_usage_metrics")
      .doc(params.clientId)
      .collection("days")
      .doc(day)
      .set(
        {
          totalInputTokens: FieldValue.increment(params.inputTokens),
          totalOutputTokens: FieldValue.increment(params.outputTokens),
          totalQueries: FieldValue.increment(1),
          [`routingKind_${params.routingKind}`]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (err) {
    console.warn("[ai_usage_metrics] write failed:", err instanceof Error ? err.message : err);
  }
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

  // Webhook endpoint MUST use raw body for signature verification.
  // Supports all payment providers — detects provider from headers.
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const { provider } = await getClientRuntimeState();

    let gateway: ServerPaymentGateway;
    try {
      gateway = await resolvePaymentGateway(provider);
    } catch {
      console.warn(`[Webhook] No gateway for provider "${provider}" — ignoring.`);
      return res.status(503).json({ error: "Payment service not configured", status: 503 });
    }

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string") headers[k] = v;
    }

    const event = gateway.verifyWebhookEvent(req.body, headers);
    if (!event) {
      return res.status(400).send("Webhook verification failed");
    }

    if (event.type === "checkout.session.completed" && event.appointmentId) {
      console.log(`[Webhook] Payment confirmed for appointment: ${event.appointmentId} via ${provider}`);
      try {
        await reconcilePaidCheckout({
          appointmentId: event.appointmentId,
          amountTotalCents: event.amountTotalCents ?? 0,
          provider,
          sessionId: event.appointmentId,
          paymentMode: event.paymentMode,
        });
      } catch (err) {
        console.error(`[Webhook] Failed to reconcile paid booking (${provider}):`, err);
        return res.status(500).send("Failed to reconcile paid booking");
      }

      await sendNotification(
        "New Confirmed Booking (Paid)",
        {
          appointmentId: event.appointmentId,
          details: {
            amount: ((event.amountTotalCents ?? 0) / 100).toFixed(2),
            paymentStatus: "paid",
            provider,
          },
        },
        "booking",
      );
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
    // requireAdminAuth writes 401/403 and returns null on failure. We hoist
    // the auth result so downstream Firestore writes (e.g. Bloque I stock
    // tools) can attribute movements to the calling admin.
    let adminAuth: { email: string; role: AdminRole } | null = null;
    if (isAdminMode) {
      adminAuth = await requireAdminAuth(req, res);
      if (!adminAuth) return;
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
    if (isAdminMode && demoMode) {
      // Demo mode: return a static mock context so the RAG feature is visible
      // without touching Firestore or the embeddings API.
      ragBlock =
        "\n\n--- BUSINESS KNOWLEDGE BASE (private docs uploaded by the owner) ---\n" +
        "[Doc: \"FAQ frecuentes demo\" — similarity 0.82]\n" +
        "Política de cancelación: las reservas pueden cancelarse hasta 6 horas antes sin costo. " +
        "Después de ese límite se aplica un cargo del 50% del servicio reservado.\n\n" +
        "[Doc: \"Manual de productos demo\" — similarity 0.74]\n" +
        "Los productos de la marca X se reservan únicamente para clientes con membresía premium. " +
        "El stock se controla manualmente cada lunes por la mañana.\n" +
        "--- END BUSINESS KNOWLEDGE BASE ---";
    } else if (isAdminMode && !demoMode) {
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

    // The admin path needs the intent route BEFORE the system prompt is built
    // so we can decide whether to include the (large) live-data snapshot and
    // which scope/tools to pass.
    const lastUserText = isAdminMode
      ? (() => {
          const m = [...contents].reverse().find((p) => p.role === "user");
          const part = m?.parts.find((p): p is { text: string } => "text" in p);
          return part?.text ?? "";
        })()
      : "";
    const adminRoute: AdminRouteResult | null = isAdminMode
      ? routeAdminIntent(lastUserText)
      : null;

    if (isAdminMode) {
      const businessName = brand?.name ?? "the business";
      const route = adminRoute!;

      // Eager snapshot when the router flagged it OR the route is deterministic
      // (deterministic returns early without ever calling the model, so this
      // branch is only used for model_with_scope / model_full).
      const includeSnapshotEager = route.kind !== "deterministic" && route.includeSnapshot;
      const liveDataBlock = includeSnapshotEager ? buildAdminLiveDataBlock(liveData) : "";

      const toolsFragment =
        route.kind === "model_with_scope"
          ? buildScopedToolsFragment(route.scope, route.tools)
          : ADMIN_TOOLS_PROMPT_FRAGMENT;

      // Scoped queries get a much shorter role description — the verbose CRM
      // sections list + appointment type primer is only useful when the model
      // is going broad (model_full / snapshot path).
      const isScoped = route.kind === "model_with_scope";
      const roleBlock = isScoped
        ? `You are the CRM Assistant for ${businessName}. You are talking to the business OWNER or ADMIN. Answer in the admin's language.`
        : `You are the CRM Assistant for ${businessName}. You are talking to the business OWNER or ADMIN, not a customer.

Your role is to help the admin manage their business through the CRM dashboard. You have access to real-time business data and can:
- Answer data questions: revenue, appointment counts, which staff is busiest, busiest days, service popularity
- Interpret metrics and KPIs and explain trends
- Suggest actions to improve the business (follow up with inactive customers, optimize scheduling, adjust pricing)
- Explain what each section does and how to use features
- Help troubleshoot issues with appointments, customer data, or settings
- Provide strategic advice based on actual business data`;

      const sectionsBlock = isScoped
        ? ""
        : `

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
Answer in the same language the admin writes to you.`;

      instruction = `${roleBlock}

${knowledgeBlock}${liveDataBlock}${ragBlock}${sectionsBlock}

${toolsFragment}`;
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

    const queryStart = Date.now();
    const effectiveClientIdForMetrics =
      (typeof reqClientId === "string" && reqClientId) || CLIENT_ID;

    try {
      // ── PUBLIC PATH ───────────────────────────────────────────────────────
      if (!isAdminMode) {
        // Intent router first — answer hours/location/price/booking from
        // config without burning a model call.
        const ctxForRouter = ctx as {
          hours?: Record<string, unknown>;
          contact?: { phone?: string; email?: string; address?: string };
          services?: Array<{ name?: string; price?: string; duration?: string }>;
        };
        const publicRoute = routePublicIntent(lastUserPublicText(contents), {
          uiLanguage: process.env.VITE_UI_LANGUAGE,
          hours: ctxForRouter.hours,
          contact: ctxForRouter.contact,
          services: ctxForRouter.services,
        });
        if (publicRoute.kind === "deterministic") {
          logAiUsage({
            clientId: effectiveClientIdForMetrics || "unknown",
            inputTokens: 0,
            outputTokens: 0,
            routingKind: "deterministic",
            scope: publicRoute.scope,
            latencyMs: Date.now() - queryStart,
            isAdmin: false,
          });
          return res.json({ text: publicRoute.response });
        }

        const rawText = await geminiGenerateContent(apiKey, {
          contents,
          systemInstruction: instruction,
          temperature: 0.7,
        });
        // No usage data from the simple text helper; record routing kind only.
        logAiUsage({
          clientId: effectiveClientIdForMetrics || "unknown",
          inputTokens: 0,
          outputTokens: 0,
          routingKind: "model_full",
          latencyMs: Date.now() - queryStart,
          isAdmin: false,
        });
        return res.json({ text: rawText });
      }

      // ── ADMIN PATH ────────────────────────────────────────────────────────
      const route = adminRoute!;
      const effectiveClientId = effectiveClientIdForMetrics;

      // Deterministic short-circuit: zero model tokens.
      if (route.kind === "deterministic") {
        const lang = (process.env.VITE_UI_LANGUAGE ?? "en") as string;

        // Bloque I — real stock executors. Run the tool inline, format the
        // localised response, and return without ever calling Gemini.
        if (
          route.action === "query_stock" ||
          route.action === "consume_stock" ||
          route.action === "add_stock"
        ) {
          try {
            let stockResult: StockActionResult;
            if (demoMode) {
              stockResult = await dispatchStockAction(
                { db: null, FieldValue: null, clientId: effectiveClientId || "demo", actorEmail: "demo", demoMode: true, niche: process.env.VITE_ACTIVE_NICHE },
                route.action,
                route.args as unknown as Record<string, unknown>,
              );
            } else if (!effectiveClientId) {
              return res.json({ text: "Cannot execute: missing clientId on the request." });
            } else {
              const db = await getAdminDb();
              if (!db) {
                return res.json({
                  text: "Cannot execute: Firestore is not configured on the server.",
                  routing: { kind: "deterministic", action: route.action, args: route.args },
                });
              }
              const { FieldValue } = await import("firebase-admin/firestore");
              stockResult = await dispatchStockAction(
                { db, FieldValue, clientId: effectiveClientId, actorEmail: adminAuth?.email ?? "ai" },
                route.action,
                route.args as unknown as Record<string, unknown>,
              );
            }
            const text = formatStockResult(route.action, stockResult, lang);
            logAiUsage({
              clientId: effectiveClientId || "unknown",
              inputTokens: 0,
              outputTokens: 0,
              routingKind: "deterministic",
              scope: route.scope,
              action: route.action,
              latencyMs: Date.now() - queryStart,
              isAdmin: true,
            });
            return res.json({
              text,
              action: { type: route.action, data: route.args },
              actionResult: { ok: stockResult.success, result: stockResult },
              routing: { kind: "deterministic", action: route.action, args: route.args },
            });
          } catch (err) {
            const status = err instanceof AdminActionError ? err.status : 500;
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[AI Chat] deterministic ${route.action} FAILED:`, msg);
            return res.status(status).json({ text: msg });
          }
        }

        // Bloque J — real tasks executors. Same deterministic path as stock:
        // run the tool inline (or its demo path), format the localised
        // response, and skip the model call entirely.
        if (
          route.action === "create_task" ||
          route.action === "list_tasks" ||
          route.action === "complete_task"
        ) {
          try {
            let tasksResult: TasksActionResult;
            if (demoMode) {
              tasksResult = (await dispatchAdminAction(
                {
                  db: null,
                  FieldValue: null,
                  clientId: effectiveClientId || "demo",
                  actorEmail: adminAuth?.email ?? "demo@example.com",
                  actorRole: adminAuth?.role ?? "owner",
                  demoMode: true,
                },
                route.action,
                route.args as unknown as Record<string, unknown>,
              )) as unknown as TasksActionResult;
            } else if (!effectiveClientId) {
              return res.json({ text: "Cannot execute: missing clientId on the request." });
            } else {
              const db = await getAdminDb();
              if (!db) {
                return res.json({
                  text: "Cannot execute: Firestore is not configured on the server.",
                  routing: { kind: "deterministic", action: route.action, args: route.args },
                });
              }
              const { FieldValue } = await import("firebase-admin/firestore");
              tasksResult = (await dispatchAdminAction(
                {
                  db,
                  FieldValue,
                  clientId: effectiveClientId,
                  actorEmail: adminAuth?.email ?? "ai",
                  actorRole: adminAuth?.role ?? "owner",
                },
                route.action,
                route.args as unknown as Record<string, unknown>,
              )) as unknown as TasksActionResult;
            }
            const text = formatTasksResult(tasksResult, lang as TasksLang);
            logAiUsage({
              clientId: effectiveClientId || "unknown",
              inputTokens: 0,
              outputTokens: 0,
              routingKind: "deterministic",
              scope: route.scope,
              action: route.action,
              latencyMs: Date.now() - queryStart,
              isAdmin: true,
            });
            return res.json({
              text,
              action: { type: route.action, data: route.args },
              actionResult: { ok: tasksResult.success, result: tasksResult },
              routing: { kind: "deterministic", action: route.action, args: route.args },
            });
          } catch (err) {
            const status = err instanceof AdminActionError ? err.status : 500;
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[AI Chat] deterministic ${route.action} FAILED:`, msg);
            return res.status(status).json({ text: msg });
          }
        }

        // For stub actions (set_stock / tasks / customer-lookup), return a
        // localised "feature coming soon" placeholder. When more executors
        // ship we drop them out of isStubAction() and the dispatcher picks
        // them up automatically.
        if (isStubAction(route.action)) {
          const text = stubActionMessage(route.action, lang);
          logAiUsage({
            clientId: effectiveClientId || "unknown",
            inputTokens: 0,
            outputTokens: 0,
            routingKind: "deterministic",
            scope: route.scope,
            action: route.action,
            latencyMs: Date.now() - queryStart,
            isAdmin: true,
          });
          return res.json({
            text,
            routing: { kind: "deterministic", action: route.action, args: route.args, stub: true },
          });
        }

        // Reserved for future real-executor deterministic actions.
        return res.json({
          text: "Recognised the request but no executor is wired for this action yet.",
          routing: { kind: "deterministic", action: route.action, args: route.args },
        });
      }

      // ── MODEL PATH ────────────────────────────────────────────────────────
      // Build the tools array from the route's whitelist. The whitelist
      // already includes get_crm_snapshot when applicable.
      const declsByName: Record<AdminToolName, unknown> = {
        walk_in: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "walk_in")!,
        support_request: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "support_request")!,
        book_appointment: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "book_appointment")!,
        update_appointment: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "update_appointment")!,
        mark_paid: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "mark_paid")!,
        update_customer: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "update_customer")!,
        add_walkin_count: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "add_walkin_count")!,
        bulk_update_status: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "bulk_update_status")!,
        get_crm_snapshot: GET_CRM_SNAPSHOT_DECLARATION,
        query_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "query_stock")!,
        consume_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "consume_stock")!,
        add_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "add_stock")!,
        create_task: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "create_task")!,
        list_tasks: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "list_tasks")!,
        complete_task: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "complete_task")!,
      };
      const activeToolNames: readonly AdminToolName[] =
        route.kind === "model_with_scope" ? route.tools : [...ALL_ADMIN_TOOLS];
      const activeToolDecls = activeToolNames.map((name) => declsByName[name]);

      const first = await geminiGenerateRich(apiKey, {
        contents,
        systemInstruction: instruction,
        temperature: 0.7,
        maxOutputTokens: 800,
        tools: [{ functionDeclarations: activeToolDecls }],
      });

      // Accumulate token usage across turns for metrics.
      let totalIn = first.usage?.promptTokenCount ?? 0;
      let totalOut = first.usage?.candidatesTokenCount ?? 0;

      // No tool call → just text. Clarifying questions land here too.
      if (first.functionCalls.length === 0) {
        logAiUsage({
          clientId: effectiveClientId || "unknown",
          inputTokens: totalIn,
          outputTokens: totalOut,
          routingKind: route.kind,
          scope: route.kind === "model_with_scope" ? route.scope : undefined,
          latencyMs: Date.now() - queryStart,
          isAdmin: true,
        });
        return res.json({ text: first.text });
      }

      const call = first.functionCalls[0];

      // get_crm_snapshot is intercepted here — we never dispatch through
      // ACTION_EXECUTORS for it. The "executor" is just the existing
      // buildAdminLiveDataBlock against the request's liveData.
      if (call.name === "get_crm_snapshot") {
        const snapshot = buildAdminLiveDataBlock(liveData);
        const followup: GeminiChatPart[] = [
          ...contents,
          { role: "model", parts: [{ functionCall: call }] },
          {
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: { snapshot: snapshot || "No data available yet." },
                },
              },
            ],
          },
        ];
        let finalText = first.text;
        try {
          const second = await geminiGenerateRich(apiKey, {
            contents: followup,
            systemInstruction: instruction,
            temperature: 0.5,
            maxOutputTokens: 600,
            tools: [{ functionDeclarations: activeToolDecls }],
          });
          if (second.text) finalText = second.text;
          totalIn += second.usage?.promptTokenCount ?? 0;
          totalOut += second.usage?.candidatesTokenCount ?? 0;
        } catch (err) {
          console.warn("[AI Chat] snapshot second-turn failed:", err);
          if (!finalText) finalText = "Snapshot retrieved.";
        }
        logAiUsage({
          clientId: effectiveClientId || "unknown",
          inputTokens: totalIn,
          outputTokens: totalOut,
          routingKind: route.kind,
          scope: route.kind === "model_with_scope" ? route.scope : undefined,
          action: "get_crm_snapshot",
          latencyMs: Date.now() - queryStart,
          isAdmin: true,
        });
        return res.json({ text: finalText });
      }

      if (!isKnownAction(call.name)) {
        return res.json({
          text: first.text || `I don't know how to call \`${call.name}\`.`,
        });
      }

      // Demo mode: stock tools have a built-in mock-data path so they still
      // produce realistic responses without writing to Firestore. Other tools
      // short-circuit with a generic success label.
      if (demoMode) {
        if (call.name === "query_stock" || call.name === "consume_stock" || call.name === "add_stock") {
          const stockResult = await dispatchStockAction(
            {
              db: null,
              FieldValue: null,
              clientId: effectiveClientId || "demo",
              actorEmail: adminAuth?.email ?? "demo",
              demoMode: true,
              niche: process.env.VITE_ACTIVE_NICHE,
            },
            call.name,
            (call.args ?? {}) as Record<string, unknown>,
          );
          return res.json({
            text: first.text || formatStockResult(call.name, stockResult, process.env.VITE_UI_LANGUAGE),
            action: { type: call.name, data: call.args },
            actionResult: { ok: stockResult.success, demo: true, result: stockResult },
          });
        }
        if (call.name === "create_task" || call.name === "list_tasks" || call.name === "complete_task") {
          const tasksResult = (await dispatchAdminAction(
            {
              db: null,
              FieldValue: null,
              clientId: effectiveClientId || "demo",
              actorEmail: adminAuth?.email ?? "demo@example.com",
              actorRole: adminAuth?.role ?? "owner",
              demoMode: true,
            },
            call.name,
            (call.args ?? {}) as Record<string, unknown>,
          )) as unknown as TasksActionResult;
          return res.json({
            text: first.text || formatTasksResult(tasksResult, (process.env.VITE_UI_LANGUAGE ?? "en") as TasksLang),
            action: { type: call.name, data: call.args },
            actionResult: { ok: tasksResult.success, demo: true, result: tasksResult },
          });
        }
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
          {
            db,
            FieldValue,
            clientId: effectiveClientId,
            actorEmail: adminAuth?.email ?? "ai",
            actorRole: adminAuth?.role ?? "owner",
            niche: process.env.VITE_ACTIVE_NICHE,
          },
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
          tools: [{ functionDeclarations: activeToolDecls }],
        });
        if (second.text) finalText = second.text;
        totalIn += second.usage?.promptTokenCount ?? 0;
        totalOut += second.usage?.candidatesTokenCount ?? 0;
      } catch (err) {
        console.warn("[AI Chat] second-turn confirmation text failed:", err);
        if (!finalText) finalText = actionResult.ok ? "Done." : "Action could not be completed.";
      }

      logAiUsage({
        clientId: effectiveClientId || "unknown",
        inputTokens: totalIn,
        outputTokens: totalOut,
        routingKind: route.kind,
        scope: route.kind === "model_with_scope" ? route.scope : undefined,
        action: call.name,
        latencyMs: Date.now() - queryStart,
        isAdmin: true,
      });

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

  // Helper for the public-router branch above. Hoisted into the closure so
  // there's no risk of capturing a stale `contents` from a previous request.
  function lastUserPublicText(parts: GeminiChatPart[]): string {
    const m = [...parts].reverse().find((p) => p.role === "user");
    const t = m?.parts.find((p): p is { text: string } => "text" in p);
    return t?.text ?? "";
  }

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

  // ── Stock: migrate legacy nested `stock/{clientId}/...` to flat collections.
  // Returns a dry-run plan by default; pass `{ apply: true }` to actually copy.
  // Idempotent — already-migrated docs are skipped by id.
  app.post("/api/stock/migrate", express.json({ limit: "32kb" }), async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });

    const apply = req.body && req.body.apply === true;
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });

      const plan = { items: { copied: 0, skipped: 0 }, movements: { copied: 0, skipped: 0 } };
      const copyAll = async (sourceSub: string, targetCol: string, key: "items" | "movements") => {
        const sourceSnap = await db
          .collection("stock").doc(CLIENT_ID).collection(sourceSub)
          .get();
        for (const docSnap of sourceSnap.docs) {
          const targetRef = db.collection(targetCol).doc(docSnap.id);
          const existing = await targetRef.get();
          if (existing.exists) {
            plan[key].skipped += 1;
            continue;
          }
          plan[key].copied += 1;
          if (apply) {
            await targetRef.set({ ...docSnap.data(), clientId: CLIENT_ID });
          }
        }
      };

      await copyAll("items", "stock_items", "items");
      await copyAll("movements", "stock_movements", "movements");

      console.log(`[Stock Migrate] client=${CLIENT_ID} apply=${apply} plan=${JSON.stringify(plan)} by=${auth.email}`);
      return res.json({ ok: true, apply, plan });
    } catch (err) {
      console.error("[Stock Migrate] error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "migrate_failed" });
    }
  });

  // ── Stock: manual consume — decrement multiple items in one go.
  // Body: { items: [{ itemId, quantity, reason? }] }
  // Auto-deduct on appointment-complete is intentionally deferred so the
  // booking engine stays untouched; the admin UI calls this endpoint after a
  // sale instead.
  app.post("/api/stock/consume", express.json({ limit: "16kb" }), async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });

    const raw = req.body?.items;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ error: "items[] is required" });
    }
    if (raw.length > 50) {
      return res.status(413).json({ error: "max 50 items per request" });
    }

    type ConsumeItem = { itemId: string; quantity: number; reason?: string };
    const items: ConsumeItem[] = [];
    for (const it of raw) {
      const itemId = typeof it?.itemId === "string" ? it.itemId.trim() : "";
      const quantity = Number(it?.quantity);
      if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ error: "each item needs { itemId: string, quantity: number > 0 }" });
      }
      items.push({ itemId, quantity, reason: typeof it?.reason === "string" ? it.reason.slice(0, 200) : undefined });
    }

    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { Timestamp, FieldValue } = await import("firebase-admin/firestore");

      const results: Array<{ itemId: string; ok: boolean; previousQuantity?: number; newQuantity?: number; error?: string }> = [];

      for (const item of items) {
        // Try flat layout first; fall back to legacy nested on miss.
        const flatRef = db.collection("stock_items").doc(item.itemId);
        const legacyRef = db.collection("stock").doc(CLIENT_ID).collection("items").doc(item.itemId);

        try {
          await db.runTransaction(async (tx) => {
            const flatSnap = await tx.get(flatRef);
            let targetRef = flatRef;
            let layout: "flat" | "legacy" = "flat";
            let data: FirebaseFirestore.DocumentData | undefined = flatSnap.exists ? flatSnap.data() : undefined;
            if (!flatSnap.exists) {
              const legacySnap = await tx.get(legacyRef);
              if (!legacySnap.exists) throw new Error("not_found");
              targetRef = legacyRef;
              layout = "legacy";
              data = legacySnap.data();
            }
            if (!data) throw new Error("not_found");

            // Cross-tenant guard on the flat layout.
            if (layout === "flat" && data.clientId !== CLIENT_ID) {
              throw new Error("forbidden");
            }
            const previousQuantity = Number(data.quantity ?? 0);
            const newQuantity = Math.max(0, previousQuantity - item.quantity);
            tx.update(targetRef, { quantity: newQuantity, updatedAt: Timestamp.now() });

            const movCol = layout === "flat"
              ? db.collection("stock_movements")
              : db.collection("stock").doc(CLIENT_ID).collection("movements");
            const movRef = movCol.doc();
            const movPayload: FirebaseFirestore.DocumentData = {
              itemId: item.itemId,
              type: "deduct",
              quantity: item.quantity,
              previousQuantity,
              reason: item.reason ?? "manual consume",
              performedBy: auth.email,
              createdAt: Timestamp.now(),
            };
            if (layout === "flat") movPayload.clientId = CLIENT_ID;
            tx.set(movRef, movPayload);

            results.push({ itemId: item.itemId, ok: true, previousQuantity, newQuantity });
          });
        } catch (err) {
          const reason = err instanceof Error ? err.message : "unknown";
          results.push({ itemId: item.itemId, ok: false, error: reason });
        }
      }

      // Touch FieldValue to keep the import live for future expansion (e.g.
      // server-time consumedAt). Avoids an unused-import lint warning.
      void FieldValue;

      const anyFailed = results.some((r) => !r.ok);
      console.log(`[Stock Consume] client=${CLIENT_ID} requested=${items.length} ok=${results.filter(r => r.ok).length} by=${auth.email}`);
      return res.status(anyFailed ? 207 : 200).json({ ok: !anyFailed, results });
    } catch (err) {
      console.error("[Stock Consume] error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "consume_failed" });
    }
  });

  // ── Stock: manual ADD — increment items + write audit movement (Bloque I).
  // Body: { items: [{ itemId, quantity, reason? }] }
  // Mirror of /api/stock/consume but with type="add". Used by the StockTab UI
  // and by direct API callers; the AI tools dispatch through stock-tools.ts
  // instead, so they don't go through this endpoint.
  app.post("/api/stock/add", express.json({ limit: "16kb" }), async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });

    const raw = req.body?.items;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ error: "items[] is required" });
    }
    if (raw.length > 50) {
      return res.status(413).json({ error: "max 50 items per request" });
    }

    type AddItem = { itemId: string; quantity: number; reason?: string };
    const items: AddItem[] = [];
    for (const it of raw) {
      const itemId = typeof it?.itemId === "string" ? it.itemId.trim() : "";
      const quantity = Number(it?.quantity);
      if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ error: "each item needs { itemId: string, quantity: number > 0 }" });
      }
      items.push({ itemId, quantity, reason: typeof it?.reason === "string" ? it.reason.slice(0, 200) : undefined });
    }

    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { Timestamp } = await import("firebase-admin/firestore");

      const results: Array<{ itemId: string; ok: boolean; previousQuantity?: number; newQuantity?: number; error?: string }> = [];
      for (const item of items) {
        const flatRef = db.collection("stock_items").doc(item.itemId);
        const legacyRef = db.collection("stock").doc(CLIENT_ID).collection("items").doc(item.itemId);
        try {
          await db.runTransaction(async (tx) => {
            const flatSnap = await tx.get(flatRef);
            let targetRef = flatRef;
            let layout: "flat" | "legacy" = "flat";
            let data: FirebaseFirestore.DocumentData | undefined = flatSnap.exists ? flatSnap.data() : undefined;
            if (!flatSnap.exists) {
              const legacySnap = await tx.get(legacyRef);
              if (!legacySnap.exists) throw new Error("not_found");
              targetRef = legacyRef;
              layout = "legacy";
              data = legacySnap.data();
            }
            if (!data) throw new Error("not_found");
            if (layout === "flat" && data.clientId !== CLIENT_ID) throw new Error("forbidden");
            const previousQuantity = Number(data.quantity ?? 0);
            const newQuantity = previousQuantity + item.quantity;
            tx.update(targetRef, { quantity: newQuantity, updatedAt: Timestamp.now() });
            const movCol = layout === "flat"
              ? db.collection("stock_movements")
              : db.collection("stock").doc(CLIENT_ID).collection("movements");
            const movRef = movCol.doc();
            const movPayload: FirebaseFirestore.DocumentData = {
              itemId: item.itemId,
              type: "add",
              quantity: item.quantity,
              previousQuantity,
              reason: item.reason ?? "manual add",
              performedBy: auth.email,
              createdAt: Timestamp.now(),
            };
            if (layout === "flat") movPayload.clientId = CLIENT_ID;
            tx.set(movRef, movPayload);
            results.push({ itemId: item.itemId, ok: true, previousQuantity, newQuantity });
          });
        } catch (err) {
          results.push({ itemId: item.itemId, ok: false, error: err instanceof Error ? err.message : "unknown" });
        }
      }

      const anyFailed = results.some((r) => !r.ok);
      console.log(`[Stock Add] client=${CLIENT_ID} requested=${items.length} ok=${results.filter(r => r.ok).length} by=${auth.email}`);
      return res.status(anyFailed ? 207 : 200).json({ ok: !anyFailed, results });
    } catch (err) {
      console.error("[Stock Add] error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "add_failed" });
    }
  });

  // ── Stock: search items by name (used by AI fuzzy lookup and the UI). ─────
  // GET /api/stock/items?search=foo — returns up to 50 items matching the
  // fuzzy search across the tenant's stock_items collection. No search param
  // → returns the full list (capped). Cross-tenant filtered by clientId.
  app.get("/api/stock/items", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const all = await listStockItemsByClient(db, CLIENT_ID);
      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
      if (!search) {
        return res.json({ items: all.slice(0, 50), total: all.length });
      }
      const match = fuzzyMatchStock(all, search);
      if (match.kind === "none") return res.json({ items: [], total: 0 });
      if (match.kind === "single") return res.json({ items: [match.item], total: 1 });
      return res.json({ items: match.items.slice(0, 50), total: match.items.length });
    } catch (err) {
      console.error("[Stock Items Search] error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "search_failed" });
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

  // ── Admin users: role-based access control (Bloque E) ──────────────────────
  // CRUD over the `admin_users` collection. Tenant isolation is enforced two
  // ways: (1) requireAdminAuth already proved the caller belongs to this
  // tenant, and (2) every doc carries `clientId` and we filter on it before
  // returning anything. Legacy clients with only `siteConfig.adminEmail`
  // get an empty list — the UI surfaces an empty-state and offers Invite.
  app.get("/api/admin/users", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const snap = await db
        .collection("admin_users")
        .where("clientId", "==", CLIENT_ID)
        .get();
      const users = snap.docs.map((d) => {
        const data = d.data();
        return {
          email: typeof data.email === "string" ? data.email : d.id,
          role: isAdminRole(data.role) ? data.role : "staff",
          invitedBy: typeof data.invitedBy === "string" ? data.invitedBy : "",
          invitedAt: data.invitedAt?.toDate?.()?.toISOString?.() ?? null,
          acceptedAt: data.acceptedAt?.toDate?.()?.toISOString?.() ?? null,
          status: isAdminStatus(data.status) ? data.status : "active",
        };
      });
      return res.json({ users, callerRole: auth.role, callerEmail: auth.email });
    } catch (err) {
      console.error("[Admin Users] list failed:", err);
      return res.status(500).json({ error: "Failed to list users" });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const emailRaw = typeof req.body?.email === "string" ? req.body.email : "";
      const roleRaw = req.body?.role;
      const email = normalizeAdminEmail(emailRaw);
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Valid email is required" });
      }
      if (!isAdminRole(roleRaw)) {
        return res.status(400).json({ error: `role must be one of ${ADMIN_ROLES.join(", ")}` });
      }
      if (!canAssignRole(auth.role, roleRaw)) {
        return res.status(403).json({ error: "You cannot assign that role" });
      }

      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");

      const ref = db.collection("admin_users").doc(email);
      const existing = await ref.get();
      if (existing.exists) {
        const data = existing.data() ?? {};
        if (data.clientId === CLIENT_ID && data.status !== "removed") {
          return res.status(409).json({ error: "User already exists" });
        }
      }

      const payload = {
        clientId: CLIENT_ID,
        email,
        role: roleRaw,
        invitedBy: auth.email,
        invitedAt: FieldValue.serverTimestamp(),
        status: "pending" as AdminUserStatus,
      };
      await ref.set(payload, { merge: true });
      console.log(`[Admin Users] invite email=${email} role=${roleRaw} by=${auth.email}`);
      return res.status(201).json({
        ok: true,
        user: {
          email,
          role: roleRaw,
          invitedBy: auth.email,
          status: "pending",
        },
      });
    } catch (err) {
      console.error("[Admin Users] invite failed:", err);
      return res.status(500).json({ error: "Failed to invite user" });
    }
  });

  app.patch("/api/admin/users/:userId/role", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      if (auth.role !== "owner") {
        return res.status(403).json({ error: "Only owners can change roles" });
      }
      const targetEmail = normalizeAdminEmail(req.params.userId);
      if (!targetEmail) return res.status(400).json({ error: "userId required" });
      const nextRole = req.body?.role;
      if (!isAdminRole(nextRole)) {
        return res.status(400).json({ error: `role must be one of ${ADMIN_ROLES.join(", ")}` });
      }
      if (targetEmail === auth.email && nextRole !== "owner") {
        return res.status(400).json({ error: "Cannot demote yourself" });
      }

      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");
      const ref = db.collection("admin_users").doc(targetEmail);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "User not found" });
      const data = snap.data() ?? {};
      if (data.clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch on user document" });
      }
      await ref.update({ role: nextRole, updatedAt: FieldValue.serverTimestamp() });
      console.log(`[Admin Users] role change email=${targetEmail} -> ${nextRole} by=${auth.email}`);
      return res.json({ ok: true, email: targetEmail, role: nextRole });
    } catch (err) {
      console.error("[Admin Users] role update failed:", err);
      return res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/admin/users/:userId", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const targetEmail = normalizeAdminEmail(req.params.userId);
      if (!targetEmail) return res.status(400).json({ error: "userId required" });
      if (targetEmail === auth.email) {
        return res.status(400).json({ error: "Cannot remove yourself" });
      }
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const ref = db.collection("admin_users").doc(targetEmail);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "User not found" });
      const data = snap.data() ?? {};
      if (data.clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch on user document" });
      }
      const targetRole = isAdminRole(data.role) ? data.role : "staff";
      if (!canRemoveRole(auth.role, targetRole)) {
        return res.status(403).json({ error: "You cannot remove that user" });
      }
      // Manager guardrail: may only delete staff that THEY invited.
      if (auth.role === "manager" && data.invitedBy !== auth.email) {
        return res.status(403).json({ error: "Managers can only remove users they invited" });
      }
      // Last-owner guardrail: never let the system end up with zero owners.
      if (targetRole === "owner") {
        const ownerSnap = await db
          .collection("admin_users")
          .where("clientId", "==", CLIENT_ID)
          .where("role", "==", "owner")
          .get();
        const otherOwners = ownerSnap.docs.filter(
          (d) => d.id !== targetEmail && (d.data().status ?? "active") !== "removed",
        );
        if (otherOwners.length === 0) {
          return res.status(400).json({ error: "Cannot remove the last owner" });
        }
      }

      await ref.delete();
      console.log(`[Admin Users] removed email=${targetEmail} by=${auth.email}`);
      return res.json({ ok: true, email: targetEmail });
    } catch (err) {
      console.error("[Admin Users] delete failed:", err);
      return res.status(500).json({ error: "Failed to remove user" });
    }
  });

  // ── Tasks (Bloque J) ───────────────────────────────────────────────────────
  //
  // Flat collection `tasks/{taskId}` with `clientId`. Visibility filtering and
  // permission checks live in src/lib/tasks.ts; the endpoints just decode the
  // query params, run the operation, and surface the standard error shape.
  app.get("/api/tasks", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");
      const filters: TaskListFilters = {};
      const status = req.query.status;
      if (typeof status === "string") {
        if (status === "open" || isTaskStatus(status)) {
          filters.status = status as TaskStatus | "open";
        }
      }
      if (typeof req.query.assignedTo === "string") {
        filters.assignedTo = req.query.assignedTo.trim().toLowerCase() || undefined;
      }
      if (typeof req.query.priority === "string" && isTaskPriority(req.query.priority)) {
        filters.priority = req.query.priority;
      }
      if (typeof req.query.tag === "string" && req.query.tag.trim()) {
        filters.tag = req.query.tag.trim();
      }
      if (typeof req.query.relatedCustomerId === "string" && req.query.relatedCustomerId.trim()) {
        filters.relatedCustomerId = req.query.relatedCustomerId.trim();
      }
      if (typeof req.query.limit === "string") {
        const n = Number(req.query.limit);
        if (Number.isFinite(n) && n > 0) filters.limit = Math.min(500, Math.trunc(n));
      }
      const tasks = await listTasks(
        { db, FieldValue, clientId: CLIENT_ID, caller: { email: auth.email, role: auth.role } },
        filters,
      );
      return res.json({ tasks, total: tasks.length });
    } catch (err) {
      if (err instanceof TaskValidationError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[Tasks] list failed:", err);
      return res.status(500).json({ error: "Failed to list tasks" });
    }
  });

  app.get("/api/tasks/:taskId", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");
      const task = await getTask(
        { db, FieldValue, clientId: CLIENT_ID, caller: { email: auth.email, role: auth.role } },
        req.params.taskId,
      );
      if (!task) return res.status(404).json({ error: "Task not found" });
      return res.json({ task });
    } catch (err) {
      if (err instanceof TaskValidationError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[Tasks] get failed:", err);
      return res.status(500).json({ error: "Failed to load task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");
      const input = validateCreateInput(req.body ?? {});
      const task = await createTask(
        { db, FieldValue, clientId: CLIENT_ID, caller: { email: auth.email, role: auth.role } },
        input,
      );
      console.log(`[Tasks] create id=${task.id} by=${auth.email}`);
      return res.status(201).json({ task });
    } catch (err) {
      if (err instanceof TaskValidationError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[Tasks] create failed:", err);
      return res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:taskId", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");
      const patch = validateUpdateInput(req.body ?? {});
      const task = await updateTask(
        { db, FieldValue, clientId: CLIENT_ID, caller: { email: auth.email, role: auth.role } },
        req.params.taskId,
        patch,
      );
      return res.json({ task });
    } catch (err) {
      if (err instanceof TaskValidationError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[Tasks] update failed:", err);
      return res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:taskId", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const db = await getAdminDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const { FieldValue } = await import("firebase-admin/firestore");
      await deleteTask(
        { db, FieldValue, clientId: CLIENT_ID, caller: { email: auth.email, role: auth.role } },
        req.params.taskId,
      );
      return res.json({ ok: true });
    } catch (err) {
      if (err instanceof TaskValidationError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[Tasks] delete failed:", err);
      return res.status(500).json({ error: "Failed to delete task" });
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
      const appointmentId = sanitizeText(req.body?.appointmentId, 120);
      const name = sanitizeText(req.body?.name, 160);
      const customerEmail = sanitizeText(req.body?.customerEmail, 200).toLowerCase();
      const mode = req.body?.mode === "deposit" ? "deposit" as const : "full" as const;
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
      if (provider === "none") {
        return res.status(400).json({ error: "No online payment provider configured for this client." });
      }

      let gateway: ServerPaymentGateway;
      try {
        gateway = await resolvePaymentGateway(provider);
      } catch (err) {
        console.warn(`[Checkout] Failed to resolve gateway "${provider}":`, err instanceof Error ? err.message : err);
        return res.status(503).json({
          error: "Payment service not configured",
          status: 503,
          details: `Provider "${provider}" is not available. Check credentials.`,
        });
      }

      const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
      const result = await gateway.createCheckoutSession({
        appointmentId,
        customerEmail,
        serviceName: name,
        amountCents: price,
        mode,
        successUrl: `${baseUrl}/?booking_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/?booking_status=cancelled`,
        clientId: CLIENT_ID,
      });

      res.json({ id: result.sessionId, url: result.redirectUrl });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session." });
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
