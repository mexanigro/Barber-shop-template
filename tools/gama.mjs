#!/usr/bin/env node
/**
 * gama.mjs — ¿el contenido de un fixture está en la gama de su paleta? (R13/R14, SISTEMA-COLOR § 8)
 *
 * Uso: node tools/gama.mjs <fixture> [--json]                     p. ej. node tools/gama.mjs peluqueria-paleta-a
 *      node tools/gama.mjs --archivo <ruta> --paleta a|b|<fixture> [--fuente]   mide un archivo suelto; --fuente imprime el color
 *      fuente del camino B (S4: media de los saturados C > 0,05 SIN excluir la banda de piel: luces y objetos)
 * Lee dev-fixtures/<fixture>.json (branding.colors + rutas de hero.video, sections.services.images,
 * gallery, staff[].photoUrl bajo /dev-fixtures/media/…), decodifica cada archivo en Chromium
 * (imágenes por <img>, vídeo por <video> webm en t = 1 s y a mitad; mp4 h264 no decodifica en
 * Chromium de Playwright: se mide el webm) y mide en OKLab/OKLCH:
 *   - tono dominante (moda por sectores de 15° de H en los píxeles con C > 0,04, **excluida la banda de piel
 *     y pelo 30–80°** (MATERIAL-04: era 40–80°; el pelo castaño bajo luz fría mide 35–40° y tumbaba fotos de B): la piel es
 *     siempre cálida y no la controla el prompt; lo que se mide es la escena)
 *     y cuota de píxeles saturados no-piel;
 *   - `fuera%` (GAMA-02): cuota de píxeles saturados no-piel a más de ±35° del acento, en % del cuadro;
 *   - temperatura: media de (a, b) de OKLab **sobre los mismos píxeles que T, es decir sin la banda de piel y pelo** (MATERIAL-04 B2:
 *     los píxeles con C > 0,04 y H 30–80° no cuentan; el cuadro entero se guarda en `bAll`). b > 0 cálido / b < 0 frío, a > 0 rojizo /
 *     a < 0 verdoso. Por qué: en 9:16 el pelo domina el recorte (B 7281027, rubio cálido: b +0,019 con cualquier foco) y la piel es
 *     siempre cálida sin que la controle el prompt; la temperatura que se juzga es la de la escena (pared, luz, ropa, objetos);
 *   - luz: media de L; y la pared (cada esquina superior, cuadrados del 12 % del ancho; vale la mejor de las dos porque una puede
 *     llevar el objeto acento) contra --surface / --surface-alt (ΔE OKLab).
 * Criterio (pasa / no pasa, con cifras):
 *   T  tono (GAMA-02): pasa si (a) |H_dom − H_acento| ≤ 35°, o (b) escena neutra: saturados no-piel < 15 % del
 *      cuadro Y `fuera%` ≤ 2 %. T mira los píxeles con color: un solo objeto fuera de paleta (> 2 % del cuadro)
 *      tumba el archivo aunque el resto sea neutro (el promedio no lo esconde).
 *   K  temperatura: signo de b medio (sin piel/pelo) = signo de b del acento, o |b| < 0,01;
 *   V  ocupación (D20, REPLANTEO-02; sólo clips del hero y sus pósteres, `v: true`): (1) el sujeto —píxeles de piel/pelo
 *      (banda 30–80°, C > 0,04) o con borde (gradiente de luma > V_EDGE_T)— ocupa ≥ V_OCUP_MIN de la altura del cuadro dentro
 *      de los dos tercios superiores (filas con ≥ V_ROW_FRAC de píxeles-sujeto); (2) el tercio inferior es liso: cuota de
 *      píxeles con borde ≤ V_EDGE_MAX y de saturados (C > 0,04, incluida la piel) ≤ V_SAT_MAX. Calibrado con 7440194 = NO
 *      (pie con pelo) y 3996967 = sí (pie con ropa lisa). Causa: con el pie lleno de pelo el scrim tiene que ser fuerte, el
 *      traspaso hero → foto se ve como escalón y el texto centro-abajo no llega a 4,5. **Corrección de Liam (2026-09-19, R19-bis):
 *      V es DATO, no criterio de elección ni gate: el clip se elige por lo que muestra (T/K); la transición se trabaja en la
 *      imagen y en la costura (`transicion.mjs` escribe el pie del clip; `costura.mjs` retoca la banda superior de la foto).**
 *   S  serie (fotos de servicio/galería/retratos): |L − mediana de la serie| ≤ 0,15;
 *   Q  quietud (R21, sólo texturas, `quietud: true`): |L(p98) − L(p2)| ≤ Q_DL_MAX y texto (`--text` de la paleta) ≥ 4,5 sobre el
 *      píxel más oscuro (o más claro en modo oscuro): la textura es color con forma, no una imagen;
 *   F  fondo (fotos que se apoyan en la superficie, `fondo: true`): pared = la mejor de las dos esquinas superiores (MATERIAL-02: antes
 *      era el borde exterior entero, que incluye hombros y pelo; el acento pequeño suele ir en una esquina). Pasa si
 *      (1) ΔE(pared, surface|surface-alt) ≤ 0,12 Y (2) tono (MATERIAL-03): si la pared tiene C > 0,01 en OKLCH, su H está a ±35° del
 *      de accent-strong; con C ≤ 0,01 es neutra y pasa. Motivo del tono: la crema #f3ead8 queda a ΔE 0,019 de surface-alt (menos que
 *      las paredes correctas, 0,016–0,049): con ΔE solo no se separa; por tono (H ≈ 90° vs 140°) sí. Sin pared arriba (galería a
 *      sangre) F no aplica: `fondo: false` → «—».
 * Sin fuente pública para el muestreo ni para el 2 % (hueco 6 de SISTEMA-COLOR): se calibra con el primer material de Liam.
 * Salida: tabla por archivo y exit 1 si alguno no pasa. `medir()` se exporta para tests/gama.test.ts.
 */
import { chromium } from "playwright";
import { hexToRgb, rgbToOklab, labToLch, deltaE, deltaHue, contrastRatio, oklabToHex } from "../src/lib/oklab.ts";
/** Contraste WCAG entre un color OKLab y un hex. */
const contrasteLab = (lab, hex) => contrastRatio(oklabToHex([lab.L, lab.a, lab.b]), hex);
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ESCENA_DL = 0.15, ESCENA_DH = 35; // E · escena (R24, GALERIA-02 A2): clip y póster del hero vs foto del local
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const HUE_TOL = 35; // grados alrededor del acento
export const NEUTRAL_SAT = 0.15; // escena neutra: saturados no-piel < 15 %
export const OUT_MAX = 0.02; // GAMA-02: fuera de ±35° ≤ 2 % del cuadro
export const SKIN_H = [30, 80]; // banda de piel y pelo que T no juzga (MATERIAL-04: 30–80°; antes 40–80°)
export const F_MAX = 0.12; // F: ΔE pared ↔ surface|surface-alt
export const F_CORNER = 0.12; // F: lado de cada esquina superior, en fracción del ancho
export const F_NEUTRAL_C = 0.01; // F: con croma de pared ≤ esto, la pared es neutra y el tono no se juzga
export const V_EDGE_T = 0.08; // V: salto de luma (0–1) entre píxeles vecinos que cuenta como borde (calibrado: 3996967 0,051 · 7281027 0,078 · 7440194 0,138)
export const V_ROW_FRAC = 0.12; // V: una fila es «sujeto» si ≥ 12 % de sus píxeles son piel/pelo o borde
export const V_OCUP_MIN = 0.5; // V: el sujeto ocupa ≥ 50 % de la altura de los dos tercios superiores
export const V_EDGE_MAX = 0.06; // V: bordes en el tercio inferior ≤ 6 % de sus píxeles (calibrado: 7440194 NO, 3996967 sí)
export const Q_DL_MAX = 0.06; // Q: quietud de la textura, |ΔL| entre percentil 2 y 98
export const V_SAT_MAX = 0.35; // V: saturados (piel incluida) en el tercio inferior ≤ 35 %
const NEED = ["surface", "surfaceAlt", "text", "accentStrong", "highlight", "scrim"];

const oklab = (r, g, b) => rgbToOklab([r, g, b]);
const lch = (lab) => ({ ...labToLch(lab), a: lab[1], b: lab[2] });

/** V (D20): ocupación del sujeto en los dos tercios superiores y lisura del tercio inferior, sobre un cuadro muestreado. */
export function ocupacion({ w, h, px }) {
  const luma = new Float32Array(w * h); const subj = new Uint8Array(w * h); const satM = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]; luma[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const L = lch(oklab(r, g, b)); if (L.C > 0.04) { satM[i] = 1; if (L.H >= SKIN_H[0] && L.H <= SKIN_H[1]) subj[i] = 1; }
  }
  const edge = new Uint8Array(w * h);
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x; if (Math.abs(luma[i] - luma[i + 1]) > V_EDGE_T || Math.abs(luma[i] - luma[i + w]) > V_EDGE_T) { edge[i] = 1; subj[i] = 1; } }
  const top = Math.floor((h * 2) / 3); let filas = 0;
  for (let y = 0; y < top; y++) { let c = 0; for (let x = 0; x < w; x++) c += subj[y * w + x]; if (c / w >= V_ROW_FRAC) filas++; }
  let e = 0, s = 0, n = 0; for (let y = top; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; e += edge[i]; s += satM[i]; n++; }
  return { ocup: filas / top, pieBordes: e / n, pieSat: s / n }; // ocup = cuota de los dos tercios superiores con sujeto
}

/** Archivos que declara un fixture (rol, ruta, tipo, serie, fondo). */
export function archivosDeFixture(fx) {
  const files = [];
  const v = fx.hero?.video ?? {};
  // VERDAD-01 1.7 (2026-09-20): con foto del local en el fixture rige R24 (las fotos se hacen EN la escena del local, no sobre la
  // pared lisa de la paleta): servicio, galería y retrato dejan de medir F («—», no gatea). Sin foto del local, F sigue como antes.
  const escena = !!(fx.branding?.localPhoto || fx.branding?.localPhotoMobile);
  if (v.webm) files.push({ role: "clip 16:9", src: v.webm, kind: "video", v: true });
  if (v.poster) files.push({ role: "póster 16:9", src: v.poster, kind: "image", v: true });
  if (v.portrait?.webm) files.push({ role: "clip 9:16", src: v.portrait.webm, kind: "video", v: true });
  if (v.portrait?.poster) files.push({ role: "póster 9:16", src: v.portrait.poster, kind: "image", v: true });
  (fx.sections?.services?.images ?? []).slice(0, 6).forEach((s, i) => files.push({ role: `servicio ${i + 1}`, src: s, kind: "image", serie: "servicio", fondo: !escena }));
  ((fx.sections?.gallery?.items?.length ? fx.sections.gallery.items.map((it) => it.src) : fx.gallery) ?? []).slice(0, 6).forEach((s, i) => files.push({ role: `galería ${i + 1}`, src: s, kind: "image", serie: "galería" })); // GALERIA-05: items con tipo primero
  (fx.staff ?? []).forEach((m, i) => m.photoUrl && files.push({ role: `retrato ${i + 1}`, src: m.photoUrl, kind: "image", serie: "retrato", fondo: !escena }));
  // REPLANTEO-01 D5: foto del local (fondo fijo), dos imágenes; F contra la pared (esquinas superiores)
  const foot = fx.branding?.heroToBackdrop?.foot?.hex; // R20: banda superior en el tono del pie del clip
  if (fx.branding?.localPhoto) files.push({ role: "local 16:9", src: fx.branding.localPhoto, kind: "image", fondo: true, foot });
  if (fx.branding?.localPhotoMobile) files.push({ role: "local 9:16", src: fx.branding.localPhotoMobile, kind: "image", fondo: true, foot: fx.branding?.heroToBackdrop?.footPortrait?.hex ?? foot });
  if (fx.branding?.texture) files.push({ role: "textura", src: fx.branding.texture, kind: "image", quietud: true }); // R21
  if (fx.brand?.logo) files.push({ role: "logo", src: fx.brand.logo, kind: "image" });
  if (fx.brand?.logoDark) files.push({ role: "logo oscuro", src: fx.brand.logoDark, kind: "image" });
  return files;
}

/** Mide una lista de archivos contra los roles de una paleta. `src` = ruta absoluta, ruta /dev-fixtures/… o URL. */
export async function medir(files, colors) {
  for (const k of NEED) if (!colors[k]) throw new Error(`paleta sin ${k}`);
  const textHex = colors.text || (colors.foreground ?? "#000000");
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
        for (const t of [1, vid.duration / 2, vid.duration * 0.75]) { /* GALERIA-02 A2: cuadro medio y dos más (1 s y 3/4) */ vid.currentTime = Math.min(t, Math.max(0, vid.duration - 0.1)); await new Promise((r) => { vid.onseeked = r; }); cvs.push(draw(vid, vid.videoWidth, vid.videoHeight)); }
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
    let Ls = [], as = [], bs = [], bsAll = [], hues = [], sat = 0, out = 0, n = 0; const vAcc = { ocup: [], pieB: [], pieS: [] }; const src = [0, 0, 0, 0]; /* S4: suma L,a,b y cuenta de saturados (C > 0,05) CON la banda de piel */ const esq = [[0, 0, 0, 0], [0, 0, 0, 0]]; // dos esquinas superiores: suma L,a,b y cuenta
    for (const fr of frames) {
      const { w, h, px } = fr; const cs = Math.max(1, Math.round(w * F_CORNER));
      if (f.v) vAcc && (() => { const v = ocupacion(fr); vAcc.ocup.push(v.ocup); vAcc.pieB.push(v.pieBordes); vAcc.pieS.push(v.pieSat); })();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; if (px[i + 3] < 128) continue; // transparencia (logos)
        const lab = oklab(px[i], px[i + 1], px[i + 2]); const L = lch(lab);
        Ls.push(lab[0]); as.push(lab[1]); bsAll.push(lab[2]); n++;
        const piel = L.C > 0.04 && L.H >= SKIN_H[0] && L.H <= SKIN_H[1]; // banda de piel y pelo: ni T ni K la juzgan
        if (L.C > 0.05) { src[0] += lab[0]; src[1] += lab[1]; src[2] += lab[2]; src[3]++; }
        if (!piel) bs.push(lab[2]);
        if (L.C > 0.04 && !piel) { hues.push(L.H); sat++; if (deltaHue(L.H, acc.H) > HUE_TOL) out++; }
        if (y < cs && (x < cs || x >= w - cs)) { const e = esq[x < cs ? 0 : 1]; e[0] += lab[0]; e[1] += lab[1]; e[2] += lab[2]; e[3]++; }
      }
    }
    if (!n) { rows.push({ ...f, error: "sin píxeles opacos" }); continue; }
    const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;
    const bins = new Array(24).fill(0); for (const hh of hues) bins[Math.floor(hh / 15) % 24]++;
    const top = bins.indexOf(Math.max(...bins)); const Hdom = hues.length ? top * 15 + 7.5 : null;
    const r = { ...f, L: +mean(Ls).toFixed(3), a: +mean(as).toFixed(3), b: +mean(bs.length ? bs : bsAll).toFixed(3), bAll: +mean(bsAll).toFixed(3), sat: +(sat / n).toFixed(3), fuera: +(out / n).toFixed(4), Hdom, esquinas: esq.filter((e) => e[3]).map((e) => [e[0] / e[3], e[1] / e[3], e[2] / e[3]]) };
    r.dHue = Hdom === null ? null : +deltaHue(Hdom, acc.H).toFixed(0);
    // S4 (SERVICES-02): color fuente para el camino B = media de los saturados SIN excluir la banda de piel (luces, objetos)
    r.fuente = src[3] ? (() => { const m = [src[0] / src[3], src[1] / src[3], src[2] / src[3]]; const l = lch(m); return { hex: oklabToHex(m), L: +l.L.toFixed(3), C: +l.C.toFixed(3), H: +l.H.toFixed(0), n: src[3] }; })() : null;
    // GAMA-02: (a) tono dominante en gama, o (b) escena neutra sin objetos fuera de paleta (> 2 % del cuadro)
    r.T = (r.dHue !== null && r.dHue <= HUE_TOL) || (r.sat < NEUTRAL_SAT && r.fuera <= OUT_MAX);
    r.K = Math.abs(r.b) < 0.01 || Math.sign(r.b) === Math.sign(acc.b);
    // Q (R21): quietud de la textura y texto ≥ 4,5 sobre su píxel extremo
    if (f.quietud) {
      const sorted = [...Ls].sort((a, b) => a - b); const p2 = sorted[Math.floor(sorted.length * 0.02)], p98 = sorted[Math.floor(sorted.length * 0.98)];
      r.dLq = +(p98 - p2).toFixed(3);
      const textL = oklab(...hexToRgb(textHex))[0]; const extremo = textL > 0.5 ? p98 : p2; // texto claro → juzga el píxel más claro
      const idx = Ls.indexOf(extremo); const ext = { L: Ls[idx], a: as[idx], b: bsAll[idx] };
      r.contrasteQ = +contrasteLab(ext, textHex).toFixed(2);
      r.Q = r.dLq <= Q_DL_MAX && r.contrasteQ >= 4.5;
    } else r.Q = null;
    // V (D20): ocupación del sujeto y tercio inferior liso; sólo clips/pósteres del hero
    if (f.v && vAcc.ocup.length) {
      r.ocup = +mean(vAcc.ocup).toFixed(3); r.pieBordes = +mean(vAcc.pieB).toFixed(3); r.pieSat = +mean(vAcc.pieS).toFixed(3);
      r.V = r.ocup >= V_OCUP_MIN && r.pieBordes <= V_EDGE_MAX && r.pieSat <= V_SAT_MAX;
    } else r.V = null;
    // F: la mejor esquina por ΔE; su tono (si tiene croma) debe ser el del acento
    // R20: la foto del local lleva su banda superior en el tono del pie del clip (`foot`); F la compara con ese tono, no con surface
    const refs = f.foot ? [oklab(...hexToRgb(f.foot))] : [pal.surface, pal.surfaceAlt];
    const mejor = r.esquinas.map((e) => ({ e, d: Math.min(...refs.map((ref) => deltaE(e, ref))) })).sort((a, b) => a.d - b.d)[0];
    const pl = mejor ? lch(mejor.e) : null;
    r.dEfondo = f.fondo && mejor ? +mejor.d.toFixed(3) : null;
    r.Cpared = pl ? +pl.C.toFixed(3) : null; r.Hpared = pl && pl.C > F_NEUTRAL_C ? +pl.H.toFixed(0) : null;
    r.F = f.fondo && mejor ? r.dEfondo <= F_MAX && (!!f.foot || r.Hpared === null || deltaHue(r.Hpared, acc.H) <= HUE_TOL) : f.fondo ? false : null;
    rows.push(r);
  }
  for (const serie of ["servicio", "galería", "retrato"]) {
    const rs = rows.filter((r) => r.serie === serie && !r.error); if (rs.length < 2) continue;
    const Ls = rs.map((r) => r.L).sort((a, b) => a - b); const med = Ls[Math.floor(Ls.length / 2)];
    for (const r of rs) { r.dL = +(r.L - med).toFixed(3); r.S = Math.abs(r.dL) <= 0.15; }
  }
  // GALERIA-02 A2 (R24, agujero del guard: 3996972 pasaba T/K y no era la escena de C): E · escena para clips y pósteres del hero —
  // L media y H dominante del clip (3 cuadros) contra la foto del local de su orientación (16:9 → local.jpg, 9:16 → local-v.jpg):
  // |ΔL| ≤ 0,15 y (ΔH ≤ 35° o neutro = sat < 15 % y fuera ≤ 2 %, como T). Gate. Sin foto del local en el fixture, «—» y no gatea.
  const dH = (a, b) => (a === null || b === null ? null : Math.min(Math.abs(a - b), 360 - Math.abs(a - b)));
  const locH = rows.find((r) => r.role === "local 16:9" && !r.error), locV = rows.find((r) => r.role === "local 9:16" && !r.error);
  for (const r of rows) {
    if (r.error || !r.v) continue;
    const loc = r.role.includes("9:16") ? locV ?? locH : locH ?? locV; if (!loc) continue;
    const dl = Math.abs(r.L - loc.L), dh = dH(r.Hdom, loc.Hdom);
    const neutro = r.sat < NEUTRAL_SAT && r.fuera <= OUT_MAX; // «o neutro»: el clip casi sin color no discute el tono del local (como T)
    r.dLesc = +dl.toFixed(3); r.dHesc = neutro ? null : dh; r.E = dl <= ESCENA_DL && (neutro || dh === null || dh <= ESCENA_DH);
  }
  for (const r of rows) r.pasa = !r.error && [r.T, r.K, r.S, r.F, r.Q, r.E].every((x) => x !== false); // V no es gate (R19-bis): dato en la tabla; Q sí (R21); E sí (R24)
  await browser.close();
  return { rows, acc, colors };
}

export function imprimir(name, { rows, acc, colors }) {
  const fmt = (x) => (x === null || x === undefined ? "—" : x === true ? "sí" : x === false ? "NO" : x);
  console.log(`gama · ${name} · acento ${colors.accentStrong} (H ${acc.H.toFixed(0)}°, b ${acc.b.toFixed(3)} ${acc.b >= 0 ? "cálido" : "frío"}) · surface ${colors.surface} · T: ΔH ≤ ${HUE_TOL}° o (sat < ${NEUTRAL_SAT * 100} % y fuera ≤ ${OUT_MAX * 100} %)`);
  console.log("rol            | archivo                                   | L     | a      | b(K)   | sat   | fuera% | Hdom | ΔH  | ΔE pared | Hpared | ΔL serie | ocup | pie b/s   | Q dL/ctr   | E ΔL/ΔH    | T  K  S  F  V  Q  E  | pasa");
  for (const r of rows) {
    const file = r.src.replace(/^\/dev-fixtures\/media\//, "").replace(/^.*[\\/]/, "").slice(0, 41).padEnd(41);
    if (r.error) { console.log(`${r.role.padEnd(14)} | ${file} | ${r.error}`); continue; }
    console.log(`${r.role.padEnd(14)} | ${file} | ${r.L.toFixed(3)} | ${(r.a >= 0 ? "+" : "") + r.a.toFixed(3)} | ${(r.b >= 0 ? "+" : "") + r.b.toFixed(3)} | ${r.sat.toFixed(3)} | ${(r.fuera * 100).toFixed(1).padStart(5)}% | ${fmt(r.Hdom === null ? null : r.Hdom.toFixed(0)).toString().padStart(4)} | ${fmt(r.dHue).toString().padStart(3)} | ${fmt(r.dEfondo).toString().padStart(8)} | ${(r.fondo ? (r.Hpared === null ? "neutra" : r.Hpared + "°") : "—").padStart(6)} | ${fmt(r.dL).toString().padStart(8)} | ${(r.V === null || r.V === undefined ? "—" : r.ocup.toFixed(2)).padStart(4)} | ${(r.V === null || r.V === undefined ? "—" : r.pieBordes.toFixed(3) + "/" + r.pieSat.toFixed(2)).padStart(9)} | ${(r.Q === null || r.Q === undefined ? "—" : r.dLq.toFixed(3) + "/" + r.contrasteQ.toFixed(1)).padStart(10)} | ${(r.E === undefined ? "—" : r.dLesc.toFixed(3) + "/" + (r.dHesc === null ? "neutro" : r.dHesc + "°")).padEnd(10)} | ${fmt(r.T).padEnd(2)} ${fmt(r.K).padEnd(2)} ${fmt(r.S).padEnd(2)} ${fmt(r.F).padEnd(2)} ${fmt(r.V).padEnd(2)} ${fmt(r.Q).padEnd(2)} ${fmt(r.E).padEnd(2)} | ${r.pasa ? "PASA" : "NO PASA"}`);
  }
  const bad = rows.filter((r) => !r.pasa).length;
  console.log(`${rows.length - bad}/${rows.length} en gama`);
  return bad;
}

/** VERDAD-01 1.7: una medida NO con excepción de Liam (`fixture.excepciones: [{ archivo, medida, motivo, fecha }]`) cuenta como aprobada:
 * la celda pasa a "exc" y la fila puede PASAR; el total deja de mentir. `archivo` casa por nombre de archivo (basename) o sufijo de la ruta. */
export const MEDIDAS = ["T", "K", "S", "F", "V", "Q", "E"];
export function aplicarExcepciones(rows, excepciones = []) {
  const aplicadas = [];
  for (const ex of excepciones) {
    if (!ex || !MEDIDAS.includes(ex.medida) || !ex.archivo || !ex.motivo || !ex.fecha) continue; // incompleta: no cuenta
    for (const r of rows) {
      if (r.error || !(r.src === ex.archivo || r.src.endsWith("/" + ex.archivo) || r.src.replace(/^.*[\\/]/, "") === ex.archivo.replace(/^.*[\\/]/, ""))) continue;
      if (r[ex.medida] === false) { r[ex.medida] = "exc"; (r.excepciones ??= []).push(ex); aplicadas.push({ role: r.role, ...ex }); }
    }
  }
  recomputarPasa(rows);
  return aplicadas;
}
export function recomputarPasa(rows) {
  for (const r of rows) r.pasa = !r.error && [r.T, r.K, r.S, r.F, r.Q, r.E].every((x) => x !== false); // V no es gate (R19-bis); "exc" no es false
  return rows;
}

export const paletaDe = (nombre) => {
  const fx = { a: "peluqueria-paleta-a", b: "peluqueria-paleta-b", c: "peluqueria-paleta-c" }[nombre] ?? nombre;
  return JSON.parse(fs.readFileSync(path.join(ROOT, "dev-fixtures", `${fx}.json`), "utf8")).branding?.colors ?? {};
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
  if (opt("archivo")) {
    const file = path.resolve(opt("archivo")); const kind = /\.(webm|mp4)$/i.test(file) ? "video" : "image";
    const res = await medir([{ role: "archivo", src: file, kind }], paletaDe(opt("paleta") ?? "a"));
    const bad = imprimir(path.basename(file), res);
    if (args.includes("--fuente")) { const f = res.rows[0].fuente; console.log(f ? `fuente (S4, saturados C > 0,05 con la banda de piel, ${f.n} px): ${f.hex} · OKLCH L ${f.L} C ${f.C} H ${f.H}°` : "fuente: sin píxeles saturados"); }
    process.exit(bad ? 1 : 0);
  }
  const name = args.find((a) => !a.startsWith("--"));
  if (!name) { console.error("uso: node tools/gama.mjs <fixture> [--json] | --archivo <ruta> --paleta a|b"); process.exit(2); }
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, "dev-fixtures", `${name}.json`), "utf8"));
  const res = await medir(archivosDeFixture(fx), fx.branding?.colors ?? {});
  const exc = aplicarExcepciones(res.rows, fx.excepciones ?? []); // VERDAD-01 1.7: excepciones aprobadas por Liam cuentan como aprobadas
  const bad = imprimir(name, res);
  if (exc.length) console.log(`excepciones aplicadas (${exc.length}): ${exc.map((e) => `${e.role} ${e.medida} — ${e.motivo} (${e.fecha})`).join(" · ")}`);
  if (args.includes("--json")) fs.writeFileSync(path.join(ROOT, `gama-${name}.json`), JSON.stringify({ palette: res.colors, rows: res.rows }, null, 1));
  process.exit(bad ? 1 : 0);
}
