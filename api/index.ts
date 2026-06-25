/**
 * Vercel Serverless Function.
 *
 * Security-critical shared logic (admin auth, payment gateways/webhooks,
 * booking validation, admin chat routing + tool dispatch) lives in
 * src/lib/api/* and src/lib/{intent-router,ai/*,admin-users}.ts and is
 * imported by BOTH runtimes — see docs/ARCHITECTURE.md and
 * tests/api-parity.test.ts. A few non-critical helper blocks below are
 * still inline copies of src/lib modules (whatsapp-inbox, customer-pipeline,
 * crm-metrics, tasks route helpers) — keep those in sync until extracted.
 *
 * server.ts is kept intact for local dev (`npm run dev` / `tsx server.ts`).
 */
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Resend } from "resend";
import type { Request, Response, NextFunction, Express } from "express";
import { createHash, createSign, createVerify } from "crypto";
import {
  VALID_PROVIDERS,
  buildPaymentGateway,
  createCredentialCache,
  type PaymentCredentials,
  type PaymentProvider,
  type ServerPaymentGateway,
} from "../src/lib/api/payment-gateways.js";
import {
  requireAdminAuth as requireAdminAuthGate,
  verifyFirebaseIdToken,
} from "../src/lib/api/admin-auth.js";
import {
  BookingConflictError,
  createBookingWithManifest,
  isValidBookingDate,
  isValidBookingDuration,
  isValidBookingTime,
  resolveTrustedBookingMetadata,
} from "../src/lib/api/booking-validation.js";
import {
  ADMIN_ROLES,
  canAssignRole,
  canRemoveRole,
  isAdminRole,
  isAdminStatus,
  normalizeAdminEmail,
  type AdminRole,
  type AdminUserStatus,
} from "../src/lib/admin-users.js";
import {
  ADMIN_TOOL_DECLARATIONS,
  ADMIN_TOOLS_PROMPT_FRAGMENT,
  AdminActionError,
  AdminToolValidationError,
  GET_CRM_SNAPSHOT_DECLARATION,
  buildScopedToolsFragment,
  dispatchAdminAction,
  isKnownAction,
} from "../src/lib/ai/admin-tools.js";
import {
  dispatchStockAction,
  formatStockResult,
  type StockActionResult,
} from "../src/lib/ai/stock-tools.js";
import {
  formatTasksResult,
  type TasksActionResult,
  type TasksLang,
} from "../src/lib/ai/tasks-tools.js";
import {
  ALL_ADMIN_TOOLS,
  isStubAction,
  routeAdminIntent,
  routePublicIntent,
  stubActionMessage,
  type AdminRouteResult,
  type AdminToolName,
  type PublicChatContext,
} from "../src/lib/intent-router.js";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// ─── Startup Diagnostics ──────────────────────────────────────────────────────
function logStartupStatus() {
  const tag = "[Template Setup]";

  // REQUIRED: missing any of these in production → 503 bootstrap failure
  const required = [
    { key: process.env.FIREBASE_PROJECT_ID?.trim(), label: "FIREBASE_PROJECT_ID", feature: "Firestore access (tenant config, kill-switch)" },
    { key: CLIENT_ID,                               label: "CLIENT_ID",            feature: "Tenant scoping" },
    { key: process.env.GEMINI_API_KEY,              label: "GEMINI_API_KEY",       feature: "AI chat & style consultation" },
  ];

  const optional = [
    { key: process.env.STRIPE_SECRET_KEY,           label: "STRIPE_SECRET_KEY",           feature: "Stripe payments" },
    { key: process.env.STRIPE_WEBHOOK_SECRET,       label: "STRIPE_WEBHOOK_SECRET",       feature: "Stripe webhook verification" },
    { key: process.env.VITE_STRIPE_PUBLISHABLE_KEY, label: "VITE_STRIPE_PUBLISHABLE_KEY", feature: "Stripe frontend" },
    { key: process.env.EMAIL_PROVIDER_API_KEY,      label: "EMAIL_PROVIDER_API_KEY",      feature: "Email notifications (Resend)" },
    { key: process.env.BUSINESS_OWNER_EMAIL,        label: "BUSINESS_OWNER_EMAIL",        feature: "Notification recipient" },
    { key: process.env.VITE_ADMIN_EMAIL,            label: "VITE_ADMIN_EMAIL",            feature: "Admin panel access" },
  ];

  console.log(`\n${tag} ─── Service Configuration Status ───`);

  const missingRequired: string[] = [];
  for (const { key, label, feature } of required) {
    if (key && key.trim() !== "") {
      console.log(`  ✓  [REQUIRED] ${label.padEnd(36)} → ${feature}`);
    } else {
      console.error(`  ✗  [REQUIRED] ${label.padEnd(36)} → ${feature} (MISSING)`);
      missingRequired.push(label);
    }
  }

  for (const { key, label, feature } of optional) {
    if (key && key.trim() !== "") {
      console.log(`  ✓  [optional] ${label.padEnd(36)} → ${feature}`);
    } else {
      console.warn(`  ✗  [optional] ${label.padEnd(36)} → ${feature} (DISABLED — add key to .env)`);
    }
  }

  if (missingRequired.length > 0 && process.env.NODE_ENV === "production") {
    throw new Error(
      `${tag} Missing required environment variables: ${missingRequired.join(", ")}. ` +
      `Set them in Vercel Project Settings → Environment Variables.`
    );
  }

  if (missingRequired.length > 0) {
    console.warn(`${tag} Dev: required vars missing (${missingRequired.join(", ")}) — would fail in production.\n`);
  } else {
    console.log(`${tag} All required integrations configured.\n`);
  }
}

// Models tried in order until one succeeds.
// Solo Flash — se elimina el fallback a Pro para controlar costos.
// supportsJsonMode=true → include responseMimeType in generationConfig when caller requests JSON.
const GEMINI_MODEL_CANDIDATES: Array<{ base: string; model: string; supportsJsonMode: boolean }> = [
  { base: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash", supportsJsonMode: true },
];

type GeminiFunctionCall = { name: string; args: Record<string, unknown> };
type GeminiFunctionResponse = { name: string; response: Record<string, unknown> };
type GeminiPart =
  | { text: string }
  | { functionCall: GeminiFunctionCall }
  | { functionResponse: GeminiFunctionResponse };
type GeminiChatPart = { role: "user" | "model" | "function"; parts: GeminiPart[] };
type ClientStatus = "active" | "suspended" | "trial" | "maintenance" | "archived";

// ─── Server Payment Gateway Adapter ──────────────────────────────────────────
// Types + builders live in src/lib/api/payment-gateways.ts (shared with
// server.ts so webhook verification fixes land in both runtimes).
type FirestoreField =
  | { stringValue: string }
  | { integerValue: string }
  | { timestampValue: string }
  | { booleanValue: boolean }
  | { nullValue: null };

// Server + Vercel serverless: prefer explicit CLIENT_ID; VITE_* is build-time in some hosts and may be missing at runtime in /api.
const CLIENT_ID =
  process.env.CLIENT_ID?.trim() ||
  process.env.NEXT_PUBLIC_CLIENT_ID?.trim() ||
  process.env.VITE_CLIENT_ID?.trim() ||
  "";

// ─── Firestore REST Kill-switch ───────────────────────────────────────────────
// Reads clients/{clientId}.status via Firestore REST API, authenticated with a
// Google OAuth2 access token obtained from a service account JWT (RS256).
// No firebase-admin SDK at module top-level — avoids gRPC cold-start hang in
// Vercel serverless. Handlers that DO need firebase-admin (notification logs,
// contact inbox, AI tool actions) load it via dynamic import inside the
// handler — see /api/ai/chat and /api/ai/action below for the pattern.
//
// Required env vars (Vercel Project Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT_EMAIL  — "client_email" from service account JSON
//   FIREBASE_SERVICE_ACCOUNT_KEY    — "private_key" from service account JSON
//                                     (paste the full PEM; Vercel preserves \n)
//
// Fail-open policy: if credentials are absent, Firestore is unreachable, or the
// clients document does not exist, status defaults to "active" (never blocks).

// ── JWT / OAuth2 helpers ──────────────────────────────────────────────────────

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildServiceAccountJWT(clientEmail: string, privateKey: string): string {
  const now     = Math.floor(Date.now() / 1000);
  const header  = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${base64UrlEncode(signer.sign(privateKey))}`;
}

// In-memory cache: OAuth2 access token (1 h TTL, refreshed 5 min early)
let accessTokenCache: { token: string; expiresAt: number } | null = null;

async function getFirestoreAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (accessTokenCache && accessTokenCache.expiresAt > now) return accessTokenCache.token;

  const clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey  = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    console.warn("[Kill-switch] FIREBASE_SERVICE_ACCOUNT_EMAIL / KEY not set — kill-switch disabled (degraded mode).");
    return null;
  }

  try {
    const jwt = buildServiceAccountJWT(clientEmail, privateKey);
    const res  = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion:  jwt,
      }).toString(),
    });
    if (!res.ok) {
      console.error("[Kill-switch] Token exchange failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    accessTokenCache = { token: data.access_token, expiresAt: now + (data.expires_in - 300) * 1000 };
    return data.access_token;
  } catch (err) {
    console.error("[Kill-switch] Failed to obtain OAuth2 access token:", err);
    return null;
  }
}

// In-memory cache: client status (30 s TTL)
let clientStateCache: { status: ClientStatus; provider: PaymentProvider; expiresAt: number } | null = null;

async function getClientRuntimeState(): Promise<{ status: ClientStatus; provider: PaymentProvider }> {
  const now = Date.now();
  if (clientStateCache && clientStateCache.expiresAt > now) {
    return { status: clientStateCache.status, provider: clientStateCache.provider };
  }

  const providerEnv = process.env.PAYMENT_PROVIDER as PaymentProvider | undefined;
  const envProvider: PaymentProvider =
    providerEnv && VALID_PROVIDERS.includes(providerEnv)
      ? providerEnv
      : "stripe";

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const databaseId =
    process.env.FIREBASE_DATABASE_ID?.trim()      ||
    process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
    "default";

  if (!projectId || !CLIENT_ID) {
    console.warn("[Kill-switch] PROJECT_ID or CLIENT_ID missing — skipping kill-switch, defaulting active.");
    return { status: "active", provider: envProvider };
  }

  const token = await getFirestoreAccessToken();
  if (!token) return { status: "active", provider: envProvider };

  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

    const clientRes = await fetch(`${baseUrl}/clients/${CLIENT_ID}`, { headers: { Authorization: `Bearer ${token}` } });

    if (clientRes.status === 404) return { status: "active", provider: envProvider };
    if (!clientRes.ok) {
      console.error("[Kill-switch] Firestore REST read failed:", clientRes.status, await clientRes.text());
      return { status: "active", provider: envProvider };
    }

    const doc = (await clientRes.json()) as {
      fields?: {
        status?: { stringValue?: string };
        defaultPaymentProvider?: { stringValue?: string };
      };
    };

    const validStatuses: ClientStatus[] = ["active", "suspended", "trial", "maintenance", "archived"];

    const rawStatus = doc.fields?.status?.stringValue;
    const status: ClientStatus = validStatuses.includes(rawStatus as ClientStatus)
      ? (rawStatus as ClientStatus)
      : "active";

    // Provider resolution: config/{clientId}.payment.provider (hub-managed) →
    // clients/{clientId}.defaultPaymentProvider (legacy) → env var → "stripe"
    let providerRaw: string | undefined;
    try {
      const configRes = await fetch(`${baseUrl}/config/${CLIENT_ID}`, { headers: { Authorization: `Bearer ${token}` } });
      if (configRes.ok) {
        const configDoc = (await configRes.json()) as {
          fields?: { payment?: { mapValue?: { fields?: { provider?: { stringValue?: string } } } } };
        };
        providerRaw = configDoc.fields?.payment?.mapValue?.fields?.provider?.stringValue;
      }
    } catch { /* config doc optional */ }

    if (!providerRaw) {
      providerRaw = doc.fields?.defaultPaymentProvider?.stringValue;
    }

    const resolvedProvider: PaymentProvider = VALID_PROVIDERS.includes(providerRaw as PaymentProvider)
      ? (providerRaw as PaymentProvider)
      : envProvider;

    clientStateCache = { status, provider: resolvedProvider, expiresAt: now + 30_000 };
    return { status, provider: resolvedProvider };
  } catch (err) {
    console.error("[Kill-switch] Unexpected error reading client status:", err);
    return { status: "active", provider: envProvider };
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

// ─── Firebase ID Token Verification ──────────────────────────────────────────
// Shared implementation in src/lib/api/admin-auth.ts (REST-only cert check —
// SDK-free to avoid the gRPC cold-start hang documented above) so both
// runtimes behave identically.

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

// ─── Admin role types (Bloque E) ─────────────────────────────────────────────
// Imported from src/lib/admin-users.ts (shared with server.ts).

async function lookupAdminUser(
  normalizedEmail: string,
): Promise<{ role: AdminRole; status: AdminUserStatus } | null> {
  try {
    const doc = await firestoreRestGetDocument("admin_users", normalizedEmail);
    if (!doc) return null;
    const fields = doc.fields ?? {};
    const clientId = decodeFirestoreValue(fields.clientId);
    if (clientId !== CLIENT_ID) return null;
    const role = decodeFirestoreValue(fields.role);
    const status = decodeFirestoreValue(fields.status);
    if (!isAdminRole(role)) return null;
    return { role, status: isAdminStatus(status) ? status : "active" };
  } catch (err) {
    console.warn("[Auth] admin_users lookup failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Gate for admin-scoped endpoints. Shared implementation (M-2 email_verified
 * check + A-6 no-env-fallback policy) lives in src/lib/api/admin-auth.ts;
 * this runtime injects the Firestore REST admin_users lookup.
 */
async function requireAdminAuth(
  req: Request,
  res: Response,
): Promise<{ email: string; uid: string; role: AdminRole } | null> {
  return requireAdminAuthGate(req, res, lookupAdminUser);
}

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://js.stripe.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.google.com https://*.stripe.com wss://*.firebaseio.com https://www.googletagmanager.com https://*.google-analytics.com",
    "frame-src https://js.stripe.com https://*.cardcom.solutions https://*.firebaseapp.com https://accounts.google.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; "));
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

  if (req.path === "/api/webhook" || req.path === "/api/daily-digest") {
    return next();
  }

  const origin = req.headers.origin;
  if (!origin) {
    const hasAuthHeader = !!req.headers.authorization;
    if (!hasAuthHeader) {
      console.warn(`[Security] Blocked originless request to ${req.path} from ${getClientIp(req)}`);
      return res.status(403).json({ error: "Origin header required." });
    }
    return next();
  }

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
    maxOutputTokens?: number;
  },
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: {
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
      ...(opts.maxOutputTokens != null ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  let lastError = "No model candidates defined";
  for (const { base, model, supportsJsonMode } of GEMINI_MODEL_CANDIDATES) {
    // Build per-candidate body: strip responseMimeType for models that don't support it
    const candidateBody = { ...body };
    if (!supportsJsonMode && opts.responseMimeType) {
      const gc = { ...(candidateBody.generationConfig as Record<string, unknown>) };
      delete gc.responseMimeType;
      candidateBody.generationConfig = gc;
    }
    const url = `${base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidateBody),
      });

      const data = (await res.json()) as {
        error?: { code?: number; message?: string; status?: string };
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      if (!res.ok) {
        const msg = data?.error?.message ?? res.statusText;
        const code = data?.error?.code ?? res.status;
        console.warn(`[gemini] ${model} → ${code}: ${msg}`);
        // 404 = model not found/deprecated; 403 = quota/billing; try next
        if (code === 404 || code === 400) { lastError = msg; continue; }
        // 429 rate limit or other non-retriable — still try next model
        lastError = msg; continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text == null || text === "") {
        lastError = "Empty response from model";
        continue;
      }
      console.log(`[gemini] success with ${model}`);
      return text;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[gemini] ${model} fetch error: ${lastError}`);
    }
  }

  throw new Error(`All Gemini model candidates failed. Last error: ${lastError}`);
}

type GeminiRichResult = {
  text: string;
  functionCalls: GeminiFunctionCall[];
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

/** Variant of geminiGenerateContent that surfaces functionCall parts and
 * accepts a `tools` payload for native function calling. */
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
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: {
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.maxOutputTokens != null ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    },
  };
  if (opts.systemInstruction) body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  if (opts.tools) body.tools = opts.tools;

  let lastError = "No model candidates defined";
  for (const { base, model } of GEMINI_MODEL_CANDIDATES) {
    const url = `${base}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: { code?: number; message?: string };
        candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };
      if (!res.ok) {
        lastError = data?.error?.message ?? res.statusText;
        console.warn(`[gemini] ${model} → ${data?.error?.code ?? res.status}: ${lastError}`);
        continue;
      }
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
      return { text, functionCalls, usage: data.usageMetadata };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[gemini] ${model} fetch error: ${lastError}`);
    }
  }
  throw new Error(`All Gemini model candidates failed. Last error: ${lastError}`);
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
// Shared builders in src/lib/api/payment-gateways.ts. This runtime only
// supplies the credential loader (Firestore REST — no firebase-admin at
// module top-level, see kill-switch note above).

const getPaymentCredentials = createCredentialCache(async (): Promise<PaymentCredentials> => {
  const token = await getFirestoreAccessToken();
  if (!token) return {};

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const databaseId =
    process.env.FIREBASE_DATABASE_ID?.trim() ||
    process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
    "default";

  if (!projectId || !CLIENT_ID) return {};

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/payment_credentials/${CLIENT_ID}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return {};
    const doc = (await res.json()) as { fields?: Record<string, { stringValue?: string }> };
    const creds: PaymentCredentials = {};
    if (doc.fields) {
      for (const [k, v] of Object.entries(doc.fields)) {
        if (v.stringValue) creds[k] = v.stringValue;
      }
    }
    return creds;
  } catch (err) {
    console.warn("[Payment] Failed to read credentials from Firestore:", err instanceof Error ? err.message : err);
    return {};
  }
});

async function resolvePaymentGateway(provider: PaymentProvider): Promise<ServerPaymentGateway> {
  return buildPaymentGateway(provider, await getPaymentCredentials(), CLIENT_ID);
}

function buildCrmInsightPrompt(
  kpis: Record<string, unknown>,
  recentAppointments: unknown[],
  uiLanguage: "he" | "en",
  businessContext?: {
    services?: { name: string; duration: number; price: number }[];
    staff?: { name: string; specialty: string }[];
  },
): string {
  const langInstruction =
    uiLanguage === "he"
      ? "You MUST respond entirely in Hebrew. All text in the JSON values must be in Hebrew."
      : "Respond in English.";

  const bizParts: string[] = [];
  if (businessContext?.services && businessContext.services.length > 0) {
    bizParts.push("SERVICES OFFERED:");
    for (const s of businessContext.services) {
      bizParts.push(`- ${s.name}: ${s.duration} min, $${s.price}`);
    }
  }
  if (businessContext?.staff && businessContext.staff.length > 0) {
    bizParts.push("TEAM:");
    for (const s of businessContext.staff) {
      bizParts.push(`- ${s.name}${s.specialty ? ` (${s.specialty})` : ""}`);
    }
  }
  const bizSection = bizParts.length > 0 ? "\n" + bizParts.join("\n") + "\n" : "";

  return `You are a CRM analyst for a premium service business.
${langInstruction}
${bizSection}
PERIOD METRICS:
${JSON.stringify(kpis, null, 2)}

RECENT APPOINTMENTS (sample, up to 20):
${JSON.stringify(recentAppointments.slice(0, 20), null, 2)}

Provide a short CRM snapshot: overall health, top 2-3 opportunities (e.g. upsell, rebooking gap, underused slot, staff utilization), and a churn risk note based on cancellation patterns. Reference specific services and staff by name when relevant.

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

// ─── Agentkit notifications (inline copy of src/lib/notify-agentkit.ts) ────
// KEEP IN SYNC with src/lib/notify-agentkit.ts. See docs/ARCHITECTURE.md for
// why server.ts can import from src/ and api/index.ts cannot.

const AGENTKIT_TIMEOUT_MS = 4000;

type AgentkitConfig = { url: string; secret: string; clientId: string };

type AppointmentPayload = {
  date: string;
  time: string;
  serviceName?: string;
  staffName?: string;
  staffId?: string;
  customerName?: string;
  customerPhone?: string;
  businessName?: string;
  appointmentId?: string;
  duration?: number;
  reviewLink?: string;
};

function getAgentkitConfig(): AgentkitConfig | null {
  const url = (process.env.WHATSAPP_AGENT_URL || "").trim().replace(/\/+$/, "");
  const secret = (process.env.AGENT_API_SECRET || "").trim();
  const clientId = (process.env.CLIENT_ID || process.env.VITE_CLIENT_ID || "").trim();
  if (!url || !secret || !clientId) return null;
  return { url, secret, clientId };
}

function getNotificationRecipients(): { adminPhones: string[]; staffPhones: string[] } {
  const owner = (process.env.BUSINESS_OWNER_PHONE || "").trim();
  const adminPhones = owner ? [owner] : [];
  const staffPhones = (process.env.STAFF_PHONES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { adminPhones, staffPhones };
}

async function postToAgent(path: string, body: unknown): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGENTKIT_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-agent-secret": cfg.secret },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Agentkit ${path}] non-2xx ${res.status}: ${text.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Agentkit ${path}] failed: ${msg}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Notification Channel Config (inline copy — keep in sync with src/lib/notification-channels.ts) ──

type NotificationChannel = "whatsapp" | "email" | "both";
type NotificationEvent =
  | "booking_confirmation_customer" | "reminder_24h_customer"
  | "cancellation_customer" | "reschedule_customer"
  | "new_lead_owner" | "new_booking_owner" | "new_booking_staff"
  | "review_request_customer";
type NotificationChannelConfig = Record<NotificationEvent, NotificationChannel>;

const DEFAULT_CHANNEL_CONFIG: NotificationChannelConfig = {
  booking_confirmation_customer: "whatsapp",
  reminder_24h_customer: "whatsapp",
  cancellation_customer: "whatsapp",
  reschedule_customer: "whatsapp",
  new_lead_owner: "email",
  new_booking_owner: "email",
  new_booking_staff: "email",
  review_request_customer: "email",
};

function resolveChannelConfig(overrides?: Partial<Record<string, unknown>>): NotificationChannelConfig {
  if (!overrides || typeof overrides !== "object") return { ...DEFAULT_CHANNEL_CONFIG };
  const validChannels = new Set(["whatsapp", "email", "both"]);
  const validEvents = new Set(Object.keys(DEFAULT_CHANNEL_CONFIG));
  const merged = { ...DEFAULT_CHANNEL_CONFIG };
  for (const [key, value] of Object.entries(overrides)) {
    if (validEvents.has(key) && typeof value === "string" && validChannels.has(value)) {
      merged[key as NotificationEvent] = value as NotificationChannel;
    }
  }
  return merged;
}

function shouldUseChannel(config: NotificationChannelConfig, event: NotificationEvent, channel: "whatsapp" | "email"): boolean {
  const setting = config[event];
  return setting === channel || setting === "both";
}

let channelConfigCache: { config: NotificationChannelConfig; expiresAt: number } | null = null;
const CHANNEL_CONFIG_TTL_MS = 60_000;

async function getChannelConfig(): Promise<NotificationChannelConfig> {
  const now = Date.now();
  if (channelConfigCache && now < channelConfigCache.expiresAt) return channelConfigCache.config;
  try {
    if (CLIENT_ID) {
      const doc = await firestoreRestGetDocument("config", CLIENT_ID);
      const notifField = doc?.fields?.notifications as { mapValue?: { fields?: Record<string, unknown> } } | undefined;
      const channelsField = notifField?.mapValue?.fields?.channels as { mapValue?: { fields?: Record<string, unknown> } } | undefined;
      const channels = channelsField?.mapValue?.fields;
      const overrides: Record<string, string> = {};
      if (channels) {
        for (const [key, val] of Object.entries(channels)) {
          const sv = (val as { stringValue?: string })?.stringValue;
          if (sv) overrides[key] = sv;
        }
      }
      const config = resolveChannelConfig(Object.keys(overrides).length > 0 ? overrides : undefined);
      channelConfigCache = { config, expiresAt: now + CHANNEL_CONFIG_TTL_MS };
      return config;
    }
  } catch { /* Firestore unavailable — use defaults */ }
  return { ...DEFAULT_CHANNEL_CONFIG };
}

// ── Customer-facing email helpers (inline copy — keep in sync with server.ts) ──

async function sendEmailToCustomer(params: {
  to: string; subject: string; html: string; type: "booking" | "reminder" | "contact";
}): Promise<void> {
  const resend = getResend();
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
  if (!resend) {
    writeNotificationLog({ type: params.type, recipient: params.to, subject: params.subject, status: "queued" });
    return;
  }
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail, to: params.to, subject: params.subject, html: params.html,
    });
    if (error) {
      writeNotificationLog({ type: params.type, recipient: params.to, subject: params.subject, status: "failed", error: String(error) });
      return;
    }
    writeNotificationLog({ type: params.type, recipient: params.to, subject: params.subject, status: "sent", providerMessageId: data?.id });
  } catch (err) {
    writeNotificationLog({ type: params.type, recipient: params.to, subject: params.subject, status: "failed", error: String(err) });
  }
}

function buildCustomerBookingEmailHtml(appt: { serviceName: string; date: string; time: string; staffName?: string; businessName?: string }): string {
  const negocio = appt.businessName ? escapeHtml(appt.businessName) : "our studio";
  const staff = appt.staffName ? `<p><strong>With:</strong> ${escapeHtml(appt.staffName)}</p>` : "";
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#10b981;margin-bottom:24px">Booking Confirmed</h2><div style="background:#f9fafb;padding:16px;border-radius:8px;margin-bottom:20px"><p><strong>Service:</strong> ${escapeHtml(appt.serviceName)}</p><p><strong>Date:</strong> ${escapeHtml(appt.date)}</p><p><strong>Time:</strong> ${escapeHtml(appt.time)}</p>${staff}</div><p style="color:#374151">We look forward to seeing you at ${negocio}.</p><p style="font-size:12px;color:#6b7280;margin-top:24px">This email was sent automatically. Please do not reply.</p></div>`;
}

function buildCustomerReminderEmailHtml(appt: { serviceName: string; date: string; time: string; staffName?: string; businessName?: string }): string {
  const negocio = appt.businessName ? escapeHtml(appt.businessName) : "our studio";
  const staff = appt.staffName ? ` with ${escapeHtml(appt.staffName)}` : "";
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#f59e0b;margin-bottom:24px">Appointment Reminder</h2><p style="color:#374151;font-size:16px">Just a reminder: your ${escapeHtml(appt.serviceName)} appointment${staff} at ${negocio} is tomorrow.</p><div style="background:#f9fafb;padding:16px;border-radius:8px;margin:20px 0"><p><strong>Date:</strong> ${escapeHtml(appt.date)}</p><p><strong>Time:</strong> ${escapeHtml(appt.time)}</p></div><p style="font-size:12px;color:#6b7280;margin-top:24px">This email was sent automatically. Please do not reply.</p></div>`;
}

function buildCustomerCancellationEmailHtml(appt: { serviceName: string; date: string; time: string; businessName?: string }, reason?: string): string {
  const negocio = appt.businessName ? escapeHtml(appt.businessName) : "our studio";
  const reasonLine = reason ? `<p style="color:#6b7280">Reason: ${escapeHtml(reason)}</p>` : "";
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#ef4444;margin-bottom:24px">Appointment Cancelled</h2><p style="color:#374151">Your ${escapeHtml(appt.serviceName)} appointment on ${escapeHtml(appt.date)} at ${escapeHtml(appt.time)} at ${negocio} has been cancelled.</p>${reasonLine}<p style="color:#374151;margin-top:16px">If you'd like to rebook, please visit our website.</p><p style="font-size:12px;color:#6b7280;margin-top:24px">This email was sent automatically. Please do not reply.</p></div>`;
}

function buildCustomerRescheduleEmailHtml(newAppt: { serviceName: string; date: string; time: string; staffName?: string; businessName?: string }): string {
  const negocio = newAppt.businessName ? escapeHtml(newAppt.businessName) : "our studio";
  const staff = newAppt.staffName ? `<p><strong>With:</strong> ${escapeHtml(newAppt.staffName)}</p>` : "";
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#f59e0b;margin-bottom:24px">Appointment Rescheduled</h2><p style="color:#374151">Your appointment has been rescheduled to a new date and time:</p><div style="background:#f9fafb;padding:16px;border-radius:8px;margin:20px 0"><p><strong>Service:</strong> ${escapeHtml(newAppt.serviceName)}</p><p><strong>New Date:</strong> ${escapeHtml(newAppt.date)}</p><p><strong>New Time:</strong> ${escapeHtml(newAppt.time)}</p>${staff}</div><p style="color:#374151">We look forward to seeing you at ${negocio}.</p><p style="font-size:12px;color:#6b7280;margin-top:24px">This email was sent automatically. Please do not reply.</p></div>`;
}

async function notifyAgentLeadCreated(params: {
  nombre: string; telefono?: string; email?: string; mensaje?: string;
  fuente?: string; adminPhones: string[];
}): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) return false;
  return postToAgent("/webhook/lead", {
    clientId: cfg.clientId,
    nombre: params.nombre,
    telefono: params.telefono || null,
    email: params.email || null,
    mensaje: params.mensaje || null,
    fuente: params.fuente || "web",
    adminPhones: params.adminPhones,
  });
}

function buildAdminBookingMessage(a: AppointmentPayload): string {
  const parts = [
    `Nuevo turno: ${a.customerName ?? "cliente"} (${a.customerPhone ?? "sin tel"})`,
    `${a.serviceName ?? "servicio"} el ${a.date} a las ${a.time}`,
  ];
  if (a.staffName) parts.push(`con ${a.staffName}`);
  return parts.join("\n");
}

function buildStaffBookingMessage(a: AppointmentPayload): string {
  return (
    `Turno asignado\n` +
    `Cliente: ${a.customerName ?? "cliente"} (${a.customerPhone ?? "sin tel"})\n` +
    `Servicio: ${a.serviceName ?? "servicio"}\n` +
    `Cuando: ${a.date} ${a.time}`
  );
}

function buildCustomerConfirmationMessage(a: AppointmentPayload): string {
  const negocio = a.businessName ? ` en ${a.businessName}` : "";
  const conStaff = a.staffName ? ` con ${a.staffName}` : "";
  return (
    `Turno confirmado${negocio}: ${a.serviceName ?? "servicio"} el ${a.date} ` +
    `a las ${a.time}${conStaff}.`
  );
}

async function notifyAgentAppointmentBooked(params: {
  appointment: AppointmentPayload;
  adminPhones: string[];
  staffPhones?: string[];
  customerPhone?: string;
  customerMessage?: string;
  adminMessage?: string;
  staffMessage?: string;
}): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) return false;
  const appt = params.appointment;
  return postToAgent("/notify", {
    clientId: cfg.clientId,
    type: "appointment_booked",
    adminPhones: params.adminPhones,
    staffPhones: params.staffPhones || [],
    customerPhone: params.customerPhone || appt.customerPhone || null,
    message: params.adminMessage ?? buildAdminBookingMessage(appt),
    staffMessage: params.staffMessage ?? buildStaffBookingMessage(appt),
    customerMessage: params.customerMessage ?? buildCustomerConfirmationMessage(appt),
    appointment: appt,
    variables: {
      "1": appt.serviceName ?? "",
      "2": appt.date,
      "3": appt.time,
      "4": appt.staffName ?? appt.businessName ?? "",
    },
  });
}

async function notifyAgentAppointmentCancelled(params: {
  appointment: AppointmentPayload;
  adminPhones: string[];
  staffPhones?: string[];
  customerPhone?: string;
  reason?: string;
}): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) return false;
  const appt = params.appointment;
  const reasonSuffix = params.reason ? ` (${params.reason})` : "";
  return postToAgent("/notify", {
    clientId: cfg.clientId,
    type: "appointment_cancelled",
    adminPhones: params.adminPhones,
    staffPhones: params.staffPhones || [],
    customerPhone: params.customerPhone || appt.customerPhone || null,
    message: `Turno cancelado: ${appt.customerName ?? "cliente"} - ${appt.serviceName ?? "servicio"} el ${appt.date} ${appt.time}${reasonSuffix}`,
    staffMessage: `Turno cancelado: ${appt.customerName ?? "cliente"} el ${appt.date} ${appt.time}`,
    customerMessage: `Tu turno de ${appt.serviceName ?? "servicio"} del ${appt.date} a las ${appt.time} fue cancelado${reasonSuffix}.`,
    appointment: appt,
  });
}

async function notifyAgentAppointmentRescheduled(params: {
  oldAppointment: AppointmentPayload;
  newAppointment: AppointmentPayload;
  adminPhones: string[];
  staffPhones?: string[];
  customerPhone?: string;
}): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) return false;
  const oldA = params.oldAppointment;
  const newA = params.newAppointment;
  return postToAgent("/notify", {
    clientId: cfg.clientId,
    type: "appointment_rescheduled",
    adminPhones: params.adminPhones,
    staffPhones: params.staffPhones || [],
    customerPhone: params.customerPhone || newA.customerPhone || null,
    message:
      `Turno reprogramado: ${newA.customerName ?? "cliente"} - ` +
      `${newA.serviceName ?? "servicio"} ahora el ${newA.date} ${newA.time}`,
    staffMessage:
      `Turno reprogramado: ${newA.customerName ?? "cliente"} ` +
      `${newA.date} ${newA.time} (antes ${oldA.date} ${oldA.time})`,
    customerMessage:
      `Tu turno fue reprogramado: ${newA.serviceName ?? "servicio"} ` +
      `ahora el ${newA.date} a las ${newA.time}.`,
    oldAppointment: oldA,
    appointment: newA,
    variables: {
      "1": newA.serviceName ?? "",
      "2": newA.date,
      "3": newA.time,
      "4": newA.staffName ?? newA.businessName ?? "",
    },
  });
}

// Initialized Notification Helpers
const sendNotification = async (subject: string, data: any, type: 'booking' | 'contact') => {
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
 * Write a document to a Firestore collection via REST API.
 * Fire-and-forget: never throws, logs errors internally.
 */
async function firestoreRestCreate(
  collectionId: string,
  fields: Record<string, FirestoreField>,
): Promise<void> {
  try {
    const token = await getFirestoreAccessToken();
    if (!token) return;

    const projectId =
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    const databaseId =
      process.env.FIREBASE_DATABASE_ID?.trim() ||
      process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
      "default";

    if (!projectId) return;

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      console.error(`[firestoreRestCreate] ${collectionId} write failed:`, res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error(`[firestoreRestCreate] ${collectionId} error:`, err);
  }
}

async function getFirestoreRestContext(): Promise<{ token: string; baseUrl: string }> {
  const token = await getFirestoreAccessToken();
  if (!token) {
    throw new Error("Cannot authenticate with Firestore");
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const databaseId =
    process.env.FIREBASE_DATABASE_ID?.trim() ||
    process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
    "default";

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID not set");
  }

  return {
    token,
    baseUrl: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`,
  };
}

async function firestoreRestGetDocument(
  collectionId: string,
  documentId: string,
): Promise<{ fields?: Record<string, FirestoreField> } | null> {
  const { token, baseUrl } = await getFirestoreRestContext();
  const url = `${baseUrl}/${collectionId}/${encodeURIComponent(documentId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`[firestoreRestGetDocument] ${collectionId}/${documentId} failed: ${res.status} ${await res.text().catch(() => "")}`);
  }

  return (await res.json()) as { fields?: Record<string, FirestoreField> };
}

async function firestoreRestPatchDocument(
  collectionId: string,
  documentId: string,
  fields: Record<string, FirestoreField>,
): Promise<void> {
  const { token, baseUrl } = await getFirestoreRestContext();
  const params = new URLSearchParams();
  for (const fieldPath of Object.keys(fields)) {
    params.append("updateMask.fieldPaths", fieldPath);
  }

  const url = `${baseUrl}/${collectionId}/${encodeURIComponent(documentId)}?${params.toString()}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    throw new Error(`[firestoreRestPatchDocument] ${collectionId}/${documentId} failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
}

// ─── WhatsApp inbox helpers (inline copy of src/lib/whatsapp-inbox.ts) ───────
// api/index.ts is self-contained (see docs/ARCHITECTURE.md). Keep in sync with
// the source-of-truth module in src/lib/whatsapp-inbox.ts.

function normalizePhone(input: string): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return (hasPlus ? "+" : "") + digits;
}

function isValidPhone(value: string): boolean {
  return /^\+?\d{7,16}$/.test(value);
}

function conversationDocId(clientId: string, phone: string): string {
  const normalized = normalizePhone(phone);
  const hash = createHash("md5").update(normalized).digest("hex");
  return `${clientId}_${hash}`;
}

const OUTBOX_MESSAGE_MAX_LEN = 3_000;

function validateQueueMessageInput(input: {
  phone: unknown;
  message: unknown;
}): { ok: true; phone: string; message: string } | { ok: false; error: string } {
  const phoneRaw = typeof input.phone === "string" ? input.phone : "";
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: "phone is required" };
  if (!isValidPhone(phone)) return { ok: false, error: "phone is invalid" };

  const messageRaw = typeof input.message === "string" ? input.message.trim() : "";
  if (!messageRaw) return { ok: false, error: "message is required" };
  if (messageRaw.length > OUTBOX_MESSAGE_MAX_LEN) {
    return { ok: false, error: `message exceeds ${OUTBOX_MESSAGE_MAX_LEN} characters` };
  }
  return { ok: true, phone, message: messageRaw };
}

/**
 * Decode a Firestore REST field value into a JS value.
 * Handles the subset needed for whatsapp_conversations: stringValue,
 * timestampValue, booleanValue, arrayValue, mapValue, integerValue, nullValue.
 */
function decodeFirestoreValue(v: unknown): unknown {
  if (!v || typeof v !== "object") return undefined;
  const obj = v as Record<string, unknown>;
  if ("stringValue" in obj) return obj.stringValue as string;
  if ("timestampValue" in obj) return obj.timestampValue as string;
  if ("booleanValue" in obj) return obj.booleanValue as boolean;
  if ("integerValue" in obj) return Number(obj.integerValue);
  if ("doubleValue" in obj) return Number(obj.doubleValue);
  if ("nullValue" in obj) return null;
  if ("arrayValue" in obj) {
    const values = (obj.arrayValue as { values?: unknown[] } | undefined)?.values ?? [];
    return values.map(decodeFirestoreValue);
  }
  if ("mapValue" in obj) {
    const fields = (obj.mapValue as { fields?: Record<string, unknown> } | undefined)?.fields ?? {};
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) out[k] = decodeFirestoreValue(val);
    return out;
  }
  return undefined;
}

// ─── Customer pipeline helpers (inline copy of src/lib/customer-pipeline.ts) ─
// api/index.ts is self-contained (see docs/ARCHITECTURE.md). Keep in sync with
// the source-of-truth module in src/lib/customer-pipeline.ts.

type CustomerStage = "lead" | "contacted" | "scheduled" | "converted" | "lost";

const MAX_TAGS_PER_CUSTOMER = 20;
const MAX_TAG_LENGTH = 50;

function isValidStage(value: unknown): value is CustomerStage {
  return (
    value === "lead" ||
    value === "contacted" ||
    value === "scheduled" ||
    value === "converted" ||
    value === "lost"
  );
}

function normalizeTag(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (trimmed.length > MAX_TAG_LENGTH) return null;
  return trimmed;
}

function validateTagsPatch(
  input: unknown,
):
  | { ok: true; add: string[]; remove: string[] }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const body = input as { add?: unknown; remove?: unknown };
  if (body.add !== undefined && !Array.isArray(body.add)) {
    return { ok: false, error: "`add` must be an array of strings" };
  }
  if (body.remove !== undefined && !Array.isArray(body.remove)) {
    return { ok: false, error: "`remove` must be an array of strings" };
  }
  const add: string[] = [];
  for (const t of (body.add as unknown[] | undefined) ?? []) {
    const norm = normalizeTag(t);
    if (norm && !add.includes(norm)) add.push(norm);
  }
  const remove: string[] = [];
  for (const t of (body.remove as unknown[] | undefined) ?? []) {
    const norm = normalizeTag(t);
    if (norm && !remove.includes(norm)) remove.push(norm);
  }
  if (add.length === 0 && remove.length === 0) {
    return { ok: false, error: "`add` or `remove` must contain at least one tag" };
  }
  if (add.length > MAX_TAGS_PER_CUSTOMER) {
    return { ok: false, error: `\`add\` exceeds ${MAX_TAGS_PER_CUSTOMER} tags` };
  }
  return { ok: true, add, remove };
}

function applyTagsPatch(
  existing: readonly string[] | undefined,
  patch: { add: string[]; remove: string[] },
): string[] {
  const set = new Set<string>(existing ?? []);
  for (const tag of patch.remove) set.delete(tag);
  for (const tag of patch.add) {
    if (set.size >= MAX_TAGS_PER_CUSTOMER) break;
    set.add(tag);
  }
  return [...set];
}

// ─── CRM Metrics helpers (inline copy of src/lib/crm-metrics.ts) ─────────────
// api/index.ts is self-contained (see docs/ARCHITECTURE.md). Keep in sync with
// the source-of-truth module in src/lib/crm-metrics.ts.

type CrmMetricsRange = "7d" | "30d" | "mtd" | "all";

type CrmMetricsResponse = {
  range: CrmMetricsRange;
  rangeStart: string | null;
  rangeEnd: string;
  newLeads: { count: number; prevPeriod: number; deltaPct: number };
  conversion: {
    leads: number;
    appointments: number;
    completed: number;
    completedRate: number;
  };
  revenue: {
    totalCents: number;
    prevPeriodCents: number;
    deltaPct: number;
    byDayCents: { date: string; cents: number }[];
  };
  topServices: { serviceId: string; count: number; revenueCents: number }[];
  busiestDays: { day: number; hour: number; count: number }[];
  upcomingAppointments: {
    id: string;
    date: string;
    time: string;
    client: string;
    serviceId: string;
  }[];
  unreadMessages: number;
  cancellationRate: number;
  noShowRate: number;
  newVsRecurring: { new: number; recurring: number };
  appointmentsTotal: number;
};

type CrmRawAppointment = {
  id: string;
  status: string;
  serviceId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  date: string;
  time: string;
  amountPaidCents?: number;
  paymentStatus?: string;
  createdAtMs?: number;
};

type CrmRawCustomer = { id: string; phone?: string; email?: string; visitCount?: number };
type CrmRawInboxItem = { id: string; status: string; createdAtMs?: number };
type CrmRawLead = { id: string; createdAtMs?: number };

const CRM_METRICS_DOC_CAP = 5000;
const CRM_METRICS_CACHE_TTL_MS = 60_000;

function isValidRange(value: unknown): value is CrmMetricsRange {
  return value === "7d" || value === "30d" || value === "mtd" || value === "all";
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function crmRangeWindow(range: CrmMetricsRange, now: Date): {
  start: Date | null;
  end: Date;
  startIso: string | null;
  endIso: string;
} {
  const end = startOfDay(now);
  const endIso = isoDay(end);
  if (range === "all") return { start: null, end, startIso: null, endIso };
  let start: Date;
  if (range === "mtd") {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else {
    const days = range === "7d" ? 7 : 30;
    start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
  }
  return { start, end, startIso: isoDay(start), endIso };
}

function previousRangeWindow(range: CrmMetricsRange, now: Date): {
  start: Date | null;
  end: Date | null;
} {
  if (range === "all") return { start: null, end: null };
  const current = crmRangeWindow(range, now);
  if (!current.start) return { start: null, end: null };
  const lengthDays = Math.round((current.end.getTime() - current.start.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(current.start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (lengthDays - 1));
  return { start: prevStart, end: prevEnd };
}

function crmInDayRange(dateStr: string, startIso: string | null, endIso: string): boolean {
  if (!dateStr) return false;
  if (startIso && dateStr < startIso) return false;
  if (dateStr > endIso) return false;
  return true;
}

function crmInMsRange(ms: number | undefined, start: Date | null, end: Date | null): boolean {
  if (!ms) return false;
  if (start && ms < start.getTime()) return false;
  if (end && ms > end.getTime() + 86_399_999) return false;
  return true;
}

function crmDeltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function computeCrmMetrics(input: {
  range: CrmMetricsRange;
  now: Date;
  appointments: CrmRawAppointment[];
  customers: CrmRawCustomer[];
  inbox: CrmRawInboxItem[];
  leads: CrmRawLead[];
}): CrmMetricsResponse {
  const { range, now, appointments, customers, inbox, leads } = input;
  const win = crmRangeWindow(range, now);
  const prev = previousRangeWindow(range, now);

  const leadSource = leads.length > 0
    ? leads.map((l) => ({ createdAtMs: l.createdAtMs }))
    : inbox.map((i) => ({ createdAtMs: i.createdAtMs }));

  const newLeadsCount = leadSource.filter((l) =>
    win.start ? crmInMsRange(l.createdAtMs, win.start, win.end) : true,
  ).length;
  const prevLeadsCount = leadSource.filter((l) =>
    prev.start ? crmInMsRange(l.createdAtMs, prev.start, prev.end) : false,
  ).length;

  const apptsInRange = appointments.filter((a) => crmInDayRange(a.date, win.startIso, win.endIso));
  const prevAppts = appointments.filter((a) =>
    crmInDayRange(a.date, prev.start ? isoDay(prev.start) : null, prev.end ? isoDay(prev.end) : win.endIso),
  );

  const completed = apptsInRange.filter((a) => a.status === "completed").length;
  const cancelled = apptsInRange.filter((a) => a.status === "cancelled").length;
  const noShow = apptsInRange.filter((a) => a.status === "no_show" || a.status === "expired").length;
  const cancellationRate = apptsInRange.length > 0
    ? Math.round((cancelled / apptsInRange.length) * 100)
    : 0;
  const noShowRate = completed + noShow > 0
    ? Math.round((noShow / (completed + noShow)) * 100)
    : 0;

  const isPaid = (a: CrmRawAppointment) =>
    a.paymentStatus === "paid" || a.paymentStatus === "deposit_paid";

  const totalRevenueCents = apptsInRange
    .filter(isPaid)
    .reduce((acc, a) => acc + (a.amountPaidCents ?? 0), 0);
  const prevRevenueCents = prevAppts
    .filter(isPaid)
    .reduce((acc, a) => acc + (a.amountPaidCents ?? 0), 0);

  const byDayCents: { date: string; cents: number }[] = [];
  if (win.start) {
    const byDayMap = new Map<string, number>();
    for (const a of apptsInRange) {
      if (!isPaid(a)) continue;
      byDayMap.set(a.date, (byDayMap.get(a.date) ?? 0) + (a.amountPaidCents ?? 0));
    }
    const cursor = new Date(win.start);
    while (cursor <= win.end) {
      const iso = isoDay(cursor);
      byDayCents.push({ date: iso, cents: byDayMap.get(iso) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const byDayMap = new Map<string, number>();
    for (const a of apptsInRange) {
      if (!isPaid(a)) continue;
      byDayMap.set(a.date, (byDayMap.get(a.date) ?? 0) + (a.amountPaidCents ?? 0));
    }
    for (const date of [...byDayMap.keys()].sort()) {
      byDayCents.push({ date, cents: byDayMap.get(date) ?? 0 });
    }
  }

  const svcMap = new Map<string, { count: number; revenueCents: number }>();
  for (const a of apptsInRange) {
    if (a.status === "cancelled") continue;
    const cur = svcMap.get(a.serviceId) ?? { count: 0, revenueCents: 0 };
    cur.count += 1;
    if (isPaid(a)) cur.revenueCents += a.amountPaidCents ?? 0;
    svcMap.set(a.serviceId, cur);
  }
  const topServices = [...svcMap.entries()]
    .map(([serviceId, v]) => ({ serviceId, ...v }))
    .sort((a, b) => b.count - a.count || b.revenueCents - a.revenueCents)
    .slice(0, 5);

  const heatMap = new Map<string, number>();
  for (const a of apptsInRange) {
    if (a.status === "cancelled") continue;
    const [yyyy, mm, dd] = a.date.split("-").map((n) => Number(n));
    if (!yyyy || !mm || !dd) continue;
    const day = new Date(yyyy, mm - 1, dd).getDay();
    const hour = Number(a.time.split(":")[0]);
    if (!Number.isFinite(hour)) continue;
    const key = `${day}-${hour}`;
    heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
  }
  const busiestDays = [...heatMap.entries()].map(([key, count]) => {
    const [d, h] = key.split("-").map(Number);
    return { day: d, hour: h, count };
  });

  const todayIso = isoDay(startOfDay(now));
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const upcomingAppointments = appointments
    .filter((a) => {
      if (a.status !== "confirmed" && a.status !== "pending") return false;
      if (a.date > todayIso) return true;
      if (a.date === todayIso && a.time >= nowHm) return true;
      return false;
    })
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      date: a.date,
      time: a.time,
      client: a.customerName,
      serviceId: a.serviceId,
    }));

  const unreadMessages = inbox.filter((i) => i.status === "new").length;

  const apptCustomerKeys = new Set<string>();
  for (const a of apptsInRange) {
    const key = (a.customerPhone || a.customerEmail || "").toLowerCase();
    if (key) apptCustomerKeys.add(key);
  }
  let newCount = 0;
  let recurringCount = 0;
  for (const key of apptCustomerKeys) {
    const customer = customers.find(
      (c) => (c.phone ?? "").toLowerCase() === key || (c.email ?? "").toLowerCase() === key,
    );
    const visits = customer?.visitCount ?? 1;
    if (visits <= 1) newCount += 1;
    else recurringCount += 1;
  }

  return {
    range,
    rangeStart: win.startIso,
    rangeEnd: win.endIso,
    newLeads: {
      count: newLeadsCount,
      prevPeriod: prevLeadsCount,
      deltaPct: crmDeltaPct(newLeadsCount, prevLeadsCount),
    },
    conversion: {
      leads: newLeadsCount,
      appointments: apptsInRange.length,
      completed,
      completedRate: newLeadsCount > 0 ? Math.round((completed / newLeadsCount) * 100) : 0,
    },
    revenue: {
      totalCents: totalRevenueCents,
      prevPeriodCents: prevRevenueCents,
      deltaPct: crmDeltaPct(totalRevenueCents, prevRevenueCents),
      byDayCents,
    },
    topServices,
    busiestDays,
    upcomingAppointments,
    unreadMessages,
    cancellationRate,
    noShowRate,
    newVsRecurring: { new: newCount, recurring: recurringCount },
    appointmentsTotal: apptsInRange.length,
  };
}

function buildDemoCrmMetrics(range: CrmMetricsRange, now: Date): CrmMetricsResponse {
  const win = crmRangeWindow(range, now);
  const startIso = win.startIso ?? isoDay(new Date(now.getFullYear(), now.getMonth() - 2, 1));
  const endIso = win.endIso;

  const byDayCents: { date: string; cents: number }[] = [];
  const start = win.start ?? new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const cursor = new Date(start);
  while (cursor <= win.end) {
    const dow = cursor.getDay();
    const base = dow === 0 || dow === 6 ? 45_000 : 22_000;
    const jitter = Math.floor((Math.sin(cursor.getDate() * 1.7) + 1) * 8_000);
    byDayCents.push({ date: isoDay(cursor), cents: base + jitter });
    cursor.setDate(cursor.getDate() + 1);
  }
  const totalCents = byDayCents.reduce((acc, d) => acc + d.cents, 0);
  const prevPeriodCents = Math.round(totalCents * 0.83);

  const busiestDays: { day: number; hour: number; count: number }[] = [];
  for (let d = 0; d < 7; d += 1) {
    for (let h = 9; h <= 20; h += 1) {
      const intensity = (h >= 10 && h <= 13) || (h >= 17 && h <= 20)
        ? Math.round(2 + Math.sin(d + h) * 1.5 + (d === 5 || d === 6 ? 2 : 0))
        : Math.max(0, Math.round(1 + Math.cos(d - h)));
      if (intensity > 0) busiestDays.push({ day: d, hour: h, count: intensity });
    }
  }

  const todayIso = isoDay(startOfDay(now));
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = isoDay(tomorrow);

  return {
    range,
    rangeStart: startIso,
    rangeEnd: endIso,
    newLeads: { count: 24, prevPeriod: 18, deltaPct: 33 },
    conversion: { leads: 24, appointments: 31, completed: 22, completedRate: 92 },
    revenue: {
      totalCents,
      prevPeriodCents,
      deltaPct: crmDeltaPct(totalCents, prevPeriodCents),
      byDayCents,
    },
    topServices: [
      { serviceId: "haircut", count: 14, revenueCents: 420_00 },
      { serviceId: "beard-trim", count: 9, revenueCents: 180_00 },
      { serviceId: "fade", count: 6, revenueCents: 210_00 },
      { serviceId: "kids-cut", count: 4, revenueCents: 80_00 },
      { serviceId: "shave", count: 2, revenueCents: 50_00 },
    ],
    busiestDays,
    upcomingAppointments: [
      { id: "u1", date: todayIso, time: "16:30", client: "David Cohen", serviceId: "haircut" },
      { id: "u2", date: todayIso, time: "17:15", client: "Yossi Levi", serviceId: "fade" },
      { id: "u3", date: todayIso, time: "18:00", client: "Eli Mizrahi", serviceId: "beard-trim" },
      { id: "u4", date: tomorrowIso, time: "10:00", client: "Avi Shapira", serviceId: "haircut" },
      { id: "u5", date: tomorrowIso, time: "11:30", client: "Tomer Ben-David", serviceId: "kids-cut" },
      { id: "u6", date: tomorrowIso, time: "13:00", client: "Ronen Katz", serviceId: "haircut" },
    ],
    unreadMessages: 3,
    cancellationRate: 8,
    noShowRate: 4,
    newVsRecurring: { new: 9, recurring: 22 },
    appointmentsTotal: 31,
  };
}

const crmMetricsCache = new Map<string, { payload: CrmMetricsResponse; expiresAt: number }>();

async function reconcilePaidCheckout(params: {
  appointmentId: string;
  amountTotalCents: number;
  provider: PaymentProvider;
  sessionId: string;
  paymentMode?: string;
}): Promise<void> {
  const { appointmentId, amountTotalCents, provider, sessionId, paymentMode } = params;

  const appointment = await firestoreRestGetDocument("appointments", appointmentId);
  if (!appointment) {
    throw new Error(`appointment not found for paid checkout: ${appointmentId}`);
  }

  const appointmentClientId = appointment.fields?.clientId && "stringValue" in appointment.fields.clientId
    ? appointment.fields.clientId.stringValue
    : undefined;
  if (appointmentClientId !== CLIENT_ID) {
    throw new Error(`appointment clientId mismatch for paid checkout: ${appointmentId}`);
  }

  const now = new Date().toISOString();
  const paymentStatus = paymentMode === "deposit" ? "deposit_paid" : "paid";
  await firestoreRestPatchDocument("appointments", appointmentId, {
    status: { stringValue: "confirmed" },
    paymentStatus: { stringValue: paymentStatus },
    amountPaidCents: { integerValue: String(amountTotalCents) },
    providerSessionId: { stringValue: sessionId },
    paymentProvider: { stringValue: provider },
    paidAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
  });
}

/**
 * Fire-and-forget: write a contact_inbox document via Firestore REST API.
 */
async function writeInboxEntry(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
  source: "web" | "chat" | "manual";
}): Promise<void> {
  const now = new Date().toISOString();
  await firestoreRestCreate("contact_inbox", {
    clientId: { stringValue: CLIENT_ID },
    name: { stringValue: params.name },
    email: { stringValue: params.email },
    subject: { stringValue: params.subject },
    message: { stringValue: params.message },
    source: { stringValue: params.source },
    status: { stringValue: "new" },
    createdAt: { timestampValue: now },
  });
}

/**
 * Fire-and-forget: write a notification_logs document via Firestore REST API.
 */
async function writeNotificationLog(params: {
  type: "booking" | "contact" | "reminder" | "marketing";
  recipient: string;
  subject?: string;
  status: "sent" | "failed" | "queued";
  providerMessageId?: string;
  error?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const fields: Record<string, { stringValue: string } | { timestampValue: string }> = {
    clientId: { stringValue: CLIENT_ID },
    channel: { stringValue: "email" },
    recipient: { stringValue: params.recipient },
    type: { stringValue: params.type },
    status: { stringValue: params.status },
    createdAt: { timestampValue: now },
  };
  if (params.subject) fields.subject = { stringValue: params.subject };
  if (params.providerMessageId) fields.providerMessageId = { stringValue: params.providerMessageId };
  if (params.error) fields.error = { stringValue: params.error };
  await firestoreRestCreate("notification_logs", fields);
}

// ─── Admin chat tools + intent router ───────────────────────────────────────
// Shared implementations in src/lib/ai/admin-tools.ts and
// src/lib/intent-router.ts (same modules server.ts consumes) — imported at
// the top of this file so both runtimes route and dispatch identically.

// ── Tasks (inline copy of src/lib/tasks.ts) ──────────────────────────────────
// Same shape and visibility rules; uses firebase-admin (loadAdminFirestore)
// for collection ops. Keep in sync with src/lib/tasks.ts.

type TaskStatusInline = "pending" | "in_progress" | "done" | "archived";
type TaskPriorityInline = "high" | "medium" | "low";

type TaskInline = {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  status: TaskStatusInline;
  priority: TaskPriorityInline;
  dueDate?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  shared: boolean;
  tags?: string[];
  relatedCustomerId?: string;
  relatedAppointmentId?: string;
  notes?: string;
};

function isTaskStatusInline(v: unknown): v is TaskStatusInline {
  return v === "pending" || v === "in_progress" || v === "done" || v === "archived";
}
function isTaskPriorityInline(v: unknown): v is TaskPriorityInline {
  return v === "high" || v === "medium" || v === "low";
}

class TaskValidationErrorInline extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "TaskValidationErrorInline";
  }
}

function addDaysInline(d: Date, days: number): Date {
  const c = new Date(d.getTime());
  c.setDate(c.getDate() + days);
  return c;
}
function endOfDayInline(d: Date): Date {
  const c = new Date(d.getTime());
  c.setHours(23, 59, 0, 0);
  return c;
}

function parseTaskDueDateInline(raw: string | undefined, now: Date = new Date()): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const enDays = trimmed.match(/^(?:en\s+(\d+)\s+d[ií]as?|in\s+(\d+)\s+days?)$/i);
  if (enDays) {
    const n = Number(enDays[1] ?? enDays[2]);
    if (Number.isFinite(n) && n > 0 && n < 366) {
      return endOfDayInline(addDaysInline(now, n)).toISOString();
    }
  }
  if (/^(?:hoy|today)$/i.test(trimmed)) return endOfDayInline(now).toISOString();
  if (/^(?:mañana|manana|tomorrow)$/i.test(trimmed)) return endOfDayInline(addDaysInline(now, 1)).toISOString();
  if (/^(?:pasado\s+mañana|pasado\s+manana|day\s+after\s+tomorrow)$/i.test(trimmed))
    return endOfDayInline(addDaysInline(now, 2)).toISOString();
  if (/^(?:la\s+pr[oó]xima\s+semana|pr[oó]xima\s+semana|next\s+week)$/i.test(trimmed))
    return endOfDayInline(addDaysInline(now, 7)).toISOString();
  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();
  return null;
}

function canSeeTaskInline(
  task: Pick<TaskInline, "createdBy" | "assignedTo" | "shared">,
  viewer: { email: string; role: AdminRole },
): boolean {
  if (viewer.role === "owner") return true;
  if (task.createdBy === viewer.email) return true;
  if (task.shared) return true;
  if (task.assignedTo && task.assignedTo === viewer.email) return true;
  return false;
}

function canEditTaskInline(
  task: Pick<TaskInline, "createdBy" | "assignedTo">,
  viewer: { email: string; role: AdminRole },
): "full" | "status_only" | "none" {
  if (viewer.role === "owner") return "full";
  if (task.createdBy === viewer.email) return "full";
  if (task.assignedTo && task.assignedTo === viewer.email) return "status_only";
  return "none";
}

function canDeleteTaskInline(
  task: Pick<TaskInline, "createdBy">,
  viewer: { email: string; role: AdminRole },
): boolean {
  return viewer.role === "owner" || task.createdBy === viewer.email;
}

function normalizeTaskTitleInline(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type FuzzyMatchInline =
  | { kind: "exact"; task: TaskInline }
  | { kind: "unique"; task: TaskInline }
  | { kind: "ambiguous"; tasks: TaskInline[] }
  | { kind: "none" };

function fuzzyFindTaskInline(fragment: string, candidates: readonly TaskInline[]): FuzzyMatchInline {
  const q = normalizeTaskTitleInline(fragment);
  if (!q) return { kind: "none" };
  const open = candidates.filter((t) => t.status !== "archived");
  const exact = open.filter((t) => normalizeTaskTitleInline(t.title) === q);
  if (exact.length === 1) return { kind: "exact", task: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", tasks: exact };
  const qWords = q.split(" ").filter(Boolean);
  const scored: { task: TaskInline; score: number }[] = [];
  for (const t of open) {
    const tn = normalizeTaskTitleInline(t.title);
    if (!tn) continue;
    let score = 0;
    if (tn.includes(q) || q.includes(tn)) score += 5;
    const tWords = tn.split(" ").filter(Boolean);
    for (const w of qWords) {
      if (tWords.includes(w)) score += 2;
      else if (tWords.some((tw) => tw.startsWith(w) || w.startsWith(tw))) score += 1;
    }
    if (score > 0) scored.push({ task: t, score });
  }
  if (scored.length === 0) return { kind: "none" };
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = a.task.createdAt ? Date.parse(a.task.createdAt) : 0;
    const bTime = b.task.createdAt ? Date.parse(b.task.createdAt) : 0;
    return bTime - aTime;
  });
  const top = scored[0];
  const tied = scored.filter((s) => s.score === top.score);
  if (tied.length === 1) return { kind: "unique", task: top.task };
  return { kind: "ambiguous", tasks: tied.map((t) => t.task) };
}

const TASK_MAX_TITLE = 200;
const TASK_MAX_DESC = 4_000;
const TASK_MAX_NOTES = 8_000;
const TASK_MAX_TAGS = 20;

function trimTaskString(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

type TaskCreateInputInline = {
  title: string;
  description?: string;
  priority?: TaskPriorityInline;
  dueDate?: string;
  assignedTo?: string;
  shared?: boolean;
  tags?: string[];
  relatedCustomerId?: string;
  relatedAppointmentId?: string;
  notes?: string;
};
type TaskUpdateInputInline = Partial<{
  title: string;
  description: string;
  status: TaskStatusInline;
  priority: TaskPriorityInline;
  dueDate?: string;
  assignedTo?: string;
  shared: boolean;
  tags: string[];
  relatedCustomerId?: string;
  relatedAppointmentId?: string;
  notes: string;
}>;

function validateCreateInputInline(raw: unknown): TaskCreateInputInline {
  if (!raw || typeof raw !== "object") throw new TaskValidationErrorInline("body must be an object");
  const o = raw as Record<string, unknown>;
  const title = trimTaskString(o.title, TASK_MAX_TITLE);
  if (!title) throw new TaskValidationErrorInline("title is required");
  const priority = isTaskPriorityInline(o.priority) ? o.priority : "medium";
  const description = trimTaskString(o.description, TASK_MAX_DESC) || undefined;
  const dueDate =
    typeof o.dueDate === "string" && o.dueDate.trim()
      ? parseTaskDueDateInline(o.dueDate) ?? undefined
      : undefined;
  const assignedTo =
    typeof o.assignedTo === "string" && o.assignedTo.trim()
      ? o.assignedTo.trim().toLowerCase()
      : undefined;
  const shared = Boolean(o.shared);
  const tags = Array.isArray(o.tags)
    ? (o.tags as unknown[])
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .slice(0, TASK_MAX_TAGS)
        .map((t) => t.trim())
    : undefined;
  const relatedCustomerId =
    typeof o.relatedCustomerId === "string" && o.relatedCustomerId.trim()
      ? o.relatedCustomerId.trim()
      : undefined;
  const relatedAppointmentId =
    typeof o.relatedAppointmentId === "string" && o.relatedAppointmentId.trim()
      ? o.relatedAppointmentId.trim()
      : undefined;
  const notes = trimTaskString(o.notes, TASK_MAX_NOTES) || undefined;
  return {
    title,
    description,
    priority,
    dueDate,
    assignedTo,
    shared,
    tags,
    relatedCustomerId,
    relatedAppointmentId,
    notes,
  };
}

function validateUpdateInputInline(raw: unknown): TaskUpdateInputInline {
  if (!raw || typeof raw !== "object") throw new TaskValidationErrorInline("body must be an object");
  const o = raw as Record<string, unknown>;
  const patch: TaskUpdateInputInline = {};
  if (typeof o.title === "string") {
    const t = trimTaskString(o.title, TASK_MAX_TITLE);
    if (!t) throw new TaskValidationErrorInline("title cannot be empty");
    patch.title = t;
  }
  if (typeof o.description === "string") patch.description = trimTaskString(o.description, TASK_MAX_DESC);
  if (o.status !== undefined) {
    if (!isTaskStatusInline(o.status)) throw new TaskValidationErrorInline("invalid status");
    patch.status = o.status;
  }
  if (o.priority !== undefined) {
    if (!isTaskPriorityInline(o.priority)) throw new TaskValidationErrorInline("invalid priority");
    patch.priority = o.priority;
  }
  if (typeof o.dueDate === "string") {
    if (!o.dueDate.trim()) patch.dueDate = undefined;
    else {
      const iso = parseTaskDueDateInline(o.dueDate);
      if (!iso) throw new TaskValidationErrorInline("could not parse dueDate");
      patch.dueDate = iso;
    }
  } else if (o.dueDate === null) patch.dueDate = undefined;
  if (typeof o.assignedTo === "string") {
    patch.assignedTo = o.assignedTo.trim().toLowerCase() || undefined;
  } else if (o.assignedTo === null) patch.assignedTo = undefined;
  if (typeof o.shared === "boolean") patch.shared = o.shared;
  if (Array.isArray(o.tags)) {
    patch.tags = (o.tags as unknown[])
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .slice(0, TASK_MAX_TAGS)
      .map((t) => t.trim());
  }
  if (typeof o.relatedCustomerId === "string") {
    patch.relatedCustomerId = o.relatedCustomerId.trim() || undefined;
  } else if (o.relatedCustomerId === null) patch.relatedCustomerId = undefined;
  if (typeof o.relatedAppointmentId === "string") {
    patch.relatedAppointmentId = o.relatedAppointmentId.trim() || undefined;
  } else if (o.relatedAppointmentId === null) patch.relatedAppointmentId = undefined;
  if (typeof o.notes === "string") patch.notes = trimTaskString(o.notes, TASK_MAX_NOTES);
  return patch;
}

function serializeTaskDocInline(id: string, data: Record<string, unknown>): TaskInline {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts = (v: any): string | undefined => {
    if (!v) return undefined;
    if (typeof v === "string") return v;
    if (v instanceof Date) {
      return Number.isNaN(v.getTime()) ? undefined : v.toISOString();
    }
    if (typeof v.toDate === "function") {
      try {
        return v.toDate().toISOString();
      } catch {
        return undefined;
      }
    }
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString();
    return undefined;
  };
  return {
    id,
    clientId: String(data.clientId ?? ""),
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : undefined,
    status: isTaskStatusInline(data.status) ? data.status : "pending",
    priority: isTaskPriorityInline(data.priority) ? data.priority : "medium",
    dueDate: ts(data.dueDate),
    assignedTo:
      typeof data.assignedTo === "string" && data.assignedTo ? data.assignedTo : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
    completedAt: ts(data.completedAt),
    shared: Boolean(data.shared),
    tags: Array.isArray(data.tags)
      ? (data.tags as unknown[]).filter((t): t is string => typeof t === "string")
      : undefined,
    relatedCustomerId:
      typeof data.relatedCustomerId === "string" && data.relatedCustomerId
        ? data.relatedCustomerId
        : undefined,
    relatedAppointmentId:
      typeof data.relatedAppointmentId === "string" && data.relatedAppointmentId
        ? data.relatedAppointmentId
        : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
  };
}

// ── ai_usage_metrics writer (inline) ─────────────────────────────────────────
// Uses Firestore REST so we avoid pulling firebase-admin into the cold start
// for every chat request. Fire and forget — never blocks the response.
async function logAiUsageRest(params: {
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
    const day = new Date().toISOString().slice(0, 10);
    const path = `ai_usage_metrics/${params.clientId}/days/${day}/queries`;
    const fields: Record<string, FirestoreField> = {
      inputTokens: { integerValue: String(params.inputTokens) },
      outputTokens: { integerValue: String(params.outputTokens) },
      routingKind: { stringValue: params.routingKind },
      scope: params.scope ? { stringValue: params.scope } : { nullValue: null },
      action: params.action ? { stringValue: params.action } : { nullValue: null },
      latencyMs: { integerValue: String(params.latencyMs) },
      isAdmin: { booleanValue: params.isAdmin },
      createdAt: { timestampValue: new Date().toISOString() },
    };
    await firestoreRestCreate(path, fields);
  } catch (err) {
    console.warn("[ai_usage_metrics] write failed:", err instanceof Error ? err.message : err);
  }
}

// ─── Admin action validation + dispatch + stock executors ───────────────────
// Shared implementations in src/lib/ai/admin-tools.ts and stock-tools.ts
// (same modules server.ts consumes) — imported at the top of this file.

/** Express API routes */
function registerExpressRoutes(app: Express, port: number): void {
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
          // Session id real del provider; fallback al appointmentId si el
          // gateway no lo expone.
          sessionId: event.sessionId || event.appointmentId,
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

  // ─── Daily Digest Cron ─────────────────────────────────────────────────────
  // Registered BEFORE express.json / requireTrustedOrigin / attachTenantContext
  // because Vercel cron sends GET with Authorization header only — no browser
  // origin, no x-client-id. Auth is via CRON_SECRET (set in Vercel env vars).
  // Requires composite index: appointments(clientId ASC, date ASC).
  app.get("/api/daily-digest", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return res.status(500).json({ error: "CRON_SECRET not configured." });
    }
    if (req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const token = await getFirestoreAccessToken();
    if (!token) {
      return res.status(503).json({ error: "Cannot authenticate with Firestore." });
    }

    const projectId =
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    const databaseId =
      process.env.FIREBASE_DATABASE_ID?.trim() ||
      process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
      "default";

    if (!projectId) {
      return res.status(500).json({ error: "FIREBASE_PROJECT_ID not set." });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch today's appointments via Firestore REST runQuery
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;
    let apptRes: globalThis.Response;
    try {
      apptRes = await fetch(queryUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "appointments" }],
            where: {
              compositeFilter: {
                op: "AND",
                filters: [
                  { fieldFilter: { field: { fieldPath: "clientId" }, op: "EQUAL", value: { stringValue: CLIENT_ID } } },
                  { fieldFilter: { field: { fieldPath: "date" }, op: "EQUAL", value: { stringValue: today } } },
                ],
              },
            },
          },
        }),
      });
    } catch (err) {
      console.error("[Daily Digest] Firestore query error:", err);
      return res.status(502).json({ error: "Firestore query failed." });
    }

    if (!apptRes.ok) {
      console.error("[Daily Digest] Firestore query HTTP", apptRes.status, await apptRes.text().catch(() => ""));
      return res.status(502).json({ error: "Firestore query failed." });
    }

    type FirestoreDoc = { document?: { fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number }> } };
    const rawDocs = (await apptRes.json()) as FirestoreDoc[];

    const appointments = rawDocs
      .filter((d): d is FirestoreDoc & { document: NonNullable<FirestoreDoc["document"]> } => !!d.document?.fields)
      .map((d) => ({
        status: d.document.fields?.status?.stringValue ?? "pending",
        serviceId: d.document.fields?.serviceId?.stringValue ?? "",
      }));

    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status === "confirmed" || a.status === "completed").length;
    const cancelled = appointments.filter((a) => a.status === "cancelled").length;

    // Revenue: fetch config/{clientId} for service prices; graceful fallback to 0
    let revenue = 0;
    try {
      const configUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/config/${CLIENT_ID}`;
      const configRes = await fetch(configUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (configRes.ok) {
        const configDoc = (await configRes.json()) as {
          fields?: { services?: { arrayValue?: { values?: Array<{ mapValue?: { fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number }> } }> } } };
        };
        const servicesArr = configDoc.fields?.services?.arrayValue?.values ?? [];
        const priceMap: Record<string, number> = {};
        for (const svc of servicesArr) {
          const id = svc.mapValue?.fields?.id?.stringValue;
          const price = Number(svc.mapValue?.fields?.price?.integerValue ?? svc.mapValue?.fields?.price?.doubleValue ?? 0);
          if (id) priceMap[id] = price;
        }
        revenue = appointments
          .filter((a) => a.status !== "cancelled")
          .reduce((sum, a) => sum + (priceMap[a.serviceId] ?? 0), 0);
      }
    } catch {
      // revenue stays 0 — config unavailable
    }

    // Build HTML email
    const subject = `Daily Digest — ${today}`;
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#f59e0b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px;">Daily Digest — ${today}</h2>
        <div style="background:#f9fafb;padding:20px;border-radius:8px;margin-bottom:20px;">
          <p style="margin:8px 0;font-size:16px;"><strong>Total bookings:</strong> ${total}</p>
          <p style="margin:8px 0;font-size:16px;color:#10b981;"><strong>Confirmed:</strong> ${confirmed}</p>
          <p style="margin:8px 0;font-size:16px;color:#ef4444;"><strong>Cancelled:</strong> ${cancelled}</p>
          <p style="margin:8px 0;font-size:16px;"><strong>Estimated revenue:</strong> $${revenue}</p>
        </div>
        <p style="font-size:12px;color:#6b7280;">Sent automatically from your booking system.</p>
      </div>`;

    // Send via Resend
    const ownerEmail = process.env.BUSINESS_OWNER_EMAIL;
    if (!ownerEmail) {
      writeNotificationLog({ type: "marketing", recipient: "(none)", subject, status: "failed", error: "BUSINESS_OWNER_EMAIL not set." });
      return res.status(500).json({ error: "BUSINESS_OWNER_EMAIL not configured." });
    }

    const resend = getResend();
    if (!resend) {
      console.warn("[Daily Digest] Resend not configured — digest logged only.");
      writeNotificationLog({ type: "marketing", recipient: ownerEmail, subject, status: "queued" });
      return res.json({ status: "queued", message: "Resend not configured. Digest logged." });
    }

    const fromEmail = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
    try {
      const { data: resData, error } = await resend.emails.send({ from: fromEmail, to: ownerEmail, subject, html });
      if (error) {
        console.error("[Daily Digest] Resend error:", error);
        writeNotificationLog({ type: "marketing", recipient: ownerEmail, subject, status: "failed", error: JSON.stringify(error) });
        return res.status(502).json({ error: "Email send failed." });
      }
      writeNotificationLog({ type: "marketing", recipient: ownerEmail, subject, status: "sent", providerMessageId: resData?.id });
      return res.json({ status: "sent", id: resData?.id, appointments: total });
    } catch (err) {
      console.error("[Daily Digest] Email delivery error:", err);
      writeNotificationLog({ type: "marketing", recipient: ownerEmail, subject, status: "failed", error: String(err) });
      return res.status(500).json({ error: "Email delivery failed." });
    }
  });

  // ─── Sitemap (public, no auth) ───────────────────────────────────────────────
  // Registered before express.json / requireTrustedOrigin — fully public.
  // Routed here via vercel.json: { "source": "/sitemap.xml", "destination": "/api" }
  // Staff slugs fetched from config/{clientId} via Firestore REST; if unavailable
  // the endpoint still returns the static URLs (graceful degradation).
  app.get("/sitemap.xml", async (req, res) => {
    const baseUrl =
      process.env.APP_URL?.replace(/\/+$/, "") ??
      `${req.protocol}://${req.get("host")}`;
    const today = new Date().toISOString().slice(0, 10);

    const staticUrls = [
      { path: "/",            priority: "1.0" },
      { path: "/gallery",     priority: "0.8" },
      { path: "/privacy",     priority: "0.3" },
      { path: "/terms",       priority: "0.3" },
      { path: "/cancellation",priority: "0.3" },
    ];

    // Fetch staff slugs from Firestore config — graceful degradation on any error
    const staffSlugs: string[] = [];
    try {
      const token = await getFirestoreAccessToken();
      if (token && CLIENT_ID) {
        const projectId =
          process.env.FIREBASE_PROJECT_ID?.trim() ||
          process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
        const databaseId =
          process.env.FIREBASE_DATABASE_ID?.trim() ||
          process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
          "default";
        if (projectId) {
          const configUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/config/${CLIENT_ID}`;
          const configRes = await fetch(configUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (configRes.ok) {
            const doc = (await configRes.json()) as {
              fields?: {
                staff?: {
                  arrayValue?: {
                    values?: Array<{ mapValue?: { fields?: { slug?: { stringValue?: string } } } }>;
                  };
                };
              };
            };
            for (const s of doc.fields?.staff?.arrayValue?.values ?? []) {
              const slug = s.mapValue?.fields?.slug?.stringValue;
              if (slug) staffSlugs.push(slug);
            }
          }
        }
      }
    } catch {
      // staff pages omitted — sitemap still returns static URLs
    }

    const urlEntry = (path: string, priority: string) =>
      `\n  <url>\n    <loc>${baseUrl}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      staticUrls.map(({ path, priority }) => urlEntry(path, priority)).join("") +
      staffSlugs.map((slug) => urlEntry(`/equipo/${slug}`, "0.7")).join("") +
      `\n</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
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
  app.use("/api/ai", aiRateLimit);

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
          maxOutputTokens: 800,
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
          maxOutputTokens: 200,
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
        const { kpis, recentAppointments, uiLanguage, businessContext } = body;
        if (typeof kpis !== "object" || kpis === null || !Array.isArray(recentAppointments)) {
          return res.status(400).json({
            error: 'For type "crm", kpis must be an object and recentAppointments must be an array.',
          });
        }
        if (recentAppointments.length > 100) {
          return res.status(400).json({ error: "Payload too large for CRM analysis." });
        }
        const lang: "he" | "en" = uiLanguage === "he" ? "he" : "en";

        const prompt = buildCrmInsightPrompt(kpis as Record<string, unknown>, recentAppointments, lang, businessContext);
        const text = await geminiGenerateContent(apiKey, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          responseMimeType: "application/json",
          maxOutputTokens: 600,
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

  // Public chat system prompt — mirrors server.ts public branch.
  //
  // The CLAUDE.md rule is explicit: the chatbot must NEVER suggest phone/email
  // for booking; it must always direct visitors to the Book button. Earlier
  // versions of this builder did not encode that rule, so prod chatbots could
  // (and did) tell visitors to call/email. The bookingGuidance block below is
  // the contract that must be present in any future edit.
  function buildChatSystemPrompt(
    brand: { name?: string; tagline?: string; aiPersona?: string },
    businessContext: unknown,
  ): string {
    const ctx = (businessContext && typeof businessContext === "object" ? businessContext : {}) as Record<string, unknown>;

    const hasPersona =
      typeof brand.aiPersona === "string" && brand.aiPersona.trim().length > 0;
    const persona = hasPersona
      ? String(brand.aiPersona).trim()
      : brand && typeof brand.name === "string" && typeof brand.tagline === "string"
        ? `You are the AI Consulting Agent for ${brand.name}.
Tagline: ${brand.tagline}
Your job is to assist clients by providing information about our services, hours, location, and offering helpful advice.
Be sharp, professional, yet welcoming. Keep answers concise. Avoid complex formatting when possible.`
        : `You are the AI Consulting Agent for this business.
Assist clients with services, hours, location, and general inquiries.
Be sharp, professional, yet welcoming. Keep answers concise.`;

    // ── Business knowledge block (matches server.ts shape) ──
    const knowledgeLines: string[] = [];

    if (typeof ctx.businessName === "string" && ctx.businessName.trim()) {
      knowledgeLines.push(`BUSINESS NAME: ${ctx.businessName.trim()}`);
    }

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

    // ── CRITICAL: booking guidance enforces CLAUDE.md rule ──
    const bookingEnabled = (ctx as { bookingEnabled?: boolean }).bookingEnabled;
    const bookingGuidance = bookingEnabled !== false ? `
BOOKING — CRITICAL RULES:
- When a client wants to book, schedule, or asks about availability: tell them to click the "Book" button on the website. The booking system will guide them to pick a service, choose a staff member, select a date and time, and confirm.
- NEVER suggest the client call by phone or send an email to book. The website has a complete online booking system — always direct them there.
- NEVER share the business phone number or email as a way to schedule appointments.
- If the client asks about specific available time slots, tell them the booking system shows real-time availability — they should click the "Book" button to see what's open.
- If the business requires payment, the client will be asked to complete payment during the booking process.
- Keep the client ON the website. The goal is always to convert the conversation into a booking through the site's system.` : "";

    const bizCtx = businessContext as { whatsappInChat?: boolean; contact?: { phone?: string } } | undefined;
    const whatsappGuidance = bizCtx?.whatsappInChat && bizCtx?.contact?.phone
      ? `\nWHATSAPP: If the client has a question the AI cannot answer, or explicitly asks to speak with a person, mention they can use the WhatsApp button at the top of this chat. But for bookings, always direct to the website booking system first.`
      : "";

    return persona + knowledgeBlock + bookingGuidance + whatsappGuidance
      + "\n\nIMPORTANT: Answer in the same language the client writes to you. If they write in Hebrew, answer in Hebrew. If in English, answer in English. If in Russian, answer in Russian."
      + "\nIf you don't know something or it's not in the business information above, say so honestly — never invent information.";
  }

  // ── Admin knowledge / live-data block builders ──────────────────────────
  function buildAdminKnowledgeBlockInline(businessContext: unknown): string {
    const ctx = (businessContext && typeof businessContext === "object" ? businessContext : {}) as Record<string, unknown>;
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
    return knowledgeLines.length > 0
      ? `\n\n--- BUSINESS INFORMATION ---\n${knowledgeLines.join("\n\n")}\n--- END BUSINESS INFORMATION ---`
      : "";
  }

  function buildAdminLiveDataBlockInline(liveData: unknown): string {
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
      upcomingBlock = "\n\nUPCOMING APPOINTMENTS:\n" + ld.upcomingAppointments.slice(0, 14)
        .map((a: { id?: string; date?: string; time?: string; client?: string; service?: string; staff?: string; staffId?: string; status?: string; duration?: number }) =>
          `• ${a.date} ${a.time} — ${a.client} — ${a.service} with ${a.staff} [${a.status}]${a.id ? ` (id:${a.id})` : ""}${a.staffId ? ` staffId:${a.staffId}` : ""}${a.duration ? ` ${a.duration}min` : ""}`)
        .join("\n");
    }

    let customersBlock = "";
    if (Array.isArray(ld.customers) && ld.customers.length > 0) {
      customersBlock = "\n\nCUSTOMERS (top 30 by recency):\n" + ld.customers.slice(0, 30)
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
    return `\n\n--- LIVE CRM DATA ---\nKPIs: ${kpiLines.join(" | ")}${todayBlock}${upcomingBlock}${customersBlock}${inboxBlock}\n--- END LIVE CRM DATA ---`;
  }

  function buildAdminChatPrompt(
    brand: { name?: string; tagline?: string; aiPersona?: string },
    businessContext: unknown,
    liveData: unknown,
    route: AdminRouteResult,
  ): string {
    const businessName = brand?.name ?? "the business";
    const knowledgeBlock = buildAdminKnowledgeBlockInline(businessContext);
    const includeSnapshotEager = route.kind !== "deterministic" && route.includeSnapshot;
    const liveDataBlock = includeSnapshotEager ? buildAdminLiveDataBlockInline(liveData) : "";
    const toolsFragment =
      route.kind === "model_with_scope"
        ? buildScopedToolsFragment(route.scope, route.tools)
        : ADMIN_TOOLS_PROMPT_FRAGMENT;
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
    const closingBlock = isScoped
      ? ""
      : `

When the admin asks about data (revenue, bookings, busiest day, etc.), use the LIVE CRM DATA above to give specific numbers. If data is not available, say so.
Keep answers practical, concise, and actionable. Use numbers when available.
Answer in the same language the admin writes to you.`;

    return `${roleBlock}

${knowledgeBlock}${liveDataBlock}${closingBlock}

${toolsFragment}`;
  }

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
    // Hoisted so downstream tool dispatch can attribute actions to the
    // authenticated admin (actorEmail / actorRole) — same as server.ts.
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

    // Validate all messages first
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

    // ── RAG: private knowledge-base retrieval (ADMIN MODE ONLY) ──
    // Same tenant-isolation guarantees as server.ts: only runs inside the
    // admin branch (after requireAdminAuth has passed), demo-mode short-
    // circuits, and clientId is derived from env, not the request body.
    let ragBlock = "";
    if (isAdminMode && demoMode) {
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
        const effectiveClientId = CLIENT_ID;
        const lastUserMsg = [...contents].reverse().find((p) => p.role === "user");
        const queryText = lastUserMsg?.parts.find((p): p is { text: string } => "text" in p)?.text ?? "";
        if (effectiveClientId && queryText.trim().length >= 4) {
          const admin = await loadAdminFirestore();
          if (admin) {
            const { retrieveContext, formatContextBlock } = await import("../src/lib/knowledge-rag");
            const hits = await retrieveContext(admin.db, apiKey, effectiveClientId, queryText, { topK: 5 });
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

    // Intent route — admin only; public branch consults its own router below.
    const lastUserText = (() => {
      const m = [...contents].reverse().find((p) => p.role === "user");
      const t = m?.parts.find((p): p is { text: string } => "text" in p);
      return t?.text ?? "";
    })();
    const adminRoute: AdminRouteResult | null = isAdminMode ? routeAdminIntent(lastUserText) : null;

    let instruction: string;
    if (isAdminMode) {
      instruction = buildAdminChatPrompt(brand ?? {}, businessContext, liveData, adminRoute!) + ragBlock;
    } else {
      // Truncate to recent history to control token usage for public chat
      contents.splice(0, Math.max(0, contents.length - 12));
      instruction = buildChatSystemPrompt(brand ?? {}, businessContext);
    }

    const queryStart = Date.now();
    const effectiveClientIdForMetrics = CLIENT_ID;

    try {
      // ── PUBLIC PATH ───────────────────────────────────────────────────────
      if (!isAdminMode) {
        const ctxForRouter = (businessContext && typeof businessContext === "object"
          ? businessContext
          : {}) as PublicChatContext;
        const publicRoute = routePublicIntent(lastUserText, {
          uiLanguage: process.env.VITE_UI_LANGUAGE,
          hours: ctxForRouter.hours,
          contact: ctxForRouter.contact,
          services: ctxForRouter.services,
        });
        if (publicRoute.kind === "deterministic") {
          logAiUsageRest({
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
          maxOutputTokens: 400,
        });
        logAiUsageRest({
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

      // Deterministic short-circuit.
      if (route.kind === "deterministic") {
        const lang = (process.env.VITE_UI_LANGUAGE ?? "en") as string;

        // Bloque I — real stock executors via the inline dispatcher (zero
        // model tokens).
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
              const admin = await loadAdminFirestore();
              if (!admin) {
                return res.json({
                  text: "Cannot execute: Firestore is not configured on the server.",
                  routing: { kind: "deterministic", action: route.action, args: route.args },
                });
              }
              const { FieldValue } = await import("firebase-admin/firestore");
              stockResult = await dispatchStockAction(
                { db: admin.db, FieldValue, clientId: effectiveClientId, actorEmail: adminAuth?.email ?? "ai" },
                route.action,
                route.args as unknown as Record<string, unknown>,
              );
            }
            const text = formatStockResult(route.action, stockResult, lang);
            logAiUsageRest({
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
        // response, and skip the model call entirely. Mirrors server.ts.
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
              const admin = await loadAdminFirestore();
              if (!admin) {
                return res.json({
                  text: "Cannot execute: Firestore is not configured on the server.",
                  routing: { kind: "deterministic", action: route.action, args: route.args },
                });
              }
              const { FieldValue } = await import("firebase-admin/firestore");
              tasksResult = (await dispatchAdminAction(
                {
                  db: admin.db,
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
            logAiUsageRest({
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

        if (isStubAction(route.action)) {
          const text = stubActionMessage(route.action, lang);
          logAiUsageRest({
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
        return res.json({
          text: "Recognised the request but no executor is wired for this action yet.",
          routing: { kind: "deterministic", action: route.action, args: route.args },
        });
      }

      // Build scoped/full tool list.
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
        // Stock (Bloque I) + Tasks (Bloque J) declarations are appended to
        // ADMIN_TOOL_DECLARATIONS by src/lib/ai/admin-tools.ts itself.
        query_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "query_stock")!,
        consume_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "consume_stock")!,
        add_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "add_stock")!,
        // Tasks (Bloque J) — declarations live in ADMIN_TOOL_DECLARATIONS.
        create_task: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "create_task")!,
        list_tasks: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "list_tasks")!,
        complete_task: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "complete_task")!,
      };
      const activeToolNames: readonly AdminToolName[] =
        route.kind === "model_with_scope" ? route.tools : [...ALL_ADMIN_TOOLS];
      const activeToolDecls = activeToolNames.map((n) => declsByName[n]);

      const first = await geminiGenerateRich(apiKey, {
        contents,
        systemInstruction: instruction,
        temperature: 0.7,
        maxOutputTokens: 800,
        tools: [{ functionDeclarations: activeToolDecls }],
      });

      let totalIn = first.usage?.promptTokenCount ?? 0;
      let totalOut = first.usage?.candidatesTokenCount ?? 0;

      if (first.functionCalls.length === 0) {
        logAiUsageRest({
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

      // get_crm_snapshot — intercepted, never dispatched through executors.
      if (call.name === "get_crm_snapshot") {
        const snapshot = buildAdminLiveDataBlockInline(liveData);
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
        logAiUsageRest({
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
        return res.json({ text: first.text || `I don't know how to call \`${call.name}\`.` });
      }

      if (demoMode) {
        // Demo mode runs the stock/tasks executors against in-memory demo
        // fixtures (no Firestore) so the tour shows real responses. Mirrors
        // server.ts.
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

      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
      if (!projectId || !clientEmail || !privateKey) {
        return res.json({
          text: "Cannot execute action: Firestore is not configured on the server.",
          action: { type: call.name, data: call.args },
          actionResult: { ok: false, error: "database_unavailable" },
        });
      }
      const { initializeApp: initAdminApp, getApps: getAdminApps, cert } = await import("firebase-admin/app");
      const { getFirestore: getAdminFirestore, FieldValue } = await import("firebase-admin/firestore");
      const adminApp = getAdminApps().length > 0
        ? getAdminApps()[0]!
        : initAdminApp({ credential: cert({ projectId, clientEmail, privateKey }) });
      const databaseId =
        process.env.FIREBASE_DATABASE_ID?.trim() ||
        process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
        "default";
      const db = getAdminFirestore(adminApp, databaseId);

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

      logAiUsageRest({
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

  // ── AI Action endpoint: walk-in / support / book / update appointment ─────
  // V2 — every action writes to Firestore on behalf of the owner. Gated.
  //
  // Uses firebase-admin via dynamic import inside the handler so the SDK is
  // loaded only on first admin call, not at module init — preserving the
  // serverless cold-start budget for public traffic.
  app.post("/api/ai/action", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;

    try {
      const { type, data } = req.body ?? {};
      const effectiveClientId = CLIENT_ID;
      if (!effectiveClientId) {
        return res.status(400).json({ error: "clientId required" });
      }

      if (typeof type !== "string" || !isKnownAction(type)) {
        return res.status(400).json({ error: `Unknown action type: ${type}` });
      }

      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
      if (!projectId || !clientEmail || !privateKey) {
        return res.status(503).json({ error: "Database not available" });
      }

      const { initializeApp: initAdminApp, getApps: getAdminApps, cert } = await import("firebase-admin/app");
      const { getFirestore: getAdminFirestore, FieldValue } = await import("firebase-admin/firestore");
      const app = getAdminApps().length > 0
        ? getAdminApps()[0]!
        : initAdminApp({ credential: cert({ projectId, clientEmail, privateKey }) });
      const databaseId =
        process.env.FIREBASE_DATABASE_ID?.trim() ||
        process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
        "default";
      const db = getAdminFirestore(app, databaseId);

      const result = await dispatchAdminAction(
        { db, FieldValue, clientId: effectiveClientId },
        type,
        data ?? {},
      );
      console.log(`[AI Action] ${type} ok for clientId=${effectiveClientId} by ${auth.email}`);
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
      const docId = conversationDocId(CLIENT_ID, phone);
      const doc = await firestoreRestGetDocument("whatsapp_conversations", docId);
      if (!doc) {
        return res.json({ exists: false, phone, clientId: CLIENT_ID, messages: [] });
      }
      const fields = doc.fields ?? {};
      const docClientId = decodeFirestoreValue(fields.clientId);
      if (docClientId && docClientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch on conversation document" });
      }
      const messagesRaw = decodeFirestoreValue(fields.messages);
      const messages = Array.isArray(messagesRaw)
        ? messagesRaw
            .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
            .map((m) => ({
              role: typeof m.role === "string" ? m.role : "user",
              text: typeof m.text === "string" ? m.text : "",
              timestamp: typeof m.timestamp === "string" ? m.timestamp : undefined,
            }))
        : [];
      const lastMessageAt = decodeFirestoreValue(fields.lastMessageAt);
      return res.json({
        exists: true,
        phone,
        clientId: CLIENT_ID,
        messages,
        lastMessageAt: typeof lastMessageAt === "string" ? lastMessageAt : undefined,
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
      const now = new Date().toISOString();
      // Sub-collection path: whatsapp_outbox/{clientId}/queued.
      // firestoreRestCreate accepts arbitrary collection paths.
      await firestoreRestCreate(
        `whatsapp_outbox/${encodeURIComponent(CLIENT_ID)}/queued`,
        {
          clientId: { stringValue: CLIENT_ID },
          phone: { stringValue: parsed.phone },
          body: { stringValue: parsed.message },
          status: { stringValue: "queued" },
          requestedBy: { stringValue: auth.email },
          createdAt: { timestampValue: now },
        },
      );
      console.log(`[WhatsApp Queue] ${parsed.phone} queued by ${auth.email}`);
      return res.json({ ok: true });
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
      const now = new Date().toISOString();
      await firestoreRestPatchDocument("whatsapp_config", CLIENT_ID, {
        clientId: { stringValue: CLIENT_ID },
        pauseState: { booleanValue: paused },
        pausedBy: { stringValue: auth.email },
        pausedAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
      });
      // Fire-and-forget audit log; failure must not break the request.
      void firestoreRestCreate("hub_status_history", {
        clientId: { stringValue: CLIENT_ID },
        event: { stringValue: paused ? "whatsapp_agent_paused" : "whatsapp_agent_resumed" },
        actor: { stringValue: auth.email },
        source: { stringValue: "crm_admin" },
        createdAt: { timestampValue: now },
      });
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
      const doc = await firestoreRestGetDocument("whatsapp_config", CLIENT_ID);
      const fields = doc?.fields ?? {};
      const paused = decodeFirestoreValue(fields.pauseState) === true;
      const pausedBy = decodeFirestoreValue(fields.pausedBy);
      const pausedAt = decodeFirestoreValue(fields.pausedAt);
      return res.json({
        clientId: CLIENT_ID,
        paused,
        pausedBy: typeof pausedBy === "string" ? pausedBy : undefined,
        pausedAt: typeof pausedAt === "string" ? pausedAt : undefined,
      });
    } catch (err) {
      console.error("[WhatsApp Config] read failed:", err);
      return res.status(500).json({ error: "Failed to read config" });
    }
  });

  // ── Knowledge RAG: upload, list, delete documents for admin AI ───────────
  // Mirrors the server.ts handlers — same path layout
  // knowledge_docs/{clientId}/docs/{docId}/chunks/{chunkId}, same caps
  // (50 docs / 10 MB / 200 chunks per doc), same tenant isolation (clientId
  // derived from CLIENT_ID env, never from request body).
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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db, FieldValue } = admin;

      const {
        chunkText,
        embedTexts,
        extractTextFromBuffer,
        MAX_DOCS_PER_CLIENT,
        MAX_TOTAL_BYTES_PER_CLIENT,
        MAX_CHUNKS_PER_DOC,
      } = await import("../src/lib/knowledge-rag");

      const body = (req.body ?? {}) as Record<string, unknown>;
      const title = String(body.title ?? "").trim().slice(0, 200);
      if (!title) return res.status(400).json({ error: "title is required" });

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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db } = admin;
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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db } = admin;
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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db } = admin;
      const ref = db.collection("knowledge_docs").doc(CLIENT_ID).collection("docs").doc(docId);
      const docSnap = await ref.get();
      if (!docSnap.exists) return res.status(404).json({ error: "Not found" });
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

  // ── Customer pipeline (Bloque F) ───────────────────────────────────────────
  // PATCH /api/customers/:customerId/stage  → change stage + audit log
  // PATCH /api/customers/:customerId/tags   → arrayUnion / arrayRemove tags
  // Mirrors the server.ts handlers. Uses firebase-admin via dynamic import so
  // the SDK is loaded only when these endpoints are actually hit (preserves
  // cold-start budget).
  async function loadAdminFirestore() {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) return null;
    const { initializeApp: initAdminApp, getApps: getAdminApps, cert } = await import("firebase-admin/app");
    const { getFirestore: getAdminFirestore, FieldValue } = await import("firebase-admin/firestore");
    const adminApp = getAdminApps().length > 0
      ? getAdminApps()[0]!
      : initAdminApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    const databaseId =
      process.env.FIREBASE_DATABASE_ID?.trim() ||
      process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
      "default";
    return { db: getAdminFirestore(adminApp, databaseId), FieldValue };
  }

  // ── Stock: migrate legacy nested → flat collections (idempotent). ─────────
  app.post("/api/stock/migrate", express.json({ limit: "32kb" }), async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });
    const apply = req.body && req.body.apply === true;
    try {
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db } = admin;
      const plan = { items: { copied: 0, skipped: 0 }, movements: { copied: 0, skipped: 0 } };
      const copyAll = async (sourceSub: string, targetCol: string, key: "items" | "movements") => {
        const sourceSnap = await db.collection("stock").doc(CLIENT_ID).collection(sourceSub).get();
        for (const docSnap of sourceSnap.docs) {
          const targetRef = db.collection(targetCol).doc(docSnap.id);
          const existing = await targetRef.get();
          if (existing.exists) { plan[key].skipped += 1; continue; }
          plan[key].copied += 1;
          if (apply) await targetRef.set({ ...docSnap.data(), clientId: CLIENT_ID });
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

  // ── Stock: manual consume (decrement items + write audit movement). ───────
  app.post("/api/stock/consume", express.json({ limit: "16kb" }), async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    if (!CLIENT_ID) return res.status(400).json({ error: "CLIENT_ID is not configured." });
    const raw = req.body?.items;
    if (!Array.isArray(raw) || raw.length === 0) return res.status(400).json({ error: "items[] is required" });
    if (raw.length > 50) return res.status(413).json({ error: "max 50 items per request" });

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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db } = admin;
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
          results.push({ itemId: item.itemId, ok: false, error: err instanceof Error ? err.message : "unknown" });
        }
      }
      const anyFailed = results.some((r) => !r.ok);
      console.log(`[Stock Consume] client=${CLIENT_ID} requested=${items.length} ok=${results.filter(r => r.ok).length} by=${auth.email}`);
      return res.status(anyFailed ? 207 : 200).json({ ok: !anyFailed, results });
    } catch (err) {
      console.error("[Stock Consume] error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "consume_failed" });
    }
  });

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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db, FieldValue } = admin;

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
        .catch((err: unknown) => console.error("[Customer Stage] history log failed:", err));
      console.log(`[Customer Stage] ${customerId}: ${previousStage ?? "∅"} → ${stage} by ${auth.email}`);
      return res.json({ ok: true, stage, from: previousStage });
    } catch (err) {
      console.error("[Customer Stage] update failed:", err);
      return res.status(500).json({ error: "Failed to update stage" });
    }
  });

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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db, FieldValue } = admin;

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
      await ref.update({
        tags: merged,
        updatedAt: FieldValue.serverTimestamp(),
      });
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
  // Mirror of /api/admin/users in server.ts. Uses Firestore REST instead of
  // firebase-admin so the Vercel bundle stays self-contained. Keep behaviour
  // identical to server.ts — the UI and tests rely on it.

  async function adminUsersRunQuery(extraFilters: unknown[] = []): Promise<Array<{ id: string; fields: Record<string, FirestoreField> }>> {
    const { token, baseUrl } = await getFirestoreRestContext();
    const queryUrl = `${baseUrl}:runQuery`;
    const filters: unknown[] = [
      { fieldFilter: { field: { fieldPath: "clientId" }, op: "EQUAL", value: { stringValue: CLIENT_ID } } },
      ...extraFilters,
    ];
    const r = await fetch(queryUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "admin_users" }],
          where: filters.length === 1 ? filters[0] : { compositeFilter: { op: "AND", filters } },
          limit: 200,
        },
      }),
    });
    if (!r.ok) {
      throw new Error(`adminUsersRunQuery ${r.status}: ${await r.text().catch(() => "")}`);
    }
    type Row = { document?: { name?: string; fields?: Record<string, FirestoreField> } };
    const rows = (await r.json()) as Row[];
    return rows
      .filter((row): row is Row & { document: NonNullable<Row["document"]> } => !!row.document?.fields)
      .map((row) => {
        const name = row.document.name ?? "";
        const id = name.split("/").pop() ?? "";
        return { id, fields: row.document.fields ?? {} };
      });
  }

  async function adminUsersRestDelete(documentId: string): Promise<void> {
    const { token, baseUrl } = await getFirestoreRestContext();
    const url = `${baseUrl}/admin_users/${encodeURIComponent(documentId)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`adminUsersRestDelete ${res.status}: ${await res.text().catch(() => "")}`);
    }
  }

  app.get("/api/admin/users", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const rows = await adminUsersRunQuery();
      const users = rows.map((row) => {
        const fields = row.fields;
        const role = decodeFirestoreValue(fields.role);
        const status = decodeFirestoreValue(fields.status);
        return {
          email: (decodeFirestoreValue(fields.email) as string) ?? row.id,
          role: isAdminRole(role) ? role : "staff",
          invitedBy: (decodeFirestoreValue(fields.invitedBy) as string) ?? "",
          invitedAt: (decodeFirestoreValue(fields.invitedAt) as string) ?? null,
          acceptedAt: (decodeFirestoreValue(fields.acceptedAt) as string) ?? null,
          status: isAdminStatus(status) ? status : "active",
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

      const existing = await firestoreRestGetDocument("admin_users", email);
      if (existing) {
        const clientId = decodeFirestoreValue(existing.fields?.clientId);
        const status = decodeFirestoreValue(existing.fields?.status);
        if (clientId === CLIENT_ID && status !== "removed") {
          return res.status(409).json({ error: "User already exists" });
        }
        // Cross-tenant guard: el doc pertenece a OTRO tenant — no pisarlo.
        if (clientId && clientId !== CLIENT_ID && status !== "removed") {
          console.error(`[Admin Users] invite blocked: ${email} ya es admin de otro tenant`);
          return res.status(409).json({ error: "This email is already registered as an admin of another business" });
        }
      }

      const nowIso = new Date().toISOString();
      await firestoreRestPatchDocument("admin_users", email, {
        clientId: { stringValue: CLIENT_ID },
        email: { stringValue: email },
        role: { stringValue: roleRaw },
        invitedBy: { stringValue: auth.email },
        invitedAt: { timestampValue: nowIso },
        status: { stringValue: "pending" },
      });
      console.log(`[Admin Users] invite email=${email} role=${roleRaw} by=${auth.email}`);
      return res.status(201).json({
        ok: true,
        user: { email, role: roleRaw, invitedBy: auth.email, status: "pending" },
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

      const doc = await firestoreRestGetDocument("admin_users", targetEmail);
      if (!doc) return res.status(404).json({ error: "User not found" });
      const clientId = decodeFirestoreValue(doc.fields?.clientId);
      if (clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch on user document" });
      }
      await firestoreRestPatchDocument("admin_users", targetEmail, {
        role: { stringValue: nextRole },
        updatedAt: { timestampValue: new Date().toISOString() },
      });
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
      const doc = await firestoreRestGetDocument("admin_users", targetEmail);
      if (!doc) return res.status(404).json({ error: "User not found" });
      const clientId = decodeFirestoreValue(doc.fields?.clientId);
      if (clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch on user document" });
      }
      const role = decodeFirestoreValue(doc.fields?.role);
      const targetRole = isAdminRole(role) ? role : "staff";
      const invitedBy = decodeFirestoreValue(doc.fields?.invitedBy);
      if (!canRemoveRole(auth.role, targetRole)) {
        return res.status(403).json({ error: "You cannot remove that user" });
      }
      if (auth.role === "manager" && invitedBy !== auth.email) {
        return res.status(403).json({ error: "Managers can only remove users they invited" });
      }
      if (targetRole === "owner") {
        const owners = await adminUsersRunQuery([
          { fieldFilter: { field: { fieldPath: "role" }, op: "EQUAL", value: { stringValue: "owner" } } },
        ]);
        const otherOwners = owners.filter(
          (o) => o.id !== targetEmail && decodeFirestoreValue(o.fields.status) !== "removed",
        );
        if (otherOwners.length === 0) {
          return res.status(400).json({ error: "Cannot remove the last owner" });
        }
      }
      await adminUsersRestDelete(targetEmail);
      // Revocar claims + refresh tokens en Firebase Auth — sin esto el usuario
      // removido conserva tenantRole/clientId hasta que su token expire.
      try {
        const admin = await loadAdminFirestore();
        if (admin) {
          const { getApps: getAdminApps } = await import("firebase-admin/app");
          const { getAuth: getAdminAuth } = await import("firebase-admin/auth");
          const adminApp = getAdminApps()[0];
          if (adminApp) {
            const adminAuth = getAdminAuth(adminApp);
            const userRecord = await adminAuth.getUserByEmail(targetEmail).catch((): null => null);
            if (userRecord) {
              await adminAuth.setCustomUserClaims(userRecord.uid, null);
              await adminAuth.revokeRefreshTokens(userRecord.uid);
              console.log(`[Admin Users] Auth claims revoked uid=${userRecord.uid} email=${targetEmail}`);
            }
          }
        }
      } catch (err) {
        console.warn("[Admin Users] failed to revoke Auth claims:", err instanceof Error ? err.message : err);
      }
      console.log(`[Admin Users] removed email=${targetEmail} by=${auth.email}`);
      return res.json({ ok: true, email: targetEmail });
    } catch (err) {
      console.error("[Admin Users] delete failed:", err);
      return res.status(500).json({ error: "Failed to remove user" });
    }
  });

  // ── Tasks (Bloque J) ───────────────────────────────────────────────────────
  // Inline mirror of /api/tasks in server.ts. Uses firebase-admin via
  // loadAdminFirestore so the Vercel bundle stays self-contained (no
  // cross-imports from src/).
  app.get("/api/tasks", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db } = admin;
      const snap = await db.collection("tasks").where("clientId", "==", CLIENT_ID).get();
      const all: TaskInline[] = [];
      snap.forEach((doc) => {
        all.push(serializeTaskDocInline(doc.id, doc.data() ?? {}));
      });
      const viewer = { email: auth.email, role: auth.role };
      let tasks = all.filter((t) => canSeeTaskInline(t, viewer));

      const statusParam = typeof req.query.status === "string" ? req.query.status : "";
      if (statusParam === "open") {
        tasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
      } else if (isTaskStatusInline(statusParam)) {
        tasks = tasks.filter((t) => t.status === statusParam);
      }
      if (typeof req.query.assignedTo === "string" && req.query.assignedTo.trim()) {
        const a = req.query.assignedTo.trim().toLowerCase();
        tasks = tasks.filter((t) => t.assignedTo === a);
      }
      if (typeof req.query.priority === "string" && isTaskPriorityInline(req.query.priority)) {
        tasks = tasks.filter((t) => t.priority === req.query.priority);
      }
      if (typeof req.query.tag === "string" && req.query.tag.trim()) {
        const tag = req.query.tag.trim();
        tasks = tasks.filter((t) => Array.isArray(t.tags) && t.tags.includes(tag));
      }
      if (typeof req.query.relatedCustomerId === "string" && req.query.relatedCustomerId.trim()) {
        const id = req.query.relatedCustomerId.trim();
        tasks = tasks.filter((t) => t.relatedCustomerId === id);
      }
      tasks.sort((a, b) => {
        const rank = { pending: 0, in_progress: 1, done: 2, archived: 3 } as Record<TaskStatusInline, number>;
        const sr = rank[a.status] - rank[b.status];
        if (sr !== 0) return sr;
        const aDue = a.dueDate ? Date.parse(a.dueDate) : Infinity;
        const bDue = b.dueDate ? Date.parse(b.dueDate) : Infinity;
        if (aDue !== bDue) return aDue - bDue;
        const aC = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bC = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bC - aC;
      });
      if (typeof req.query.limit === "string") {
        const n = Number(req.query.limit);
        if (Number.isFinite(n) && n > 0) tasks = tasks.slice(0, Math.min(500, Math.trunc(n)));
      }
      return res.json({ tasks, total: tasks.length });
    } catch (err) {
      console.error("[Tasks] list failed:", err);
      return res.status(500).json({ error: "Failed to list tasks" });
    }
  });

  app.get("/api/tasks/:taskId", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db } = admin;
      const snap = await db.collection("tasks").doc(req.params.taskId).get();
      if (!snap.exists) return res.status(404).json({ error: "Task not found" });
      const data = snap.data() ?? {};
      if (data.clientId !== CLIENT_ID) return res.status(403).json({ error: "Forbidden" });
      const task = serializeTaskDocInline(req.params.taskId, data);
      if (!canSeeTaskInline(task, { email: auth.email, role: auth.role })) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return res.json({ task });
    } catch (err) {
      console.error("[Tasks] get failed:", err);
      return res.status(500).json({ error: "Failed to load task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db, FieldValue } = admin;
      const input = validateCreateInputInline(req.body ?? {});
      const payload: Record<string, unknown> = {
        clientId: CLIENT_ID,
        title: input.title,
        description: input.description,
        status: "pending",
        priority: input.priority ?? "medium",
        assignedTo: input.assignedTo,
        createdBy: auth.email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        shared: input.shared ?? false,
        tags: input.tags,
        relatedCustomerId: input.relatedCustomerId,
        relatedAppointmentId: input.relatedAppointmentId,
        notes: input.notes,
      };
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k];
      }
      if (input.dueDate) payload.dueDate = new Date(input.dueDate);
      const ref = await db.collection("tasks").add(payload);
      const after = await ref.get();
      const task = serializeTaskDocInline(ref.id, after.data() ?? {});
      console.log(`[Tasks] create id=${task.id} by=${auth.email}`);
      return res.status(201).json({ task });
    } catch (err) {
      if (err instanceof TaskValidationErrorInline) {
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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db, FieldValue } = admin;
      const patch = validateUpdateInputInline(req.body ?? {});
      const ref = db.collection("tasks").doc(req.params.taskId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "not found" });
      const data = snap.data() ?? {};
      if (data.clientId !== CLIENT_ID) return res.status(403).json({ error: "Forbidden" });
      const existing = serializeTaskDocInline(req.params.taskId, data);
      const perm = canEditTaskInline(existing, { email: auth.email, role: auth.role });
      if (perm === "none") return res.status(403).json({ error: "Forbidden" });

      const next: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
      if (perm === "status_only") {
        if (patch.status === undefined) {
          return res.status(403).json({ error: "assignees can only change task status" });
        }
        const other = Object.keys(patch).filter((k) => k !== "status");
        if (other.length > 0) {
          return res.status(403).json({ error: "assignees can only change task status" });
        }
        next.status = patch.status;
        if (patch.status === "done") next.completedAt = FieldValue.serverTimestamp();
      } else {
        if (patch.title !== undefined) next.title = patch.title;
        if (patch.description !== undefined) next.description = patch.description;
        if (patch.priority !== undefined) next.priority = patch.priority;
        if (patch.assignedTo !== undefined) next.assignedTo = patch.assignedTo ?? null;
        if (patch.shared !== undefined) next.shared = patch.shared;
        if (patch.tags !== undefined) next.tags = patch.tags;
        if (patch.relatedCustomerId !== undefined) next.relatedCustomerId = patch.relatedCustomerId ?? null;
        if (patch.relatedAppointmentId !== undefined) next.relatedAppointmentId = patch.relatedAppointmentId ?? null;
        if (patch.notes !== undefined) next.notes = patch.notes;
        if (patch.dueDate !== undefined) next.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
        if (patch.status !== undefined) {
          next.status = patch.status;
          if (patch.status === "done") next.completedAt = FieldValue.serverTimestamp();
          if (patch.status !== "done" && existing.status === "done") next.completedAt = null;
        }
      }
      await ref.update(next);
      const after = await ref.get();
      return res.json({ task: serializeTaskDocInline(req.params.taskId, after.data() ?? {}) });
    } catch (err) {
      if (err instanceof TaskValidationErrorInline) {
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
      const admin = await loadAdminFirestore();
      if (!admin) return res.status(503).json({ error: "Database not available" });
      const { db } = admin;
      const ref = db.collection("tasks").doc(req.params.taskId);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "not found" });
      const data = snap.data() ?? {};
      if (data.clientId !== CLIENT_ID) return res.status(403).json({ error: "Forbidden" });
      const existing = serializeTaskDocInline(req.params.taskId, data);
      if (!canDeleteTaskInline(existing, { email: auth.email, role: auth.role })) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await ref.delete();
      return res.json({ ok: true });
    } catch (err) {
      console.error("[Tasks] delete failed:", err);
      return res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // ── CRM Metrics: dashboard charts + KPIs (Bloque D) ────────────────────────
  // Mirror of /api/crm-metrics in server.ts. See src/lib/crm-metrics.ts for the
  // canonical helpers; this file inlines them so the Vercel bundler can ship a
  // self-contained function.
  app.get("/api/crm-metrics", async (req, res) => {
    const rangeParam = typeof req.query.range === "string" ? req.query.range : "30d";
    if (!isValidRange(rangeParam)) {
      return res.status(400).json({ error: "range must be one of 7d, 30d, mtd, all" });
    }
    const range: CrmMetricsRange = rangeParam;

    // Demo short-circuit BEFORE auth (matches VITE_DEMO_MODE used by
    // tour.config.ts client-side; the tour bypasses Firebase login by design).
    const demoEnv = (process.env.VITE_DEMO_MODE ?? "").trim().toLowerCase();
    if (demoEnv === "true" || demoEnv === "1") {
      return res.json(buildDemoCrmMetrics(range, new Date()));
    }

    const auth = await requireAdminAuth(req, res);
    if (!auth) return;

    const cacheKey = `${CLIENT_ID}:${range}`;
    const cached = crmMetricsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.payload);
    }

    try {
      const token = await getFirestoreAccessToken();
      if (!token) return res.status(503).json({ error: "Database not available" });
      const projectId =
        process.env.FIREBASE_PROJECT_ID?.trim() ||
        process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
      const databaseId =
        process.env.FIREBASE_DATABASE_ID?.trim() ||
        process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
        "default";
      if (!projectId) return res.status(500).json({ error: "FIREBASE_PROJECT_ID not set" });

      const now = new Date();
      const win = crmRangeWindow(range, now);
      const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;

      const runQuery = async (collectionId: string, extraFilters: unknown[] = []): Promise<Array<{ id: string; fields: Record<string, unknown> }>> => {
        const filters: unknown[] = [
          { fieldFilter: { field: { fieldPath: "clientId" }, op: "EQUAL", value: { stringValue: CLIENT_ID } } },
          ...extraFilters,
        ];
        const r = await fetch(queryUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId }],
              where: filters.length === 1
                ? filters[0]
                : { compositeFilter: { op: "AND", filters } },
              limit: CRM_METRICS_DOC_CAP,
            },
          }),
        });
        if (!r.ok) {
          throw new Error(`runQuery ${collectionId} ${r.status}: ${await r.text().catch(() => "")}`);
        }
        type Row = { document?: { name?: string; fields?: Record<string, unknown> } };
        const rows = (await r.json()) as Row[];
        return rows
          .filter((row): row is Row & { document: NonNullable<Row["document"]> } => !!row.document?.fields)
          .map((row) => {
            const name = row.document.name ?? "";
            const id = name.split("/").pop() ?? "";
            return { id, fields: row.document.fields ?? {} };
          });
      };

      const apptFilters = win.startIso
        ? [{ fieldFilter: { field: { fieldPath: "date" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: win.startIso } } }]
        : [];

      const [apptRows, custRows, inboxRows] = await Promise.all([
        runQuery("appointments", apptFilters),
        runQuery("customers"),
        runQuery("contact_inbox"),
      ]);

      let leadRows: Array<{ id: string; fields: Record<string, unknown> }> = [];
      try {
        leadRows = await runQuery("hub_leads");
      } catch (err) {
        console.warn("[CRM Metrics] hub_leads read failed (falling back to inbox):", err instanceof Error ? err.message : err);
      }

      const tsToMs = (v: unknown): number | undefined => {
        const decoded = decodeFirestoreValue(v);
        if (typeof decoded === "string") {
          const t = Date.parse(decoded);
          return Number.isNaN(t) ? undefined : t;
        }
        return undefined;
      };

      const appointments: CrmRawAppointment[] = apptRows.map((r) => ({
        id: r.id,
        status: String(decodeFirestoreValue(r.fields.status) ?? "pending"),
        serviceId: String(decodeFirestoreValue(r.fields.serviceId) ?? ""),
        customerName: String(decodeFirestoreValue(r.fields.customerName) ?? ""),
        customerPhone: (() => {
          const v = decodeFirestoreValue(r.fields.customerPhone);
          return typeof v === "string" ? v : undefined;
        })(),
        customerEmail: (() => {
          const v = decodeFirestoreValue(r.fields.customerEmail);
          return typeof v === "string" ? v : undefined;
        })(),
        date: String(decodeFirestoreValue(r.fields.date) ?? ""),
        time: String(decodeFirestoreValue(r.fields.time) ?? ""),
        amountPaidCents: (() => {
          const v = decodeFirestoreValue(r.fields.amountPaidCents);
          return typeof v === "number" ? v : undefined;
        })(),
        paymentStatus: (() => {
          const v = decodeFirestoreValue(r.fields.paymentStatus);
          return typeof v === "string" ? v : undefined;
        })(),
        createdAtMs: tsToMs(r.fields.createdAt),
      }));

      const customers: CrmRawCustomer[] = custRows.map((r) => ({
        id: r.id,
        phone: (() => {
          const v = decodeFirestoreValue(r.fields.phone);
          return typeof v === "string" ? v : undefined;
        })(),
        email: (() => {
          const v = decodeFirestoreValue(r.fields.email);
          return typeof v === "string" ? v : undefined;
        })(),
        visitCount: (() => {
          const v = decodeFirestoreValue(r.fields.visitCount);
          return typeof v === "number" ? v : undefined;
        })(),
      }));

      const inbox: CrmRawInboxItem[] = inboxRows.map((r) => ({
        id: r.id,
        status: String(decodeFirestoreValue(r.fields.status) ?? "new"),
        createdAtMs: tsToMs(r.fields.createdAt),
      }));

      const leads: CrmRawLead[] = leadRows.map((r) => ({
        id: r.id,
        createdAtMs: tsToMs(r.fields.createdAt),
      }));

      const payload = computeCrmMetrics({ range, now, appointments, customers, inbox, leads });
      crmMetricsCache.set(cacheKey, { payload, expiresAt: Date.now() + CRM_METRICS_CACHE_TTL_MS });
      return res.json(payload);
    } catch (err) {
      console.error("[CRM Metrics] read failed:", err);
      return res.status(500).json({ error: "Failed to compute metrics" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const name = sanitizeText(req.body?.name, 120);
      const email = sanitizeText(req.body?.email, 200).toLowerCase();
      const subject = sanitizeText(req.body?.subject, 160);
      const message = sanitizeText(req.body?.message, 3_000);
      const phone = sanitizeText(req.body?.phone, 40);

      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email and message are required." });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format." });
      }

      console.log(`[Contact Form] Received inquiry from ${name} (${email})`);

      writeInboxEntry({ name, email, subject: subject || "General Inquiry", message, source: "web" });

      const channels = await getChannelConfig();

      if (shouldUseChannel(channels, "new_lead_owner", "email")) {
        await sendNotification(
          `Website Inquiry: ${subject || 'General Contact'}`,
          { name, email, subject, message },
          'contact'
        );
      }

      if (shouldUseChannel(channels, "new_lead_owner", "whatsapp")) {
        const { adminPhones } = getNotificationRecipients();
        if (adminPhones.length > 0) {
          notifyAgentLeadCreated({
            nombre: name,
            telefono: phone || undefined,
            email,
            mensaje: subject ? `${subject}: ${message}` : message,
            fuente: "web_contact",
            adminPhones,
          }).catch(() => {});
        }
      }

      res.json({ success: true, message: "Thank you! Your message has been received." });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // C-3: Public booking goes through Admin SDK so Firestore rules can deny
  // unauthenticated appointment/manifest writes in production.
  app.post("/api/book", async (req, res) => {
    try {
      const body = req.body ?? {};
      const customerName = sanitizeText(body.customerName, 120);
      const customerEmail = sanitizeText(body.customerEmail, 200).toLowerCase();
      const customerPhone = sanitizeText(body.customerPhone, 40);
      const serviceId = sanitizeText(body.serviceId, 120);
      const staffId = sanitizeText(body.staffId, 120);
      const date = sanitizeText(body.date, 20);
      const time = sanitizeText(body.time, 10);
      const requestedDuration = typeof body.duration === "number" && Number.isFinite(body.duration) ? body.duration : 0;
      const status = body.status === "confirmed" ? "confirmed" : "pending";
      const paymentStatus = body.paymentStatus === "pending" ? "pending" : undefined;

      if (!customerName || !customerEmail || !serviceId || !staffId || !date || !time || !requestedDuration) {
        return res.status(400).json({ error: "Missing required booking fields." });
      }
      if (!isValidBookingDuration(requestedDuration)) {
        return res.status(400).json({ error: "duration must be an integer between 5 and 480 minutes." });
      }
      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: "Invalid email." });
      }
      if (!isValidBookingDate(date) || !isValidBookingTime(time)) {
        return res.status(400).json({ error: "Invalid date or time format." });
      }

      const admin = await loadAdminFirestore();
      if (!admin) {
        return res.status(503).json({ error: "Database not available." });
      }
      const { db, FieldValue } = admin;

      const configSnap = await db.collection("config").doc(CLIENT_ID).get();
      const bookingMetadata = resolveTrustedBookingMetadata(configSnap.data(), serviceId, staffId);
      if (!bookingMetadata) {
        return res.status(400).json({ error: "Unknown booking service." });
      }

      const appointmentFields: Record<string, unknown> = {
        customerName, customerEmail, customerPhone,
        serviceId,
        serviceName: bookingMetadata.serviceName,
        status,
      };
      if (bookingMetadata.staffName) appointmentFields.staffName = bookingMetadata.staffName;
      if (bookingMetadata.priceCents) appointmentFields.priceCents = bookingMetadata.priceCents;
      if (bookingMetadata.checkoutAmountCents) appointmentFields.checkoutAmountCents = bookingMetadata.checkoutAmountCents;
      if (bookingMetadata.checkoutMode) appointmentFields.checkoutMode = bookingMetadata.checkoutMode;
      if (paymentStatus) appointmentFields.paymentStatus = paymentStatus;

      const appointmentId = await createBookingWithManifest({
        db, FieldValue,
        clientId: CLIENT_ID,
        staffId, date, time, duration: bookingMetadata.duration,
        appointmentFields,
      });

      try {
        const custQuery = await db.collection("customers")
          .where("clientId", "==", CLIENT_ID)
          .where("email", "==", customerEmail)
          .limit(1)
          .get();

        if (custQuery.empty) {
          await db.collection("customers").add({
            clientId: CLIENT_ID,
            email: customerEmail,
            fullName: customerName,
            phone: customerPhone,
            source: "booking",
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn("[Book] customer upsert failed (non-fatal):", err instanceof Error ? err.message : err);
      }

      res.json({ success: true, appointmentId });
    } catch (error: unknown) {
      if (error instanceof BookingConflictError) {
        return res.status(409).json({ error: "This time slot is no longer available." });
      }
      console.error("[Book] failed:", error);
      res.status(500).json({ error: "Failed to create booking." });
    }
  });

  app.post("/api/notify-booking", async (req, res) => {
    try {
      const appointmentId = sanitizeText(req.body?.appointmentId, 120);
      if (!appointmentId) {
        return res.status(400).json({ error: "appointmentId is required." });
      }

      const admin = await loadAdminFirestore();
      if (!admin) {
        return res.status(503).json({ error: "Database not available." });
      }

      const apptSnap = await admin.db.collection("appointments").doc(appointmentId).get();
      if (!apptSnap.exists) {
        return res.status(404).json({ error: "Appointment not found." });
      }
      const apptData = apptSnap.data()!;
      if (apptData.clientId && apptData.clientId !== CLIENT_ID) {
        return res.status(404).json({ error: "Appointment not found." });
      }

      const customerName = String(apptData.customerName ?? "").slice(0, 120);
      const customerEmail = String(apptData.customerEmail ?? "").toLowerCase().slice(0, 200);
      const customerPhone = String(apptData.customerPhone ?? "").slice(0, 40);
      const staff = String(apptData.staffName ?? apptData.staff ?? "").slice(0, 120);
      const staffId = String(apptData.staffId ?? "").slice(0, 120);
      const service = String(apptData.serviceName ?? apptData.service ?? "").slice(0, 160);
      const date = String(apptData.date ?? "").slice(0, 20);
      const time = String(apptData.time ?? "").slice(0, 20);
      const businessName = sanitizeText(req.body?.details?.businessName, 160);
      const duration = typeof apptData.duration === "number" ? apptData.duration : undefined;

      if (!customerName || !customerEmail || !service || !date || !time) {
        return res.status(400).json({ error: "Appointment data is incomplete." });
      }
      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: "Invalid customer email in appointment record." });
      }

      const channels = await getChannelConfig();
      const appointment: AppointmentPayload = {
        appointmentId, date, time,
        serviceName: service, staffName: staff, staffId: staffId || undefined,
        customerName, customerPhone, businessName: businessName || undefined, duration,
      };

      if (shouldUseChannel(channels, "new_booking_owner", "email")) {
        await sendNotification(
          "New Booking Request",
          { appointmentId, details: { customerName, customerEmail, customerPhone, staff, service, date, time } },
          'booking'
        );
      }

      if (shouldUseChannel(channels, "booking_confirmation_customer", "email")) {
        sendEmailToCustomer({
          to: customerEmail,
          subject: `Booking Confirmed: ${service} on ${date}`,
          html: buildCustomerBookingEmailHtml({ serviceName: service, date, time, staffName: staff, businessName }),
          type: "booking",
        }).catch(() => {});
      }

      const { adminPhones, staffPhones } = getNotificationRecipients();
      const shouldWaOwner = shouldUseChannel(channels, "new_booking_owner", "whatsapp");
      const shouldWaCustomer = shouldUseChannel(channels, "booking_confirmation_customer", "whatsapp");
      if (shouldWaOwner || shouldWaCustomer) {
        notifyAgentAppointmentBooked({
          appointment,
          adminPhones: shouldWaOwner ? adminPhones : [],
          staffPhones: shouldUseChannel(channels, "new_booking_staff", "whatsapp") ? staffPhones : [],
          customerPhone: shouldWaCustomer ? customerPhone : undefined,
        }).catch(() => {});
      }

      reportBookingToHub("web");

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to process notification" });
    }
  });

  /** CRM admin acts on an appointment (cancel, reschedule, walk-in). Bridges
   * the Firestore-only path to the agent so reminders/reviews stay in sync. */
  app.post("/api/appointment/notify", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;

    try {
      const action = String(req.body?.action || "");
      if (!["booked", "cancelled", "rescheduled"].includes(action)) {
        return res.status(400).json({ error: "action must be booked|cancelled|rescheduled" });
      }

      const appt = req.body?.appointment ?? {};
      const appointment: AppointmentPayload = {
        appointmentId: sanitizeText(appt.appointmentId ?? appt.id, 120) || undefined,
        date: sanitizeText(appt.date, 20),
        time: sanitizeText(appt.time, 20),
        serviceName: sanitizeText(appt.serviceName, 160) || undefined,
        staffName: sanitizeText(appt.staffName, 120) || undefined,
        staffId: sanitizeText(appt.staffId, 120) || undefined,
        customerName: sanitizeText(appt.customerName, 120) || undefined,
        customerPhone: sanitizeText(appt.customerPhone, 40) || undefined,
        businessName: sanitizeText(appt.businessName, 160) || undefined,
        duration: Number.isFinite(appt.duration) ? Number(appt.duration) : undefined,
      };

      if (!appointment.date || !appointment.time) {
        return res.status(400).json({ error: "appointment.date and appointment.time are required" });
      }

      const customerEmail = sanitizeText(appt.customerEmail, 200).toLowerCase() || undefined;

      const { adminPhones, staffPhones } = getNotificationRecipients();
      if (adminPhones.length === 0 && staffPhones.length === 0 && !appointment.customerPhone && !customerEmail) {
        return res.json({ success: true, skipped: "no_recipients" });
      }

      const channels = await getChannelConfig();
      let ok = false;

      if (action === "booked") {
        if (shouldUseChannel(channels, "booking_confirmation_customer", "email") && customerEmail) {
          sendEmailToCustomer({
            to: customerEmail,
            subject: `Booking Confirmed: ${appointment.serviceName ?? "your appointment"} on ${appointment.date}`,
            html: buildCustomerBookingEmailHtml({
              serviceName: appointment.serviceName ?? "Service",
              date: appointment.date, time: appointment.time,
              staffName: appointment.staffName, businessName: appointment.businessName,
            }),
            type: "booking",
          }).catch(() => {});
        }
        if (shouldUseChannel(channels, "booking_confirmation_customer", "whatsapp")) {
          ok = await notifyAgentAppointmentBooked({
            appointment, adminPhones, staffPhones, customerPhone: appointment.customerPhone,
          });
        }
      } else if (action === "cancelled") {
        const reason = sanitizeText(req.body?.reason, 240) || undefined;
        if (shouldUseChannel(channels, "cancellation_customer", "email") && customerEmail) {
          sendEmailToCustomer({
            to: customerEmail,
            subject: `Appointment Cancelled: ${appointment.serviceName ?? "your appointment"} on ${appointment.date}`,
            html: buildCustomerCancellationEmailHtml({
              serviceName: appointment.serviceName ?? "Service",
              date: appointment.date, time: appointment.time,
              businessName: appointment.businessName,
            }, reason),
            type: "booking",
          }).catch(() => {});
        }
        if (shouldUseChannel(channels, "cancellation_customer", "whatsapp")) {
          ok = await notifyAgentAppointmentCancelled({
            appointment, adminPhones, staffPhones, customerPhone: appointment.customerPhone, reason,
          });
        }
      } else if (action === "rescheduled") {
        const oldAppt = req.body?.oldAppointment ?? {};
        const oldAppointment: AppointmentPayload = {
          ...appointment,
          date: sanitizeText(oldAppt.date, 20),
          time: sanitizeText(oldAppt.time, 20),
        };
        if (shouldUseChannel(channels, "reschedule_customer", "email") && customerEmail) {
          sendEmailToCustomer({
            to: customerEmail,
            subject: `Appointment Rescheduled: ${appointment.serviceName ?? "your appointment"}`,
            html: buildCustomerRescheduleEmailHtml({
              serviceName: appointment.serviceName ?? "Service",
              date: appointment.date, time: appointment.time,
              staffName: appointment.staffName, businessName: appointment.businessName,
            }),
            type: "booking",
          }).catch(() => {});
        }
        if (shouldUseChannel(channels, "reschedule_customer", "whatsapp")) {
          ok = await notifyAgentAppointmentRescheduled({
            oldAppointment, newAppointment: appointment,
            adminPhones, staffPhones, customerPhone: appointment.customerPhone,
          });
        }
      }

      res.json({ success: true, agentNotified: ok });
    } catch (error) {
      console.error("[Appointment Notify] failed:", error);
      res.status(500).json({ error: "Failed to notify agent" });
    }
  });

  // ─── Monitor-friendly endpoints ────────────────────────────────────────────
  // Used by monitor-agent to verify the booking flow is operational.

  app.get("/api/services", async (_req, res) => {
    const token = await getFirestoreAccessToken();
    const projectId =
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    const databaseId =
      process.env.FIREBASE_DATABASE_ID?.trim() ||
      process.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
      "default";

    if (!token || !projectId) {
      return res.status(503).json({ error: "Firestore not configured." });
    }

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/config/${CLIENT_ID}`;
      const fsRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!fsRes.ok) {
        return res.status(fsRes.status === 404 ? 404 : 502).json({ error: `Firestore responded ${fsRes.status}` });
      }

      const doc = (await fsRes.json()) as {
        fields?: { services?: { arrayValue?: { values?: Array<{ mapValue?: { fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number }> } }> } } };
      };

      const raw = doc.fields?.services?.arrayValue?.values ?? [];
      const services = raw.map((svc) => ({
        id: svc.mapValue?.fields?.id?.stringValue ?? "",
        name: svc.mapValue?.fields?.name?.stringValue ?? "",
        duration: Number(svc.mapValue?.fields?.duration?.integerValue ?? svc.mapValue?.fields?.duration?.doubleValue ?? 0),
        price: Number(svc.mapValue?.fields?.price?.integerValue ?? svc.mapValue?.fields?.price?.doubleValue ?? 0),
      }));

      res.json({ services });
    } catch (err) {
      console.error("[/api/services]", err);
      res.status(500).json({ error: "Failed to fetch services." });
    }
  });

  app.post("/api/availability", async (req, res) => {
    const { date, serviceId } = req.body ?? {};
    if (!date || !serviceId) {
      return res.status(400).json({ error: "date and serviceId are required." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD." });
    }
    // For monitor probes (_monitor_test) and real clients alike, return a
    // lightweight response confirming the endpoint is reachable and the
    // date is parseable.  Full slot computation lives in the frontend.
    res.json({ available: true, date, serviceId });
  });

  app.post("/api/bookings/validate", async (req, res) => {
    const { serviceId, date, time, clientName, clientPhone, duration } = req.body ?? {};
    const errors: string[] = [];
    if (!serviceId || typeof serviceId !== "string" || serviceId.length > 120) errors.push("serviceId is required");
    if (!date || !isValidBookingDate(date ?? "")) errors.push("date must be YYYY-MM-DD");
    if (!time || !isValidBookingTime(time ?? "")) errors.push("time must be HH:mm");
    if (!clientName || typeof clientName !== "string" || clientName.trim().length === 0 || clientName.length > 120) errors.push("clientName is required (max 120 chars)");
    if (!clientPhone || typeof clientPhone !== "string" || clientPhone.trim().length === 0 || clientPhone.length > 40) errors.push("clientPhone is required (max 40 chars)");
    if (duration !== undefined && !isValidBookingDuration(duration)) {
      errors.push("duration must be an integer between 5 and 480 minutes");
    }

    if (errors.length > 0) {
      return res.status(400).json({ valid: false, errors });
    }
    res.json({ valid: true });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const appointmentId = sanitizeText(req.body?.appointmentId, 120);
      const name = sanitizeText(req.body?.name, 160);
      const customerEmail = sanitizeText(req.body?.customerEmail, 200).toLowerCase();
      const mode = req.body?.mode === "deposit" ? "deposit" as const : "full" as const;

      if (!appointmentId || !name || !customerEmail) {
        return res.status(400).json({ error: "Invalid checkout payload." });
      }
      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: "Invalid customer email." });
      }

      const admin = await loadAdminFirestore();
      if (!admin) {
        return res.status(503).json({ error: "Database not available." });
      }

      const apptSnap = await admin.db.collection("appointments").doc(appointmentId).get();
      if (!apptSnap.exists) {
        return res.status(404).json({ error: "Appointment not found." });
      }
      const apptData = apptSnap.data()!;
      if (apptData.clientId && apptData.clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Appointment does not belong to this tenant." });
      }

      let authorizedPrice: number | null = null;
      if (typeof apptData.checkoutAmountCents === "number" && apptData.checkoutAmountCents > 0) {
        authorizedPrice = apptData.checkoutAmountCents;
      } else if (typeof apptData.priceCents === "number" && apptData.priceCents > 0) {
        authorizedPrice = apptData.priceCents;
      } else if (typeof apptData.price === "number" && apptData.price > 0) {
        authorizedPrice = Math.round(apptData.price * 100);
      }
      const authorizedMode = apptData.checkoutMode === "deposit" ? "deposit" as const : mode;

      if (!authorizedPrice || !Number.isInteger(authorizedPrice) || authorizedPrice < 50 || authorizedPrice > 2_000_000) {
        return res.status(400).json({ error: "No valid price found for this appointment. Set the price in the CRM before accepting payment." });
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
        });
      }

      const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
      const result = await gateway.createCheckoutSession({
        appointmentId,
        customerEmail,
        serviceName: name,
        amountCents: authorizedPrice,
        mode: authorizedMode,
        successUrl: `${baseUrl}/?booking_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/?booking_status=cancelled`,
        clientId: CLIENT_ID,
      });

      res.json({ id: result.sessionId, url: result.redirectUrl });
    } catch (error: unknown) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session." });
    }
  });
}

// ─── Vercel Serverless Entrypoint ─────────────────────────────────────────────
const app = express();
try {
  registerExpressRoutes(app, 3000);
  logStartupStatus();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  app.all("*", (_req, res) => {
    res.status(503).json({
      error: "API bootstrap failed",
      message,
      hint: "Set CLIENT_ID in Vercel Project Settings → Environment Variables.",
    });
  });
}

export default function handler(req: Request, res: Response) {
  app(req, res);
}
