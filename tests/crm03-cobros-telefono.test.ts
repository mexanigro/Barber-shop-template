// CRM-03 · diseño (clon): las cuentas de dinero de un turno (lib/cobros) y el número de WhatsApp (lib/telefono).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cobradoDe, cuentas, estaPagado, leerMonto, pagoNuevo, saldoDe } from "../src/lib/cobros.ts";
import { waEnlace, waNumero } from "../src/lib/telefono.ts";

test("una seña cuenta como cobrada en parte, deja saldo y el pago nuevo se suma (no la pisa)", () => {
  const sena = { status: "confirmed" as const, paymentStatus: "deposit_paid" as const, amountPaidCents: 5000 };
  assert.equal(cobradoDe(sena, 200), 50);
  assert.equal(saldoDe(sena, 200), 150);
  assert.equal(estaPagado(sena, 200), false);
  assert.deepEqual(pagoNuevo(sena, 200, 150), { amountPaidCents: 20000, paymentStatus: "paid" });
  assert.deepEqual(pagoNuevo(sena, 200, 100), { amountPaidCents: 15000, paymentStatus: "deposit_paid" });
});

test("pagado sin monto vale el precio; sin pagar no cobra nada; los cancelados no cuentan en las cifras", () => {
  assert.equal(cobradoDe({ status: "completed", paymentStatus: "paid" }, 180), 180);
  assert.equal(saldoDe({ status: "completed", paymentStatus: "paid" }, 180), 0);
  assert.equal(cobradoDe({ status: "confirmed", paymentStatus: "pending" }, 90), 0);
  const precio = () => 100;
  const c = cuentas([
    { status: "confirmed", paymentStatus: "pending" },
    { status: "completed", paymentStatus: "paid", amountPaidCents: 12000 },
    { status: "cancelled", paymentStatus: "paid", amountPaidCents: 9999 },
    { status: "pending" },
  ] as any, precio);
  assert.equal(c.activos.length, 3);
  assert.equal(c.pendientes, 1);
  assert.equal(c.cobrado, 120);
  assert.equal(c.ingreso, 100 + 120 + 100);
  assert.equal(c.porCobrar, 200);
});

test("el monto que escribe la dueña: coma o punto, sin negativos ni cero", () => {
  assert.equal(leerMonto("150,5"), 150.5);
  assert.equal(leerMonto(" 90 "), 90);
  assert.equal(leerMonto("-20"), null);
  assert.equal(leerMonto("0"), null);
  assert.equal(leerMonto("abc"), null);
  assert.deepEqual(pagoNuevo({ status: "confirmed" }, 90, -5), { amountPaidCents: 0, paymentStatus: "deposit_paid" });
});

test("wa.me con el código de país: 05… y 00972… dan 9725…, un +972 queda igual", () => {
  assert.equal(waNumero("050-000-0001"), "972500000001");
  assert.equal(waNumero("00972 50 123 4567"), "972501234567");
  assert.equal(waNumero("+972-50-123-4567"), "972501234567");
  assert.equal(waEnlace("0501234567", " hola "), "https://wa.me/972501234567?text=hola");
});
