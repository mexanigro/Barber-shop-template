// CONEXION-09 · A (T) · la transición hero → fondo calculada de verdad: la aritmética extraída a un módulo puro y sin comodín (A1) y
// la herramienta corriendo sobre el material real, con los dos fixtures diciendo lo que mide (A2). Sesión A (2026-09-24): tests rojos
// — no existe `tests/transicion.test.ts` (A1) y `transicion.mjs` sale 1 en A («Error opening input file …\https:\firebasestorage…»,
// porque `local()` le pasa a ffmpeg la url de Storage como si fuera una ruta) (A2).
// D-76: un guard protege lo que la herramienta HACE. Por eso A1 no se conforma con leer el guard: lo CORRE anidado —con `tsx --test`,
// el mismo runner que su fase `test:unit` en la suite de T, y `NODE_TEST_CONTEXT` borrado (lección de CONEXION-06-A2: heredarlo hace
// que el runner avise «skipping running files» y salga 0 sin cargar nada)— y además LLAMA él mismo a `relacionHeroFondo` con los
// casos de la frase. El módulo puro se localiza por el import de `transicion.mjs` (§ Interfaz: B elige el nombre del archivo).
// A2 corre `transicion.mjs` real (ffmpeg + Chromium) SIN `--escribir` y compara con `git show 1b0ccd6:…` hoja por hoja.
// Ningún test escribe en T, en H, en Storage ni en Firestore. Sólo en T (inciso n).
// COPIA PROMOVIDA (E2E-01, 2026-09-25): la carpeta `tests/orden/conexion-09/` queda congelada al aprobarse la orden y ésta es la
// copia editable. Único cambio respecto del original: el import de `_comun.ts` apunta a `./orden/conexion-09/_comun.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CLAVE, CLAVES_RELACION, D93, DERIVADA, FIXTURES, GUARD_TRANSICION, PRESET_01, ROOT, TRANSICION,
  cambios, conTemporal, correrGuardTsx, correrLargo, fixture, fuente, get, git, jsonFinal, nombreFixture, nombresTap, relacionDeTransicion,
  tokensDeScript, type Lch,
} from "./orden/conexion-09/_comun.ts";

/** El comodín que D-92 (3) saca: hoy `--escribir` guarda `relation ?? "adjacent-hue"` (T:tools/material/transicion.mjs:56). */
const COMODIN = '?? "adjacent-hue"';
/** Lo que el módulo puro NO puede arrastrar: `gama.mjs` importa `playwright`, y el guard de A1 corre en la fase concurrente. */
const PROHIBIDOS = ["gama.mjs", "playwright"];
/** Un tono con croma suficiente para que el tono se juzgue. */
const lch = (L: number, C: number, H: number): Lch => ({ L, C, H });

test("tests/transicion.test.ts existe, está en `test:unit` de package.json y nombra literalmente «heroToBackdrop»; afirma sobre `relacionHeroFondo` (importada de su módulo en `tools/material/`, que no importa `gama.mjs` ni `playwright`): ΔH 10° y ΔL 0,10 → `same-hue`; ΔH 10° y ΔL 0,11 → `same-hue-different-light` con `scrim-dies-into-photo`; ΔH 35° → `adjacent-hue`; ΔH 36° → `relation` `null`; croma < 0,01 en el pie o en la foto → `neutro` y ΔH 0; y los números de A y C de D-93 dan su relación y su mecanismo. Además, `transicion.mjs` importa `relacionHeroFondo` y no contiene `?? \"adjacent-hue\"`", async () => {
  // (1) El guard nuevo: existe, lo corre la fase concurrente y nombra la clave. Hoy no existe: aquí es donde esta orden está en rojo.
  assert.ok(existsSync(resolve(ROOT, GUARD_TRANSICION)), `no existe ${GUARD_TRANSICION}`);
  assert.ok(tokensDeScript("test:unit").includes(GUARD_TRANSICION), `${GUARD_TRANSICION} debe estar en el script test:unit (D-57)`);
  assert.ok(!tokensDeScript("test:browser").includes(GUARD_TRANSICION), `${GUARD_TRANSICION} no va en la fase de a uno: la función es pura`);
  assert.ok(fuente(GUARD_TRANSICION).includes(CLAVE), `${GUARD_TRANSICION} debe nombrar literalmente «${CLAVE}»`);

  // (2) El guard CORRE con el runner de su fase (`tsx --test`, como `npm run test:unit`) y pasa de verdad.
  const r = correrGuardTsx(GUARD_TRANSICION);
  assert.equal(r.status, 0, `${GUARD_TRANSICION} debe salir 0 con tsx --test (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, /^# fail 0$/m, `${GUARD_TRANSICION} sin fallos:\n${r.stdout.slice(-2000)}`);
  assert.doesNotMatch(r.out, /skipping running files/, "el runner anidado corrió de verdad (NODE_TEST_CONTEXT borrado)");
  assert.ok(nombresTap(r.stdout).length >= 1, `${GUARD_TRANSICION} declara al menos un test en el TAP`);

  // (3) `transicion.mjs` importa la función y ya no inventa una relación cuando no hay ninguna (D-92 (3)).
  const src = fuente(TRANSICION);
  assert.ok(!src.includes(COMODIN), `${TRANSICION} no contiene «${COMODIN}»: fuera de los tres casos no se escribe nada (D-92)`);
  const { archivo, fuente: puro, relacionHeroFondo } = await relacionDeTransicion();
  for (const prohibido of PROHIBIDOS) {
    assert.ok(!puro.includes(prohibido), `el módulo puro (${archivo.replace(resolve(ROOT) + "\\", "").replace(/\\/g, "/")}) no importa «${prohibido}»: el guard de A1 corre en la fase concurrente`);
  }

  // (4) Lo que el guard afirma, medido aquí: los cinco casos de la frase, llamando a la función.
  //     Los dos tonos se pasan en OKLCH ({ L, C, H }), que es lo que `transicion.mjs` calcula hoy (§ Interfaz fijada por A).
  const borde = relacionHeroFondo(lch(0.60, 0.05, 0), lch(0.50, 0.05, 10));
  assert.equal(borde.dH, 10, `ΔH 10° (dio ${borde.dH})`);
  assert.equal(borde.dL, 0.1, `ΔL 0,10 (dio ${borde.dL})`);
  assert.equal(borde.relation, "same-hue", "ΔH 10° y ΔL 0,10 → same-hue (el borde entra)");

  const luz = relacionHeroFondo(lch(0.61, 0.05, 0), lch(0.50, 0.05, 10));
  assert.equal(luz.dH, 10, `ΔH 10° (dio ${luz.dH})`);
  assert.equal(luz.dL, 0.11, `ΔL 0,11 (dio ${luz.dL})`);
  assert.equal(luz.relation, "same-hue-different-light", "ΔH 10° y ΔL 0,11 → same-hue-different-light");
  assert.equal(luz.mechanism, "scrim-dies-into-photo", "…con scrim-dies-into-photo");

  const vecino = relacionHeroFondo(lch(0.60, 0.05, 0), lch(0.58, 0.05, 35));
  assert.equal(vecino.dH, 35, `ΔH 35° (dio ${vecino.dH})`);
  assert.equal(vecino.relation, "adjacent-hue", "ΔH 35° → adjacent-hue (el borde entra)");

  const fuera = relacionHeroFondo(lch(0.60, 0.05, 0), lch(0.58, 0.05, 36));
  assert.equal(fuera.dH, 36, `ΔH 36° (dio ${fuera.dH})`);
  assert.equal(fuera.relation, null, "ΔH 36° → relation null: el clip y la foto no valen juntos");

  for (const [quien, pie, foto] of [
    ["el pie", lch(0.60, 0.005, 0), lch(0.58, 0.05, 200)],
    ["la foto", lch(0.60, 0.05, 0), lch(0.58, 0.005, 200)],
  ] as const) {
    const n = relacionHeroFondo(pie, foto);
    assert.equal(n.neutro, true, `croma < 0,01 en ${quien} → neutro`);
    assert.equal(n.dH, 0, `…y ΔH 0 (el tono no se juzga; dio ${n.dH})`);
  }

  // (5) Y los números de D-93: A es neutra con ΔL 0,079, C tiene ΔH 6° y ΔL 0,118.
  const a = relacionHeroFondo(lch(0.601, 0.005, 323), lch(0.522, 0.05, 200));
  assert.equal(a.neutro, true, "A: el pie del clip es neutro (C 0,005)");
  assert.deepEqual([a.dH, a.dL], [D93.a.dH, D93.a.dL], `A: ΔH ${D93.a.dH} y ΔL ${D93.a.dL} (dio ${a.dH} y ${a.dL})`);
  assert.equal(a.relation, D93.a.relation, `A: ${D93.a.relation}`);
  assert.equal(a.mechanism, D93.a.mechanism, `A: ${D93.a.mechanism}`);

  const c = relacionHeroFondo(lch(0.519, 0.022, 21), lch(0.401, 0.05, 27));
  assert.deepEqual([c.dH, c.dL], [D93.c.dH, D93.c.dL], `C: ΔH ${D93.c.dH}° y ΔL ${D93.c.dL} (dio ${c.dH} y ${c.dL})`);
  assert.equal(c.relation, D93.c.relation, `C: ${D93.c.relation}`);
  assert.equal(c.mechanism, D93.c.mechanism, `C: ${D93.c.mechanism}`);
});

test("`node tools/material/transicion.mjs peluqueria-paleta-a --json` y `… -c --json` salen 0, y `branding.heroToBackdrop` de cada fixture es igual a lo que imprimen (`relation`, `mechanism`, `dH`, `dL`, `foot`, `footPortrait`): A `same-hue` con `veil-from-first-pixel`, C `same-hue-different-light` con `scrim-dies-into-photo`; nada más cambia en los fixtures (`git diff 1b0ccd6 HEAD -- dev-fixtures/*.json`, comparado hoja por hoja, sólo toca `branding.heroToBackdrop`)", () => {
  for (const p of ["a", "c"] as const) {
    // (1) La herramienta corre sobre el material real. Hoy sale 1: aquí es donde esta orden está en rojo.
    //     Sin `--escribir`: este test no toca los fixtures.
    //     Su `os.tmpdir()` se apunta a una carpeta nuestra, que se borra en `finally`: `transicion.mjs` hace
    //     `mkdtempSync(tmpdir(), "transicion-")` y sólo la borra DESPUÉS de medir, así que al salir 1 la deja (y rojo-verde la
    //     contaría como resto de la corrida, D-53). Contenida aquí, el resto es nuestro y desaparece pase lo que pase.
    const r = conTemporal((base) => correrLargo([TRANSICION, nombreFixture(p), "--json"], { env: { TEMP: base, TMP: base, TMPDIR: base } }));
    assert.equal(r.status, 0, `transicion.mjs ${nombreFixture(p)} --json debe salir 0 (salió ${r.status})\n${r.out.slice(-2500)}`);
    const medido = jsonFinal(r.stdout);

    // (2) La relación y el mecanismo que D-93 midió.
    assert.equal(medido.relation, D93[p].relation, `${p}: relation = ${D93[p].relation} (dio ${JSON.stringify(medido.relation)})`);
    assert.equal(medido.mechanism, D93[p].mechanism, `${p}: mechanism = ${D93[p].mechanism} (dio ${JSON.stringify(medido.mechanism)})`);

    // (3) Y el fixture guarda exactamente eso, las seis claves (hoy `--json` no imprime `footPortrait`: D-92 lo pide).
    const guardado = get(fixture(p), DERIVADA);
    assert.ok(guardado && typeof guardado === "object", `${p}: el fixture tiene ${DERIVADA} (hay ${JSON.stringify(guardado)})`);
    for (const clave of CLAVES_RELACION) {
      assert.ok(clave in (medido as Record<string, unknown>), `${p}: la salida --json imprime «${clave}»`);
      assert.deepEqual((guardado as Record<string, unknown>)[clave], (medido as Record<string, unknown>)[clave], `${p}: ${DERIVADA}.${clave} = lo que mide transicion.mjs`);
    }
  }
  // (4) Nada más cambia: contra el commit aprobado de PRESET-01, cada hoja distinta cuelga de `branding.heroToBackdrop`.
  for (const p of ["a", "c"] as const) {
    const rel = `${FIXTURES}/${nombreFixture(p)}.json`;
    const antes = JSON.parse(git(ROOT, "show", `${PRESET_01.aprobado.T}:${rel}`));
    const ahora = JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
    const otras = cambios(antes, ahora).filter((ruta) => ruta !== DERIVADA && !ruta.startsWith(`${DERIVADA}.`));
    assert.deepEqual(otras, [], `${rel}: fuera de ${DERIVADA}, nada cambia desde ${PRESET_01.aprobado.T}`);
  }
});
