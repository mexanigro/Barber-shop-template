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

/** Etapa explícita o derivación legacy por visitas; las citas candidatas no la cambian. */
export function deriveStage(customer: Pick<Customer, "stage" | "visitCount">): CustomerStage {
  if (customer.stage && isValidStage(customer.stage)) return customer.stage;
  if ((customer.visitCount ?? 0) >= 1) return "converted";
  return "lead";
}

type ContactDetails = Pick<Customer, "id" | "clientId" | "fullName" | "email" | "phone">;

function normalizedName(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase() : "";
}

function normalizedEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizedPhone(value: unknown): string {
  const phone = typeof value === "string" ? value.trim() : "";
  if (!/^\+?[\d\s().-]+$/.test(phone)) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : "";
}

/** Coherencia de datos, no prueba de identidad; no interpreta alias ni prefijos de país. */
function matchesAppointmentDetails(appt: Appointment, customer: ContactDetails): boolean {
  if (!customer.clientId || appt.clientId !== customer.clientId) return false;
  const name = normalizedName(customer.fullName);
  const email = normalizedEmail(customer.email);
  const phone = normalizedPhone(customer.phone);
  return !!name && !!email && !!phone &&
    name === normalizedName(appt.customerName) &&
    email === normalizedEmail(appt.customerEmail) &&
    phone === normalizedPhone(appt.customerPhone);
}

/**
 * Citas posibles por coincidencia completa, sin enlace confirmado al cliente.
 * La población cargada sólo permite descartar duplicados locales; no prueba unicidad global.
 * Mostrar siempre esa limitación y no usar candidatas para etapas, métricas ni escrituras.
 */
export function selectCustomerAppointmentCandidates(
  appointments: readonly Appointment[],
  customer: ContactDetails,
  customers: readonly ContactDetails[],
): Appointment[] {
  return appointments.filter((appt) => {
    if (!matchesAppointmentDetails(appt, customer)) return false;
    const matches = customers.filter((candidate) => matchesAppointmentDetails(appt, candidate));
    return matches.length === 1 && matches[0].id === customer.id;
  });
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
