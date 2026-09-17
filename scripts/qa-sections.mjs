/** Captura por sección (móvil 375) de la landing local. Uso: node scripts/qa-sections.mjs --outdir <dir> [--base url] [--width 375] [--prefix he] */
import { chromium } from "playwright"; import { mkdirSync } from "node:fs";
const args = process.argv.slice(2); const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const width = Number(arg("width", "375")); const base = arg("base", "http://localhost:3000/"); const outdir = arg("outdir", "qa-sections"); const prefix = arg("prefix", "he");
mkdirSync(outdir, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width, height: 812 }, reducedMotion: "reduce" }); const p = await ctx.newPage();
await p.goto(base, { waitUntil: "domcontentloaded" }); await p.waitForSelector("#hero", { timeout: 60000 }); await p.waitForTimeout(6000);
await p.evaluate(async () => { for (let y = 0; y <= document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); } window.scrollTo(0, 0); });
await p.waitForTimeout(1500);
const secs = await p.evaluate(() => [...document.querySelectorAll("section[id]")].map(s => s.id));
for (const id of secs) { try { await p.locator(`section#${id}`).first().screenshot({ path: `${outdir}/${prefix}-${id}.png`, animations: "disabled" }); console.log("ok", id); } catch (e) { console.log("fail", id, String(e).slice(0, 80)); } }
await p.screenshot({ path: `${outdir}/${prefix}-hero-viewport.png` });
await b.close();
