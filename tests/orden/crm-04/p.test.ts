// CRM-04 · P1–P3 (T) · el dinero (D-344; REV 7, 8 y 17). Sesión A (2026-10-20): tests rojos.
//
// Medido en T 47b53a6: el navegador calcula el total (`pagoNuevo`) y lo manda o lo escribe por el SDK (`crmAppointments.cobrar`, camino
// «browser»): dos cobros casi juntos se pisan; `leerMonto("1,500")` = 1,5; un turno pagado con descuento suma el precio al ingreso.
// Contrato (§ Interfaz): el PATCH de cobro manda `{ montoCents, paymentMethod }` (lo que entra ahora) y el servidor lo suma a lo guardado
// en una transacción; `leerMonto(texto) → number | null`.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENTE, HOY, campo, conCrm, conModulos, quieta, salon, tocar } from "./_crm.ts";
import { dbMemoria } from "./_comun.ts";

function res() {
  const r: any = { code: 200, cuerpo: undefined as any };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: any) => { r.cuerpo = b; return r; };
  r.send = (b: any) => { r.cuerpo = b; return r; };
  r.setHeader = () => r; r.set = () => r; r.end = () => r;
  return r;
}

test("dos cobros casi juntos de 50 y de 100 sobre el mismo turno dejan 150 cobrado: el servidor suma el monto que entra a lo guardado, en una transacción, y el cobro no escribe por el SDK del navegador", async () => {
  const fallas: string[] = [];
  // El servidor: dos PATCH a la vez sobre t1 (₪200), de ₪50 y de ₪100.
  await conModulos(async (cargar) => {
    const h = await cargar("src/lib/api/crm-appointments-handler.ts");
    if (typeof h?.createCrmAppointmentsHandlers !== "function") { fallas.push("src/lib/api/crm-appointments-handler.ts exporta createCrmAppointmentsHandlers"); return; }
    const mem = dbMemoria({
      "config/c1": { services: [{ id: "cut", name: "תספורת", price: 200, duration: 60 }] },
      "appointments/t1": { clientId: "c1", customerName: "נועה", customerEmail: "n@example.com", customerPhone: "050-000-0000", serviceId: "cut", staffId: "s1", date: "2026-10-15", time: "10:00", duration: 60, status: "confirmed", paymentStatus: "pending" },
    });
    const { patch } = h.createCrmAppointmentsHandlers({ clientId: "c1", loadDb: async () => mem.db, authenticate: async () => ({ email: "duena@example.com", uid: "u1", role: "owner" }) });
    const pedir = async (montoCents: number, paymentMethod: string) => { const r = res(); try { await patch({ params: { id: "t1" }, body: { montoCents, paymentMethod }, headers: {}, query: {} }, r); } catch (e) { r.code = -1; r.cuerpo = String((e as Error).message); } return r; };
    const [a, b] = await Promise.all([pedir(5000, "cash"), pedir(10000, "card")]);
    for (const [r, n] of [[a, 50], [b, 100]] as const) if (r.code !== 200) fallas.push(`el cobro de ₪${n} ({ montoCents }) responde 200 (hoy ${r.code} ${JSON.stringify(r.cuerpo)})`);
    const guardado = mem.doc("appointments/t1");
    if (guardado?.amountPaidCents !== 15000) fallas.push(`los dos cobros dejan 150 cobrado (amountPaidCents ${JSON.stringify(guardado?.amountPaidCents)})`);
    const fuera = mem.escritas.filter((e) => e.ruta === "appointments/t1" && !e.tx);
    if (fuera.length) fallas.push(`el servidor escribe el cobro en una transacción (${fuera.length} escrituras sueltas)`);
  });
  // El navegador: «סמן כשולם» sobre t1 con una seña de ₪50 guardada; se cobran ₪40 más.
  const datos = salon();
  Object.assign(datos[`appointments/t1`], { amountPaidCents: 5000, paymentStatus: "deposit_paid", paymentMethod: "cash" });
  await conCrm(async (crm) => {
    try {
      const a = await crm.abrir({ vista: "telefono", datos, api: (metodo, ruta) => (metodo === "PATCH" && ruta.startsWith("/api/crm/appointments/") ? { status: 200, json: { success: true } } : undefined) });
      try {
        await a.irA("missions");
        const ok = await a.page.evaluate(() => {
          const b = [...document.querySelectorAll("button")].filter((x) => (x.textContent ?? "").trim() === "סמן כשולם" && x.getBoundingClientRect().width > 0);
          const de = b.find((x) => { for (let p = x.parentElement; p; p = p.parentElement) if ((p.textContent ?? "").includes("גלית")) return !(p.textContent ?? "").includes("מיכל"); return false; });
          de?.click();
          return !!de;
        });
        await quieta(a.page);
        const monto = ok ? await campo(a.page, "סכום", "[role=dialog]") : null;
        if (!monto) fallas.push("el turno de גלית (con seña) ofrece «סמן כשולם» y su diálogo tiene «סכום»");
        else {
          await monto.fill("40");
          const antes = (await a.escrituras()).length;
          await tocar(a.page, "שמירה", "[role=dialog]");
          await a.page.waitForFunction((n: number) => ((globalThis as any).__CRM03.escrituras as any[]).length > n, antes, { timeout: 5000 }).catch(() => {});
          await quieta(a.page);
          const sdk = (await a.escrituras()).slice(antes).filter((e) => e.ruta === "appointments/t1");
          if (sdk.length) fallas.push(`el cobro no escribe por el SDK del navegador (escribió ${JSON.stringify(sdk.map((e) => e.datos))})`);
          const pedido = a.pedidos.find((p) => p.metodo === "PATCH" && p.ruta.startsWith("/api/crm/appointments/t1"));
          if (!pedido) fallas.push("el cobro va al servidor (PATCH /api/crm/appointments/t1)");
          else {
            if (pedido.cuerpo?.montoCents !== 4000) fallas.push(`el navegador manda el monto que entra ahora, montoCents 4000 (mandó ${JSON.stringify(pedido.cuerpo)})`);
            if (pedido.cuerpo && "amountPaidCents" in pedido.cuerpo) fallas.push(`el navegador no manda el total (mandó amountPaidCents ${pedido.cuerpo.amountPaidCents})`);
          }
        }
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`el cobro desde el panel: ${(e as Error).message.split("\n")[0]}`); }
  });
  assert.deepEqual(fallas, [], `P1 · el cobro suma en el servidor:\n${fallas.join("\n")}`);
});

test("leerMonto da 1500 con «1,500» y con «1500», 150.5 con «150.5», e inválido con «1.500» y con «1,50»", async () => {
  const fallas: string[] = [];
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/cobros.ts");
    if (typeof m?.leerMonto !== "function") { fallas.push("src/lib/cobros.ts exporta leerMonto"); return; }
    for (const [texto, esperado] of [["1,500", 1500], ["1500", 1500], ["150.5", 150.5], ["1.500", null], ["1,50", null]] as const) {
      const v = m.leerMonto(texto);
      if (v !== esperado) fallas.push(`leerMonto(«${texto}») = ${esperado === null ? "inválido (null)" : esperado} (hoy ${JSON.stringify(v)})`);
    }
  });
  assert.deepEqual(fallas, [], `P2 · leerMonto como en Israel:\n${fallas.join("\n")}`);
});

test("un turno pagado con menos que el precio cuenta como ingreso lo cobrado, y en la agenda, el Resumen y Pagos el ingreso es lo cobrado más lo pendiente", async () => {
  const fallas: string[] = [];
  // Las cuentas de cobros.ts (las que leen la agenda —cuentas—, el Resumen —cuentas— y Pagos —cobradoDe y saldoDe—).
  await conModulos(async (cargar) => {
    const m = await cargar("src/lib/cobros.ts");
    if (typeof m?.cuentas !== "function" || typeof m?.cobradoDe !== "function" || typeof m?.saldoDe !== "function") { fallas.push("src/lib/cobros.ts exporta cuentas, cobradoDe y saldoDe"); return; }
    const conDescuento = { status: "completed", paymentStatus: "paid", amountPaidCents: 8000 };
    const uno = m.cuentas([conDescuento], () => 100);
    if (uno.ingreso !== 80 || uno.cobrado !== 80 || uno.porCobrar !== 0) fallas.push(`un turno pagado con ₪80 de ₪100: ingreso 80, cobrado 80, pendiente 0 (hoy ${uno.ingreso}, ${uno.cobrado}, ${uno.porCobrar})`);
    const turnos = [
      { status: "completed", paymentStatus: "paid", amountPaidCents: 10000 },
      conDescuento,
      { status: "confirmed", paymentStatus: "deposit_paid", amountPaidCents: 3000 },
      { status: "confirmed", paymentStatus: "pending" },
      { status: "completed", paymentStatus: "paid" },
      { status: "cancelled", paymentStatus: "pending" },
    ];
    const c = m.cuentas(turnos, () => 100);
    if (c.ingreso !== c.cobrado + c.porCobrar) fallas.push(`ingreso = cobrado + pendiente (hoy ${c.ingreso} ≠ ${c.cobrado} + ${c.porCobrar})`);
    if (c.cobrado !== 310 || c.porCobrar !== 170) fallas.push(`cobrado 310 y pendiente 170 (hoy ${c.cobrado} y ${c.porCobrar})`);
    const porTurno = turnos.filter((x) => x.status !== "cancelled").reduce((s, x) => s + m.cobradoDe(x, 100) + m.saldoDe(x, 100), 0);
    if (porTurno !== c.ingreso) fallas.push(`Pagos (cobradoDe + saldoDe por turno) da el mismo ingreso que la agenda (${porTurno} ≠ ${c.ingreso})`);
  });
  // La agenda de hoy, en pantalla: t2 (₪180 del corte) pagado con ₪150.
  const datos = salon();
  Object.assign(datos[`appointments/t2`], { amountPaidCents: 15000, paymentStatus: "paid" });
  await conCrm(async (crm) => {
    try {
      const a = await crm.abrir({ vista: "escritorio", datos });
      try {
        await a.irA("missions");
        const precios = Object.fromEntries((datos[`config/${CLIENTE}`].services as any[]).map((s) => [s.id, Number(s.price) || 0]));
        let cobrado = 0, pendiente = 0;
        for (const [k, v] of Object.entries(datos)) {
          if (!k.startsWith("appointments/") || v.date !== HOY || v.status === "cancelled") continue;
          const precio = precios[v.serviceId] ?? 0;
          const ya = typeof v.amountPaidCents === "number" ? v.amountPaidCents / 100 : v.paymentStatus === "paid" ? precio : 0;
          cobrado += ya; pendiente += v.paymentStatus === "paid" ? 0 : Math.max(0, precio - ya);
        }
        const leido = await a.page.evaluate(() => {
          const dts = [...document.querySelectorAll("#admin-content dt")].filter((d) => !d.closest("#admin-content > aside") && d.getBoundingClientRect().width > 0);
          const dt = dts.find((d) => (d.textContent ?? "").trim() === "הכנסה");
          return dt ? (dt.nextElementSibling?.textContent ?? "").trim() : null;
        });
        const num = leido ? Number(leido.replace(/[^\d.]/g, "")) : NaN;
        if (num !== cobrado + pendiente) fallas.push(`en la agenda de hoy el ingreso («הכנסה») es lo cobrado más lo pendiente, ₪${cobrado + pendiente} (hoy «${leido}»)`);
      } finally { await a.cerrar(); }
    } catch (e) { fallas.push(`la agenda: ${(e as Error).message.split("\n")[0]}`); }
  });
  assert.deepEqual(fallas, [], `P3 · las cuentas cierran:\n${fallas.join("\n")}`);
});
