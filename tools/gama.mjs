#!/usr/bin/env node
/**
 * gama.mjs — ¿el contenido de un fixture está en la gama de su paleta? (R13/R14, SISTEMA-COLOR § 8)
 *
 * Uso: node tools/gama.mjs <fixture> [--json]                     p. ej. node tools/gama.mjs peluqueria-paleta-a
 *      node tools/gama.mjs --archivo <ruta> --paleta a|b|<fixture>   mide un archivo suelto contra la paleta de A/B
 * Lee dev-fixtures/<fixture>.json (branding.colors + rutas de hero.video, sections.services.images,
 * gallery, staff[].photoUrl bajo /dev-fixtures/media/…), decodifica cada archivo en Chromium
 * (imágenes por <img>, vídeo por <video> webm en t = 1 s y a mitad; mp4 h264 no decodifica en
 * Chromium de Playwright: se mide el webm) y mide en OKLab/OKLCH:
 *   - tono dominante (moda por sectores de 15° de H en los píxeles con C > 0,04, **excluida la banda de piel
 *     y pelo 40–80°**: la piel es siempre cálida y no la controla el prompt; lo que se mide es la escena)
 *     y cuota de píxeles saturados no-piel;
 *   - `fuera%` (GAMA-02): cuota de píxeles saturados no-piel a más de ±35° del acento, en % del cuadro;
 *   - temperatura: media de (a, b) de OKLab; b > 0 cálido / b < 0 frío, a > 0 rojizo / a < 0 verdoso;
 *   - luz: media de L; y el borde (10 % exterior) contra --surface / --surface-alt (ΔE OKLab).
 * Criterio (pasa / no pasa, con cifras):
 *   T  tono (GAMA-02): pasa si (a) |H_dom − H_acento| ≤ 35°, o (b) escena neutra: saturados no-piel < 15 % del
 *      cuadro Y `fuera%` ≤ 2 %. T mira los píxeles con color: un solo objeto fuera de paleta (> 2 % del cuadro)
 *      tumba el archivo aunque el resto sea neutro (el promedio no lo esconde).
 *   K  temperatura: signo de b medio = signo de b del acento, o |b| < 0,01;
 *   S  serie (fotos de servicio/galería/retratos): |L − mediana de la serie| ≤ 0,15;
 *   F  fondo (fotos que se apoyan en la superficie): ΔE(borde, surface|surface-alt) ≤ 0,12.
 * Sin fuente pública para el muestreo ni para el 2 % (hueco 6 de SISTEMA-COLOR): se calibra con el primer material de Liam.
 * Salida: tabla por archivo y exit 1 si alguno no pasa. `medir()` se exporta para tests/gama.test.ts.
 */
import { chromium } from "playwright";
import { hexToRgb, rgbToOklab, labToLch, deltaE, deltaHue } from "../src/lib/oklab.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const HUE_TOL = 35; // grados alrededor del acento
export const NEUTRAL_SAT = 0.15; // escena neutra: saturados no-piel < 15 %
export const OUT_MAX = 0.02; // GAMA-02: fuera de ±35° ≤ 2 % del cuadro
const NEED = ["surface", "surfaceAlt", "text", "accentStrong", "highlight", "scrim"];

const oklab = (r, g, b) => rgbToOklab([r, g, b]);
const lch = (lab) => ({ ...labToLch(lab), a: lab[1], b: lab[2] });

/** Archivos que declara un fixture (rol, ruta, tipo, serie, fondo). */
export function archivosDeFixture(fx) {
  const files = [];
  const v = fx.hero?.video ?? {};
  if (v.webm) files.push({ role: "clip 16:9", src: v.webm, kind: "video" });
  if (v.poster) files.push({ role: "póster 16:9", src: v.poster, kind: "image" });
  if (v.portrait?.webm) files.push({ role: "clip 9:16", src: v.portrait.webm, kind: "video" });
  if (v.portrait?.poster) files.push({ role: "póster 9:16", src: v.portrait.poster, kind: "image" });
  (fx.sections?.services?.images ?? []).slice(0, 6).forEach((s, i) => files.push({ role: `servicio ${i + 1}`, src: s, kind: "image", serie: "servicio", fondo: true }));
  (fx.gallery ?? []).slice(0, 6).forEach((s, i) => files.push({ role: `galería ${i + 1}`, src: s, kind: "image", serie: "galería" }));
  (fx.staff ?? []).forEach((m, i) => m.photoUrl && files.push({ role: `retrato ${i + 1}`, src: m.photoUrl, kind: "image", serie: "retrato", fondo: true }));
  if (fx.brand?.logo) files.push({ role: "logo", src: fx.brand.logo, kind: "image" });
  if (fx.brand?.logoDark) files.push({ role: "logo oscuro", src: fx.brand.logoDark, kind: "image" });
  return files;
}

/** Mide una lista de archivos contra los roles de una paleta. `src` = ruta absoluta, ruta /dev-fixtures/… o URL. */
export async function medir(files, colors) {
  for (const k of NEED) if (!colors[k]) throw new Error(`paleta sin ${k}`);
  const pal = Object.fromEntries(NEED.map((k) => [k, oklab(...hexToRgb(colors[k]))]));
  const acc = lch(pal.accentStrong);
  const local = (src) => (src.startsWith("/dev-fixtures/") ? path.join(ROOT, src) : /^[A-Za-z]:[\\/]/.test(src) || (src.startsWith("/") && !src.startsWith("//")) ? src : null);
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const page = await browser.newPage();
  await page.goto("file:///" + path.join(ROOT, "dev-fixtures").replace(/\\/g, "/") + "/README.md").catch(() => {});
  const sample = async (f) => {
    const p = local(f.src);
    if (p && !fs.existsSync(p)) return { error: "no existe" };
    const url = p ? "file:///" + p.replace(/\\/g, "/") : f.src;
    return page.evaluate(async ({ url, kind }) => {
      const draw = (el, w, h) => { const cv = document.createElement("canvas"); cv.width = 160; cv.height = Math.max(1, Math.round((160 * h) / w)); cv.getContext("2d").drawImage(el, 0, 0, cv.width, cv.height); return cv; };
      const cvs = [];
      if (kind === "video") {
        const vid = document.createElement("video"); vid.muted = true; vid.src = url; vid.crossOrigin = "anonymous";
        await new Promise((res, rej) => { vid.onloadedmetadata = res; vid.onerror = () => rej(new Error("no decodificable")); });
        for (const t of [1, vid.duration / 2]) { vid.currentTime = Math.min(t, Math.max(0, vid.duration - 0.1)); await new Promise((r) => { vid.onseeked = r; }); cvs.push(draw(vid, vid.videoWidth, vid.videoHeight)); }
      } else {
        const img = new Image(); img.crossOrigin = "anonymous"; img.src = url;
        await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("no decodificable")); });
        cvs.push(draw(img, img.naturalWidth, img.naturalHeight));
      }
      return cvs.map((cv) => { const { data } = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height); return { w: cv.width, h: cv.height, px: Array.from(data) }; });
    }, { url, kind: f.kind }).catch((e) => ({ error: String(e.message || e).slice(0, 60) }));
  };
  const rows = [];
  for (const f of files) {
    const frames = await sample(f);
    if (frames.error) { rows.push({ ...f, error: frames.error }); continue; }
    let Ls = [], as = [], bs = [], hues = [], sat = 0, out = 0, n = 0, border = [0, 0, 0], nb = 0;
    for (const fr of frames) {
      const { w, h, px } = fr; const m = 0.1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; if (px[i + 3] < 128) continue; // transparencia (logos)
        const lab = oklab(px[i], px[i + 1], px[i + 2]); const L = lch(lab);
        Ls.push(lab[0]); as.push(lab[1]); bs.push(lab[2]); n++;
        if (L.C > 0.04 && (L.H < 40 || L.H > 80)) { hues.push(L.H); sat++; if (deltaHue(L.H, acc.H) > HUE_TOL) out++; }
        if (x < w * m || x >= w * (1 - m) || y < h * m || y >= h * (1 - m)) { border[0] += lab[0]; border[1] += lab[1]; border[2] += lab[2]; nb++; }
      }
    }
    if (!n) { rows.push({ ...f, error: "sin píxeles opacos" }); continue; }
    const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;
    const bins = new Array(24).fill(0); for (const hh of hues) bins[Math.floor(hh / 15) % 24]++;
    const top = bins.indexOf(Math.max(...bins)); const Hdom = hues.length ? top * 15 + 7.5 : null;
    const r = { ...f, L: +mean(Ls).toFixed(3), a: +mean(as).toFixed(3), b: +mean(bs).toFixed(3), sat: +(sat / n).toFixed(3), fuera: +(out / n).toFixed(4), Hdom, border: nb ? border.map((x) => x / nb) : null };
    r.dHue = Hdom === null ? null : +deltaHue(Hdom, acc.H).toFixed(0);
    // GAMA-02: (a) tono dominante en gama, o (b) escena neutra sin objetos fuera de paleta (> 2 % del cuadro)
    r.T = (r.dHue !== null && r.dHue <= HUE_TOL) || (r.sat < NEUTRAL_SAT && r.fuera <= OUT_MAX);
    r.K = Math.abs(r.b) < 0.01 || Math.sign(r.b) === Math.sign(acc.b);
    r.dEfondo = f.fondo && r.border ? +Math.min(deltaE(r.border, pal.surface), deltaE(r.border, pal.surfaceAlt)).toFixed(3) : null;
    r.F = f.fondo ? r.dEfondo <= 0.12 : null;
    rows.push(r);
  }
  for (const serie of ["servicio", "galería", "retrato"]) {
    const rs = rows.filter((r) => r.serie === serie && !r.error); if (rs.length < 2) continue;
    const Ls = rs.map((r) => r.L).sort((a, b) => a - b); const med = Ls[Math.floor(Ls.length / 2)];
    for (const r of rs) { r.dL = +(r.L - med).toFixed(3); r.S = Math.abs(r.dL) <= 0.15; }
  }
  for (const r of rows) r.pasa = !r.error && [r.T, r.K, r.S, r.F].every((x) => x !== false);
  await browser.close();
  return { rows, acc, colors };
}

export function imprimir(name, { rows, acc, colors }) {
  const fmt = (x) => (x === null || x === undefined ? "—" : x === true ? "sí" : x === false ? "NO" : x);
  console.log(`gama · ${name} · acento ${colors.accentStrong} (H ${acc.H.toFixed(0)}°, b ${acc.b.toFixed(3)} ${acc.b >= 0 ? "cálido" : "frío"}) · surface ${colors.surface} · T: ΔH ≤ ${HUE_TOL}° o (sat < ${NEUTRAL_SAT * 100} % y fuera ≤ ${OUT_MAX * 100} %)`);
  console.log("rol            | archivo                                   | L     | a      | b      | sat   | fuera% | Hdom | ΔH  | ΔE fondo | ΔL serie | T  K  S  F  | pasa");
  for (const r of rows) {
    const file = r.src.replace(/^\/dev-fixtures\/media\//, "").replace(/^.*[\\/]/, "").slice(0, 41).padEnd(41);
    if (r.error) { console.log(`${r.role.padEnd(14)} | ${file} | ${r.error}`); continue; }
    console.log(`${r.role.padEnd(14)} | ${file} | ${r.L.toFixed(3)} | ${(r.a >= 0 ? "+" : "") + r.a.toFixed(3)} | ${(r.b >= 0 ? "+" : "") + r.b.toFixed(3)} | ${r.sat.toFixed(3)} | ${(r.fuera * 100).toFixed(1).padStart(5)}% | ${fmt(r.Hdom === null ? null : r.Hdom.toFixed(0)).toString().padStart(4)} | ${fmt(r.dHue).toString().padStart(3)} | ${fmt(r.dEfondo).toString().padStart(8)} | ${fmt(r.dL).toString().padStart(8)} | ${fmt(r.T).padEnd(2)} ${fmt(r.K).padEnd(2)} ${fmt(r.S).padEnd(2)} ${fmt(r.F).padEnd(2)} | ${r.pasa ? "PASA" : "NO PASA"}`);
  }
  const bad = rows.filter((r) => !r.pasa).length;
  console.log(`${rows.length - bad}/${rows.length} en gama`);
  return bad;
}

export const paletaDe = (nombre) => {
  const fx = { a: "peluqueria-paleta-a", b: "peluqueria-paleta-b" }[nombre] ?? nombre;
  return JSON.parse(fs.readFileSync(path.join(ROOT, "dev-fixtures", `${fx}.json`), "utf8")).branding?.colors ?? {};
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
  if (opt("archivo")) {
    const file = path.resolve(opt("archivo")); const kind = /\.(webm|mp4)$/i.test(file) ? "video" : "image";
    const res = await medir([{ role: "archivo", src: file, kind }], paletaDe(opt("paleta") ?? "a"));
    const bad = imprimir(path.basename(file), res); process.exit(bad ? 1 : 0);
  }
  const name = args.find((a) => !a.startsWith("--"));
  if (!name) { console.error("uso: node tools/gama.mjs <fixture> [--json] | --archivo <ruta> --paleta a|b"); process.exit(2); }
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, "dev-fixtures", `${name}.json`), "utf8"));
  const res = await medir(archivosDeFixture(fx), fx.branding?.colors ?? {});
  const bad = imprimir(name, res);
  if (args.includes("--json")) fs.writeFileSync(path.join(ROOT, `gama-${name}.json`), JSON.stringify({ palette: res.colors, rows: res.rows }, null, 1));
  process.exit(bad ? 1 : 0);
}
