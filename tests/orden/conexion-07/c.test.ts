// CONEXION-07 · C (T) · contrato y línea base. C1: `verdad/contratos.json` declara el `guard` de las seis filas que esta orden hace,
// CONTRATOS-HUECOS.md lleva su nota, las otras 30 filas quedan como en el commit aprobado de CONEXION-06 (b5b78f7) y `hueco.mjs` pasa
// de 20/36 a 26/36. Sesión A (2026-09-23): test rojo — las seis tienen `guard: null` y hueco da 20/36.
// Caja negra: lectura del .json (fila por id) y del .md, y `hueco.mjs --json` real (el mismo binario que mide la línea base).
// Ajuste de A (2026-09-23): la nota se exige en la LÍNEA donde vive el contrato de cada fila, no «en esas seis filas» — cinco son
// filas de tabla, pero el contrato de `staff.photoUrl` (`staff[].photoUrl`) vive en el párrafo de § Gama de color, no en una fila.
// Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BASE_HECHOS, BLOQUE, CONEXION_06, CONTRATOS, FILAS, GUARDS, HUECO, NOTA, ROOT, correr, git, lineasCon, ultimaLinea } from "./_comun.ts";

type FilaJson = { id: string; contrato?: { campo?: string }; guard: unknown; [k: string]: unknown };
type Contratos = { huecos: FilaJson[] };
type Check = { ok: boolean; detalle: string };
type Resultado = { id: string; checks: Record<"contrato" | "validador" | "ui" | "material" | "guard", Check>; hecho: boolean };

const LUGARES = ["contrato", "validador", "ui", "material", "guard"] as const;

test("verdad/contratos.json declara `guard` en las seis filas: `hero.titular` = `{ archivo: \"tests/hero-textos.test.ts\", clave: \"titleHighlight\" }`, `hero.subtitle` = `… \"subtitle\"`, `hero.cta` = `… \"ctaPrimary\"`, `testimonials.rating` = `{ archivo: \"tests/secciones-datos.test.ts\", clave: \"rating\" }`, `staff.photoUrl` = `… \"photoUrl\"`, `navbar.variant` = `… \"navbar\"`; CH gana la nota «guard (CONEXION-07)» en la línea donde vive el contrato de cada una de las seis; las otras 30 filas del .json byte a byte como en b5b78f7; y `hueco.mjs --json` da las cinco casillas en «sí» y `hecho: true` en las seis, y el total es «26/36 huecos hechos»", () => {
  const actual = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as Contratos;
  // (1) El `guard` de cada una de las seis, tal como lo fija la hoja. Hoy los seis son `null`: aquí está el rojo.
  for (const id of FILAS) {
    const fila = actual.huecos.find((h) => h.id === id);
    assert.ok(fila, `fila ${id} en ${CONTRATOS}`);
    assert.deepEqual(fila.guard, GUARDS[id], `${id}.guard = ${JSON.stringify(GUARDS[id])} (hay ${JSON.stringify(fila.guard)})`);
  }
  // (2) Las otras 30 filas: iguales, campo a campo, a las del commit aprobado de CONEXION-06 (la línea base de esta orden).
  const base = JSON.parse(git(ROOT, "show", `${CONEXION_06.aprobado.T}:${CONTRATOS}`)) as Contratos;
  assert.equal(base.huecos.length, 36, "precondición: 36 filas en la línea base");
  assert.equal(actual.huecos.length, 36, "siguen siendo 36 filas");
  assert.deepEqual(actual.huecos.map((h) => h.id), base.huecos.map((h) => h.id), "mismos ids en el mismo orden");
  const otras = base.huecos.filter((h) => !(FILAS as readonly string[]).includes(h.id));
  assert.equal(otras.length, 30, `30 filas fuera de las seis de esta orden (hay ${otras.length})`);
  for (const fila of otras) assert.deepEqual(actual.huecos.find((h) => h.id === fila.id), fila, `la fila ${fila.id} no cambia`);
  // (3) CONTRATOS-HUECOS.md: la nota en la línea donde vive el contrato de cada una (la misma línea que mide hueco.mjs).
  const md = readFileSync(join(BLOQUE, "CONTRATOS-HUECOS.md"), "utf8").split(/\r?\n/);
  for (const id of FILAS) {
    const campo = actual.huecos.find((h) => h.id === id)?.contrato?.campo;
    assert.ok(campo, `la fila ${id} declara contrato.campo`);
    const lineas = lineasCon(md, campo);
    assert.ok(lineas.length > 0, `CONTRATOS-HUECOS.md tiene el contrato de ${id} («${campo}»)`);
    assert.ok(lineas.some((l) => l.includes(NOTA)), `la línea del contrato de ${id} debe decir «${NOTA}»:\n${lineas[0].slice(0, 400)}`);
  }
  // (4) La medida: las seis con sus cinco lugares en «sí», y 26/36 en el total.
  const j = correr([HUECO, "--json"]);
  assert.ok(j.status === 0 || j.status === 2, `hueco.mjs --json sale 0 o 2 (salió ${j.status})\n${j.out.slice(-2000)}`);
  const resultados = JSON.parse(j.stdout) as Resultado[];
  assert.equal(resultados.length, 36);
  for (const id of FILAS) {
    const f = resultados.find((x) => x.id === id);
    assert.ok(f, `fila ${id}`);
    for (const k of LUGARES) assert.equal(f.checks[k].ok, true, `${id} · ${k}: «sí» (${f.checks[k].detalle})`);
    assert.equal(f.hecho, true, `${id}: hecho`);
  }
  const hechos = resultados.filter((f) => f.hecho).map((f) => f.id).sort();
  assert.deepEqual(hechos, [...BASE_HECHOS, ...FILAS].sort(), "hechos = los veinte de la línea base + las seis de esta orden; los otros 10 no cambian de estado");
  const r = correr([HUECO]);
  assert.equal(ultimaLinea(r.stdout), "26/36 huecos hechos", `el texto termina con «26/36 huecos hechos» (última línea: «${ultimaLinea(r.stdout)}»)`);
});
