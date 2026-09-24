// CONEXION-02 · C (T) · punta a punta: recrear real (--sin-firestore, home 375, puerto libre de 40000–49151) para A y C sin brechas de
// validador ni de material y dentro de la línea base (A ≤ 1, C ≤ 2).
// CONEXION-03 D1 (2026-09-22): copia editable promovida a npm test, recortada a la parte de recrear (D-19 + inciso n: ninguna
// afirmación de T mira a H, así que la lectura del tenant desde H se queda en la carpeta congelada de la orden).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { conTemporalAsync, correrLargo, puertoLibreEn, REPO } from "./orden/conexion-02/_util.ts";

const RECREAR = "tools/verdad/recrear.mjs";
type Brecha = { tipo: string; campo: string; hueco: string | null; detalle?: string };
type Informe = { firestore?: string; brechas: Brecha[]; diffs: { pagina: string; vista: number; pixels: number; size?: boolean }[] };


if (REPO === "T") test("`recrear.mjs --paleta a --sin-firestore --paginas home --vistas 375 --puerto <libre>` y `--paleta c` no producen ninguna brecha «validador H rechaza» ni «material que producción no sirve», y las brechas totales no superan la línea base (A ≤ 1 en home 375, C ≤ 2)", async (t) => {
  // PRESET-01 (2026-09-23) puso `contact.address` en los dos fixtures y el contrato no tiene fila para esa clave (`hueco.mjs` sigue
  // en 29/36): cada plantilla suma una brecha «sin contrato», así que el tope sube de 1 a 2 en A y de 2 a 3 en C. Lo que esta
  // afirmación vigila —ninguna brecha de validador ni de material— no cambia.
  for (const [p, tope] of [["a", 2], ["c", 3]] as const) {
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
      assert.ok(informe.brechas.length <= tope, `paleta ${p}: brechas totales ≤ ${tope} (línea base; hay ${informe.brechas.length}): ${JSON.stringify(informe.brechas.map((b) => `${b.tipo} · ${b.campo}`))}`);
      t.diagnostic(`recrear ${p} home 375: ${informe.brechas.length} brechas (${informe.brechas.map((b) => b.tipo).join(", ") || "ninguna"})`);
    });
  }
});
