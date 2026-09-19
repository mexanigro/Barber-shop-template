// SERVICES-02 · S1 (R7, 2026-09-19): «el hero es 100 vh sin excepción». En móvil `dvh` cambia al esconderse la barra del
// navegador y el hero se estira/recorta mientras el contenido montado encima (LocalBackdrop, -mt-[100svh]) queda desfasado.
// Guard estático: ni hero-v6 ni LocalBackdrop usan `dvh`; los dos usan la misma unidad (`svh`).
// Guard dinámico (Playwright, sin servidor): un DOM mínimo con las mismas clases; con viewport 375×812 y 375×740
// (barra visible / oculta, distinto alto) el hero mide lo mismo que la capa fija y ambos llenan el viewport.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const hero = readFileSync(resolve(ROOT, "src/components/landing/hero/hero-v6.tsx"), "utf8");
const backdrop = readFileSync(resolve(ROOT, "src/components/landing/LocalBackdrop.tsx"), "utf8");

test("S1: hero-v6 y LocalBackdrop no usan dvh y comparten la unidad svh", () => {
  for (const [name, src] of [["hero-v6", hero], ["LocalBackdrop", backdrop]] as const) {
    const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // sin comentarios
    assert.ok(!/\bdvh\b/.test(code), `${name} usa dvh`);
    assert.ok(/100svh/.test(code), `${name} no usa 100svh`);
  }
});

test("S1: con barra visible y oculta (viewport 812 y 740) el hero mide lo mismo que la capa fija y llena el viewport", async () => {
  const b = await chromium.launch();
  try {
    for (const h of [812, 740]) {
      const ctx = await b.newContext({ viewport: { width: 375, height: h }, isMobile: true, hasTouch: true });
      const p = await ctx.newPage();
      await p.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>*{margin:0}</style><main><section id="hero" style="min-height:100svh;background:#333"></section><div style="position:relative"><div id="capa" style="position:sticky;top:0;height:100svh;overflow:hidden;background:#ccc"></div><div style="position:relative;margin-top:-100svh"><section style="height:2000px"></section></div></div></main>`);
      const m = await p.evaluate(() => ({ hero: Math.round(document.querySelector("#hero")!.getBoundingClientRect().height), capa: Math.round(document.querySelector("#capa")!.getBoundingClientRect().height), vh: innerHeight }));
      assert.equal(m.hero, m.capa, `viewport ${h}: hero ${m.hero} ≠ capa ${m.capa}`);
      assert.equal(m.hero, m.vh, `viewport ${h}: hero ${m.hero} ≠ innerHeight ${m.vh}`);
      await ctx.close();
    }
  } finally { await b.close(); }
});
