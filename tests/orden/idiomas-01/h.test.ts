// IDIOMAS-01 · C3 (T) · el texto por idioma, con sus cinco lugares. Sesión A (2026-09-29): test rojo.
//
// INFORME § 2: un dato nuevo necesita cinco lugares —contrato legible (`bloque-04/CONTRATOS-HUECOS.md`), contrato máquina
// (`verdad/contratos.json`), validador del hub, casilla del hub y guard en T—, y `tools/verdad/hueco.mjs` los comprueba (exit 2 si
// falta uno). § 7 declara los tres datos de esta orden: D11-1 (servicios), D11-2 (equipo) y D11-3 (reseñas).
// Medido 2026-09-29: `hueco.mjs` termina en «29/36 huecos hechos», y doce copias promovidas de T fijan ese número.
// D-140 (medido): `CONTRATOS-HUECOS.md:72` todavía dice `services[i].name` «2–5 palabras»; `:53` dice 1–5, que es CT-1.
// `hueco.mjs` no resuelve `<lang>` ni `<id>` en la `ruta` (lee el fixture A con un `get` literal), así que cada fila lleva una
// ruta concreta (p. ej. `translations.en.services.cut.name`): eso lo decide B; aquí se mide el resultado. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { BLOQUE, ROOT, correrLargo, ultimaLinea } from "./_comun.ts";

/** Las tres filas nuevas (D11-1, D11-2, D11-3). */
const FILAS = ["services.idiomas", "staff.idiomas", "testimonials.idiomas"];
/** El total después de esta orden: 29 hechos + 3, sobre 36 filas + 3. */
const TOTAL = "32/39 huecos hechos";
const VIEJO = "29/36";

test("verdad/contratos.json tiene las filas `services.idiomas`, `staff.idiomas` y `testimonials.idiomas` con sus cinco lugares y `hueco.mjs --id` da verde en las tres; `hueco.mjs` termina en «32/39 huecos hechos»; ninguna copia promovida de tests/ fija ya «29/36»; y bloque-04/CONTRATOS-HUECOS.md dice 1 a 5 palabras en toda fila de `services[i].name`", () => {
  // (1) Las tres filas, en el contrato máquina. Hoy no están: aquí está el rojo.
  const contratos = JSON.parse(readFileSync(resolve(ROOT, "verdad/contratos.json"), "utf8")) as { huecos: { id: string }[] };
  const ids = contratos.huecos.map((h) => h.id);
  for (const id of FILAS) assert.ok(ids.includes(id), `verdad/contratos.json tiene que tener la fila «${id}» (INFORME § 7: D11-1, D11-2, D11-3)`);

  // (2) Cada una con sus cinco lugares: `hueco.mjs --id` sale 0.
  for (const id of FILAS) {
    const r = correrLargo(["tools/verdad/hueco.mjs", "--id", id]);
    assert.equal(r.status, 0, `hueco.mjs --id ${id} tiene que dar verde en los cinco lugares (salió ${r.status})\n${r.out.slice(-1500)}`);
  }
  // (3) Y el total.
  const todo = correrLargo(["tools/verdad/hueco.mjs"]);
  assert.equal(ultimaLinea(todo.stdout), TOTAL, `hueco.mjs tiene que terminar en «${TOTAL}» (hoy «29/36»; +3 filas, +3 hechas)\n${todo.out.slice(-1200)}`);

  // (4) Ninguna copia promovida sigue fijando el número viejo.
  const copias = readdirSync(resolve(ROOT, "tests")).filter((f) => f.endsWith(".test.ts"));
  const fijan = copias.filter((f) => readFileSync(join(ROOT, "tests", f), "utf8").includes(VIEJO));
  assert.deepEqual(fijan, [], `estas copias promovidas todavía fijan «${VIEJO}»: pasan a «32/39»`);

  // (5) CT-1 en todo el contrato legible: ninguna fila de `services[i].name` dice 2–5 (D-140).
  const md = join(BLOQUE, "CONTRATOS-HUECOS.md");
  assert.ok(existsSync(md), `precondición: existe ${md}`);
  const viejas = readFileSync(md, "utf8").split(/\r?\n/).map((l, i) => [i + 1, l] as const)
    .filter(([, l]) => l.includes("`services[i].name`") && /\b2\s*[–-]\s*5\b/.test(l));
  assert.deepEqual(viejas.map(([n, l]) => `${n}: ${l.slice(0, 120)}`), [], "toda fila de `services[i].name` dice 1 a 5 palabras (CT-1, cerrado el 2026-09-27)");
});
