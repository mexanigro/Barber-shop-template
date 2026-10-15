// CRM-03 · N1–N5 (T) · lo que pasa sin pantalla: recordatorios y resumen diario (cada web, D-300/D-301), los emails en el idioma de
// la reserva (D-302), el servidor que respeta el horario (D-303 (3)) y la entrada del equipo (D-305). Sesión A (2026-10-15): tests rojos.
//
// Medido: `buildCustomerReminderEmailHtml` (api/index.ts:1024) no lo llama nadie; `/api/daily-digest` existe pero ninguna web tiene
// CRON_SECRET y usa la fecha UTC (:2516); todos los emails en inglés; `POST /api/book` sólo mira que la persona exista
// (booking-handler.ts:101); invitar no manda nada (:4406-4468). Los módulos de T se cargan por Vite (`conModulos`); api/index.ts,
// server.ts y vercel.json se leen como texto. Ningún test sale a la red.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { conModulos } from "./_crm.ts";
import { fuente } from "./_comun.ts";

const IDIOMAS = ["he", "en", "ru", "ar"] as const;
const SIN_LATIN = (s: string) => !/[A-Za-z]{3,}/.test(s.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/[\w.+-]+@[\w.-]+/g, " ").replace(/https?:\/\/\S+/g, " "));

/** Un Firestore de Admin en memoria: collection/doc/get/set/add, where encadenado, limit, runTransaction. Registra lo escrito. */
function dbAdmin(inicial: Record<string, any>) {
  const docs = new Map<string, any>(Object.entries(structuredClone(inicial)));
  const escrito: { ruta: string; datos: any }[] = [];
  let auto = 0;
  const snap = (ruta: string) => ({ exists: docs.has(ruta), id: ruta.split("/").pop(), ref: refDoc(ruta), data: () => (docs.has(ruta) ? structuredClone(docs.get(ruta)) : undefined) });
  const refDoc = (ruta: string): any => ({ path: ruta, id: ruta.split("/").pop(), async get() { return snap(ruta); }, async set(d: any, o?: any) { docs.set(ruta, o?.merge ? { ...(docs.get(ruta) ?? {}), ...d } : d); escrito.push({ ruta, datos: d }); }, async update(d: any) { docs.set(ruta, { ...(docs.get(ruta) ?? {}), ...d }); escrito.push({ ruta, datos: d }); }, collection: (s: string) => col(`${ruta}/${s}`) });
  const consulta = (nombre: string, filtros: [string, string, any][], lim: number): any => ({
    where: (c: string, op: string, v: any) => consulta(nombre, [...filtros, [c, op, v]], lim),
    orderBy: () => consulta(nombre, filtros, lim),
    limit: (n: number) => consulta(nombre, filtros, n),
    async get() {
      const filas = [...docs.keys()].filter((k) => k.startsWith(`${nombre}/`) && k.split("/").length === nombre.split("/").length + 1).filter((k) => filtros.every(([c, op, v]) => { const x = docs.get(k)?.[c]; return op === "==" ? x === v : op === "!=" ? x !== v : op === "in" ? v.includes(x) : true; })).slice(0, lim).map(snap);
      return { empty: filas.length === 0, size: filas.length, docs: filas, forEach: (f: any) => filas.forEach(f) };
    },
  });
  const col = (nombre: string): any => ({ ...consulta(nombre, [], 1e9), doc: (id?: string) => refDoc(`${nombre}/${id ?? `auto${++auto}`}`), async add(d: any) { const r = refDoc(`${nombre}/auto${++auto}`); await r.set(d); return r; } });
  const db: any = { collection: col, doc: (ruta: string) => refDoc(ruta), async runTransaction(fn: any) { const pend: (() => Promise<void>)[] = []; const tx = { get: (r: any) => r.get(), set: (r: any, d: any, o?: any) => { pend.push(() => r.set(d, o)); return tx; }, update: (r: any, d: any) => { pend.push(() => r.update(d)); return tx; }, create: (r: any, d: any) => { pend.push(() => r.set(d)); return tx; } }; const out = await fn(tx); for (const p of pend) await p(); return out; } };
  return { db, docs, escrito };
}
/** Un `res` de express que guarda el estado y el cuerpo. */
function res() {
  const r: any = { code: 200, cuerpo: undefined as any };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: any) => { r.cuerpo = b; return r; };
  r.send = (b: any) => { r.cuerpo = b; return r; };
  r.setHeader = () => r; r.set = () => r; r.end = () => r;
  return r;
}

// ─── N1 y N2 · manejarAvisos ───────────────────────────────────────────────────────────────────────────────────────────────────
type Turno = { id: string; date: string; time: string; status: string; customerEmail?: string; customerName: string; serviceId: string; lang?: string };
const MANANA: Turno[] = [
  { id: "a", date: "2026-10-16", time: "11:00", status: "confirmed", customerEmail: "a@example.com", customerName: "Аня", serviceId: "cut", lang: "ru" },
  { id: "b", date: "2026-10-16", time: "09:00", status: "pending", customerEmail: "b@example.com", customerName: "נועה", serviceId: "blowdry" },
  { id: "c", date: "2026-10-16", time: "12:00", status: "cancelled", customerEmail: "c@example.com", customerName: "רוני", serviceId: "cut" },
  { id: "d", date: "2026-10-16", time: "13:00", status: "confirmed", customerName: "דנה", serviceId: "cut" },
  { id: "e", date: "2026-10-16", time: "14:00", status: "confirmed", customerEmail: "e@example.com", customerName: "יעל", serviceId: "cut" },
];
function depsAvisos(o: { ahora: string; enviados?: string[]; sinClave?: boolean; turnos?: Record<string, Turno[]> }) {
  const enviados: any[] = [], registrados: any[] = [], pedidas: string[] = [];
  const deps = {
    secreto: "s3creto", ahora: new Date(o.ahora), idiomaBase: "he" as const, negocio: { nombre: "הסלון" }, remitente: "הסלון <noreply@arzac.studio>", emailDuena: "duena@example.com",
    nombreServicio: (id: string, idioma: string) => `${id}-${idioma}`,
    async turnosDe(fecha: string) { pedidas.push(fecha); return (o.turnos ?? { "2026-10-16": MANANA, "2026-10-15": [{ id: "h1", date: "2026-10-15", time: "15:00", status: "confirmed", customerName: "דנה", serviceId: "cut", customerEmail: "h1@example.com" }, { id: "h2", date: "2026-10-15", time: "09:30", status: "confirmed", customerName: "מיכל", serviceId: "cut", customerEmail: "h2@example.com" }] })[fecha] ?? []; },
    async avisosDe(_tipo: string, refs: string[]) { return refs.filter((r) => (o.enviados ?? []).includes(r)); },
    async enviar(m: any) { enviados.push(m); return o.sinClave ? null : { id: `re_${enviados.length}` }; },
    async registrar(l: any) { registrados.push(l); },
  };
  return { deps, enviados, registrados, pedidas };
}
const AUT = { headers: { authorization: "Bearer s3creto" }, query: {} };

test("los recordatorios: src/lib/api/avisos-handler.ts exporta manejarAvisos, que sin la clave del cron responde 401; antes de las 18:00 de Asia/Jerusalem no manda recordatorios; desde las 18:00 manda uno a cada turno de mañana confirmado o pendiente con email, ninguno a uno cancelado, sin email o ya avisado, cada uno en el idioma del turno y con el remitente de la web, y registra cada aviso como reminder con su estado, el id del turno y el id de Resend; una segunda corrida no repite ninguno; sin clave de email queda en cola; y con la clave y ?fecha= manda los de esa fecha", async () => {
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/api/avisos-handler.ts");
    assert.equal(typeof m?.manejarAvisos, "function", "falta src/lib/api/avisos-handler.ts con manejarAvisos (D-300): hoy el recordatorio no sale por ningún canal");
    type Corrida = { r: any; enviados: any[]; registrados: any[]; pedidas: string[] };
    const correr = (req: any, o: Parameters<typeof depsAvisos>[0]): Promise<Corrida> => { const x = depsAvisos(o); return m!.manejarAvisos(req, x.deps).then((r: any) => ({ r, ...x })); };
    // Sin clave.
    for (const h of [{}, { authorization: "Bearer otra" }]) assert.equal((await correr({ headers: h, query: {} }, { ahora: "2026-10-15T15:05:00Z" })).r.status, 401, "sin la clave del cron, 401");
    // 17:30 en Israel (14:30 UTC): nada.
    const antes = await correr(AUT, { ahora: "2026-10-15T14:30:00Z" });
    assert.equal(antes.enviados.filter((e) => e.to !== "duena@example.com").length, 0, "antes de las 18:00 de Asia/Jerusalem no manda recordatorios");
    // 18:05 en Israel (15:05 UTC): mañana es el 16.
    const r = await correr(AUT, { ahora: "2026-10-15T15:05:00Z", enviados: ["e"] });
    assert.ok(r.pedidas.includes("2026-10-16"), `desde las 18:00 pide los turnos de mañana, 2026-10-16 (pidió ${r.pedidas.join(", ")})`);
    const rec = r.enviados.filter((e) => e.to !== "duena@example.com");
    assert.deepEqual(rec.map((e) => e.to).sort(), ["a@example.com", "b@example.com"], "manda a los confirmados o pendientes con email, no al cancelado, al sin email ni al ya avisado");
    assert.deepEqual([...r.r.json.recordatorios].sort(), ["a", "b"], "json.recordatorios = los turnos avisados");
    const aRu = rec.find((e) => e.to === "a@example.com"), bHe = rec.find((e) => e.to === "b@example.com");
    assert.match(aRu.html, /lang="ru"/, "el del turno en ruso, en ruso");
    assert.match(aRu.subject + aRu.html, /[А-Яа-я]/, "con texto en ruso");
    assert.match(bHe.html, /lang="he"/, "el del turno sin idioma, en el idioma base");
    assert.ok(rec.every((e) => e.from === "הסלון <noreply@arzac.studio>"), "con el remitente de la web");
    const logs = r.registrados.filter((l) => l.type === "reminder");
    assert.deepEqual(logs.map((l) => `${l.refId}:${l.status}`).sort(), ["a:sent", "b:sent"], "registra cada aviso como reminder, sent, con el id del turno");
    assert.ok(logs.every((l) => /^re_\d+$/.test(l.providerMessageId ?? "")), "y el id de Resend que devolvió el envío");
    assert.ok(logs.every((l) => l.channel === "email" && l.recipient && l.createdAt instanceof Date), "cada registro con channel email, el destinatario y la fecha");
    // Otra vez, ya avisados.
    const otra = await correr(AUT, { ahora: "2026-10-15T16:05:00Z", enviados: ["a", "b", "e"] });
    assert.equal(otra.enviados.filter((e) => e.to !== "duena@example.com").length, 0, "una segunda corrida no repite ninguno");
    // 00:30 del 16 en Israel (21:30 UTC del 15): mañana es el 17, no el 16.
    const noche = await correr(AUT, { ahora: "2026-10-15T21:30:00Z" });
    assert.ok(noche.pedidas.includes("2026-10-17") && !noche.pedidas.includes("2026-10-16"), `la fecha es la de Asia/Jerusalem: a las 00:30 del 16, mañana es el 17 (pidió ${noche.pedidas.join(", ")})`);
    // Sin clave de email.
    const sin = await correr(AUT, { ahora: "2026-10-15T15:05:00Z", sinClave: true });
    assert.ok(sin.registrados.filter((l) => l.type === "reminder").every((l) => l.status === "queued" && !l.providerMessageId) && sin.registrados.some((l) => l.type === "reminder"), "sin clave de email, cada aviso queda en cola (queued)");
    // ?fecha= con la clave, a cualquier hora.
    const f = await correr({ ...AUT, query: { fecha: "2026-10-20" } }, { ahora: "2026-10-15T07:00:00Z", turnos: { "2026-10-20": [{ id: "z", date: "2026-10-20", time: "10:00", status: "confirmed", customerEmail: "z@example.com", customerName: "טל", serviceId: "cut" }] } });
    assert.deepEqual(f.r.json.recordatorios, ["z"], "con la clave y ?fecha= manda los de esa fecha");
  });
});

test("el resumen diario: manejarAvisos, desde las 08:00 de Asia/Jerusalem y una sola vez por fecha local, manda a la dueña los turnos del día por hora en el idioma base y lo registra; antes de las 08:00, nada; y vercel.json tiene un solo cron, /api/cron/avisos cada hora, sin /api/daily-digest, ruta que existe en api/index.ts y en server.ts", async () => {
  const vercel = JSON.parse(fuente("vercel.json"));
  assert.deepEqual(vercel.crons, [{ path: "/api/cron/avisos", schedule: "0 * * * *" }], `vercel.json: un solo cron, /api/cron/avisos cada hora (hoy ${JSON.stringify(vercel.crons)})`);
  for (const f of ["api/index.ts", "server.ts"]) assert.match(fuente(f), /["'`]\/api\/cron\/avisos["'`]/, `${f} registra /api/cron/avisos`);
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/api/avisos-handler.ts");
    assert.equal(typeof m?.manejarAvisos, "function", "falta manejarAvisos (D-301)");
    const correr = (o: Parameters<typeof depsAvisos>[0]): Promise<{ r: any; enviados: any[]; registrados: any[]; pedidas: string[] }> => { const x = depsAvisos(o); return m!.manejarAvisos(AUT, x.deps).then((r: any) => ({ r, ...x })); };
    const antes = await correr({ ahora: "2026-10-15T04:30:00Z" }); // 07:30 en Israel
    assert.equal(antes.enviados.filter((e) => e.to === "duena@example.com").length, 0, "antes de las 08:00, nada");
    const r = await correr({ ahora: "2026-10-15T05:10:00Z" }); // 08:10 en Israel
    const resumen = r.enviados.filter((e) => e.to === "duena@example.com");
    assert.equal(resumen.length, 1, "desde las 08:00 manda un resumen a la dueña");
    assert.equal(r.r.json.resumen, true);
    assert.match(resumen[0].html, /lang="he"/, "en el idioma base");
    const h = resumen[0].html as string;
    assert.ok(h.indexOf("09:30") > -1 && h.indexOf("09:30") < h.indexOf("15:00"), "con los turnos del día por hora (09:30 antes que 15:00)");
    assert.ok(r.registrados.some((l) => l.type === "digest" && l.refId === "digest-2026-10-15" && l.status === "sent"), "lo registra (digest, digest-2026-10-15)");
    const otra = await correr({ ahora: "2026-10-15T06:10:00Z", enviados: ["digest-2026-10-15"] });
    assert.equal(otra.enviados.filter((e) => e.to === "duena@example.com").length, 0, "una sola vez por fecha local");
  });
});

// ─── N3 · los emails ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test("los emails en el idioma de la reserva: src/lib/emails-turno.ts exporta emailTurno, que escribe la confirmación, la cancelación, el cambio de hora y el recordatorio en hebreo, inglés, ruso y árabe —con dir rtl en hebreo y árabe, el servicio, la fecha en ese idioma y la hora, y sin palabras en inglés en los otros tres—, y el aviso de nuevo turno, el resumen y la invitación a la dueña; y notify-booking manda a la clienta en el idioma de su turno y a la dueña en el idioma base", async () => {
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/emails-turno.ts");
    assert.equal(typeof m?.emailTurno, "function", "falta src/lib/emails-turno.ts con emailTurno (D-302): hoy todos los emails salen en inglés");
    const fallas: string[] = [];
    const fecha = "2026-10-18";
    for (const tipo of ["confirmacion", "cancelacion", "cambio", "recordatorio"]) {
      const asuntos = new Set<string>();
      for (const idioma of IDIOMAS) {
        const servicio = { he: "תספורת", en: "Haircut", ru: "Стрижка", ar: "قص الشعر" }[idioma];
        const e = m!.emailTurno(tipo, idioma, { negocio: { he: "הסלון", en: "The Salon", ru: "Салон", ar: "الصالون" }[idioma], cliente: "X", servicio, fecha, hora: "10:00" });
        asuntos.add(e.subject);
        const mes = new Intl.DateTimeFormat(idioma, { month: "long" }).format(new Date(2026, 9, 18));
        if (!new RegExp(`lang="${idioma}"`).test(e.html)) fallas.push(`${tipo} ${idioma}: lang="${idioma}"`);
        if (!new RegExp(`dir="${idioma === "he" || idioma === "ar" ? "rtl" : "ltr"}"`).test(e.html)) fallas.push(`${tipo} ${idioma}: dir`);
        if (!e.html.includes(servicio) || !e.html.includes("10:00") || !e.html.includes("18") || !e.html.includes(mes)) fallas.push(`${tipo} ${idioma}: el servicio, la hora y la fecha en ese idioma («18» y «${mes}»)`);
        if (idioma !== "en" && !SIN_LATIN(e.subject + " " + e.html)) fallas.push(`${tipo} ${idioma}: sin palabras en inglés`);
      }
      if (asuntos.size !== 4) fallas.push(`${tipo}: un asunto propio en cada idioma`);
    }
    for (const tipo of ["nuevoTurno", "resumen", "invitacion"]) {
      const e = m!.emailTurno(tipo, "he", { negocio: "הסלון", cliente: "נועה", servicio: "תספורת", fecha, hora: "10:00", turnos: [{ hora: "10:00", cliente: "נועה", servicio: "תספורת" }], enlace: "https://x.arzac.studio/admin" });
      if (!/lang="he"/.test(e.html) || !SIN_LATIN(e.subject + " " + e.html)) fallas.push(`${tipo}: en hebreo`);
      if (tipo === "invitacion" && !e.html.includes("https://x.arzac.studio/admin")) fallas.push("invitacion: con el link al panel");
    }
    assert.deepEqual(fallas, [], `emailTurno:\n${fallas.join("\n")}`);

    // notify-booking: la clienta en el idioma de su turno, la dueña en el base.
    const nb = await cargar("src/lib/api/notify-booking-handler.ts");
    const config = { services: [{ id: "cut", name: "תספורת" }], staff: [{ id: "noa", name: "נועה" }], translations: { ru: { services: { cut: { name: "Стрижка" } } } } };
    const { db } = dbAdmin({ "appointments/t1": { clientId: "c1", customerName: "Аня", customerEmail: "anya@example.com", serviceId: "cut", staffId: "noa", date: fecha, time: "10:00", status: "confirmed", lang: "ru" }, "config/c1": config });
    const enviados: any[] = [];
    const h = nb!.createNotifyBookingHandler({ clientId: "c1", idiomaBase: "he", loadDb: async () => db, channels: async () => ({ new_booking_owner: "email", booking_confirmation_customer: "email" }), deliver: async (msg: any) => { enviados.push(msg); return { status: "sent", providerMessageId: `re_${enviados.length}` }; }, ownerEmail: () => "duena@example.com", customerHtml: () => "" });
    const rr = res();
    await h({ body: { appointmentId: "t1" } }, rr);
    const cli = enviados.find((x) => x.to === "anya@example.com"), duena = enviados.find((x) => x.to === "duena@example.com");
    assert.ok(cli && duena, `notify-booking manda a la clienta y a la dueña (status ${rr.code}: ${JSON.stringify(rr.cuerpo)})`);
    assert.match(cli.html, /lang="ru"/, "a la clienta, en el idioma de su turno (ru)");
    assert.match(cli.subject, /[А-Яа-я]/, "con el asunto en ruso");
    assert.match(duena.html, /lang="he"/, "a la dueña, en el idioma base (he)");
    assert.ok(SIN_LATIN(duena.subject), `el asunto de la dueña sin inglés (hoy «${duena.subject}»)`);
  });
});

// ─── N4 · POST /api/book respeta el horario y guarda el idioma ───────────────────────────────────────────────────────────────
test("el servidor respeta el horario y guarda el idioma: POST /api/book rechaza un turno en un día cerrado de esa persona, en un día libre de dateOverrides, en una fecha de blockedDates, fuera de su horario o en una pausa, y acepta uno dentro; y guarda en el turno el idioma de la reserva (lang), el base si no viene uno válido", async () => {
  await conModulos(async (cargar) => {
    const bh = await cargar("src/lib/api/booking-handler.ts");
    assert.equal(typeof bh?.createBookingHandler, "function", "src/lib/api/booking-handler.ts exporta createBookingHandler");
    const dia = (abierto: boolean) => ({ isOpen: abierto, hours: { start: "09:00", end: "18:00" }, breaks: abierto ? [{ start: "13:00", end: "13:30", label: "הפסקה" }] : [] });
    const schedule = { sunday: dia(true), monday: dia(true), tuesday: dia(true), wednesday: dia(true), thursday: dia(true), friday: dia(true), saturday: dia(false) };
    const config = { services: [{ id: "cut", name: "תספורת", price: 100, duration: 60 }], staff: [{ id: "noa", name: "נועה", schedule, blockedDates: ["2026-10-21"], dateOverrides: { "2026-10-20": { type: "dayOff" } } }] };
    const reservar = async (o: Record<string, any>) => {
      const { db, escrito } = dbAdmin({ "config/c1": config });
      const h = bh!.createBookingHandler({ clientId: "c1", idiomaBase: "he", loadContext: async () => ({ db, FieldValue: { serverTimestamp: () => "TS" } }) });
      const r = res();
      await h({ body: { customerName: "נועה", customerEmail: "n@example.com", customerPhone: "0500000000", serviceId: "cut", staffId: "noa", duration: 60, date: "2026-10-18", time: "10:00", ...o } }, r);
      return { code: r.code, cuerpo: r.cuerpo, turno: escrito.find((e) => e.ruta.startsWith("appointments/"))?.datos };
    };
    const casos: [string, Record<string, any>][] = [["un día cerrado (sábado 2026-10-17)", { date: "2026-10-17" }], ["un día libre de dateOverrides (2026-10-20)", { date: "2026-10-20" }], ["una fecha de blockedDates (2026-10-21)", { date: "2026-10-21" }], ["fuera de su horario (18:30)", { time: "18:30" }], ["en una pausa (13:00)", { time: "13:00" }]];
    const fallas: string[] = [];
    for (const [que, o] of casos) { const r = await reservar(o); if (r.code < 400 || r.turno) fallas.push(`rechaza ${que} (hoy ${r.code}${r.turno ? ", y guardó el turno" : ""})`); }
    const ok = await reservar({ lang: "ru" });
    if (ok.code !== 200 || !ok.turno) fallas.push(`acepta uno dentro (domingo 10:00): ${ok.code} ${JSON.stringify(ok.cuerpo)}`);
    else if (ok.turno.lang !== "ru") fallas.push(`guarda lang "ru" (hoy ${JSON.stringify(ok.turno.lang)})`);
    const malo = await reservar({ lang: "xx" });
    if (malo.turno && malo.turno.lang !== "he") fallas.push(`con un lang inválido guarda el base "he" (hoy ${JSON.stringify(malo.turno.lang)})`);
    assert.deepEqual(fallas, [], `POST /api/book:\n${fallas.join("\n")}`);
  });
});

// ─── N5 · la entrada del equipo sin pantalla ────────────────────────────────────────────────────────────────────────────────
test("la entrada del equipo, sin pantalla: src/lib/admin-auth.ts exporta rolDeEntrada, que da owner a adminEmail, el rol de una invitación de este cliente que no está quitada, y nada a los demás; activarInvitacion pasa una invitación pendiente a active con acceptedAt; GET /api/admin/me existe en api/index.ts y en server.ts; e invitar a alguien manda el email de invitación de emailTurno", async () => {
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/admin-auth.ts");
    assert.equal(typeof m?.rolDeEntrada, "function", "src/lib/admin-auth.ts exporta rolDeEntrada (D-305)");
    const r = (o: any) => m!.rolDeEntrada({ adminEmail: "duena@example.com", clientId: "c1", ...o });
    assert.equal(r({ email: "Duena@Example.com" }), "owner", "adminEmail (sin distinguir mayúsculas) → owner");
    assert.equal(r({ email: "e@example.com", invitacion: { clientId: "c1", role: "staff", status: "pending" } }), "staff", "una invitación pendiente de este cliente → su rol");
    assert.equal(r({ email: "g@example.com", invitacion: { clientId: "c1", role: "manager", status: "active" } }), "manager");
    assert.equal(r({ email: "x@example.com", invitacion: { clientId: "c1", role: "staff", status: "removed" } }), null, "una invitación quitada → nada");
    assert.equal(r({ email: "y@example.com", invitacion: { clientId: "otro", role: "staff", status: "active" } }), null, "una invitación de otro cliente → nada");
    assert.equal(r({ email: "z@example.com" }), null, "sin invitación → nada");
    assert.equal(typeof m!.activarInvitacion, "function", "src/lib/admin-auth.ts exporta activarInvitacion");
    const ahora = new Date("2026-10-15T10:00:00Z");
    const act = m!.activarInvitacion({ email: "e@example.com", clientId: "c1", role: "staff", status: "pending" }, ahora);
    assert.equal(act.status, "active"); assert.equal(new Date(act.acceptedAt).getTime(), ahora.getTime(), "acceptedAt = ahora"); assert.equal(act.role, "staff");
  });
  const tsPkg = "typescript";
  const ts: any = (await import(tsPkg)).default;
  for (const f of ["api/index.ts", "server.ts"]) {
    const texto = fuente(f);
    assert.match(texto, /app\.get\(\s*["'`]\/api\/admin\/me["'`]/, `${f} registra GET /api/admin/me`);
    const src = ts.createSourceFile(f, texto, ts.ScriptTarget.Latest, true);
    let invitar = "";
    const visitar = (n: any) => { if (ts.isCallExpression(n) && n.expression.getText(src) === "app.post" && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === "/api/admin/users") invitar = n.getText(src); ts.forEachChild(n, visitar); };
    visitar(src);
    assert.ok(invitar, `${f} registra POST /api/admin/users`);
    assert.match(invitar, /emailTurno\(\s*["'`]invitacion["'`]/, `${f}: invitar manda el email de invitación de emailTurno`);
  }
});
