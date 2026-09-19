#!/usr/bin/env node
/**
 * captura-fondo.mjs — evidencia del prototipo de fondo fijo (REPLANTEO-01 fase 2-C) y de los tokens de MATERIAL-04:
 *   hero con el texto centrado-abajo (D14) en 375 y 1280 + contraste aprox. del texto sobre el pie del clip (luma máxima
 *   de la zona del texto con el texto oculto, por ffmpeg signalstats);
 *   tramo hero → services con velo 50 / 65 / 80 % (+ tira ×4 de las 24 filas del borde del hero) y 5 fotogramas de scroll;
 *   radio 6 / 8 / 10 px (hero + services), FAB en acento y en verde; nav «עבודות» → #gallery; coste con CPU ×4.
 * Uso: node tools/material/captura-fondo.mjs <fixture> --out <carpeta> --tag <a|b|c> [--solo velo|radio|fab|nav|coste|hero|margen|pausa|costura|r7|mascara]
 *   REPLANTEO-02: margen (D14-bis: 3 y 5 rem en 375 y 1280), pausa (D18: video.paused fuera del hero + long tasks con/sin pausa),
 *   costura (R20: ΔE fila a fila en la costura hero → foto, tira ×4).
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
const lumaMin = (png) => { const r = spawnSync("ffmpeg", ["-i", png, "-vf", "signalstats,metadata=print:file=-", "-f", "null", "-"], { encoding: "utf8" }); const m = (r.stdout + r.stderr).match(/signalstats\.YMIN=(\d+)/); return m ? +m[1] : null; };
/** contraste de un texto de luma yText sobre el píxel de luma yBg (WCAG, aprox. por luma) */
const contrastLuma = (yText, yBg) => { const a = Math.pow(yText / 255, 2.2), b = Math.pow(yBg / 255, 2.2); const [hi, lo] = a > b ? [a, b] : [b, a]; return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
const rep = { fixture, tag };
const b = await chromium.launch();
const ctxFor = async (vk) => vk < 768 ? b.newContext({ viewport: { width: vk, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }) : b.newContext({ viewport: { width: vk, height: 800 } });
const open = async (ctx, q = "") => { const p = await ctx.newPage(); await p.goto("http://localhost:3000/" + q, { waitUntil: "networkidle" }); await p.waitForTimeout(1500); return p; };
// ── TRANSICION-02 (T-B): máscara 20 vs 25 % en 375 — hero, costura a 0,5 vh, tira ×4, ΔE fila a fila, contraste del texto en el peor píxel ──
const mascaraRun = async (b, h) => {
  const ctx = await ctxFor(375); const p = await open(ctx); await setVar(p, "--hero-mask-h", `${h}%`); const hb = await heroBottom(p);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
  const box = await p.evaluate(() => { const h = document.querySelector("#hero h1"); const r = h.closest("div").getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
  await p.screenshot({ path: `${out}/${tag}-375-mask${h}-hero.png`, clip: { x: 0, y: 0, width: 375, height: 812 } });
  await p.evaluate(() => { const v = document.querySelector("#hero video"); if (v) v.pause(); document.querySelector("#hero h1").closest("div").style.opacity = "0"; for (const el of document.querySelectorAll("[data-whatsapp-fab], .a11y-trigger, #hero button, nav")) el.style.visibility = "hidden"; });
  const bg = `${out}/.${tag}-mask${h}-bg.png`; await p.screenshot({ path: bg, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
  const textLuma = await p.evaluate(() => { const c = getComputedStyle(document.querySelector("#hero h1")).color.match(/\d+/g).map(Number); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; });
  const worst = textLuma < 128 ? lumaMin(bg) : lumaMax(bg); /* texto oscuro: el peor píxel es el más oscuro */ const contraste = worst === null ? null : contrastLuma(textLuma, worst); fs.rmSync(bg, { force: true });
  await p.evaluate(() => { document.querySelector("#hero h1").closest("div").style.opacity = ""; for (const el of document.querySelectorAll("[data-whatsapp-fab], .a11y-trigger, #hero button, nav")) el.style.visibility = ""; const v = document.querySelector("#hero video"); if (v) v.play().catch(() => {}); });
  await p.evaluate((y) => window.scrollTo(0, y), hb - 406); await p.waitForTimeout(600);
  const f = `${out}/${tag}-375-mask${h}.png`; await p.screenshot({ path: f, clip: { x: 0, y: 0, width: 375, height: 812 } });
  ff(["-i", f, "-vf", "crop=iw:40:0:386,scale=iw*4:ih*4:flags=neighbor", `${out}/${tag}-375-mask${h}-tira.png`]);
  const rowsPng = `${out}/.${tag}-rows.png`; ff(["-i", f, "-vf", "crop=iw*0.8:120:iw*0.1:346,scale=1:120:flags=area", "-pix_fmt", "rgb24", "-f", "rawvideo", rowsPng]);
  const raw = fs.readFileSync(rowsPng); fs.rmSync(rowsPng, { force: true }); const { rgbToOklab, deltaE } = await import("../../src/lib/oklab.ts");
  const labs = []; for (let i = 0; i < 120; i++) labs.push(rgbToOklab([raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]]));
  let max = 0, at = 0; for (let i = 1; i < 120; i++) { const d = deltaE(labs[i - 1], labs[i]); if (d > max) { max = d; at = i; } }
  const r = { mask: h, textLuma: Math.round(textLuma), peorPixel: worst, contraste, bordeDeltaE: +deltaE(labs[59], labs[60]).toFixed(4), maxDeltaE: +max.toFixed(4), enFila: at - 60 };
  rep[`mask-${h}`] = r; console.log(`${tag} 375 máscara ${h} %: texto luma ${r.textLuma} · peor píxel ${worst} → contraste ${contraste} · ΔE borde ${r.bordeDeltaE} · máx ${r.maxDeltaE} (fila ${r.enFila})`);
  // coste CPU ×4 del scroll por el hero con máscara vs sin máscara (mask-image: none inyectado)
  for (const sin of [false, true]) {
    if (sin) await p.addStyleTag({ content: ".hero-v6-media { mask-image: none !important; -webkit-mask-image: none !important; }" });
    const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.evaluate(() => { window.__lt = []; window.__fr = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: false }); let last = performance.now(); const tick = (t) => { window.__fr.push(t - last); last = t; if (window.__go) requestAnimationFrame(tick); }; window.__go = true; requestAnimationFrame(tick); window.scrollTo(0, 0); });
    for (let y = 0; y < hb + 400; y += 24) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(8); }
    const c = await p.evaluate(() => { window.__go = false; const fr = window.__fr.slice(2); return { longTasks: window.__lt.length, longTasksMs: window.__lt.reduce((a, x) => a + x, 0), frames: fr.length, over33: fr.filter((x) => x > 33).length, maxMs: Math.round(Math.max(...fr)), meanMs: +(fr.reduce((a, x) => a + x, 0) / fr.length).toFixed(2) }; });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); await cdp.detach(); rep[`coste-mask${h}${sin ? "-sin" : ""}`] = c; console.log(`${tag} coste CPU×4 hero+400 px ${sin ? "SIN máscara" : "con máscara " + h + " %"}: ${JSON.stringify(c)}`);
  }
  await ctx.close();
};
const heroBottom = (p) => p.evaluate(() => Math.round(document.querySelector("#hero").getBoundingClientRect().bottom + scrollY));
const setVar = (p, k, v) => p.evaluate(([k, v]) => document.documentElement.style.setProperty(k, v), [k, v]);
const want = (k) => !solo || solo === k;
try {
  if (want("mascara")) { for (const h of [20, 25]) await mascaraRun(b, h); ff(["-i", `${out}/${tag}-375-mask20-hero.png`, "-i", `${out}/${tag}-375-mask25-hero.png`, "-i", `${out}/${tag}-375-mask20.png`, "-i", `${out}/${tag}-375-mask25.png`, "-filter_complex", "hstack=inputs=4", `${out}/${tag}-375-mask-20-vs-25.png`]); ff(["-i", `${out}/${tag}-375-mask20-tira.png`, "-i", `${out}/${tag}-375-mask25-tira.png`, "-filter_complex", "vstack", `${out}/${tag}-375-mask-tiras.png`]); }
  if (false) { for (const seam of ["dark", "light"]) await seamRun(b, seam); ff(["-i", `${out}/${tag}-375-seam-dark.png`, "-i", `${out}/${tag}-375-seam-light.png`, "-i", `${out}/${tag}-375-seam-dark-hero.png`, "-i", `${out}/${tag}-375-seam-light-hero.png`, "-filter_complex", "hstack=inputs=4", `${out}/${tag}-375-seam-dark-vs-light.png`]); ff(["-i", `${out}/${tag}-375-seam-dark-tira.png`, "-i", `${out}/${tag}-375-seam-light-tira.png`, "-filter_complex", "vstack", `${out}/${tag}-375-seam-tiras.png`]); }
  // ── R7 precisada (2026-09-19): 375 con barra visible (740) y oculta (812): hero entero, nada lo tapa, costura pegada ──
  if (want("r7")) for (const H of [812, 740]) {
    const ctx = await b.newContext({ viewport: { width: 375, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const p = await open(ctx);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
    const g = await p.evaluate(() => { const h = document.querySelector("#hero").getBoundingClientRect(); const s = document.querySelector("#services").getBoundingClientRect(); const c = document.querySelector("#hero h1").closest("div").querySelector("button").getBoundingClientRect(); const card = document.querySelector("#services article, #services a, #services img")?.getBoundingClientRect(); return { hero: Math.round(h.height), heroBottom: Math.round(h.bottom), servicesTop: Math.round(s.top), ctaBottom: Math.round(c.bottom), cardTop: card ? Math.round(card.top) : null, vh: innerHeight }; });
    rep[`r7-${H}`] = g; console.log(`${tag} 375×${H} R7: hero ${g.hero} (viewport ${g.vh}) · services.top ${g.servicesTop} (hero.bottom ${g.heroBottom}) · CTA bottom ${g.ctaBottom} · primera tarjeta en ${g.cardTop} (${g.cardTop - g.heroBottom} px bajo el hero)`);
    await p.screenshot({ path: `${out}/${tag}-375x${H}-r7-hero.png`, clip: { x: 0, y: 0, width: 375, height: H } });
    await p.evaluate((y) => window.scrollTo(0, y), Math.max(0, g.heroBottom - Math.round(H / 2))); await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${tag}-375x${H}-r7-costura.png`, clip: { x: 0, y: 0, width: 375, height: H } });
    await ctx.close();
  }
  if (want("r7")) ff(["-i", `${out}/${tag}-375x812-r7-hero.png`, "-i", `${out}/${tag}-375x740-r7-hero.png`, "-i", `${out}/${tag}-375x812-r7-costura.png`, "-i", `${out}/${tag}-375x740-r7-costura.png`, "-filter_complex", "[1]pad=iw:1624:0:0:color=black[p1];[3]pad=iw:1624:0:0:color=black[p3];[0][p1]hstack[a];[2][p3]hstack[b];[a][b]hstack", `${out}/${tag}-375-r7.png`]);
  for (const vk of [375, 1280]) {
    if (solo === "seam" || solo === "r7" || solo === "mascara") break;
    const ctx = await ctxFor(vk); const p = await open(ctx); const H = vk < 768 ? 812 : 800;
    // ── hero D14: texto centrado-abajo + contraste sobre el pie del clip ──
    if (want("hero")) {
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
      const shot = `${out}/${tag}-${vk}-hero-d14.png`; await p.screenshot({ path: shot, clip: { x: 0, y: 0, width: vk, height: H } });
      const box = await p.evaluate(() => { const h = document.querySelector("#hero h1"); const r = h.closest("div").getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
      await p.evaluate(() => { const v = document.querySelector("#hero video"); if (v) v.pause(); document.querySelector("#hero h1").closest("div").style.opacity = "0"; for (const el of document.querySelectorAll("[data-whatsapp-fab], .a11y-trigger, #hero button, nav")) el.style.visibility = "hidden"; }); await p.waitForTimeout(200);
      const bg = `${out}/${tag}-${vk}-hero-d14-fondo-texto.png`; await p.screenshot({ path: bg, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
      await p.evaluate(() => { document.querySelector("#hero h1").closest("div").style.opacity = ""; for (const el of document.querySelectorAll("[data-whatsapp-fab], .a11y-trigger, #hero button, nav")) el.style.visibility = ""; const v = document.querySelector("#hero video"); if (v) v.play().catch(() => {}); });
      const y = lumaMax(bg); rep[`hero-${vk}`] = { bloque: box, lumaMax: y, contrasteAproxBlancoSobrePixelMasClaro: y === null ? null : contrastWhite(y) };
      console.log(`${tag} ${vk} hero D14: bloque ${JSON.stringify(box)} · luma máx ${y} → contraste blanco ≈ ${rep[`hero-${vk}`].contrasteAproxBlancoSobrePixelMasClaro}`);
    }
    // ── D14-bis: margen inferior 3 y 5 rem ──
    if (want("margen")) for (const rem of [3, 5]) {
      await setVar(p, "--hero-block-pb", `${rem}rem`); await setVar(p, "--hero-block-pb-lg", `${rem}rem`); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      await p.screenshot({ path: `${out}/${tag}-${vk}-margen${rem}.png`, clip: { x: 0, y: 0, width: vk, height: H } });
      const box = await p.evaluate(() => { const h = document.querySelector("#hero h1"); const r = h.closest("div").getBoundingClientRect(); const s = document.querySelector("#hero").getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), heroBottom: Math.round(s.bottom), gap: Math.round(s.bottom - r.bottom) }; });
      rep[`margen-${vk}-${rem}`] = box; console.log(`${tag} ${vk} margen ${rem} rem: bloque ${box.top}–${box.bottom}, hero termina en ${box.heroBottom} (hueco ${box.gap} px)`);
    }
    await setVar(p, "--hero-block-pb", ""); await setVar(p, "--hero-block-pb-lg", "");
    if (vk === 375) {
      const hb = await heroBottom(p); rep.heroBottom = hb;
      // ── D18: pausa fuera de pantalla ──
      if (want("pausa")) {
        await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1200);
        const st = async () => p.evaluate(() => { const v = document.querySelector("#hero video"); return v ? { paused: v.paused, t: +v.currentTime.toFixed(2) } : null; });
        const enHero = await st(); await p.evaluate((y) => window.scrollTo(0, y), hb + 900); await p.waitForTimeout(800); const fuera = await st();
        await p.waitForTimeout(1500); const fuera2 = await st(); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1200); const vuelta = await st();
        rep.pausa = { enHero, fuera, fuera2, vuelta }; console.log(`${tag} D18 pausa: en hero ${JSON.stringify(enHero)} · fuera ${JSON.stringify(fuera)} → ${JSON.stringify(fuera2)} (t no avanza = pausado) · vuelta ${JSON.stringify(vuelta)}`);
      }
      // ── R20: costura hero → foto, ΔE fila a fila ──
      if (want("costura")) {
        for (const v of [0.65, 0.5]) {
          await setVar(p, "--veil-services", String(v)); await p.evaluate((y) => window.scrollTo(0, y), hb - 406); await p.waitForTimeout(500);
          const f = `${out}/${tag}-375-costura${Math.round(v * 100)}.png`; await p.screenshot({ path: f, clip: { x: 0, y: 0, width: 375, height: 812 } });
          ff(["-i", f, "-vf", "crop=iw:40:0:386,scale=iw*4:ih*4:flags=neighbor", `${out}/${tag}-375-costura${Math.round(v * 100)}-tira.png`]);
          // ΔE fila a fila (OKLab) en 120 filas alrededor del borde del hero (y = 406 en la captura), columna del 10–90 %
          const rowsPng = `${out}/.${tag}-rows.png`; ff(["-i", f, "-vf", "crop=iw*0.8:120:iw*0.1:346,scale=1:120:flags=area", "-pix_fmt", "rgb24", "-f", "rawvideo", rowsPng]);
          const raw = fs.readFileSync(rowsPng); fs.rmSync(rowsPng, { force: true });
          const { rgbToOklab, deltaE } = await import("../../src/lib/oklab.ts");
          const labs = []; for (let i = 0; i < 120; i++) labs.push(rgbToOklab([raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]]));
          let max = 0, at = 0; for (let i = 1; i < 120; i++) { const d = deltaE(labs[i - 1], labs[i]); if (d > max) { max = d; at = i; } }
          const borde = deltaE(labs[59], labs[60]);
          rep[`costura-${Math.round(v * 100)}`] = { maxDeltaE: +max.toFixed(4), enFila: at - 60, bordeDeltaE: +borde.toFixed(4) };
          console.log(`${tag} costura velo ${v}: ΔE máx entre filas consecutivas ${max.toFixed(4)} (fila ${at - 60} respecto del borde) · ΔE en el borde ${borde.toFixed(4)}`);
          const frames = [];
          for (const [i, dy] of [812, 600, 400, 200, 0].entries()) { await p.evaluate((y) => window.scrollTo(0, y), hb - dy); await p.waitForTimeout(350); const ff1 = `${out}/.${tag}-f${i}.png`; await p.screenshot({ path: ff1, clip: { x: 0, y: 0, width: 375, height: 812 } }); frames.push(ff1); }
          ff([...frames.flatMap((x) => ["-i", x]), "-filter_complex", "hstack=inputs=5", `${out}/${tag}-375-costura${Math.round(v * 100)}-scroll.png`]); frames.forEach((x) => fs.rmSync(x, { force: true }));
        }
        await setVar(p, "--veil-services", "");
      }
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
      if (want("coste")) for (const sinPausa of [false, true]) {
        if (sinPausa) await p.evaluate(() => { const v = document.querySelector("#hero video"); if (v) { v.pause = () => {}; v.play().catch(() => {}); } });
        const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await p.evaluate(() => { window.__lt = []; window.__fr = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: false }); /* sólo lo que pasa durante el scroll */ let last = performance.now(); const tick = (t) => { window.__fr.push(t - last); last = t; if (window.__go) requestAnimationFrame(tick); }; window.__go = true; requestAnimationFrame(tick); window.scrollTo(0, 0); });
        const H2 = await p.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < H2; y += 24) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(8); }
        const c = await p.evaluate(() => { window.__go = false; const fr = window.__fr.slice(2); return { longTasks: window.__lt.length, longTasksMs: window.__lt, frames: fr.length, over33: fr.filter((x) => x > 33).length, maxMs: Math.round(Math.max(...fr)), meanMs: +(fr.reduce((a, x) => a + x, 0) / fr.length).toFixed(2) }; });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); rep[sinPausa ? "costeSinPausa" : "coste"] = c; console.log(`${tag} coste CPU×4 ${sinPausa ? "SIN pausa (vídeo sigue)" : "con pausa D18"} (scroll completo, 24 px/paso): ${JSON.stringify(c)}`);
        await cdp.detach();
      }
    }
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); kill3000(); }
fs.writeFileSync(`${out}/${tag}-fondo-verificacion.json`, JSON.stringify(rep, null, 1));
