// CONEXION-07 · A (T) · guards de los textos del hero. A1: `tests/hero-textos.test.ts` (que hoy sólo vigila el eyebrow, CONEXION-06)
// gana el subtítulo, el titular y el CTA, y con ellos las tres filas `hero.subtitle`, `hero.titular` y `hero.cta` dejan de estar «sin
// guard».
// COPIA PROMOVIDA (CONEXION-08, 2026-09-23): `tests/orden/conexion-07/` queda congelada y ésta es la editable; idéntica al original.
// D-76: un guard protege lo que la página HACE con la clave, no sólo la nombra. Así que este test no se conforma con leerlo: lo CORRE
// anidado (`node --test` con NODE_TEST_CONTEXT borrado, lección de CONEXION-06-A2: heredarla haría que el runner anidado avise
// «run() is being called recursively … skipping running files» y salga 0 sin cargar nada) y además MIDE POR SU CUENTA lo que el guard
// afirma — `clampWords` y `warnWords` de verdad (con la marca `import.meta.env.DEV` que inyecta el cargador de `_comun.ts`, porque
// `warnWords` sólo avisa en DEV y fuera de Vite esa marca no existe) y las líneas de `hero-v6.tsx` que las llaman con los límites del
// contrato. Caja negra: `src/lib/words.ts` por `import()` dinámico con extensión; nada más de `src/`. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  CLAVES_HERO, GUARD_HERO, HERO_V6, LIMITE_SUBTITULO, RANGO_CTA, RANGO_TITULAR, ROOT, WORDS,
  correr, espiarWarn, fuente, importarModulo, tokensDeScript,
} from "./orden/conexion-07/_comun.ts";

/** Los dos tests que el guard ya tenía (CONEXION-06, D-73): siguen ahí, no se reescriben. */
const TESTS_CONEXION_06 = [
  "clampWords recorta el eyebrow a las 4 primeras palabras y deja intacto el que ya cabe",
  "hero v6 usa el límite del contrato para el eyebrow: LIMITS.eyebrow = 4 y clampWords(hero.eyebrow || brand.tagline, LIMITS.eyebrow, \"eyebrow\")",
];
/** Nombres de los tests que el TAP de una corrida declara (`ok N - <nombre>` / `not ok N - <nombre>`), sin los subtests. */
const nombresTap = (stdout: string) => stdout.split(/\r?\n/).map((l) => l.match(/^(?:not )?ok \d+ - (.+?)\s*$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => m[1]);

test("tests/hero-textos.test.ts nombra literalmente «titleHighlight», «subtitle» y «ctaPrimary», y afirma: que `clampWords` recorta un subtítulo de 14 palabras a las 12 primeras y deja intacto uno de 12, y que hero-v6.tsx declara `subtitle: 12` en `LIMITS` y llama `clampWords(hero.subtitle, LIMITS.subtitle, \"subtitle\")`; que `warnWords` (con `import.meta.env.DEV` verdadero inyectado por el test) avisa con un titular de 1 y de 7 palabras y calla con uno de 4, y que hero-v6.tsx lo llama sobre `titlePrefix`, `titleHighlight` y `titleSuffix` con 2 y 6; y que `warnWords` avisa con un CTA de 3 palabras y calla con uno de 2, y que hero-v6.tsx lo llama sobre `hero.ctaPrimary` con 1 y 2", async () => {
  // (1) El guard nombra las tres claves.
  assert.ok(existsSync(resolve(ROOT, GUARD_HERO)), `precondición: existe ${GUARD_HERO} (CONEXION-06)`);
  const guard = fuente(GUARD_HERO);
  const faltan = CLAVES_HERO.filter((c) => !guard.includes(c));
  assert.deepEqual([...faltan], [], `${GUARD_HERO} debe nombrar literalmente ${CLAVES_HERO.map((c) => `«${c}»`).join(", ")} (no nombra: ${faltan.join(", ")})`);
  assert.ok(tokensDeScript("test:unit").includes(GUARD_HERO), `${GUARD_HERO} sigue en el script test:unit (D-57)`);

  // (2) El guard CORRE y pasa, con los tests de CONEXION-06 intactos y al menos uno más.
  const r = correr(["--experimental-strip-types", "--test", GUARD_HERO], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `${GUARD_HERO} debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, /^# fail 0$/m, `${GUARD_HERO} sin fallos:\n${r.stdout.slice(-2000)}`);
  const nombres = nombresTap(r.stdout);
  for (const n of TESTS_CONEXION_06) assert.ok(nombres.includes(n), `el TAP conserva el test de CONEXION-06 «${n}» (hay: ${nombres.join(" · ")})`);
  assert.ok(nombres.length >= 3, `el guard creció: al menos tres tests en el TAP (hay ${nombres.length}: ${nombres.join(" · ")})`);

  // (3) Lo que el guard afirma, medido aquí: el subtítulo se recorta a las doce primeras y lo que cabe queda igual.
  const w = (await importarModulo(WORDS, true)) as {
    clampWords: (t: string | undefined, max: number, campo: string) => string;
    warnWords: (t: string | undefined, min: number, max: number, campo: string) => void;
  };
  assert.equal(typeof w.clampWords, "function", `${WORDS} exporta clampWords`);
  assert.equal(typeof w.warnWords, "function", `${WORDS} exporta warnWords`);
  const palabras = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`).join(" ");
  const doce = palabras(LIMITE_SUBTITULO);
  assert.equal(espiarWarn(() => { w.clampWords(doce, LIMITE_SUBTITULO, "subtitle"); }).length, 0, "un subtítulo de 12 palabras no avisa: no se recorta");
  assert.equal(w.clampWords(doce, LIMITE_SUBTITULO, "subtitle"), doce, "un subtítulo de 12 palabras queda intacto, sin puntos suspensivos");
  const catorce = palabras(14);
  let recorte = "";
  const avisos = espiarWarn(() => { recorte = w.clampWords(catorce, LIMITE_SUBTITULO, "subtitle"); });
  assert.deepEqual(recorte.replace(/…$/, "").trim().split(/\s+/), doce.split(/\s+/), `un subtítulo de 14 palabras se recorta a las 12 PRIMERAS, en orden (hay «${recorte}»)`);
  assert.ok(recorte.endsWith("…"), `el recorte se ve: termina en «…» (hay «${recorte}»)`);
  assert.equal(avisos.length, 1, `recortar avisa una vez en DEV (avisos: ${JSON.stringify(avisos)})`);

  // (4) El titular y el CTA: `warnWords` avisa fuera del rango del contrato y calla dentro. Sin la marca DEV inyectada no avisaría
  //     nunca, así que este caso también prueba que el arnés la inyecta (si no, el primer `assert` de aquí cae).
  const [minT, maxT] = RANGO_TITULAR;
  const [minC, maxC] = RANGO_CTA;
  const avisa = (texto: string, min: number, max: number, campo: string) => espiarWarn(() => { w.warnWords(texto, min, max, campo); });
  assert.equal(avisa(palabras(1), minT, maxT, "hero.title").length, 1, `un titular de 1 palabra avisa (el contrato pide ${minT}–${maxT})`);
  assert.equal(avisa(palabras(7), minT, maxT, "hero.title").length, 1, `un titular de 7 palabras avisa (el contrato pide ${minT}–${maxT})`);
  assert.deepEqual(avisa(palabras(4), minT, maxT, "hero.title"), [], `un titular de 4 palabras calla (el contrato pide ${minT}–${maxT})`);
  assert.equal(avisa(palabras(3), minC, maxC, "hero.ctaPrimary").length, 1, `un CTA de 3 palabras avisa (el contrato pide ${minC}–${maxC})`);
  assert.deepEqual(avisa(palabras(2), minC, maxC, "hero.ctaPrimary"), [], `un CTA de 2 palabras calla (el contrato pide ${minC}–${maxC})`);

  // (5) Y que el hero v6 las llama con los límites del contrato (T:hero-v6.tsx:32, :179, :182–184).
  const hero = fuente(HERO_V6);
  assert.match(hero, new RegExp(`const LIMITS = \\{[^}]*\\bsubtitle:\\s*${LIMITE_SUBTITULO}\\b`), `${HERO_V6} declara subtitle: ${LIMITE_SUBTITULO} en LIMITS`);
  assert.match(hero, /clampWords\(\s*hero\.subtitle,\s*LIMITS\.subtitle,\s*"subtitle"\s*\)/, `${HERO_V6} recorta el subtítulo con clampWords(hero.subtitle, LIMITS.subtitle, "subtitle")`);
  assert.match(hero, new RegExp(`warnWords\\(\\s*\`\\$\\{hero\\.titlePrefix\\} \\$\\{hero\\.titleHighlight\\} \\$\\{hero\\.titleSuffix \\?\\? ""\\}\`,\\s*${minT},\\s*${maxT},`), `${HERO_V6} avisa sobre titlePrefix + titleHighlight + titleSuffix con ${minT} y ${maxT}`);
  assert.match(hero, new RegExp(`warnWords\\(\\s*hero\\.ctaPrimary,\\s*${minC},\\s*${maxC},`), `${HERO_V6} avisa sobre hero.ctaPrimary con ${minC} y ${maxC}`);
});
