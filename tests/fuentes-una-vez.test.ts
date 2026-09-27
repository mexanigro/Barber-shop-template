// ARREGLOS-02 (2026-09-26, D-123) · guard de la carga de fuentes: cada familia se declara UNA sola vez.
//
// Por qué existe. Medido contra las dos webs de prueba: `Heebo` estaba declarada por la hoja base de `index.html` Y por la hoja
// del nicho peluquería, así que `document.fonts` registraba **diez caras por peso** (dos hojas × cinco subconjuntos de
// unicode-range) y, en una corrida de cada tres, un lado bajaba además seis archivos `fonts.gstatic.com/l/font?kit=…` que el
// otro no. Resultado: 7 píxeles de borde de glifo distintos entre la web y su plantilla, con las dos estables — una diferencia
// que no era de diseño y que `e2e.mjs` no podía sino reportar.
//
// Qué vigila, en las dos direcciones:
//   (1) Ninguna familia aparece en dos de las hojas declaradas del árbol (la base de `index.html` y las de `NICHE_DEFAULT_FONTS`).
//   (2) La base sigue cubriendo, peso por peso, todo lo que cada nicho pedía ANTES del arreglo: quitar una familia de la lista de
//       un nicho no puede perder un peso. La lista de «antes» está escrita acá y es la que el guard defiende.
//   (3) Y el arnés no miente: si se vuelve a meter una familia repetida, (1) cae.
// Corre en `test:unit` (D-57): lee el árbol, no abre navegador ni sale a la red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const INDEX = "index.html";
const THEMES = "src/config/presets/themes.ts";
const IDIOMAS = "src/contexts/LanguageContext.tsx";

const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/** Las urls `https://fonts.googleapis.com/css2?…` que declara un archivo. */
const urlsDe = (src: string) => [...src.matchAll(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s]+/g)].map((m) => m[0]);
/** `family=Nombre:spec` → Map(familia → spec). Una url sin `:spec` (p. ej. Great+Vibes) vale con spec vacío. */
function familiasDe(url: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of url.matchAll(/[?&]family=([^&]+)/g)) {
    const [nombre, ...resto] = decodeURIComponent(m[1]).split(":");
    out.set(nombre.replace(/\+/g, " "), resto.join(":"));
  }
  return out;
}
/** Los pesos que un spec declara, como conjunto de «ital,wght» normalizado (`400` → `0,400`). */
function pesosDe(spec: string): Set<string> {
  const m = spec.match(/wght@([^&]+)/);
  if (!m) return new Set();
  return new Set(m[1].split(";").map((p) => (p.includes(",") ? p : `0,${p}`)));
}

/** Lo que cada nicho pedía ANTES de D-123, para que el arreglo no pueda perder un peso por el camino. */
const ANTES: Record<string, string> = {
  nails: "Cormorant Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700",
  estetica: "Cormorant Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400|DM Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400",
  remodelaciones: "Inter:wght@300;400;500;600;700;800",
  peluqueria: "Frank Ruhl Libre:wght@300;500|Heebo:wght@300;400;500;600;700",
};

/** Todas las hojas declaradas del árbol, con el archivo que las declara. */
function hojas(): { archivo: string; url: string }[] {
  const out: { archivo: string; url: string }[] = [];
  for (const rel of [INDEX, THEMES, IDIOMAS]) for (const url of urlsDe(fuente(rel))) out.push({ archivo: rel, url });
  return out;
}

test("ninguna familia de Google Fonts se declara en dos hojas: la base de index.html y las listas por nicho de themes.ts no se pisan, y LanguageContext ya no inyecta una tercera", () => {
  const todas = hojas();
  assert.ok(todas.length >= 2, `el árbol declara al menos la base y una lista de nicho (hay ${todas.length})`);
  assert.deepEqual(urlsDe(fuente(IDIOMAS)), [], `${IDIOMAS} no puede inyectar otra hoja de fuentes: la base ya declara Heebo y Frank Ruhl Libre (D-123)`);

  const donde = new Map<string, string[]>();
  for (const { archivo, url } of todas) {
    for (const familia of familiasDe(url).keys()) {
      if (!donde.has(familia)) donde.set(familia, []);
      donde.get(familia)!.push(`${archivo} (…${url.slice(-28)})`);
    }
  }
  const repetidas = [...donde.entries()].filter(([, d]) => d.length > 1).map(([f, d]) => `${f}: ${d.join(" + ")}`);
  assert.deepEqual(repetidas, [], `estas familias están declaradas por más de una hoja; el navegador registra una cara por hoja y por subconjunto, y cuál rasteriza no es determinista:\n  ${repetidas.join("\n  ")}`);
});

test("la hoja base de index.html cubre, peso por peso, todo lo que cada nicho declaraba antes de D-123: sacar una familia de la lista de un nicho no pierde ningún peso", () => {
  const base = familiasDe(urlsDe(fuente(INDEX))[0] ?? "");
  assert.ok(base.size >= 7, `index.html declara la hoja base con sus familias (hay ${base.size})`);

  const faltan: string[] = [];
  for (const [nicho, lista] of Object.entries(ANTES)) {
    for (const entrada of lista.split("|")) {
      const [familia, ...resto] = entrada.split(":");
      const spec = resto.join(":");
      const enBase = base.get(familia);
      assert.ok(enBase !== undefined, `«${familia}» la pedía ${nicho} y ya no está en ninguna hoja: tiene que quedar en la base`);
      const cubiertos = pesosDe(enBase);
      for (const peso of pesosDe(spec)) if (!cubiertos.has(peso)) faltan.push(`${nicho} · ${familia} · ${peso}`);
    }
  }
  assert.deepEqual(faltan, [], `la base perdió pesos que un nicho usaba:\n  ${faltan.join("\n  ")}`);
});

test("cada lista de `NICHE_DEFAULT_FONTS` es una url de css2 o la cadena vacía, y ninguna nombra una familia de la base", () => {
  const src = fuente(THEMES);
  const base = new Set(familiasDe(urlsDe(fuente(INDEX))[0] ?? "").keys());
  const mapa = src.match(/export const NICHE_DEFAULT_FONTS[\s\S]*?\n\};/);
  assert.ok(mapa, `${THEMES} debe exportar NICHE_DEFAULT_FONTS`);
  const nichos = [...mapa[0].matchAll(/^\s{2}(\w+):\s*(""|\w+),?$/gm)].map((m) => [m[1], m[2]] as const);
  assert.ok(nichos.length >= 8, `NICHE_DEFAULT_FONTS declara un valor por nicho (hay ${nichos.length})`);
  const pisadas: string[] = [];
  for (const [nicho, valor] of nichos) {
    if (valor === '""') continue;
    const cuerpo = src.match(new RegExp(`const ${valor} =\\s*(""|"[^"]+")`));
    assert.ok(cuerpo, `${THEMES} declara la constante ${valor} de ${nicho}`);
    const url = cuerpo[1].slice(1, -1);
    if (!url) continue;
    assert.match(url, /^https:\/\/fonts\.googleapis\.com\/css2\?/, `la lista de ${nicho} es una url de css2`);
    for (const familia of familiasDe(url).keys()) if (base.has(familia)) pisadas.push(`${nicho} · ${familia}`);
  }
  assert.deepEqual(pisadas, [], `estas listas por nicho repiten una familia de la hoja base:\n  ${pisadas.join("\n  ")}`);
});
