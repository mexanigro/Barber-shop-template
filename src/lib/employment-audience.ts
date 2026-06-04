/**
 * employment-audience.ts
 *
 * Persists which audience the visitor identified as on the dual-audience
 * employment landing (Lekt Grigori). Used by the choice screen and the
 * navbar toggle.
 *
 *   "worker"   → /trabajo  (job seekers)
 *   "business" → /empresas (companies hiring)
 *   null       → /choose   (no decision yet)
 */

export type EmploymentAudience = "worker" | "business";

const KEY = "lekt-audience";

export function getAudience(): EmploymentAudience | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "worker" || v === "business" ? v : null;
  } catch {
    return null;
  }
}

export function setAudience(value: EmploymentAudience): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* localStorage unavailable — ignore, will re-prompt next visit */
  }
}

export function clearAudience(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function pathForAudience(audience: EmploymentAudience): "/trabajo" | "/empresas" {
  return audience === "worker" ? "/trabajo" : "/empresas";
}
