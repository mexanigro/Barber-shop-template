// CIERRE-TRAMO-01 · D1 (T+H) · retiro de CONTACTO-PIE-01 (D-213): promovida a npm test como copias editables, con su carpeta congelada
// desde el último rojo. Sesión A (2026-10-03): test rojo. La línea de APROBADAS.md la escribe A en este mismo commit rojo (precedente
// D-38/D-146/D-159/D-172/D-188/D-201): por eso no es una afirmación —ya no puede estar en rojo—.
// D-221 (lo que pide Liam para estas copias, como D-210): en T `a` va a `test:browser` y corre UN CASO POR PLANTILLA —declara sus casos
// en `CASOS`, uno de A y uno de C— (D-165); `b`, `f` y `g` a `test:unit`; en H `e`, `f` y `g`. Ninguna espera con tiempos fijos: ni la
// copia ni lo que lanza —copias editables en `tests/contacto-pie-01-instrumentos/`, no los congelados de `tests/orden/contacto-pie-01/`—.
// Y la A1 de la copia `a` tiene que comprobar que el enlace del mapa LLEVA la dirección: medido por la verificadora (`mut.mjs`, mutación
// A1), la A1 de la orden pasaba con `query=` vacío, porque `ct.mjs` y `juezContacto` miran sólo el prefijo del enlace. Se prueba por lo
// que hace: en un clon de HEAD (nunca en el repo) se vacía la dirección del enlace en `contact-v6.tsx` y se corre sólo esa A1.
// Caja negra: git del repo real, lectura de las copias y, en T, la A1 de la copia en un clon. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, matchesGlob, resolve } from "node:path";
import { CONTACTO_PIE_01, REPO, ROOT, clonDe, conTemporal, correrNode, entornoLimpio, git, quitarEnlace } from "./_comun.ts";

/** Las letras de CONTACTO-PIE-01 que esta hoja promueve en cada repo y las que, en T, van a test:browser. */
const LETRAS = { T: ["a", "b", "f", "g"], H: ["e", "f", "g"] };
const NAVEGADOR_T = ["a"];
const ORDEN = "contacto-pie-01";
const CARPETA = `tests/orden/${ORDEN}`;
const INSTRUMENTOS = `tests/${ORDEN}-instrumentos`;
/** Una espera de tiempo fijo: lo que hace caer una medición con carga en la máquina. */
const ESPERA_FIJA = /\bwaitForTimeout\(|\bsleep\(|\bsetTimeout\(\s*(?:r|res|resolve|ok|listo|fin|done)\s*,/;
/** La A1 de CONTACTO-PIE-01 (el principio de su frase) y la mutación de la verificadora: el enlace del mapa sin la dirección. */
const A1 = "contacto de peluquería es una variante propia";
const CONTACTO = "src/components/landing/contact/contact-v6.tsx";
const CON_DIRECCION = "query=${encodeURIComponent(direccion)}`";
const SIN_DIRECCION = "query=`";

test("npm test corre las copias de contacto-pie-01 que esta hoja promueve —en T `a`, `b`, `f` y `g`; en H `e`, `f` y `g`—, que importan ./orden/contacto-pie-01/_comun.ts; en T `a` va a `test:browser`, declara en `CASOS` un caso de A y uno de C, ni ella ni los instrumentos que lanza —copias editables en tests/contacto-pie-01-instrumentos/, no los congelados— esperan con un tiempo fijo, y su A1 cae en un clon de HEAD con el enlace del mapa sin la dirección; `b`, `f` y `g` van a `test:unit`; y tests/orden/contacto-pie-01/ no cambia desde su último rojo (3aec6fd en T, fa8eebb en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  // (1) Las copias. Hoy no existen: aquí está el rojo.
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);

  // (2) La copia de navegador (sólo en T): un caso por plantilla y ninguna espera fija.
  if (REPO === "T") {
    const a = leer(`tests/${ORDEN}-a.test.ts`);
    const casos = a.match(/\bconst CASOS\s*=\s*\[([^\]]*)\]/)?.[1];
    assert.ok(casos, `tests/${ORDEN}-a.test.ts declara sus casos en CASOS`);
    const ks = [...casos!.matchAll(/["'`]([ac])-[^"'`]+["'`]/g)].map((m) => m[1]);
    assert.deepEqual(ks.sort(), ["a", "c"], `un caso por plantilla: CASOS = [${casos}]`);
    assert.ok(!a.includes(`${CARPETA}/instrumentos`) && !/["'`]instrumentos["'`]/.test(a), `tests/${ORDEN}-a.test.ts no lanza los instrumentos congelados`);
    assert.ok(existsSync(resolve(ROOT, INSTRUMENTOS)), `existen las copias editables de los instrumentos en ${INSTRUMENTOS}/`);
    const propios = readdirSync(resolve(ROOT, "tests")).filter((f) => f.startsWith(`${ORDEN}-`) && /\.m?[jt]s$/.test(f)).map((f) => `tests/${f}`);
    const archivos = [...propios, ...readdirSync(resolve(ROOT, INSTRUMENTOS)).filter((f) => /\.m?[jt]s$/.test(f)).map((f) => `${INSTRUMENTOS}/${f}`)];
    for (const f of archivos) assert.ok(!ESPERA_FIJA.test(leer(f)), `${f} no espera con un tiempo fijo (${leer(f).match(ESPERA_FIJA)?.[0]})`);
    assert.ok(a.includes(A1), `tests/${ORDEN}-a.test.ts conserva la A1 de la orden («${A1}…»)`);
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
  assert.ok(rojo.startsWith(CONTACTO_PIE_01.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${CONTACTO_PIE_01.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);

  // (5) Sólo en T: la A1 de la copia comprueba que el enlace del mapa lleva la dirección (la mutación de la verificadora la tumba).
  if (REPO === "T") {
    conTemporal((base) => {
      const clon = clonDe(base, "clon", git(ROOT, "rev-parse", "HEAD"));
      try {
        const fuenteContacto = readFileSync(join(clon, CONTACTO), "utf8");
        assert.ok(fuenteContacto.includes(CON_DIRECCION), `precondición (ARNÉS): ${CONTACTO} arma el enlace con «${CON_DIRECCION}»`);
        writeFileSync(join(clon, CONTACTO), fuenteContacto.replace(CON_DIRECCION, SIN_DIRECCION));
        const r = correrNode(["--import", "tsx", "--test", "--test-reporter=tap", `--test-name-pattern=^${A1}`, `tests/${ORDEN}-a.test.ts`], { cwd: clon, env: entornoLimpio(), minutos: 30 });
        const cae = Number(r.stdout.match(/^# fail (\d+)/m)?.[1] ?? NaN);
        assert.equal(cae, 1, `con el enlace del mapa sin la dirección, la A1 de tests/${ORDEN}-a.test.ts cae (fail ${cae})\n${r.out.slice(-2000)}`);
      } finally { quitarEnlace(clon); }
    });
  }
});
