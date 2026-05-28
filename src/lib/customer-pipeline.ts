/**
 * Customer pipeline shared helpers (Bloque F).
 *
 * Used by the kanban UI in CustomersTab, by /api/customers/:id/stage and
 * /api/customers/:id/tags endpoints in server.ts, and mirrored inline in
 * api/index.ts (per docs/ARCHITECTURE.md the Vercel bundler does not
 * cross-import from src/, so the api/ runtime keeps its own copy).
 *
 * Pure functions only — no Firebase / no IO. Callers pass raw data and the
 * helpers return derived shapes / validation outcomes.
 */

import type { Appointment, Customer, CustomerSource, CustomerStage } from "../types";

/** All five stages in display order (lost is last, often hidden). */
export const CUSTOMER_STAGES: readonly CustomerStage[] = [
  "lead",
  "contacted",
  "scheduled",
  "converted",
  "lost",
] as const;

/** Stages that should remain visible by default. `lost` is opt-in. */
export const DEFAULT_VISIBLE_STAGES: readonly CustomerStage[] = [
  "lead",
  "contacted",
  "scheduled",
  "converted",
] as const;

/** Cap per Firestore array field. Matches Customer.tags constraints. */
export const MAX_TAGS_PER_CUSTOMER = 20;
export const MAX_TAG_LENGTH = 50;

/** Cap for /api/customers/bulk-* requests so a single call cannot fan out. */
export const MAX_BULK_CUSTOMERS = 100;

/** Cap for listCustomers — matches CRM_METRICS_DOC_CAP intent. */
export const CUSTOMERS_QUERY_CAP = 5000;

export function isValidStage(value: unknown): value is CustomerStage {
  return (
    value === "lead" ||
    value === "contacted" ||
    value === "scheduled" ||
    value === "converted" ||
    value === "lost"
  );
}

/**
 * Normalize a tag string for storage. Trims, collapses whitespace, lower-cases
 * the prefix conservatively (keeps original casing — owners may want "VIP").
 * Returns null when the value is empty / over the cap.
 */
export function normalizeTag(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  if (trimmed.length > MAX_TAG_LENGTH) return null;
  return trimmed;
}

/**
 * Validate the body of PATCH /api/customers/:id/tags.
 * Accepts `{ add?: string[], remove?: string[] }`.
 */
export function validateTagsPatch(
  input: unknown,
):
  | { ok: true; add: string[]; remove: string[] }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const body = input as { add?: unknown; remove?: unknown };
  const addRaw = body.add;
  const removeRaw = body.remove;
  if (addRaw !== undefined && !Array.isArray(addRaw)) {
    return { ok: false, error: "`add` must be an array of strings" };
  }
  if (removeRaw !== undefined && !Array.isArray(removeRaw)) {
    return { ok: false, error: "`remove` must be an array of strings" };
  }
  const add: string[] = [];
  for (const t of (addRaw as unknown[] | undefined) ?? []) {
    const norm = normalizeTag(t);
    if (norm && !add.includes(norm)) add.push(norm);
  }
  const remove: string[] = [];
  for (const t of (removeRaw as unknown[] | undefined) ?? []) {
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

/**
 * Merge a Customer.tags array with add/remove ops, enforcing the per-doc cap.
 * Used by server-side `tags` PATCH and by client-side optimistic updates.
 */
export function applyTagsPatch(
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

/**
 * Derive a CustomerStage when none is persisted. Lookup order:
 *   1. explicit `customer.stage`
 *   2. visitCount >= 1 → "converted"
 *   3. has an active (confirmed/pending/scheduled) future appointment → "scheduled"
 *   4. otherwise → "lead"
 *
 * Callers pass the customer's appointments (already filtered by email) so the
 * helper stays Firestore-free.
 */
export function deriveStage(
  customer: Pick<Customer, "stage" | "visitCount">,
  appointments: readonly Pick<Appointment, "status" | "date">[] = [],
  todayIso: string = new Date().toISOString().slice(0, 10),
): CustomerStage {
  if (customer.stage && isValidStage(customer.stage)) return customer.stage;
  if ((customer.visitCount ?? 0) >= 1) return "converted";
  const hasActiveFuture = appointments.some(
    (a) =>
      (a.status === "confirmed" || a.status === "pending") &&
      typeof a.date === "string" &&
      a.date >= todayIso,
  );
  if (hasActiveFuture) return "scheduled";
  return "lead";
}

/** Cheap key matcher used to bind appointments to a customer by email/phone. */
export function appointmentBelongsToCustomer(
  appt: Pick<Appointment, "customerEmail" | "customerPhone">,
  customer: Pick<Customer, "email" | "phone">,
): boolean {
  if (!customer) return false;
  const apptEmail = (appt.customerEmail ?? "").toLowerCase();
  const custEmail = (customer.email ?? "").toLowerCase();
  if (apptEmail && custEmail && apptEmail === custEmail) return true;
  const apptPhone = (appt.customerPhone ?? "").replace(/\D/g, "");
  const custPhone = (customer.phone ?? "").replace(/\D/g, "");
  if (apptPhone && custPhone && apptPhone === custPhone) return true;
  return false;
}

/**
 * Per-source visual palette key. The UI maps this to a tailwind chip class.
 * Unknown sources fall back to `default`.
 */
export type SourcePaletteKey = "web" | "whatsapp" | "instagram" | "google" | "referral" | "manual" | "walkin" | "booking" | "import" | "default";

const KNOWN_SOURCES: ReadonlySet<string> = new Set([
  "web", "whatsapp", "instagram", "google", "referral",
  "manual", "walkin", "booking", "import",
]);

export function sourcePalette(source: CustomerSource | undefined): SourcePaletteKey {
  if (typeof source === "string" && KNOWN_SOURCES.has(source)) {
    return source as SourcePaletteKey;
  }
  return "default";
}
