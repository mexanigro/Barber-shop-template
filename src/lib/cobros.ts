// CRM-03 · diseño: las cuentas de dinero de un turno, en un solo lugar (la agenda, el Resumen, Pagos y el diálogo de cobro usan esto).
// cobrado = lo que entró (amountPaidCents; si figura pagado sin monto, el precio); esperado = el precio, o lo cobrado si fue más;
// saldo = lo que falta (0 si está pagado). Una seña (deposit_paid) cuenta como cobrada en parte y deja saldo: nunca se pisa.
import type { Appointment } from "../types";

type Turno = Pick<Appointment, "status" | "paymentStatus" | "amountPaidCents">;

export function cobradoDe(a: Turno, precio: number): number {
  if (typeof a.amountPaidCents === "number" && a.amountPaidCents >= 0) return a.amountPaidCents / 100;
  return a.paymentStatus === "paid" ? precio : 0;
}
export const esperadoDe = (a: Turno, precio: number) => Math.max(precio, cobradoDe(a, precio));
export const saldoDe = (a: Turno, precio: number) => (a.paymentStatus === "paid" ? 0 : Math.max(0, esperadoDe(a, precio) - cobradoDe(a, precio)));
export const estaPagado = (a: Turno, precio: number) => a.paymentStatus === "paid" || (precio > 0 && saldoDe(a, precio) === 0 && cobradoDe(a, precio) > 0);

/** Las cifras de un conjunto de turnos (un día, un filtro): los cancelados no cuentan. */
export function cuentas<T extends Turno>(turnos: T[], precioDe: (a: T) => number) {
  const activos = turnos.filter((a) => a.status !== "cancelled");
  return {
    activos,
    pendientes: activos.filter((a) => a.status === "pending").length,
    // CRM-04 (D-344): un turno pagado con descuento cuenta lo cobrado; ingreso = cobrado + pendiente.
    ingreso: activos.reduce((s, a) => s + cobradoDe(a, precioDe(a)) + saldoDe(a, precioDe(a)), 0),
    cobrado: activos.reduce((s, a) => s + cobradoDe(a, precioDe(a)), 0),
    porCobrar: activos.reduce((s, a) => s + saldoDe(a, precioDe(a)), 0),
  };
}

/**
 * El pago que se registra sobre un turno: el monto nuevo se suma a lo ya cobrado (una seña no se pierde) y el estado queda «paid» si
 * cubre el precio, «deposit_paid» si no. Montos en agorot (enteros), nunca negativos.
 */
export function pagoNuevo(a: Turno, precio: number, montoNuevo: number) {
  const total = Math.round((cobradoDe(a, precio) + Math.max(0, montoNuevo)) * 100);
  return { amountPaidCents: total, paymentStatus: (total >= Math.round(precio * 100) ? "paid" : "deposit_paid") as "paid" | "deposit_paid" };
}

/** CRM-04 (D-344): lo que el navegador manda al cobrar: el monto que entra ahora, nunca el total (el servidor lo suma a lo guardado, en
 *  una transacción). `precioCents` sólo vale si el catálogo de `config` no tiene el servicio (el del preset).
 *  CRM-05 (D-363): `id` lo genera el diálogo al abrirse y lo repite en cada reintento (el servidor no suma dos veces el mismo id);
 *  una reversión es un cobro con `montoCents` negativo, `revierte` (el id del cobro) y `motivo`. */
export type Cobro = { id?: string; montoCents: number; paymentMethod: "cash" | "card" | "transfer" | "other"; precioCents?: number; revierte?: string; motivo?: string };

/** CRM-05 (D-363): un cobro guardado en `appointments/{id}.cobros`. `at` es la fecha (Date, Timestamp o `{ __ts }` según quién lo lea). */
export type RegistroCobro = { id: string; montoCents: number; metodo: string; at: unknown; por?: string; revierte?: string; motivo?: string; heredado?: true };

/** Los cobros de un turno: su lista, o, en un turno anterior a CRM-05 sin lista, un cobro heredado con lo que ya tenía cobrado. */
export function cobrosDe(t: { cobros?: unknown; amountPaidCents?: unknown; paymentMethod?: unknown; paidAt?: unknown }): RegistroCobro[] {
  if (Array.isArray(t.cobros)) return t.cobros as RegistroCobro[];
  if (typeof t.amountPaidCents !== "number" || t.amountPaidCents <= 0) return [];
  return [{ id: "heredado", montoCents: t.amountPaidCents, metodo: typeof t.paymentMethod === "string" ? t.paymentMethod : "other", at: t.paidAt ?? null, heredado: true }];
}

/** Lo que queda de un cobro después de sus reversiones. */
export const netoDe = (lista: RegistroCobro[], id: string) =>
  lista.filter((c) => c.id === id || c.revierte === id).reduce((s, c) => s + c.montoCents, 0);

/** Los campos que el turno deriva de su lista (D-363): lo cobrado, el estado, y el método y la fecha del último cobro. */
export function resumenDeCobros(lista: RegistroCobro[], precioCents: number) {
  const total = lista.reduce((s, c) => s + c.montoCents, 0);
  const ultimo = lista[lista.length - 1];
  return {
    amountPaidCents: total,
    paymentStatus: (total <= 0 ? "pending" : total >= precioCents ? "paid" : "deposit_paid") as "pending" | "paid" | "deposit_paid",
    ...(ultimo ? { paymentMethod: ultimo.metodo, paidAt: ultimo.at } : {}),
  };
}

/**
 * Un monto escrito por la dueña, como se escribe en Israel (CRM-04, D-344): la coma separa miles («1,500» = 1500) y el punto separa
 * decimales, como mucho dos («150.5»); los espacios no cuentan. null si no es un número positivo o está mal escrito («1.500», «1,50»).
 */
export function leerMonto(texto: string): number | null {
  const t = texto.replace(/\s/g, "");
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t.replace(/,/g, ""));
  return n > 0 ? Math.round(n * 100) / 100 : null;
}
