// GALERIA-03 (2026-09-20): galería de la home v6 «collage» (A) / v7 «mosaico con relieve» (C), CONTRATOS § gallery.
// Guard estático: mapa de 6 celdas, un solo <a href="/galeria">, sin animación de aparición (D3), pared con máscara alfa arriba y
// abajo (--gal-fade) y rampa a --surface abajo, reduced-motion sin transform, lightbox <dialog> con Escape y foco de vuelta.
// Página real (Vite en proceso, fixture A → v6; fixture C → v7): 6 celdas con los aspectos del mapa, --gal-dy cambia con el scroll,
// tocar abre el lightbox y Escape devuelve el foco a la pieza, un solo enlace; moldeabilidad: 3 fotos → 3 celdas, 2 → no se monta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const rd = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

test("estático: contrato de la galería v6/v7", () => {
  const src = rd("src/components/landing/gallery/gallery-v6.tsx"); const css = rd("src/index.css");
  assert.match(src, /v6: \[\{ col: 0, ar: "4\/5", size: "l" \}, \{ col: 1, ar: "1\/1", size: "s" \}, \{ col: 0, ar: "1\/1", size: "s" \}, \{ col: 1, ar: "3\/4", size: "m" \}, \{ col: 0, ar: "3\/4", size: "m" \}, \{ col: 1, ar: "4\/5", size: "l" \}\]/, "mapa v6 fijo de 6 celdas (grande · chica · chica · mediana · mediana · grande)");
  assert.match(src, /v7: \[\{ col: 0, ar: "16\/9", span2: true \}/, "mapa v7 con doble 16:9");
  assert.equal((src.match(/<a href="\/galeria"/g) || []).length, 1, "UN solo <a href=\"/galeria\">");
  assert.ok(!/whileInView|initial:\s*\{[^}]*opacity:\s*0|<motion\./.test(src), "sin animación de aparición (D3)");
  assert.match(src, /\.slice\(0, 6\)/, "6 piezas");
  assert.match(src, /if \(sel\.length < 3\)[\s\S]*return null/, "< 3 fotos → no se monta");
  const lb = rd("src/components/landing/gallery/gallery-lightbox.tsx"); // GALERIA-04: lightbox compartido con /galeria
  assert.match(lb, /<dialog ref=\{ref\} className="gal-lightbox"/, "lightbox <dialog>");
  assert.match(src, /<GalleryLightbox items=\{sel\}/, "la home usa el lightbox compartido");
  assert.match(src, /requestAnimationFrame\(\(\) => opener\.current\?\.focus\(\)\)/, "el cierre devuelve el foco a la pieza");
  assert.match(css, /\.gal-wall \{[^}]*;\s*mask-image: linear-gradient\(to bottom, transparent, #000 var\(--gal-fade\), #000 calc\(100% - var\(--gal-fade\)\), transparent\)/, "pared disuelta arriba y abajo (--gal-fade; la propiedad sin prefijo)");
  assert.match(css, /section#gallery\.gal::after \{[^}]*linear-gradient\(to bottom, transparent, var\(--surface\)\)/, "rampa a --surface abajo");
  assert.match(css, /\.gal-col, \.gal-grid, \.gal-piece:not\(\[data-pressed\]\):not\(:hover\), \.gal-img \{ transform: none !important/, "reduced-motion sin transform (GALERIA-05: la elevación al apoyar queda, es feedback)");
  assert.match(css, /html\.dark\[data-niche="peluqueria"\] \.gal-piece \{ border: 1px solid var\(--accent-strong\); \}/, "borde de acento en oscuro");
  assert.match(rd("src/App.tsx"), /if \(p === "\/galeria"\) return \{ page: "gallery" \}/, "ruta /galeria");
});

async function conFixture(nombre: string, fx: unknown, fn: (url: string) => Promise<void>) {
  const tmp = resolve(ROOT, `dev-fixtures/_tmp-${nombre}.json`); writeFileSync(tmp, JSON.stringify(fx));
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false"; process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = `_tmp-${nombre}`; process.env.VITE_HERO_CLIP = "";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: ["**/dev-fixtures/_tmp-*"] } }, logLevel: "silent" }); // las fixtures temporales de otra suite en paralelo disparaban full-reload (Vite watch) a mitad de la prueba
  await vite.listen(); try { await fn(vite.resolvedUrls!.local[0]); } finally { await vite.close(); rmSync(tmp, { force: true }); }
}

test("página real: v6 (A) y v7 (C) montan 6 celdas del mapa, parallax por scroll, lightbox con Escape y foco, un enlace; moldeabilidad 3 y 2 fotos", async () => {
  const A = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures/peluqueria-paleta-a.json"), "utf8"));
  const C = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures/peluqueria-paleta-c.json"), "utf8"));
  const b = await chromium.launch();
  const medir = async (url: string) => {
    const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
    await p.goto(url, { waitUntil: "networkidle", timeout: 90000 }); /* CONEXION-01: galería y hero desde Storage, depende de la red */ await p.waitForTimeout(2500);
    const m = await p.evaluate(`(() => { const s = document.querySelector("#gallery"); if (!s) return null; const r = s.getBoundingClientRect(); return { top: r.top + scrollY, variant: s.dataset.gallery, cells: [...s.querySelectorAll(".gal-cell")].map((c) => c.style.aspectRatio), links: [...s.querySelectorAll("a")].map((a) => a.getAttribute("href")), buttons: s.querySelectorAll("button").length }; })()`) as { top: number; variant: string; cells: string[]; links: string[]; buttons: number } | null;
    return { p, ctx, m };
  };
  try {
    await conFixture("g03-a", A, async (url) => {
      const { p, ctx, m } = await medir(url); assert.ok(m, "hay galería en A");
      assert.equal(m.variant, "v6"); assert.deepEqual(m.cells, ["4 / 5", "1 / 1", "3 / 4", "1 / 1", "3 / 4", "4 / 5"], "6 celdas con los aspectos del mapa v6 (DOM por columnas: A = grande·chica·mediana, B = chica·mediana·grande)");
      assert.deepEqual(m.links, ["/galeria"], "un solo enlace a /galeria");
      await p.evaluate(`window.scrollTo(0, ${m.top} - 700)`); await p.waitForTimeout(300); const d1 = await p.evaluate(`getComputedStyle(document.querySelector("#gallery")).getPropertyValue("--gal-dy")`) as string;
      await p.evaluate(`window.scrollTo(0, ${m.top} - 100)`); await p.waitForTimeout(300); const d2 = await p.evaluate(`getComputedStyle(document.querySelector("#gallery")).getPropertyValue("--gal-dy")`) as string;
      assert.ok(d1 !== d2 && parseFloat(d1) > parseFloat(d2), `H-B: --gal-dy cambia con el scroll (${d1} → ${d2})`);
      const piece = p.locator("#gallery .gal-piece").first(); await piece.click(); await p.waitForTimeout(600);
      assert.equal(await p.evaluate(`!!document.querySelector("dialog.gal-lightbox")?.open`), true, "tocar abre el lightbox");
      await p.keyboard.press("Escape"); await p.waitForTimeout(400);
      assert.equal(await p.evaluate(`!!document.querySelector("dialog.gal-lightbox")`), false, "Escape cierra");
      assert.equal(await p.evaluate(`document.activeElement?.className`), "gal-piece", "el foco vuelve a la pieza");
      await ctx.close();
    });
    await conFixture("g03-c", C, async (url) => {
      const { ctx, m } = await medir(url); assert.ok(m, "hay galería en C"); assert.equal(m.variant, "v7");
      assert.deepEqual(m.cells, ["16 / 9", "4 / 5", "1 / 1", "16 / 9", "1 / 1", "4 / 5"], "6 celdas del mapa v7 (DOM por columnas)"); assert.deepEqual(m.links, ["/galeria"]); await ctx.close();
    });
    // GALERIA-04: la fuente es sections.gallery.items (selection por id); gallery[] queda como respaldo
    const conN = (n: number) => ({ ...A, gallery: A.gallery.slice(0, n), sections: { ...A.sections, gallery: { ...A.sections.gallery, items: A.sections.gallery.items.slice(0, n), selection: undefined } } });
    await conFixture("g03-3", conN(3), async (url) => { const { ctx, m } = await medir(url); assert.ok(m && m.cells.length === 3, "3 fotos → 3 celdas (moldeabilidad)"); await ctx.close(); });
    await conFixture("g03-2", conN(2), async (url) => { const { ctx, m } = await medir(url); assert.equal(m, null, "2 fotos → la galería no se monta"); await ctx.close(); });
  } finally { await b.close(); }
});
