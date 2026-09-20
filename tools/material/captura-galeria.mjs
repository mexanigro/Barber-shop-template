// captura-galeria.mjs — GALERIA-03 C4: evidencia de la galería de la home sobre :3000 — entrada, reposo, tocada, lightbox (Escape → foco), botón; costuras arriba/abajo (tiras). Uso: node tools/material/captura-galeria.mjs <tag> <carpeta> [375|1280]
import { chromium } from "playwright";
const [tag, out, vk = "375"] = process.argv.slice(2); const W = +vk; const H = W < 768 ? 812 : 800;
const b = await chromium.launch(); const ctx = W < 768 ? await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }) : await b.newContext({ viewport: { width: W, height: H } });
const p = await ctx.newPage(); await p.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await p.waitForTimeout(3500);
const g = await p.evaluate(() => { const s = document.querySelector("#gallery"); if (!s) return null; const r = s.getBoundingClientRect(); const cells = [...s.querySelectorAll(".gal-cell")].map((c) => { const q = c.getBoundingClientRect(); return { w: Math.round(q.width), h: Math.round(q.height), ar: (q.width / q.height).toFixed(2) }; }); return { top: Math.round(r.top + scrollY), h: Math.round(r.height), variant: s.dataset.gallery, cells, wall: getComputedStyle(s.querySelector(".gal-wall")).backgroundImage.slice(0, 60), mask: getComputedStyle(s.querySelector(".gal-wall")).maskImage.slice(0, 40), botones: s.querySelectorAll("a, button.gal-more").length, links: [...s.querySelectorAll("a")].map((a) => a.getAttribute("href")) }; });
console.log(tag, vk, JSON.stringify(g));
if (!g) { await b.close(); process.exit(1); }
const shot = (n) => p.screenshot({ path: `${out}/${tag}-${vk}-${n}.png` });
await p.evaluate((y) => window.scrollTo(0, y), g.top - H * 0.7); await p.waitForTimeout(500); await shot("entrada");
const dy1 = await p.evaluate(() => getComputedStyle(document.querySelector("#gallery")).getPropertyValue("--gal-dy"));
await p.evaluate((y) => window.scrollTo(0, y), g.top - 40); await p.waitForTimeout(700); await shot("reposo");
const dy2 = await p.evaluate(() => getComputedStyle(document.querySelector("#gallery")).getPropertyValue("--gal-dy")); console.log(tag, vk, "gal-dy entrada", dy1, "reposo", dy2);
const piece = p.locator("#gallery .gal-piece").first(); const box = await piece.boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(250); await shot("tocada");
const tf = await piece.evaluate((el) => getComputedStyle(el).transform); console.log(tag, vk, "tocada transform", tf); await p.mouse.up(); await p.waitForTimeout(900);
const lb = await p.evaluate(() => { const d = document.querySelector("dialog.gal-lightbox"); return d ? { open: d.open, img: d.querySelector("img")?.naturalWidth + "x" + d.querySelector("img")?.naturalHeight, focus: document.activeElement?.tagName + "." + document.activeElement?.className.toString().slice(0, 20) } : null; }); console.log(tag, vk, "lightbox", JSON.stringify(lb)); await shot("lightbox");
await p.keyboard.press("Escape"); await p.waitForTimeout(400); const back = await p.evaluate(() => ({ open: !!document.querySelector("dialog.gal-lightbox"), focus: document.activeElement?.className.toString().slice(0, 12), label: document.activeElement?.getAttribute("aria-label") })); console.log(tag, vk, "tras Escape", JSON.stringify(back));
await p.evaluate((y) => window.scrollTo(0, y), g.top + g.h - H + 40); await p.waitForTimeout(600); await shot("boton");
// costuras: tira ×4 de 48 px arriba y abajo de la sección
for (const [n, y] of [["costura-arriba", g.top], ["costura-abajo", g.top + g.h]]) { await p.evaluate((yy) => window.scrollTo(0, yy - 300), y); await p.waitForTimeout(500); const r = await p.evaluate((yy) => yy - scrollY, y); await p.screenshot({ path: `${out}/${tag}-${vk}-${n}.png`, clip: { x: 0, y: Math.max(0, r - 60), width: W, height: 120 } }); }
await b.close();
