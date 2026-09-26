// SERVICES-02 · AJUSTES-01 (2026-09-20): (1) el navegador toma el mp4 (H.264) antes que el webm en las tres variantes del hero;
// el 9:16 se sirve a 1080×1920; (3) Frank Ruhl Libre sólo 300 y 500 en peluquería y el h1 en 300 (S1); (4) el vídeo del hero
// arranca solo al cargar con la página visible, se pausa al salir del hero (D18) y vuelve al entrar; con la pestaña oculta al
// cargar arranca al mostrarse. Guard estático + página real (Vite en proceso, fixture C, 375 retrato y 1280).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const rd = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

test("estático: mp4 antes que webm en cada variante; Frank Ruhl Libre sólo 300;500; h1 en 300; clip.mjs vertical 1080×1920 ≤ 6 MB", () => {
  const src = rd("src/components/landing/hero/hero-v6.tsx");
  // GALERIA-05 C1: WebKit no respeta `media` en <source> de <video> → la variante se elige en JS (`chosen`) y se rinde UN par mp4 + webm sin media
  const sources = [...src.matchAll(/<source src=\{([^}]+)\} type="video\/(mp4|webm)"( media="[^"]+")?/g)].map((m) => ({ src: m[1], type: m[2], media: m[3] ?? "" }));
  assert.equal(sources.length, 2, "un par <source> (mp4 + webm) elegido en JS");
  assert.equal(sources[0].type, "mp4", "primero el mp4"); assert.equal(sources[1].type, "webm", "el webm después");
  assert.ok(sources.every((s) => s.media === ""), "sin atributo media en <source> (WebKit lo ignora y salta la fuente)");
  assert.match(src, /portrait && video\.portrait \? \{ mp4: video\.portrait\.mp4/, "hero.video.portrait → 9:16 (CONEXION-02: guard de la fila hero.video)"); assert.match(src, /!wide && video\.medium \? \{ mp4: video\.medium\.mp4/, "< 1024 → medium (1280)");
  // ARREGLOS-02 (D-123): Frank Ruhl Libre ya no se declara en la lista de peluquería. `html[dir="rtl"]` (src/index.css) la usa
  // en TODOS los nichos, así que la hoja base de index.html es la única que puede declararla sin repetirla. Lo que S1 decidió
  // —peluquería usa 300 y 500, nada de 400 ni 700— no cambió de sentido, cambió de lugar: la declaración se afirma acá y el USO
  // real NO se mide acá: este test nunca midió uso (comparaba la cadena de la lista), y sigue sin medirlo. Lo que sí se midió
  // en ARREGLOS-02 —que la página usa FRL en 700 y 900— queda anotado en bloque-04/4.3.md como pendiente de la primera orden
  // de diseño de tipografía, con el predicado y los pesos, para que sea SU test rojo.
  const fonts = (rd("src/config/presets/themes.ts").match(/const PELUQUERIA_FONTS =\s*"([^"]+)"/) || [])[1] || "";
  assert.doesNotMatch(fonts, /Frank\+Ruhl\+Libre/, "la lista de peluquería no vuelve a declarar Frank Ruhl Libre: la declara la base (D-123): " + fonts.slice(0, 120));
  const hojaBase = (rd("index.html").match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/) || [""])[0];
  const frl = (hojaBase.match(/Frank\+Ruhl\+Libre:wght@([0-9;]+)/) || ["", ""])[1].split(";").filter(Boolean);
  assert.ok(frl.includes("300") && frl.includes("500"), "la base declara Frank Ruhl Libre 300 y 500, que es lo que peluquería usa (S1): " + hojaBase.slice(0, 140));
  assert.match(rd("src/index.css"), /html\[data-niche="peluqueria"\] h1 \{ font-weight: 300; \}/, "h1 de peluquería en 300 (S1)");
  const clip = rd("tools/material/clip.mjs");
  assert.match(clip, /MAX_BYTES_V = 6 \* 1024 \* 1024/, "9:16 tope 6 MB"); assert.match(clip, /opt\("alto", 1920\)/, "9:16 a 1080×1920 por defecto"); assert.match(clip, /CRF_VP9_V = \[22, 23, 24\]/, "webm 22–24");
});

test("página real (C): currentSrc mp4 en 375 (hero-v 1080×1920) y en 1280 (hero); vídeo arranca, se pausa fuera del hero y vuelve; pestaña oculta → arranca al mostrarse", async () => {
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false"; process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = "peluqueria-paleta-c"; process.env.VITE_HERO_CLIP = "";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
  await vite.listen(); const url = vite.resolvedUrls!.local[0];
  const b = await chromium.launch();
  // CONEXION-01: el hero viene de Storage; goto/waitForSelector a 90 s (con 30 s caían bajo carga paralela de npm test).
  const estado = (p: import("playwright").Page) => p.evaluate(`(() => { const v = document.querySelector("#hero video"); return v ? { src: (() => { const u = decodeURIComponent(new URL(v.currentSrc, location.href).pathname); const m = u.match(/(?:paleta-|test-b4-peluqueria-)([a-z0-9]+)[/](?:media[/][a-z]+[/])?([^/]+)$/); return m ? "paleta-" + m[1] + "/" + m[2] : u; })() /* CONEXION-01: local o Storage → paleta-<p>/<nombre> */, paused: v.paused, t: v.currentTime, w: v.videoWidth, h: v.videoHeight, rs: v.readyState } : null; })()`) as Promise<{ src: string; paused: boolean; t: number; w: number; h: number; rs: number } | null>;
  try {
    // 375 retrato
    const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); await p.goto(url, { waitUntil: "networkidle", timeout: 90000 }); await p.waitForSelector("#hero video", { timeout: 90000 }); await p.waitForFunction(`document.querySelector("#hero video").readyState >= 2`); await p.waitForTimeout(1500);
    const a = await estado(p); assert.ok(a, "hay vídeo en el hero");
    assert.equal(a.src, "paleta-c/hero-v.mp4", "375 retrato: el navegador toma hero-v.mp4 (antes webm)");
    assert.ok(a.w === 1080 && a.h === 1920, `375: 1080×1920, real ${a.w}×${a.h}`);
    assert.equal(a.paused, false, "arranca solo al cargar con la página visible"); const t0 = a.t; await p.waitForTimeout(700); const a2 = await estado(p); assert.ok(a2!.t > t0, `avanza (${t0} → ${a2!.t})`);
    await p.evaluate("window.scrollTo(0, 2400)"); await p.waitForTimeout(600); assert.equal((await estado(p))!.paused, true, "D18: pausado fuera del hero");
    await p.evaluate("window.scrollTo(0, 0)"); await p.waitForTimeout(900); assert.equal((await estado(p))!.paused, false, "vuelve a reproducir al volver al hero");
    // GALERIA-03 D4: histéresis — a 100 px de haber salido sigue reproduciendo; se reanuda ANTES de entrar (hero a 350 px de la pantalla)
    await p.evaluate("window.scrollTo(0, 812 + 100)"); await p.waitForTimeout(500); assert.equal((await estado(p))!.paused, false, "D4: no pausa en el borde (hero 100 px fuera)");
    await p.evaluate("window.scrollTo(0, 2400)"); await p.waitForTimeout(600); assert.equal((await estado(p))!.paused, true, "D4: pausado del todo fuera");
    await p.evaluate("window.scrollTo(0, 812 + 350)"); await p.waitForTimeout(700); assert.equal((await estado(p))!.paused, false, "D4: reanuda antes de entrar (hero a 350 px)");
    const src = readFileSync(resolve(ROOT, "src/components/landing/hero/hero-v6.tsx"), "utf8");
    assert.ok(/RESUME_MARGIN_PX = 400, PAUSE_MARGIN_PX = 300/.test(src) && /requestAnimationFrame\(\(\) => \{ if \(!userPaused\.current && el\.paused\) tryPlay\(\); \}\)/.test(src) && !/\.load\(\)/.test(src) && /name === "AbortError"\) return;/.test(src), "D4: márgenes 400/300, play() en rAF, sin load(), AbortError no degrada al póster (hero.video.poster)");
    await ctx.close();
    // 1280
    const ctx2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p2 = await ctx2.newPage(); await p2.goto(url, { waitUntil: "networkidle", timeout: 90000 }); await p2.waitForSelector("#hero video", { timeout: 90000 }); await p2.waitForFunction(`document.querySelector("#hero video").readyState >= 2`); await p2.waitForTimeout(1200);
    const d = await estado(p2); assert.equal(d!.src, "paleta-c/hero.mp4", "1280: hero.mp4 (antes webm)"); assert.equal(d!.paused, false, "1280: reproduce");
    await ctx2.close();
    // pestaña oculta al cargar (document.hidden simulado) → arranca al mostrarse
    const ctx3 = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    await ctx3.addInitScript(`window.__hidden = true; Object.defineProperty(document, "hidden", { configurable: true, get: () => window.__hidden }); Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (window.__hidden ? "hidden" : "visible") });`);
    const p3 = await ctx3.newPage(); await p3.goto(url, { waitUntil: "networkidle", timeout: 90000 }); await p3.waitForSelector("#hero video", { timeout: 90000 }); await p3.waitForFunction(`document.querySelector("#hero video").readyState >= 2`); await p3.waitForTimeout(1200);
    await p3.evaluate(`window.__hidden = false; document.dispatchEvent(new Event("visibilitychange"));`); await p3.waitForTimeout(900);
    assert.equal((await estado(p3))!.paused, false, "oculta al cargar → reproduce al mostrarse");
    await ctx3.close();
  } finally { await b.close(); await vite.close(); }
});
