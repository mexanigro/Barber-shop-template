#!/usr/bin/env node
/**
 * clip.mjs — de un vídeo bruto (stock, generador) al clip del hero: recorte, bucle sin costura y los archivos del fixture.
 *
 * Uso: node tools/material/clip.mjs <in.mp4> <out-dir> [--nombre hero] [--desde 0] [--dur 8] [--bucle xfade|pingpong] [--xfade 0.5]
 *                                                  [--vertical --foco izquierda|centro|derecha|<x%>|auto] [--pie <hex> --pie-alto 12%]
 *      node tools/material/clip.mjs --pexels <id>    → resuelve la variante de mayor resolución y su tamaño; NO descarga (permiso de Liam primero)
 *
 * Paisaje (por defecto) escribe en <out-dir>: <nombre>.{mp4,webm} a 1920×1080 + <nombre>-1280.{mp4,webm} a 1280 px + <nombre>-poster.avif
 *   (primer cuadro del 1080). Presupuesto (D2, REPLANTEO-01 2026-09-19: calidad manda) ≤ 6 MB por archivo en 1080: H.264 CRF 16 → 18 y
 *   VP9 CRF 24 → 28, subiendo el CRF sólo hasta entrar; el 1280 ≤ 3 MB con la misma escalera; exit 1 si ni al máximo entra. Imprime peso, bitrate y CRF final.
 * Vertical (`--vertical`) escribe <nombre>-v.{mp4,webm} a 608×1080 (o 1080×1920 con `--alto 1920`) + <nombre>-v-poster.avif, recorte 9:16
 *   centrado en `--foco` (izquierda = 25 %, centro = 50 %, derecha = 75 %, o `x%` del ancho); presupuesto ≤ 3 MB con H.264 CRF 18 fijo (D2) y VP9 26 → 30.
 *   La fuente tiene que ser la de mayor resolución del banco (`--pexels` resuelve la UHD): con menos de 2160 px de alto el script se niega salvo `--permitir-hd`.
 * Bucle: `xfade` = A = [desde+0,5 … desde+dur+0,5], B = [desde … desde+0,5], fundido A→B de 0,5 s al final; `pingpong` = ida
 *   [desde … desde+dur/2] + vuelta invertida. Imprime SSIM primer ↔ último cuadro (costura). Necesita ffmpeg/ffprobe en el PATH.
 */
import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const flag = (n) => args.includes(`--${n}`);
const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["vertical"].includes(args[i - 1].slice(2))));
export const MAX_BYTES = 6 * 1024 * 1024, MAX_BYTES_1280 = 3 * 1024 * 1024, MAX_BYTES_V = 3 * 1024 * 1024; // D2: 1080 ≤ 6 MB, 1280 y 9:16 ≤ 3 MB
export const CRF_H264 = [16, 17, 18], CRF_VP9 = [24, 26, 28], CRF_H264_V = [18], CRF_VP9_V = [26, 28, 30];
export const MIN_SOURCE_H = 2160; // D2: siempre desde UHD

if (opt("pexels")) {
  const id = opt("pexels"); const head = spawnSync("curl", ["-sI", `https://www.pexels.com/download/video/${id}/`], { encoding: "utf8" }).stdout;
  const loc = (head.match(/^location:\s*(\S+)/im) || [])[1];
  if (!loc) { console.error(`Pexels ${id}: sin Location (${head.split("\n")[0]})`); process.exit(1); }
  const h2 = spawnSync("curl", ["-sI", loc], { encoding: "utf8" }).stdout; const len = +(h2.match(/^content-length:\s*(\d+)/im) || [])[1];
  console.log(`Pexels ${id} → ${loc}\n  origen videos.pexels.com · ${len ? (len / 1048576).toFixed(1) + " MB (" + len + " B)" : "tamaño no legible"} · pedir permiso a Liam y bajar con: curl -sL -o pexels-${id}.mp4 "${loc}"`);
  process.exit(0);
}
const [input, outDir] = pos;
if (!input || !outDir) { console.error("uso: node tools/material/clip.mjs <in.mp4> <out-dir> [--nombre hero] [--desde s] [--dur 8] [--bucle xfade|pingpong] [--xfade 0.5] [--vertical --foco izquierda|centro|derecha|x%] | --pexels <id>"); process.exit(2); }
const nombre = opt("nombre", "hero"), desde = +opt("desde", 0), dur = +opt("dur", 8), bucle = opt("bucle", "xfade"), vertical = flag("vertical");
let foco = { izquierda: 25, centro: 50, derecha: 75 }[opt("foco", "centro")] ?? parseFloat(opt("foco", "50")); const alto = +opt("alto", 1080);
// SERVICES-02 fase 0.3 (Liam: «se ve corrida, no está centrado»): `--foco auto` mide el sujeto en el fotograma medio del tramo —
// centroide horizontal de los píxeles de piel (HSV: tono 15–50°, sat ≥ 0,2, valor ≥ 0,3); si hay menos del 1 % de piel, centroide
// de la energía de bordes— y recorta el 9:16 alrededor (15–85 %). Se imprime la medida.
const focoAuto = (input, t) => {
  const raw = path.join(outDir, ".foco.rgb"); spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", input, "-frames:v", "1", "-vf", "scale=192:-2", "-pix_fmt", "rgb24", "-f", "rawvideo", raw]);
  const b = fs.readFileSync(raw); fs.rmSync(raw, { force: true }); const W = 192, H = b.length / 3 / W; let sx = 0, n = 0;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) { const r = b[i * 3] / 255, g = b[i * 3 + 1] / 255, bl = b[i * 3 + 2] / 255; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); const v = mx, s = mx ? (mx - mn) / mx : 0; let h = 0; if (mx !== mn) { h = mx === r ? ((g - bl) / (mx - mn)) % 6 : mx === g ? (bl - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; h = (h * 60 + 360) % 360; } lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * bl; if (h >= 15 && h <= 50 && s >= 0.2 && v >= 0.3) { sx += i % W; n++; } }
  let modo = "piel"; if (n < W * H * 0.01) { modo = "bordes"; sx = 0; n = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const e = Math.abs(lum[y * W + x + 1] - lum[y * W + x - 1]) + Math.abs(lum[(y + 1) * W + x] - lum[(y - 1) * W + x]); sx += x * e; n += e; } }
  const pct = Math.max(15, Math.min(85, Math.round((sx / n / W) * 100))); console.log(`foco auto: ${modo}, sujeto en el ${pct} % del ancho (fotograma t=${t}s)`); return pct;
};
// T-A opcional (TRANSICION-02): `--pie <hex> --pie-alto 12%` hornea en las últimas filas un degradado hacia --surface (overlay alfa
// en sRGB con curva pow 1,5; ponytail: la mezcla exacta en OKLab exigiría un filtro por píxel — se mide el pie rendido con sonda-transicion).
// El degradado se genera UNA vez como PNG (geq por píxel es lento) y se escala a cada variante; overlay con shortest=1 (la fuente `color`
// es infinita y sin él el encode no termina).
const pie = opt("pie", ""), pieAlto = parseFloat(opt("pie-alto", "12")) / 100;
if (pie && !/^#?[0-9a-f]{6}$/i.test(pie)) { console.error("--pie espera un hex de 6 dígitos"); process.exit(2); }
const pieGrad = pie ? path.join(outDir, `.${nombre}-pie.png`) : "";
const pieFC = (vf) => `[0:v]${vf}[s];[1:v][s]scale2ref[g][s1];[s1][g]overlay=shortest=1:format=auto,format=yuv420p[v]`;
fs.mkdirSync(outDir, { recursive: true });
const run = (cmd, a, quiet) => { const r = spawnSync(cmd, a, { encoding: "utf8", maxBuffer: 64 << 20 }); if (r.status !== 0 && !quiet) { console.error(r.stderr || r.stdout); process.exit(1); } return r; };
const probe = (f, e) => run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", e, "-of", "csv=p=0", f]).stdout.trim();
const [w0, h0] = probe(input, "stream=width,height").split(",").map(Number); const fps = probe(input, "stream=r_frame_rate");
if (Math.min(w0, h0) < MIN_SOURCE_H && !flag("permitir-hd")) { console.error(`fuente ${w0}×${h0}: D2 exige la mayor resolución del banco (UHD ≥ ${MIN_SOURCE_H} px de lado menor); resolvela con --pexels <id> o pasá --permitir-hd si el banco no ofrece más`); process.exit(1); }
const xf = parseFloat(opt("xfade", "0.5")); // fase 2b: duración del fundido cola→cabeza (0,5 por defecto; 1 s cose mejor cuadros distintos)
const loop = bucle === "pingpong"
  ? `trim=start=${desde}:duration=${dur / 2},setpts=PTS-STARTPTS,fps=${fps},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1`
  : `trim=start=${desde}:duration=${dur + xf},setpts=PTS-STARTPTS,fps=${fps},split[s1][s2];[s1]trim=start=${xf},setpts=PTS-STARTPTS[a];[s2]trim=duration=${xf},setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=${xf}:offset=${dur - xf}`;
if (pie) run("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=0x${pie.replace("#", "")}:s=64x1024,format=rgba`, "-vf", `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*pow(clip((Y-H*(1-${pieAlto}))/(H*${pieAlto}),0,1),1.5)'`, "-frames:v", "1", pieGrad]);
// master intermedio sin pérdida apreciable (CRF 10) con el bucle ya hecho, del que salen todas las variantes
const master = path.join(outDir, `.${nombre}-master.mp4`);
run("ffmpeg", ["-v", "error", "-y", "-i", input, "-filter_complex", `[0:v]${loop}[v]`, "-map", "[v]", "-c:v", "libx264", "-crf", "10", "-preset", "fast", "-pix_fmt", "yuv420p", "-an", master]);
const size = (f) => fs.statSync(f).size; const dura = +probe(master, "format=duration") || +run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", master]).stdout;
const kbps = (f) => Math.round((size(f) * 8) / dura / 1000);
/** Codifica bajando calidad (subiendo CRF) sólo hasta entrar en el presupuesto; devuelve { crf } o null. */
const encode = (out, vf, codec, crfs, max) => {
  for (const crf of crfs) {
    const a = codec === "h264" ? ["-c:v", "libx264", "-crf", String(crf), "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart"] : ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf), "-row-mt", "1", "-deadline", "good", "-cpu-used", "1"];
    run("ffmpeg", ["-v", "error", "-y", "-i", master, ...(pie ? ["-loop", "1", "-i", pieGrad, "-filter_complex", pieFC(vf), "-map", "[v]"] : ["-vf", vf]), ...a, "-an", out]);
    const s = size(out); console.log(`  ${path.basename(out).padEnd(22)} ${(s / 1048576).toFixed(2)} MB · ${kbps(out)} kbps · CRF ${crf}${s <= max ? "" : " · supera el presupuesto"}`);
    if (s <= max) return { crf };
  }
  return null;
};
if (vertical && opt("foco") === "auto") foco = focoAuto(input, desde + dur / 2);
const vfs = vertical
  ? { [`${nombre}-v`]: (h0 > w0 ? `crop=iw:'min(ih,iw*16/9)':0:'(ih-min(ih,iw*16/9))/2'` : `crop=ih*9/16:ih:${(foco / 100).toFixed(3)}*(iw-ih*9/16):0`) + `,scale=${Math.round((alto * 9) / 16 / 2) * 2}:${alto}` } // fuente vertical (cottonbro 2160×4096): sin recorte lateral
  : { [nombre]: "scale=1920:-2", [`${nombre}-1280`]: "scale=1280:-2" };
let fail = false;
console.log(`${nombre}${vertical ? " (9:16, foco " + foco + " %, alto " + alto + ")" : ""}${pie ? " · pie horneado " + pie + " en el " + Math.round(pieAlto * 100) + " % inferior (T-A)" : ""} · fuente ${w0}×${h0} @ ${fps} · ${bucle} desde ${desde}s dur ${dura.toFixed(2)}s · presupuesto ${vertical ? "≤ 3 MB (CRF 18)" : "1080 ≤ 6 MB (CRF 16–18) · 1280 ≤ 3 MB"}`);
for (const [base, vf] of Object.entries(vfs)) {
  const max = vertical ? MAX_BYTES_V : base.endsWith("-1280") ? MAX_BYTES_1280 : MAX_BYTES;
  const mp4 = encode(path.join(outDir, `${base}.mp4`), vf, "h264", vertical ? CRF_H264_V : CRF_H264, max); const webm = encode(path.join(outDir, `${base}.webm`), vf, "vp9", vertical ? CRF_VP9_V : CRF_VP9, max);
  if (!mp4 || !webm) fail = true;
}
const first = Object.keys(vfs)[0]; const posterOut = path.join(outDir, `${first}-poster.avif`);
run("ffmpeg", ["-v", "error", "-y", "-i", path.join(outDir, `${first}.mp4`), "-frames:v", "1", "-c:v", "libaom-av1", "-still-picture", "1", "-crf", "40", posterOut]);
console.log(`  ${path.basename(posterOut).padEnd(22)} ${(size(posterOut) / 1024).toFixed(1)} KB`);
const tmp = fs.mkdtempSync(path.join(outDir, ".clip-")); const m1 = path.join(outDir, `${first}.mp4`);
run("ffmpeg", ["-v", "error", "-y", "-i", m1, "-vf", "select=eq(n\\,0)", "-frames:v", "1", path.join(tmp, "a.png")]);
run("ffmpeg", ["-v", "error", "-y", "-sseof", "-0.05", "-i", m1, "-frames:v", "1", "-update", "1", path.join(tmp, "b.png")]);
const ssim = (run("ffmpeg", ["-i", path.join(tmp, "a.png"), "-i", path.join(tmp, "b.png"), "-filter_complex", "[0][1]ssim", "-f", "null", "-"], true).stderr.match(/All:([0-9.]+)/) || [])[1];
fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(master, { force: true });
console.log(`  costura SSIM ${ssim ?? "—"}`);
if (fail) { console.error(`no entra en el presupuesto ni al CRF máximo: acortar --dur o pedir otra fuente`); process.exit(1); }
