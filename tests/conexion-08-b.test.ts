// CONEXION-08 · B (T) · el guard de las tres filas (B1) y el contrato que las declara hechas (B2). Sesión A (2026-09-23): tests rojos
// — no existe `tests/contacto-logo.test.ts` (B1) y las tres filas tienen `guard: null` (B2, y `hueco.mjs` da 26/36).
// D-76 (heredada de CONEXION-07): un guard protege lo que la página HACE con la clave, no que la nombre. Por eso B1 no se conforma con
// leerlo: lo CORRE anidado (`NODE_TEST_CONTEXT` borrado) y además MIDE POR SU CUENTA lo que el guard afirma — `toWhatsAppNumber` de
// verdad sobre el teléfono genérico, las tres llamadas de services-v6, navbar-v6 y hero-v6, y la regla de `invert` de navbar-v6:78,
// que se evalúa tal como está escrita en el archivo (de las dos ramas que la hoja deja abiertas, A fija la lectura del fuente: esta
// orden no toca navbar-v6, así que la regla sigue inline).
// Caja negra: sólo `src/lib/whatsapp.ts` por `import()` dinámico con extensión (es un .ts puro, sin `import.meta.env`); los tres
// componentes se leen como fuente. B2 lee el .json fila por id y el .md, y corre `hueco.mjs --json` real. Sólo en T (inciso n).
// COPIA PROMOVIDA (PRESET-01, 2026-09-23): la carpeta `tests/orden/conexion-08/` queda congelada y esta copia es la editable. Sin
// cambios respecto del original.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BASE_HECHOS, BLOQUE, CLAVES, CONEXION_07, CONTRATOS, FILAS, GUARDS, GUARD_CONTACTO, HERO_V6, HUECO, NAVBAR_V6, NOTA, NOTA_TOGGLE,
  ROOT, SERVICES_V6, TELEFONO, TOGGLE, WA, WHATSAPP, correrLargo, fuente, git, lineasCon, nombresTap, tokensDeScript, ultimaLinea,
} from "./orden/conexion-08/_comun.ts";

type FilaJson = { id: string; tipo?: string; contrato?: { campo?: string }; guard: unknown; [k: string]: unknown };
type Contratos = { huecos: FilaJson[] };
type Check = { ok: boolean; detalle: string };
type Resultado = { id: string; checks: Record<"contrato" | "validador" | "ui" | "material" | "guard", Check>; hecho: boolean };
const LUGARES = ["contrato", "validador", "ui", "material", "guard"] as const;

/** Los tres componentes que arman su enlace de WhatsApp con el teléfono del config. */
const LLAMADAS: [string, RegExp][] = [
  [SERVICES_V6, /toWhatsAppNumber\(\s*contact\.phone\s*\)/],
  [NAVBAR_V6, /toWhatsAppNumber\(\s*siteConfig\.contact\.phone\s*\)/],
  [HERO_V6, /toWhatsAppNumber\(\s*contact\.phone\s*\)/],
];

test("tests/contacto-logo.test.ts existe, está en `test:unit` y nombra literalmente «phone», «logo» y «logoDark»; afirma que `toWhatsAppNumber(\"+972 3-000-0000\")` da `\"97230000000\"` y que services-v6, navbar-v6 y hero-v6 construyen su enlace de WhatsApp con `toWhatsAppNumber(…contact.phone)`; y que navbar-v6 con `brand.logo` y `brand.logoDark` no invierte el logo sobre el hero (`invert` falso) y con `brand.logo` solo sí (la regla de navbar-v6:78, probada como función pura si B la extrae, o por lectura del fuente)", async () => {
  // (1) El guard nuevo: existe, lo corre la fase concurrente y nombra las tres claves. Hoy no existe: aquí está el rojo.
  assert.ok(existsSync(resolve(ROOT, GUARD_CONTACTO)), `no existe ${GUARD_CONTACTO}`);
  assert.ok(tokensDeScript("test:unit").includes(GUARD_CONTACTO), `${GUARD_CONTACTO} debe estar en el script test:unit (D-57)`);
  const guard = fuente(GUARD_CONTACTO);
  const faltan = CLAVES.filter((c) => !guard.includes(c));
  assert.deepEqual([...faltan], [], `${GUARD_CONTACTO} debe nombrar literalmente ${CLAVES.map((c) => `«${c}»`).join(", ")} (no nombra: ${faltan.join(", ")})`);

  // (2) El guard CORRE y pasa, con al menos un test por clave.
  const r = correrLargo(["--experimental-strip-types", "--test", GUARD_CONTACTO], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `${GUARD_CONTACTO} debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, /^# fail 0$/m, `${GUARD_CONTACTO} sin fallos:\n${r.stdout.slice(-2000)}`);
  assert.doesNotMatch(r.out, /skipping running files/, "el runner anidado corrió de verdad (NODE_TEST_CONTEXT borrado)");
  const nombres = nombresTap(r.stdout);
  assert.ok(nombres.length >= 3, `al menos un test por clave en el TAP (hay ${nombres.length}: ${nombres.join(" · ")})`);

  // (3) Lo que el guard afirma, medido aquí: el teléfono genérico da el número de wa.me, y las dos direcciones (un número israelí
  //     con 0 inicial también sale bien; una cadena vacía no inventa nada).
  const w = (await import(pathToFileURL(resolve(ROOT, WHATSAPP)).href)) as { toWhatsAppNumber: (raw: string | undefined | null, pais?: string) => string };
  assert.equal(typeof w.toWhatsAppNumber, "function", `${WHATSAPP} exporta toWhatsAppNumber`);
  assert.equal(w.toWhatsAppNumber(TELEFONO), WA, `toWhatsAppNumber("${TELEFONO}") = "${WA}"`);
  assert.equal(w.toWhatsAppNumber("03-612-4477"), "97236124477", "el otro lado: un número con 0 inicial cambia el 0 por 972");
  assert.equal(w.toWhatsAppNumber(""), "", "sin teléfono no hay número");

  // (4) Y que los tres componentes lo llaman con el teléfono del config (si no, el genérico no llegaría a ningún enlace).
  for (const [archivo, re] of LLAMADAS) assert.match(fuente(archivo), re, `${archivo} arma su enlace de WhatsApp con ${re.source}`);

  // (5) La regla del logo sobre el hero, evaluada tal como está escrita en navbar-v6 (no una copia de la regla en el test).
  const navbar = fuente(NAVBAR_V6);
  const m = navbar.match(/const invert = ([^;]+);/);
  assert.ok(m, `${NAVBAR_V6} declara la regla como «const invert = …;»`);
  const invert = new Function("overHero", "brand", `return (${m[1]});`) as (overHero: boolean, brand: Record<string, unknown>) => unknown;
  assert.equal(!!invert(true, { logo: "l.png", logoDark: "d.png" }), false, "con logo y logoDark sobre el hero NO se invierte: se usa la versión clara");
  assert.equal(!!invert(true, { logo: "l.png" }), true, "con logo solo sobre el hero SÍ se invierte (el aviso dev de navbar-v6)");
  assert.equal(!!invert(false, { logo: "l.png" }), false, "fuera del hero nunca se invierte");
});

test("verdad/contratos.json declara `guard` en `contact.phone` (`tests/contacto-logo.test.ts`, `phone`), `brand.logo` (`… logo`) y `brand.logoDark` (`… logoDark`); `features.themeToggle` gana en `tipo` la nota «diseño: DISEÑO-01 (D-82)»; CH gana «material y guard (CONEXION-08)» en esas tres filas; las otras 32 filas del .json byte a byte como en 637ed2b; y `hueco.mjs --json` da las cinco casillas en «sí» y `hecho: true` en las tres, con el total «29/36 huecos hechos»", () => {
  const actual = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as Contratos;
  // (1) El `guard` de cada una de las tres, tal como lo fija la hoja. Hoy los tres son `null`: aquí está el rojo.
  for (const id of FILAS) {
    const fila = actual.huecos.find((h) => h.id === id);
    assert.ok(fila, `fila ${id} en ${CONTRATOS}`);
    assert.deepEqual(fila.guard, GUARDS[id], `${id}.guard = ${JSON.stringify(GUARDS[id])} (hay ${JSON.stringify(fila.guard)})`);
  }
  // (2) `features.themeToggle` sale de esta orden y lo dice su `tipo` (D-82); el resto de esa fila no cambia.
  const base = JSON.parse(git(ROOT, "show", `${CONEXION_07.aprobado.T}:${CONTRATOS}`)) as Contratos;
  assert.equal(base.huecos.length, 36, "precondición: 36 filas en la línea base");
  assert.equal(actual.huecos.length, 36, "siguen siendo 36 filas");
  assert.deepEqual(actual.huecos.map((h) => h.id), base.huecos.map((h) => h.id), "mismos ids en el mismo orden");
  const toggle = actual.huecos.find((h) => h.id === TOGGLE)!, toggleBase = base.huecos.find((h) => h.id === TOGGLE)!;
  assert.ok(String(toggle.tipo).includes(NOTA_TOGGLE), `${TOGGLE}.tipo debe decir «${NOTA_TOGGLE}» (hay «${toggle.tipo}»)`);
  assert.ok(String(toggle.tipo).startsWith(String(toggleBase.tipo)), `${TOGGLE}.tipo conserva lo que ya decía («${toggleBase.tipo}»)`);
  assert.deepEqual({ ...toggle, tipo: null }, { ...toggleBase, tipo: null }, `${TOGGLE}: de esa fila sólo cambia el tipo (sigue sin guard y sin material: es DISEÑO-01)`);
  // (3) Las otras 32 filas: iguales, campo a campo, a las del commit aprobado de CONEXION-07.
/** CONEXION-09 (2026-09-24) dio `guard` y el `tipo` «sin casilla (D-90)» a esta fila (derivado, sin casilla en el hub): para
 *  esta copia es «las otras», y cambia. */
const DERIVADA_09 = "branding.heroToBackdrop";
  const otras = base.huecos.filter((h) => ![...FILAS, TOGGLE, DERIVADA_09].includes(h.id));
  assert.equal(otras.length, 31, `31 filas fuera de las tres de esta orden, de ${TOGGLE} y de ${DERIVADA_09} (hay ${otras.length})`);
  for (const fila of otras) assert.deepEqual(actual.huecos.find((h) => h.id === fila.id), fila, `la fila ${fila.id} no cambia`);
  // (4) CONTRATOS-HUECOS.md: la nota en la línea donde vive el contrato de cada una (la misma línea que mide hueco.mjs).
  const md = readFileSync(join(BLOQUE, "CONTRATOS-HUECOS.md"), "utf8").split(/\r?\n/);
  for (const id of FILAS) {
    const campo = actual.huecos.find((h) => h.id === id)?.contrato?.campo;
    assert.ok(campo, `la fila ${id} declara contrato.campo`);
    const lineas = lineasCon(md, campo);
    assert.ok(lineas.length > 0, `CONTRATOS-HUECOS.md tiene el contrato de ${id} («${campo}»)`);
    assert.ok(lineas.some((l) => l.includes(NOTA)), `la línea del contrato de ${id} debe decir «${NOTA}»:\n${lineas[0].slice(0, 400)}`);
  }
  // (5) La medida: las tres con sus cinco lugares en «sí», y 29/36 en el total.
  const j = correrLargo([HUECO, "--json"]);
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
  assert.deepEqual(hechos, [...BASE_HECHOS, ...FILAS].sort(), "hechos = los veintiséis de la línea base + las tres de esta orden; los otros 7 no cambian de estado");
  const r = correrLargo([HUECO]);
  assert.equal(ultimaLinea(r.stdout), "29/36 huecos hechos", `el texto termina con «29/36 huecos hechos» (última línea: «${ultimaLinea(r.stdout)}»)`);
});
