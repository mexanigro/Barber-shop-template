#!/usr/bin/env node
/**
 * costura.mjs — R20 (R19-bis, REPLANTEO-02): la transición hero → fondo se trabaja en la imagen. Retoca SÓLO la banda
 * superior de la foto del local para que reciba el pie del clip: degradado de luz y tono en OKLab desde el pie del clip
 * (fila 0) hasta la foto tal cual (fin de la banda), sin LUT creativa. La original no se toca: escribe `<foto>-costura.jpg`
 * junto a la original (o --out). Después se vuelve a medir con gama.mjs (T/K/F).
 *
 * Uso: node tools/material/costura.mjs <foto.jpg> --clip <hero.webm|mp4> [--banda 0.20] [--franja 0.10] [--out <ruta>] [--fuerza 1]
 *   --clip   el clip del hero: se mide su pie (franja inferior --franja, t = 1 s y a mitad) como en transicion.mjs
 *   --banda  alto de la banda retocada, fracción de la foto (0,20)
 *   --fuerza 0–1: cuánto se acerca la fila 0 al pie del clip (1 = igual al pie)
 * Decodifica y recompone en Chromium (Playwright, canvas), como gama.mjs; convierte a JPG q3 con ffmpeg.
 */
import { chromium } from "playwright"; import { spawnSync } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { medir, paletaDe } from "../gama.mjs";
import { labToLch } from "../../src/lib/oklab.ts";

const args = process.argv.slice(2); const foto = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const clip = opt("clip"); if (!foto || !clip) { console.error("uso: node tools/material/costura.mjs <foto.jpg> --clip <hero.webm> [--banda 0.20] [--franja 0.10] [--out <ruta>] [--fuerza 1]"); process.exit(2); }
const banda = +opt("banda", 0.2), franja = +opt("franja", 0.1), fuerza = +opt("fuerza", 1);
const out = opt("out", foto.replace(/\.(jpe?g|png)$/i, "-costura.jpg"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "costura-"));
// 1 · pie del clip (OKLab medio de la franja inferior), igual que transicion.mjs
const dur = +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clip], { encoding: "utf8" }).stdout || 8;
const frames = [1, dur / 2].map((t, i) => { const o = path.join(tmp, `pie-${i}.png`); spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", clip, "-frames:v", "1", "-vf", `crop=iw:ih*${franja}:0:ih*${1 - franja}`, "-update", "1", o]); return { role: `pie ${i}`, src: o, kind: "image" }; });
const { rows } = await medir(frames, paletaDe("a"));
const pie = [0, 1, 2].map((k) => (rows[0][["L", "a", "b"][k]] + rows[1][["L", "a", "b"][k]]) / 2);
const pieLch = labToLch(pie);
// 2 · retoque de la banda en Chromium: por fila y, mezcla lab_pixel → pie con peso w(y) = fuerza · (1 − y/bandaPx)^1.5 (suave, sin escalón)
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] }); const page = await b.newPage();
await page.goto("file:///" + path.resolve(tmp).replace(/\\/g, "/") + "/").catch(() => {});
const dataUrl = await page.evaluate(async ({ url, pie, banda, fuerza }) => {
  const img = new Image(); img.src = url; await new Promise((r, j) => { img.onload = r; img.onerror = () => j(new Error("no decodificable")); });
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height); const p = d.data; const H = Math.round(c.height * banda);
  // sRGB ↔ OKLab (Björn Ottosson), copia mínima para el navegador
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const gam = (v) => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
  const toLab = (r, g, b) => { r = lin(r); g = lin(g); b = lin(b); const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b); return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; };
  const toRgb = ([L, a, bb]) => { const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * bb, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * bb, 3), s = Math.pow(L - 0.0894841775 * a - 1.291485548 * bb, 3); return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)]; };
  for (let y = 0; y < H; y++) { const w = fuerza * Math.pow(1 - y / H, 1.5); for (let xx = 0; xx < c.width; xx++) { const i = (y * c.width + xx) * 4; const lab = toLab(p[i], p[i + 1], p[i + 2]); const mix = [lab[0] + (pie[0] - lab[0]) * w, lab[1] + (pie[1] - lab[1]) * w, lab[2] + (pie[2] - lab[2]) * w]; const [r, g, bl] = toRgb(mix); p[i] = r; p[i + 1] = g; p[i + 2] = bl; } }
  x.putImageData(d, 0, 0); return c.toDataURL("image/png");
}, { url: "file:///" + path.resolve(foto).replace(/\\/g, "/"), pie, banda, fuerza });
await b.close();
const png = path.join(tmp, "costura.png"); fs.writeFileSync(png, Buffer.from(dataUrl.split(",")[1], "base64"));
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-q:v", "3", out]); if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`costura · pie del clip L ${pieLch.L.toFixed(3)} C ${pieLch.C.toFixed(3)} H ${pieLch.H.toFixed(0)}° · banda ${Math.round(banda * 100)} % · fuerza ${fuerza} → ${out} (la original no se toca; medir con gama.mjs)`);
