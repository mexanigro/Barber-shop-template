// CONEXION-06 · B (T) · contrato y guard de las dos filas que esta orden hace. B1: verdad/contratos.json declara la `ui` y el
// `validador` de `paleta` y la `ui` y el `guard` de `hero.eyebrow`, CONTRATOS-HUECOS.md lleva su nota, y las otras 34 filas quedan
// iguales a las del commit aprobado de CONEXION-05. B2: el guard nuevo `tests/hero-textos.test.ts` (D-73) existe, está en la fase
// `test:unit`, nombra «eyebrow» y afirma lo que el hero v6 hace con él; y `hueco.mjs` da 20/36. Sesión A (2026-09-23): tests rojos
// (hoy `paleta` tiene validador y ui en null, `hero.eyebrow` ui y guard en null, no existe tests/hero-textos.test.ts y hueco da 18/36).
// Caja negra: lectura del .json y del .md, `hueco.mjs --json` real, y `clampWords` importado con extensión por `import()` dinámico
// (el cargador de _comun.ts le antepone el `import.meta.env` que define Vite). Sólo en T (B1, B2).
// CONEXION-07 D2 (2026-09-23): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  BASE_HECHOS, BLOQUE, CONEXION_05, CONTRATOS, FILAS, GUARD_EYEBROW, HERO_V6, HUECO, NOTA_EYEBROW, NOTA_PALETA,
  ROOT, UI_EYEBROW, UI_PALETA, VALIDADOR_PALETA, WORDS, correr, filasDe, git, importarModulo, ultimaLinea,
} from "./orden/conexion-06/_comun.ts";

type FilaJson = { id: string; ui: unknown; validador: unknown; guard: unknown; [k: string]: unknown };
type Contratos = { huecos: FilaJson[] };
type Check = { ok: boolean; detalle: string };
type Resultado = { id: string; checks: Record<"contrato" | "validador" | "ui" | "material" | "guard", Check>; hecho: boolean };

/** CONEXION-07 (2026-09-23) declaró el `guard` de estas seis filas (20/36 → 26/36): para esta copia son «las otras», y cambian. */
const CONEXION_07 = ["hero.titular", "hero.subtitle", "hero.cta", "testimonials.rating", "staff.photoUrl", "navbar.variant"];

test("verdad/contratos.json y CH: la fila `paleta` gana `ui` = `{ ruta: \"/clients/[clientId]\", componente: \"src/components/config-editors/paleta-editor.tsx\", campo: \"colors\" }` y `validador` = `{ archivo: \"src/lib/config-validator.ts\", funcion: \"validatePalette\" }`; la fila `hero.eyebrow` gana `ui` = `{ ruta: \"/clients/[clientId]\", componente: \"src/components/client-content-tab.tsx\", campo: \"hero.eyebrow\" }` y `guard` = `{ archivo: \"tests/hero-textos.test.ts\", clave: \"eyebrow\" }`; en CH el párrafo «Hueco «paleta»» (:11) y la fila de `hero.eyebrow` (:36) ganan la nota «casilla de paleta (CONEXION-06)» / «campo de Contenido (CONEXION-06)»; las otras 34 filas del .json byte a byte como en a41f93a", () => {
  const actual = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as Contratos;
  const paleta = actual.huecos.find((h) => h.id === "paleta");
  assert.ok(paleta, `fila paleta en ${CONTRATOS}`);
  assert.deepEqual(paleta.ui, UI_PALETA, `paleta.ui = ${JSON.stringify(UI_PALETA)} (hay ${JSON.stringify(paleta.ui)})`);
  assert.deepEqual(paleta.validador, VALIDADOR_PALETA, `paleta.validador = ${JSON.stringify(VALIDADOR_PALETA)} (hay ${JSON.stringify(paleta.validador)})`);
  const eyebrow = actual.huecos.find((h) => h.id === "hero.eyebrow");
  assert.ok(eyebrow, `fila hero.eyebrow en ${CONTRATOS}`);
  assert.deepEqual(eyebrow.ui, UI_EYEBROW, `hero.eyebrow.ui = ${JSON.stringify(UI_EYEBROW)} (hay ${JSON.stringify(eyebrow.ui)})`);
  assert.deepEqual(eyebrow.guard, GUARD_EYEBROW, `hero.eyebrow.guard = ${JSON.stringify(GUARD_EYEBROW)} (hay ${JSON.stringify(eyebrow.guard)})`);
  // Las otras 34 filas: iguales, campo a campo, a las del commit aprobado de CONEXION-05 (la línea base de esta orden).
  const base = JSON.parse(git(ROOT, "show", `${CONEXION_05.aprobado.T}:${CONTRATOS}`)) as Contratos;
  assert.equal(base.huecos.length, 36, "precondición: 36 filas en la línea base");
  assert.equal(actual.huecos.length, 36, "siguen siendo 36 filas");
  assert.deepEqual(actual.huecos.map((h) => h.id), base.huecos.map((h) => h.id), "mismos ids en el mismo orden");
  const otras = base.huecos.filter((h) => !(FILAS as readonly string[]).includes(h.id));
  assert.equal(otras.length, 34, `34 filas fuera de las dos de esta orden (hay ${otras.length})`);
  for (const fila of otras) if (!CONEXION_07.includes(fila.id)) assert.deepEqual(actual.huecos.find((h) => h.id === fila.id), fila, `la fila ${fila.id} no cambia`);
  // CONTRATOS-HUECOS.md: el párrafo de la paleta (no es una fila de tabla) y la fila de `hero.eyebrow`.
  const md = readFileSync(join(BLOQUE, "CONTRATOS-HUECOS.md"), "utf8").split(/\r?\n/);
  const parrafo = md.filter((l) => l.includes("Hueco «paleta»"));
  assert.ok(parrafo.length > 0, "CONTRATOS-HUECOS.md tiene el párrafo «Hueco «paleta»»");
  for (const l of parrafo) assert.ok(l.includes(NOTA_PALETA), `el párrafo «Hueco «paleta»» debe decir «${NOTA_PALETA}»:\n${l.slice(0, 400)}`);
  const filas = filasDe(md, "hero.eyebrow");
  assert.ok(filas.length > 0, "CONTRATOS-HUECOS.md tiene alguna fila que empieza por «hero.eyebrow»");
  for (const l of filas) assert.ok(l.includes(NOTA_EYEBROW), `la fila de hero.eyebrow debe decir «${NOTA_EYEBROW}»:\n${l.slice(0, 400)}`);
});

test("tests/hero-textos.test.ts existe, está en `test:unit` de package.json, nombra literalmente «eyebrow», y afirma que `clampWords` de src/lib/words.ts recorta un texto de 6 palabras a las 4 primeras y deja intacto uno de 4, y que src/components/landing/hero/hero-v6.tsx declara `eyebrow: 4` en `LIMITS` y llama `clampWords(hero.eyebrow || brand.tagline, LIMITS.eyebrow, \"eyebrow\")`; y `hueco.mjs --json` da las cinco casillas en «sí» y `hecho: true` en `paleta` y `hero.eyebrow`, y el total es «20/36 huecos hechos»", async () => {
  // El guard nuevo (D-73): existe, lo corre la fase concurrente y nombra la clave que vigila.
  assert.ok(existsSync(resolve(ROOT, GUARD_EYEBROW.archivo)), `no existe ${GUARD_EYEBROW.archivo}`);
  const scripts = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts ?? {};
  const tokens = String(scripts["test:unit"] ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  assert.ok(tokens.includes(GUARD_EYEBROW.archivo), `${GUARD_EYEBROW.archivo} debe estar en el script test:unit (D-57)`);
  const guard = readFileSync(resolve(ROOT, GUARD_EYEBROW.archivo), "utf8");
  assert.ok(guard.includes(GUARD_EYEBROW.clave), `${GUARD_EYEBROW.archivo} debe nombrar «${GUARD_EYEBROW.clave}»`);
  // Lo que el guard vigila, comprobado aquí contra lo real: clampWords recorta a las cuatro primeras y deja intacto lo que cabe.
  const w = (await importarModulo(WORDS)) as { clampWords: (t: string | undefined, max: number, campo: string) => string };
  assert.equal(typeof w.clampWords, "function", `${WORDS} exporta clampWords`);
  const cuatro = "una dos tres cuatro";
  assert.equal(w.clampWords(cuatro, 4, "eyebrow"), cuatro, "un texto de 4 palabras queda intacto");
  const recorte = w.clampWords("una dos tres cuatro cinco seis", 4, "eyebrow");
  assert.deepEqual(recorte.replace(/…$/, "").trim().split(/\s+/), cuatro.split(/\s+/), `un texto de 6 palabras se recorta a las 4 primeras (hay «${recorte}»)`);
  // Y que el hero v6 lo usa con el límite del contrato (T:src/components/landing/hero/hero-v6.tsx:32, :178).
  const hero = readFileSync(resolve(ROOT, HERO_V6), "utf8");
  assert.match(hero, /const LIMITS = \{[^}]*\beyebrow:\s*4\b/, `${HERO_V6} declara eyebrow: 4 en LIMITS`);
  assert.match(hero, /clampWords\(\s*hero\.eyebrow \|\| brand\.tagline,\s*LIMITS\.eyebrow,\s*"eyebrow"\s*\)/, `${HERO_V6} llama clampWords(hero.eyebrow || brand.tagline, LIMITS.eyebrow, "eyebrow")`);
  // La medida: las dos filas con sus cinco lugares en «sí», y 20/36 en el total.
  const j = correr([HUECO, "--json"]);
  assert.ok(j.status === 0 || j.status === 2, `hueco.mjs --json sale 0 o 2 (salió ${j.status})\n${j.out.slice(-2000)}`);
  const resultados = JSON.parse(j.stdout) as Resultado[];
  assert.equal(resultados.length, 36);
  for (const id of FILAS) {
    const f = resultados.find((x) => x.id === id);
    assert.ok(f, `fila ${id}`);
    for (const k of ["contrato", "validador", "ui", "material", "guard"] as const) assert.equal(f.checks[k].ok, true, `${id} · ${k}: «sí» (${f.checks[k].detalle})`);
    assert.equal(f.hecho, true, `${id}: hecho`);
  }
  const hechos = resultados.filter((f) => f.hecho).map((f) => f.id).sort();
  assert.deepEqual(hechos, [...BASE_HECHOS, ...FILAS, ...CONEXION_07].sort(), "hechos = los dieciocho de la línea base + `paleta` y `hero.eyebrow` + las seis de CONEXION-07; los otros 10 no cambian de estado");
  const r = correr([HUECO]);
  assert.equal(ultimaLinea(r.stdout), "26/36 huecos hechos", `el texto termina con «26/36 huecos hechos» (CONEXION-07 sumó sus seis guards; última línea: «${ultimaLinea(r.stdout)}»)`);
});
