/**
 * Vercel Serverless Function — self-contained, no cross-file imports.
 * All server logic is inlined here so @vercel/node compiles a single file
 * with no module-resolution issues between TypeScript source files.
 *
 * server.ts is kept intact for local dev (`npm run dev` / `tsx server.ts`).
 */
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Resend } from "resend";
import type { Request, Response, NextFunction, Express } from "express";
import { createHash, createSign, createVerify } from "crypto";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// ─── Startup Diagnostics ──────────────────────────────────────────────────────
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
type PaymentProvider = "stripe" | "meshulam" | "yaadpay" | "authorize_net" | "square" | "other";
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
  const provider: PaymentProvider =
    providerEnv && ["stripe", "meshulam", "yaadpay", "authorize_net", "square", "other"].includes(providerEnv)
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
    return { status: "active", provider };
  }

  const token = await getFirestoreAccessToken();
  if (!token) return { status: "active", provider }; // degraded mode

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/clients/${CLIENT_ID}`;
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 404) return { status: "active", provider }; // new tenant — don't block

    if (!res.ok) {
      console.error("[Kill-switch] Firestore REST read failed:", res.status, await res.text());
      return { status: "active", provider };
    }

    const doc = (await res.json()) as {
      fields?: {
        status?: { stringValue?: string };
        defaultPaymentProvider?: { stringValue?: string };
      };
    };

    const validStatuses:  ClientStatus[]    = ["active", "suspended", "trial", "maintenance", "archived"];
    const validProviders: PaymentProvider[] = ["stripe", "meshulam", "yaadpay", "authorize_net", "square", "other"];

    const rawStatus = doc.fields?.status?.stringValue;
    const status: ClientStatus = validStatuses.includes(rawStatus as ClientStatus)
      ? (rawStatus as ClientStatus)
      : "active";

    const rawProvider = doc.fields?.defaultPaymentProvider?.stringValue;
    const resolvedProvider: PaymentProvider = validProviders.includes(rawProvider as PaymentProvider)
      ? (rawProvider as PaymentProvider)
      : provider;

    clientStateCache = { status, provider: resolvedProvider, expiresAt: now + 30_000 };
    return { status, provider: resolvedProvider };
  } catch (err) {
    console.error("[Kill-switch] Unexpected error reading client status:", err);
    return { status: "active", provider };
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

// ─── Firebase ID Token Verification (REST-only, no firebase-admin SDK) ───────
// Verifies Firebase Auth ID tokens by fetching Google's public x509 certs and
// validating the RS256 signature + iss/aud/exp claims. Kept SDK-free to avoid
// the gRPC cold-start hang documented above. Mirrors server.ts so both
// runtimes behave identically.

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

// ─── Admin role types (Bloque E) ─────────────────────────────────────────────
// Inlined here because api/index.ts is self-contained (no cross-file imports).
// Mirrors src/lib/admin-users.ts — keep both in sync.
type AdminRole = "owner" | "manager" | "staff";
type AdminUserStatus = "pending" | "active" | "removed";
const ADMIN_ROLES: readonly AdminRole[] = ["owner", "manager", "staff"] as const;

function isAdminRole(value: unknown): value is AdminRole {
  return value === "owner" || value === "manager" || value === "staff";
}
function isAdminStatus(value: unknown): value is AdminUserStatus {
  return value === "pending" || value === "active" || value === "removed";
}
function normalizeAdminEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}
function canAssignRole(actor: AdminRole, targetRole: AdminRole): boolean {
  if (actor === "owner") return true;
  if (actor === "manager") return targetRole === "staff";
  return false;
}
function canRemoveRole(actor: AdminRole, targetRole: AdminRole): boolean {
  if (actor === "owner") return true;
  if (actor === "manager") return targetRole === "staff";
  return false;
}

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

  // Primary: per-tenant admin_users collection.
  const lookup = await lookupAdminUser(normalized);
  if (lookup) {
    if (lookup.status === "removed") {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }
    return { email: normalized, uid: decoded.sub, role: lookup.role };
  }

  // Legacy fallback: env-based allowlist → owner.
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

  const appointment = await firestoreRestGetDocument("appointments", appointmentId);
  if (!appointment) {
    throw new Error(`appointment not found for paid checkout session: ${appointmentId}`);
  }

  const appointmentClientId = appointment.fields?.clientId && "stringValue" in appointment.fields.clientId
    ? appointment.fields.clientId.stringValue
    : undefined;
  if (appointmentClientId !== CLIENT_ID) {
    throw new Error(`appointment clientId mismatch for paid checkout session: ${appointmentId}`);
  }

  const now = new Date().toISOString();
  const paymentStatus = session.metadata?.paymentMode === "deposit" ? "deposit_paid" : "paid";
  await firestoreRestPatchDocument("appointments", appointmentId, {
    status: { stringValue: "confirmed" },
    paymentStatus: { stringValue: paymentStatus },
    amountPaidCents: { integerValue: String(session.amount_total ?? 0) },
    stripeSessionId: { stringValue: session.id },
    paymentProvider: { stringValue: "stripe" },
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

// ─── Admin chat tools (inline copy of src/lib/ai/admin-tools.ts) ─────────────
// api/index.ts is intentionally self-contained (see docs/ARCHITECTURE.md);
// the Vercel @vercel/node bundler does not cross-import from src/. Keep this
// block in sync with src/lib/ai/admin-tools.ts.

type GeminiSchemaType = "OBJECT" | "STRING" | "INTEGER" | "NUMBER" | "BOOLEAN" | "ARRAY";
type GeminiSchema = {
  type: GeminiSchemaType;
  description?: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  enum?: string[];
};
type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters?: GeminiSchema;
};

const ADMIN_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: "walk_in",
    description:
      "Register a walk-in customer (someone who arrived without an online booking). Creates a customer record and an immediately-completed appointment for today's date and time.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Customer's full name." },
        phone: { type: "STRING", description: "Customer's phone number (with or without dashes)." },
        serviceId: { type: "STRING", description: 'Service ID from the SERVICES list. Use an empty string ("") if the admin did not specify one.' },
        staffId: { type: "STRING", description: 'Staff member ID from the TEAM list. Use an empty string ("") if the admin did not specify one.' },
        duration: { type: "INTEGER", description: "Duration of the service in minutes. Default 30 if not provided." },
      },
      required: ["name", "phone"],
    },
  },
  {
    name: "support_request",
    description:
      "Send a support / change request to Liam (the developer/owner of the platform). Use whenever the admin asks to change something on the website itself: photos, text, prices, service names, colors, etc. NOT for changing customer data.",
    parameters: {
      type: "OBJECT",
      properties: {
        message: { type: "STRING", description: "The full request message describing what needs to be changed, in clear plain English/Spanish." },
      },
      required: ["message"],
    },
  },
  {
    name: "book_appointment",
    description:
      "Book a future appointment for a customer. Always check the UPCOMING APPOINTMENTS list in the system prompt first to avoid double-booking the same staff member at the same time.",
    parameters: {
      type: "OBJECT",
      properties: {
        customerName: { type: "STRING", description: "Customer's full name." },
        customerPhone: { type: "STRING", description: "Customer's phone." },
        customerEmail: { type: "STRING", description: "Customer's email (optional)." },
        date: { type: "STRING", description: "Appointment date in YYYY-MM-DD format." },
        time: { type: "STRING", description: "Appointment start time in HH:mm format (24h)." },
        serviceId: { type: "STRING", description: "Service ID from the SERVICES list." },
        staffId: { type: "STRING", description: "Staff member ID from the TEAM list." },
        duration: { type: "INTEGER", description: "Duration in minutes. Default 30." },
      },
      required: ["customerName", "date", "time"],
    },
  },
  {
    name: "update_appointment",
    description:
      'Edit or cancel an existing appointment. Identify the appointment with the (id:xxx) tag printed next to it in the live data. To reschedule: cancel first, then book a new slot in a follow-up turn.',
    parameters: {
      type: "OBJECT",
      properties: {
        appointmentId: { type: "STRING", description: "Exact appointment ID from the (id:xxx) tag." },
        updates: {
          type: "OBJECT",
          description: "Partial update payload. Allowed keys: status (confirmed|completed|cancelled), time, date, serviceId, staffId, duration, notes.",
          properties: {
            status: { type: "STRING", enum: ["confirmed", "completed", "cancelled"], description: "Lifecycle status." },
            time: { type: "STRING", description: "New time HH:mm." },
            date: { type: "STRING", description: "New date YYYY-MM-DD." },
            serviceId: { type: "STRING" },
            staffId: { type: "STRING" },
            duration: { type: "INTEGER" },
            notes: { type: "STRING" },
          },
        },
      },
      required: ["appointmentId", "updates"],
    },
  },
  {
    name: "mark_paid",
    description:
      'Mark an existing appointment as paid. Use when the admin says things like "Juan pagó 50" or "marca como pagado el turno de las 3pm". Updates amountPaidCents, paymentStatus="paid" and paidAt.',
    parameters: {
      type: "OBJECT",
      properties: {
        appointmentId: { type: "STRING", description: "Exact appointment ID from the (id:xxx) tag." },
        amountCents: { type: "INTEGER", description: "Amount paid IN CENTS. If the admin says 'paid 50 dollars', send 5000. If 'paid 200 shekels', send 20000." },
        paymentMethod: { type: "STRING", description: 'Optional method label, e.g. "cash", "card", "transfer".' },
      },
      required: ["appointmentId", "amountCents"],
    },
  },
  {
    name: "update_customer",
    description:
      "Update a customer record. Use when the admin asks to add a note, add a tag, or change the source attribution of a customer. Notes are appended, not replaced. Tags are added to the existing array (no duplicates).",
    parameters: {
      type: "OBJECT",
      properties: {
        customerId: { type: "STRING", description: "Exact customer ID from the (id:xxx) tag in the CUSTOMERS list." },
        notes: { type: "STRING", description: "Note text to append to the existing notes." },
        tags: { type: "ARRAY", items: { type: "STRING" }, description: "Tags to add (will be unioned with existing tags)." },
        source: { type: "STRING", description: 'Override the customer source (e.g. "referral", "instagram").' },
      },
      required: ["customerId"],
    },
  },
  {
    name: "add_walkin_count",
    description:
      'Increment an anonymous walk-in counter for a given date. Use when the admin says "entraron 3 clientes" or "had 5 walk-ins today" WITHOUT giving names. Does NOT create customer records or appointments.',
    parameters: {
      type: "OBJECT",
      properties: {
        count: { type: "INTEGER", description: "How many walk-ins to add to the day's tally." },
        date: { type: "STRING", description: "Date in YYYY-MM-DD format. Defaults to today if omitted." },
      },
      required: ["count"],
    },
  },
  {
    name: "bulk_update_status",
    description:
      'Update the status of many appointments at once. Use for commands like "completá todos los turnos de hoy" or "cancel everything for tomorrow". Capped at 100 appointments per call for safety.',
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", enum: ["confirmed", "completed", "cancelled"], description: "Target status to set on every selected appointment." },
        date: { type: "STRING", description: "YYYY-MM-DD; if appointmentIds is omitted, all appointments on this date are matched. Defaults to today." },
        appointmentIds: { type: "ARRAY", items: { type: "STRING" }, description: "Optional explicit list of appointment IDs. If provided, `date` is ignored." },
      },
      required: ["status"],
    },
  },
  // ── Bloque I — stock tools (inline copy of STOCK_TOOL_DECLARATIONS) ───────
  {
    name: "query_stock",
    description:
      "Look up an inventory item by name or id. Use when the admin asks how much of something is left, e.g. 'how much shampoo do I have', 'queda alcohol'. If the lookup is ambiguous you'll get a list of candidates and should ask the admin which one they meant.",
    parameters: {
      type: "OBJECT",
      properties: {
        itemName: { type: "STRING", description: "Free-text item name (fuzzy / accent-insensitive)." },
        itemId: { type: "STRING", description: "Exact item id from a previous tool response." },
      },
    },
  },
  {
    name: "consume_stock",
    description:
      "Decrement an inventory item. Use when the admin says they used / consumed / spent a quantity of something. The count must be a positive integer.",
    parameters: {
      type: "OBJECT",
      properties: {
        itemName: { type: "STRING", description: "Free-text item name (fuzzy)." },
        itemId: { type: "STRING", description: "Exact item id from a previous tool response." },
        count: { type: "INTEGER", description: "Positive integer quantity to deduct." },
        reason: { type: "STRING", description: "Optional short reason." },
      },
      required: ["count"],
    },
  },
  {
    name: "add_stock",
    description:
      "Increment an inventory item. If the item does not exist you'll get back a 'not found, suggest create' response — ask the admin if they want it created and call again with createIfMissing=true.",
    parameters: {
      type: "OBJECT",
      properties: {
        itemName: { type: "STRING", description: "Free-text item name (fuzzy)." },
        itemId: { type: "STRING", description: "Exact item id from a previous tool response." },
        count: { type: "INTEGER", description: "Positive integer quantity to add." },
        reason: { type: "STRING", description: "Optional short reason." },
        unit: { type: "STRING", description: "Optional unit when creating a new item." },
        minStock: { type: "INTEGER", description: "Optional minimum stock when creating a new item." },
        createIfMissing: {
          type: "BOOLEAN",
          description:
            "Pass true only after the admin has confirmed creating a brand-new item.",
        },
      },
      required: ["count"],
    },
  },
];

const ADMIN_TOOLS_PROMPT_FRAGMENT = `SPECIAL CAPABILITIES — TOOL CALLS:
You have access to function calls (tools) that perform real, persistent actions in the CRM database. The tools are:
- walk_in: register a walk-in customer + completed appointment for today.
- support_request: forward a website-change request to Liam (developer).
- book_appointment: create a future appointment for a customer.
- update_appointment: change status / time / staff of an existing appointment (use the id from the (id:xxx) tag).
- mark_paid: mark an appointment as paid (amount IN CENTS — multiply by 100 if the admin says dollars or shekels).
- update_customer: append a note, add tags, or change source for a customer.
- add_walkin_count: anonymous walk-in counter — use only when no name was given.
- bulk_update_status: set status on many appointments at once (capped at 100).
- get_crm_snapshot: when you need aggregated data (KPIs, today/upcoming appointments, top customers) call this FIRST. Avoid calling it for narrow questions you can already answer.

CRITICAL RULES:
1. If the user describes an intent but you are missing a REQUIRED field, ASK for it in natural language. NEVER call the function with placeholder, made-up, or invented values.
2. Use IDs from the live data above (the (id:xxx) tags). Never fabricate IDs.
3. Money is always in CENTS in mark_paid. Convert from whatever unit the admin used.
4. For rescheduling, first call update_appointment with status=cancelled, then book_appointment in a follow-up turn.
5. Only one tool call per turn. After the tool runs you will receive its result — then write a short confirmation to the admin in their language.`;

// ── Inline copy of src/lib/intent-router.ts ─────────────────────────────────
// Keep in sync. The Vercel bundler cannot cross-import from src/, so the
// router lives twice in this repo (same constraint as ADMIN_TOOL_DECLARATIONS
// above — see docs/ARCHITECTURE.md).

type AdminIntentScope = "stock" | "tasks" | "customers" | "general";
type AdminToolName =
  | "walk_in"
  | "support_request"
  | "book_appointment"
  | "update_appointment"
  | "mark_paid"
  | "update_customer"
  | "add_walkin_count"
  | "bulk_update_status"
  | "get_crm_snapshot"
  | "query_stock"
  | "consume_stock"
  | "add_stock"
  | "create_task"
  | "list_tasks"
  | "complete_task";

const ALL_ADMIN_TOOLS_INLINE: readonly AdminToolName[] = [
  "walk_in",
  "support_request",
  "book_appointment",
  "update_appointment",
  "mark_paid",
  "update_customer",
  "add_walkin_count",
  "bulk_update_status",
  "get_crm_snapshot",
  "query_stock",
  "consume_stock",
  "add_stock",
  "create_task",
  "list_tasks",
  "complete_task",
] as const;

const SCOPE_TOOLS_INLINE: Record<AdminIntentScope, AdminToolName[]> = {
  stock: ["query_stock", "consume_stock", "add_stock", "update_customer", "get_crm_snapshot"],
  tasks: ["create_task", "list_tasks", "complete_task", "update_customer", "get_crm_snapshot"],
  customers: [
    "walk_in",
    "book_appointment",
    "update_appointment",
    "mark_paid",
    "update_customer",
    "add_walkin_count",
    "bulk_update_status",
    "get_crm_snapshot",
  ],
  general: [...ALL_ADMIN_TOOLS_INLINE],
};

type AdminDeterministicAction =
  | { action: "query_stock"; args: { itemName: string } }
  | { action: "set_stock"; args: { itemName: string; count: number } }
  | { action: "consume_stock"; args: { itemName: string; count: number } }
  | { action: "add_stock"; args: { itemName: string; count: number } }
  | { action: "list_tasks"; args: { filter: "pending" | "all" } }
  | { action: "create_task"; args: { title: string } }
  | { action: "complete_task"; args: { titleOrId: string } }
  | { action: "query_customer"; args: { name: string } }
  | {
      action: "query_count";
      args: { type: "customers" | "appointments"; period: "today" | "week" };
    }
  | { action: "confirm_appointment"; args: { customerName: string } };

type AdminRouteResult =
  | ({ kind: "deterministic"; scope: AdminIntentScope } & AdminDeterministicAction)
  | {
      kind: "model_with_scope";
      scope: AdminIntentScope;
      tools: AdminToolName[];
      includeSnapshot: boolean;
    }
  | { kind: "model_full"; tools: AdminToolName[]; includeSnapshot: boolean };

function normalizeMessage(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[?!.,;:]+$/g, "")
    .trim();
}

function wordCountInline(s: string): number {
  if (!s.trim()) return 0;
  return s.trim().split(/\s+/).length;
}

function containsAnyInline(h: string, ns: readonly string[]): boolean {
  return ns.some((n) => h.includes(n));
}

const AMBIGUOUS_KW = [
  "por que",
  "porque",
  "explicame",
  "explica me",
  "explain",
  "explique",
  "que opinas",
  "que pensas",
  "que piensas",
  "que te parece",
  "what do you think",
  "como funciona",
  "how does",
  "why ",
] as const;
const STOCK_KW = [
  "stock",
  "inventario",
  "queda",
  "quedan",
  "desinfectante",
  "shampoo",
  "tinta",
  "cera",
  "alcohol",
  "producto",
  "productos",
] as const;
const TASK_KW = [
  "tarea",
  "tareas",
  "todo",
  "todos los pendiente",
  "pendiente",
  "pendientes",
  "checklist",
] as const;
const CUSTOMER_KW = [
  "cliente",
  "clientes",
  "customer",
  "customers",
  "cita",
  "citas",
  "turno",
  "turnos",
  "appointment",
  "appointments",
  "agenda",
  "agendar",
  "reserva",
  "reservas",
] as const;
const SNAPSHOT_KW = [
  "resumen",
  "panorama",
  "como va",
  "como vamos",
  "como va el dia",
  "como va la semana",
  "summary",
  "overview",
  "dame un resumen",
  "agenda de hoy",
  "que tengo hoy",
  "que hay hoy",
  "el dia de hoy",
] as const;

function detectScopeInline(n: string): AdminIntentScope {
  if (containsAnyInline(n, STOCK_KW)) return "stock";
  if (containsAnyInline(n, TASK_KW)) return "tasks";
  if (containsAnyInline(n, CUSTOMER_KW)) return "customers";
  return "general";
}
function wantsSnapshotInline(n: string): boolean {
  return containsAnyInline(n, SNAPSHOT_KW);
}

const stripPunctInline = (s: string) =>
  s.replace(/[.?!,;:¡¿"']+/g, " ").replace(/\s+/g, " ").trim();
const cleanItemInline = (raw: string): string => {
  let s = stripPunctInline(raw);
  s = s.replace(/^(?:de|del|la|el|los|las)\s+/, "");
  return s.trim();
};

type AdminMatcherInline = {
  scope: AdminIntentScope;
  test(n: string): AdminDeterministicAction | null;
};

const ADMIN_MATCHERS_INLINE: AdminMatcherInline[] = [
  {
    scope: "stock",
    test(n) {
      const m = n.match(
        /^(?:cuanto|cuanta)s?\s+(.+?)\s+(?:me\s+)?(?:queda|quedan|tengo|hay)\b\??$/,
      );
      if (!m) return null;
      const itemName = cleanItemInline(m[1]);
      if (itemName.length < 2) return null;
      return { action: "query_stock", args: { itemName } };
    },
  },
  {
    scope: "stock",
    test(n) {
      const m = n.match(/^me\s+quedan?\s+(\d+)\s+(.+?)\.?$/);
      if (!m) return null;
      const count = Number(m[1]);
      const itemName = cleanItemInline(m[2]);
      if (!Number.isFinite(count) || itemName.length < 2) return null;
      return { action: "set_stock", args: { itemName, count } };
    },
  },
  {
    scope: "stock",
    test(n) {
      const m = n.match(
        /^(?:use|usamos|usaste|consumi|consumimos|consumiste|gaste|gastamos|gastaste|usar)\s+(\d+)\s+(.+?)\.?$/,
      );
      if (!m) return null;
      const count = Number(m[1]);
      const itemName = cleanItemInline(m[2]);
      if (!Number.isFinite(count) || itemName.length < 2) return null;
      return { action: "consume_stock", args: { itemName, count } };
    },
  },
  {
    scope: "stock",
    test(n) {
      const m = n.match(
        /^(?:recibi|recibimos|compre|compramos|llegaron|llego|sumar|sumamos|sume|agregue|agregar|agrega)\s+(\d+)\s+(.+?)\.?$/,
      );
      if (!m) return null;
      const count = Number(m[1]);
      const itemName = cleanItemInline(m[2]);
      if (!Number.isFinite(count) || itemName.length < 2) return null;
      return { action: "add_stock", args: { itemName, count } };
    },
  },
  {
    scope: "stock",
    test(n) {
      const m = n.match(
        /^(?:agrega(?:r)?|suma(?:r)?)\s+(\d+)\s+(.+?)\s+al\s+(?:stock|inventario)\.?$/,
      );
      if (!m) return null;
      const count = Number(m[1]);
      const itemName = cleanItemInline(m[2]);
      if (!Number.isFinite(count) || itemName.length < 2) return null;
      return { action: "add_stock", args: { itemName, count } };
    },
  },
  {
    scope: "tasks",
    test(n) {
      if (
        /^(?:pendientes|tareas\s+pendientes|que\s+tengo\s+pendiente|que\s+tengo\s+que\s+hacer|que\s+hay\s+pendiente|pendings?)\??$/.test(
          n,
        )
      ) {
        return { action: "list_tasks", args: { filter: "pending" } };
      }
      return null;
    },
  },
  {
    scope: "tasks",
    test(n) {
      const m = n.match(/^agrega(?:r)?\s+(?:una?\s+)?(?:tarea|todo)[\s:\-]+(.+)$/);
      if (!m) return null;
      const title = stripPunctInline(m[1]);
      if (title.length < 2) return null;
      return { action: "create_task", args: { title } };
    },
  },
  {
    scope: "tasks",
    test(n) {
      const m = n.match(
        /^marca(?:r)?\s+(?:como\s+)?(?:completad[oa]|terminad[oa]|hecha?|done)\s+(.+)$/,
      );
      if (!m) return null;
      const titleOrId = stripPunctInline(m[1]);
      if (titleOrId.length < 2) return null;
      return { action: "complete_task", args: { titleOrId } };
    },
  },
  {
    scope: "customers",
    test(n) {
      const m = n.match(/^(?:cuando\s+fue\s+)?(?:la\s+)?ultima\s+cita\s+de\s+(.+?)\??$/);
      if (!m) return null;
      const name = stripPunctInline(m[1]);
      if (name.length < 2) return null;
      return { action: "query_customer", args: { name } };
    },
  },
  {
    scope: "customers",
    test(n) {
      const m = n.match(
        /^cuant[oa]s?\s+(clientes?|citas?|appointments?|turnos?)\s+(hoy|esta\s+semana|este\s+mes|tengo|tenemos)\??$/,
      );
      if (!m) return null;
      const noun = m[1];
      const period = /hoy|tengo|tenemos/.test(m[2]) ? "today" : "week";
      const type =
        noun.startsWith("client") || noun.startsWith("customer")
          ? "customers"
          : "appointments";
      return { action: "query_count", args: { type, period } };
    },
  },
  {
    scope: "customers",
    test(n) {
      const m = n.match(
        /^confirma(?:r)?\s+(?:la\s+cita\s+de\s+|el\s+turno\s+de\s+|a\s+|de\s+)?(.+?)\.?$/,
      );
      if (!m) return null;
      const customerName = stripPunctInline(m[1]);
      if (customerName.length < 2 || !/[a-z]/.test(customerName)) return null;
      if (/^(?:si|no|ok|esta|estan|todos|todas)$/.test(customerName)) return null;
      return { action: "confirm_appointment", args: { customerName } };
    },
  },
];

function routeAdminIntentInline(userMessage: string): AdminRouteResult {
  if (typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return { kind: "model_full", tools: [...ALL_ADMIN_TOOLS_INLINE], includeSnapshot: false };
  }
  const n = normalizeMessage(userMessage);
  const wc = wordCountInline(n);
  if (wc < 3) {
    return {
      kind: "model_full",
      tools: [...ALL_ADMIN_TOOLS_INLINE],
      includeSnapshot: wantsSnapshotInline(n),
    };
  }
  if (containsAnyInline(n, AMBIGUOUS_KW)) {
    return {
      kind: "model_full",
      tools: [...ALL_ADMIN_TOOLS_INLINE],
      includeSnapshot: wantsSnapshotInline(n),
    };
  }
  const hits: Array<{ matcher: AdminMatcherInline; result: AdminDeterministicAction }> = [];
  for (const m of ADMIN_MATCHERS_INLINE) {
    const r = m.test(n);
    if (r) hits.push({ matcher: m, result: r });
  }
  const chained =
    /\s+y\s+(?:luego\s+|despues\s+|tambien\s+)?(?:agrega|marca|confirma|completa|completar|cancela|cancelar|registra|consume|consumi|consumir|usa|use|gasta|gaste|set|actualiza)/.test(
      n,
    );
  if (hits.length > 1 || (hits.length >= 1 && chained)) {
    return {
      kind: "model_full",
      tools: [...ALL_ADMIN_TOOLS_INLINE],
      includeSnapshot: wantsSnapshotInline(n),
    };
  }
  if (hits.length === 1) {
    const only = hits[0];
    return { kind: "deterministic", scope: only.matcher.scope, ...only.result } as AdminRouteResult;
  }
  const wantsSnap = wantsSnapshotInline(n);
  if (wantsSnap) {
    return {
      kind: "model_with_scope",
      scope: "general",
      tools: SCOPE_TOOLS_INLINE.general,
      includeSnapshot: true,
    };
  }
  const scope = detectScopeInline(n);
  if (scope === "general") {
    return { kind: "model_full", tools: [...ALL_ADMIN_TOOLS_INLINE], includeSnapshot: false };
  }
  return {
    kind: "model_with_scope",
    scope,
    tools: SCOPE_TOOLS_INLINE[scope],
    includeSnapshot: false,
  };
}

// Stock + tasks actions removed in Bloques I/J — real executors below.
const STUB_ACTIONS_INLINE = new Set([
  "set_stock",
  "query_customer",
  "query_count",
  "confirm_appointment",
]);
function isStubActionInline(name: string): boolean {
  return STUB_ACTIONS_INLINE.has(name);
}
function stubActionMessageInline(action: string, lang?: string): string {
  const stockGroup = action === "query_stock" || action === "set_stock" || action === "consume_stock";
  const taskGroup = action === "list_tasks" || action === "create_task" || action === "complete_task";
  const customerGroup =
    action === "query_customer" || action === "query_count" || action === "confirm_appointment";
  const subject = stockGroup
    ? lang === "he" ? "ניהול מלאי" : lang === "ru" ? "учёт запасов" : "Stock management"
    : taskGroup
      ? lang === "he" ? "ניהול משימות" : lang === "ru" ? "управление задачами" : "Task tracking"
      : customerGroup
        ? lang === "he" ? "שאילתת לקוחות" : lang === "ru" ? "запрос клиентов" : "Customer lookup"
        : action;
  switch (lang) {
    case "he":
      return `${subject} עדיין לא זמין דרך הצ'אט. אני זיהיתי את הבקשה — היכולת תושק בקרוב.`;
    case "ru":
      return `${subject} пока недоступно через чат. Я распознал запрос — функция скоро появится.`;
    default:
      return `${subject} isn't wired through chat yet — I recognised the request, but the feature ships in an upcoming block.`;
  }
}

// ── Public router (inline) ───────────────────────────────────────────────────

type PublicChatCtxInline = {
  hours?: Record<string, unknown>;
  contact?: { phone?: string; email?: string; address?: string };
  services?: Array<{ name?: string; price?: string; duration?: string }>;
  uiLanguage?: string;
};
type PublicRouteResultInline =
  | { kind: "deterministic"; scope: string; response: string }
  | { kind: "model_full" };

const PUB_HOURS_KW = [
  "horario",
  "horarios",
  "abierto",
  "abren",
  "cuando abren",
  "cuando cierran",
  "open",
  "hours",
  "schedule",
  "que hora abren",
  "estan abiertos",
] as const;
const PUB_LOC_KW = [
  "ubicacion",
  "ubicados",
  "direccion",
  "donde estan",
  "donde queda",
  "donde se encuentran",
  "address",
  "location",
  "where are",
  "como llego",
] as const;
const PUB_PRICE_KW = ["precio", "precios", "cuanto vale", "cuanto cuesta", "cost", "price"] as const;
const PUB_BOOK_KW = [
  "reservar",
  "reservar turno",
  "agendar",
  "agendar cita",
  "sacar turno",
  "sacar cita",
  "book",
  "booking",
  "appointment",
  "schedule appointment",
  "quiero reservar",
  "quiero un turno",
] as const;

function bookingRedirectText(lang?: string): string {
  switch (lang) {
    case "he":
      return 'כדי להזמין תור לחצו על כפתור "Book" בראש האתר. מערכת ההזמנות תלווה אתכם בבחירת שירות, איש צוות, יום ושעה.';
    case "ru":
      return 'Чтобы записаться на приём, нажмите кнопку "Book" в верхней части сайта. Система проведёт вас через выбор услуги, мастера, даты и времени.';
    default:
      return 'To book, click the "Book" button at the top of the site. The booking system will walk you through picking a service, choosing a staff member, and selecting a date and time.';
  }
}
function hoursTextInline(hours: PublicChatCtxInline["hours"], lang?: string): string | null {
  if (!hours || typeof hours !== "object") return null;
  const lines: string[] = [];
  for (const [day, raw] of Object.entries(hours)) {
    if (!raw || typeof raw !== "object") continue;
    const slot = raw as { open?: string; close?: string; closed?: boolean };
    const label = slot.closed
      ? `${day}: ${lang === "he" ? "סגור" : lang === "ru" ? "закрыто" : "closed"}`
      : `${day}: ${slot.open ?? "?"} – ${slot.close ?? "?"}`;
    lines.push(`• ${label}`);
  }
  if (lines.length === 0) return null;
  const header =
    lang === "he" ? "שעות הפעילות שלנו:" : lang === "ru" ? "Наши часы работы:" : "Our business hours:";
  return `${header}\n${lines.join("\n")}`;
}
function locationTextInline(contact: PublicChatCtxInline["contact"], lang?: string): string | null {
  if (!contact || typeof contact !== "object") return null;
  const a = typeof contact.address === "string" ? contact.address.trim() : "";
  if (!a) return null;
  const h = lang === "he" ? "הכתובת שלנו:" : lang === "ru" ? "Наш адрес:" : "Our address:";
  return `${h} ${a}`;
}
function priceTextInline(
  services: PublicChatCtxInline["services"],
  q: string,
  lang?: string,
): string | null {
  if (!Array.isArray(services) || services.length === 0) return null;
  const cleaned = cleanItemInline(q);
  const direct = services.find((s) => s?.name && normalizeMessage(s.name) === cleaned);
  const match =
    direct ||
    (cleaned.length >= 3
      ? services.find((s) => s?.name && normalizeMessage(s.name).includes(cleaned))
      : null);
  if (!match?.name) return null;
  const name = String(match.name);
  if (!match.price) {
    return lang === "he"
      ? `המחיר של ${name} זמין במערכת ההזמנה — לחצו על Book לפרטים.`
      : lang === "ru"
        ? `Цена на «${name}» доступна в системе бронирования — нажмите Book.`
        : `The price for ${name} is shown in the booking system — click Book to see details.`;
  }
  const lead =
    lang === "he"
      ? `המחיר של ${name}: ${match.price}`
      : lang === "ru"
        ? `Цена на «${name}»: ${match.price}`
        : `${name}: ${match.price}`;
  return match.duration ? `${lead} (${match.duration})` : lead;
}
function routePublicIntentInline(
  userMessage: string,
  ctx: PublicChatCtxInline = {},
): PublicRouteResultInline {
  if (typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return { kind: "model_full" };
  }
  const n = normalizeMessage(userMessage);
  if (containsAnyInline(n, PUB_BOOK_KW)) {
    return { kind: "deterministic", scope: "booking", response: bookingRedirectText(ctx.uiLanguage) };
  }
  if (containsAnyInline(n, PUB_HOURS_KW)) {
    const t = hoursTextInline(ctx.hours, ctx.uiLanguage);
    if (t) return { kind: "deterministic", scope: "hours", response: t };
  }
  if (containsAnyInline(n, PUB_LOC_KW)) {
    const t = locationTextInline(ctx.contact, ctx.uiLanguage);
    if (t) return { kind: "deterministic", scope: "location", response: t };
  }
  if (containsAnyInline(n, PUB_PRICE_KW)) {
    let q = n;
    for (const kw of PUB_PRICE_KW) q = q.replace(kw, "");
    q = q.trim();
    const t = priceTextInline(ctx.services, q, ctx.uiLanguage);
    if (t) return { kind: "deterministic", scope: "service_price", response: t };
  }
  return { kind: "model_full" };
}

// ── get_crm_snapshot declaration (inline) ────────────────────────────────────

const GET_CRM_SNAPSHOT_DECLARATION_INLINE: GeminiFunctionDeclaration = {
  name: "get_crm_snapshot",
  description:
    "Fetch a structured snapshot of the current CRM state — KPIs, today's appointments, upcoming appointments, top customers and recent inbox messages. Call ONLY when the admin asks for an overview, summary, agenda of the day, or a question that genuinely requires aggregated data. Do not call for narrow questions that can be answered from prior conversation.",
  parameters: { type: "OBJECT", properties: {} },
};

const SCOPE_HEADERS_INLINE: Record<AdminIntentScope, string> = {
  stock: "STOCK SCOPE — the admin is asking about inventory. You have access to:",
  tasks: "TASKS SCOPE — the admin is asking about tasks/todos. You have access to:",
  customers: "CUSTOMERS SCOPE — the admin is asking about customers or appointments. You have access to:",
  general: "FULL SCOPE — the admin's query is open-ended. You have access to:",
};

const TOOL_LINES_INLINE: Record<AdminToolName, string> = {
  walk_in: "- walk_in: register a walk-in customer + completed appointment for today.",
  support_request: "- support_request: forward a website-change request to Liam (developer).",
  book_appointment: "- book_appointment: create a future appointment for a customer.",
  update_appointment:
    "- update_appointment: change status / time / staff of an existing appointment (use the id from the (id:xxx) tag).",
  mark_paid:
    "- mark_paid: mark an appointment as paid (amount IN CENTS — multiply by 100 if the admin says dollars or shekels).",
  update_customer: "- update_customer: append a note, add tags, or change source for a customer.",
  add_walkin_count: "- add_walkin_count: anonymous walk-in counter — use only when no name was given.",
  bulk_update_status: "- bulk_update_status: set status on many appointments at once (capped at 100).",
  get_crm_snapshot:
    "- get_crm_snapshot: fetch KPIs + today/upcoming appointments + recent customers when you need aggregated data.",
  query_stock:
    "- query_stock: look up how much of an item is in stock by name (fuzzy) or id.",
  consume_stock:
    "- consume_stock: deduct N units of an item when the admin says they used / consumed / spent something.",
  add_stock:
    "- add_stock: add N units (or create a new item) when the admin received / bought / restocked something. Pass createIfMissing=true ONLY after the admin confirms creating a brand-new item.",
  create_task:
    "- create_task: add a new todo / pending item. Default shared=false (private). dueDate accepts 'tomorrow' / 'mañana' / ISO.",
  list_tasks:
    "- list_tasks: list the admin's visible tasks (default status=open). Filter by priority / assignedTo / limit.",
  complete_task:
    "- complete_task: mark a task done by id OR title fragment. If ambiguous you'll get candidates back — ask which one.",
};

function buildScopedToolsFragmentInline(
  scope: AdminIntentScope,
  toolNames: readonly AdminToolName[],
): string {
  const lines = toolNames.filter((n) => TOOL_LINES_INLINE[n]).map((n) => TOOL_LINES_INLINE[n]);
  return `${SCOPE_HEADERS_INLINE[scope]}
${lines.join("\n")}

RULES:
- Ask for any missing REQUIRED field in natural language — NEVER invent values.
- Use IDs only from the (id:xxx) tags in the live data; never fabricate them.
- Money in mark_paid is in CENTS (multiply by 100).
- One tool call per turn. After the result comes back, write a short confirmation in the admin's language.`;
}

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

// Gemini function-call declarations for the 3 tasks tools — used by the inline
// declsByName lookup so the model is allowed to call them.
const TASKS_TOOL_DECLARATIONS_INLINE: GeminiFunctionDeclaration[] = [
  {
    name: "create_task",
    description:
      "Create a new task / todo for the admin. dueDate accepts a relative phrase ('tomorrow', 'mañana', 'next week') or ISO date. Default shared=false (private).",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Short, imperative task title." },
        description: { type: "STRING" },
        priority: { type: "STRING", enum: ["high", "medium", "low"] },
        dueDate: { type: "STRING" },
        assignedTo: { type: "STRING" },
        shared: { type: "BOOLEAN" },
        relatedCustomerId: { type: "STRING" },
        tags: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description:
      "List visible tasks. Default status=open (pending+in_progress). Filter by priority / assignedTo / limit.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", enum: ["pending", "in_progress", "done", "archived", "open"] },
        priority: { type: "STRING", enum: ["high", "medium", "low"] },
        assignedTo: { type: "STRING" },
        limit: { type: "INTEGER" },
      },
    },
  },
  {
    name: "complete_task",
    description:
      "Mark a task done by id OR title fragment. Ambiguous fragments come back with candidates — ask the admin which one.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskId: { type: "STRING" },
        titleOrFragment: { type: "STRING" },
      },
    },
  },
];

for (const decl of TASKS_TOOL_DECLARATIONS_INLINE) ADMIN_TOOL_DECLARATIONS.push(decl);

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

type ValidationError = { field?: string; message: string };
class AdminToolValidationError extends Error {
  errors: ValidationError[];
  constructor(errors: ValidationError[]) {
    super(errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join("; "));
    this.errors = errors;
    this.name = "AdminToolValidationError";
  }
}
class AdminActionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AdminActionError";
  }
}

function validateValueAdmin(value: unknown, schema: GeminiSchema, path: string, errors: ValidationError[]): void {
  if (value === undefined || value === null) return;
  switch (schema.type) {
    case "STRING": if (typeof value !== "string") errors.push({ field: path, message: "must be a string" }); break;
    case "INTEGER": if (typeof value !== "number" || !Number.isInteger(value)) errors.push({ field: path, message: "must be an integer" }); break;
    case "NUMBER": if (typeof value !== "number" || Number.isNaN(value)) errors.push({ field: path, message: "must be a number" }); break;
    case "BOOLEAN": if (typeof value !== "boolean") errors.push({ field: path, message: "must be a boolean" }); break;
    case "ARRAY":
      if (!Array.isArray(value)) errors.push({ field: path, message: "must be an array" });
      else if (schema.items) value.forEach((v, i) => validateValueAdmin(v, schema.items!, `${path}[${i}]`, errors));
      break;
    case "OBJECT":
      if (typeof value !== "object" || Array.isArray(value)) {
        errors.push({ field: path, message: "must be an object" });
      } else if (schema.properties) {
        const obj = value as Record<string, unknown>;
        for (const [k, sub] of Object.entries(schema.properties)) validateValueAdmin(obj[k], sub, `${path}.${k}`, errors);
      }
      break;
  }
  if (schema.enum && value !== undefined && !schema.enum.includes(String(value))) {
    errors.push({ field: path, message: `must be one of: ${schema.enum.join(", ")}` });
  }
}

function validateAdminActionArgs(toolName: string, raw: unknown): Record<string, unknown> {
  const decl = ADMIN_TOOL_DECLARATIONS.find((d) => d.name === toolName);
  if (!decl) throw new AdminToolValidationError([{ message: `unknown tool: ${toolName}` }]);
  if (raw === null || raw === undefined) raw = {};
  if (typeof raw !== "object" || Array.isArray(raw)) throw new AdminToolValidationError([{ message: "args must be an object" }]);
  const args = raw as Record<string, unknown>;
  const params = decl.parameters;
  if (!params) return args;
  const errors: ValidationError[] = [];
  for (const req of params.required ?? []) {
    const v = args[req];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      errors.push({ field: req, message: "is required" });
    }
  }
  if (params.properties) {
    for (const [k, sub] of Object.entries(params.properties)) validateValueAdmin(args[k], sub, k, errors);
  }
  if (errors.length > 0) throw new AdminToolValidationError(errors);
  return args;
}

const ADMIN_KNOWN_ACTIONS = new Set([
  "walk_in", "support_request", "book_appointment", "update_appointment",
  "mark_paid", "update_customer", "add_walkin_count", "bulk_update_status",
  // Bloque I — stock tools dispatched via the inline executor below.
  "query_stock", "consume_stock", "add_stock",
  // Bloque J — tasks tools dispatched via the inline executor below.
  "create_task", "list_tasks", "complete_task",
]);
const isKnownAdminAction = (name: string) => ADMIN_KNOWN_ACTIONS.has(name);

const ALLOWED_APPT_UPDATE_FIELDS_API = ["status", "time", "date", "serviceId", "staffId", "duration", "notes"] as const;
const TERMINAL_STATUSES_API = new Set(["confirmed", "completed", "cancelled"]);
const ADMIN_BULK_CAP = 100;
const adminSimpleHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};
const adminTodayISO = () => new Date().toISOString().slice(0, 10);

type TasksActionResultInline =
  | { success: true; kind: "created"; task: TaskInline }
  | { success: true; kind: "list"; tasks: TaskInline[]; total: number }
  | { success: true; kind: "completed"; task: TaskInline }
  | { success: false; kind: "ambiguous"; candidates: { id: string; title: string; status: TaskStatusInline }[] }
  | { success: false; kind: "not_found"; query: string };

type TasksCtxInline = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FieldValue: any;
  clientId: string;
  actorEmail?: string;
  actorRole?: AdminRole;
  demoMode?: boolean;
};

function isTasksActionInline(name: string): name is "create_task" | "list_tasks" | "complete_task" {
  return name === "create_task" || name === "list_tasks" || name === "complete_task";
}

function requireTaskCallerInline(ctx: TasksCtxInline): { email: string; role: AdminRole } {
  const email = ctx.actorEmail?.trim().toLowerCase();
  if (!email) throw new AdminActionError(401, "missing caller email for tasks action");
  return { email, role: ctx.actorRole ?? "staff" };
}

function demoTaskInline(partial: Partial<TaskInline>): TaskInline {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? `demo-task-${Date.now()}`,
    clientId: partial.clientId ?? "demo",
    title: partial.title ?? "Demo task",
    status: partial.status ?? "pending",
    priority: partial.priority ?? "medium",
    shared: partial.shared ?? false,
    createdBy: partial.createdBy ?? "demo@example.com",
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    ...partial,
  };
}

async function listVisibleTasksInline(
  ctx: TasksCtxInline,
  caller: { email: string; role: AdminRole },
  filters: { status?: TaskStatusInline | "open"; priority?: TaskPriorityInline; assignedTo?: string; limit?: number } = {},
): Promise<TaskInline[]> {
  const snap = await ctx.db.collection("tasks").where("clientId", "==", ctx.clientId).get();
  const all: TaskInline[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snap.forEach((doc: any) => all.push(serializeTaskDocInline(doc.id, doc.data() ?? {})));
  let tasks = all.filter((t) => canSeeTaskInline(t, caller));
  if (filters.status === "open") {
    tasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  } else if (filters.status) {
    tasks = tasks.filter((t) => t.status === filters.status);
  }
  if (filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority);
  if (filters.assignedTo) tasks = tasks.filter((t) => t.assignedTo === filters.assignedTo);
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
  return filters.limit && filters.limit > 0 ? tasks.slice(0, filters.limit) : tasks;
}

async function updateTaskDoneInline(
  ctx: TasksCtxInline,
  task: TaskInline,
  caller: { email: string; role: AdminRole },
): Promise<TaskInline> {
  const perm = canEditTaskInline(task, caller);
  if (perm === "none") throw new AdminActionError(403, "Forbidden");
  const ref = ctx.db.collection("tasks").doc(task.id);
  await ref.update({
    status: "done",
    completedAt: ctx.FieldValue.serverTimestamp(),
    updatedAt: ctx.FieldValue.serverTimestamp(),
  });
  const after = await ref.get();
  return serializeTaskDocInline(task.id, after.data() ?? {});
}

async function dispatchTasksActionInline(
  ctx: TasksCtxInline,
  toolName: "create_task" | "list_tasks" | "complete_task",
  args: Record<string, unknown>,
): Promise<TasksActionResultInline> {
  try {
    const caller = requireTaskCallerInline(ctx);
    if (ctx.demoMode) {
      if (toolName === "list_tasks") {
        const tasks = [
          demoTaskInline({ id: "demo-task-1", title: "Call back VIP client", priority: "high", shared: true }),
          demoTaskInline({ id: "demo-task-2", title: "Check towel stock", priority: "medium" }),
        ];
        return { success: true, kind: "list", tasks, total: tasks.length };
      }
      const title =
        typeof args.title === "string" && args.title.trim()
          ? args.title.trim()
          : typeof args.titleOrFragment === "string" && args.titleOrFragment.trim()
            ? args.titleOrFragment.trim()
            : "Demo task";
      const task = demoTaskInline({ title, createdBy: caller.email });
      return toolName === "complete_task"
        ? { success: true, kind: "completed", task: { ...task, status: "done" } }
        : { success: true, kind: "created", task };
    }

    if (toolName === "create_task") {
      const input = validateCreateInputInline(args);
      const payload: Record<string, unknown> = {
        clientId: ctx.clientId,
        title: input.title,
        description: input.description,
        status: "pending",
        priority: input.priority ?? "medium",
        assignedTo: input.assignedTo,
        createdBy: caller.email,
        createdAt: ctx.FieldValue.serverTimestamp(),
        updatedAt: ctx.FieldValue.serverTimestamp(),
        shared: input.shared ?? false,
        tags: input.tags,
        relatedCustomerId: input.relatedCustomerId,
        notes: input.notes,
      };
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k];
      }
      if (input.dueDate) payload.dueDate = new Date(input.dueDate);
      const ref = await ctx.db.collection("tasks").add(payload);
      const after = await ref.get();
      return { success: true, kind: "created", task: serializeTaskDocInline(ref.id, after.data() ?? {}) };
    }

    if (toolName === "list_tasks") {
      const status =
        args.status === "open" || isTaskStatusInline(args.status) ? (args.status as TaskStatusInline | "open") : "open";
      const priority = isTaskPriorityInline(args.priority) ? args.priority : undefined;
      const assignedTo = typeof args.assignedTo === "string" && args.assignedTo.trim()
        ? args.assignedTo.trim().toLowerCase()
        : undefined;
      const rawLimit = typeof args.limit === "number" ? Math.trunc(args.limit) : 10;
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 10;
      const tasks = await listVisibleTasksInline(ctx, caller, { status, priority, assignedTo, limit });
      return { success: true, kind: "list", tasks, total: tasks.length };
    }

    const taskId = typeof args.taskId === "string" && args.taskId.trim() ? args.taskId.trim() : undefined;
    const titleOrFragment =
      typeof args.titleOrFragment === "string" && args.titleOrFragment.trim()
        ? args.titleOrFragment.trim()
        : undefined;
    if (taskId) {
      const ref = ctx.db.collection("tasks").doc(taskId);
      const snap = await ref.get();
      if (!snap.exists) return { success: false, kind: "not_found", query: taskId };
      const data = snap.data() ?? {};
      if (data.clientId !== ctx.clientId) throw new AdminActionError(403, "Forbidden");
      const task = serializeTaskDocInline(taskId, data);
      const updated = await updateTaskDoneInline(ctx, task, caller);
      return { success: true, kind: "completed", task: updated };
    }
    if (!titleOrFragment) return { success: false, kind: "not_found", query: "" };
    const open = await listVisibleTasksInline(ctx, caller, { status: "open" });
    const match = fuzzyFindTaskInline(titleOrFragment, open);
    if (match.kind === "none") return { success: false, kind: "not_found", query: titleOrFragment };
    if (match.kind === "ambiguous") {
      return {
        success: false,
        kind: "ambiguous",
        candidates: match.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
      };
    }
    const updated = await updateTaskDoneInline(ctx, match.task, caller);
    return { success: true, kind: "completed", task: updated };
  } catch (err) {
    if (err instanceof TaskValidationErrorInline) {
      throw new AdminActionError(err.status, err.message);
    }
    throw err;
  }
}

function relativeDateLabelInline(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff > 1 && diff < 14) return `in ${diff} days`;
  return d.toISOString().slice(0, 10);
}

function formatTasksResultInline(result: TasksActionResultInline): string {
  if (result.success === false) {
    if (result.kind === "ambiguous") {
      const lines = result.candidates.map((c) => `• ${c.title} (${c.id})`).join("\n");
      return `I found a few matches - which one?\n${lines}`;
    }
    return `No task found by that name ("${result.query}").`;
  }
  if (result.kind === "created") {
    const due = relativeDateLabelInline(result.task.dueDate);
    return due ? `✓ Task created: ${result.task.title} (${due}).` : `✓ Task created: ${result.task.title}.`;
  }
  if (result.kind === "completed") return `✓ Marked as done: ${result.task.title}.`;
  if (result.tasks.length === 0) return "No tasks to show";
  return result.tasks
    .map((task) => {
      const due = relativeDateLabelInline(task.dueDate);
      const dueText = due ? ` · ${due}` : "";
      return `• ${task.title}${dueText} [${task.priority}]`;
    })
    .join("\n");
}

async function dispatchAdminAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: { db: any; FieldValue: any; clientId: string; actorEmail?: string; actorRole?: AdminRole; demoMode?: boolean; niche?: string },
  toolName: string,
  rawArgs: unknown,
): Promise<{ success: boolean; [k: string]: unknown }> {
  if (!isKnownAdminAction(toolName)) {
    throw new AdminToolValidationError([{ message: `unknown tool: ${toolName}` }]);
  }
  const args = validateAdminActionArgs(toolName, rawArgs);
  const { db, FieldValue, clientId } = ctx;

  if (toolName === "walk_in") {
    const name = String(args.name).trim();
    const phone = String(args.phone).trim();
    const serviceId = typeof args.serviceId === "string" ? args.serviceId : "";
    const staffId = typeof args.staffId === "string" ? args.staffId : "";
    const duration = Number(args.duration) || 30;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);
    const email = `walkin_${Date.now()}@noemail.local`;
    const custDocId = `${clientId}_${adminSimpleHash(email)}`;
    await db.collection("customers").doc(custDocId).set({
      clientId, fullName: name, email, phone, source: "manual",
      visitCount: FieldValue.increment(1),
      lastVisitAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    const apptRef = db.collection("appointments").doc();
    await apptRef.set({
      clientId, customerName: name, customerEmail: email, customerPhone: phone,
      serviceId, staffId, date: dateStr, time: timeStr, duration,
      status: "completed", type: "appointment",
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, appointmentId: apptRef.id, customerId: custDocId };
  }

  if (toolName === "support_request") {
    const message = String(args.message).trim();
    const ref = db.collection("provider_messages").doc();
    await ref.set({
      clientId, businessName: clientId, message,
      sender: "client", status: "new", category: "maintenance",
      categoryReason: "Sent via AI chat assistant",
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true, messageId: ref.id };
  }

  if (toolName === "book_appointment") {
    const customerName = String(args.customerName).trim();
    const customerEmail = String(args.customerEmail ?? "").trim().toLowerCase();
    const customerPhone = String(args.customerPhone ?? "").trim();
    const date = String(args.date);
    const time = String(args.time);
    const serviceId = String(args.serviceId ?? "");
    const staffId = String(args.staffId ?? "");
    const duration = Number(args.duration) || 30;
    const bufferMinutes = 10;
    const manifestId = `${clientId}_${staffId}_${date}`;
    const manifestRef = db.collection("daily_manifests").doc(manifestId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appointmentId = await db.runTransaction(async (transaction: any) => {
      const manifestSnap = await transaction.get(manifestRef);
      const intervals: { start: string; end: string }[] = manifestSnap.exists ? (manifestSnap.data()?.intervals ?? []) : [];
      const [startH, startM] = time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = startMinutes + duration + bufferMinutes;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      for (const inv of intervals) {
        const [iSH, iSM] = inv.start.split(":").map(Number);
        const [iEH, iEM] = inv.end.split(":").map(Number);
        if (startMinutes < iEH * 60 + iEM && endMinutes > iSH * 60 + iSM) {
          throw new AdminActionError(409, "CONFLICT: This time slot is no longer available.");
        }
      }
      const apptRef = db.collection("appointments").doc();
      transaction.set(apptRef, {
        clientId, customerName, customerEmail, customerPhone,
        serviceId, staffId, date, time, duration, manifestEnd: endTime,
        status: "confirmed", type: "appointment",
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(manifestRef, {
        clientId, intervals: [...intervals, { start: time, end: endTime }],
      });
      return apptRef.id;
    });
    const email = customerEmail || `booking_${Date.now()}@noemail.local`;
    const custDocId = `${clientId}_${adminSimpleHash(email)}`;
    try {
      await db.collection("customers").doc(custDocId).set({
        clientId, fullName: customerName, email, phone: customerPhone,
        source: "chat-booking",
        visitCount: FieldValue.increment(1),
        lastVisitAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch { /* non-fatal */ }
    return { success: true, appointmentId };
  }

  if (toolName === "update_appointment") {
    const appointmentId = String(args.appointmentId);
    const updates = (args.updates ?? {}) as Record<string, unknown>;
    const apptRef = db.collection("appointments").doc(appointmentId);
    const snap = await apptRef.get();
    if (!snap.exists) throw new AdminActionError(404, "Appointment not found");
    const data = snap.data();
    if (!data || data.clientId !== clientId) throw new AdminActionError(403, "Not authorized");
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if ((ALLOWED_APPT_UPDATE_FIELDS_API as readonly string[]).includes(k)) safe[k] = v;
    }
    if (typeof safe.status === "string" && !TERMINAL_STATUSES_API.has(safe.status)) {
      throw new AdminActionError(400, "status must be one of confirmed|completed|cancelled");
    }
    safe.updatedAt = FieldValue.serverTimestamp();
    await apptRef.update(safe);
    if (safe.status === "cancelled" && data.status !== "cancelled") {
      try {
        const manifestId = `${clientId}_${data.staffId ?? ""}_${data.date}`;
        const mRef = db.collection("daily_manifests").doc(manifestId);
        const mSnap = await mRef.get();
        if (mSnap.exists) {
          const intervals = ((mSnap.data()?.intervals ?? []) as { start: string; end: string }[]).filter(
            (inv) => inv.start !== data.time,
          );
          await mRef.update({ intervals });
        }
      } catch { /* non-fatal */ }
    }
    return { success: true };
  }

  if (toolName === "mark_paid") {
    const appointmentId = String(args.appointmentId);
    const amountCents = Math.trunc(Number(args.amountCents));
    if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > 100_000_000) {
      throw new AdminActionError(400, "amountCents must be a non-negative integer ≤ 100000000");
    }
    const paymentMethod = typeof args.paymentMethod === "string" ? args.paymentMethod.trim() : "";
    const ref = db.collection("appointments").doc(appointmentId);
    const snap = await ref.get();
    if (!snap.exists) throw new AdminActionError(404, "Appointment not found");
    const data = snap.data();
    if (!data || data.clientId !== clientId) throw new AdminActionError(403, "Not authorized");
    const payload: Record<string, unknown> = {
      amountPaidCents: amountCents,
      paymentStatus: "paid",
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (paymentMethod) payload.paymentMethod = paymentMethod;
    await ref.update(payload);
    return { success: true, appointmentId, amountCents };
  }

  if (toolName === "update_customer") {
    const customerId = String(args.customerId);
    const ref = db.collection("customers").doc(customerId);
    const snap = await ref.get();
    if (!snap.exists) throw new AdminActionError(404, "Customer not found");
    const data = snap.data();
    if (!data || data.clientId !== clientId) throw new AdminActionError(403, "Not authorized");
    const payload: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof args.notes === "string" && args.notes.trim()) {
      const incoming = args.notes.trim();
      const existing = typeof data.notes === "string" ? data.notes : "";
      payload.notes = existing ? `${existing}\n${incoming}` : incoming;
    }
    if (Array.isArray(args.tags) && args.tags.length > 0) {
      const tagList = (args.tags as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0);
      if (tagList.length > 0) payload.tags = FieldValue.arrayUnion(...tagList);
    }
    if (typeof args.source === "string" && args.source.trim()) payload.source = args.source.trim();
    if (Object.keys(payload).length === 1) throw new AdminActionError(400, "no fields to update");
    await ref.update(payload);
    return { success: true, customerId };
  }

  if (toolName === "add_walkin_count") {
    const count = Math.trunc(Number(args.count));
    if (!Number.isFinite(count) || count <= 0 || count > 500) {
      throw new AdminActionError(400, "count must be a positive integer ≤ 500");
    }
    const date = typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : adminTodayISO();
    const ref = db.collection("walk_in_stats").doc(`${clientId}_${date}`);
    await ref.set({
      clientId, date,
      count: FieldValue.increment(count),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true, date, added: count };
  }

  if (toolName === "bulk_update_status") {
    const status = String(args.status);
    if (!TERMINAL_STATUSES_API.has(status)) {
      throw new AdminActionError(400, "status must be one of confirmed|completed|cancelled");
    }
    const date = typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : adminTodayISO();
    let targetIds: string[];
    let docsCache: Array<{ id: string; data: Record<string, unknown> }> = [];
    if (Array.isArray(args.appointmentIds) && args.appointmentIds.length > 0) {
      targetIds = (args.appointmentIds as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0);
    } else {
      const snap = await db.collection("appointments")
        .where("clientId", "==", clientId)
        .where("date", "==", date)
        .get();
      const collected: Array<{ id: string; data: Record<string, unknown> }> = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      snap.forEach((doc: any) => collected.push({ id: doc.id, data: doc.data() }));
      docsCache = collected;
      targetIds = collected.map((d) => d.id);
    }
    if (targetIds.length === 0) {
      return { success: true, updated: 0, skipped: 0, status, date };
    }
    if (targetIds.length > ADMIN_BULK_CAP) {
      throw new AdminActionError(400, `too many appointments (${targetIds.length}); cap is ${ADMIN_BULK_CAP}`);
    }
    if (docsCache.length === 0) {
      for (const id of targetIds) {
        const docSnap = await db.collection("appointments").doc(id).get();
        if (!docSnap.exists) continue;
        docsCache.push({ id, data: docSnap.data() ?? {} });
      }
    }
    const batch = db.batch();
    let updated = 0;
    let skipped = 0;
    for (const { id, data } of docsCache) {
      if (data.clientId !== clientId) { skipped++; continue; }
      batch.update(db.collection("appointments").doc(id), {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });
      updated++;
    }
    if (updated > 0) await batch.commit();
    return { success: true, updated, skipped, status, date };
  }

  // Bloque I — stock tool dispatch (inline copy of stock-tools.ts).
  if (toolName === "query_stock" || toolName === "consume_stock" || toolName === "add_stock") {
    return dispatchStockActionInline(
      { db, FieldValue, clientId, actorEmail: ctx.actorEmail ?? "ai", demoMode: ctx.demoMode, niche: ctx.niche },
      toolName,
      args,
    );
  }

  if (isTasksActionInline(toolName)) {
    return dispatchTasksActionInline(
      {
        db,
        FieldValue,
        clientId,
        actorEmail: ctx.actorEmail,
        actorRole: ctx.actorRole,
        demoMode: ctx.demoMode,
      },
      toolName,
      args,
    );
  }

  // unreachable due to ADMIN_KNOWN_ACTIONS check above, but keep the throw
  throw new AdminActionError(400, `unhandled action: ${toolName}`);
}

// ── Bloque I — inline stock-tools (mirror of src/lib/ai/stock-tools.ts) ─────

type StockItemInline = { id: string; name: string; currentStock: number; unit: string; minStock: number };
type StockResultInline =
  | { success: true; kind: "single"; item: StockItemInline }
  | { success: true; kind: "multiple"; items: StockItemInline[]; ambiguous: true }
  | { success: false; kind: "not_found"; query: string }
  | { success: true; kind: "consumed"; item: { id: string; name: string; prevStock: number; newStock: number; unit: string }; movementId: string; wentNegative?: boolean }
  | { success: true; kind: "added"; item: { id: string; name: string; prevStock: number; newStock: number; unit: string }; movementId: string; created?: boolean }
  | { success: false; kind: "suggest_create"; itemName: string; count: number; unit?: string; minStock?: number };

type StockCtxInline = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FieldValue: any;
  clientId: string;
  actorEmail?: string;
  demoMode?: boolean;
  niche?: string;
};

function normaliseStockNameInline(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿¡?!.,;:"']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stockRowFromDocInline(id: string, data: Record<string, unknown>): StockItemInline {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    currentStock: Number(data.quantity ?? 0),
    unit: typeof data.unit === "string" ? data.unit : "unidades",
    minStock: Number(data.minStock ?? 0),
  };
}

const DEMO_STOCK_INLINE: Record<string, StockItemInline[]> = {
  barberia: [
    { id: "demo_shampoo", name: "Shampoo profesional", currentStock: 8, unit: "botellas", minStock: 3 },
    { id: "demo_cera", name: "Cera para barba", currentStock: 12, unit: "unidades", minStock: 4 },
    { id: "demo_alcohol", name: "Alcohol desinfectante 1L", currentStock: 2, unit: "litros", minStock: 3 },
    { id: "demo_toallas", name: "Toallas descartables", currentStock: 120, unit: "unidades", minStock: 50 },
    { id: "demo_tijeras", name: "Tijeras profesionales", currentStock: 4, unit: "unidades", minStock: 2 },
    { id: "demo_navaja", name: "Hojas para navaja", currentStock: 35, unit: "unidades", minStock: 20 },
  ],
  tattoo: [
    { id: "demo_tinta_negra", name: "Tinta negra Eternal", currentStock: 5, unit: "ml", minStock: 2 },
    { id: "demo_tinta_roja", name: "Tinta roja Eternal", currentStock: 3, unit: "ml", minStock: 2 },
    { id: "demo_agujas", name: "Cartuchos de agujas 1009RL", currentStock: 40, unit: "unidades", minStock: 20 },
    { id: "demo_film", name: "Film saniderm", currentStock: 1, unit: "rollos", minStock: 2 },
    { id: "demo_guantes", name: "Guantes nitrilo M", currentStock: 300, unit: "unidades", minStock: 100 },
    { id: "demo_vaselina", name: "Vaselina aposán", currentStock: 6, unit: "unidades", minStock: 3 },
  ],
  nails: [
    { id: "demo_esmalte", name: "Esmalte semipermanente nude", currentStock: 14, unit: "unidades", minStock: 5 },
    { id: "demo_top", name: "Top coat", currentStock: 3, unit: "unidades", minStock: 2 },
    { id: "demo_base", name: "Base coat", currentStock: 2, unit: "unidades", minStock: 2 },
    { id: "demo_limas", name: "Limas descartables", currentStock: 50, unit: "unidades", minStock: 20 },
    { id: "demo_acetona", name: "Acetona 500ml", currentStock: 4, unit: "botellas", minStock: 2 },
    { id: "demo_algodon", name: "Algodón", currentStock: 1, unit: "kg", minStock: 1 },
  ],
  estetica: [
    { id: "demo_cera_dep", name: "Cera depilatoria", currentStock: 6, unit: "kg", minStock: 3 },
    { id: "demo_tnt", name: "Bandas TNT", currentStock: 200, unit: "unidades", minStock: 100 },
    { id: "demo_aceite", name: "Aceite post-depilación", currentStock: 4, unit: "unidades", minStock: 2 },
    { id: "demo_guantes_e", name: "Guantes nitrilo S", currentStock: 250, unit: "unidades", minStock: 100 },
    { id: "demo_alcohol_e", name: "Alcohol etílico 1L", currentStock: 3, unit: "litros", minStock: 2 },
    { id: "demo_camillas", name: "Sábanas descartables camilla", currentStock: 80, unit: "unidades", minStock: 30 },
  ],
  cafeteria: [
    { id: "demo_cafe", name: "Café en grano premium", currentStock: 12, unit: "kg", minStock: 5 },
    { id: "demo_leche", name: "Leche entera", currentStock: 20, unit: "litros", minStock: 10 },
    { id: "demo_vasos", name: "Vasos descartables 8oz", currentStock: 250, unit: "unidades", minStock: 100 },
    { id: "demo_azucar", name: "Azúcar sobres", currentStock: 400, unit: "unidades", minStock: 200 },
    { id: "demo_servilletas", name: "Servilletas", currentStock: 80, unit: "paquetes", minStock: 30 },
    { id: "demo_chocolate", name: "Chocolate en polvo", currentStock: 2, unit: "kg", minStock: 1 },
  ],
  remodelaciones: [
    { id: "demo_pintura", name: "Pintura látex blanca", currentStock: 8, unit: "litros", minStock: 4 },
    { id: "demo_yeso", name: "Yeso bolsa 25kg", currentStock: 6, unit: "bolsas", minStock: 3 },
    { id: "demo_tornillos", name: "Tornillos drywall", currentStock: 400, unit: "unidades", minStock: 200 },
    { id: "demo_silicona", name: "Silicona neutra", currentStock: 5, unit: "unidades", minStock: 3 },
    { id: "demo_guantes_r", name: "Guantes trabajo", currentStock: 20, unit: "pares", minStock: 10 },
    { id: "demo_lija", name: "Lija grano 120", currentStock: 30, unit: "unidades", minStock: 15 },
  ],
};

function getDemoStockInline(niche?: string): StockItemInline[] {
  const key = (niche ?? "").trim().toLowerCase();
  return DEMO_STOCK_INLINE[key] ?? DEMO_STOCK_INLINE.barberia;
}

function fuzzyMatchStockInline(
  items: StockItemInline[],
  search: string,
):
  | { kind: "single"; item: StockItemInline }
  | { kind: "multiple"; items: StockItemInline[] }
  | { kind: "none" } {
  const q = normaliseStockNameInline(search);
  if (!q) return items.length === 0 ? { kind: "none" } : { kind: "multiple", items };
  const exact = items.filter((i) => normaliseStockNameInline(i.name) === q);
  if (exact.length === 1) return { kind: "single", item: exact[0] };
  if (exact.length > 1) return { kind: "multiple", items: exact };
  const contains = items.filter((i) => normaliseStockNameInline(i.name).includes(q));
  if (contains.length === 1) return { kind: "single", item: contains[0] };
  if (contains.length > 1) return { kind: "multiple", items: contains };
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const tokenHits = items.filter((i) => {
      const n = normaliseStockNameInline(i.name);
      return tokens.every((t) => n.includes(t));
    });
    if (tokenHits.length === 1) return { kind: "single", item: tokenHits[0] };
    if (tokenHits.length > 1) return { kind: "multiple", items: tokenHits };
  }
  return { kind: "none" };
}

async function findStockItemInline(
  ctx: StockCtxInline,
  args: { itemId?: unknown; itemName?: unknown },
): Promise<
  | { kind: "single"; item: StockItemInline }
  | { kind: "multiple"; items: StockItemInline[] }
  | { kind: "none" }
> {
  if (ctx.demoMode) {
    const items = getDemoStockInline(ctx.niche);
    if (typeof args.itemId === "string" && args.itemId.trim()) {
      const found = items.find((i) => i.id === args.itemId);
      return found ? { kind: "single", item: found } : { kind: "none" };
    }
    if (typeof args.itemName === "string" && args.itemName.trim()) {
      return fuzzyMatchStockInline(items, args.itemName);
    }
    return { kind: "multiple", items };
  }
  if (typeof args.itemId === "string" && args.itemId.trim()) {
    const snap = await ctx.db.collection("stock_items").doc(args.itemId.trim()).get();
    if (!snap.exists) return { kind: "none" };
    const data = snap.data() ?? {};
    if (data.clientId !== ctx.clientId) throw new AdminActionError(403, "Not authorized");
    return { kind: "single", item: stockRowFromDocInline(snap.id, data) };
  }
  const snap = await ctx.db.collection("stock_items").where("clientId", "==", ctx.clientId).get();
  const all: StockItemInline[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snap.forEach((doc: any) => all.push(stockRowFromDocInline(doc.id, doc.data() ?? {})));
  if (typeof args.itemName === "string" && args.itemName.trim()) {
    return fuzzyMatchStockInline(all, args.itemName);
  }
  return all.length === 0 ? { kind: "none" } : { kind: "multiple", items: all };
}

function validateStockCountInline(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new AdminActionError(400, "count must be a positive integer");
  }
  if (n > 100_000) throw new AdminActionError(400, "count too large (max 100000)");
  return n;
}

async function dispatchStockActionInline(
  ctx: StockCtxInline,
  toolName: string,
  args: Record<string, unknown>,
): Promise<StockResultInline> {
  if (toolName === "query_stock") {
    const match = await findStockItemInline(ctx, args);
    if (match.kind === "single") return { success: true, kind: "single", item: match.item };
    if (match.kind === "multiple") return { success: true, kind: "multiple", items: match.items, ambiguous: true };
    const q = typeof args.itemName === "string" ? args.itemName : typeof args.itemId === "string" ? args.itemId : "";
    return { success: false, kind: "not_found", query: q };
  }
  if (toolName === "consume_stock") {
    const count = validateStockCountInline(args.count);
    const reason = typeof args.reason === "string" ? args.reason.slice(0, 200) : "ai consume";
    const match = await findStockItemInline(ctx, args);
    if (match.kind === "none") {
      const q = typeof args.itemName === "string" ? args.itemName : typeof args.itemId === "string" ? args.itemId : "";
      return { success: false, kind: "not_found", query: q };
    }
    if (match.kind === "multiple") return { success: true, kind: "multiple", items: match.items, ambiguous: true };
    const item = match.item;
    if (ctx.demoMode) {
      const newStock = item.currentStock - count;
      return {
        success: true, kind: "consumed",
        item: { id: item.id, name: item.name, prevStock: item.currentStock, newStock, unit: item.unit },
        movementId: `demo_mov_${Date.now()}`, wentNegative: newStock < 0,
      };
    }
    const itemRef = ctx.db.collection("stock_items").doc(item.id);
    const movRef = ctx.db.collection("stock_movements").doc();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prevStock, newStock } = await ctx.db.runTransaction(async (tx: any) => {
      const snap = await tx.get(itemRef);
      if (!snap.exists) throw new AdminActionError(404, "Item not found");
      const data = snap.data() ?? {};
      if (data.clientId !== ctx.clientId) throw new AdminActionError(403, "Not authorized");
      const prev = Number(data.quantity ?? 0);
      const next = prev - count;
      tx.set(itemRef, { quantity: next, updatedAt: ctx.FieldValue.serverTimestamp() }, { merge: true });
      tx.set(movRef, {
        clientId: ctx.clientId,
        itemId: item.id,
        type: "deduct",
        quantity: count,
        previousQuantity: prev,
        reason,
        performedBy: ctx.actorEmail ?? "ai",
        createdAt: ctx.FieldValue.serverTimestamp(),
      });
      return { prevStock: prev, newStock: next };
    });
    return {
      success: true, kind: "consumed",
      item: { id: item.id, name: item.name, prevStock, newStock, unit: item.unit },
      movementId: movRef.id, wentNegative: newStock < 0,
    };
  }
  if (toolName === "add_stock") {
    const count = validateStockCountInline(args.count);
    const reason = typeof args.reason === "string" ? args.reason.slice(0, 200) : "ai restock";
    const createIfMissing = args.createIfMissing === true;
    const requestedName = typeof args.itemName === "string" ? args.itemName.trim() : "";
    const unit = typeof args.unit === "string" && args.unit.trim() ? args.unit.trim().slice(0, 20) : "unidades";
    const minStock = Number.isFinite(Number(args.minStock)) ? Math.max(0, Math.trunc(Number(args.minStock))) : 0;
    const match = await findStockItemInline(ctx, args);

    if (match.kind === "none") {
      if (!createIfMissing) return { success: false, kind: "suggest_create", itemName: requestedName, count, unit, minStock };
      if (!requestedName) throw new AdminActionError(400, "itemName required when creating a new item");
      if (ctx.demoMode) {
        return {
          success: true, kind: "added",
          item: { id: `demo_new_${Date.now()}`, name: requestedName, prevStock: 0, newStock: count, unit },
          movementId: `demo_mov_${Date.now()}`, created: true,
        };
      }
      const itemRef = ctx.db.collection("stock_items").doc();
      const movRef = ctx.db.collection("stock_movements").doc();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ctx.db.runTransaction(async (tx: any) => {
        tx.set(itemRef, {
          clientId: ctx.clientId, name: requestedName, category: "", quantity: count, unit, minStock, notes: "",
          createdAt: ctx.FieldValue.serverTimestamp(), updatedAt: ctx.FieldValue.serverTimestamp(),
        });
        tx.set(movRef, {
          clientId: ctx.clientId, itemId: itemRef.id, type: "add", quantity: count, previousQuantity: 0,
          reason: reason || "initial stock via AI", performedBy: ctx.actorEmail ?? "ai",
          createdAt: ctx.FieldValue.serverTimestamp(),
        });
      });
      return {
        success: true, kind: "added",
        item: { id: itemRef.id, name: requestedName, prevStock: 0, newStock: count, unit },
        movementId: movRef.id, created: true,
      };
    }
    if (match.kind === "multiple") return { success: true, kind: "multiple", items: match.items, ambiguous: true };
    const item = match.item;
    if (ctx.demoMode) {
      return {
        success: true, kind: "added",
        item: { id: item.id, name: item.name, prevStock: item.currentStock, newStock: item.currentStock + count, unit: item.unit },
        movementId: `demo_mov_${Date.now()}`,
      };
    }
    const itemRef = ctx.db.collection("stock_items").doc(item.id);
    const movRef = ctx.db.collection("stock_movements").doc();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prevStock, newStock } = await ctx.db.runTransaction(async (tx: any) => {
      const snap = await tx.get(itemRef);
      if (!snap.exists) throw new AdminActionError(404, "Item not found");
      const data = snap.data() ?? {};
      if (data.clientId !== ctx.clientId) throw new AdminActionError(403, "Not authorized");
      const prev = Number(data.quantity ?? 0);
      const next = prev + count;
      tx.set(itemRef, { quantity: next, updatedAt: ctx.FieldValue.serverTimestamp() }, { merge: true });
      tx.set(movRef, {
        clientId: ctx.clientId, itemId: item.id, type: "add", quantity: count, previousQuantity: prev,
        reason, performedBy: ctx.actorEmail ?? "ai", createdAt: ctx.FieldValue.serverTimestamp(),
      });
      return { prevStock: prev, newStock: next };
    });
    return {
      success: true, kind: "added",
      item: { id: item.id, name: item.name, prevStock, newStock, unit: item.unit },
      movementId: movRef.id,
    };
  }
  throw new AdminActionError(400, `unknown stock tool: ${toolName}`);
}

function formatStockResultInline(
  action: "query_stock" | "consume_stock" | "add_stock",
  result: StockResultInline,
  langRaw?: string,
): string {
  const lang = (() => {
    const l = (langRaw ?? "en").toLowerCase();
    if (l === "he" || l === "ru" || l === "ar") return l;
    return "en";
  })();
  const fmtItem = (i: StockItemInline) => `• ${i.name} — ${i.currentStock} ${i.unit} (id:${i.id})`;
  const T = {
    en: {
      none: (q: string) => `I couldn't find any inventory item matching "${q}".`,
      multiHeader: (n: number) => `I found ${n} matches — which one did you mean?`,
      queryOne: (i: StockItemInline) =>
        i.minStock > 0 && i.currentStock <= i.minStock
          ? `${i.name}: ${i.currentStock} ${i.unit} left — below the minimum of ${i.minStock}.`
          : `${i.name}: ${i.currentStock} ${i.unit} left.`,
      consumed: (n: string, u: string, c: number, prev: number, next: number) =>
        `Deducted ${c} ${u} of ${n}. Stock now: ${next} (was ${prev}).`,
      consumedNeg: (n: string, u: string, c: number, prev: number, next: number) =>
        `Deducted ${c} ${u} of ${n}, but stock went negative: ${next} (was ${prev}). Please restock soon.`,
      added: (n: string, u: string, c: number, prev: number, next: number) =>
        `Added ${c} ${u} of ${n}. Stock now: ${next} (was ${prev}).`,
      addedNew: (n: string, u: string, c: number) => `Created ${n} with ${c} ${u}.`,
      suggestCreate: (n: string, c: number, u: string) =>
        `I don't have "${n}" in your inventory. Should I add it with ${c} ${u}? If so, tell me the unit and minimum stock you want.`,
    },
    he: {
      none: (q: string) => `לא מצאתי פריט מלאי שתואם ל"${q}".`,
      multiHeader: (n: number) => `מצאתי ${n} פריטים — לאיזה התכוונת?`,
      queryOne: (i: StockItemInline) =>
        i.minStock > 0 && i.currentStock <= i.minStock
          ? `${i.name}: נותרו ${i.currentStock} ${i.unit} — מתחת למינימום (${i.minStock}).`
          : `${i.name}: נותרו ${i.currentStock} ${i.unit}.`,
      consumed: (n: string, u: string, c: number, prev: number, next: number) =>
        `הופחתו ${c} ${u} של ${n}. מלאי כעת: ${next} (היה ${prev}).`,
      consumedNeg: (n: string, u: string, c: number, prev: number, next: number) =>
        `הופחתו ${c} ${u} של ${n}, אך המלאי ירד מתחת לאפס: ${next} (היה ${prev}). מומלץ להזמין בקרוב.`,
      added: (n: string, u: string, c: number, prev: number, next: number) =>
        `נוספו ${c} ${u} של ${n}. מלאי כעת: ${next} (היה ${prev}).`,
      addedNew: (n: string, u: string, c: number) => `נוצר הפריט ${n} עם ${c} ${u}.`,
      suggestCreate: (n: string, c: number, u: string) =>
        `אין לי "${n}" במלאי. להוסיף עם ${c} ${u}? ספר לי גם את היחידה ואת המלאי המינימלי הרצוי.`,
    },
    ru: {
      none: (q: string) => `Не нашёл позицию инвентаря, совпадающую с «${q}».`,
      multiHeader: (n: number) => `Нашёл ${n} совпадений — какое вы имели в виду?`,
      queryOne: (i: StockItemInline) =>
        i.minStock > 0 && i.currentStock <= i.minStock
          ? `${i.name}: осталось ${i.currentStock} ${i.unit} — ниже минимума (${i.minStock}).`
          : `${i.name}: осталось ${i.currentStock} ${i.unit}.`,
      consumed: (n: string, u: string, c: number, prev: number, next: number) =>
        `Списано ${c} ${u} «${n}». Остаток: ${next} (было ${prev}).`,
      consumedNeg: (n: string, u: string, c: number, prev: number, next: number) =>
        `Списано ${c} ${u} «${n}», но остаток ушёл в минус: ${next} (было ${prev}). Срочно пополните.`,
      added: (n: string, u: string, c: number, prev: number, next: number) =>
        `Добавлено ${c} ${u} «${n}». Остаток: ${next} (было ${prev}).`,
      addedNew: (n: string, u: string, c: number) => `Создана позиция «${n}» с количеством ${c} ${u}.`,
      suggestCreate: (n: string, c: number, u: string) =>
        `У вас нет «${n}» в инвентаре. Добавить с количеством ${c} ${u}? Подскажите единицу и минимальный остаток.`,
    },
    ar: {
      none: (q: string) => `لم أعثر على عنصر مخزون يطابق "${q}".`,
      multiHeader: (n: number) => `وجدت ${n} نتائج — أيها قصدت؟`,
      queryOne: (i: StockItemInline) =>
        i.minStock > 0 && i.currentStock <= i.minStock
          ? `${i.name}: متبقي ${i.currentStock} ${i.unit} — أقل من الحد الأدنى (${i.minStock}).`
          : `${i.name}: متبقي ${i.currentStock} ${i.unit}.`,
      consumed: (n: string, u: string, c: number, prev: number, next: number) =>
        `تم خصم ${c} ${u} من ${n}. المخزون الآن: ${next} (كان ${prev}).`,
      consumedNeg: (n: string, u: string, c: number, prev: number, next: number) =>
        `تم خصم ${c} ${u} من ${n}، لكن المخزون أصبح سالباً: ${next} (كان ${prev}). يرجى التزود قريباً.`,
      added: (n: string, u: string, c: number, prev: number, next: number) =>
        `تمت إضافة ${c} ${u} إلى ${n}. المخزون الآن: ${next} (كان ${prev}).`,
      addedNew: (n: string, u: string, c: number) => `تم إنشاء العنصر ${n} بكمية ${c} ${u}.`,
      suggestCreate: (n: string, c: number, u: string) =>
        `لا يوجد "${n}" في المخزون. هل أضيفه بـ ${c} ${u}؟ أخبرني أيضاً بالوحدة والحد الأدنى المرغوب.`,
    },
  }[lang];
  void action;

  if (!result.success && result.kind === "not_found") return T.none(result.query || "?");
  if (!result.success && result.kind === "suggest_create")
    return T.suggestCreate(result.itemName || "?", result.count, result.unit ?? "unidades");
  if (result.success && result.kind === "multiple") {
    const lines = result.items.slice(0, 8).map(fmtItem);
    return `${T.multiHeader(result.items.length)}\n${lines.join("\n")}`;
  }
  if (result.success && result.kind === "single") return T.queryOne(result.item);
  if (result.success && result.kind === "consumed") {
    const c = result.item.prevStock - result.item.newStock;
    return result.wentNegative
      ? T.consumedNeg(result.item.name, result.item.unit, c, result.item.prevStock, result.item.newStock)
      : T.consumed(result.item.name, result.item.unit, c, result.item.prevStock, result.item.newStock);
  }
  if (result.success && result.kind === "added") {
    const c = result.item.newStock - result.item.prevStock;
    return result.created
      ? T.addedNew(result.item.name, result.item.unit, c)
      : T.added(result.item.name, result.item.unit, c, result.item.prevStock, result.item.newStock);
  }
  return "";
}

/** Express API routes */
function registerExpressRoutes(app: Express, port: number): void {
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

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        const appointmentId = session.metadata?.appointmentId;

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
              customerEmail: session.customer_details?.email,
              amount: (session.amount_total! / 100).toFixed(2),
              paymentStatus: 'paid'
            }
          },
          'booking'
        );
        break;
      case "checkout.session.expired":
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
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
        ? buildScopedToolsFragmentInline(route.scope, route.tools)
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
    let adminAuth: { email: string; role: AdminRole } | null = null;
    if (isAdminMode) {
      adminAuth = await requireAdminAuth(req, res);
      if (!adminAuth) return;
      const requestedClientId = typeof reqClientId === "string" ? reqClientId.trim() : "";
      if (requestedClientId && requestedClientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch." });
      }
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
    const adminRoute: AdminRouteResult | null = isAdminMode ? routeAdminIntentInline(lastUserText) : null;

    let instruction: string;
    if (isAdminMode) {
      instruction = buildAdminChatPrompt(brand ?? {}, businessContext, liveData, adminRoute!) + ragBlock;
    } else {
      // Truncate to recent history to control token usage for public chat
      contents.splice(0, Math.max(0, contents.length - 12));
      instruction = buildChatSystemPrompt(brand ?? {}, businessContext);
    }

    const queryStart = Date.now();
    const effectiveClientIdForMetrics = isAdminMode
      ? CLIENT_ID
      : (typeof reqClientId === "string" && reqClientId) || CLIENT_ID;

    try {
      // ── PUBLIC PATH ───────────────────────────────────────────────────────
      if (!isAdminMode) {
        const ctxForRouter = (businessContext && typeof businessContext === "object"
          ? businessContext
          : {}) as PublicChatCtxInline;
        const publicRoute = routePublicIntentInline(lastUserText, {
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
            let stockResult: StockResultInline;
            if (demoMode) {
              stockResult = await dispatchStockActionInline(
                { db: null, FieldValue: null, clientId: effectiveClientId || "demo", actorEmail: adminAuth?.email ?? "demo", demoMode: true, niche: process.env.VITE_ACTIVE_NICHE },
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
              stockResult = await dispatchStockActionInline(
                { db: admin.db, FieldValue, clientId: effectiveClientId, actorEmail: adminAuth?.email ?? "ai" },
                route.action,
                route.args as unknown as Record<string, unknown>,
              );
            }
            const text = formatStockResultInline(route.action, stockResult, lang);
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

        if (
          route.action === "create_task" ||
          route.action === "list_tasks" ||
          route.action === "complete_task"
        ) {
          try {
            let tasksResult: TasksActionResultInline;
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
              )) as unknown as TasksActionResultInline;
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
              tasksResult = (await dispatchAdminAction(
                {
                  db: admin.db,
                  FieldValue: admin.FieldValue,
                  clientId: effectiveClientId,
                  actorEmail: adminAuth?.email ?? "ai",
                  actorRole: adminAuth?.role ?? "owner",
                },
                route.action,
                route.args as unknown as Record<string, unknown>,
              )) as unknown as TasksActionResultInline;
            }
            const text = formatTasksResultInline(tasksResult);
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

        if (isStubActionInline(route.action)) {
          const text = stubActionMessageInline(route.action, lang);
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
        get_crm_snapshot: GET_CRM_SNAPSHOT_DECLARATION_INLINE,
        // Stock (Bloque I) — declarations injected into ADMIN_TOOL_DECLARATIONS
        // by the parallel session's inline copy.
        query_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "query_stock")!,
        consume_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "consume_stock")!,
        add_stock: ADMIN_TOOL_DECLARATIONS.find((d) => d.name === "add_stock")!,
        // Tasks (Bloque J) — declarations live in TASKS_TOOL_DECLARATIONS_INLINE.
        create_task: TASKS_TOOL_DECLARATIONS_INLINE.find((d) => d.name === "create_task")!,
        list_tasks: TASKS_TOOL_DECLARATIONS_INLINE.find((d) => d.name === "list_tasks")!,
        complete_task: TASKS_TOOL_DECLARATIONS_INLINE.find((d) => d.name === "complete_task")!,
      };
      const activeToolNames: readonly AdminToolName[] =
        route.kind === "model_with_scope" ? route.tools : [...ALL_ADMIN_TOOLS_INLINE];
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

      if (!isKnownAdminAction(call.name)) {
        return res.json({ text: first.text || `I don't know how to call \`${call.name}\`.` });
      }

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
      const { type, data, clientId: reqClientId } = req.body ?? {};
      const requestedClientId = typeof reqClientId === "string" ? reqClientId.trim() : "";
      if (requestedClientId && requestedClientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Tenant mismatch." });
      }
      const effectiveClientId = CLIENT_ID;
      if (!effectiveClientId) {
        return res.status(400).json({ error: "clientId required" });
      }

      if (typeof type !== "string" || !isKnownAdminAction(type)) {
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
        { db, FieldValue, clientId: effectiveClientId, actorEmail: auth.email, actorRole: auth.role },
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

      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email and message are required." });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format." });
      }

      console.log(`[Contact Form] Received inquiry from ${name} (${email})`);

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
    const { serviceId, date, time, clientName, clientPhone } = req.body ?? {};
    const errors: string[] = [];
    if (!serviceId) errors.push("serviceId is required");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) errors.push("date must be YYYY-MM-DD");
    if (!time || !/^\d{2}:\d{2}$/.test(time ?? "")) errors.push("time must be HH:mm");
    if (!clientName) errors.push("clientName is required");
    if (!clientPhone) errors.push("clientPhone is required");

    if (errors.length > 0) {
      return res.status(400).json({ valid: false, errors });
    }
    res.json({ valid: true });
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
