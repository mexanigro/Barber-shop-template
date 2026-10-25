// CRM-05 · F1, N1 (T) · lo que la verificadora de CRM-04 dejó a la vista en la reserva y en los avisos (D-381, D-382). Sesión A2
// (2026-10-25): tests rojos.
//
// Medido en T 351a33e (src/ = 6a8dbb2), en un clon: `isValidBookingDate("2027-02-31")` es false y `POST /api/book` ya rechaza una fecha
// futura que no existe (`booking-validation.ts:53-58`, `booking-handler.ts:49`); pero R1 de CRM-04 la prueba con «2026-02-31», que ya
// es pasado y lo rechaza `yaPaso` (`:53`), así que la mutación `isValidBookingDate → return !!f` dejaba R1 verde. F1 la prueba con el
// próximo 31 de febrero, siempre futuro, y con el 28 del mismo febrero como control (se acepta y se escribe): con la mutación, la reserva
// del 31 se acepta. Como el código de hoy ya cumple F1, su rojo es del árbol (inciso l): la precondición es X1 (los índices de turnos por
// fecha, `_indices.ts`), como W2. N1: los comentarios de `avisos-handler.ts:30`, `api/index.ts:738` y `server.ts:813` dicen que un envío
// «failed» se reintenta a la hora siguiente, y desde D-342 queda marcado y no se reintenta (`avisos-handler.ts:13`, `:77`; D-382). Se
// leen los comentarios de los tres archivos; una promesa de reintento es «se reintenta», «se reintente» o «se reintentará» sin «no»
// delante (el infinitivo de `:13`, «si hace falta reintentar», no promete nada). Ninguna espera es de tiempo fijo.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { conModulos } from "./_crm.ts";
import { dbMemoria, existe, fuente } from "./_comun.ts";
import { fallasDeX1 } from "./_indices.ts";

function res() {
  const r: any = { code: 200, cuerpo: undefined as any };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: any) => { r.cuerpo = b; return r; };
  r.send = (b: any) => { r.cuerpo = b; return r; };
  r.setHeader = () => r; r.set = () => r; r.end = () => r;
  return r;
}
const FV: Record<string, (...x: any[]) => any> = { serverTimestamp: () => new Date(), increment: (n: number) => n, delete: () => undefined, arrayUnion: (...x: any[]) => x };
/** POST /api/book con `createBookingHandler` sobre un Firestore en memoria; devuelve el estado, el cuerpo y si escribió un turno. */
async function reservar(bh: any, config: any, cuerpo: Record<string, any>) {
  const mem = dbMemoria({ [`config/c1`]: config, [`clients/c1`]: { status: "active" } });
  const h = bh.createBookingHandler({ clientId: "c1", idiomaBase: "he", loadContext: async () => ({ db: mem.db, FieldValue: FV }) });
  const r = res();
  try { await h({ body: cuerpo, headers: {}, query: {}, ip: "127.0.0.1" }, r); } catch (e) { r.code = -1; r.cuerpo = String((e as Error).message); }
  return { code: r.code, cuerpo: r.cuerpo, escribio: mem.escritas.some((e) => e.ruta.startsWith("appointments/")) };
}
/** El año del próximo febrero que todavía no empezó a terminar: el 28 de ese febrero es futuro (reloj real, como la reserva). */
function anioDelProximoFebrero(): number {
  const hoy = new Date();
  const y = hoy.getUTCFullYear();
  return hoy.getTime() < Date.UTC(y, 1, 27) ? y : y + 1;
}

test("POST /api/book responde 4xx sin escribir con una fecha futura que no existe (el próximo 31 de febrero), y acepta el 28 de ese febrero", async () => {
  const fallas: string[] = [];
  // Del árbol (inciso l): el código de hoy ya cumple; la precondición es X1.
  for (const f of fallasDeX1()) fallas.push(`precondición del árbol (X1): ${f}`);
  await conModulos(async (cargar) => {
    const bh = await cargar("src/lib/api/booking-handler.ts");
    if (typeof bh?.createBookingHandler !== "function") { fallas.push("src/lib/api/booking-handler.ts exporta createBookingHandler"); return; }
    const dia = { isOpen: true, hours: { start: "09:00", end: "18:00" }, breaks: [] as any[] };
    const schedule = Object.fromEntries(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((d) => [d, dia]));
    const config = { services: [{ id: "corte", name: "תספורת", price: 100, duration: 30 }], staff: [{ id: "noa", name: "נועה", schedule }] };
    const base = { customerName: "נועה", customerEmail: "n@salon.co.il", customerPhone: "0500000000", serviceId: "corte", staffId: "noa", duration: 30, lang: "he", time: "10:00" };
    const y = anioDelProximoFebrero();
    const ok = await reservar(bh, config, { ...base, date: `${y}-02-28` });
    if (ok.code !== 200 || !ok.escribio) fallas.push(`control: el ${y}-02-28 a las 10:00 se acepta y se escribe (hoy ${ok.code} ${JSON.stringify(ok.cuerpo)})`);
    const r = await reservar(bh, config, { ...base, date: `${y}-02-31` });
    if (r.code < 400 || r.code >= 500 || r.escribio) fallas.push(`con la fecha «${y}-02-31» responde 4xx sin escribir (hoy ${r.code}${r.escribio ? ", y escribió el turno" : ""} ${JSON.stringify(r.cuerpo)})`);
  });
  assert.deepEqual(fallas, [], `F1 · la reserva con una fecha que no existe:\n${fallas.join("\n")}`);
});

/** Los comentarios de un archivo (`//` y `/* … *\/`) con su línea; los `//` seguidos se juntan en un bloque. Sin strings ni regex. */
function comentarios(texto: string): { linea: number; texto: string }[] {
  const out: { linea: number; texto: string }[] = [];
  let i = 0, linea = 1, ultimoFin = -1;
  const n = texto.length;
  while (i < n) {
    const c = texto[i];
    if (c === "\n") { linea++; i++; continue; }
    if (c === "\"" || c === "'" || c === "`") {
      const q = c; i++;
      while (i < n && texto[i] !== q) { if (texto[i] === "\\") i++; else if (texto[i] === "\n") linea++; i++; }
      i++; continue;
    }
    if (c === "/" && texto[i + 1] === "/") {
      const fin = texto.indexOf("\n", i); const t = texto.slice(i + 2, fin < 0 ? n : fin);
      if (ultimoFin === linea - 1 && out.length) out[out.length - 1].texto += " " + t.trim(); else out.push({ linea, texto: t.trim() });
      ultimoFin = linea; i = fin < 0 ? n : fin; continue;
    }
    if (c === "/" && texto[i + 1] === "*") {
      const fin = texto.indexOf("*/", i + 2); const t = texto.slice(i + 2, fin < 0 ? n : fin);
      out.push({ linea, texto: t.replace(/\s*\n\s*\*?/g, " ").trim() });
      linea += (t.match(/\n/g) ?? []).length; i = fin < 0 ? n : fin + 2; continue;
    }
    i++;
  }
  return out;
}
/** Una promesa de reintentar: «se reintenta», «se reintente», «se reintentará(n)» o «se reintentan», sin «no» delante. */
const PROMETE = /(?<!\bno\s)\bse\s+reintent(?:a|e|an|en|ará|arán)(?![\p{L}\p{N}])/iu;

test("ningún comentario de `src/lib/api/avisos-handler.ts` ni de la ruta de avisos en `api/index.ts` y `server.ts` promete reintentar un envío «failed»", () => {
  const fallas: string[] = [];
  for (const archivo of ["src/lib/api/avisos-handler.ts", "api/index.ts", "server.ts"]) {
    if (!existe(archivo)) { fallas.push(`${archivo} existe`); continue; }
    const texto = fuente(archivo);
    // Que se lea el archivo que corresponde: el handler declara la ruta; los dos runtimes la montan.
    if (archivo.startsWith("src/") ? !/export\s+function\s+crearRutaAvisos\b/.test(texto) : !texto.includes("\"/api/cron/avisos\"")) { fallas.push(`${archivo} ${archivo.startsWith("src/") ? "exporta crearRutaAvisos" : "monta /api/cron/avisos"}`); continue; }
    for (const c of comentarios(texto)) {
      // En los runtimes, sólo lo de los avisos: un comentario que habla de un envío, de un aviso, del cron o de «failed».
      if (!archivo.startsWith("src/") && !/aviso|failed|cron|env[ií]o/i.test(c.texto)) continue;
      const m = PROMETE.exec(c.texto);
      if (m) fallas.push(`${archivo}:${c.linea} no promete reintentar («…${c.texto.slice(Math.max(0, m.index - 90), m.index + 50)}…»)`);
    }
  }
  assert.deepEqual(fallas, [], `N1 · un envío que falló no se reintenta (D-382):\n${fallas.join("\n")}`);
});
