// CONEXION-08 · guard del wordmark genérico (D-81): `tools/material/logo-generico.mjs` produce los dos PNG que A y C ponen en
// `brand.logo` y `brand.logoDark`, y los produce bien: 600×160, fondo transparente, tinta oscura en `logo.png` y clara en
// `logo-dark.png` (navbar-v6 usa la clara sobre el hero y la oscura fuera de él, navbar-v6.tsx:75–81), y los mismos bytes en dos
// corridas —si cambiaran, cambiaría el token de Storage y la url del fixture quedaría colgada—.
// Fase `test:browser` (D-57): importa playwright para decodificar el PNG, porque T no tiene `sharp`. Mide como `diffPng` de
// `tools/verdad/recrear.mjs`: Image + canvas + getImageData. Todo lo temporal lleva prefijo y se borra en `finally`.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SCRIPT = "tools/material/logo-generico.mjs";
const ANCHO = 600, ALTO = 160;
const NOMBRE = "הדר · עיצוב שיער";

/** Tamaño, alfa de las cuatro esquinas y luminancia media (sRGB 0–1) de los píxeles opacos de un PNG, decodificado en Chromium. */
async function medir(archivo: string) {
  const navegador = await chromium.launch();
  try {
    const page = await navegador.newPage();
    const datos = "data:image/png;base64," + readFileSync(archivo).toString("base64");
    return await page.evaluate(async (d: string) => {
      const img: HTMLImageElement = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = d; });
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
      const A = x.getImageData(0, 0, img.width, img.height).data;
      // Sin funciones con nombre dentro del evaluate: `tsx` (esbuild, keepNames) les inyecta `__name`, que no existe en la página.
      const esquinas = [0, img.width - 1, (img.height - 1) * img.width, (img.height - 1) * img.width + img.width - 1].map((i) => A[i * 4 + 3]);
      let suma = 0, n = 0;
      for (let k = 0; k < A.length; k += 4) if (A[k + 3] > 200) { suma += (0.2126 * A[k] + 0.7152 * A[k + 1] + 0.0722 * A[k + 2]) / 255; n++; }
      return { w: img.width, h: img.height, esquinas, opacos: n, lum: n ? suma / n : -1 };
    }, datos);
  } finally { await navegador.close(); }
}

test("logo-generico.mjs escribe logo.png y logo-dark.png de 600×160 transparentes, con tinta oscura y clara, y deterministas", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "logo-generico-"));
  try {
    const fx = join(tmp, "peluqueria-paleta-x.json");
    writeFileSync(fx, JSON.stringify({ business: { type: "peluqueria" }, brand: { name: NOMBRE } }, null, 2) + "\n");
    const correr = (dir: string) => execFileSync(process.execPath, [SCRIPT, "--paleta", "x", "--fixture", fx, "--media", dir], { cwd: ROOT, encoding: "utf8" });
    const media = join(tmp, "media"), media2 = join(tmp, "media2");
    correr(media);
    correr(media2);

    const archivo = (dir: string, n: string) => join(dir, "paleta-x", n);
    for (const n of ["logo.png", "logo-dark.png"]) assert.ok(existsSync(archivo(media, n)), `falta ${n}`);

    const claro = await medir(archivo(media, "logo.png"));
    const oscuro = await medir(archivo(media, "logo-dark.png"));
    for (const [n, m] of [["logo.png", claro], ["logo-dark.png", oscuro]] as const) {
      assert.deepEqual([m.w, m.h], [ANCHO, ALTO], `${n} mide ${ANCHO}×${ALTO} (mide ${m.w}×${m.h})`);
      assert.deepEqual(m.esquinas, [0, 0, 0, 0], `${n}: fondo transparente en las cuatro esquinas (hay ${JSON.stringify(m.esquinas)})`);
      assert.ok(m.opacos > 0, `${n} tiene tinta (píxeles opacos: ${m.opacos})`);
    }
    assert.ok(claro.lum < 0.4, `logo.png con tinta oscura para superficie clara (luminancia ${claro.lum.toFixed(3)})`);
    assert.ok(oscuro.lum > 0.6, `logo-dark.png con tinta clara para el hero (luminancia ${oscuro.lum.toFixed(3)})`);

    for (const n of ["logo.png", "logo-dark.png"]) {
      assert.ok(readFileSync(archivo(media, n)).equals(readFileSync(archivo(media2, n))), `${n}: dos corridas dan los mismos bytes`);
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
