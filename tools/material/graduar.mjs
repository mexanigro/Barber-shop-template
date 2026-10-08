#!/usr/bin/env node
/**
 * graduar.mjs — MARCA-01 (M1-4, D-287): el material de una plantilla, y las fotos de la clienta, llevados a la paleta de la clienta.
 *
 * Uso: node tools/material/graduar.mjs --colores <json> [--plantilla a|c] [--local <foto>] [--local-v <foto>] [--fotos <foto…>]
 *                                      [--tope <MiB>] --salida <dir>
 *   --colores   un JSON con `branding.colors` (el config de la clienta, o el paleta.json de `scripts/material.ts pedidos` en H).
 *   --plantilla los 6 vídeos del hero (cada par mp4/webm desde el mp4 de la plantilla, la fuente de mejor calidad) y la textura de la
 *               plantilla (T dev-fixtures/media/paleta-<p>/), graduados con su mismo nombre,
 *               y los dos pósteres, sacados del primer cuadro del clip YA graduado (no se gradúan aparte, M1-3).
 *   --local / --local-v  las fotos del salón de la clienta, graduadas sólo en los neutros (local.jpg y local-v.jpg); og.jpg (la imagen
 *               del link, 1200 × 630) sale del local graduado (o del vertical, si no hay local).
 *   --fotos     cada foto, graduada sólo en los neutros, con su mismo nombre (los trabajos reales de la clienta que no pasan N).
 *   --tope      MiB por vídeo (6 por defecto, el de clip.mjs y media-upload.ts): el CRF sube hasta entrar.
 * Imprime una línea por archivo (los vídeos con su peso y «CRF <n>»).
 *
 * El LUT (`cuboNeutros`): 3D de 33³, en OKLab y A LA MISMA L. Cada color casi gris (C ≤ 0,03, con peso que se apaga hasta C 0,09) y
 * fuera de la banda de piel y pelo (H 30–100°, que protege también el rubio; peso que se apaga de C 0,015 a 0,035) toma el tinte de la
 * rampa neutra de la paleta (scrim → textMuted → surfaceAlt → surface, por L) a su L, más la mitad de su desvío del tinte medio del
 * propio archivo (se resta antes el tinte del archivo: así la variación de la escena se conserva y la dominante se va). Lo saturado y
 * la piel no se tocan. Prototipo: `diseno/secciones-02/instrumentos/lut.mjs`. Límite medido (M1-4): sólo lleva a la gama lo neutro; un
 * archivo con objetos de color fuera de gama no se gradúa: se pide de nuevo.
 *
 * Códecs, los de M1-4 (D-287): mp4 libx264 CRF 18 en yuv420p; webm libvpx-vp9 CRF 30 SIN -pix_fmt: el LUT sale en RGB y el webm queda
 * en VP9 perfil 1 (GBR 4:4:4, medido: 6 127 621 B el 9:16, el número de A). La página pone el mp4 primero (hero-v6.tsx): el webm es
 * el respaldo y lo que mide gama.mjs (el Chromium de Playwright no decodifica h264), sin submuestreo de color.
 * Determinista: misma entrada, mismos bytes (el token de Storage sale del contenido, D-22): ffmpeg con un hilo y `+bitexact`.
 * Necesita ffmpeg/ffprobe en el PATH. Lo que se mira de la salida lo mide `tools/gama.mjs` (N) y, en H, `scripts/material.ts aprobar`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MIB = 1024 * 1024;
export const TOPE_MIB = 6; // MAX_BYTES_V de clip.mjs y MAX_VIDEO_BYTES de H media-upload.ts (6 MiB = 6 291 456 B, D-285 (1))
export const CRF_MP4 = 18, CRF_WEBM = 30, CRF_PASO = 2, CRF_MAX_MP4 = 40, CRF_MAX_WEBM = 56;
const N = 33;

// ─── OKLab (Björn Ottosson), en coma flotante (un LUT necesita más precisión que los enteros de src/lib/oklab.ts) ──────────────
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function rgb2lab(r, g, b) { // 0..1
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function lab2rgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const c = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return c.map((x) => gam(Math.min(1, Math.max(0, x))));
}
const hex2lab = (h) => rgb2lab(...[1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16) / 255));
const tono = (a, b) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
/** Peso de la banda de piel y pelo (H 30–100°): 0 hasta C 0,015, 1 desde C 0,035. */
const piel = (C, H) => (H >= 30 && H <= 100 ? Math.min(1, Math.max(0, (C - 0.015) / 0.02)) : 0);
/** ¿Un píxel cuenta como neutro para el tinte medio del archivo? (la regla de N, M1-2) */
const esNeutro = (L, C, H) => C < 0.04 && !(C > 0.015 && H >= 30 && H <= 100) && L >= 0.08 && L <= 0.99;

/** La rampa neutra de la paleta (scrim, textMuted, surfaceAlt, surface por L) y su tinte (a, b) a una L. */
export function rampaNeutra(colores) {
  for (const k of ["scrim", "textMuted", "surfaceAlt", "surface"]) if (!/^#[0-9a-f]{6}$/i.test(String(colores?.[k] ?? ""))) throw new Error(`la paleta no trae ${k} en hex (#rrggbb)`);
  const r = ["scrim", "textMuted", "surfaceAlt", "surface"].map((k) => hex2lab(colores[k])).sort((x, y) => x[0] - y[0]);
  return (L) => {
    if (L <= r[0][0]) return [r[0][1], r[0][2]];
    for (let i = 1; i < r.length; i++) if (L <= r[i][0]) { const t = (L - r[i - 1][0]) / (r[i][0] - r[i - 1][0] || 1); return [r[i - 1][1] + (r[i][1] - r[i - 1][1]) * t, r[i - 1][2] + (r[i][2] - r[i - 1][2]) * t]; }
    const u = r[r.length - 1]; return [u[1], u[2]];
  };
}

/** El texto .cube del LUT de M1-4 para una paleta y el tinte medio (a, b) de los neutros de un archivo. */
export function cuboNeutros(colores, tinteMedio) {
  const tinte = rampaNeutra(colores), [ma, mb] = tinteMedio;
  const lineas = [`TITLE "neutros-a-la-paleta"`, `LUT_3D_SIZE ${N}`, "DOMAIN_MIN 0 0 0", "DOMAIN_MAX 1 1 1"];
  for (let bi = 0; bi < N; bi++) for (let gi = 0; gi < N; gi++) for (let ri = 0; ri < N; ri++) {
    const [L, a, b] = rgb2lab(ri / (N - 1), gi / (N - 1), bi / (N - 1));
    const C = Math.hypot(a, b), H = tono(a, b);
    const w = (1 - piel(C, H)) * (C <= 0.03 ? 1 : C >= 0.09 ? 0 : 1 - (C - 0.03) / 0.06);
    const [ta, tb] = tinte(L);
    const na = a + w * (ta + (a - ma) * 0.5 - a), nb = b + w * (tb + (b - mb) * 0.5 - b);
    const [r, g, bb] = w > 0 ? lab2rgb(L, na, nb) : [ri / (N - 1), gi / (N - 1), bi / (N - 1)];
    lineas.push(`${r.toFixed(6)} ${g.toFixed(6)} ${bb.toFixed(6)}`);
  }
  return lineas.join("\n") + "\n";
}

// ─── ffmpeg ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const correr = (cmd, a, opts = {}) => {
  const r = spawnSync(cmd, a, { encoding: "buffer", maxBuffer: 1 << 28, windowsHide: true, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${a.slice(0, 6).join(" ")}… → exit ${r.status}\n${String(r.stderr).slice(-1200)}`);
  return r.stdout;
};
const esVideo = (f) => /\.(webm|mp4)$/i.test(f);
/** Ancho y alto de un archivo (ffprobe). */
export function tamano(f) {
  const [w, h] = String(correr("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", f])).trim().split(",").map(Number);
  return { w, h };
}
/** El tinte medio (a, b) de los neutros de un archivo, en un cuadro de 160 px (vídeo en t = 1 s, como N). */
export function tinteMedio(f) {
  const raw = correr("ffmpeg", ["-v", "error", ...(esVideo(f) ? ["-ss", "1"] : []), "-i", f, "-frames:v", "1", "-vf", "scale=160:-2", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  let n = 0, sa = 0, sb = 0;
  for (let i = 0; i < raw.length; i += 3) {
    const [L, a, b] = rgb2lab(raw[i] / 255, raw[i + 1] / 255, raw[i + 2] / 255), C = Math.hypot(a, b);
    if (!esNeutro(L, C, tono(a, b))) continue;
    sa += a; sb += b; n++;
  }
  return n ? [sa / n, sb / n] : [0, 0];
}
const EXACTO = ["-threads", "1", "-filter_threads", "1", "-fflags", "+bitexact", "-flags:v", "+bitexact", "-map_metadata", "-1"];
/** Aplica el LUT de `f` (con su propio tinte medio) y codifica `salida` con `cod` (args del códec). El .cube va en una carpeta de
 *  trabajo y ffmpeg corre ahí (la ruta de Windows con «C:» se parte dentro del filtro). */
function aplicar(f, salida, colores, trabajo, cod, extraVf = "") {
  const cube = path.join(trabajo, "n.cube");
  fs.writeFileSync(cube, cuboNeutros(colores, tinteMedio(f)));
  correr("ffmpeg", ["-v", "error", "-y", "-i", path.resolve(f), ...EXACTO, "-vf", `lut3d=file=n.cube:interp=tetrahedral${extraVf}`, ...cod, path.resolve(salida)], { cwd: trabajo });
}
const JPG = ["-c:v", "mjpeg", "-q:v", "2", "-pix_fmt", "yuvj444p", "-frames:v", "1", "-update", "1"];
const imagen = (salida) => (/\.png$/i.test(salida) ? ["-c:v", "png", "-frames:v", "1", "-update", "1"] : JPG);

/** Un vídeo graduado que entra en el tope: el CRF sube de a CRF_PASO hasta entrar. Devuelve { crf, bytes }. */
function videoGraduado(f, salida, colores, trabajo, topeBytes) {
  const webm = /\.webm$/i.test(salida);
  for (let crf = webm ? CRF_WEBM : CRF_MP4; crf <= (webm ? CRF_MAX_WEBM : CRF_MAX_MP4); crf += CRF_PASO) {
    const cod = webm
      ? ["-an", "-fps_mode", "passthrough", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf), "-deadline", "good", "-cpu-used", "2", "-row-mt", "0"]
      : ["-an", "-fps_mode", "passthrough", "-c:v", "libx264", "-crf", String(crf), "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
    aplicar(f, salida, colores, trabajo, cod);
    const bytes = fs.statSync(salida).size;
    if (bytes <= topeBytes) return { crf, bytes };
  }
  throw new Error(`${path.basename(salida)} no entra en ${(topeBytes / MIB).toFixed(1)} MiB ni con el CRF máximo`);
}
/** El primer cuadro de un clip graduado, como póster AVIF del tamaño del póster de la plantilla. */
function poster(clip, salida, { w, h }) {
  correr("ffmpeg", ["-v", "error", "-y", "-i", path.resolve(clip), ...EXACTO, "-frames:v", "1", "-vf", `scale=${w}:${h}:flags=lanczos`, "-c:v", "libaom-av1", "-still-picture", "1", "-crf", "30", "-cpu-used", "4", "-pix_fmt", "yuv444p", path.resolve(salida)]);
}

const VIDEOS = ["hero.mp4", "hero.webm", "hero-1280.mp4", "hero-1280.webm", "hero-v.mp4", "hero-v.webm"];
const POSTERES = [["hero-poster.avif", "hero.mp4"], ["hero-v-poster.avif", "hero-v.mp4"]];

/** Toda la graduación; devuelve las líneas que imprime la consola. */
export function graduar({ colores, plantilla, local, localV, fotos = [], topeMiB = TOPE_MIB, salida }) {
  fs.mkdirSync(salida, { recursive: true });
  const trabajo = fs.mkdtempSync(path.join(salida, ".graduar-"));
  const out = [];
  try {
    if (plantilla) {
      if (!["a", "c"].includes(plantilla)) throw new Error(`--plantilla ${plantilla}: sólo a o c`);
      const dir = path.join(ROOT, "dev-fixtures", "media", `paleta-${plantilla}`);
      for (const v of VIDEOS) {
        // Los dos códecs de cada par salen del mp4 de la plantilla (la fuente de mejor calidad; mismo tamaño, cuadros y duración que su webm).
        const src = path.join(dir, v.replace(/.webm$/i, ".mp4"));
        if (!fs.existsSync(src)) throw new Error(`falta ${src} (el material de la plantilla ${plantilla} no está en git)`);
        const { crf, bytes } = videoGraduado(src, path.join(salida, v), colores, trabajo, topeMiB * MIB);
        out.push(`${v.padEnd(20)} ${(bytes / MIB).toFixed(2)} MiB · CRF ${crf}`);
      }
      for (const [p, clip] of POSTERES) {
        poster(path.join(salida, clip), path.join(salida, p), tamano(path.join(dir, p)));
        out.push(`${p.padEnd(20)} ${(fs.statSync(path.join(salida, p)).size / 1024).toFixed(1)} KB · primer cuadro de ${clip} graduado`);
      }
      aplicar(path.join(dir, "textura.jpg"), path.join(salida, "textura.jpg"), colores, trabajo, JPG);
      out.push(`${"textura.jpg".padEnd(20)} ${(fs.statSync(path.join(salida, "textura.jpg")).size / 1024).toFixed(1)} KB`);
    }
    for (const [foto, nombre] of [[local, "local.jpg"], [localV, "local-v.jpg"]]) {
      if (!foto) continue;
      aplicar(foto, path.join(salida, nombre), colores, trabajo, JPG);
      out.push(`${nombre.padEnd(20)} ${(fs.statSync(path.join(salida, nombre)).size / 1024).toFixed(1)} KB · sólo los neutros`);
    }
    const base = local ? path.join(salida, "local.jpg") : localV ? path.join(salida, "local-v.jpg") : null;
    if (base) {
      correr("ffmpeg", ["-v", "error", "-y", "-i", base, ...EXACTO, "-vf", "scale=1200:630:force_original_aspect_ratio=increase:flags=lanczos,crop=1200:630", "-c:v", "mjpeg", "-q:v", "3", "-pix_fmt", "yuvj420p", "-frames:v", "1", "-update", "1", path.join(salida, "og.jpg")]);
      out.push(`${"og.jpg".padEnd(20)} ${(fs.statSync(path.join(salida, "og.jpg")).size / 1024).toFixed(1)} KB · 1200 × 630 del ${local ? "local" : "local vertical"} graduado`);
    }
    for (const foto of fotos) {
      const nombre = path.basename(foto);
      if (path.resolve(path.join(salida, nombre)) === path.resolve(foto)) throw new Error(`${foto}: la salida pisaría la entrada; usá otra --salida`);
      aplicar(foto, path.join(salida, nombre), colores, trabajo, imagen(nombre));
      out.push(`${nombre.padEnd(20)} ${(fs.statSync(path.join(salida, nombre)).size / 1024).toFixed(1)} KB · sólo los neutros`);
    }
  } finally { fs.rmSync(trabajo, { recursive: true, force: true }); }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const lista = (n) => { const i = args.indexOf(`--${n}`); if (i < 0) return []; const out = []; for (let j = i + 1; j < args.length && !args[j].startsWith("--"); j++) out.push(args[j]); return out; };
  const salida = opt("salida"), coloresJson = opt("colores");
  if (!salida || !coloresJson || (!opt("plantilla") && !opt("local") && !opt("local-v") && !lista("fotos").length)) {
    console.error("uso: node tools/material/graduar.mjs --colores <json> [--plantilla a|c] [--local <foto>] [--local-v <foto>] [--fotos <foto…>] [--tope <MiB>] --salida <dir>");
    process.exit(2);
  }
  try {
    const j = JSON.parse(fs.readFileSync(coloresJson, "utf8"));
    const colores = j.branding?.colors ?? j.colors ?? j;
    const inicio = Date.now();
    const lineas = graduar({ colores, plantilla: opt("plantilla"), local: opt("local"), localV: opt("local-v"), fotos: lista("fotos"), topeMiB: opt("tope") ? Number(opt("tope")) : TOPE_MIB, salida });
    console.log(`graduar · acento ${colores.accentStrong} · ${lineas.length} archivos → ${salida} · ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
    for (const l of lineas) console.log(`  ${l}`);
  } catch (e) {
    console.error(`graduar: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
