#!/usr/bin/env node
/**
 * captura-fondo.mjs — evidencia del prototipo de fondo fijo (REPLANTEO-01 fase 2-C) y de los tokens de MATERIAL-04:
 *   hero con el texto centrado-abajo (D14) en 375 y 1280 + contraste aprox. del texto sobre el pie del clip (luma máxima
 *   de la zona del texto con el texto oculto, por ffmpeg signalstats);
 *   tramo hero → services con velo 50 / 65 / 80 % (+ tira ×4 de las 24 filas del borde del hero) y 5 fotogramas de scroll;
 *   radio 6 / 8 / 10 px (hero + services), FAB en acento y en verde; nav «עבודות» → #gallery; coste con CPU ×4.
 * Uso: node tools/material/captura-fondo.mjs <fixture> --out <carpeta> --tag <a|b> [--solo velo|radio|fab|nav|coste|hero]
 * Arranca el dev server (VITE_TENANT_FIXTURE), como captura.mjs; no juzga nada: sólo evidencia.
 */
import { chromium } from "playwright"; import { spawn, spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const fixture = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!fixture) { console.error("uso: node tools/material/captura-fondo.mjs <fixture> --out <carpeta> --tag <a|b> [--solo …]"); process.exit(2); }
const out = path.resolve(opt("out", path.join(ROOT, "capturas-material"))); const tag = opt("tag", "x"); const solo = opt("solo", ""); fs.mkdirSync(out, { recursive: true });
const kill3000 = () => { if (process.platform !== "win32") return; const ns = spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout; for (const l of ns.split("\n")) { const m = l.match(/:3000\s+\S+\s+LISTENING\s+(\d+)/); if (m) spawnSync("taskkill", ["/PID", m[1], "/F"]); } };
kill3000();
const env = { ...process.env, VITE_ACTIVE_NICHE: "peluqueria", VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_FIREBASE_API_KEY: "", VITE_TENANT_FIXTURE: fixture, VITE_HERO_CLIP: "" };
const srv = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "server.ts"], { cwd: ROOT, env, stdio: "ignore", shell: process.platform === "win32" });
const up = async () => { for (let i = 0; i < 60; i++) { try { const r = await fetch("http://localhost:3000/"); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 1000)); } return false; };
if (!(await up())) { console.error("el servidor no respondió en :3000"); kill3000(); process.exit(1); }
const ff = (a) => spawnSync("ffmpeg", ["-v", "error", "-y", ...a], { encoding: "utf8" });
const lumaMax = (png) => { const r = spawnSync("ffmpeg", ["-i", png, "-vf", "signalstats,metadata=print:file=-", "-f", "null", "-"], { encoding: "utf8" }); const m = (r.stdout + r.stderr).match(/signalstats\.YMAX=(\d+)/); return m ? +m[1] : null; };
const contrastWhite = (y) => { const L = Math.pow(y / 255, 2.2); return +((1.05) / (L + 0.05)).toFixed(2); };
const rep = { fixture, tag };
const b = await chromium.launch();
const ctxFor = async (vk) => vk < 768 ? b.newContext({ viewport: { width: vk, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }) : b.newContext({ viewport: { width: vk, height: 800 } });
const open = async (ctx) => { const p = await ctx.newPage(); await p.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await p.waitForTimeout(1500); return p; };
const heroBottom = (p) => p.evaluate(() => Math.round(document.querySelector("#hero").getBoundingClientRect().bottom + scrollY));
const setVar = (p, k, v) => p.evaluate(([k, v]) => document.documentElement.style.setProperty(k, v), [k, v]);
const want = (k) => !solo || solo === k;
try {
  for (const vk of [375, 1280]) {
    const ctx = await ctxFor(vk); const p = await open(ctx); const H = vk < 768 ? 812 : 800;
    // ── hero D14: texto centrado-abajo + contraste sobre el pie del clip ──
    if (want("hero")) {
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
      const shot = `${out}/${tag}-${vk}-hero-d14.png`; await p.screenshot({ path: shot, clip: { x: 0, y: 0, width: vk, height: H } });
      const box = await p.evaluate(() => { const h = document.querySelector("#hero h1"); const r = h.closest("div").getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
      await p.evaluate(() => { const v = document.querySelector("#hero video"); if (v) v.pause(); document.querySelector("#hero h1").closest("div").style.opacity = "0"; }); await p.waitForTimeout(200);
      const bg = `${out}/${tag}-${vk}-hero-d14-fondo-texto.png`; await p.screenshot({ path: bg, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
      await p.evaluate(() => { document.querySelector("#hero h1").closest("div").style.opacity = ""; const v = document.querySelector("#hero video"); if (v) v.play().catch(() => {}); });
      const y = lumaMax(bg); rep[`hero-${vk}`] = { bloque: box, lumaMax: y, contrasteAproxBlancoSobrePixelMasClaro: y === null ? null : contrastWhite(y) };
      console.log(`${tag} ${vk} hero D14: bloque ${JSON.stringify(box)} · luma máx ${y} → contraste blanco ≈ ${rep[`hero-${vk}`].contrasteAproxBlancoSobrePixelMasClaro}`);
    }
    if (vk === 375) {
      const hb = await heroBottom(p); rep.heroBottom = hb;
      // ── velo 50 / 65 / 80 + tira del borde + 5 fotogramas ──
      if (want("velo")) for (const v of [0.5, 0.65, 0.8]) {
        await setVar(p, "--veil-services", String(v)); await p.evaluate((y) => window.scrollTo(0, y), hb - 406); await p.waitForTimeout(500);
        const f = `${out}/${tag}-375-velo${Math.round(v * 100)}-borde.png`; await p.screenshot({ path: f, clip: { x: 0, y: 0, width: 375, height: 812 } });
        const tira = `${out}/${tag}-375-velo${Math.round(v * 100)}-tira.png`; ff(["-i", f, "-vf", "crop=iw:24:0:394,scale=iw*4:ih*4:flags=neighbor", tira]);
        const frames = [];
        for (const [i, dy] of [812, 600, 400, 200, 0].entries()) { await p.evaluate((y) => window.scrollTo(0, y), hb - dy); await p.waitForTimeout(350); const ff1 = `${out}/.${tag}-f${i}.png`; await p.screenshot({ path: ff1, clip: { x: 0, y: 0, width: 375, height: 812 } }); frames.push(ff1); }
        ff([...frames.flatMap((x) => ["-i", x]), "-filter_complex", "hstack=inputs=5", `${out}/${tag}-375-velo${Math.round(v * 100)}-scroll.png`]); frames.forEach((x) => fs.rmSync(x, { force: true }));
        console.log(`${tag} 375 velo ${v}: ${path.basename(f)} + tira + scroll`);
      }
      await setVar(p, "--veil-services", "");
      // ── radio 6 / 8 / 10 ──
      if (want("radio")) for (const r of [6, 8, 10]) {
        await setVar(p, "--radius-ui", `${r}px`); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
        const hero = `${out}/.${tag}-r${r}-hero.png`; await p.screenshot({ path: hero, clip: { x: 0, y: 812 - 330, width: 375, height: 250 } });
        await p.evaluate((y) => window.scrollTo(0, y), hb + 40); await p.waitForTimeout(600);
        const card = `${out}/.${tag}-r${r}-card.png`; await p.screenshot({ path: card, clip: { x: 0, y: 0, width: 375, height: 812 } });
        ff(["-i", hero, "-i", card, "-filter_complex", "[0]scale=iw:-1[a];[1]scale=iw:-1[b];[a][b]vstack", `${out}/${tag}-375-radio${r}.png`]); [hero, card].forEach((x) => fs.rmSync(x, { force: true }));
      }
      if (want("radio")) { ff(["-i", `${out}/${tag}-375-radio6.png`, "-i", `${out}/${tag}-375-radio8.png`, "-i", `${out}/${tag}-375-radio10.png`, "-filter_complex", "hstack=inputs=3", `${out}/${tag}-375-radio-6-8-10.png`]); console.log(`${tag} radio 6/8/10 → ${tag}-375-radio-6-8-10.png`); }
      await setVar(p, "--radius-ui", "");
      // ── FAB acento vs verde ──
      if (want("fab")) {
        const shots = [];
        for (const [name, bg, fg] of [["acento", "var(--accent-strong)", "var(--accent-foreground)"], ["verde", "#25D366", "#fff"]]) {
          await setVar(p, "--whatsapp-fab-bg", bg); await setVar(p, "--whatsapp-fab-fg", fg);
          for (const [where, y] of [["hero", 0], ["services", hb + 40]]) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(500); const f = `${out}/.${tag}-fab-${name}-${where}.png`; await p.screenshot({ path: f, clip: { x: 0, y: 812 - 220, width: 200, height: 220 } }); shots.push(f); }
        }
        ff([...shots.flatMap((x) => ["-i", x]), "-filter_complex", "hstack=inputs=4", `${out}/${tag}-375-fab-acento-verde.png`]); shots.forEach((x) => fs.rmSync(x, { force: true }));
        await setVar(p, "--whatsapp-fab-bg", ""); await setVar(p, "--whatsapp-fab-fg", ""); console.log(`${tag} FAB → ${tag}-375-fab-acento-verde.png (acento hero · acento services · verde hero · verde services)`);
      }
      // ── nav «עבודות» → #gallery ──
      if (want("nav")) {
        await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
        await p.locator("button[aria-controls=menu-v6]").first().click({ force: true }); await p.waitForTimeout(400);
        await p.waitForTimeout(600); const works = p.locator('#menu-v6 a[href="#gallery"], nav a[href="#gallery"]').filter({ visible: true }).first(); const href = await works.getAttribute("href"); await works.click({ force: true }); await p.waitForTimeout(1200);
        const st = await p.evaluate(() => { const g = document.querySelector("#gallery"); const r = g ? g.getBoundingClientRect() : null; return { hash: location.hash, galleryTop: r ? Math.round(r.top) : null, hayAntesDespues: !!document.querySelector("#antes-despues") }; });
        await p.screenshot({ path: `${out}/${tag}-375-nav-gallery.png`, clip: { x: 0, y: 0, width: 375, height: 812 } });
        rep.nav = { href, ...st }; console.log(`${tag} nav: href ${href} → ${JSON.stringify(st)}`);
      }
      // ── coste con CPU ×4 ──
      if (want("coste")) {
        const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await p.evaluate(() => { window.__lt = []; window.__fr = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true }); let last = performance.now(); const tick = (t) => { window.__fr.push(t - last); last = t; if (window.__go) requestAnimationFrame(tick); }; window.__go = true; requestAnimationFrame(tick); window.scrollTo(0, 0); });
        const H2 = await p.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < H2; y += 24) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(8); }
        const c = await p.evaluate(() => { window.__go = false; const fr = window.__fr.slice(2); return { longTasks: window.__lt.length, longTasksMs: window.__lt, frames: fr.length, over33: fr.filter((x) => x > 33).length, maxMs: Math.round(Math.max(...fr)), meanMs: +(fr.reduce((a, x) => a + x, 0) / fr.length).toFixed(2) }; });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); rep.coste = c; console.log(`${tag} coste CPU×4 (scroll completo, 24 px/paso): ${JSON.stringify(c)}`);
      }
    }
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); kill3000(); }
fs.writeFileSync(`${out}/${tag}-fondo-verificacion.json`, JSON.stringify(rep, null, 1));
