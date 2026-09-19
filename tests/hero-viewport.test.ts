// R7 precisada (2026-09-19, «el hero es 100 vh sin excepción; ya era regla y se rompió»): el hero ocupa toda la pantalla
// con la barra del navegador visible u oculta — caja 100lvh (respaldo 100vh), bloque de contenido anclado a 100svh — y
// NADA lo tapa: ninguna sección ni capa con top < hero.bottom; la capa fija del fondo mide lo mismo que el hero.
// (i) estático: ni `dvh` ni márgenes negativos sobre el hero; las clases llevan lvh/svh con vh de respaldo.
// (ii) Playwright sobre la página real (Vite en proceso, fixture peluqueria-paleta-a) en 375×812, 375×740 y 1280×800:
//     #hero cubre el viewport entero, nada con top < hero.bottom, la capa fija mide lo que el hero, CTA con bottom ≤ alto.
// Playwright no distingue svh de lvh (no hay barra): la unidad la vigila (i); la geometría, (ii).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const rd = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const hero = rd("src/components/landing/hero/hero-v6.tsx");
const backdrop = rd("src/components/landing/LocalBackdrop.tsx");
const css = rd("src/index.css");
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

test("R7 estático: hero-v6, LocalBackdrop e index.css sin dvh; caja lvh + bloque svh con vh de respaldo; ningún margen negativo sobre el hero", () => {
  for (const [name, src] of [["hero-v6", hero], ["LocalBackdrop", backdrop], ["index.css", css]] as const) {
    assert.ok(!/\bdvh\b/.test(sinComentarios(src)), `${name} usa dvh`);
  }
  const c = sinComentarios(css);
  assert.match(c, /\.hero-v6-box\s*\{\s*min-height:\s*100vh;\s*min-height:\s*100lvh;\s*\}/, "caja del hero: min-height 100vh y luego 100lvh");
  assert.match(c, /\.hero-v6-block\s*\{\s*min-height:\s*100vh;\s*min-height:\s*100svh;\s*\}/, "bloque del hero: 100vh y luego 100svh");
  assert.match(c, /\.local-backdrop-layer\s*\{\s*height:\s*100vh;\s*height:\s*100lvh;\s*\}/, "capa fija: la misma altura que la caja del hero");
  assert.match(c, /\.local-backdrop-content\s*\{\s*margin-top:\s*-100vh;\s*margin-top:\s*-100lvh;\s*\}/, "contenido del fondo: sube lo mismo que mide la capa");
  assert.match(sinComentarios(hero), /className=\{"hero-v6-box /, "hero-v6: la sección lleva .hero-v6-box");
  assert.match(sinComentarios(hero), /"hero-v6-block relative/, "hero-v6: el bloque lleva .hero-v6-block");
  assert.match(sinComentarios(backdrop), /local-backdrop-layer/, "LocalBackdrop: capa .local-backdrop-layer");
  assert.match(sinComentarios(backdrop), /local-backdrop-content/, "LocalBackdrop: contenido .local-backdrop-content");
  // nada sube sobre el hero: ni el envoltorio del fondo ni la sección que sigue
  assert.ok(!/\[data-local-backdrop\][^{]*\{[^}]*margin-top:\s*(-|calc\(\s*-1)/.test(c), "index.css: [data-local-backdrop] con margen negativo (tapa el hero)");
  assert.ok(!/#hero\s*\+[^{]*\{[^}]*margin-top:\s*(-|calc\(\s*-1)/.test(c), "index.css: la sección que sigue al hero sube sobre él");
  assert.ok(!/-mt-\[/.test(sinComentarios(backdrop)), "LocalBackdrop: -mt-[…] arbitrario (usar .local-backdrop-content)");
});

test("R7 dinámico: en 375×812, 375×740 y 1280×800 el hero cubre el viewport, nada lo tapa, la capa fija mide lo mismo y el CTA cabe", async () => {
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false";
  process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = "peluqueria-paleta-a"; process.env.VITE_HERO_CLIP = "";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
  await vite.listen();
  const url = vite.resolvedUrls!.local[0];
  const b = await chromium.launch();
  try {
    for (const [w, h] of [[375, 812], [375, 740], [1280, 800]] as const) {
      const ctx = await b.newContext(w < 768 ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } });
      const p = await ctx.newPage();
      await p.goto(url, { waitUntil: "networkidle" });
      await p.waitForSelector("#hero h1"); await p.waitForTimeout(600);
      // tsx/esbuild inyecta __name en funciones con nombre: el código de página va como texto
      const m = await p.evaluate(`(() => {
        const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), width: Math.round(b.width), height: Math.round(b.height) }; };
        const hero = r(document.querySelector("#hero"));
        const capa = document.querySelector("[data-local-backdrop] > div");
        const tapan = [...document.querySelectorAll("section:not(#hero), [data-local-backdrop], [data-local-backdrop] > div")]
          .map((el) => ({ sel: el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.getAttribute("data-local-backdrop") !== null ? "[data-local-backdrop]" : ""), top: Math.round(el.getBoundingClientRect().top) }))
          .filter((x) => x.top < hero.bottom - 0.5);
        const cta = document.querySelector("#hero h1").closest("div").querySelector("button");
        return { hero, capa: capa ? r(capa) : null, tapan, cta: r(cta), vw: innerWidth, vh: innerHeight, scrollY };
      })()`) as { hero: { top: number; bottom: number; width: number; height: number }; capa: { height: number } | null; tapan: { sel: string; top: number }[]; cta: { bottom: number }; vw: number; vh: number; scrollY: number };
      const tag = `${w}×${h}`;
      assert.equal(m.scrollY, 0, `${tag}: la página no arranca arriba`);
      assert.equal(m.hero.top, 0, `${tag}: hero.top ${m.hero.top}`);
      assert.ok(m.hero.height >= m.vh, `${tag}: hero ${m.hero.height} < viewport ${m.vh}`);
      assert.equal(m.hero.width, m.vw, `${tag}: hero ancho ${m.hero.width} ≠ ${m.vw}`);
      assert.deepEqual(m.tapan, [], `${tag}: tapan el hero (top < ${m.hero.bottom}): ${JSON.stringify(m.tapan)}`);
      assert.ok(m.capa, `${tag}: no hay capa fija del fondo (¿fixture sin localPhoto?)`);
      assert.equal(m.capa!.height, m.hero.height, `${tag}: capa fija ${m.capa!.height} ≠ hero ${m.hero.height}`);
      assert.ok(m.cta.bottom <= m.vh, `${tag}: CTA bottom ${m.cta.bottom} > ${m.vh}`);
      await ctx.close();
    }
  } finally { await b.close(); await vite.close(); }
});
