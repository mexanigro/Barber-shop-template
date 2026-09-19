#!/usr/bin/env node
/**
 * transicion.mjs — R19 (REPLANTEO-01 D10): el hero y el fondo son una transición. Mide el PIE del clip del hero
 * (franja inferior ≈ 10 % del cuadro, en t = 1 s y a mitad del bucle) y el tono medio de la foto del local, en OKLCH,
 * y escribe la relación por web (SISTEMA-COLOR § 3):
 *   same-hue                 ΔH ≤ 10° y ΔL ≤ 0,10
 *   same-hue-different-light ΔH ≤ 10° y ΔL > 0,10
 *   adjacent-hue             ΔH ≤ 35°
 *   —                        fuera de los tres casos: el clip y la foto no valen juntos (exit 1)
 * Con C < 0,01 en alguno de los dos, el tono no se juzga (neutro) y la relación es por luz.
 *
 * Uso: node tools/material/transicion.mjs <fixture> [--franja 0.10] [--json] [--escribir]
 *   --escribir (R20/R19-bis): guarda `branding.heroToBackdrop` = { relation, mechanism, dH, dL, foot: { hex, L, C, H } } en el
 *   fixture; `foot` es el pie del clip que el Prompt 6 y costura.mjs consumen para la banda superior de la foto del local.
 * Necesita ffmpeg. Lee hero.video.webm (si no, mp4) y branding.localPhoto del fixture; escribe la relación y
 * `mechanism` propuesto (veil-from-first-pixel por defecto: services es velo desde el primer píxel).
 */
import { spawnSync } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { medir, paletaDe, ROOT } from "../gama.mjs";
import { labToLch, lchToHex } from "../../src/lib/oklab.ts";

const args = process.argv.slice(2); const fx = args.find((a) => !a.startsWith("--"));
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
if (!fx) { console.error("uso: node tools/material/transicion.mjs <fixture> [--franja 0.10] [--json]"); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "dev-fixtures", `${fx}.json`), "utf8"));
const local = (src) => path.join(ROOT, src);
const clip = cfg.hero?.video?.webm || cfg.hero?.video?.mp4; const foto = cfg.branding?.localPhoto;
const clipV = cfg.hero?.video?.portrait?.webm || cfg.hero?.video?.portrait?.mp4; // 9:16: su pie va a footPortrait (la foto vertical se mide contra él)
if (!clip || !foto) { console.error(`${fx}: hace falta hero.video y branding.localPhoto`); process.exit(2); }
const franja = +opt("franja", 0.1);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "transicion-"));
const dur = +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", local(clip)], { encoding: "utf8" }).stdout || 8;
const pieDe = (c, tag) => [1, dur / 2].map((t, i) => {
  const out = path.join(tmp, `pie-${tag}-${i}.png`);
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", local(c), "-frames:v", "1", "-vf", `crop=iw:ih*${franja}:0:ih*${1 - franja}`, "-update", "1", out]);
  if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
  return { role: `pie ${tag} t=${t.toFixed(1)}s`, src: out, kind: "image" };
});
const frames = pieDe(clip, "169"); const framesV = clipV ? pieDe(clipV, "916") : [];
const { rows: rowsAll } = await medir([...frames, { role: "foto del local", src: local(foto), kind: "image" }, ...framesV], paletaDe(fx));
const rows = rowsAll.slice(0, 3);
fs.rmSync(tmp, { recursive: true, force: true });
const lch = (r) => { const { L, C, H } = labToLch([r.L, r.a, r.b]); return { L: +L.toFixed(3), C: +C.toFixed(3), H: +H.toFixed(0) }; };
const pie = rows.slice(0, 2).map(lch); const fot = lch(rows[2]);
const pieM = { L: +((pie[0].L + pie[1].L) / 2).toFixed(3), C: +((pie[0].C + pie[1].C) / 2).toFixed(3), H: pie[0].H };
const dHraw = Math.abs(((pieM.H - fot.H + 540) % 360) - 180); const neutro = pieM.C < 0.01 || fot.C < 0.01;
const dH = neutro ? 0 : +dHraw.toFixed(0); const dL = +Math.abs(pieM.L - fot.L).toFixed(3);
const relation = dH <= 10 ? (dL <= 0.1 ? "same-hue" : "same-hue-different-light") : dH <= 35 ? "adjacent-hue" : null;
const mechanism = relation === "same-hue-different-light" ? "scrim-dies-into-photo" : "veil-from-first-pixel";
const foot = { hex: lchToHex({ L: pieM.L, C: pieM.C, H: pieM.H }), ...pieM };
let footPortrait = null;
if (framesV.length) { const pv = rowsAll.slice(3, 5).map(lch); const m = { L: +((pv[0].L + pv[1].L) / 2).toFixed(3), C: +((pv[0].C + pv[1].C) / 2).toFixed(3), H: pv[0].H }; footPortrait = { hex: lchToHex(m), ...m }; }
const out = { fixture: fx, franja, pie: { frames: pie, mean: pieM }, foot, local: fot, dH, dL, neutro, relation, mechanism };
if (args.includes("--escribir")) {
  const file = path.join(ROOT, "dev-fixtures", `${fx}.json`); const j = JSON.parse(fs.readFileSync(file, "utf8"));
  j.branding = { ...(j.branding ?? {}), heroToBackdrop: { relation: relation ?? "adjacent-hue", mechanism, dH, dL, foot, ...(footPortrait ? { footPortrait } : {}) } };
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + String.fromCharCode(10)); console.log(`  escrito branding.heroToBackdrop en ${fx}.json (foot ${foot.hex})`);
}
console.log(`R19 · ${fx} · pie del clip (franja inferior ${Math.round(franja * 100)} %): L ${pieM.L} C ${pieM.C} H ${pieM.H}° (t=1s ${pie[0].L}/${pie[0].H}°, mitad ${pie[1].L}/${pie[1].H}°) · foto del local: L ${fot.L} C ${fot.C} H ${fot.H}°`);
console.log(`  ΔH ${dH}°${neutro ? " (neutro: tono no juzgado)" : ""} · ΔL ${dL} → relación: ${relation ?? "NINGUNA (fuera de los tres casos)"} · mecanismo propuesto: ${mechanism}${footPortrait ? ` · pie 9:16 ${footPortrait.hex} (L ${footPortrait.L} H ${footPortrait.H}°)` : ""}`);
if (args.includes("--json")) console.log(JSON.stringify(out));
process.exit(relation ? 0 : 1);
