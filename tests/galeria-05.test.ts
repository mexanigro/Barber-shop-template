// GALERIA-05 (2026-09-20): A2 `alt` obligatorio en los 4 idiomas (items[].alt en el idioma base, translations[lang].sections.gallery.alts
// por id en los otros; estructura de sections —images, featured, surface, veil, selection, items— conservada al cambiar de idioma);
// B pieza que «se levanta» al apoyar el dedo (pointerdown → data-pressed; scroll/pointercancel → baja; sin abrir el lightbox tras
// desplazarse). Estático + config real (Vite ssrLoadModule) + página real (Chromium táctil, fixture A y C, 375).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { altOf } from "../src/lib/gallery";

const ROOT = resolve(import.meta.dirname, "..");
const rd = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
const LANGS = ["en", "ru", "ar"] as const;

test("A2 estático: fixtures A/C con alt en he y alts en en/ru/ar para cada pieza; altOf nunca vacío; estructura de sections conservada por idioma", () => {
  for (const pal of ["a", "c"]) {
    const fx = JSON.parse(readFileSync(resolve(ROOT, `dev-fixtures/peluqueria-paleta-${pal}.json`), "utf8"));
    const items = fx.sections.gallery.items as Array<{ id: string; src: string; alt?: string }>;
    assert.ok(items.length >= 6, `${pal}: ≥ 6 piezas`);
    for (const it of items) assert.ok(typeof it.alt === "string" && it.alt.trim().length > 0, `${pal}: ${it.id} sin alt (he)`);
    for (const l of LANGS) { const alts = fx.translations?.[l]?.sections?.gallery?.alts ?? {}; for (const it of items) assert.ok(typeof alts[it.id] === "string" && alts[it.id].trim().length > 0, `${pal}: ${it.id} sin alt en ${l}`); }
    assert.deepEqual(fx.gallery, items.map((i) => i.src), `${pal}: gallery[] de la raíz = src de items (respaldo)`);
  }
  assert.equal(altOf({ id: "x", src: "/x.jpg", type: "novia", alt: "he" }, 0, { alts: { x: "en" } }, () => "tipo", "n{n}"), "en", "alts[id] primero");
  assert.equal(altOf({ id: "x", src: "/x.jpg", type: "novia", alt: "he" }, 0, undefined, () => "tipo", "n{n}"), "he", "items[].alt en el idioma base");
  assert.equal(altOf({ id: "x", src: "/x.jpg", type: "novia" }, 0, {}, (t) => (t === "novia" ? "כלות" : undefined), "n{n}"), "כלות", "etiqueta del tipo");
  assert.equal(altOf({ id: "x", src: "/x.jpg" }, 2, {}, () => undefined, "תמונה {n}"), "תמונה 3", "respaldo numerado");
  const site = rd("src/config/site.ts");
  assert.match(site, /"images", "featured", "surface", "veil", "selection", "items",/, "estructura de sections conservada en otro idioma");
  assert.match(site, /const \{ alt: _alt, \.\.\.rest \} = it as Record<string, unknown>; return rest;/, "el alt (texto) no viaja con items a otro idioma");
  for (const f of ["src/components/landing/gallery/gallery-v6.tsx", "src/components/gallery/gallery-page-v6.tsx"]) { const s = rd(f); assert.match(s, /<img src=\{it\.src\} alt=\{alt\(it, i\)\}/, `${f}: alt en la imagen`); assert.ok(!/<button[^>]*aria-label=\{alt/.test(s), `${f}: sin aria-label duplicado en el botón`); }
});

test("A2 config real: al cambiar a en/ru/ar la galería conserva items/selection/surface y el alt viene de translations; vuelta a he intacta", async () => {
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_CLIENT_ID = "test-g05";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { middlewareMode: true }, logLevel: "silent", appType: "custom" });
  try {
    const site = (await vite.ssrLoadModule("/src/config/site.ts")) as { siteConfig: Record<string, any>; applyTenantConfigOverride: (o: unknown) => void; switchSiteLanguage: (l: string) => void };
    const fx = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures/peluqueria-paleta-a.json"), "utf8"));
    site.applyTenantConfigOverride(fx);
    for (const l of [...LANGS, "he"]) {
      site.switchSiteLanguage(l); const g = site.siteConfig.sections.gallery; const s = site.siteConfig.sections.services;
      assert.equal(g.items?.length, 6, `${l}: items`); assert.equal(g.selection?.length, 6, `${l}: selection`); assert.equal(g.surface, "textura", `${l}: surface`);
      assert.match(String(s.images?.[0]), /(paleta-a\/|test-b4-peluqueria-a%2Fmedia%2Fservices%2F)servicio-1/ /* CONEXION-01: local o Storage */, `${l}: fotos de servicios del cliente, no del preset`); assert.equal(s.surface, "velo", `${l}: velo de services`);
      if (l === "he") { assert.equal(g.items[0].alt, fx.sections.gallery.items[0].alt, "he: alt del cliente"); assert.equal(g.alts, undefined); }
      else { assert.equal(g.items[0].alt, undefined, `${l}: el alt hebreo no viaja`); assert.equal(g.alts?.["g-color"], fx.translations[l].sections.gallery.alts["g-color"], `${l}: alt traducido`); }
    }
  } finally { await vite.close(); }
});

async function conFixture(nombre: string, fx: unknown, fn: (url: string) => Promise<void>) {
  const tmp = resolve(ROOT, `dev-fixtures/_tmp-${nombre}.json`); writeFileSync(tmp, JSON.stringify(fx));
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false"; process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = `_tmp-${nombre}`; process.env.VITE_HERO_CLIP = "";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1", watch: { ignored: ["**/dev-fixtures/_tmp-*"] } }, logLevel: "silent" }); // las fixtures temporales de otra suite en paralelo disparaban full-reload (Vite watch) a mitad de la prueba
  await vite.listen(); try { await fn(vite.resolvedUrls!.local[0]); } finally { await vite.close(); rmSync(tmp, { force: true }); }
}

test("página real (A y C, 375): alt no vacío en las piezas de la home y de /galeria; pieza que se levanta al apoyar y baja al mover; desplazarse no abre el lightbox; tap limpio abre", async () => {
  const b = await chromium.launch();
  try {
    for (const pal of ["a", "c"]) {
      const fx = JSON.parse(readFileSync(resolve(ROOT, `dev-fixtures/peluqueria-paleta-${pal}.json`), "utf8"));
      await conFixture(`g05-${pal}`, fx, async (url) => {
        const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
        await p.goto(url, { waitUntil: "networkidle", timeout: 90000 } /* CONEXION-01: la galería viene de Storage, depende de la red */); await p.waitForFunction(`document.querySelectorAll("#gallery .gal-img").length === 6`, null, { timeout: 30000 });
        await p.waitForFunction(`!document.querySelector('[role="dialog"][aria-modal="true"].fixed')`, null, { timeout: 15000 }); // el splash (z-200) tapa la página ~1,5 s
        const alts = await p.evaluate(`[...document.querySelectorAll("#gallery .gal-img")].map((i) => i.getAttribute("alt"))`) as string[];
        assert.ok(alts.every((a) => a && a.trim().length > 0), `${pal}: alt de la home: ` + JSON.stringify(alts));
        assert.equal(await p.evaluate(`document.querySelectorAll("#gallery .gal-piece[aria-label]").length`), 0, `${pal}: el nombre accesible sale del alt, no de aria-label`);
        // B · presión: apoyar → data-pressed; mover 40 px → baja y NO abre; soltar sin mover → abre
        const piece = p.locator("#gallery .gal-piece").first(); await piece.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
        const box = (await piece.boundingBox())!; const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        const cdp = await ctx.newCDPSession(p);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] }); await p.waitForFunction(`document.querySelector("#gallery .gal-piece")?.dataset.pressed === "1"`, null, { timeout: 5000 }).catch(() => {});
        const pressed = await p.evaluate(`(() => { const el = document.querySelector("#gallery .gal-piece"); return { pressed: el.dataset.pressed, tf: getComputedStyle(el).transform }; })()`) as { pressed: string; tf: string };
        assert.equal(pressed.pressed, "1", `${pal}: apoyar el dedo eleva la pieza (data-pressed)`); assert.notEqual(pressed.tf, "none", `${pal}: transform al apoyar: ${pressed.tf}`);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx, y: cy - 40 }] }); await p.waitForFunction(`document.querySelector("#gallery .gal-piece")?.dataset.pressed === undefined`, null, { timeout: 5000 }).catch(() => {});
        assert.equal(await p.evaluate(`document.querySelector("#gallery .gal-piece").dataset.pressed`), undefined, `${pal}: al mover baja`);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await p.waitForTimeout(600);
        assert.equal(await p.evaluate(`!!document.querySelector("dialog.gal-lightbox")`), false, `${pal}: desplazarse no abre el lightbox`);
        await p.waitForTimeout(500); await piece.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await piece.tap(); await p.waitForSelector("dialog.gal-lightbox[open]", { timeout: 8000 }).catch(async () => { await piece.tap(); await p.waitForSelector("dialog.gal-lightbox[open]", { timeout: 8000 }); }); // el touchMove anterior desplaza la página; un tap durante la inercia se toma como scroll
        await p.keyboard.press("Escape"); await p.waitForFunction(`!document.querySelector("dialog.gal-lightbox")`, null, { timeout: 10000 }); await p.waitForTimeout(300);
        assert.equal(await p.evaluate(`document.querySelector("#gallery .gal-piece").dataset.pressed`), undefined, `${pal}: tras el tap la pieza vuelve a reposo`);
        // /galeria
        await p.goto(url + "galeria", { waitUntil: "networkidle", timeout: 90000 }); await p.waitForFunction(`document.querySelectorAll(".gal-page-piece img").length === 6`, null, { timeout: 30000 });
        await p.waitForFunction(`!document.querySelector('[role="dialog"][aria-modal="true"].fixed')`, null, { timeout: 15000 });
        const alts2 = await p.evaluate(`[...document.querySelectorAll(".gal-page-piece img")].map((i) => i.getAttribute("alt"))`) as string[];
        assert.ok(alts2.every((a) => a && a.trim().length > 0), `${pal}: alt de /galeria: ` + JSON.stringify(alts2));
        const pc = p.locator(".gal-page-piece").first(); const bb = (await pc.boundingBox())!;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bb.x + 20, y: bb.y + 20 }] }); await p.waitForFunction(`document.querySelector(".gal-page-piece")?.dataset.pressed === "1"`, null, { timeout: 5000 }).catch(() => {});
        assert.equal(await p.evaluate(`document.querySelector(".gal-page-piece").dataset.pressed`), "1", `${pal}: /galeria también se levanta`);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] }); await p.waitForFunction(`document.querySelector(".gal-page-piece")?.dataset.pressed === undefined`, null, { timeout: 5000 }).catch(() => {});
        assert.equal(await p.evaluate(`document.querySelector(".gal-page-piece").dataset.pressed`), undefined, `${pal}: pointercancel baja`);
        await ctx.close();
      });
    }
  } finally { await b.close(); }
});
