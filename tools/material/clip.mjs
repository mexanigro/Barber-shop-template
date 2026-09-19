#!/usr/bin/env node
/**
 * clip.mjs — de un vídeo bruto (Sora, stock) al clip del hero: recorte, bucle sin costura y los tres archivos del fixture.
 *
 * Uso: node tools/material/clip.mjs <in.mp4> <out-base> [--desde 0] [--dur 8] [--bucle xfade|pingpong] [--ancho 1280]
 *   Escribe <out-base>.mp4 (H.264 CRF 21, faststart, mudo), <out-base>.webm (VP9 CRF 33) y <out-base>-poster.avif (primer cuadro),
 *   la receta de PROMPTS-CONTENIDO.md. Imprime tamaños, duración y SSIM primer ↔ último cuadro (costura) y sale con 1 si el mp4
 *   o el webm superan 3 MB (límite del documento). Necesita ffmpeg/ffprobe en el PATH.
 * Bucle: `xfade` = A = [desde+0,5 … desde+dur+0,5], B = [desde … desde+0,5], fundido A→B de 0,5 s al final (el último medio
 *   segundo muere en el primer cuadro; dur total = dur). `pingpong` = ida [desde … desde+dur/2] + vuelta invertida (sin costura por
 *   construcción; vale cuando el movimiento es reversible: pelo, manos).
 */
import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
const args = process.argv.slice(2); const pos = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const [input, outBase] = pos;
if (!input || !outBase) { console.error("uso: node tools/material/clip.mjs <in.mp4> <out-base> [--desde s] [--dur 8] [--bucle xfade|pingpong] [--ancho 1280]"); process.exit(2); }
const desde = +opt("desde", 0), dur = +opt("dur", 8), bucle = opt("bucle", "xfade"), ancho = +opt("ancho", 1280);
export const MAX_BYTES = 3 * 1024 * 1024;
const run = (cmd, a) => { const r = spawnSync(cmd, a, { encoding: "utf8" }); if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); } return r.stdout; };
const fps = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", input]).trim();
const base = `scale=${ancho}:-2,fps=${fps}`;
const filter = bucle === "pingpong"
  ? `[0:v]trim=start=${desde}:duration=${dur / 2},setpts=PTS-STARTPTS,${base},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]`
  : `[0:v]trim=start=${desde}:duration=${dur + 0.5},setpts=PTS-STARTPTS,${base},split[s1][s2];[s1]trim=start=0.5,setpts=PTS-STARTPTS[a];[s2]trim=duration=0.5,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=0.5:offset=${dur - 0.5}[v]`;
fs.mkdirSync(path.dirname(path.resolve(outBase)), { recursive: true });
run("ffmpeg", ["-v", "error", "-y", "-i", input, "-filter_complex", filter, "-map", "[v]", "-c:v", "libx264", "-crf", "21", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", `${outBase}.mp4`]);
run("ffmpeg", ["-v", "error", "-y", "-i", `${outBase}.mp4`, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "33", "-row-mt", "1", "-an", `${outBase}.webm`]);
run("ffmpeg", ["-v", "error", "-y", "-i", `${outBase}.mp4`, "-frames:v", "1", "-c:v", "libaom-av1", "-still-picture", "1", "-crf", "40", `${outBase}-poster.avif`]);
// costura: SSIM entre el primer y el último cuadro del mp4 final
const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(outBase)), ".clip-"));
run("ffmpeg", ["-v", "error", "-y", "-i", `${outBase}.mp4`, "-vf", "select=eq(n\\,0)", "-frames:v", "1", path.join(tmp, "a.png")]);
run("ffmpeg", ["-v", "error", "-y", "-sseof", "-0.05", "-i", `${outBase}.mp4`, "-frames:v", "1", "-update", "1", path.join(tmp, "b.png")]);
const ssim = (spawnSync("ffmpeg", ["-i", path.join(tmp, "a.png"), "-i", path.join(tmp, "b.png"), "-filter_complex", "[0][1]ssim", "-f", "null", "-"], { encoding: "utf8" }).stderr.match(/All:([0-9.]+)/) || [])[1];
fs.rmSync(tmp, { recursive: true, force: true });
const size = (f) => fs.statSync(f).size; const dura = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${outBase}.mp4`]).trim();
const mp4 = size(`${outBase}.mp4`), webm = size(`${outBase}.webm`), avif = size(`${outBase}-poster.avif`);
console.log(`${path.basename(outBase)} · ${bucle} desde ${desde}s dur ${(+dura).toFixed(2)}s · mp4 ${mp4} B · webm ${webm} B · póster ${avif} B · costura SSIM ${ssim ?? "—"}`);
if (mp4 > MAX_BYTES || webm > MAX_BYTES) { console.error(`supera 3 MB (mp4 ${mp4}, webm ${webm}): bajar --ancho o --dur, o subir CRF`); process.exit(1); }
