// INSTAGRAM-FAQ-01 · copia promovida (CONTACTO-PIE-01, 2026-10-03, D-210). La orden quedó aprobada por Liam el 2026-10-03
// (T 392acff · H 75ede45) y su carpeta está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte: entera.
// INSTAGRAM-FAQ-01 · F1 (T+H) · retiro de TEAM-RESENAS-01 (D-188): promovida a npm test como copias editables, con su carpeta congelada
// desde el último rojo. Sesión A (2026-10-02): test rojo. La línea de APROBADAS.md la escribe A en este mismo commit rojo (precedente
// D-38/D-146/D-159/D-172): por eso no es una afirmación —ya no puede estar en rojo—.
// D-200 (lo que piden Liam y la verificadora para estas copias, como D-174): en T `a` (A1–A3, B1–B3, C1, C2, D1) va a `test:browser` y
// corre UN CASO POR PLANTILLA —declara sus casos en `CASOS`, uno de A y uno de C— (D-165); `b`, `f` y `g` a `test:unit`; en H `e`, `f` y
// `g`. Ninguna espera con tiempos fijos: ni la copia ni lo que lanza —que por eso no puede ser `tests/orden/team-resenas-01/instrumentos/`,
// congelada y llena de `waitForTimeout`, sino copias editables en `tests/team-resenas-01-instrumentos/`—. Y el juez de la cita de la copia
// fija los tamaños del paquete en móvil y en escritorio (el congelado aceptaba cualquier valor entre 15 y la base y no tenía escritorio:
// verificadora de TEAM-RESENAS-01, d1 del pedido de Liam).
// Caja negra: git del repo real y lectura de las copias. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { REPO, ROOT, TEAM_RESENAS_01, git } from "./orden/instagram-faq-01/_comun.ts";

/** Las letras de TEAM-RESENAS-01 que esta hoja promueve en cada repo y las que, en T, van a test:browser. */
const LETRAS = { T: ["a", "b", "f", "g"], H: ["e", "f", "g"] };
const NAVEGADOR_T = ["a"];
const ORDEN = "team-resenas-01";
const CARPETA = `tests/orden/${ORDEN}`;
const INSTRUMENTOS = `tests/${ORDEN}-instrumentos`;
/** Una espera de tiempo fijo: lo que hace caer una medición con carga en la máquina. */
const ESPERA_FIJA = /\bwaitForTimeout\(|\bsleep\(|\bsetTimeout\(\s*(?:r|res|resolve|ok|listo|fin|done)\s*,/;
/** Los tamaños de la cita que fija el paquete de reseñas (diseno/resenas/prototipo/proto.css), en móvil y en escritorio. */
const TAMANOS = [/movil\s*:\s*\{\s*corto\s*:\s*22\s*,\s*medio\s*:\s*19\s*,\s*largo\s*:\s*15\.5\s*\}/, /escritorio\s*:\s*\{\s*corto\s*:\s*32\s*,\s*medio\s*:\s*23\s*,\s*largo\s*:\s*17\s*\}/];

test("npm test corre las copias de team-resenas-01 que esta hoja promueve —en T `a`, `b`, `f` y `g`; en H `e`, `f` y `g`—, que importan ./orden/team-resenas-01/_comun.ts; en T `a` va a `test:browser`, declara en `CASOS` un caso de A y uno de C, ni ella ni los instrumentos que lanza —copias editables en tests/team-resenas-01-instrumentos/, no los congelados— esperan con un tiempo fijo, y su juez de la cita fija los tamaños del paquete en móvil (22, 19 y 15,5 px) y en escritorio (32, 23 y 17); `b`, `f` y `g` van a `test:unit`; y tests/orden/team-resenas-01/ no cambia desde su último rojo (36cbe35 en T, 99d5729 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  // (1) Las copias. Hoy no existen: aquí está el rojo.
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);

  // (2) La copia de navegador (sólo en T): un caso por plantilla, ninguna espera fija y el juez de la cita con los tamaños fijos.
  if (REPO === "T") {
    const a = leer(`tests/${ORDEN}-a.test.ts`);
    const casos = a.match(/\bconst CASOS\s*=\s*\[([^\]]*)\]/)?.[1];
    assert.ok(casos, `tests/${ORDEN}-a.test.ts declara sus casos en CASOS`);
    const ks = [...casos!.matchAll(/["'`]([ac])-[^"'`]+["'`]/g)].map((m) => m[1]);
    assert.deepEqual(ks.sort(), ["a", "c"], `un caso por plantilla: CASOS = [${casos}]`);
    assert.ok(!a.includes(`${CARPETA}/instrumentos`) && !/["'`]instrumentos["'`]/.test(a), `tests/${ORDEN}-a.test.ts no lanza los instrumentos congelados (esperan con tiempos fijos)`);
    assert.ok(existsSync(resolve(ROOT, INSTRUMENTOS)), `existen las copias editables de los instrumentos en ${INSTRUMENTOS}/`);
    const propios = readdirSync(resolve(ROOT, "tests")).filter((f) => f.startsWith(`${ORDEN}-`) && /\.m?[jt]s$/.test(f)).map((f) => `tests/${f}`);
    const archivos = [...propios, ...readdirSync(resolve(ROOT, INSTRUMENTOS)).filter((f) => /\.m?[jt]s$/.test(f)).map((f) => `${INSTRUMENTOS}/${f}`)];
    for (const f of archivos) assert.ok(!ESPERA_FIJA.test(leer(f)), `${f} no espera con un tiempo fijo (${leer(f).match(ESPERA_FIJA)?.[0]})`);
    for (const t of TAMANOS) assert.ok(archivos.some((f) => t.test(leer(f))), `el juez de la cita de la copia fija los tamaños del paquete (${t.source.replace(/\\s\*/g, "").replace(/\\/g, "")})`);
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
  assert.ok(rojo.startsWith(TEAM_RESENAS_01.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${TEAM_RESENAS_01.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
