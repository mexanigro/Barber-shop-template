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
    ingreso: activos.reduce((s, a) => s + esperadoDe(a, precioDe(a)), 0),
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

/** Un monto escrito por la dueña: acepta coma o punto decimal y espacios; null si no es un número positivo. */
export function leerMonto(texto: string): number | null {
  const n = Number(texto.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
