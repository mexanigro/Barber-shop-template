// CRM-03 · técnico (clon): «תורים קרובים» compara con la fecha y la hora de Israel, no con las del servidor (UTC en Vercel).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCrmMetrics } from "../src/lib/crm-metrics.ts";

const turno = (id: string, date: string, time: string) => ({ id, date, time, status: "confirmed", customerName: id, serviceId: "cut", staffId: "s", clientId: "c", createdAtMs: 0 });
const proximos = (ahora: string, turnos: ReturnType<typeof turno>[]) =>
  computeCrmMetrics({ range: "30d", now: new Date(ahora), appointments: turnos as never, customers: [], inbox: [], leads: [] } as never).upcomingAppointments.map((a) => a.id);

test("a las 12:00 de Israel (09:00 UTC), el de las 11:00 ya pasó y el de las 13:00 viene", () => {
  assert.deepEqual(proximos("2026-10-16T09:00:00Z", [turno("once", "2026-10-16", "11:00"), turno("trece", "2026-10-16", "13:00")]), ["trece"]);
});

test("a las 01:30 de Israel del 16 (22:30 UTC del 15), «hoy» es el 16: un turno del 15 ya no viene", () => {
  assert.deepEqual(proximos("2026-10-15T22:30:00Z", [turno("ayer", "2026-10-15", "23:00"), turno("hoy", "2026-10-16", "09:00")]), ["hoy"]);
});
