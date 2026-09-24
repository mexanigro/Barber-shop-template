// CONEXION-03 · C (T) · punta a punta: recrear real (--sin-firestore, home 375, puerto libre de 40000–49151) para A y C, sin brechas de
// validador ni de material y dentro de la línea base de CONEXION-02 (A ≤ 1, C ≤ 2), con los fixtures ya bajo D-44: `featured` es orden y
// los dos primeros ids son los que services v6 ya muestra, así que la página no cambia. Sesión A (2026-09-22): test rojo — cae en la
// precondición D-44 (hoy los fixtures no tienen `featured`) antes de levantar ningún servidor. Carpetas temporales con prefijo
// «conexion-03-», borradas en `finally`; ≤ 10 min por corrida (correrLargo). El archivo vive SÓLO en T (C1); el guard por `REPO` queda
// por si se reproduce el árbol en otra raíz.
// CONEXION-04 D1 (2026-09-22): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, RECREAR, conTemporalAsync, correrLargo, fixture, puertoLibreEn, seccion, servicios } from "./orden/conexion-03/_util.ts";

type Brecha = { tipo: string; campo: string; hueco: string | null; detalle?: string };
type Informe = { firestore?: string; brechas: Brecha[]; diffs: { pagina: string; vista: number; pixels: number; size?: boolean }[] };

if (REPO === "T") test("`recrear.mjs --paleta a --sin-firestore --paginas home --vistas 375 --puerto <libre>` y `--paleta c` no producen ninguna brecha «validador H rechaza» ni «material que producción no sirve», y las brechas totales no superan la línea base (A ≤ 1 en home 375, C ≤ 2): D-44 no cambia la página", async (t) => {
  // D-44 primero: sin `featured` en los fixtures, la afirmación («D-44 no cambia la página») no tiene sujeto.
  for (const p of ["a", "c"] as const) {
    const esperado = servicios(fixture(p)).slice(0, 2).map((s) => String(s.id));
    assert.deepEqual(seccion(fixture(p)).featured, esperado, `precondición D-44: el fixture ${p.toUpperCase()} tiene sections.services.featured = ${JSON.stringify(esperado)}`);
  }
  // CONEXION-09 (D-94 b): contar brechas deja pasar una distinta en el lugar de otra. Cada paleta compara el CONJUNTO de
  // `${tipo} · ${campo}` con esta lista escrita: la «sin contrato» de `contact.address` que puso PRESET-01 (el contrato no tiene
  // fila para esa clave y `hueco.mjs` sigue en 29/36), la de `brand.description` que C arrastra desde CONEXION-03, y el «diff ≠ 0»
  // de home 375, la línea base de esta comparación desde CONEXION-04 (el tenant lleva las claves que el alta añade y el fixture no).
  const ESPERADAS = {
    a: ["diff ≠ 0 · home 375", "sin contrato · contact.address.district"],
    c: ["diff ≠ 0 · home 375", "sin contrato · brand.description", "sin contrato · contact.address.district"],
  };
  for (const p of ["a", "c"] as const) {
    const puerto = await puertoLibreEn(40000, 49151);
    await conTemporalAsync(async (tmp) => {
      const out = join(tmp, "out");
      const r = correrLargo([RECREAR, "--paleta", p, "--sin-firestore", "--paginas", "home", "--vistas", "375", "--puerto", String(puerto), "--out", out]);
      assert.ok(r.status === 0 || r.status === 2, `recrear --paleta ${p} sale 0 o 2 (salió ${r.status})\n${r.out.slice(-4000)}`);
      const ruta = join(out, `recrear-${p}.json`);
      assert.ok(existsSync(ruta), `recrear-${p}.json escrito en --out\n${r.out.slice(-3000)}`);
      const informe = JSON.parse(readFileSync(ruta, "utf8")) as Informe;
      assert.equal(informe.firestore, "saltado (--sin-firestore): declarado");
      assert.ok(informe.diffs.some((d) => d.pagina === "home" && d.vista === 375 && typeof d.pixels === "number"), `diff home 375 calculado (paleta ${p}): ${JSON.stringify(informe.diffs)}`);
      const tipos = (tipo: string) => informe.brechas.filter((b) => b.tipo === tipo);
      assert.deepEqual(tipos("puerto ocupado"), [], `paleta ${p}: ninguna brecha de puerto`);
      assert.deepEqual(tipos("validador H rechaza"), [], `paleta ${p}: ninguna brecha «validador H rechaza»: ${JSON.stringify(tipos("validador H rechaza").slice(0, 10))}`);
      assert.deepEqual(tipos("material que producción no sirve"), [], `paleta ${p}: ninguna brecha «material que producción no sirve»: ${JSON.stringify(tipos("material que producción no sirve").slice(0, 10))}`);
      const nombres = informe.brechas.map((b) => `${b.tipo} · ${b.campo}`).sort();
      assert.deepEqual(nombres, [...ESPERADAS[p]].sort(), `paleta ${p}: las brechas de recrear son exactamente las esperadas (hay ${JSON.stringify(nombres)})`);
      t.diagnostic(`recrear ${p} home 375: ${informe.brechas.length} brechas (${informe.brechas.map((b) => b.tipo).join(", ") || "ninguna"})`);
    });
  }
});
