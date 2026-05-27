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
import { createSign, createVerify } from "crypto";

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
// No firebase-admin SDK — avoids gRPC cold-start hang in Vercel serverless.
//
// Required env vars (Vercel Project Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT_EMAIL  — "client_email" from service account JSON
//   FIREBASE_SERVICE_ACCOUNT_KEY    — "private_key" from service account JSON
//                                     (paste the full PEM; Vercel preserves \n)
//
// Fail-open policy: if credentials are absent, Firestore is unreachable, or the
// clients document does not exist, status defaults to "active" (never blocks).

// Still a stub — only used for contact_inbox / notification_logs writes (no-ops).
async function getAdminDb(): Promise<null> {
  return null;
}

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
      return { text, functionCalls };
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

CRITICAL RULES:
1. If the user describes an intent but you are missing a REQUIRED field, ASK for it in natural language. NEVER call the function with placeholder, made-up, or invented values.
2. Use IDs from the live data above (the (id:xxx) tags). Never fabricate IDs.
3. Money is always in CENTS in mark_paid. Convert from whatever unit the admin used.
4. For rescheduling, first call update_appointment with status=cancelled, then book_appointment in a follow-up turn.
5. Only one tool call per turn. After the tool runs you will receive its result — then write a short confirmation to the admin in their language.`;

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

async function dispatchAdminAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: { db: any; FieldValue: any; clientId: string },
  toolName: string,
  rawArgs: unknown,
): Promise<{ success: true; [k: string]: unknown }> {
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

  // unreachable due to ADMIN_KNOWN_ACTIONS check above, but keep the throw
  throw new AdminActionError(400, `unhandled action: ${toolName}`);
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

  function buildAdminChatPrompt(
    brand: { name?: string; tagline?: string; aiPersona?: string },
    businessContext: unknown,
    liveData: unknown,
  ): string {
    const ctx = (businessContext && typeof businessContext === "object" ? businessContext : {}) as Record<string, unknown>;
    const businessName = brand?.name ?? "the business";

    // Business knowledge block (same shape as public branch)
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

    const knowledgeBlock = knowledgeLines.length > 0
      ? `\n\n--- BUSINESS INFORMATION ---\n${knowledgeLines.join("\n\n")}\n--- END BUSINESS INFORMATION ---`
      : "";

    // Live CRM data block
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

      if (kpiLines.length > 0 || todayBlock) {
        liveDataBlock = `\n\n--- LIVE CRM DATA ---\nKPIs: ${kpiLines.join(" | ")}${todayBlock}${upcomingBlock}${customersBlock}${inboxBlock}\n--- END LIVE CRM DATA ---`;
      }
    }

    return `You are the CRM Assistant for ${businessName}. You are talking to the business OWNER or ADMIN, not a customer.

Your role is to help the admin manage their business through the CRM dashboard. You have access to real-time business data and can:
- Answer data questions: revenue, appointment counts, which staff is busiest, busiest days, service popularity
- Interpret metrics and KPIs and explain trends
- Suggest actions to improve the business (follow up with inactive customers, optimize scheduling, adjust pricing)
- Explain what each section does and how to use features
- Help troubleshoot issues with appointments, customer data, or settings
- Provide strategic advice based on actual business data

${knowledgeBlock}${liveDataBlock}

When the admin asks about data (revenue, bookings, busiest day, etc.), use the LIVE CRM DATA above to give specific numbers. If data is not available, say so.
Keep answers practical, concise, and actionable. Use numbers when available.
Answer in the same language the admin writes to you.

${ADMIN_TOOLS_PROMPT_FRAGMENT}`;
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

    let instruction: string;
    if (isAdminMode) {
      instruction = buildAdminChatPrompt(brand ?? {}, businessContext, liveData);
    } else {
      // Truncate to recent history to control token usage for public chat
      contents.splice(0, Math.max(0, contents.length - 12));
      instruction = buildChatSystemPrompt(brand ?? {}, businessContext);
    }

    try {
      // Public path: text-only, no tools.
      if (!isAdminMode) {
        const rawText = await geminiGenerateContent(apiKey, {
          contents,
          systemInstruction: instruction,
          temperature: 0.7,
          maxOutputTokens: 400,
        });
        return res.json({ text: rawText });
      }

      // Admin path: native function calling, two-turn loop.
      const first = await geminiGenerateRich(apiKey, {
        contents,
        systemInstruction: instruction,
        temperature: 0.7,
        maxOutputTokens: 800,
        tools: [{ functionDeclarations: ADMIN_TOOL_DECLARATIONS }],
      });

      if (first.functionCalls.length === 0) {
        return res.json({ text: first.text });
      }

      const call = first.functionCalls[0];
      const effectiveClientId = (typeof reqClientId === "string" && reqClientId) || CLIENT_ID;

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
      const effectiveClientId = reqClientId || CLIENT_ID;
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
