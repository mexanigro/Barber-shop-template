// CRM-03 · P1 (T) · marcar pagado con el método, el método a la vista y «רישום תשלום» como dejó CRM-02. Sesión A (2026-10-15): test rojo.
//
// Medido: no hay forma de marcar como pagado un turno que existe (sólo «רישום תשלום», que crea otro turno) y el método se guarda pero no
// se ve (la tabla de Pagos pinta sólo un ícono, `PaymentsTab.tsx:479,502`). CRM-02: el teléfono obligatorio y el método guardado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { campo, conCrm, quieta, tocar } from "./_crm.ts";

/** El texto de la fila de Pagos de una clienta: el contenedor más chico que tiene su nombre y un monto en ₪. */
const FILA = (nombre: string) => `(() => {
  const hoja = [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && (e.textContent || "").trim() === ${JSON.stringify(nombre)} && e.getBoundingClientRect().width > 0);
  for (const h of hoja) for (let p = h.parentElement; p && p !== document.body; p = p.parentElement) if (/₪\\s?[\\d,]+|[\\d,]+\\s?₪/.test(p.textContent || "")) return p.innerText.replace(/\\s+/g, " ");
  return null;
})()`;

test("marcar pagado: en la lista de turnos, «סמן כשולם» abre un diálogo con el monto —el precio del servicio, que se puede cambiar— y el método —מזומן, כרטיס, העברה, אחר—, y guardar escribe en ese mismo turno paymentStatus \"paid\", amountPaidCents, paymentMethod y paidAt sin crear otro turno; en Pagos cada pago muestra su método en hebreo; y, como dejó CRM-02, «רישום תשלום» no guarda sin teléfono y guarda el método elegido", async () => {
  await conCrm(async (crm) => {
    const a = await crm.abrir({ vista: "telefono" });
    try {
      // En Pagos, el método de cada pago en hebreo (t2 מיכל efectivo, t5 דנה tarjeta, t7 שירה transferencia, t10 אור otro).
      await a.ir("תשלומים");
      const filas: Record<string, string | null> = {};
      for (const n of ["מיכל", "דנה", "שירה", "אור"]) filas[n] = await a.page.evaluate(FILA(n));
      const esperado: Record<string, string> = { "מיכל": "מזומן", "דנה": "כרטיס", "שירה": "העברה", "אור": "אחר" };
      const sinMetodo = Object.entries(esperado).filter(([n, m]) => !(filas[n] ?? "").includes(m)).map(([n, m]) => `${n}: «${m}» (fila: ${filas[n]})`);
      assert.deepEqual(sinMetodo, [], "en Pagos cada pago muestra su método en hebreo");

      // CRM-02: «רישום תשלום» sin teléfono no guarda; con teléfono guarda el método elegido.
      assert.ok(await tocar(a.page, "רישום תשלום"), "Pagos tiene «רישום תשלום»");
      const nombre = await campo(a.page, "שם"), tel = await campo(a.page, "טלפון"), monto = await campo(a.page, "סכום"), metodo = await campo(a.page, "אמצעי תשלום");
      assert.ok(nombre && tel && monto && metodo, "el formulario de «רישום תשלום» tiene nombre, teléfono, monto y método");
      await nombre.fill("בדיקה");
      await monto.fill("120");
      await metodo.selectOption("transfer");
      const antes = (await a.escrituras()).length;
      const guardo = await tocar(a.page, "שמירה");
      if (guardo) await quieta(a.page);
      assert.equal((await a.escrituras()).length, antes, "CRM-02: sin teléfono «רישום תשלום» no guarda");
      await tel.fill("050-000-0099");
      assert.ok(await tocar(a.page, "שמירה"), "«שמירה» del formulario");
      await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.op === "add" && e.datos?.customerPhone === "050-000-0099"), null, { timeout: 15000 });
      const alta = (await a.escrituras()).find((e) => e.op === "add" && e.datos?.customerPhone === "050-000-0099");
      assert.equal(alta?.datos?.paymentMethod, "transfer", "CRM-02: «רישום תשלום» guarda el método elegido");

      // Marcar pagado un turno que existe: t1 (גלית, פן מקצועי לשיער ארוך במיוחד, ₪90).
      await a.ir("תורים");
      const porMarcar = await a.page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].filter((x) => (x.textContent ?? "").trim() === "סמן כשולם" && x.getBoundingClientRect().width > 0);
        const de = b.find((x) => { for (let p = x.parentElement; p; p = p.parentElement) if ((p.textContent ?? "").includes("גלית")) return !(p.textContent ?? "").includes("מיכל"); return false; });
        if (!de) return false;
        de.click();
        return true;
      });
      assert.ok(porMarcar, "el turno de גלית (sin pagar) ofrece «סמן כשולם»");
      await quieta(a.page);
      const dMonto = await campo(a.page, "סכום", "[role=dialog]"), dMetodo = await campo(a.page, "אמצעי תשלום", "[role=dialog]");
      assert.ok(dMonto && dMetodo, "«סמן כשולם» abre un diálogo (role=dialog) con «סכום» y «אמצעי תשלום»");
      assert.equal(await dMonto.inputValue(), "90", "el monto empieza en el precio del servicio (₪90)");
      const opciones = await dMetodo.evaluate((s: HTMLSelectElement) => [...s.options].map((o) => o.textContent?.trim()));
      assert.deepEqual(opciones, ["מזומן", "כרטיס", "העברה", "אחר"], "el método: מזומן, כרטיס, העברה, אחר");
      await dMonto.fill("100");
      await dMetodo.selectOption({ label: "כרטיס" });
      assert.ok(await tocar(a.page, "שמירה", "[role=dialog]"), "el diálogo tiene «שמירה»");
      await a.page.waitForFunction(() => ((globalThis as any).__CRM03.escrituras as any[]).some((e) => e.ruta === "appointments/t1" && e.datos?.paymentStatus === "paid"), null, { timeout: 15000 });
      const esc = (await a.escrituras()).filter((e) => e.ruta === "appointments/t1" && e.datos?.paymentStatus === "paid");
      assert.equal(esc.length, 1, "guardar escribe una vez en el turno t1");
      assert.equal(esc[0].datos.amountPaidCents, 10000, "amountPaidCents = el monto cambiado (₪100)");
      assert.equal(esc[0].datos.paymentMethod, "card", "paymentMethod = card");
      assert.ok(esc[0].datos.paidAt, "paidAt");
      assert.equal((await a.escrituras()).filter((e) => e.op === "add" && e.ruta.startsWith("appointments/") && e.datos?.customerName === "גלית").length, 0, "sin crear otro turno");
    } finally { await a.cerrar(); }
  });
});
