// GALERIA-05 C (2026-09-20, D4 de Liam): WebKit (motor de Safari) como ángulo de iOS sin Mac ni dispositivo — Playwright WebKit con
// `devices["iPhone 14"]` (viewport 390×844, UA de iPhone, táctil) sobre la página real (fixture A y C). Valida soporte CSS, layout y JS:
// hero cubre el viewport en 390×844 y en 390×664 (barra de Safari «visible» simulada por viewport más bajo), `mask-image` sobre el
// vídeo, `svh`/`lvh`, `currentSrc` = hero-v.mp4 y reproduce tras play() con muted, scroll-snap del carrusel, `/galeria` con <dialog>
// abriendo/cerrando, píldoras con foco, LANG-01 (lang/dir), pieza que se levanta al apoyar. Lo que WebKit no soporta se lista con
// su respaldo verificado. NO valida (se declara): barra real de Safari que se esconde, autoplay real, rendimiento del decodificador,
// `animation-timeline` en iOS. Certificación en iPhone real o BrowserStack: pendiente declarado en PLAN § Bloque 5.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { webkit, devices } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const IPHONE = devices["iPhone 14"];

async function conFixture(nombre: string, fn: (url: string) => Promise<void>) {
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false"; process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = nombre; process.env.VITE_HERO_CLIP = "";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
  await vite.listen(); try { await fn(vite.resolvedUrls!.local[0]); } finally { await vite.close(); }
}

export const SOPORTE = ["mask-image: linear-gradient(#000, transparent)", "height: 100svh", "height: 100lvh", "height: 100dvh", "scroll-snap-type: x mandatory", "aspect-ratio: 4 / 5", "color: color-mix(in oklab, red, blue)", "animation-timeline: scroll()", "overflow: clip", "scale: .96", "transform-style: preserve-3d"];

test("WebKit iPhone 14 (A y C): soporte CSS, hero a viewport (844 y 664), máscara del vídeo, hero-v.mp4 reproduce, carrusel con snap, /galeria con dialog y píldoras, lang/dir, pieza que se levanta", async () => {
  const b = await webkit.launch(); const noSoportado: string[] = [];
  try {
    for (const pal of ["a", "c"]) {
      await conFixture(`peluqueria-paleta-${pal}`, async (url) => {
        // hero a viewport en 844 (barra oculta) y 664 (barra visible): un contexto por alto — en WebKit emulado las unidades vh/svh/lvh
        // quedan fijadas al viewport inicial del contexto (setViewportSize no las mueve; medido), así que no se redimensiona en caliente
        for (const h of [844, 664]) {
          const c2 = await b.newContext({ ...IPHONE, viewport: { width: 390, height: h }, locale: "he-IL" }); const p2 = await c2.newPage();
          await p2.goto(url, { waitUntil: "networkidle" }); await p2.waitForSelector("#hero video"); await p2.waitForFunction(() => !document.querySelector('[role="dialog"][aria-modal="true"].fixed'), null, { timeout: 15000 });
          const m = await p2.evaluate(() => { const box = document.querySelector(".hero-v6-box")!.getBoundingClientRect(); const bl = document.querySelector(".hero-v6-block")!.getBoundingClientRect(); const media = document.querySelector<HTMLElement>(".hero-v6-media")!; const cs = getComputedStyle(media); return { box: box.height, block: bl.height, vh: innerHeight, mask: (cs as unknown as Record<string, string>).webkitMaskImage || cs.maskImage }; });
          assert.equal(m.vh, h, `${pal}: innerHeight ${m.vh} = viewport ${h} (meta viewport en la app)`);
          assert.ok(m.box >= m.vh - 1, `${pal} ${h}: la caja del hero cubre el viewport (${m.box} vs ${m.vh})`);
          assert.ok(m.block >= m.vh - 1, `${pal} ${h}: el bloque del hero cubre el viewport (${m.block} vs ${m.vh})`);
          assert.match(m.mask, /linear-gradient/, `${pal} ${h}: máscara alfa aplicada al vídeo: ${m.mask}`);
          await c2.close();
        }
        const ctx = await b.newContext({ ...IPHONE, viewport: { width: 390, height: 844 }, locale: "he-IL" }); const p = await ctx.newPage(); const errs: string[] = []; p.on("pageerror", (e) => errs.push(String(e)));
        await p.goto(url, { waitUntil: "networkidle" }); await p.waitForSelector("#hero video"); await p.waitForFunction(() => !document.querySelector('[role="dialog"][aria-modal="true"].fixed'), null, { timeout: 15000 });
        await p.waitForFunction(() => document.querySelectorAll("#gallery .gal-img").length === 6, null, { timeout: 30000 });
        assert.equal(p.viewportSize()?.width, 390, "viewport de iPhone 14"); assert.match(await p.evaluate(() => navigator.userAgent), /iPhone/, "UA de iPhone");
        // soporte CSS (sólo la primera paleta)
        if (pal === "a") { const sup = await p.evaluate((list) => list.map((d) => [d, CSS.supports(d)]), SOPORTE) as Array<[string, boolean]>; for (const [d, ok] of sup) if (!ok) noSoportado.push(d); }
        // LANG-01
        const ld = await p.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction }));
        assert.equal(ld.lang, "he"); assert.equal(ld.dir, "rtl");
        // vídeo: currentSrc y reproduce con muted (autoplay real no se valida)
        const playErr = await p.evaluate(async () => { const v = document.querySelector<HTMLVideoElement>("#hero video")!; v.muted = true; try { await v.play(); return ""; } catch (e) { return String(e); } });
        assert.equal(playErr, "", `${pal}: play() sin error`);
        await p.waitForFunction(() => { const v = document.querySelector<HTMLVideoElement>("#hero video")!; return !v.paused && v.currentTime > 0 && v.videoWidth > 0; }, null, { timeout: 20000 });
        const v = await p.evaluate(() => { const v = document.querySelector<HTMLVideoElement>("#hero video")!; return { src: (() => { const u = decodeURIComponent(new URL(v.currentSrc, location.href).pathname); const m = u.match(/(?:paleta-|test-b4-peluqueria-)([a-z0-9]+)[/](?:media[/][a-z]+[/])?([^/]+)$/); return m ? "paleta-" + m[1] + "/" + m[2] : u; })() /* CONEXION-01: local o Storage → paleta-<p>/<nombre> */, paused: v.paused, t: v.currentTime, w: v.videoWidth, h: v.videoHeight }; }) as { err?: string; src?: string; paused?: boolean; t?: number; w?: number; h?: number };
        assert.ok(!v.err, `${pal}: play() sin error: ${v.err}`); assert.equal(v.src, `paleta-${pal}/hero-v.mp4`, `${pal}: toma el 9:16 mp4`); assert.equal(v.paused, false, `${pal}: reproduce`); assert.ok((v.t ?? 0) > 0, `${pal}: avanza`); assert.ok(Math.abs((v.w ?? 0) / (v.h ?? 1) - 9 / 16) < 0.01, `${pal}: relación 9:16 (${v.w}×${v.h}; WebKit headless reporta videoWidth/Height escalados al viewport, no 1080×1920: se declara)`);
        // carrusel de services con scroll-snap
        const snap = await p.evaluate(() => { const ul = document.querySelector<HTMLElement>("#services .svc-carousel")!; ul.scrollIntoView(); const cs = getComputedStyle(ul); const li = ul.children[1] as HTMLElement; return { type: cs.scrollSnapType, align: getComputedStyle(li).scrollSnapAlign, n: ul.children.length, w: li.getBoundingClientRect().width }; });
        assert.match(snap.type, /x mandatory/, `${pal}: scroll-snap-type ${snap.type}`); assert.equal(snap.align, "center"); assert.ok(snap.n >= 3 && snap.w > 100, `${pal}: slides ${snap.n} × ${snap.w}px`);
        await p.evaluate(() => { const ul = document.querySelector<HTMLElement>("#services .svc-carousel")!; const w = (ul.firstElementChild as HTMLElement).getBoundingClientRect().width; ul.scrollBy({ left: -w * 1.3, behavior: "auto" }); });
        await p.waitForFunction(() => [...document.querySelectorAll<HTMLElement>("#services .svc-slide")].some((l) => l.dataset.centrada === "1"), null, { timeout: 10000 });
        const centrada = await p.evaluate(() => [...document.querySelectorAll<HTMLElement>("#services .svc-slide")].map((l) => l.dataset.centrada).join(""));
        assert.ok(centrada.includes("1"), `${pal}: tras desplazar hay una central (${centrada})`);
        // pieza que se levanta (táctil WebKit)
        const piece = p.locator("#gallery .gal-piece").first(); await piece.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
        const box = (await piece.boundingBox())!; const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        await p.touchscreen.tap(cx, cy); await p.waitForSelector("dialog.gal-lightbox[open]", { timeout: 10000 }); assert.equal(await p.evaluate(() => document.activeElement?.className), "gal-lb-close", `${pal}: el foco entra al lightbox (dialog modal)`);
        await p.keyboard.press("Escape"); await p.waitForFunction(() => !document.querySelector("dialog.gal-lightbox"), null, { timeout: 10000 });
        // WebKit: el <dialog> se desmonta (no hay restauración nativa) y el foco vuelve por el segundo intento del cierre (~150 ms medidos)
        await p.waitForFunction(() => document.activeElement?.className === "gal-piece", null, { timeout: 5000 }).catch(() => {});
        assert.equal(await p.evaluate(() => document.activeElement?.className), "gal-piece", `${pal}: Escape devuelve el foco (WebKit)`);
        await p.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y)!.closest(".gal-piece") as HTMLElement; el.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", clientX: x, clientY: y, bubbles: true })); }, { x: cx, y: cy }); await p.waitForFunction(() => document.querySelector<HTMLElement>("#gallery .gal-piece")!.dataset.pressed === "1", null, { timeout: 5000 });
        assert.equal(await p.evaluate(() => document.querySelector<HTMLElement>("#gallery .gal-piece")!.dataset.pressed), "1", `${pal}: pointerdown táctil eleva (WebKit)`);
        await p.evaluate(({ x, y }) => { const el = document.querySelector<HTMLElement>("#gallery .gal-piece")!; el.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: x, clientY: y - 40, bubbles: true })); }, { x: cx, y: cy }); await p.waitForFunction(() => document.querySelector<HTMLElement>("#gallery .gal-piece")!.dataset.pressed === undefined, null, { timeout: 5000 });
        assert.equal(await p.evaluate(() => document.querySelector<HTMLElement>("#gallery .gal-piece")!.dataset.pressed), undefined, `${pal}: mover 40 px baja (WebKit)`);
        // /galeria: dialog + píldoras con foco
        await p.goto(url + "galeria", { waitUntil: "networkidle" }); await p.waitForFunction(() => document.querySelectorAll(".gal-page-cell").length === 6, null, { timeout: 30000 }); await p.waitForFunction(() => !document.querySelector('[role="dialog"][aria-modal="true"].fixed'), null, { timeout: 15000 });
        await p.locator(".gal-pill").nth(2).focus(); assert.equal(await p.evaluate(() => document.activeElement?.className), "gal-pill", `${pal}: píldora con foco`);
        await p.keyboard.press("ArrowLeft"); await p.waitForFunction(() => document.querySelectorAll(".gal-page-cell").length === 1, null, { timeout: 10000 });
        const k = await p.evaluate(() => ({ on: document.querySelector(".gal-pill[aria-checked=true]")?.textContent, focus: document.activeElement?.textContent, cells: document.querySelectorAll(".gal-page-cell").length }));
        assert.ok(k.on === k.focus && k.cells === 1, `${pal}: flecha filtra y mueve el foco (WebKit): ${JSON.stringify(k)}`);
        await p.locator(".gal-page-piece").first().tap(); await p.waitForSelector("dialog.gal-lightbox[open]", { timeout: 10000 });
        const dlg = await p.evaluate(() => { const d = document.querySelector<HTMLDialogElement>("dialog.gal-lightbox")!; return { open: d.open, modal: d.matches(":modal"), type: !!d.querySelector(".gal-lb-type") }; });
        assert.ok(dlg.open && dlg.modal && dlg.type, `${pal}: <dialog> modal con pie en WebKit: ${JSON.stringify(dlg)}`);
        await p.keyboard.press("Escape"); await p.waitForFunction(() => !document.querySelector("dialog.gal-lightbox"), null, { timeout: 10000 });
        assert.deepEqual(errs, [], `${pal}: sin errores de página en WebKit`);
        await ctx.close();
      });
    }
  } finally { await b.close(); }
  // Lo que WebKit no soporta se declara y cada uno tiene respaldo en el código: animation-timeline → --gal-dy por rAF (gallery-v6.tsx) / IntersectionObserver.
  const respaldos: Record<string, RegExp> = { "animation-timeline: scroll()": /requestAnimationFrame\(tick\)/ };
  for (const d of noSoportado) { const r = respaldos[d]; assert.ok(r, `sin soporte en WebKit y sin respaldo declarado: ${d}`); assert.match(readFileSync(resolve(ROOT, "src/components/landing/gallery/gallery-v6.tsx"), "utf8"), r, `respaldo de ${d}`); }
  console.log("WebKit no soporta:", noSoportado.length ? noSoportado.join(" · ") : "(todo lo listado soportado)");
});
