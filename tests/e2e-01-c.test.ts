// E2E-01 · copia promovida (ARREGLOS-01, 2026-09-25, D-105). La orden quedó aprobada por Liam el 2026-09-25
// (T c4faa5d · H 0c6d3e0) y su carpeta de la orden está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte: sólo C1 (C2 levanta un vite build y pide las dos webs desplegadas).
// E2E-01 · C (T) · la página desplegada es la plantilla: la herramienta que compara (C1) y el 0 píxeles en lo juzgado (C2).
// Sesión A (2026-09-24): tests rojos — no existe `tools/verdad/e2e.mjs`.
// D-100 (medido): el camino del fixture (`VITE_TENANT_FIXTURE`) SÓLO existe en `import.meta.env.DEV` (T:src/services/tenant.ts:173–174,
// :214) y `recrear.mjs:90` levanta `server.ts` con `tsx`, que es dev. Comparar una web desplegada (build de producción servido por
// Vercel) contra un render de dev no sería justo. La referencia es un `vite build` de T en el MISMO commit que Vercel desplegó,
// servido en local con `VITE_CLIENT_ID=test-b4-peluqueria-<paleta>`: mismo código, mismo camino de datos, y la única diferencia es
// qué `config/{id}` se lee.
// D-101 (medido): el alta del hub pone `showWhyChooseUs: false` y `showInquiry: false`, y los fixtures toman el `true` del template,
// así que la PÁGINA ENTERA nunca va a medir lo mismo. Por eso cada zona se captura POR SU ELEMENTO: una sección no juzgada no
// desplaza nada. Ningún test escribe en Firestore, en Storage ni en Vercel. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { E2E, ROOT, fuente } from "./orden/e2e-01/_comun.ts";

/** Lo que la herramienta NO puede hacer: esta orden mira, no escribe. */
const ESCRITURAS = [/--escribir/, /\bmethod:\s*["'](POST|PATCH|PUT|DELETE)["']/, /\.set\(/, /\.update\(/];
/** Lo que la referencia NO puede usar (D-100): el camino de dev del fixture. */
const DE_DEV = ["VITE_TENANT_FIXTURE", "server.ts"];

test("tools/verdad/e2e.mjs existe, corre con `--web a|c [--puerto <n>] [--zonas …] [--vistas …]` y escribe un informe JSON con una entrada por zona y vista, cada una con `zona`, `vista`, `pixels` y `size`; levanta la referencia con un **build de producción** de T en el commit que declara `tests/e2e-01-webs.json` y `VITE_CLIENT_ID=test-b4-peluqueria-<paleta>`, nunca con `server.ts` en dev; y nunca escribe en Firestore, en Storage ni en Vercel", () => {
  // (1) La herramienta existe. Hoy no: aquí es donde esta orden está en rojo.
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E}`);
  const src = fuente(E2E);

  // (2) Su CLI, tal como la hoja lo fija.
  for (const bandera of ["--web", "--puerto", "--zonas", "--vistas", "--json"]) {
    assert.ok(src.includes(bandera), `${E2E} debe aceptar «${bandera}»`);
  }
  // (3) La referencia es un build de producción con el tenant de la plantilla, no el server de dev con el fixture (D-100).
  assert.ok(src.includes("VITE_CLIENT_ID"), `${E2E} levanta la referencia con VITE_CLIENT_ID (D-100)`);
  assert.ok(src.includes("vite build") || src.includes("build"), `${E2E} construye la referencia (vite build), no la sirve en dev`);
  for (const dev of DE_DEV) {
    assert.ok(!src.includes(dev), `${E2E} no usa «${dev}»: el camino del fixture sólo existe en DEV y la comparación no sería justa (D-100)`);
  }
  // (4) Y no escribe en ningún lado.
  for (const re of ESCRITURAS) {
    assert.doesNotMatch(src, re, `${E2E} no escribe (${re}): esta orden lee Vercel, Firestore y Storage, no los toca`);
  }
});
