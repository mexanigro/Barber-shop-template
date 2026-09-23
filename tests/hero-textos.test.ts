// CONEXION-06 (B2, D-73): guard del hueco `hero.eyebrow`. El contrato (CONTRATOS-HUECOS § hero v6, fila `hero.eyebrow`) dice
// «≤ 4 palabras» y lo que lo hace cierto en pantalla es `clampWords`, no el aviso del hub: el hub avisa al editar, pero el que
// recorta de verdad es el hero. Este guard vigila las dos mitades de esa promesa — que `clampWords` recorte a las cuatro primeras
// y deje intacto lo que ya cabe, y que `hero-v6.tsx` la llame con el límite del contrato (`LIMITS.eyebrow = 4`) sobre
// `hero.eyebrow` con respaldo `brand.tagline` —, así que rompiendo cualquiera de las dos este archivo se pone rojo.
// Corre en `test:unit` (D-57): sin navegador, sólo la función pura y la lectura del fuente.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clampWords, wordCount } from "../src/lib/words.ts";

const HERO_V6 = "src/components/landing/hero/hero-v6.tsx";
/** El límite del contrato para el eyebrow (CONTRATOS-HUECOS: «texto ≤ 4 palabras»). */
const MAX_EYEBROW = 4;

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
