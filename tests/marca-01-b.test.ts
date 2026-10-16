// MARCA-01 · copia promovida (CRM-03, 2026-10-16, D-312) de tests/orden/marca-01/b.test.ts. La orden quedó aprobada por Liam
// el 2026-10-08 (T 96bceb2 · H 17fd18b) y su carpeta está congelada; esto es la copia editable que corre `npm test` (fase test:unit).
// Recorte: sólo B1 (cuboNeutros, puro); B2 y B3 gradúan vídeo con ffmpeg (minutos) y quedan en la orden congelada.
// MARCA-01 · B1, B2, B3 (T) · la graduación del material de una plantilla a la paleta de la clienta (M1-4). Sesión A (2026-10-07):
// tests rojos — no existe `tools/material/graduar.mjs`.
//
// Medido (D-287, con el prototipo de A sobre `instrumentos/lut.mjs`): el LUT deja la L (|ΔL| ≤ 0,0100 en la red, el recorte al gamut),
// no toca lo saturado ni la piel, y lleva cada neutro al tinte de la rampa; los 12 archivos salen en 261 s, dos corridas byte a byte
// iguales, con los mismos cuadros, la misma duración y la misma luz que la plantilla; el webm 9:16 pesa 6 132 292 B (< 6 MiB, D-285 (1)).
// Lo que se mira de la salida se mide aquí con ffmpeg (`_comun.ts`), sin pasar por gama.mjs. Caja negra: `import()` dinámico de
// graduar.mjs para B1; B2 y B3 la corren como la corre una persona. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  A, A_DIR, PALETA_YULIA, ROOT, YULIA_DIR, YULIA_FOTOS, conTemporal, cuadro, deltaEMedio, difTono, hex2lab, lMedia, material, medidaN,
  paletaDeFixture, rampaDe, rgb2lab, sha256De, sondaVideo, tono, type Cfg,
} from "./orden/marca-01/_comun.ts";

const GRADUAR = "tools/material/graduar.mjs";
const MIB = 1024 * 1024;
const VIDEOS = ["hero.mp4", "hero.webm", "hero-1280.mp4", "hero-1280.webm", "hero-v.mp4", "hero-v.webm"];
const DOCE = [...VIDEOS, "hero-poster.avif", "hero-v-poster.avif", "textura.jpg", "local.jpg", "local-v.jpg", "og.jpg"];
const REALES = ["servicio-1.jpg", "servicio-5.jpg", "galeria-1.jpg", "galeria-6.jpg", "retrato-1.jpg"];

/** Corre graduar.mjs (hasta 40 min: una graduación entera, con un hilo, son ≈ 4,5 min). */
function graduar(args: string[]): { status: number | null; out: string } {
  const r = spawnSync(process.execPath, [resolve(ROOT, GRADUAR), ...args], { cwd: ROOT, encoding: "utf8", timeout: 40 * 60 * 1000, windowsHide: true, maxBuffer: 64 * MIB });
  return { status: r.status, out: `${r.stdout ?? ""}\n${r.stderr ?? ""}` };
}
/** El JSON de la paleta que lee --colores (la forma del config: `branding.colors`). */
function paletaJson(base: string): string {
  const f = join(base, "paleta.json");
  writeFileSync(f, JSON.stringify({ branding: { mode: "light", colors: PALETA_YULIA } }));
  return f;
}

test("tools/material/graduar.mjs exporta cuboNeutros(colores, tinteMedio), que devuelve el texto .cube de un LUT 3D de 33 × 33 × 33 en el que, en OKLab, ningún color cambia su L en más de 0,015; los saturados (C ≥ 0,09) y los de la banda de piel y pelo (H 30–100° con C ≥ 0,035) salen iguales; cada neutro (C ≤ 0,03 fuera de esa banda, con 0,1 ≤ L ≤ 0,95) sale, a 0,002, con el tinte de la rampa neutra de la paleta a su misma L más la mitad de su desvío del tinte medio, sin cambiar su L en más de 0,001; y la misma entrada da el mismo texto", async () => {
  // (1) El módulo. Hoy no existe: aquí está el rojo.
  assert.ok(existsSync(resolve(ROOT, GRADUAR)), `falta ${GRADUAR} (M1-4): hoy no hay cómo llevar el material de la plantilla a la paleta de la clienta`);
  const mod = (await import(pathToFileURL(resolve(ROOT, GRADUAR)).href)) as Cfg;
  assert.equal(typeof mod.cuboNeutros, "function", `${GRADUAR} exporta cuboNeutros(colores, tinteMedio)`);

  for (const [nombre, colores, medio] of [["Yulia", PALETA_YULIA, [-0.001, -0.007]], ["C", paletaDeFixture("c"), [0.004, 0.003]]] as [string, Record<string, string>, [number, number]][]) {
    const texto = String(mod.cuboNeutros(colores, medio));
    assert.equal(String(mod.cuboNeutros(colores, medio)), texto, `${nombre}: la misma entrada da el mismo texto`);
    const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    assert.ok(lineas.some((l) => /^LUT_3D_SIZE\s+33$/.test(l)), `${nombre}: el .cube declara LUT_3D_SIZE 33`);
    const datos = lineas.filter((l) => /^[-\d.]+\s+[-\d.]+\s+[-\d.]+$/.test(l)).map((l) => l.split(/\s+/).map(Number));
    assert.equal(datos.length, 33 ** 3, `${nombre}: 33³ = 35 937 filas «r g b»`);
    const tinte = rampaDe(colores), faltas: string[] = [];
    for (let bi = 0; bi < 33; bi++) for (let gi = 0; gi < 33; gi++) for (let ri = 0; ri < 33; ri++) {
      const ent = [ri / 32, gi / 32, bi / 32], sal = datos[ri + gi * 33 + bi * 33 * 33];
      const [L, a, b] = rgb2lab(ent[0], ent[1], ent[2]), [L2, a2, b2] = rgb2lab(sal[0], sal[1], sal[2]);
      const C = Math.hypot(a, b), H = tono(a, b), donde = `(${ri},${gi},${bi}) L ${L.toFixed(3)} C ${C.toFixed(3)} H ${H.toFixed(0)}°`;
      if (Math.abs(L2 - L) > 0.015) faltas.push(`${donde}: su L cambia ${(L2 - L).toFixed(4)}`);
      const igual = Math.max(...sal.map((v, i) => Math.abs(v - ent[i])));
      if (C >= 0.09 && igual > 2e-4) faltas.push(`${donde}: saturado y cambia (Δrgb ${igual.toFixed(5)})`);
      else if (H >= 30 && H <= 100 && C >= 0.035 && igual > 2e-4) faltas.push(`${donde}: piel/pelo y cambia (Δrgb ${igual.toFixed(5)})`);
      else if (C <= 0.03 && !(H >= 30 && H <= 100 && C > 0.015) && L >= 0.1 && L <= 0.95) {
        const [ta, tb] = tinte(L), ea = ta + (a - medio[0]) * 0.5, eb = tb + (b - medio[1]) * 0.5;
        if (Math.hypot(a2 - ea, b2 - eb) > 0.002) faltas.push(`${donde}: neutro con tinte (${a2.toFixed(4)}, ${b2.toFixed(4)}) y no el de la rampa (${ea.toFixed(4)}, ${eb.toFixed(4)})`);
        if (Math.abs(L2 - L) > 0.001) faltas.push(`${donde}: neutro y su L cambia ${(L2 - L).toFixed(4)}`);
      }
    }
    assert.deepEqual(faltas.slice(0, 12), [], `${nombre}: ${faltas.length} colores fuera del LUT de M1-4`);
  }
});

