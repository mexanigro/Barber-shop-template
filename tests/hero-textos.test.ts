// CONEXION-06 (B2, D-73): guard del hueco `hero.eyebrow`. El contrato (CONTRATOS-HUECOS § hero v6, fila `hero.eyebrow`) dice
// «≤ 4 palabras» y lo que lo hace cierto en pantalla es `clampWords`, no el aviso del hub: el hub avisa al editar, pero el que
// recorta de verdad es el hero. Este guard vigila las dos mitades de esa promesa — que `clampWords` recorte a las cuatro primeras
// y deje intacto lo que ya cabe, y que `hero-v6.tsx` la llame con el límite del contrato (`LIMITS.eyebrow = 4`) sobre
// `hero.eyebrow` con respaldo `brand.tagline` —, así que rompiendo cualquiera de las dos este archivo se pone rojo.
// Corre en `test:unit` (D-57): sin navegador, sólo la función pura y la lectura del fuente.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { clampWords, wordCount } from "../src/lib/words.ts";

const HERO_V6 = "src/components/landing/hero/hero-v6.tsx";
const WORDS = "src/lib/words.ts";
/** El límite del contrato para el eyebrow (CONTRATOS-HUECOS: «texto ≤ 4 palabras»). */
const MAX_EYEBROW = 4;
/** CONEXION-07 (B1, D-76): los otros tres límites del mismo contrato (T:hero-v6.tsx:32, :182–183). El subtítulo se recorta; el
 *  titular y el CTA sólo avisan, porque recortarlos rompería la frase. */
const MAX_SUBTITLE = 12;
const RANGO_TITULO = [2, 6] as const;
const RANGO_CTA = [1, 2] as const;

const palabras = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`).join(" ");
/** Mensajes que `fn` manda a console.warn; restaura la consola siempre. */
function avisos(fn: () => void): string[] {
  const original = console.warn;
  const salida: string[] = [];
  console.warn = (...args: unknown[]) => { salida.push(args.map(String).join(" ")); };
  try { fn(); } finally { console.warn = original; }
  return salida;
}
/** `warnWords` sólo avisa con `import.meta.env.DEV`, que define Vite y no Node: sin esa marca el aviso no se puede ver avisar (ni
 *  callarse por el motivo correcto). Como words.ts no importa nada, la copia con la marca antepuesta entra entera en un `data:` URL
 *  — sin loader ni archivo temporal. Es el arnés el que se adapta, no el código de producción. */
async function wordsEnDev(): Promise<{ warnWords: (t: string | undefined, min: number, max: number, campo: string) => void }> {
  const js = stripTypeScriptTypes(readFileSync(WORDS, "utf8"));
  return await import("data:text/javascript," + encodeURIComponent('import.meta.env ??= { DEV: true };\n' + js)) as {
    warnWords: (t: string | undefined, min: number, max: number, campo: string) => void;
  };
}

test("clampWords recorta el eyebrow a las 4 primeras palabras y deja intacto el que ya cabe", () => {
  const cuatro = "מספרה לנשים בהרצליה פיתוח"; // el eyebrow del fixture A: cuatro palabras, no se toca
  assert.equal(wordCount(cuatro), MAX_EYEBROW, "precondición: el eyebrow del fixture A tiene cuatro palabras");
  assert.equal(clampWords(cuatro, MAX_EYEBROW, "eyebrow"), cuatro, "lo que cabe queda igual, sin puntos suspensivos");

  const seis = "una dos tres cuatro cinco seis";
  const recorte = clampWords(seis, MAX_EYEBROW, "eyebrow");
  assert.notEqual(recorte, seis, "seis palabras no pueden salir enteras");
  assert.deepEqual(
    recorte.replace(/…$/, "").trim().split(/\s+/),
    ["una", "dos", "tres", "cuatro"],
    `son las cuatro PRIMERAS, en orden (hay «${recorte}»)`,
  );
  assert.ok(recorte.endsWith("…"), `el recorte se ve: termina en «…» (hay «${recorte}»)`);
  // Los bordes: 5 recorta, 4 no; y sin texto no hay eyebrow (el hero cae a brand.tagline).
  assert.equal(wordCount(clampWords("una dos tres cuatro cinco", MAX_EYEBROW, "eyebrow")), MAX_EYEBROW, "con cinco palabras recorta a cuatro");
  assert.equal(clampWords(undefined, MAX_EYEBROW, "eyebrow"), "", "sin eyebrow devuelve cadena vacía");
  // Fuera de Vite `import.meta.env` no existe: el aviso de dev no puede tumbar el recorte (CONEXION-06, pieza 6).
  assert.doesNotThrow(() => clampWords(seis, MAX_EYEBROW, "eyebrow"), "clampWords no depende de que Vite defina import.meta.env");
});

test("hero v6 usa el límite del contrato para el eyebrow: LIMITS.eyebrow = 4 y clampWords(hero.eyebrow || brand.tagline, LIMITS.eyebrow, \"eyebrow\")", () => {
  const fuente = readFileSync(HERO_V6, "utf8");
  assert.match(fuente, /const LIMITS = \{[^}]*\beyebrow:\s*4\b/, `${HERO_V6} debe declarar eyebrow: 4 en LIMITS (el «≤ 4 palabras» del contrato)`);
  assert.match(
    fuente,
    /clampWords\(\s*hero\.eyebrow \|\| brand\.tagline,\s*LIMITS\.eyebrow,\s*"eyebrow"\s*\)/,
    `${HERO_V6} debe recortar el eyebrow con clampWords(hero.eyebrow || brand.tagline, LIMITS.eyebrow, "eyebrow")`,
  );
});

// ── CONEXION-07 (B1): las otras tres filas de textos del hero — subtítulo, titular y CTA ──────────────────────────────────────

test("clampWords recorta el subtitle a las 12 primeras palabras y hero v6 lo llama con LIMITS.subtitle = 12", () => {
  const doce = palabras(MAX_SUBTITLE);
  assert.equal(clampWords(doce, MAX_SUBTITLE, "subtitle"), doce, "un subtítulo de doce palabras queda igual, sin puntos suspensivos");
  const recorte = clampWords(palabras(14), MAX_SUBTITLE, "subtitle");
  assert.deepEqual(
    recorte.replace(/…$/, "").trim().split(/\s+/),
    doce.split(/\s+/),
    `catorce palabras salen como las doce PRIMERAS, en orden (hay «${recorte}»)`,
  );
  assert.ok(recorte.endsWith("…"), `el recorte se ve: termina en «…» (hay «${recorte}»)`);
  assert.equal(wordCount(clampWords(palabras(13), MAX_SUBTITLE, "subtitle")), MAX_SUBTITLE, "con trece palabras recorta a doce");
  // Y que el hero llame con el límite del contrato: si LIMITS.subtitle cambia, el recorte de la pantalla ya no es el del contrato.
  const fuente = readFileSync(HERO_V6, "utf8");
  assert.match(fuente, new RegExp(`const LIMITS = \\{[^}]*\\bsubtitle:\\s*${MAX_SUBTITLE}\\b`), `${HERO_V6} debe declarar subtitle: ${MAX_SUBTITLE} en LIMITS`);
  assert.match(
    fuente,
    /clampWords\(\s*hero\.subtitle,\s*LIMITS\.subtitle,\s*"subtitle"\s*\)/,
    `${HERO_V6} debe recortar el subtítulo con clampWords(hero.subtitle, LIMITS.subtitle, "subtitle")`,
  );
});

test("warnWords avisa cuando el titular (titlePrefix + titleHighlight + titleSuffix) sale de las 2–6 palabras del contrato, y hero v6 lo llama con esos límites", async () => {
  const { warnWords } = await wordsEnDev();
  const [min, max] = RANGO_TITULO;
  assert.equal(avisos(() => warnWords(palabras(1), min, max, "hero.title")).length, 1, `un titular de una palabra avisa (el contrato pide ${min}–${max})`);
  assert.equal(avisos(() => warnWords(palabras(7), min, max, "hero.title")).length, 1, `un titular de siete palabras avisa (el contrato pide ${min}–${max})`);
  // El otro lado: lo que cabe no avisa, ni en los bordes (si avisara siempre, el aviso no diría nada).
  for (const n of [min, 4, max]) {
    assert.deepEqual(avisos(() => warnWords(palabras(n), min, max, "hero.title")), [], `un titular de ${n} palabras calla`);
  }
  assert.deepEqual(avisos(() => warnWords(undefined, min, max, "hero.title")), [], "sin titular no hay aviso");
  const fuente = readFileSync(HERO_V6, "utf8");
  assert.match(
    fuente,
    new RegExp(`warnWords\\(\\s*\`\\$\\{hero\\.titlePrefix\\} \\$\\{hero\\.titleHighlight\\} \\$\\{hero\\.titleSuffix \\?\\? ""\\}\`,\\s*${min},\\s*${max},`),
    `${HERO_V6} debe avisar sobre titlePrefix + titleHighlight + titleSuffix con ${min} y ${max}`,
  );
});

test("warnWords avisa cuando el ctaPrimary pasa de las 2 palabras del contrato, y hero v6 lo llama con 1 y 2", async () => {
  const { warnWords } = await wordsEnDev();
  const [min, max] = RANGO_CTA;
  assert.equal(avisos(() => warnWords(palabras(3), min, max, "hero.ctaPrimary")).length, 1, `un CTA de tres palabras avisa (el contrato pide ${min}–${max})`);
  for (const n of [min, max]) {
    assert.deepEqual(avisos(() => warnWords(palabras(n), min, max, "hero.ctaPrimary")), [], `un CTA de ${n} palabra(s) calla`);
  }
  assert.match(
    readFileSync(HERO_V6, "utf8"),
    new RegExp(`warnWords\\(\\s*hero\\.ctaPrimary,\\s*${min},\\s*${max},`),
    `${HERO_V6} debe avisar sobre hero.ctaPrimary con ${min} y ${max}`,
  );
});
