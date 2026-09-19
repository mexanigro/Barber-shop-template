// SERVICES-02 fase 2/2b (2026-09-19): services v6 «con precios» = tarjeta-botón en carrusel 3D (CONTRATOS § services v6). Guard:
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
import { pickFeatured, priceLabel, orderFeatured } from "../src/lib/services-v6";

const ROOT = resolve(import.meta.dirname, "..");
const rd = (p: string) => readFileSync(resolve(ROOT, p), "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");

test("tarjeta-botón: un solo control con nombre accesible; entrada sólo opacidad ≤ 250 ms; h2 debajo con aria-labelledby", () => {
  const src = rd("src/components/landing/services/services-v6.tsx");
  assert.match(src, /<button type="button" onClick=\{\(e\) => \{ if \(lateral\(e\) && e\.detail > 0\) \{ centrar\(e\.currentTarget\); return; \} onBookClick\(s\.id\); \}\} aria-label=\{label\} className=\{cls\} onFocus=\{onFocus\}>\{inner\}<\/button>/, "la tarjeta reserva debe ser un <button> con aria-label (y tocar-centra en lateral)");
  assert.match(src, /<a href=\{`https:\/\/wa\.me\/\$\{wa\}\?text=[^`]*`\} target="_blank" rel="noopener noreferrer" aria-label=\{label\} className=\{cls\} onFocus=\{onFocus\} onClick=/, "la tarjeta consulta debe ser un <a> con aria-label");
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
  // fase 2b: impresión 3D por posición (escala 1,2 / opacidad 0,5 / 200 ms, Smaja) sin perspective/rotate; reduced-motion sin transform
  assert.match(src, /function useAxisDistance/, "listener de scroll que pone --d por slide");
  assert.match(src, /li\.style\.setProperty\("--d", d\.toFixed\(3\)\)/);
  // fase 2c: laterales a opacidad 1 (sin --svc-dim), parallax de la foto por --dx, texto sólo en la central, pista de entrada, tocar-centra
  assert.match(css, /\.svc-card \{[\s\S]*?transform: scale\(calc\(1 \+ var\(--svc-zoom\) \* \(1 - var\(--d, 1\)\)\)\);[\s\S]*?transition: transform 200ms ease, box-shadow 200ms ease;/, "tarjeta: escala por --d, 200 ms");
  assert.ok(!/--svc-dim/.test(css) && !/\.svc-card \{[^}]*opacity/.test(css), "las laterales no se atenúan (L-A descartado)");
  assert.match(css, /--svc-zoom: 0\.2;/); assert.match(css, /--svc-parallax: 6%;/);
  assert.match(css, /\.svc-img \{ transform: translateX\(calc\(var\(--dx, 0\) \* var\(--svc-parallax\) \* -1\)\)/, "parallax de la foto (L-D)");
  assert.match(css, /\.svc-slide\[data-centrada="0"\] \.svc-card-band > \* \{ opacity: 0; \}/, "texto sólo en la central (L-C): legible o ausente, por data-centrada, no por --d");
  assert.match(src, /flex flex-wrap items-baseline gap-x-2[\s\S]{0,120}<Price s=\{s\} className="whitespace-nowrap/, "precio entero (nowrap), la fila envuelve por unidades");
  assert.match(css, /\.svc-name \{[^}]*max-height: calc\(2 \* 1\.375em\); overflow: hidden;/, "nombre a dos líneas sin puntos suspensivos");
  assert.ok(!/line-clamp/.test(src.slice(src.indexOf("svc-name"), src.indexOf("svc-name") + 80)), "sin line-clamp en el nombre (pone «…»)");
  assert.match(src, /function useEntryHint/, "pista de entrada (E-C)");
  assert.match(src, /const lateral = /, "tocar una lateral la centra (N-C)");
  assert.match(css, /--svc-pt: 4\.5rem;/, "aire para la píldora del navbar");
  assert.match(css, /@media \(min-width: 1024px\) \{[\s\S]*?--svc-zoom: 0; --svc-parallax: 0%;[\s\S]*?\.svc-slide \{ scroll-snap-align: start; \}[\s\S]*?\.svc-card:hover \{ transform: translateY\(-4px\)/, "1280: tres iguales sin escala, snap start, hover relieve (D-A)");
  assert.ok(!/\.svc-card[^{]*\{[^}]*(perspective|rotate)/.test(css), "sin perspective/rotate (la referencia no gira)");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.svc-card, \.svc-card:active, \.svc-card:hover, \.svc-img \{ transform: none; transition: none; animation: none; \}/, "reduced-motion: sin transform");
  assert.match(css, /html\.dark\[data-niche="peluqueria"\] \.svc-card \{ border: 1px solid var\(--accent-strong\); \}/, "oscuro: borde de acento");
});

test("moldeabilidad: featured (2 ids / 1 id / ninguno), consulta sin precio, gratis", () => {
  const svc = (id: string, x: Partial<import("../src/types").Service> = {}) => ({ id, name: id, description: "", duration: 60, price: 100, ...x }) as import("../src/types").Service;
  const cat = [svc("a"), svc("b", { popular: true }), svc("c"), svc("d", { popular: true })];
  assert.deepEqual(pickFeatured(cat, ["c", "a"]).map((s) => s.id), ["c", "a"], "2 ids válidos, en su orden");
  assert.deepEqual(pickFeatured(cat, ["c"]).map((s) => s.id), ["b", "d"], "1 id → cae a los 2 popular");
  assert.deepEqual(pickFeatured(cat, ["zz", "c"]).map((s) => s.id), ["b", "d"], "id inexistente → cae a popular");
  assert.deepEqual(pickFeatured([svc("a"), svc("b"), svc("c")]).map((s) => s.id), ["a", "b"], "sin popular → los 2 primeros");
  assert.deepEqual(pickFeatured([svc("a")]).map((s) => s.id), ["a"], "1 servicio → 1 tarjeta");
  assert.deepEqual(orderFeatured(cat, ["c", "a"]).map((s) => s.id), ["c", "a", "b", "d"], "fase 2b: featured es orden, se muestran todas");
  assert.deepEqual(orderFeatured(cat, ["zz"]).map((s) => s.id), ["a", "b", "c", "d"], "id inexistente → orden del catálogo");
  assert.deepEqual(orderFeatured(cat).map((s) => s.id), ["a", "b", "c", "d"]);
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
    const fx = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures/peluqueria-paleta-a.json"), "utf8"));
    const conFoto = fx.services.filter((_: unknown, i: number) => !!fx.sections.services.images?.[i]).length;
    assert.equal(await cards.count(), conFoto, `todas las del catálogo con foto (${conFoto})`);
    // impresión 3D por posición: la central escala 1,2 y opacidad 1; una lateral escala 1 y opacidad 0,5
    const geo = await p.evaluate(`(() => { const lis = [...document.querySelectorAll("#services .svc-slide")]; return lis.map((li) => { const c = li.querySelector(".svc-card"); const cs = getComputedStyle(c); return { d: +li.style.getPropertyValue("--d"), z: +li.style.zIndex, op: +cs.opacity, sc: cs.transform === "none" ? 1 : +cs.transform.split("(")[1].split(",")[0] }; }); })()`) as { d: number; z: number; op: number; sc: number }[];
    const central = geo.find((g) => g.d === 0); const lateral = geo.find((g) => g.d === 1);
    assert.ok(central && Math.abs(central.sc - 1.2) < 0.01 && central.op === 1 && central.z === 100, "central: escala 1,2 · opacidad 1 · z 100: " + JSON.stringify(central));
    assert.ok(lateral && lateral.sc === 1 && lateral.op === 1 && lateral.z === 0, "lateral: escala 1 · opacidad 1 (no atenuada) · z 0: " + JSON.stringify(lateral));
    const txt = await p.evaluate(`(() => [...document.querySelectorAll("#services .svc-slide")].map((li) => ({ cen: li.dataset.centrada, op: +getComputedStyle(li.querySelector(".svc-name")).opacity, priceLines: (() => { const e = li.querySelector(".svc-name").parentElement.lastElementChild.firstElementChild.firstElementChild; return Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)); })() })))()`) as { cen: string; op: number; priceLines: number }[];
    assert.ok(txt.filter((x) => x.cen === "1").every((x) => x.op === 1) && txt.filter((x) => x.cen === "0").every((x) => x.op === 0), "texto: central 1 · laterales 0 (legible o ausente): " + JSON.stringify(txt));
    assert.ok(txt.every((x) => x.priceLines === 1), "el precio no se parte (nada de «₪180–» / «420»): " + JSON.stringify(txt.map((x) => x.priceLines)));
    // N-C: tocar una lateral la centra en vez de ejecutar (el wizard no se abre)
    const latLabel = await p.locator("#services .svc-slide[data-centrada='0'] .svc-card").first().getAttribute("aria-label");
    await p.locator(`#services .svc-card[aria-label="${latLabel}"]`).click(); await p.waitForTimeout(900);
    assert.equal(await p.locator('[data-testid="booking-wizard"]').count(), 0, "tocar una lateral no abre el wizard");
    assert.equal(await p.locator(`#services .svc-card[aria-label="${latLabel}"]`).evaluate((el: Element) => (el.closest("li") as HTMLElement).dataset.centrada), "1", "tocar una lateral la centra");
    for (let i = 0; i < 3; i++) {
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
    const cerrar = p.locator('[data-testid="booking-wizard"]'); // el wizard (role=dialog)
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
    // 1280 (D-A): tres tarjetas enteras e iguales dentro del bloque, ninguna asomando; sin escala; flechas fuera del bloque
    const ctx3 = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p3 = await ctx3.newPage(); await p3.goto(url, { waitUntil: "networkidle" }); await p3.waitForSelector("#services .svc-card"); await p3.locator("#services .svc-carousel").scrollIntoViewIfNeeded(); await p3.waitForTimeout(600);
    const d = await p3.evaluate(`(() => { const ul = document.querySelector("#services .svc-carousel"); const u = ul.getBoundingClientRect(); const cards = [...ul.querySelectorAll(".svc-card")].map((c) => c.getBoundingClientRect()).filter((r) => r.right > u.left + 1 && r.left < u.right - 1); const flechas = [...document.querySelectorAll("#services .svc-arrow")].map((a) => { const r = a.getBoundingClientRect(); return getComputedStyle(a).display !== "none" && (r.right <= u.left + 1 || r.left >= u.right - 1); }); return { n: cards.length, enteras: cards.every((r) => r.left >= u.left - 1 && r.right <= u.right + 1), iguales: new Set(cards.map((r) => Math.round(r.width))).size === 1, tf: getComputedStyle(ul.querySelector(".svc-card")).transform, flechas }; })()`) as { n: number; enteras: boolean; iguales: boolean; tf: string; flechas: boolean[] };
    assert.ok(d.n === 3 && d.enteras && d.iguales && d.tf === "none" && d.flechas.length === 2 && d.flechas.every(Boolean), "1280: tres enteras iguales, nada asoma, sin escala, flechas fuera: " + JSON.stringify(d));
    await ctx3.close();
  } finally { await b.close(); await vite.close(); }
});
