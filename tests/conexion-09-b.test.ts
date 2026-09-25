// CONEXION-09 · B (T) · el contrato de la fila que D-90 cierra: `branding.heroToBackdrop` pasa a derivado SIN casilla, con guard y
// con el dato verdadero. Sesión A (2026-09-24): test rojo — la fila tiene `guard: null`.
// D-90 (Liam, «Arreglar y no construir»): la fila NO gana `ui`. Su estado en `hueco.mjs` no cambia (UI «NO»), y por eso el total
// sigue en «29/36»: el techo real del constructor es 30/36 (36 menos los seis derivados), no 36.
// Caja negra: lectura del .json fila por id y del .md, y `hueco.mjs --json` real (el mismo binario que mide la línea base).
// Sólo en T (inciso n).
// COPIA PROMOVIDA (E2E-01, 2026-09-25): la carpeta `tests/orden/conexion-09/` queda congelada al aprobarse la orden y ésta es la
// copia editable. Único cambio respecto del original: el import de `_comun.ts` apunta a `./orden/conexion-09/_comun.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  BLOQUE, CLAVE, CONTRATOS, DERIVADA, GUARD_FILA, HUECO, NOTA, PRESET_01, ROOT, TIPO_SIN_CASILLA, TOTAL_HUECO,
  correrLargo, git, lineasCon, ultimaLinea,
} from "./orden/conexion-09/_comun.ts";

type FilaJson = { id: string; tipo?: string; ui: unknown; contrato?: { campo?: string }; guard: unknown; [k: string]: unknown };
type Contratos = { huecos: FilaJson[] };
type Check = { ok: boolean; detalle: string };
type Resultado = { id: string; checks: Record<"contrato" | "validador" | "ui" | "material" | "guard", Check>; hecho: boolean };

test("verdad/contratos.json declara en la fila `branding.heroToBackdrop` `guard` = `{ archivo: \"tests/transicion.test.ts\", clave: \"heroToBackdrop\" }` y un `tipo` que contiene «sin casilla (D-90)»; CH gana «sin casilla (CONEXION-09)» en la línea donde vive su contrato; las otras 35 filas del .json byte a byte como en 1b0ccd6; y `hueco.mjs --json` da en esa fila guard «sí» y UI «NO», y el total sigue en «29/36 huecos hechos»", () => {
  const actual = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as Contratos;
  const fila = actual.huecos.find((h) => h.id === DERIVADA);
  assert.ok(fila, `fila ${DERIVADA} en ${CONTRATOS}`);
  // (1) El guard de la fila. Hoy es `null`: aquí es donde esta orden está en rojo.
  assert.deepEqual(fila.guard, GUARD_FILA, `${DERIVADA}.guard = ${JSON.stringify(GUARD_FILA)} (hay ${JSON.stringify(fila.guard)})`);
  // (2) Y su `tipo` dice que no va a tener casilla (D-90 reemplaza a D-83).
  assert.ok(String(fila.tipo ?? "").includes(TIPO_SIN_CASILLA), `${DERIVADA}.tipo debe decir «${TIPO_SIN_CASILLA}» (hay «${String(fila.tipo)}»)`);
  assert.equal(fila.ui, null, `${DERIVADA}.ui sigue en null: D-90 decide no construir la casilla`);

  // (3) Las otras 35 filas: iguales, campo a campo, a las del commit aprobado de PRESET-01; y de ésta sólo cambian `tipo` y `guard`.
  const base = JSON.parse(git(ROOT, "show", `${PRESET_01.aprobado.T}:${CONTRATOS}`)) as Contratos;
  assert.equal(base.huecos.length, 36, "precondición: 36 filas en la línea base");
  assert.equal(actual.huecos.length, 36, "siguen siendo 36 filas");
  assert.deepEqual(actual.huecos.map((h) => h.id), base.huecos.map((h) => h.id), "mismos ids en el mismo orden");
  const otras = base.huecos.filter((h) => h.id !== DERIVADA);
  assert.equal(otras.length, 35, `35 filas fuera de ${DERIVADA} (hay ${otras.length})`);
  for (const f of otras) assert.deepEqual(actual.huecos.find((h) => h.id === f.id), f, `la fila ${f.id} no cambia`);
  const filaBase = base.huecos.find((h) => h.id === DERIVADA)!;
  assert.deepEqual({ ...fila, tipo: null, guard: null }, { ...filaBase, tipo: null, guard: null }, `${DERIVADA}: de esa fila sólo cambian el tipo y el guard`);

  // (4) CONTRATOS-HUECOS.md: la nota en la línea donde vive el contrato de la fila (la misma línea que mide hueco.mjs).
  const md = readFileSync(join(BLOQUE, "CONTRATOS-HUECOS.md"), "utf8").split(/\r?\n/);
  const campo = fila.contrato?.campo;
  assert.ok(campo, `la fila ${DERIVADA} declara contrato.campo`);
  const lineas = lineasCon(md, campo);
  assert.ok(lineas.length > 0, `CONTRATOS-HUECOS.md tiene el contrato de ${DERIVADA} («${campo}»)`);
  assert.ok(lineas.some((l) => l.includes(NOTA)), `la línea del contrato de ${DERIVADA} debe decir «${NOTA}»:\n${lineas[0].slice(0, 400)}`);

  // (5) La medida: la fila con guard «sí» y UI «NO» (D-90), y el total sin moverse.
  const j = correrLargo([HUECO, "--json"]);
  assert.ok(j.status === 0 || j.status === 2, `hueco.mjs --json sale 0 o 2 (salió ${j.status})\n${j.out.slice(-2000)}`);
  const resultados = JSON.parse(j.stdout) as Resultado[];
  assert.equal(resultados.length, 36);
  const medida = resultados.find((x) => x.id === DERIVADA);
  assert.ok(medida, `fila ${DERIVADA} en la medida`);
  assert.equal(medida.checks.guard.ok, true, `${DERIVADA} · guard: «sí» (${medida.checks.guard.detalle})`);
  assert.equal(medida.checks.ui.ok, false, `${DERIVADA} · UI: «NO» (D-90: sin casilla; dio «${medida.checks.ui.detalle}»)`);
  assert.equal(medida.hecho, false, `${DERIVADA} sigue sin estar «hecha»: es un derivado, no un hueco del constructor`);
  assert.ok(String(medida.checks.guard.detalle).includes(GUARD_FILA.archivo), `el detalle del guard nombra ${GUARD_FILA.archivo} (dio «${medida.checks.guard.detalle}»)`);
  assert.ok(String(fila.clave ?? "") === CLAVE, `${DERIVADA}.clave = «${CLAVE}»`);

  const r = correrLargo([HUECO]);
  assert.equal(ultimaLinea(r.stdout), TOTAL_HUECO, `el texto termina con «${TOTAL_HUECO}» (esta orden no mueve el total; última línea: «${ultimaLinea(r.stdout)}»)`);
});
