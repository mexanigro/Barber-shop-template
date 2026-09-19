#!/usr/bin/env node
/**
 * hoja.mjs — la hoja para Liam: una sección por subcarpeta medida, fotogramas + tablas de gama + muestras de la paleta.
 *
 * Uso: node tools/material/hoja.mjs <carpeta> --paleta <a|b|fixture> [--titulo "…"] [--out hoja.png]
 *   <carpeta> contiene subcarpetas (una por tanda o vía) ya medidas con tanda.mjs (cada una con su gama.json). Se ordenan por
 *   nombre: usar prefijos `10-`, `20-`… para fijar el orden. Si la subcarpeta tiene `nota.txt`, se imprime bajo la sección; si
 *   está vacía de archivos medibles pero tiene nota.txt, se muestra como «0 candidatas» con la nota (vías que no se pudieron).
 *   Clips (rol clip): tres fotogramas (inicio · mitad · fin) del .mp4 hermano por ffmpeg + fila de gama. Fotos: miniatura + tabla.
 *   Lo que no pasa va marcado, no escondido. Salida: <carpeta>/hoja.png (o --out), 1600 px de ancho, por Playwright.
 */
import { chromium } from "playwright"; import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process";
import { paletaDe, HUE_TOL, NEUTRAL_SAT, OUT_MAX, F_MAX } from "../gama.mjs";
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const dir = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!dir || !opt("paleta")) { console.error('uso: node tools/material/hoja.mjs <carpeta> --paleta <a|b|fixture> [--titulo "…"] [--out hoja.png]'); process.exit(2); }
const colors = paletaDe(opt("paleta")); const out = path.resolve(opt("out", path.join(dir, "hoja.png")));
const b64 = (f) => `data:image/${/\.png$/i.test(f) ? "png" : "jpeg"};base64,` + fs.readFileSync(f).toString("base64");
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const f3 = (x) => (x == null ? "—" : (+x).toFixed(3)); const pct = (x) => (x == null ? "—" : (100 * x).toFixed(1) + " %");
const tk = (v) => (v == null ? "—" : `<span class="${v ? "ok" : "no"}">${v ? "sí" : "NO"}</span>`);
const veredicto = (r) => (r.error ? `<b class="no">ERROR ${esc(r.error)}</b>` : r.pasa ? '<b class="ok">PASA</b>' : '<b class="no">NO PASA</b>');
const tmp = fs.mkdtempSync(path.join(path.resolve(dir), ".hoja-"));
const frames = (mp4, key) => [0, 0.5, 0.99].map((k, i) => { const d = +(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], { encoding: "utf8" }).stdout || 8); const f = path.join(tmp, `${key}-${i}.jpg`); spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, d * k - (k === 0.99 ? 0.05 : 0))), "-i", mp4, "-frames:v", "1", "-vf", "scale=320:-2", "-update", "1", f]); return fs.existsSync(f) ? `<img src="${b64(f)}">` : ""; }).join("");
const thumb = (f, key) => { if (/\.avif$/i.test(f)) { const j = path.join(tmp, `${key}.jpg`); spawnSync("ffmpeg", ["-v", "error", "-y", "-i", f, "-vf", "scale=320:-2", "-update", "1", j]); return fs.existsSync(j) ? b64(j) : ""; } return b64(f); };
const secciones = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name).sort();
let html = "";
for (const [si, name] of secciones.entries()) {
  const sd = path.join(dir, name); const nota = fs.existsSync(path.join(sd, "nota.txt")) ? fs.readFileSync(path.join(sd, "nota.txt"), "utf8").trim() : "";
  const titulo = esc(name.replace(/^\d+-/, "").replace(/-/g, " "));
  if (!fs.existsSync(path.join(sd, "gama.json"))) { html += `<h2>${titulo}</h2><div class="vacio">0 candidatas${nota ? " · " + esc(nota) : ""}</div>`; continue; }
  const g = JSON.parse(fs.readFileSync(path.join(sd, "gama.json"), "utf8"));
  html += `<h2>${titulo} · rol ${esc(g.rol)} · ${g.rows.filter((r) => r.pasa).length}/${g.rows.length} en gama</h2>`;
  if (nota) html += `<p class="nota">${esc(nota)}</p>`;
  if (g.rol === "clip") {
    for (const [i, r] of g.rows.entries()) {
      const mp4 = path.join(sd, r.src.replace(/\.webm$/i, ".mp4")); const meta = fs.existsSync(path.join(sd, r.src + ".txt")) ? fs.readFileSync(path.join(sd, r.src + ".txt"), "utf8").trim() : "";
      html += `<div class="clip"><div class="frames">${fs.existsSync(mp4) ? frames(mp4, `${si}-${i}`) : `<img src="${thumb(path.join(sd, r.src), `${si}-${i}`)}">`}</div><div class="meta"><b>${esc(r.src)}</b>${meta ? " · " + esc(meta) : ""}</div>
<table><tr><th>L</th><th>a</th><th>b</th><th>sat</th><th>fuera %</th><th>Hdom</th><th>ΔH</th><th>T</th><th>K</th><th>pasa</th></tr><tr><td>${f3(r.L)}</td><td>${f3(r.a)}</td><td>${f3(r.b)}</td><td>${f3(r.sat)}</td><td>${pct(r.fuera)}</td><td>${r.Hdom ?? "—"}°</td><td>${r.dHue ?? "—"}°</td><td>${tk(r.T)}</td><td>${tk(r.K)}</td><td>${veredicto(r)}</td></tr></table></div>`;
    }
  } else {
    html += `<div class="fotos" style="grid-template-columns:repeat(${Math.min(7, Math.max(3, g.rows.length))},1fr)">${g.rows.map((r, i) => `<figure><img src="${thumb(path.join(sd, r.src), `${si}-${i}`)}"><figcaption>${esc(r.src)}${r.pasa ? "" : ' · <b class="no">NO PASA</b>'}</figcaption></figure>`).join("")}</div>
<table><tr><th>archivo</th><th>L</th><th>a</th><th>b</th><th>sat</th><th>fuera %</th><th>ΔE pared</th><th>ΔL serie</th><th>T</th><th>K</th><th>S</th><th>F</th><th>pasa</th></tr>
${g.rows.map((r) => `<tr><td>${esc(r.src)}</td><td>${f3(r.L)}</td><td>${f3(r.a)}</td><td>${f3(r.b)}</td><td>${f3(r.sat)}</td><td>${pct(r.fuera)}</td><td class="${r.F === false ? "no" : ""}">${f3(r.dEfondo)}</td><td>${f3(r.dL)}</td><td>${tk(r.T)}</td><td>${tk(r.K)}</td><td>${tk(r.S)}</td><td>${tk(r.F)}</td><td>${veredicto(r)}</td></tr>`).join("")}</table>`;
  }
}
const sw = ["surface", "surfaceAlt", "accentStrong", "brandAccent", "text", "scrim"].filter((k) => colors[k]).map((k) => `<div><i style="background:${colors[k]}"></i>${k} ${colors[k]}</div>`).join("");
const page = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#fff;color:#141813;font:13px/1.35 system-ui,Segoe UI,sans-serif;width:1600px;padding:28px 32px;box-sizing:border-box}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:26px 0 8px;padding:6px 10px;background:#ebeee6;border-radius:6px}.sub{color:#555;margin:0 0 8px}
.clip{display:grid;grid-template-columns:1000px 1fr;gap:14px;align-items:start;margin:8px 0 14px;padding-bottom:12px;border-bottom:1px solid #e3e6df}.frames{display:flex;gap:6px}.frames img{width:328px;display:block;border-radius:4px}.meta{grid-column:2;font-size:12px;color:#333}
table{border-collapse:collapse;font-size:12px;margin-top:6px}th,td{border:1px solid #d9ddd4;padding:3px 7px;text-align:right}th{background:#f5f8f4}td:first-child,th:first-child{text-align:left}
.ok{color:#4f6b49}.no{color:#a3341f;font-weight:600}.fotos{display:grid;gap:8px}figure{margin:0}figure img{width:100%;display:block;border-radius:4px}figcaption{font-size:11px;color:#444;margin-top:3px}
.nota{font-size:12px;color:#333;margin:6px 0 4px;white-space:pre-wrap}.vacio{padding:14px;border:1px dashed #b9bfb3;border-radius:6px;color:#555;background:#fafbf8;white-space:pre-wrap}
.sw{display:flex;gap:14px;align-items:center;margin-top:22px;flex-wrap:wrap}.sw div{display:flex;align-items:center;gap:8px}.sw i{display:inline-block;width:38px;height:38px;border-radius:6px;border:1px solid #ccd}</style>
<h1>${esc(opt("titulo", `Material · paleta ${opt("paleta")}`))} · ${new Date().toISOString().slice(0, 10)}</h1>
<p class="sub">tools/gama.mjs · T: ΔH ≤ ${HUE_TOL}° o (sat &lt; ${NEUTRAL_SAT * 100} % y fuera ≤ ${OUT_MAX * 100} %) · K: signo de b = acento · S: |ΔL| ≤ 0,15 en la serie · F: ΔE(pared = esquinas superiores, surface|surface-alt) ≤ ${F_MAX}. Lo que no pasa va marcado. La sesión mide; Liam juzga.</p>
${html}<div class="sw"><b>Paleta ${esc(opt("paleta"))}:</b>${sw}</div>`;
const tmpHtml = path.join(tmp, "hoja.html"); fs.writeFileSync(tmpHtml, page);
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto("file:///" + tmpHtml.replace(/\\/g, "/")); await p.waitForTimeout(400); await p.screenshot({ path: out, fullPage: true }); await br.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`hoja → ${out} (${fs.statSync(out).size} B, ${secciones.length} secciones)`);
