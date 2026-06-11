// ─── Admin auth gate (shared) ────────────────────────────────────────────────
//
// Single source of truth for Firebase ID-token verification + the admin auth
// gate, consumed by BOTH Express runtimes: server.ts (dev/self-host) and
// api/index.ts (Vercel serverless). The 2026-06-10 audit found the A-6 and
// M-2 fixes had landed in server.ts only — keeping the gate here guarantees
// both runtimes enforce the same policy:
//
//   M-2: unverified email addresses are rejected (403).
//   A-6: no legacy ADMIN_EMAILS / VITE_ADMIN_EMAIL fallback. Admin users must
//        be provisioned in the admin_users collection with explicit roles.
//
// Data access is injected: each runtime supplies its own admin_users lookup
// (firebase-admin SDK vs Firestore REST).

import { createVerify } from "crypto";
import type { Request, Response } from "express";
import type { AdminRole, AdminUserStatus } from "../admin-users.js";

export type FirebaseIdTokenPayload = {
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

export function base64UrlDecode(s: string): Buffer {
  let v = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = v.length % 4;
  if (pad === 2) v += "==";
  else if (pad === 3) v += "=";
  else if (pad === 1) throw new Error("Invalid base64url");
  return Buffer.from(v, "base64");
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdTokenPayload | null> {
  try {
    const projectId =
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
      process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
      console.error("[Auth] FIREBASE_PROJECT_ID not set — cannot verify ID token. Fix deployment env vars immediately.");
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

export type AdminAuthResult = { email: string; uid: string; role: AdminRole };

/**
 * Runtime-specific lookup into the per-tenant `admin_users` collection
 * (document id = lowercase email, keyed by clientId field). Returns the
 * stored role + status, or null if no doc exists / lookup fails.
 */
export type AdminUserLookup = (
  normalizedEmail: string,
) => Promise<{ role: AdminRole; status: AdminUserStatus } | null>;

/**
 * Gate for admin-scoped endpoints. Validates a Firebase ID token from the
 * `Authorization: Bearer <token>` header, then resolves the caller's role
 * via the injected admin_users lookup.
 *
 * Writes 401/403 directly on failure (never leaks why) and returns null.
 * On success, returns the normalized email, uid, and role for downstream
 * logging + role-gated action checks.
 */
export async function requireAdminAuth(
  req: Request,
  res: Response,
  lookupAdminUser: AdminUserLookup,
): Promise<AdminAuthResult | null> {
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

  // M-2: Reject unverified email addresses.
  if (!decoded.email_verified) {
    res.status(403).json({ error: "Forbidden" });
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

  // A-6 FIX: Legacy VITE_ADMIN_EMAIL fallback removed. Admin users must be
  // provisioned in the admin_users collection with explicit roles. The env-based
  // allowlist granted unconditional "owner" role which was too permissive.
  // If no admin_users doc exists, deny access.
  res.status(403).json({ error: "Forbidden" });
  return null;
}
