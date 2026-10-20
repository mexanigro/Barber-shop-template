// CRM-04 · N1–N6 (T) · los avisos (D-342; REV 2, 3, 4, 5, 10, 15 y 17). Sesión A (2026-10-20): tests rojos.
//
// Medido en T 47b53a6 (`revision-tecnica/INFORME.md`, la sonda `sonda-avisos.mts` y estos tests): un turno de «תור חדש» con el email
// `walkin_…@noemail.local` recibe el recordatorio; dos corridas a la vez mandan dos (no hay marca previa); sin `Authorization` la ruta
// carga la base antes del 401 y un error de la base o del envío deja la promesa rechazada; un 429 se trata como enviado y la corrida
// sigue; sin clave de email cada corrida vuelve a registrar «queued»; `?fecha=` dice «מחר» para cualquier fecha; el resumen lista los
// turnos `expired`. Contrato (§ Interfaz): `manejarAvisos(req, deps)` como en CRM-03 con `deps.enviar → { id } | null | { limite: true }`
// y `deps.marcar(refId) → Promise<boolean>`; `crearRutaAvisos({ clientId, loadDb, enviar, env })` como hoy.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { conModulos } from "./_crm.ts";
import { dbMemoria } from "./_comun.ts";

type Turno = { id: string; date: string; time: string; status: string; customerEmail?: string; customerName: string; serviceId: string; lang?: string };
const AUT = { headers: { authorization: "Bearer s3creto" }, query: {} };
const tick = () => new Promise((r) => setImmediate(r));

/** Las dependencias de `manejarAvisos` con un estado compartido (las marcas, los registros y los envíos), para correr varias veces. */
function estadoAvisos() {
  const marcas = new Set<string>(), enviados: any[] = [], registrados: any[] = [], marcadas: string[] = [];
  return {
    marcas, enviados, registrados, marcadas,
    deps(o: { ahora: string; turnos: Record<string, Turno[]>; enviar?: (m: any, n: number) => any }) {
      return {
        secreto: "s3creto", ahora: new Date(o.ahora), idiomaBase: "he" as const, negocio: { nombre: "הסלון" }, remitente: "הסלון <noreply@arzac.studio>", emailDuena: "duena@example.com",
        nombreServicio: (id: string, idioma: string) => `${id}-${idioma}`,
        async turnosDe(fecha: string) { await tick(); return structuredClone(o.turnos[fecha] ?? []); },
        // Lo que ya se envió (como la ruta de hoy: sólo «sent» cuenta como hecho).
        async avisosDe(tipo: string, refs: string[]) { await tick(); return refs.filter((r) => registrados.some((l) => l.type === tipo && l.refId === r && l.status === "sent")); },
        async enviar(m: any) { enviados.push(m); await tick(); await tick(); return o.enviar ? o.enviar(m, enviados.length) : { id: `re_${enviados.length}` }; },
        async registrar(l: any) { await tick(); registrados.push(l); },
        async marcar(refId: string) { marcadas.push(refId); await tick(); if (marcas.has(refId)) return false; marcas.add(refId); return true; },
      };
    },
  };
}
const MANANA = "2026-10-16";
const t = (id: string, x: Partial<Turno> = {}): Turno => ({ id, date: MANANA, time: "10:00", status: "confirmed", customerEmail: `${id}@example.com`, customerName: "נועה", serviceId: "cut", ...x });

test("un turno de mañana sin email o con un email de @noemail.local no recibe recordatorio ni deja ningún registro", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/api/avisos-handler.ts");
    if (typeof m?.manejarAvisos !== "function") { fallas.push("src/lib/api/avisos-handler.ts exporta manejarAvisos"); return; }
    const e = estadoAvisos();
    const turnos = { [MANANA]: [t("a"), t("b", { customerEmail: undefined }), t("c", { customerEmail: "walkin_0500000000@noemail.local", time: "09:00" }), t("d", { customerEmail: "walkin_0501111111@noemail.local", time: "11:00" }), t("f", { status: "pending", time: "12:00" })] };
    try {
      await m.manejarAvisos(AUT, e.deps({ ahora: "2026-10-15T15:05:00Z", turnos }));
    } catch (err) { fallas.push(`manejarAvisos lanzó: ${(err as Error).message}`); }
    const a = e.enviados.map((x) => x.to).filter((x) => x !== "duena@example.com").sort();
    if (JSON.stringify(a) !== JSON.stringify(["a@example.com", "f@example.com"])) fallas.push(`sólo reciben recordatorio los turnos con una dirección real (enviados a: ${a.join(", ")})`);
    for (const id of ["b", "c", "d"]) {
      if (e.registrados.some((l) => l.refId === id)) fallas.push(`el turno ${id} (sin dirección real) no deja ningún registro`);
      if (e.marcadas.includes(id) || e.marcadas.some((x) => x.endsWith(`_${id}`))) fallas.push(`el turno ${id} (sin dirección real) no deja marca`);
    }
  });
  assert.deepEqual(fallas, [], `N1 · sin dirección real no hay aviso:\n${fallas.join("\n")}`);
});

test("dos corridas a la vez sobre los mismos turnos de mañana envían un solo recordatorio por turno", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/api/avisos-handler.ts");
    if (typeof m?.manejarAvisos !== "function") { fallas.push("src/lib/api/avisos-handler.ts exporta manejarAvisos"); return; }
    const e = estadoAvisos();
    const turnos = { [MANANA]: [t("a", { time: "09:00" }), t("b", { time: "10:00" }), t("c", { time: "11:00", status: "pending" })] };
    try {
      await Promise.all([m.manejarAvisos(AUT, e.deps({ ahora: "2026-10-15T15:05:00Z", turnos })), m.manejarAvisos(AUT, e.deps({ ahora: "2026-10-15T15:05:30Z", turnos }))]);
    } catch (err) { fallas.push(`manejarAvisos lanzó: ${(err as Error).message}`); }
    const porTurno: Record<string, number> = {};
    for (const x of e.enviados.filter((y) => y.to !== "duena@example.com")) porTurno[x.to] = (porTurno[x.to] ?? 0) + 1;
    for (const id of ["a", "b", "c"]) if (porTurno[`${id}@example.com`] !== 1) fallas.push(`el turno ${id} recibe un solo recordatorio entre las dos corridas (recibió ${porTurno[`${id}@example.com`] ?? 0})`);
  });
  assert.deepEqual(fallas, [], `N2 · un recordatorio por turno:\n${fallas.join("\n")}`);
});

/** Un `res` de express que guarda el estado y el cuerpo. */
function res() {
  const r: any = { code: 200, cuerpo: undefined as any };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: any) => { r.cuerpo = b; return r; };
  r.send = (b: any) => { r.cuerpo = b; return r; };
  r.setHeader = () => r; r.set = () => r; r.end = () => r;
  return r;
}
const configSalon = { services: [{ id: "cut", name: "תספורת" }], brand: { name: "הסלון" } };

test("una petición sin Authorization válida responde 401 sin cargar la base, y cuando la base o el envío lanzan, la respuesta es 500 con JSON y ninguna promesa queda sin manejar", async () => {
  const fallas: string[] = [];
  const sueltas: unknown[] = [];
  const alSoltar = (e: unknown) => { sueltas.push(e); };
  process.on("unhandledRejection", alSoltar);
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-15T15:05:00Z") });
  try {
    await conModulos(async (cargar) => {
      const m = await cargar("src/lib/api/avisos-handler.ts");
      if (typeof m?.crearRutaAvisos !== "function") { fallas.push("src/lib/api/avisos-handler.ts exporta crearRutaAvisos"); return; }
      const env = { CRON_SECRET: "s3creto", BUSINESS_OWNER_EMAIL: "duena@example.com", VITE_UI_LANGUAGE: "he", EMAIL_FROM_ADDRESS: "noreply@arzac.studio" };
      const correr = async (req: any, loadDb: () => Promise<any>, enviar: (x: any) => Promise<any> = async () => ({ id: "re_1" })) => {
        const r = res();
        let rechazo: unknown = null;
        try { await m.crearRutaAvisos({ clientId: "c1", loadDb, enviar, env })(req, r); } catch (e) { rechazo = e; }
        for (let i = 0; i < 5; i++) await tick();
        return { r, rechazo };
      };
      // Sin clave: 401 y la base sin cargar.
      for (const h of [{}, { authorization: "Bearer otra" }, { authorization: "s3creto" }]) {
        let cargas = 0;
        const { r, rechazo } = await correr({ headers: h, query: {} }, async () => { cargas++; return dbMemoria({ [`config/c1`]: configSalon }).db; });
        if (r.code !== 401) fallas.push(`sin Authorization válida (${JSON.stringify(h)}) responde 401 (hoy ${r.code}${rechazo ? `, rechazó: ${(rechazo as Error).message}` : ""})`);
        if (cargas) fallas.push(`sin Authorization válida (${JSON.stringify(h)}) no carga la base (la cargó ${cargas} vez)`);
      }
      // Con clave: la base no carga, la base lanza en una consulta, el envío lanza.
      const conTurnos = () => dbMemoria({ [`config/c1`]: configSalon, [`appointments/a`]: { clientId: "c1", ...t("a") } });
      const casos: [string, () => Promise<any>, ((x: any) => Promise<any>)?][] = [
        ["la base no carga", async () => { throw new Error("Firestore destination mismatch"); }],
        ["la base lanza en una consulta", async () => { const d = conTurnos().db; return { ...d, collection: (n: string) => (n === "appointments" ? { where: () => ({ where: () => ({ get: async () => { throw new Error("FAILED_PRECONDITION: falta un índice"); } }) }) } : d.collection(n)) }; }],
        ["el envío lanza", async () => conTurnos().db, async () => { throw new Error("fetch failed"); }],
      ];
      for (const [que, loadDb, enviar] of casos) {
        const { r, rechazo } = await correr(AUT, loadDb, enviar);
        if (rechazo) fallas.push(`cuando ${que}, la ruta no rechaza su promesa (rechazó: ${(rechazo as Error).message})`);
        else if (r.code !== 500 || !r.cuerpo || typeof r.cuerpo !== "object") fallas.push(`cuando ${que}, la respuesta es 500 con JSON (hoy ${r.code} ${JSON.stringify(r.cuerpo)})`);
      }
    });
  } finally {
    mock.timers.reset();
    for (let i = 0; i < 5; i++) await tick();
    process.off("unhandledRejection", alSoltar);
  }
  if (sueltas.length) fallas.push(`ninguna promesa queda sin manejar (quedaron ${sueltas.length}: ${String((sueltas[0] as Error)?.message ?? sueltas[0])})`);
  assert.deepEqual(fallas, [], `N3 · la clave antes que la base, y sin promesas sueltas:\n${fallas.join("\n")}`);
});

test("cuando el envío responde 429 la corrida deja de enviar, los turnos que faltaban no quedan registrados y la corrida siguiente los envía", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/api/avisos-handler.ts");
    if (typeof m?.manejarAvisos !== "function") { fallas.push("src/lib/api/avisos-handler.ts exporta manejarAvisos"); return; }
    const e = estadoAvisos();
    const turnos = { [MANANA]: [t("a", { time: "09:00" }), t("b", { time: "10:00" }), t("c", { time: "11:00" }), t("d", { time: "12:00" })] };
    // Primera corrida: el proveedor acepta el primero y responde 429 al segundo.
    try { await m.manejarAvisos(AUT, e.deps({ ahora: "2026-10-15T15:05:00Z", turnos, enviar: (_m, n) => (n === 2 ? { limite: true } : { id: `re_${n}` }) })); } catch (err) { fallas.push(`la corrida con 429 lanzó: ${(err as Error).message}`); }
    const primera = e.enviados.length;
    if (primera !== 2) fallas.push(`después del 429 la corrida deja de enviar (intentó ${primera} envíos; el 429 fue el 2.º)`);
    if (e.registrados.some((l) => l.status === "failed")) fallas.push(`un 429 no deja nada en «failed» (${JSON.stringify(e.registrados.filter((l) => l.status === "failed").map((l) => l.refId))})`);
    for (const id of ["c", "d"]) if (e.registrados.some((l) => l.refId === id)) fallas.push(`el turno ${id}, que faltaba, no queda registrado`);
    // La corrida siguiente, una hora después: manda los que faltaban.
    try { await m.manejarAvisos(AUT, e.deps({ ahora: "2026-10-15T16:05:00Z", turnos })); } catch (err) { fallas.push(`la corrida siguiente lanzó: ${(err as Error).message}`); }
    const segunda = e.enviados.slice(primera).map((x) => x.to);
    for (const id of ["c", "d"]) if (!segunda.includes(`${id}@example.com`)) fallas.push(`la corrida siguiente envía el turno ${id} (envió a: ${segunda.join(", ") || "nadie"})`);
    if (segunda.includes("a@example.com")) fallas.push("la corrida siguiente no repite el turno a, que ya salió");
  });
  assert.deepEqual(fallas, [], `N4 · un 429 corta la corrida:\n${fallas.join("\n")}`);
});

test("sin clave de email, seis corridas de una misma noche dejan un solo «queued» por turno, y dieciséis corridas de un día dejan un solo «queued» del resumen", async () => {
  const fallas: string[] = [];
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-10-15T05:05:00Z") });
  try {
    await conModulos(async (cargar) => {
      const m = await cargar("src/lib/api/avisos-handler.ts");
      if (typeof m?.crearRutaAvisos !== "function") { fallas.push("src/lib/api/avisos-handler.ts exporta crearRutaAvisos"); return; }
      const env = { CRON_SECRET: "s3creto", BUSINESS_OWNER_EMAIL: "duena@example.com", VITE_UI_LANGUAGE: "he", EMAIL_FROM_ADDRESS: "noreply@arzac.studio" };
      const base = dbMemoria({
        [`config/c1`]: configSalon,
        [`appointments/h1`]: { clientId: "c1", ...t("h1", { date: "2026-10-15", time: "09:00" }) },
        [`appointments/h2`]: { clientId: "c1", ...t("h2", { date: "2026-10-15", time: "15:00" }) },
        [`appointments/a`]: { clientId: "c1", ...t("a", { time: "09:00" }) },
        [`appointments/b`]: { clientId: "c1", ...t("b", { time: "11:00", status: "pending" }) },
      });
      // Sin clave de email: el envío devuelve null (queda «queued»). Una corrida por hora, de las 08:05 a las 23:05 de Israel (16).
      for (let h = 0; h < 16; h++) {
        mock.timers.setTime(Date.parse("2026-10-15T05:05:00Z") + h * 3600_000);
        const r = res();
        try { await m.crearRutaAvisos({ clientId: "c1", loadDb: async () => base.db, enviar: async (): Promise<null> => null, env })(AUT, r); } catch (err) { fallas.push(`la corrida de las ${8 + h}:05 lanzó: ${(err as Error).message}`); break; }
      }
      const logs = [...base.docs.entries()].filter(([k]) => k.startsWith("notification_logs/")).map(([, v]) => v);
      for (const id of ["a", "b"]) {
        const n = logs.filter((l) => l.type === "reminder" && l.refId === id && l.status === "queued").length;
        if (n !== 1) fallas.push(`el turno ${id} queda «queued» una sola vez en la noche (quedó ${n})`);
      }
      const d = logs.filter((l) => l.type === "digest" && l.status === "queued").length;
      if (d !== 1) fallas.push(`el resumen queda «queued» una sola vez en el día (quedó ${d})`);
    });
  } finally { mock.timers.reset(); }
  assert.deepEqual(fallas, [], `N5 · «queued» una vez:\n${fallas.join("\n")}`);
});

test("con ?fecha= distinta de mañana el asunto del recordatorio nombra esa fecha y no dice «מחר», y el resumen diario no lista turnos expired ni cancelled", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/api/avisos-handler.ts");
    if (typeof m?.manejarAvisos !== "function") { fallas.push("src/lib/api/avisos-handler.ts exporta manejarAvisos"); return; }
    // ?fecha=2026-10-20 a las 10:00 del 15 (mañana es el 16).
    const e = estadoAvisos();
    try { await m.manejarAvisos({ ...AUT, query: { fecha: "2026-10-20" } }, e.deps({ ahora: "2026-10-15T07:00:00Z", turnos: { "2026-10-20": [t("z", { date: "2026-10-20" })] } })); } catch (err) { fallas.push(`manejarAvisos lanzó: ${(err as Error).message}`); }
    const rec = e.enviados.find((x) => x.to === "z@example.com");
    if (!rec) fallas.push("con ?fecha=2026-10-20 manda el recordatorio de ese turno");
    else {
      if (/מחר/.test(rec.subject)) fallas.push(`el asunto no dice «מחר» (hoy «${rec.subject}»)`);
      if (!/(^|\D)20([./]10|\s*ב?אוקטובר)|2026-10-20/.test(rec.subject)) fallas.push(`el asunto nombra la fecha pedida, el 20 de octubre (hoy «${rec.subject}»)`);
    }
    // El resumen de las 08:10 del 15: uno confirmado, uno vencido y uno cancelado.
    const r = estadoAvisos();
    const hoy = [t("x1", { date: "2026-10-15", time: "09:30", customerName: "מאושרת" }), t("x2", { date: "2026-10-15", time: "11:00", status: "expired", customerName: "פגתוקף" }), t("x3", { date: "2026-10-15", time: "12:00", status: "cancelled", customerName: "בוטלה" })];
    try { await m.manejarAvisos(AUT, r.deps({ ahora: "2026-10-15T05:10:00Z", turnos: { "2026-10-15": hoy } })); } catch (err) { fallas.push(`el resumen lanzó: ${(err as Error).message}`); }
    const resumen = r.enviados.find((x) => x.to === "duena@example.com");
    if (!resumen) fallas.push("a las 08:10 sale el resumen del día");
    else {
      if (!resumen.html.includes("מאושרת")) fallas.push("el resumen lista el turno confirmado");
      for (const n of ["פגתוקף", "בוטלה"]) if (resumen.html.includes(n)) fallas.push(`el resumen no lista el turno ${n === "פגתוקף" ? "expired" : "cancelled"} («${n}»)`);
    }
  });
  assert.deepEqual(fallas, [], `N6 · ?fecha= sin «מחר» y el resumen sin vencidos ni cancelados:\n${fallas.join("\n")}`);
});
