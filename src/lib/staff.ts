import { siteConfig } from "../config/site";
import type { StaffMember } from "../types";

/**
 * Resuelve un miembro del roster estático por slug de URL o por id (fallback).
 */
export function resolveStaffMember(slugOrId: string): StaffMember | undefined {
  const q = slugOrId.trim().toLowerCase();
  return siteConfig.staff.find(
    (m) => m.slug.toLowerCase() === q || m.id.toLowerCase() === q,
  );
}
