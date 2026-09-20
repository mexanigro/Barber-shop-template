// GALERIA-04 (2026-09-20): página /galeria = galería completa por tipo (CONTRATOS § página `/galeria`). Guard estático (lib, tipos,
// locale ×4, lightbox compartido, radiogroup, sin aparición) + página real (Vite en proceso, fixture A y C, 375): píldoras en el
// orden fijo del brief con «todo» primero, filtro, lightbox con etiqueta de tipo y «reservar» (abre el wizard), Escape devuelve el
// foco, flechas en las píldoras; moldeabilidad: 12 y 24 piezas, sin `type` → sin píldoras, sin `items` → gallery[] de respaldo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { GALLERY_TYPES, galleryItems, homeSelection, typesPresent } from "../src/lib/gallery";

const ROOT = resolve(import.meta.dirname, "..");
const rd = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

test("estático: contrato de /galeria (lib, locale ×4, lightbox compartido, radiogroup, rejilla a sangre, sin aparición)", () => {
  assert.deepEqual([...GALLERY_TYPES], ["color", "rizos", "liso", "recogidos", "novia", "cortes"], "orden fijo del brief");
  const items = galleryItems({ gallery: ["/1.jpg", "/2.jpg"], sections: { gallery: {} } } as never);
  assert.deepEqual(items.map((i) => i.id), ["g1", "g2"], "sin items → gallery[] con ids g1..");
  const typed = galleryItems({ gallery: [], sections: { gallery: { items: [{ id: "a", src: "/a.jpg", type: "novia" }, { id: "b", src: "/b.jpg", type: "color" }] } } } as never);
  assert.deepEqual(typesPresent(typed), ["color", "novia"], "tipos presentes en orden fijo");
  assert.deepEqual(homeSelection(typed, ["b", "zz", "a"]).map((i) => i.id), ["b", "a"], "selection por id, los inexistentes se saltan");
  assert.deepEqual(homeSelection(typed, [1, 0]).map((i) => i.id), ["b", "a"], "selection por índice (histórico)");
  for (const l of ["he", "en", "ru", "ar"]) {
    const s = rd(`src/config/locales/${l}.ts`);
    for (const k of ["all:", "filterLabel:", "bookThis:", "types: {"]) assert.ok(s.includes(k), `${l}: galleryPage.${k}`);
    for (const t of GALLERY_TYPES) assert.ok(new RegExp(`types: \\{[^}]*\\b${t}: "`).test(s), `${l}: types.${t}`);
  }
  const pg = rd("src/components/gallery/gallery-page-v6.tsx");
  assert.match(pg, /role="radiogroup"/, "píldoras como radiogroup"); assert.match(pg, /role="radio" aria-checked=\{type === t\} tabIndex=\{type === t \? 0 : -1\}/, "roving tabindex");
  assert.match(pg, /<GalleryLightbox items=\{items\}/, "lightbox compartido"); assert.ok(!/whileInView|motion\./.test(pg), "sin aparición (D3)");
  assert.match(pg, /data-surface="textura"/, "fondo = textura del modo (R21)");
  const lb = rd("src/components/landing/gallery/gallery-lightbox.tsx");
  assert.match(lb, /gal-lb-type/, "etiqueta de tipo en el pie (hueco 9)"); assert.match(lb, /it\.serviceId && onBook/, "reservar sólo con serviceId (hueco 10)");
  const css = rd("src/index.css");
  assert.match(css, /\.gal-page-grid \{ display: grid; grid-template-columns: repeat\(2, 1fr\); gap: 4px;/, "375: 2 col a sangre, 4 px");
  assert.match(css, /\.gal-page-grid \{ grid-template-columns: repeat\(3, 1fr\); gap: 12px; \}/, "1280: 3 col");
  assert.match(css, /\.gal-page-piece img, \.gal-page-piece:hover img, \.gal-page-piece:active img, \.gal-pill, \.gal-lb-book \{ transform: none !important/, "reduced-motion sin transform");
  assert.match(rd("src/App.tsx"), /<GalleryPageV6 onBack=\{\(\) => navigatePublic\("landing"\)\} onBookClick=\{handleBookNow\} \/>/, "ruta /galeria → GalleryPageV6 con reservar");
});

async function conFixture(nombre: string, fx: unknown, fn: (url: string) => Promise<void>) {
  const tmp = resolve(ROOT, `dev-fixtures/_tmp-${nombre}.json`); writeFileSync(tmp, JSON.stringify(fx));
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false"; process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = `_tmp-${nombre}`; process.env.VITE_HERO_CLIP = "";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
  await vite.listen(); try { await fn(vite.resolvedUrls!.local[0]); } finally { await vite.close(); rmSync(tmp, { force: true }); }
}

type Estado = { url: string; pills: string[]; labels: string[]; cells: number; cols: number };

test("página real (A y C, 375): píldoras, filtro, lightbox con tipo y reservar, Escape → foco, flechas; moldeabilidad 12/24, sin type, sin items", async () => {
  const A = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures/peluqueria-paleta-a.json"), "utf8"));
  const C = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures/peluqueria-paleta-c.json"), "utf8"));
  const b = await chromium.launch();
  // el fixture se aplica por fetch después del primer render (tenant.ts): se espera a que la rejilla tenga las N piezas del fixture
  const abrir = async (url: string, n: number) => { const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); await p.goto(url + "galeria", { waitUntil: "networkidle" }); await p.waitForFunction(`document.querySelectorAll(".gal-page-cell").length === ${n}`, null, { timeout: 30000 }); await p.waitForTimeout(200); return { ctx, p }; };
  const estado = (p: import("playwright").Page) => p.evaluate(`(() => ({ url: location.pathname, pills: [...document.querySelectorAll(".gal-pill")].map((b) => b.getAttribute("aria-checked")), labels: [...document.querySelectorAll(".gal-pill")].map((b) => b.textContent), cells: document.querySelectorAll(".gal-page-cell").length, cols: document.querySelector(".gal-page-grid") ? getComputedStyle(document.querySelector(".gal-page-grid")).gridTemplateColumns.split(" ").length : -1, page: document.querySelector("main, section")?.className?.slice(0, 40) }))()`) as Promise<Estado & { page: string }>;
  try {
    await conFixture("g04-a", A, async (url) => {
      const { ctx, p } = await abrir(url, 6); const e = await estado(p);
      assert.equal(e.url, "/galeria"); assert.equal(e.cells, 6); assert.equal(e.cols, 2, "375: 2 columnas");
      assert.deepEqual(e.pills, ["true", "false", "false", "false", "false", "false", "false"], "«todo» activa + 6 tipos");
      assert.deepEqual(e.labels, ["הכול", "צבע", "תלתלים", "החלקה", "תסרוקות", "כלות", "תספורות"], "orden fijo del brief en hebreo");
      await p.locator(".gal-pill").nth(2).click(); await p.waitForFunction(`document.querySelectorAll(".gal-page-cell").length === 1`, null, { timeout: 10000 }); assert.equal((await estado(p)).cells, 1, "filtro por tipo: sólo la de rizos");
      await p.locator(".gal-page-piece").first().click(); await p.waitForSelector("dialog.gal-lightbox[open]", { timeout: 10000 }); await p.waitForTimeout(200);
      const lb = await p.evaluate(`(() => { const d = document.querySelector("dialog.gal-lightbox"); return { open: !!d?.open, type: d?.querySelector(".gal-lb-type")?.textContent, book: !!d?.querySelector(".gal-lb-book") }; })()`) as { open: boolean; type: string; book: boolean };
      assert.ok(lb.open && lb.type === "תלתלים" && !lb.book, "lightbox con etiqueta de tipo; rizos sin serviceId → sin reservar: " + JSON.stringify(lb));
      await p.keyboard.press("Escape"); await p.waitForFunction(`!document.querySelector("dialog.gal-lightbox") && document.activeElement?.className === "gal-page-piece"`, null, { timeout: 10000 });
      assert.equal(await p.evaluate(`document.activeElement?.className`), "gal-page-piece", "Escape cierra y devuelve el foco a la pieza");
      await p.locator(".gal-pill[aria-checked=true]").focus(); await p.keyboard.press("ArrowLeft"); await p.waitForFunction(`document.querySelector(".gal-pill[aria-checked=true]")?.textContent !== "תלתלים"`, null, { timeout: 10000 });
      const k = await p.evaluate(`(() => ({ on: document.querySelector(".gal-pill[aria-checked=true]")?.textContent, focus: document.activeElement?.textContent }))()`) as { on: string; focus: string };
      assert.ok(k.on === "החלקה" && k.focus === "החלקה", "flecha (RTL: izquierda = siguiente) mueve selección y foco: " + JSON.stringify(k));
      await p.locator(".gal-pill").first().click(); await p.waitForFunction(`document.querySelectorAll(".gal-page-cell").length === 6`, null, { timeout: 10000 }); await p.locator(".gal-page-piece").first().click(); await p.waitForSelector("dialog.gal-lightbox[open] .gal-lb-book", { timeout: 10000 });
      await p.locator(".gal-lb-slide").first().locator(".gal-lb-book").click(); await p.waitForSelector('[role="dialog"]', { timeout: 15000 });
      assert.equal(await p.evaluate(`!!document.querySelector("dialog.gal-lightbox")`), false, "reservar cierra el lightbox");
      assert.equal(await p.evaluate(`!!document.querySelector('[role="dialog"]')`), true, "reservar abre el wizard");
      await ctx.close();
    });
    await conFixture("g04-c", C, async (url) => { const { ctx, p } = await abrir(url, 6); const e = await estado(p); assert.equal(e.cells, 6); assert.equal(e.pills.length, 7, "C: todo + 6 tipos"); await ctx.close(); });
    const conItems = (n: number, sinTipo = false) => ({ ...A, sections: { ...A.sections, gallery: { ...A.sections.gallery, selection: undefined, items: Array.from({ length: n }, (_, i) => ({ id: `x${i}`, src: A.sections.gallery.items[i % 6].src, type: sinTipo ? undefined : GALLERY_TYPES[i % 6] })) } } });
    await conFixture("g04-12", conItems(12), async (url) => { const { ctx, p } = await abrir(url, 12); const e = await estado(p); assert.equal(e.cells, 12, "12 piezas"); await p.locator(".gal-pill").nth(1).click(); await p.waitForFunction(`document.querySelectorAll(".gal-page-cell").length === 2`, null, { timeout: 10000 }); assert.equal((await estado(p)).cells, 2, "12 → 2 por tipo"); await ctx.close(); });
    await conFixture("g04-24", conItems(24), async (url) => { const { ctx, p } = await abrir(url, 24); assert.equal((await estado(p)).cells, 24, "24 piezas"); await ctx.close(); });
    await conFixture("g04-sintipo", conItems(6, true), async (url) => { const { ctx, p } = await abrir(url, 6); const e = await estado(p); assert.equal(e.pills.length, 0, "sin type → sin píldoras"); assert.equal(e.cells, 6); await ctx.close(); });
    await conFixture("g04-sinitems", { ...A, sections: { ...A.sections, gallery: { ...A.sections.gallery, items: undefined, selection: undefined } } }, async (url) => { const { ctx, p } = await abrir(url, A.gallery.length); const e = await estado(p); assert.equal(e.cells, A.gallery.length, "sin items → gallery[] de respaldo"); assert.equal(e.pills.length, 0); await ctx.close(); });
  } finally { await b.close(); }
});
