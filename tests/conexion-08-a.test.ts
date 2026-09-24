// CONEXION-08 · A (T) · el material genérico de las plantillas A y C (D-79): el wordmark que hoy no existe (A1) y las tres claves que
// hoy faltan en los dos fixtures (A2). Sesión A (2026-09-23): tests rojos — no existe `tools/material/logo-generico.mjs` (A1) y los
// fixtures no tienen `contact` (A2: `contact.phone` ausente en A y en C, y `brand` sin `logo` ni `logoDark`).
// Ajuste de A (2026-09-23): la hoja daba `sharp` por instalado en T y no lo está (ni en `package.json` ni resoluble; el que lo tiene
// es H). El wordmark se rasteriza y se mide con Chromium, que es lo que T ya usa en `tools/material/*.mjs` y en `diffPng` de
// `tools/verdad/recrear.mjs` («sin dependencias»); por eso el guard `tests/logo-generico.test.ts` importa `playwright` y va a la fase
// `test:browser` (D-57, `tests/suite-fases.test.ts`), no a `test:unit` — `hueco.mjs` mira las dos fases, así que el `guard` de las
// tres filas sigue dando «sí».
// Caja negra: el script por `spawnSync` sobre un fixture y una carpeta `--media` temporales (prefijo «conexion-08-», borrados en
// `finally`); el guard se CORRE anidado (`NODE_TEST_CONTEXT` borrado, lección de CONEXION-06-A2: heredarlo hace que el runner avise
// «skipping running files» y salga 0 sin cargar nada) y este test MIDE POR SU CUENTA los PNG que el script deja. A2 lee los fixtures
// reales en disco y hace un GET con `Range: bytes=0-0` a cada url (≤ 10 s). Ningún test escribe en T, en H, en Storage ni en
// Firestore. Sólo en T (inciso n).
// COPIA PROMOVIDA (PRESET-01, 2026-09-23): la carpeta `tests/orden/conexion-08/` queda congelada y esta copia es la editable. Tres
// cambios respecto del original (D-89): A2 ya no hace el GET con `Range` a Storage —una copia promovida no sale a la red en cada
// `npm test`, y el path de cada url lo sigue midiendo el test—; su «nada más cambia» excluye hoja por hoja las claves que PRESET-01
// toca en los dos fixtures (`staff[].social`, `testimonials[].title` en la raíz y en `translations.<lang>`, `contact.address`); y
// `medirPng` es local, no el del `_comun.ts` congelado: aquel declara una flecha CON NOMBRE dentro del `page.evaluate` y la orden
// sólo lo corrió con `node --experimental-strip-types`, mientras que `npm test` usa `tsx` (esbuild, keepNames), que le inyecta
// `__name` — indefinido en la página. Es la misma lección que ya lleva escrita `tests/logo-generico.test.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import {
  ALTO, ANCHO, BUCKET, CONEXION_07, FIXTURES, LOGO, LOGO_DARK, LOGO_GENERICO, LUM_CLARA, LUM_OSCURA, GUARD_LOGO, NICHO, ROOT, TELEFONO,
  conTemporalAsync, correrLargo, fixture, get, git, nombresTap, rutaStorage, tokensDeScript,
} from "./orden/conexion-08/_comun.ts";

/** Las tres claves que esta orden pone en los dos fixtures, y nada más (A2). */
const CLAVES_NUEVAS = ["contact.phone", "brand.logo", "brand.logoDark"];
/** Hojas de un objeto como mapa `ruta con puntos` → valor (para comparar dos versiones de un fixture sin depender del orden). */
function hojas(o: unknown, prefijo = "", acc: Map<string, unknown> = new Map()): Map<string, unknown> {
  if (o === null || typeof o !== "object") { acc.set(prefijo, o); return acc; }
  if (Array.isArray(o)) { o.forEach((v, i) => hojas(v, `${prefijo}[${i}]`, acc)); if (!o.length) acc.set(prefijo, "[]"); return acc; }
  const e = Object.entries(o as Record<string, unknown>);
  if (!e.length) acc.set(prefijo, "{}");
  for (const [k, v] of e) hojas(v, prefijo ? `${prefijo}.${k}` : k, acc);
  return acc;
}
/** Rutas cuyo valor cambia (o aparece o desaparece) entre dos objetos. */
function cambios(antes: unknown, ahora: unknown): string[] {
  const a = hojas(antes), b = hojas(ahora);
  const rutas = new Set([...a.keys(), ...b.keys()]);
  return [...rutas].filter((r) => JSON.stringify(a.get(r)) !== JSON.stringify(b.get(r))).sort();
}
/** Tamaño, alfa de las cuatro esquinas y luminancia media (sRGB 0–1) de los píxeles opacos de un PNG, decodificado en Chromium.
 *  Copia local del `medirPng` de `./orden/conexion-08/_comun.ts` (congelado) sin ninguna función con nombre dentro del `evaluate`. */
async function medirPng(archivo: string): Promise<{ w: number; h: number; esquinas: number[]; opacos: number; lum: number }> {
  const navegador = await chromium.launch();
  try {
    const p = await navegador.newPage();
    const datos = "data:image/png;base64," + readFileSync(archivo).toString("base64");
    return await p.evaluate(async (d: string) => {
      const img: HTMLImageElement = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = d; });
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
      const A = x.getImageData(0, 0, img.width, img.height).data;
      const esquinas = [0, img.width - 1, (img.height - 1) * img.width, (img.height - 1) * img.width + img.width - 1].map((i) => A[i * 4 + 3]);
      let suma = 0, n = 0;
      for (let k = 0; k < A.length; k += 4) if (A[k + 3] > 200) { suma += (0.2126 * A[k] + 0.7152 * A[k + 1] + 0.0722 * A[k + 2]) / 255; n++; }
      return { w: img.width, h: img.height, esquinas, opacos: n, lum: n ? suma / n : -1 };
    }, datos);
  } finally { await navegador.close(); }
}
/** PRESET-01 (2026-09-23): lo que esa orden toca en los dos fixtures. Esta copia compara contra una línea base anterior a ella. */
const PRESET_01 = (ruta: string): boolean => {
  const r = ruta.replace(/^translations\.[a-z]{2}\./, "");
  return /^staff\[\d+\]\.social(\.|$)/.test(r) || /(^|\.)testimonials\[\d+\]\.title$/.test(r) || /^contact\.address(\.|$)/.test(r);
};

test("tools/material/logo-generico.mjs existe y, corrido sobre un fixture, escribe `dev-fixtures/media/paleta-<p>/logo.png` y `logo-dark.png`: PNG de 600×160 con canal alfa, fondo transparente (las cuatro esquinas con alfa 0), el primero con tinta oscura (luminancia media de los píxeles opacos < 0,4) y el segundo clara (> 0,6), deterministas (dos corridas dan los mismos bytes); lo prueba un guard de T en `npm test` (`tests/logo-generico.test.ts`, fase `test:browser`) que lo corre sobre un fixture temporal y decodifica los PNG en Chromium", async () => {
  // (1) El script existe. Hoy no: aquí es donde esta orden está en rojo.
  assert.ok(existsSync(resolve(ROOT, LOGO_GENERICO)), `no existe ${LOGO_GENERICO}`);

  await conTemporalAsync(async (tmp) => {
    // (2) Corrido sobre un fixture y una carpeta --media temporales, escribe los dos PNG en paleta-<p>/.
    const fx = join(tmp, "peluqueria-paleta-x.json"), media = join(tmp, "media");
    writeFileSync(fx, JSON.stringify({ business: { type: NICHO }, brand: { name: "הדר · עיצוב שיער", tagline: "מספרה" } }, null, 2) + "\n");
    const correr = (dir: string) => correrLargo([LOGO_GENERICO, "--paleta", "x", "--fixture", fx, "--media", dir]);
    const r1 = correr(media);
    assert.equal(r1.status, 0, `${LOGO_GENERICO} --paleta x --fixture … --media … debe salir 0 (salió ${r1.status})\n${r1.out.slice(-3000)}`);
    const archivo = (dir: string, n: string) => join(dir, "paleta-x", n);
    for (const n of [LOGO, LOGO_DARK]) assert.ok(existsSync(archivo(media, n)), `falta ${n} en <media>/paleta-x/ (salida:\n${r1.out.slice(-1500)})`);

    // (3) Lo que tiene que haber dentro de cada PNG, medido aquí (decodificado en Chromium, sin `sharp`).
    const claro = await medirPng(archivo(media, LOGO));
    const oscuro = await medirPng(archivo(media, LOGO_DARK));
    for (const [n, m] of [[LOGO, claro], [LOGO_DARK, oscuro]] as const) {
      assert.deepEqual([m.w, m.h], [ANCHO, ALTO], `${n} mide ${ANCHO}×${ALTO} (mide ${m.w}×${m.h})`);
      assert.deepEqual(m.esquinas, [0, 0, 0, 0], `${n}: las cuatro esquinas con alfa 0, o sea fondo transparente (hay ${JSON.stringify(m.esquinas)})`);
      assert.ok(m.opacos > 0, `${n} tiene tinta: algún píxel opaco (hay ${m.opacos})`);
    }
    assert.ok(claro.lum < LUM_OSCURA, `${LOGO} lleva tinta OSCURA para superficie clara: luminancia media ${claro.lum.toFixed(3)} < ${LUM_OSCURA}`);
    assert.ok(oscuro.lum > LUM_CLARA, `${LOGO_DARK} lleva tinta CLARA para el hero: luminancia media ${oscuro.lum.toFixed(3)} > ${LUM_CLARA}`);

    // (4) Determinista: una segunda corrida en otra carpeta da los mismos bytes (si no, cada corrida cambiaría el token de Storage).
    const media2 = join(tmp, "media2");
    const r2 = correr(media2);
    assert.equal(r2.status, 0, `la segunda corrida debe salir 0 (salió ${r2.status})\n${r2.out.slice(-2000)}`);
    for (const n of [LOGO, LOGO_DARK]) {
      assert.ok(readFileSync(archivo(media, n)).equals(readFileSync(archivo(media2, n))), `${n}: dos corridas dan los mismos bytes`);
    }
  });

  // (5) El guard de T: existe, lo corre `npm test` en la fase de navegador (importa playwright, D-57) y pasa de verdad.
  assert.ok(existsSync(resolve(ROOT, GUARD_LOGO)), `no existe ${GUARD_LOGO}`);
  assert.ok(tokensDeScript("test:browser").includes(GUARD_LOGO), `${GUARD_LOGO} debe estar en el script test:browser (D-57: importa playwright)`);
  assert.ok(!tokensDeScript("test:unit").includes(GUARD_LOGO), `${GUARD_LOGO} no va en la fase concurrente test:unit`);
  const g = correrLargo(["--experimental-strip-types", "--test", GUARD_LOGO], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(g.status, 0, `${GUARD_LOGO} debe salir 0 (salió ${g.status})\n${g.out.slice(-3000)}`);
  assert.match(g.stdout, /^# fail 0$/m, `${GUARD_LOGO} sin fallos:\n${g.stdout.slice(-2000)}`);
  assert.doesNotMatch(g.out, /skipping running files/, "el runner anidado corrió de verdad (NODE_TEST_CONTEXT borrado)");
  assert.ok(nombresTap(g.stdout).length >= 1, `${GUARD_LOGO} declara al menos un test en el TAP`);
});

test("dev-fixtures/peluqueria-paleta-a.json y -c.json tienen `contact.phone` = `+972 3-000-0000` y `brand.logo` / `brand.logoDark` como urls de Storage bajo `clients/test-b4-peluqueria-<p>/media/branding/logo.png` y `logo-dark.png` (https); nada más cambia en los fixtures (`git diff 637ed2b HEAD -- dev-fixtures/*.json` = esas tres claves en cada uno)", () => {
  for (const p of ["a", "c"] as const) {
    const f = fixture(p);
    // (1) El teléfono genérico, el mismo en las dos plantillas. Hoy no hay `contact`: aquí está el rojo.
    assert.equal(get(f, "contact.phone"), TELEFONO, `el fixture ${p.toUpperCase()} no tiene contact.phone = «${TELEFONO}» (hay ${JSON.stringify(get(f, "contact.phone"))})`);
    // (2) Los dos logos, urls de Storage con el path exacto de su plantilla.
    for (const [clave, nombre] of [["brand.logo", LOGO], ["brand.logoDark", LOGO_DARK]] as const) {
      const v = get(f, clave);
      assert.equal(typeof v, "string", `el fixture ${p.toUpperCase()}: ${clave} es una url (hay ${JSON.stringify(v)})`);
      const url = String(v);
      assert.ok(url.startsWith("https://"), `${p} · ${clave}: url https (hay «${url}»)`);
      const esperado = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(rutaStorage(p, "branding", nombre))}?alt=media&token=`;
      assert.ok(url.startsWith(esperado), `${p} · ${clave}: vive en ${rutaStorage(p, "branding", nombre)}\n  esperado: ${esperado}…\n  hay:      ${url}`);
    }
  }
  // (3) Nada más cambia: contra el commit aprobado de CONEXION-07, las únicas hojas distintas son las tres de esta orden y las
  //     que PRESET-01 tocó después (el preset de peluquería sin los datos de un negocio concreto).
  for (const p of ["a", "c"] as const) {
    const rel = `${FIXTURES}/peluqueria-paleta-${p}.json`;
    const antes = JSON.parse(git(ROOT, "show", `${CONEXION_07.aprobado.T}:${rel}`));
    const ahora = JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
    assert.deepEqual(cambios(antes, ahora).filter((r) => !PRESET_01(r)), [...CLAVES_NUEVAS].sort(), `${rel}: fuera de las claves de PRESET-01, sólo cambian las tres de esta orden respecto de ${CONEXION_07.aprobado.T}`);
  }
});
