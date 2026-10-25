// CRM-05 · S7, P1–P7 (T) · el cobro que no se duplica y se puede corregir, los montos fuera del diálogo y cancelar y mover por el
// servidor (D-363, D-364, D-365; AUD 3, AUD 14). Sesión A (2026-10-25): tests rojos.
//
// Medido en T 8b2859c (= 6a8dbb2): el PATCH de cobro acepta sólo `{ montoCents, paymentMethod, precioCents? }` con `montoCents >= 1`,
// lo SUMA a lo guardado sin id de cobro y sin mirar `status` ni el rol (`crm-appointments-handler.ts:52`, `:63-72`, `cobros.ts:34`): un
// reintento cobra doble y un turno cancelado se cobra; no hay lista de cobros ni forma de revertir; el alta de clienta lee el monto con
// `parseFloat` en un `<input type="number">` (`CustomersTab.tsx:141`) y el pago sin turno con `Number()` (`PaymentsTab.tsx:217`); y
// cancelar y mover desde la agenda escriben por el SDK con `healImportedFields`, que cambia «o'neil@…» por `import_<id>@noemail.local`
// (`AdminDashboard.tsx:593-608`, `crm-appointments.ts:157-158`, `db.ts:121-135`, `:443`). Contrato (§ Interfaz de la hoja): el cobro
// manda `{ id, montoCents, paymentMethod, precioCents?, revierte?, motivo? }` al mismo PATCH; el turno guarda `cobros`
// (`{ id, montoCents, metodo, at, por, revierte?, motivo? }`) y `cobrosDe(turno)` de `src/lib/cobros.ts` lee la lista (con el cobro
// heredado de un turno viejo). El servidor se prueba con `createCrmAppointmentsHandlers` sobre `dbMemoria` (transacciones optimistas,
// `Promise.all`); la pantalla, con el arnés `_crm.ts` (copia del de CRM-04). Ninguna espera es de tiempo fijo.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENTE, HOY, MANANA, campo, conCrm, conModulos, quieta, salon, tocar } from "./_crm.ts";
import { dbMemoria } from "./_comun.ts";

const C = "c1";
const CORTE = { id: "cut", name: "תספורת", price: 200, duration: 60 };
const ts = (iso: string) => new Date(iso);
function res() {
  const r: any = { code: 200, cuerpo: undefined as any };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: any) => { r.cuerpo = b; return r; };
  r.send = (b: any) => { r.cuerpo = b; return r; };
  r.setHeader = () => r; r.set = () => r; r.end = () => r;
  return r;
}
const turno = (x: Record<string, any> = {}): Record<string, any> => ({ clientId: C, customerName: "נועה", customerEmail: "noa@salon.co.il", customerPhone: "050-000-0001", serviceId: "cut", staffId: "s1", date: "2026-10-15", time: "10:00", duration: 60, status: "confirmed", paymentStatus: "pending", ...x });
const cobro = (id: string, montoCents: number, metodo: string, at: string, x: Record<string, any> = {}) => ({ id, montoCents, metodo, at: ts(at), por: "owner@salon.co.il", ...x });

type Servidor = { mem: ReturnType<typeof dbMemoria>; pedir: (body: any, o?: { id?: string; rol?: string }) => Promise<any>; m: Record<string, any> };
/** El PATCH de turnos de T (`createCrmAppointmentsHandlers`, el que llaman los dos runtimes) sobre un Firestore en memoria. */
async function conServidor(fallas: string[], docs: Record<string, any>, fn: (s: Servidor) => Promise<void>) {
  await conModulos(async (cargar) => {
    const h = await cargar("src/lib/api/crm-appointments-handler.ts");
    const m = (await cargar("src/lib/cobros.ts")) ?? {};
    if (typeof h?.createCrmAppointmentsHandlers !== "function") { fallas.push("src/lib/api/crm-appointments-handler.ts exporta createCrmAppointmentsHandlers"); return; }
    const mem = dbMemoria({ [`config/${C}`]: { services: [CORTE] }, ...docs });
    const pedir = async (body: any, o: { id?: string; rol?: string } = {}) => {
      const rol = o.rol ?? "owner";
      const { patch } = h.createCrmAppointmentsHandlers({ clientId: C, loadDb: async () => mem.db, authenticate: async () => ({ email: `${rol}@salon.co.il`, uid: `u-${rol}`, role: rol }) });
      const r = res();
      try { await patch({ params: { id: o.id ?? "a1" }, body, headers: {}, query: {} }, r); } catch (e) { r.code = -1; r.cuerpo = String((e as Error).message); }
      return r;
    };
    await fn({ mem, pedir, m });
  });
}
const conId = (lista: any, id: string) => (Array.isArray(lista) ? lista.filter((c: any) => c?.id === id).length : 0);
const ms = (v: any) => (v instanceof Date ? v.getTime() : typeof v?.toDate === "function" ? v.toDate().getTime() : typeof v?.toMillis === "function" ? v.toMillis() : typeof v === "string" ? Date.parse(v) : NaN);
const json = (v: any) => JSON.stringify(v)?.slice(0, 300);
/** Espera, cuadro a cuadro de la página, a que `cond` se cumpla (como mucho 15 s) y después a que la página quede quieta. */
async function hasta(page: any, cond: () => boolean | Promise<boolean>) {
  const t0 = Date.now();
  while (!(await cond()) && Date.now() - t0 < 15000) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(true)))).catch(() => {});
  await quieta(page);
}

test("el PATCH de cobro rechaza con 403 a staff cuando el cobro revierte otro (montoCents negativo), y lo acepta de owner y manager", async () => {
  const fallas: string[] = [];
  const docs = { "appointments/a1": turno({ amountPaidCents: 5000, paymentStatus: "deposit_paid", paymentMethod: "cash", paidAt: ts("2026-10-12T12:00:00+03:00"), cobros: [cobro("k1", 5000, "cash", "2026-10-12T12:00:00+03:00")] }) };
  const reversion = { id: "r1", montoCents: -5000, paymentMethod: "cash", revierte: "k1", motivo: "סכום שגוי" };
  for (const rol of ["staff", "owner", "manager"]) {
    await conServidor(fallas, docs, async ({ mem, pedir }) => {
      const antes = json(mem.doc("appointments/a1"));
      const r = await pedir(reversion, { rol });
      if (rol === "staff") {
        if (r.code !== 403) fallas.push(`staff revierte un cobro: 403 (hoy ${r.code} ${json(r.cuerpo)})`);
        if (json(mem.doc("appointments/a1")) !== antes) fallas.push("staff revierte un cobro: el turno no cambia");
      } else {
        if (r.code !== 200) fallas.push(`${rol} revierte un cobro: 200 (hoy ${r.code} ${json(r.cuerpo)})`);
        if (mem.doc("appointments/a1")?.amountPaidCents !== 0) fallas.push(`${rol} revierte el cobro de 5000: lo cobrado queda en 0 (hoy ${mem.doc("appointments/a1")?.amountPaidCents})`);
      }
    });
  }
  // La otra dirección: la empleada cobra (D-362, L4).
  await conServidor(fallas, { "appointments/a1": turno() }, async ({ mem, pedir }) => {
    const r = await pedir({ id: "k1", montoCents: 5000, paymentMethod: "cash" }, { rol: "staff" });
    if (r.code !== 200 || mem.doc("appointments/a1")?.amountPaidCents !== 5000) fallas.push(`staff cobra 5000: 200 y 5000 cobrado (hoy ${r.code} ${json(r.cuerpo)}, ${mem.doc("appointments/a1")?.amountPaidCents})`);
  });
  assert.deepEqual(fallas, [], `S7 · corregir un cobro es de la dueña y la gerente:\n${fallas.join("\n")}`);
});

test("el mismo cobro `{ id: \"k1\", montoCents: 5000 }` mandado dos veces, en serie y a la vez, deja 5000 cobrado y un solo cobro en el turno; \"k1\" y \"k2\" de 5000 dejan 10000", async () => {
  const fallas: string[] = [];
  const k1 = { id: "k1", montoCents: 5000, paymentMethod: "cash" };
  const verificar = (desc: string, mem: any, cobrado: number, ids: Record<string, number>) => {
    const t = mem.doc("appointments/a1");
    if (t?.amountPaidCents !== cobrado) fallas.push(`${desc}: ${cobrado} cobrado (hoy ${t?.amountPaidCents})`);
    for (const [id, n] of Object.entries(ids)) if (conId(t?.cobros, id) !== n) fallas.push(`${desc}: ${n} cobro «${id}» en la lista del turno (hoy ${conId(t?.cobros, id)}; cobros ${json(t?.cobros)})`);
  };
  await conServidor(fallas, { "appointments/a1": turno() }, async ({ mem, pedir }) => {
    const a = await pedir(k1), b = await pedir(k1);
    for (const [r, n] of [[a, 1], [b, 2]] as const) if (r.code !== 200) fallas.push(`en serie · el envío ${n} de k1 responde 200 (hoy ${r.code} ${json(r.cuerpo)})`);
    verificar("k1 dos veces en serie", mem, 5000, { k1: 1 });
  });
  await conServidor(fallas, { "appointments/a1": turno() }, async ({ mem, pedir }) => {
    const rs = await Promise.all([pedir(k1), pedir(k1)]);
    rs.forEach((r, i) => { if (r.code !== 200) fallas.push(`a la vez · el envío ${i + 1} de k1 responde 200 (hoy ${r.code} ${json(r.cuerpo)})`); });
    verificar("k1 dos veces a la vez", mem, 5000, { k1: 1 });
  });
  await conServidor(fallas, { "appointments/a1": turno() }, async ({ mem, pedir }) => {
    const rs = await Promise.all([pedir(k1), pedir({ id: "k2", montoCents: 5000, paymentMethod: "card" })]);
    rs.forEach((r, i) => { if (r.code !== 200) fallas.push(`k1 y k2 · el envío ${i + 1} responde 200 (hoy ${r.code} ${json(r.cuerpo)})`); });
    verificar("k1 y k2 a la vez", mem, 10000, { k1: 1, k2: 1 });
  });
  // El navegador: el diálogo genera el id al abrirse y lo conserva en el reintento (D-363); otro diálogo, otro id.
  await conCrm(async (crm) => {
    let patches = 0;
    try {
      const a = await crm.abrir({ vista: "telefono", api: (metodo, ruta) => (metodo === "PATCH" && ruta.startsWith("/api/crm/appointments/") ? (++patches === 1 ? { status: 503, json: { error: "Appointment update failed." } } : { status: 200, json: { success: true } }) : undefined) });
      try {
        await a.irA("missions");
        const cobrarEn = async (turnoId: string) => {
          const ok = await a.page.evaluate((id: string) => { const b = [...document.querySelectorAll(`[data-turno="${id}"] button`)].find((x) => (x.textContent ?? "").trim() === "סמן כשולם" && x.getBoundingClientRect().width > 0) as HTMLElement | undefined; b?.click(); return !!b; }, turnoId);
          await quieta(a.page);
          const monto = ok ? await campo(a.page, "סכום", "[role=dialog]") : null;
          if (!monto) { fallas.push(`el turno ${turnoId} ofrece «סמן כשולם» y su diálogo tiene «סכום»`); return false; }
          await monto.fill("50");
          return true;
        };
        const guardarYEsperar = async (n: number) => {
          await tocar(a.page, "שמירה", "[role=dialog]");
          await hasta(a.page, () => a.pedidos.filter((p) => p.metodo === "PATCH").length >= n);
        };
        if (await cobrarEn("t1")) {
          await guardarYEsperar(1);
          await guardarYEsperar(2); // el primero respondió 503: el diálogo sigue abierto y se reintenta
          const [p1, p2] = a.pedidos.filter((p) => p.metodo === "PATCH" && p.ruta.startsWith("/api/crm/appointments/t1"));
          if (!p1 || !p2) fallas.push(`el reintento manda el cobro dos veces (PATCH a t1: ${a.pedidos.filter((p) => p.metodo === "PATCH").length})`);
          else {
            if (typeof p1.cuerpo?.id !== "string" || !p1.cuerpo.id) fallas.push(`el navegador manda el id del cobro (mandó ${json(p1.cuerpo)})`);
            else if (p2.cuerpo?.id !== p1.cuerpo.id) fallas.push(`el reintento manda el mismo id (${p1.cuerpo.id} y ${p2.cuerpo?.id})`);
          }
          if (await cobrarEn("t3")) {
            await guardarYEsperar(3);
            const p3 = a.pedidos.filter((p) => p.metodo === "PATCH" && p.ruta.startsWith("/api/crm/appointments/t3"))[0];
            if (!p3) fallas.push("el cobro de otro turno va al servidor (PATCH a t3)");
            else if (p1?.cuerpo?.id && p3.cuerpo?.id === p1.cuerpo.id) fallas.push(`otro cobro lleva otro id (los dos ${p3.cuerpo.id})`);
          }
        }
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`el cobro desde el panel: ${(e as Error).message.split("\n")[0]}`); }
  });
  assert.deepEqual(fallas, [], `P1 · el mismo cobro no suma dos veces:\n${fallas.join("\n")}`);
});

test("un turno con una seña de 5000 en efectivo y un resto de 10000 con tarjeta guarda los dos cobros con su método y su fecha, y la agenda muestra los dos en el turno", async () => {
  const fallas: string[] = [];
  await conServidor(fallas, { "appointments/a1": turno({ serviceId: "cut" }) }, async ({ mem, pedir }) => {
    const a = await pedir({ id: "k1", montoCents: 5000, paymentMethod: "cash" });
    const b = await pedir({ id: "k2", montoCents: 10000, paymentMethod: "card" });
    for (const [r, n] of [[a, "la seña"], [b, "el resto"]] as const) if (r.code !== 200) fallas.push(`${n} responde 200 (hoy ${r.code} ${json(r.cuerpo)})`);
    const t = mem.doc("appointments/a1");
    const lista: any[] = Array.isArray(t?.cobros) ? t.cobros : [];
    const k1 = lista.find((c) => c?.id === "k1"), k2 = lista.find((c) => c?.id === "k2");
    if (!k1 || k1.montoCents !== 5000 || k1.metodo !== "cash" || !Number.isFinite(ms(k1.at))) fallas.push(`el turno guarda la seña { id: k1, montoCents: 5000, metodo: cash, at } (hoy ${json(k1 ?? lista)})`);
    if (!k2 || k2.montoCents !== 10000 || k2.metodo !== "card" || !Number.isFinite(ms(k2.at))) fallas.push(`el turno guarda el resto { id: k2, montoCents: 10000, metodo: card, at } (hoy ${json(k2 ?? lista)})`);
    if (t?.amountPaidCents !== 15000) fallas.push(`lo cobrado es 15000 (hoy ${t?.amountPaidCents})`);
  });
  // La agenda: גלית (t1) con la seña del 12.10 en efectivo y el resto del 15.10 con tarjeta.
  const datos = salon();
  Object.assign(datos["appointments/t1"], {
    amountPaidCents: 15000, paymentStatus: "paid", paymentMethod: "card", paidAt: { __ts: Date.parse("2026-10-15T09:30:00+03:00") },
    cobros: [
      { id: "k1", montoCents: 5000, metodo: "cash", at: { __ts: Date.parse("2026-10-12T12:00:00+03:00") }, por: "duena@example.com" },
      { id: "k2", montoCents: 10000, metodo: "card", at: { __ts: Date.parse("2026-10-15T09:30:00+03:00") }, por: "duena@example.com" },
    ],
  });
  await conCrm(async (crm) => {
    try {
      const a = await crm.abrir({ vista: "telefono", datos });
      try {
        await a.irA("missions");
        const leer = () => a.page.evaluate(() => { const li = document.querySelector('[data-turno="t1"]') as HTMLElement | null; const dlg = document.querySelector("[role=dialog]") as HTMLElement | null; return li ? `${li.innerText}\n${dlg?.innerText ?? ""}` : null; });
        let texto = await leer();
        const completo = (t: string | null) => !!t && /(^|\D)50(\D|$)/.test(t) && /(^|\D)100(\D|$)/.test(t) && t.includes("מזומן") && t.includes("כרטיס") && /12[./]10|12 ב?אוק/.test(t) && /15[./]10|15 ב?אוק/.test(t);
        if (texto !== null && !completo(texto)) {
          // Si el historial está plegado, se abre con el control del turno que lo despliega.
          const abrio = await a.page.evaluate(() => { const b = document.querySelector('[data-turno="t1"] [aria-expanded="false"]:not([aria-haspopup])') as HTMLElement | null; b?.click(); return !!b; });
          if (abrio) { await quieta(a.page); texto = await leer(); }
        }
        if (texto === null) fallas.push("la agenda de hoy muestra el turno de גלית (t1)");
        else if (!completo(texto)) fallas.push(`el turno de גלית muestra los dos cobros: ₪50 · מזומן · 12.10 y ₪100 · כרטיס · 15.10 (hoy «${texto.replace(/\s+/g, " ").slice(0, 200)}»)`);
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`la agenda: ${(e as Error).message.split("\n")[0]}`); }
  });
  assert.deepEqual(fallas, [], `P2 · la seña y el resto, cada uno con su método y su fecha:\n${fallas.join("\n")}`);
});

test("la dueña revierte un cobro con un motivo: el turno queda con lo cobrado menos ese monto, la lista conserva los dos cobros, repetir la reversión no cambia nada y revertir más de lo cobrado responde 409", async () => {
  const fallas: string[] = [];
  const docs = { "appointments/a1": turno({ amountPaidCents: 15000, paymentStatus: "paid", paymentMethod: "card", paidAt: ts("2026-10-15T09:30:00+03:00"), cobros: [cobro("k1", 5000, "cash", "2026-10-12T12:00:00+03:00"), cobro("k2", 10000, "card", "2026-10-15T09:30:00+03:00")] }) };
  await conServidor(fallas, docs, async ({ mem, pedir }) => {
    const reversion = { id: "r1", montoCents: -5000, paymentMethod: "cash", revierte: "k1", motivo: "נרשם פעמיים" };
    const r = await pedir(reversion);
    if (r.code !== 200) fallas.push(`la reversión de k1 responde 200 (hoy ${r.code} ${json(r.cuerpo)})`);
    const t = mem.doc("appointments/a1");
    if (t?.amountPaidCents !== 10000) fallas.push(`lo cobrado queda en 15000 − 5000 = 10000 (hoy ${t?.amountPaidCents})`);
    const lista: any[] = Array.isArray(t?.cobros) ? t.cobros : [];
    if (conId(lista, "k1") !== 1 || conId(lista, "k2") !== 1) fallas.push(`la lista conserva k1 y k2 (hoy ${json(lista)})`);
    const r1 = lista.find((c) => c?.id === "r1");
    if (!r1 || r1.montoCents !== -5000 || r1.revierte !== "k1" || r1.motivo !== "נרשם פעמיים") fallas.push(`la reversión queda en la lista con su monto, lo que revierte y su motivo (hoy ${json(r1 ?? lista)})`);
    const despues = json(mem.doc("appointments/a1"));
    const otra = await pedir(reversion);
    if (otra.code !== 200 || json(mem.doc("appointments/a1")) !== despues) fallas.push(`repetir la reversión r1 no cambia nada (hoy ${otra.code}; ${json(mem.doc("appointments/a1")?.cobros)})`);
    const escritasAntes = mem.escritas.length;
    const demasiado = await pedir({ id: "r2", montoCents: -20000, paymentMethod: "card", revierte: "k2", motivo: "החזר" });
    if (demasiado.code !== 409) fallas.push(`revertir 20000 con 10000 cobrado responde 409 (hoy ${demasiado.code} ${json(demasiado.cuerpo)})`);
    if (json(mem.doc("appointments/a1")) !== despues || mem.escritas.length !== escritasAntes) fallas.push("revertir más de lo cobrado no escribe");
  });
  assert.deepEqual(fallas, [], `P3 · corregir un cobro sin borrar nada:\n${fallas.join("\n")}`);
});

test("un turno sin `cobros` y con `amountPaidCents` 8000 se lee como un cobro heredado de 8000 con su `paymentMethod` y `paidAt`, y un cobro nuevo de 2000 lo deja en 10000", async () => {
  const fallas: string[] = [];
  const pagado = ts("2026-10-12T12:00:00+03:00");
  const viejo = turno({ amountPaidCents: 8000, paymentStatus: "deposit_paid", paymentMethod: "card", paidAt: pagado });
  await conServidor(fallas, { "appointments/a1": viejo }, async ({ mem, pedir, m }) => {
    if (typeof m.cobrosDe !== "function") { fallas.push("src/lib/cobros.ts exporta cobrosDe(turno)"); return; }
    const heredados: any[] = m.cobrosDe(viejo) ?? [];
    const h = heredados[0];
    if (heredados.length !== 1 || h?.montoCents !== 8000 || h?.metodo !== "card" || ms(h?.at) !== pagado.getTime()) fallas.push(`cobrosDe(turno viejo) da un cobro heredado { montoCents: 8000, metodo: card, at: paidAt } (hoy ${json(heredados)})`);
    const r = await pedir({ id: "k9", montoCents: 2000, paymentMethod: "cash" });
    if (r.code !== 200) fallas.push(`el cobro nuevo de 2000 responde 200 (hoy ${r.code} ${json(r.cuerpo)})`);
    const t = mem.doc("appointments/a1");
    if (t?.amountPaidCents !== 10000) fallas.push(`el cobro nuevo de 2000 deja 10000 cobrado (hoy ${t?.amountPaidCents})`);
    const lista: any[] = m.cobrosDe(t ?? {}) ?? [];
    const total = lista.reduce((s, c) => s + (Number(c?.montoCents) || 0), 0);
    if (lista.length !== 2 || total !== 10000 || !lista.some((c) => c?.montoCents === 8000 && c?.metodo === "card") || !lista.some((c) => c?.id === "k9" && c?.montoCents === 2000)) fallas.push(`cobrosDe(turno) da el heredado de 8000 y el nuevo de 2000 (hoy ${json(lista)})`);
  });
  assert.deepEqual(fallas, [], `P4 · el turno viejo y su cobro heredado:\n${fallas.join("\n")}`);
});

test("el alta de clienta y el pago sin turno con «1,500» guardan 150000 agorot, y con «1.500» o «abc» no guardan y muestran el error en el campo con `aria-invalid`", async () => {
  const fallas: string[] = [];
  await conCrm(async (crm) => {
    const turnosEscritos = async (a: any, desde: number) => (await a.escrituras()).slice(desde).filter((e: any) => e.ruta.startsWith("appointments/") && (e.op === "add" || e.op === "set"));
    /** El estado del campo de monto después de guardar: su `aria-invalid` y el texto de error que lo acompaña (describedby / errormessage / alerta). */
    const errorDelCampo = (a: any, sel: string) => a.page.evaluate((s: string) => {
      const e = document.querySelector(s) as HTMLElement | null;
      if (!e) return null;
      const ids = `${e.getAttribute("aria-describedby") ?? ""} ${e.getAttribute("aria-errormessage") ?? ""}`.split(/\s+/).filter(Boolean);
      const visibles = ids.map((i) => document.getElementById(i)).filter((x): x is HTMLElement => !!x && x.getBoundingClientRect().width > 0).map((x) => x.innerText.trim()).filter(Boolean);
      const alerta = [...(e.closest("section, form, [role=dialog], .space-y-3")?.querySelectorAll("[role=alert]") ?? [])].map((x) => (x as HTMLElement).innerText.trim()).filter(Boolean);
      return { invalid: e.getAttribute("aria-invalid"), error: [...visibles, ...alerta].join(" · ") };
    }, sel);
    const marcar = (a: any, nombre: string, dentro: string) => campo(a.page, nombre, dentro);
    // El pago sin turno (Pagos → «רישום תשלום»).
    try {
      const a = await crm.abrir({ vista: "escritorio" });
      try {
        await a.irA("payments");
        if (!(await tocar(a.page, "רישום תשלום"))) fallas.push("Pagos ofrece «רישום תשלום»");
        else {
          const dentro = "section[aria-labelledby]";
          const nombre = await marcar(a, "שם", dentro), tel = await marcar(a, "טלפון", dentro), monto = await marcar(a, "סכום", dentro);
          if (!nombre || !tel || !monto) fallas.push("el pago sin turno tiene «שם», «טלפון» y «סכום»");
          else {
            await nombre.fill("בדיקה"); await tel.fill("050-123-4567");
            const sel = `[data-crm04="${await monto.getAttribute("data-crm04")}"]`;
            for (const malo of ["1.500", "abc"]) {
              const desde = (await a.escrituras()).length;
              try { await monto.fill(malo); } catch (e) { fallas.push(`pago sin turno · el campo acepta «${malo}» (${(e as Error).message.split("\n")[0]})`); continue; }
              await tocar(a.page, "שמירה", dentro);
              await a.page.waitForFunction((s: string) => document.querySelector(s)?.getAttribute("aria-invalid") === "true" || ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta.startsWith("appointments/")), sel, { timeout: 5000 }).catch(() => {});
              const escritos = await turnosEscritos(a, desde);
              if (escritos.length) fallas.push(`pago sin turno · con «${malo}» no guarda (guardó amountPaidCents ${escritos.map((e: any) => e.datos?.amountPaidCents).join(", ")})`);
              const err = await errorDelCampo(a, sel);
              if (err?.invalid !== "true" || !err.error) fallas.push(`pago sin turno · con «${malo}» el campo lleva aria-invalid y su error (hoy aria-invalid=${err?.invalid ?? "—"}, error «${err?.error ?? ""}»)`);
              if (escritos.length) break; // ya guardó: el formulario se cerró
            }
            const desde = (await a.escrituras()).length;
            try {
              if (!(await a.page.locator(sel).count())) { await tocar(a.page, "רישום תשלום"); await (await marcar(a, "שם", dentro))?.fill("בדיקה"); await (await marcar(a, "טלפון", dentro))?.fill("050-123-4567"); }
              const m2 = (await a.page.locator(sel).count()) ? a.page.locator(sel) : await marcar(a, "סכום", dentro);
              await m2.fill("1,500");
              await tocar(a.page, "שמירה", dentro);
              await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta.startsWith("appointments/") && e.datos?.customerName === "בדיקה"), null, { timeout: 5000 }).catch(() => {});
              const escritos = await turnosEscritos(a, desde);
              if (!escritos.some((e: any) => e.datos?.amountPaidCents === 150000)) fallas.push(`pago sin turno · «1,500» guarda 150000 agorot (guardó ${json(escritos.map((e: any) => e.datos?.amountPaidCents))})`);
            } catch (e) { fallas.push(`pago sin turno · «1,500»: ${(e as Error).message.split("\n")[0]}`); }
          }
        }
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`el pago sin turno: ${(e as Error).message.split("\n")[0]}`); }
    // El alta de clienta (Clientes → «הוסף לקוח») con un servicio ya hecho y el monto.
    try {
      const a = await crm.abrir({ vista: "escritorio" });
      try {
        await a.irA("customers");
        // El alta está en la vista «רשימה» (la de «לפי שלב» no la tiene).
        await tocar(a.page, "רשימה");
        const abrio = await a.page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => (x.getAttribute("title") ?? x.getAttribute("aria-label") ?? "").trim() === "הוסף לקוח" && x.getBoundingClientRect().width > 0) as HTMLElement | undefined; b?.click(); return !!b; });
        await quieta(a.page);
        const nombre = abrio ? await campo(a.page, "שם מלא") : null, tel = abrio ? await campo(a.page, "טלפון") : null, monto = abrio ? await campo(a.page, "סכום") : null;
        if (!nombre || !tel || !monto) fallas.push("Clientes ofrece «הוסף לקוח» con «שם מלא», «טלפון» y «סכום ששולם»");
        else {
          await nombre.fill("בדיקה"); await tel.fill("050-123-4567");
          // El servicio ya hecho (el turno que guarda el monto), su confirmación y una hora pasada.
          const marcado = await a.page.evaluate(() => {
            const vis = (e: Element) => e.getBoundingClientRect().width > 0;
            const s = [...document.querySelectorAll("select")].find((x) => vis(x) && [...(x as HTMLSelectElement).options].some((o) => o.value === "cut")) as HTMLSelectElement | undefined;
            if (!s) return false;
            s.setAttribute("data-crm05-servicio", "1");
            return true;
          });
          if (!marcado) fallas.push("el alta de clienta deja elegir el servicio");
          else {
            await a.page.locator("[data-crm05-servicio]").selectOption("cut");
            await quieta(a.page);
            const casilla = a.page.locator('input[type="checkbox"]').filter({ visible: true }).first();
            if (await casilla.count()) await casilla.check().catch(() => {});
            const hora = a.page.locator('input[type="time"]').filter({ visible: true }).first();
            if (await hora.count()) await hora.fill("09:00").catch(() => {});
            const sel = `[data-crm04="${await monto.getAttribute("data-crm04")}"]`;
            for (const malo of ["1.500", "abc"]) {
              const desde = (await a.escrituras()).length;
              try { await monto.fill(malo); } catch (e) { fallas.push(`alta de clienta · el campo acepta «${malo}» (${(e as Error).message.split("\n")[0]})`); continue; }
              await tocar(a.page, "שמור");
              await a.page.waitForFunction((s: string) => document.querySelector(s)?.getAttribute("aria-invalid") === "true" || ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta.startsWith("appointments/")), sel, { timeout: 5000 }).catch(() => {});
              const escritos = await turnosEscritos(a, desde);
              const clientas = (await a.escrituras()).slice(desde).filter((e: any) => e.ruta.startsWith("customers/"));
              if (escritos.length || clientas.length) fallas.push(`alta de clienta · con «${malo}» no guarda (guardó ${json([...escritos, ...clientas].map((e: any) => `${e.ruta} ${e.datos?.amountPaidCents ?? ""}`))})`);
              const err = await errorDelCampo(a, sel);
              if (err?.invalid !== "true" || !err.error) fallas.push(`alta de clienta · con «${malo}» el campo lleva aria-invalid y su error (hoy aria-invalid=${err?.invalid ?? "—"}, error «${err?.error ?? ""}»)`);
              if (escritos.length || clientas.length) break; // ya guardó: el formulario se cerró
            }
            const desde = (await a.escrituras()).length;
            try {
              if (await a.page.locator(sel).count()) {
                await a.page.locator(sel).fill("1,500");
                await tocar(a.page, "שמור");
                await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta.startsWith("appointments/") && e.datos?.customerName === "בדיקה"), null, { timeout: 5000 }).catch(() => {});
              }
              const escritos = await turnosEscritos(a, desde);
              if (!escritos.some((e: any) => e.datos?.amountPaidCents === 150000)) fallas.push(`alta de clienta · «1,500» guarda 150000 agorot en el turno (guardó ${json(escritos.map((e: any) => e.datos?.amountPaidCents))})`);
            } catch (e) { fallas.push(`alta de clienta · «1,500»: ${(e as Error).message.split("\n")[0]}`); }
          }
        }
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`el alta de clienta: ${(e as Error).message.split("\n")[0]}`); }
  });
  assert.deepEqual(fallas, [], `P5 · los montos fuera del diálogo:\n${fallas.join("\n")}`);
});

test("el PATCH de cobro responde 409 sobre un turno cancelled y no escribe", async () => {
  const fallas: string[] = [];
  await conServidor(fallas, { "appointments/a1": turno({ status: "cancelled" }) }, async ({ mem, pedir }) => {
    const antes = json(mem.doc("appointments/a1"));
    for (const body of [{ id: "k1", montoCents: 5000, paymentMethod: "cash" }, { montoCents: 5000, paymentMethod: "cash" }]) {
      const r = await pedir(body);
      if (r.code !== 409) fallas.push(`cobrar ${json(body)} sobre un turno cancelado responde 409 (hoy ${r.code} ${json(r.cuerpo)})`);
    }
    const escritas = mem.escritas.filter((e) => e.ruta === "appointments/a1");
    if (escritas.length || json(mem.doc("appointments/a1")) !== antes) fallas.push(`no escribe el turno cancelado (escribió ${json(escritas.map((e) => e.datos))})`);
  });
  // La otra dirección: un turno confirmado se cobra.
  await conServidor(fallas, { "appointments/a1": turno() }, async ({ mem, pedir }) => {
    const r = await pedir({ id: "k1", montoCents: 5000, paymentMethod: "cash" });
    if (r.code !== 200 || mem.doc("appointments/a1")?.amountPaidCents !== 5000) fallas.push(`un turno confirmado se cobra (hoy ${r.code} ${json(r.cuerpo)})`);
  });
  assert.deepEqual(fallas, [], `P6 · un turno cancelado no se cobra:\n${fallas.join("\n")}`);
});

test("cancelar y mover desde la agenda van al PATCH del servidor; con un turno de email «o'neil@x.co.il» o sin teléfono, los dos responden 200, el `customerEmail` guardado no cambia y el aviso de cancelación va a ese email", async () => {
  const fallas: string[] = [];
  // El servidor: cancelar y mover un turno de «o'neil@x.co.il» y uno sin teléfono.
  const oneil = turno({ customerEmail: "o'neil@x.co.il", date: "2026-10-30" });
  const sinTel = Object.fromEntries(Object.entries(turno({ date: "2026-10-30", time: "12:00" })).filter(([k]) => k !== "customerPhone"));
  for (const [desc, doc] of [["«o'neil@x.co.il»", oneil], ["sin teléfono", sinTel]] as const) {
    for (const [accion, body] of [["cancelar", { status: "cancelled" }], ["mover", { date: "2026-10-31", time: "11:00" }]] as const) {
      await conServidor(fallas, { "appointments/a1": doc }, async ({ mem, pedir }) => {
        const r = await pedir(body);
        if (r.code !== 200) fallas.push(`servidor · ${accion} el turno ${desc} responde 200 (hoy ${r.code} ${json(r.cuerpo)})`);
        if (mem.doc("appointments/a1")?.customerEmail !== doc.customerEmail) fallas.push(`servidor · ${accion} el turno ${desc} no cambia el customerEmail guardado (queda ${mem.doc("appointments/a1")?.customerEmail})`);
      });
    }
  }
  // A quién va el aviso de cancelación: al customerEmail guardado (destinatarioDeTurno, CRM-04 Q3).
  await conModulos(async (cargar) => {
    const n = await cargar("src/lib/api/notify-booking-handler.ts");
    if (typeof n?.destinatarioDeTurno !== "function") { fallas.push("src/lib/api/notify-booking-handler.ts exporta destinatarioDeTurno"); return; }
    const mem = dbMemoria({ "appointments/a1": { ...oneil, status: "cancelled" } });
    const d = await n.destinatarioDeTurno(mem.db, { clientId: C, appointmentId: "a1" });
    if (d !== "o'neil@x.co.il") fallas.push(`el aviso de cancelación del turno de «o'neil@x.co.il» va a ese email (hoy ${JSON.stringify(d)})`);
  });
  // La agenda: cancelar t3 (נועה, «o'neil@x.co.il») y mover t4 (רוני, sin teléfono).
  const datos = salon();
  datos["appointments/t3"].customerEmail = "o'neil@x.co.il";
  delete datos["appointments/t4"].customerPhone;
  await conCrm(async (crm) => {
    try {
      const a = await crm.abrir({ vista: "telefono", datos, api: (metodo, ruta) => (metodo === "PATCH" && ruta.startsWith("/api/crm/appointments/") ? { status: 200, json: { success: true } } : metodo === "POST" && ruta.startsWith("/api/appointment/notify") ? { status: 200, json: { success: true } } : undefined) });
      try {
        await a.irA("missions");
        // Cancelar t3.
        const desde3 = (await a.escrituras()).length;
        const menu = await a.page.evaluate(() => { const b = document.querySelector('[data-turno="t3"] button[aria-haspopup="menu"]') as HTMLElement | null; b?.click(); return !!b; });
        await quieta(a.page);
        const item = menu && (await a.page.evaluate(() => { const b = [...document.querySelectorAll('[data-turno="t3"] [role=menu] [role=menuitem]')].find((x) => (x.textContent ?? "").includes("ביטול התור")) as HTMLElement | undefined; b?.click(); return !!b; }));
        await quieta(a.page);
        const confirmo = item && (await tocar(a.page, "ביטול התור", "[role=dialog]"));
        if (!confirmo) fallas.push("agenda · el turno de נועה (t3) se cancela con «עוד פעולות» → «ביטול התור» y su confirmación");
        else {
          await hasta(a.page, async () => a.pedidos.some((p) => p.ruta.startsWith("/api/crm/appointments/t3")) || (await a.escrituras()).slice(desde3).some((e) => e.ruta === "appointments/t3"));
          const sdk = (await a.escrituras()).slice(desde3).filter((e) => e.ruta === "appointments/t3" || e.ruta.startsWith("daily_manifests/"));
          if (sdk.length) fallas.push(`agenda · cancelar no escribe por el SDK (escribió ${json(sdk.map((e) => `${e.op} ${e.ruta} ${json(e.datos)}`))})`);
          const p = a.pedidos.find((x) => x.metodo === "PATCH" && x.ruta.startsWith("/api/crm/appointments/t3"));
          if (!p || p.cuerpo?.status !== "cancelled") fallas.push(`agenda · cancelar va al PATCH del servidor con { status: "cancelled" } (hoy ${json(p?.cuerpo ?? null)})`);
          const guardado = await a.documento("appointments/t3");
          if (guardado?.customerEmail !== "o'neil@x.co.il") fallas.push(`agenda · cancelar no cambia el customerEmail guardado (queda ${guardado?.customerEmail})`);
          await hasta(a.page, () => a.pedidos.some((x) => x.ruta.startsWith("/api/appointment/notify")));
          const aviso = a.pedidos.find((x) => x.metodo === "POST" && x.ruta.startsWith("/api/appointment/notify"));
          if (!aviso || (aviso.cuerpo?.appointmentId ?? aviso.cuerpo?.appointment?.appointmentId) !== "t3") fallas.push(`agenda · el aviso de cancelación sale con el turno t3 (hoy ${json(aviso?.cuerpo ?? null)})`);
        }
        // Mover t4.
        const desde4 = (await a.escrituras()).length;
        const abrio = await a.page.evaluate(() => { const b = [...document.querySelectorAll('[data-turno="t4"] button')].find((x) => (x.textContent ?? "").trim() === "שינוי מועד") as HTMLElement | undefined; b?.click(); return !!b; });
        await quieta(a.page);
        const fecha = abrio ? await campo(a.page, "תאריך", "[role=dialog]") : null, hora = abrio ? await campo(a.page, "שעה", "[role=dialog]") : null;
        if (!fecha || !hora) fallas.push("agenda · el turno de רוני (t4) se mueve con «שינוי מועד» (תאריך y שעה)");
        else {
          await fecha.fill(MANANA); await hora.fill("13:00");
          await tocar(a.page, "שמירה", "[role=dialog]");
          await hasta(a.page, async () => a.pedidos.some((p) => p.ruta.startsWith("/api/crm/appointments/t4")) || (await a.escrituras()).slice(desde4).some((e) => e.ruta === "appointments/t4"));
          const sdk = (await a.escrituras()).slice(desde4).filter((e) => e.ruta === "appointments/t4" || e.ruta.startsWith("daily_manifests/"));
          if (sdk.length) fallas.push(`agenda · mover no escribe por el SDK (escribió ${json(sdk.map((e) => `${e.op} ${e.ruta} ${json(e.datos)}`))})`);
          const p = a.pedidos.find((x) => x.metodo === "PATCH" && x.ruta.startsWith("/api/crm/appointments/t4"));
          if (!p || p.cuerpo?.date !== MANANA || p.cuerpo?.time !== "13:00") fallas.push(`agenda · mover va al PATCH del servidor con { date: "${MANANA}", time: "13:00" } (hoy ${json(p?.cuerpo ?? null)})`);
        }
        if (HOY !== "2026-10-15" || CLIENTE !== "crm03-salon") fallas.push("el arnés cambió de salón o de día");
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`la agenda: ${(e as Error).message.split("\n")[0]}`); }
  });
  assert.deepEqual(fallas, [], `P7 · cancelar y mover por el servidor:\n${fallas.join("\n")}`);
});
