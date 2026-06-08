import type { User } from "firebase/auth";
import { siteConfig } from "../config/site";

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Client-side UX gate only. The real security boundary is server-side
 * `requireAdminAuth()`. This check prevents the admin UI from rendering
 * for non-admin users but does NOT protect data — all API calls are
 * independently verified server-side.
 * B-8: adminEmail is exposed in the client bundle via VITE_ADMIN_EMAIL.
 * This is acceptable because: (1) the email is publicly known (Google sign-in),
 * (2) the server-side gate is the actual security boundary.
 */
export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false;
  const configured = normalizeEmail(siteConfig.adminEmail);
  if (!configured) return false;
  return normalizeEmail(user.email) === configured;
}
