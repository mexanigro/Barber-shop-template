// costura-galeria.mjs — GALERIA-03 B2/C4: ΔE OKLab fila a fila en las costuras de #gallery (arriba y abajo, 375 dpr 2) y coste CPU ×4 del recorrido. Uso: npx tsx tools/material/costura-galeria.mjs <tag> (servidor en :3000)
import { chromium } from "playwright"; import fs from "node:fs"; import { spawnSync } from "node:child_process"; const { rgbToOklab, deltaE } = await import("../../src/lib/oklab.ts");
const [tag] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const p = await ctx.newPage();
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await p.waitForTimeout(3500);
const g = await p.evaluate(() => { const r = document.querySelector("#gallery").getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) }; });
for (const [n, y] of [["arriba", g.top], ["abajo", g.bottom]]) {
  await p.evaluate((yy) => window.scrollTo(0, yy - 406), y); await p.waitForTimeout(700);
  const png = `${process.env.TEMP}/gal-costura.png`; await p.screenshot({ path: png, clip: { x: 0, y: 406 - 40, width: 375, height: 80 } });
  const raw = png + ".rgb"; spawnSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "crop=iw*0.8:ih:iw*0.1:0,scale=1:ih:flags=area", "-pix_fmt", "rgb24", "-f", "rawvideo", raw]);
  const buf = fs.readFileSync(raw); const rows = []; for (let i = 0; i < buf.length / 3; i++) rows.push(rgbToOklab([buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]]));
  const mid = rows.length / 2; const borde = deltaE(rows[mid - 1], rows[mid]); let max = 0, at = 0; for (let r = 1; r < rows.length; r++) { const d = deltaE(rows[r - 1], rows[r]); if (d > max) { max = d; at = r; } }
  console.log(`${tag} costura ${n} (y=${y}): ΔE borde ${borde.toFixed(4)} · máx ${max.toFixed(4)} en fila ${at - mid} · extremos ${deltaE(rows[0], rows[rows.length - 1]).toFixed(3)}`);
}
const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const c = await p.evaluate(async ({ top, bottom }) => { const long = []; let frames = 0, slow = 0; const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push(Math.round(e.duration)); }); po.observe({ type: "longtask" }); let last = performance.now(); for (let y = top - 900; y < bottom + 100; y += 12) { window.scrollTo(0, y); await new Promise((r) => requestAnimationFrame((t) => { frames++; if (t - last > 33) slow++; last = t; r(); })); } po.disconnect(); return { px: bottom - top + 1000, longTasks: long.length, longMs: long.reduce((a, b) => a + b, 0), frames, over33: slow }; }, g);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); console.log(`${tag} coste CPU×4 recorrido ${c.px} px: ${JSON.stringify(c)}`); await b.close();
