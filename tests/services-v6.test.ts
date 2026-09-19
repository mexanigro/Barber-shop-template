// SERVICES-02 fase 2 (2026-09-19): services v6 «con precios» = tarjeta-botón (CONTRATOS § services v6). Guard:
// (i) estático — la tarjeta es UN solo control (<button>/<a> con aria-label), sin div con onClick; la entrada no lleva
//     desplazamiento ni escalón (sin y:/x:/clipPath en el fundido) y dura ≤ 250 ms; título debajo (aria-labelledby).
// (ii) página real (Vite en proceso, fixture A, 375): las 2 destacadas son botones/enlaces con nombre «servicio · precio ·
//     acción»; Tab llega a la tarjeta y Enter abre el wizard; «ver todos» lleva a /servicios (SPA, sin recarga) con h1 y
//     vuelta a /; con prefers-reduced-motion la tarjeta no se transforma al hover.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { pickFeatured, priceLabel } from "../src/lib/services-v6";

const ROOT = resolve(import.meta.dirname, "..");
const rd = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

test("tarjeta-botón: un solo control con nombre accesible; entrada sólo opacidad ≤ 250 ms; h2 debajo con aria-labelledby", () => {
  const src = rd("src/components/landing/services/services-v6.tsx");
  assert.match(src, /<button type="button" onClick=\{\(\) => onBookClick\(s\.id\)\} aria-label=\{label\} className=\{cls\}>\{inner\}<\/button>/, "la tarjeta reserva debe ser un <button> con aria-label");
  assert.match(src, /<a href=\{`https:\/\/wa\.me\/\$\{wa\}\?text=[^`]*`\} target="_blank" rel="noopener noreferrer" aria-label=\{label\} className=\{cls\}>\{inner\}<\/a>/, "la tarjeta consulta debe ser un <a> con aria-label");
  assert.ok(!/<div[^>]*onClick/.test(src), "ningún div con onClick");
  assert.match(src, /const label = `\$\{s\.name\} · /, "nombre accesible «servicio · precio · acción»");
  assert.match(src, /focus-visible:ring-2 focus-visible:ring-\[color:var\(--accent-strong\)\]/, "foco visible en acento");
  const fade = src.slice(src.indexOf("const fade ="), src.indexOf("\n", src.indexOf("const fade =")));
  assert.ok(!/\by:|\bx:|clipPath|scale/.test(fade), "la entrada no puede desplazar ni escalar: " + fade);
  assert.match(src, /const FADE = 0\.(0\d|1\d|2[0-5])\b/, "fundido ≤ 250 ms");
  assert.match(fade, /duration: FADE/);
  assert.match(src, /aria-labelledby="services-title"/);
  const iH2 = src.indexOf('id="services-title"'); const iUl = src.indexOf("svc-carousel");
  assert.ok(iUl > 0 && iH2 > iUl, "el h2 va después de las tarjetas (R23)");
  const css = rd("src/index.css");
  assert.match(css, /\.svc-card::before \{[\s\S]*mask-composite: exclude;/, "borde con luz por máscara");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.svc-card, \.svc-card:hover, \.svc-card:active \{ transform: none; transition: none; \}/, "reduced-motion: sin volumen");
});

test("moldeabilidad: featured (2 ids / 1 id / ninguno), consulta sin precio, gratis", () => {
  const svc = (id: string, x: Partial<import("../src/types").Service> = {}) => ({ id, name: id, description: "", duration: 60, price: 100, ...x }) as import("../src/types").Service;
  const cat = [svc("a"), svc("b", { popular: true }), svc("c"), svc("d", { popular: true })];
  assert.deepEqual(pickFeatured(cat, ["c", "a"]).map((s) => s.id), ["c", "a"], "2 ids válidos, en su orden");
  assert.deepEqual(pickFeatured(cat, ["c"]).map((s) => s.id), ["b", "d"], "1 id → cae a los 2 popular");
  assert.deepEqual(pickFeatured(cat, ["zz", "c"]).map((s) => s.id), ["b", "d"], "id inexistente → cae a popular");
  assert.deepEqual(pickFeatured([svc("a"), svc("b"), svc("c")]).map((s) => s.id), ["a", "b"], "sin popular → los 2 primeros");
  assert.deepEqual(pickFeatured([svc("a")]).map((s) => s.id), ["a"], "1 servicio → 1 tarjeta");
  const t = { fromPrice: "החל מ", byQuote: "לפי אבחון", free: "חינם" };
  assert.deepEqual(priceLabel(svc("q", { mode: "consulta", price: 0 }), "₪", t), { main: "לפי אבחון" }, "consulta sin precio");
  assert.deepEqual(priceLabel(svc("q", { mode: "consulta", price: 600 }), "₪", t), { prefix: "החל מ", main: "₪600" });
  assert.deepEqual(priceLabel(svc("r", { price: 120, priceMax: 350 }), "₪", t), { main: "₪120–350" });
  assert.deepEqual(priceLabel(svc("f", { price: 0 }), "₪", t), { main: "חינם" });
});

test("página real (A, 375): tarjetas accesibles, teclado, /servicios y vuelta", async () => {
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false"; process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = "peluqueria-paleta-a"; process.env.VITE_HERO_CLIP = "";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
  await vite.listen(); const url = vite.resolvedUrls!.local[0];
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); await p.goto(url, { waitUntil: "networkidle" }); await p.waitForSelector("#services .svc-card");
    const cards = p.locator("#services .svc-card");
    assert.equal(await cards.count(), 2, "dos destacadas");
    const fx = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures/peluqueria-paleta-a.json"), "utf8"));
    for (let i = 0; i < 2; i++) {
      const c = cards.nth(i); const tag = await c.evaluate((el: Element) => el.tagName.toLowerCase()); const name = (await c.getAttribute("aria-label")) || "";
      assert.ok(tag === "button" || tag === "a", `tarjeta ${i}: ${tag}`);
      const svc = fx.services.find((s: { name: string }) => name.startsWith(s.name + " · "));
      assert.ok(svc, `tarjeta ${i}: nombre accesible «${name}» no empieza por un servicio del catálogo`);
      assert.match(name, /₪\d|לפי אבחון/, `tarjeta ${i}: el nombre accesible lleva el precio: «${name}»`);
      const box = await c.boundingBox(); assert.ok(box && box.height >= 44, `tarjeta ${i}: área táctil`);
      const r = await c.evaluate((el: Element) => ({ role: (el as HTMLElement).getAttribute("role") || el.tagName.toLowerCase() }));
      assert.ok(["button", "a"].includes(r.role));
    }
    // teclado: foco en la primera tarjeta reserva y Enter → wizard
    const reserva = cards.filter({ has: p.locator("xpath=self::button") }).first();
    await reserva.focus(); assert.ok(await reserva.evaluate((el: Element) => el === document.activeElement), "Tab/focus llega a la tarjeta");
    const cerrar = p.locator('button[aria-label="סגירה"]'); // el botón de cierre del wizard (BookingWizard: a11y.close)
    assert.equal(await cerrar.count(), 0, "el wizard no está abierto antes de Enter");
    await p.keyboard.press("Enter"); await p.waitForTimeout(800);
    assert.ok((await cerrar.count()) > 0, "Enter sobre la tarjeta abre el wizard");
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    // ver todos → /servicios sin recarga; h1; vuelta
    await p.evaluate(`window.__spa = 1`);
    await p.locator("#services button").last().click(); await p.waitForTimeout(800);
    assert.equal(await p.evaluate("location.pathname"), "/servicios");
    assert.equal(await p.evaluate("window.__spa"), 1, "navegación SPA (sin recarga)");
    assert.ok((await p.locator("main h1").count()) === 1, "h1 en /servicios");
    assert.ok((await p.locator("main li").count()) >= fx.services.length, "catálogo completo");
    await p.locator("main button").first().click(); await p.waitForTimeout(600);
    assert.equal(await p.evaluate("location.pathname"), "/");
    await ctx.close();
    // reduced motion: sin transform al hover
    const ctx2 = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const p2 = await ctx2.newPage(); await p2.goto(url, { waitUntil: "networkidle" }); await p2.waitForSelector("#services .svc-card");
    const c2 = p2.locator("#services .svc-card").first(); await c2.scrollIntoViewIfNeeded(); await c2.hover(); await p2.waitForTimeout(250);
    assert.equal(await c2.evaluate((el: Element) => getComputedStyle(el).transform), "none", "reduced-motion: la tarjeta no se transforma");
    await ctx2.close();
  } finally { await b.close(); await vite.close(); }
});
