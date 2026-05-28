/**
 * Shared admin-user schema + small helpers (Bloque E).
 *
 * Per-tenant collection at `admin_users/{userId}` flat-style (CLAUDE.md rule).
 * Each doc carries its own `clientId` so the same Firestore project hosts every
 * tenant without nested paths. Document id is the lowercase email so reads by
 * email are O(1) and we never create duplicates for the same address.
 *
 * The legacy `siteConfig.adminEmail` field stays around. The server-side gate
 * (`requireAdminAuth`) prefers the collection and falls back to the legacy
 * field so old clients keep working until the migration script runs.
 */

export type AdminRole = "owner" | "manager" | "staff";
export type AdminUserStatus = "pending" | "active" | "removed";

export const ADMIN_ROLES: readonly AdminRole[] = ["owner", "manager", "staff"] as const;

export type AdminUser = {
  email: string;              // normalized lowercase
  role: AdminRole;
  invitedBy: string;          // email of the inviter (or "system" for the bootstrap owner)
  invitedAt: string;          // ISO timestamp (server serializes Firestore Timestamp → string)
  acceptedAt?: string;        // set when the user first signs in successfully
  status: AdminUserStatus;
  customClaimsSyncedAt?: string;
};

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "owner" || value === "manager" || value === "staff";
}

export function isAdminStatus(value: unknown): value is AdminUserStatus {
  return value === "pending" || value === "active" || value === "removed";
}

export function normalizeAdminEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Returns true if `actor` is allowed to assign `targetRole` when inviting.
 * Owners may assign any role; managers may only invite staff; staff may invite no one.
 */
export function canAssignRole(actor: AdminRole, targetRole: AdminRole): boolean {
  if (actor === "owner") return true;
  if (actor === "manager") return targetRole === "staff";
  return false;
}

/** Returns true if `actor` may change roles at all. */
export function canChangeRole(actor: AdminRole): boolean {
  return actor === "owner";
}

/**
 * Returns true if `actor` may remove the user with `targetRole`.
 * - Owners may remove anyone except themselves (last-owner guard handled separately).
 * - Managers may remove staff they invited (caller checks `invitedBy` match).
 * - Staff may remove no one.
 */
export function canRemoveRole(actor: AdminRole, targetRole: AdminRole): boolean {
  if (actor === "owner") return true;
  if (actor === "manager") return targetRole === "staff";
  return false;
}
