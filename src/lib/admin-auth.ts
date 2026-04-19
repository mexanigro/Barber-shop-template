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
