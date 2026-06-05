import type { User } from "firebase/auth";
import { siteConfig } from "../config/site";

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Strict owner gate: user must be signed in and email must exactly match
 * siteConfig.adminEmail (case-insensitive after trim).
 */
export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false;
  const configured = normalizeEmail(siteConfig.adminEmail);
  if (!configured) return false;
  return normalizeEmail(user.email) === configured;
}

/**
 * Server-aligned admin gate. The backend checks admin_users first and then
 * falls back to the legacy configured owner email, so client-side affordances
 * must ask the same endpoint instead of only comparing siteConfig.adminEmail.
 */
export async function verifyAdminUser(user: User | null): Promise<boolean> {
  if (!user?.email) return false;

  const legacyOwner = isAdminUser(user);
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return true;
    if (res.status === 401 || res.status === 403) return false;
    // Local/dev fallback for old deployments without the roster endpoint.
    return legacyOwner;
  } catch {
    return legacyOwner;
  }
}
