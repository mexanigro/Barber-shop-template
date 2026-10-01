// TEAM-RESENAS-01 · F1 (T+H) · retiro de SERVICIOS-GALERIA-01 (D-172): promovida a npm test como copias editables, con su carpeta
// congelada desde el último rojo. Sesión A (2026-10-01): test rojo. La línea de APROBADAS.md la escribe A en este mismo commit rojo
// (precedente D-38/D-146/D-159): por eso no es una afirmación —ya no puede estar en rojo—.
// D-174 (lo que piden Liam y la verificadora para estas copias): en T `a` (A1–A4, B1–B3, C1, D1) va a `test:browser` y corre UN CASO
// POR PLANTILLA —declara sus casos en `CASOS`, uno de A y uno de C— (D-165); `f` y `g` a `test:unit`; en H `e`, `f` y `g`. La copia de
// B2 vigila además la máscara de `.gal-wall`, que entre desde el 55 % de la franja (la verificadora midió que sin ella B2 queda verde y
// la galería cambia entre 66.984 y 388.197 px contra local). Y ninguna espera con tiempos fijos (B midió 6 de 9 con carga): ni la
// copia ni lo que lanza —que por eso no puede ser `tests/orden/servicios-galeria-01/instrumentos/`, congelada y llena de
// `waitForTimeout`, sino copias editables en `tests/servicios-galeria-01-instrumentos/`— llaman a `waitForTimeout(`, a `sleep(` ni a
// `setTimeout(<resolver>, n)`.
// Caja negra: git del repo real y lectura de las copias. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { REPO, ROOT, SERVICIOS_GALERIA_01, git } from "./_comun.ts";

/** Las letras de SERVICIOS-GALERIA-01 que esta hoja promueve en cada repo y las que, en T, van a test:browser. */
const LETRAS = { T: ["a", "f", "g"], H: ["e", "f", "g"] };
const NAVEGADOR_T = ["a"];
const ORDEN = "servicios-galeria-01";
const CARPETA = `tests/orden/${ORDEN}`;
const INSTRUMENTOS = `tests/${ORDEN}-instrumentos`;
/** Una espera de tiempo fijo: lo que hace caer una medición con carga en la máquina. */
const ESPERA_FIJA = /\bwaitForTimeout\(|\bsleep\(|\bsetTimeout\(\s*(?:r|res|resolve|ok|listo|fin|done)\s*,/;

test("npm test corre las copias de servicios-galeria-01 que esta hoja promueve —en T `a`, `f` y `g`; en H `e`, `f` y `g`—, que importan ./orden/servicios-galeria-01/_comun.ts; en T `a` va a `test:browser` y declara en `CASOS` un caso de A y uno de C, su parte de G2-a vigila además que la máscara de `.gal-wall` entre desde el 55 % de la franja, y ni ella ni los instrumentos que lanza —copias editables en tests/servicios-galeria-01-instrumentos/, no los congelados— esperan con un tiempo fijo; `f` y `g` van a `test:unit`; y tests/orden/servicios-galeria-01/ no cambia desde su último rojo (ab091fc en T, 1ac9767 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  // (1) Las copias. Hoy no existen: aquí está el rojo.
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);

  // (2) La copia de navegador (sólo en T): un caso por plantilla, la máscara de G2-a y ninguna espera fija.
  if (REPO === "T") {
    const a = leer(`tests/${ORDEN}-a.test.ts`);
    const casos = a.match(/\bconst CASOS\s*=\s*\[([^\]]*)\]/)?.[1];
    assert.ok(casos, `tests/${ORDEN}-a.test.ts declara sus casos en CASOS`);
    const ks = [...casos!.matchAll(/["'`]([ac])-[^"'`]+["'`]/g)].map((m) => m[1]);
    assert.deepEqual(ks.sort(), ["a", "c"], `un caso por plantilla: CASOS = [${casos}]`);
    assert.ok(/gal-wall/.test(a) && /\b55\s*%|\b0?\.55\b/.test(a), `tests/${ORDEN}-a.test.ts vigila la máscara de .gal-wall desde el 55 % de la franja`);
    assert.ok(!a.includes(`${CARPETA}/instrumentos`) && !/["'`]instrumentos["'`]/.test(a), `tests/${ORDEN}-a.test.ts no lanza los instrumentos congelados (esperan con tiempos fijos)`);
    assert.ok(existsSync(resolve(ROOT, INSTRUMENTOS)), `existen las copias editables de los instrumentos en ${INSTRUMENTOS}/`);
    const archivos = [`tests/${ORDEN}-a.test.ts`, ...readdirSync(resolve(ROOT, INSTRUMENTOS)).filter((f) => /\.m?[jt]s$/.test(f)).map((f) => `${INSTRUMENTOS}/${f}`)];
    for (const f of archivos) assert.ok(!ESPERA_FIJA.test(leer(f)), `${f} no espera con un tiempo fijo (${leer(f).match(ESPERA_FIJA)?.[0]})`);
  }

  // (3) npm test las corre; en T, la fase por letra.
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const [i, c] of copias.entries()) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO !== "T") continue;
    const fase = NAVEGADOR_T.includes(LETRAS.T[i]) ? "test:browser" : "test:unit";
    assert.ok(nombra(scripts[fase], c), `en T, ${c} va en ${fase} (D-57, D-121)`);
  }

  // (4) La carpeta de la orden, congelada desde su último rojo.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(SERVICIOS_GALERIA_01.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${SERVICIOS_GALERIA_01.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
