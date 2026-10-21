// CRM-03 · técnico (clon): el cron de avisos manda como mucho TOPE_POR_CORRIDA recordatorios por corrida, los de más temprano
// primero si vienen en orden, y la corrida siguiente manda el resto sin repetir ninguno.
import { test } from "node:test";
import assert from "node:assert/strict";
import { manejarAvisos, TOPE_POR_CORRIDA } from "../src/lib/api/avisos-handler.ts";

test("con más turnos que el tope, una corrida manda el tope y la siguiente el resto, sin repetir", async () => {
  const turnos = Array.from({ length: TOPE_POR_CORRIDA + 3 }, (_, i) => ({ id: `t${i}`, date: "2026-10-16", time: `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`, status: "confirmed", customerEmail: `c${i}@example.com`, customerName: "X", serviceId: "cut" }));
  const enviados: string[] = [];
  const marcas = new Set<string>();
  const correr = () => manejarAvisos({ headers: { authorization: "Bearer k" }, query: {} }, {
    secreto: "k", ahora: new Date("2026-10-15T15:05:00Z"), idiomaBase: "he", negocio: { nombre: "הסלון" }, remitente: "x <x@x>", emailDuena: undefined,
    nombreServicio: (id) => id, turnosDe: async () => turnos,
    avisosDe: async (_t, refs) => refs.filter((r) => enviados.includes(r)),
    enviar: async (m) => { enviados.push(turnos.find((t) => t.customerEmail === m.to)!.id); return { id: "re" }; },
    registrar: async () => {},
    // CRM-04 (D-342 2): la marca antes de enviar.
    marcar: async (ref) => (marcas.has(ref) ? false : (marcas.add(ref), true)),
  });
  const a = await correr();
  assert.equal((a.json.recordatorios as string[]).length, TOPE_POR_CORRIDA);
  assert.deepEqual(a.json.recordatorios, turnos.slice(0, TOPE_POR_CORRIDA).map((t) => t.id), "los primeros de la lista");
  const b = await correr();
  assert.deepEqual(b.json.recordatorios, turnos.slice(TOPE_POR_CORRIDA).map((t) => t.id), "la siguiente, el resto");
  assert.equal(new Set(enviados).size, enviados.length, "ninguno dos veces");
  const c = await correr();
  assert.deepEqual(c.json.recordatorios, [], "y después, nada");
});
