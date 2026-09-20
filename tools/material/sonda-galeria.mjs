#!/usr/bin/env node
/**
 * sonda-galeria.mjs — GALERIA-01 (sólo lectura): cómo resuelve una web su galería de imágenes.
 * Por viewport (375×812 iPhone dpr 2, 1280×800): localiza el bloque con más <img> visibles (≥ 4, ≥ 80×80 px) y mide:
 *   composición (columnas por fila, relación de aspecto de las miniaturas, huecos, radio, sangrado, masonry = alturas distintas
 *   en una fila), imágenes (px servidos vs renderizados, formato, lazy, srcset/sizes, alt), filtro (botones/pestañas con pocas
 *   palabras cerca del bloque), apertura (qué pasa al tocar la primera: lightbox / ruta / nada), movimiento (transition/animation
 *   de la miniatura, transform al hover en 1280), fondo (background del bloque y de su sección), CLS al cargar, peso total de imágenes
 *   en 375 (bytes de red) y reduced-motion (transition con la media); GALERIA-02: movimiento (librerías, animation-timeline, snap; qué
 *   propiedades cambian en las piezas al hacer scroll; long tasks y frames > 33 ms con CPU ×4). Capturas: <tag>-<vk>.png, <tag>-<vk>-abierta.png.
 * Uso: node tools/material/sonda-galeria.mjs <url> --tag <id> --out <carpeta> [--solo 375|1280] [--scroll 1] [--espera 2500]
 *   --scroll: baja hasta el final antes de medir (galerías con lazy); --espera: ms tras cargar.
 * Salida: JSON <out>/<tag>.json + una línea por viewport. Es medida, no juicio.
 */
import { chromium } from "playwright"; import fs from "node:fs"; import path from "node:path";
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const url = args.find((a) => /^https?:/.test(a)); if (!url) { console.error("uso: sonda-galeria.mjs <url> --tag <id> --out <carpeta>"); process.exit(2); }
const tag = opt("tag", "web"), out = path.resolve(opt("out", "capturas/galeria")), solo = opt("solo", ""), espera = +opt("espera", 2500), scroll = opt("scroll", "0") === "1";
fs.mkdirSync(out, { recursive: true });
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const b = await chromium.launch(); const rep = { url, tag, fecha: new Date().toISOString().slice(0, 10), vistas: {} };
for (const vk of [375, 1280]) {
  if (solo && +solo !== vk) continue;
  const ctx = vk < 768 ? await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA_IPHONE }) : await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); let imgBytes = 0, imgN = 0; const fmts = {};
  p.on("response", async (r) => { try { const ct = r.headers()["content-type"] || ""; if (ct.startsWith("image/")) { const len = +(r.headers()["content-length"] || 0) || (await r.body().catch(() => Buffer.alloc(0))).length; imgBytes += len; imgN++; const f = ct.replace("image/", "").split(";")[0]; fmts[f] = (fmts[f] || 0) + 1; } } catch {} });
  await p.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {} });
  try { await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }); } catch (e) { rep.vistas[vk] = { error: String(e).slice(0, 120) }; console.log(`${tag} ${vk} ERROR ${String(e).slice(0, 100)}`); await ctx.close(); continue; }
  await p.waitForTimeout(espera);
  // cerrar banners de cookies habituales (sólo rechazo / cerrar)
  for (const sel of ['button:has-text("Reject")', 'button:has-text("Decline")', 'button:has-text("Rechazar")', 'button:has-text("Only necessary")', 'button:has-text("Necessary only")', '[aria-label="Close"]', 'button:has-text("Close")']) { try { const el = p.locator(sel).first(); if (await el.isVisible({ timeout: 300 })) { await el.click({ timeout: 800 }); await p.waitForTimeout(400); break; } } catch {} }
  if (scroll) { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight && y < 12000; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); }); await p.waitForTimeout(800); }
  let m; try { m = await p.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width >= 80 && r.height >= 80; };
    const imgs = [...document.querySelectorAll("img, picture img")].filter(vis);
    // agrupar por contenedor: el ancestro (hasta 6 niveles) que más imágenes visibles contiene con ≥ 4
    const count = new Map(); for (const im of imgs) { let el = im; for (let i = 0; i < 6 && el; i++) { el = el.parentElement; if (!el) break; count.set(el, (count.get(el) || 0) + 1); } }
    let best = null, bestN = 0; for (const [el, n] of count) { if (n >= 4) { const r = el.getBoundingClientRect(); if (n > bestN || (n === bestN && best && r.height < best.getBoundingClientRect().height)) { best = el; bestN = n; } } }
    // preferir el contenedor más pequeño que tenga el máximo
    if (best) { for (const [el, n] of count) if (n === bestN && best.contains(el) && el !== best) best = el; }
    if (!best) return { n: 0 };
    const items = [...best.querySelectorAll("img")].filter(vis).slice(0, 40);
    const rects = items.map((im) => { const r = im.getBoundingClientRect(); const cs = getComputedStyle(im); const box = im.closest("a, figure, li, article, div") || im; const bcs = getComputedStyle(box); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), nat: im.naturalWidth + "x" + im.naturalHeight, served: im.currentSrc.split("?")[0].split("/").pop()?.slice(-40), lazy: im.loading, srcset: !!(im.srcset || im.closest("picture")?.querySelector("source")), sizes: im.sizes || "", alt: (im.alt || "").slice(0, 40), fit: cs.objectFit, radius: bcs.borderRadius, transition: cs.transition !== "all 0s ease 0s" ? cs.transition.slice(0, 60) : (bcs.transition !== "all 0s ease 0s" ? bcs.transition.slice(0, 60) : ""), anim: cs.animationName !== "none" ? cs.animationName : "", upscale: im.naturalWidth > 0 && im.naturalWidth < r.width * devicePixelRatio }; });
    const rows = new Map(); for (const r of rects) { const k = Math.round(r.y / 20) * 20; rows.set(k, (rows.get(k) || []).concat(r)); }
    const perRow = [...rows.values()].map((r) => r.length); const cols = Math.max(...perRow);
    const heights = [...rows.values()].map((r) => new Set(r.map((x) => x.h)).size); const masonry = heights.some((s) => s > 1);
    const sorted = rects.slice().sort((a, b) => a.y - b.y || a.x - b.x); let gapX = null, gapY = null;
    for (let i = 1; i < sorted.length; i++) { const a = sorted[i - 1], c = sorted[i]; if (Math.abs(a.y - c.y) < 20 && c.x > a.x) { const g = c.x - (a.x + a.w); if (g >= 0 && g < 80) gapX = gapX == null ? g : Math.min(gapX, g); } }
    const ys = [...rows.keys()].sort((a, b) => a - b); for (let i = 1; i < ys.length; i++) { const r0 = rows.get(ys[i - 1])[0], r1 = rows.get(ys[i])[0]; const g = r1.y - (r0.y + r0.h); if (g >= 0 && g < 120) gapY = gapY == null ? g : Math.min(gapY, g); }
    const ar = rects.map((r) => +(r.w / r.h).toFixed(2)); const arSet = [...new Set(ar)];
    const br = best.getBoundingClientRect(); const sec = best.closest("section, main, article") || best.parentElement;
    const bg = (el) => { const cs = getComputedStyle(el); return { color: cs.backgroundColor, image: cs.backgroundImage === "none" ? "" : cs.backgroundImage.slice(0, 50) }; };
    // filtro: botones/pestañas/enlaces cortos justo antes del bloque
    let filtro = null; let prev = best.previousElementSibling || best.parentElement?.previousElementSibling; for (let i = 0; i < 4 && prev; i++) { const btns = [...prev.querySelectorAll("button, a, [role=tab], label")].filter((x) => x.innerText && x.innerText.trim().split(/\s+/).length <= 3 && vis(x) === false && x.getBoundingClientRect().width > 0); if (btns.length >= 3) { filtro = { n: btns.length, tags: [...new Set(btns.map((x) => x.tagName.toLowerCase() + (x.getAttribute("role") ? "[" + x.getAttribute("role") + "]" : "")))].join(","), textos: btns.slice(0, 8).map((x) => x.innerText.trim()).join(" · ") }; break; } prev = prev.previousElementSibling; }
    const firstLink = items[0]?.closest("a"); const first = { tag: (items[0]?.closest("a, button") || items[0]).tagName.toLowerCase(), href: firstLink ? firstLink.getAttribute("href")?.slice(0, 80) : "", name: (items[0]?.closest("a, button")?.getAttribute("aria-label") || items[0]?.alt || "").slice(0, 60) };
    return { n: items.length, total: [...best.querySelectorAll("img")].length, cols, masonry, gapX, gapY, ar: arSet.slice(0, 6), w: Math.round(br.width), sangrado: Math.round(br.x), alto: Math.round(br.height), top: Math.round(br.y + scrollY), radius: rects[0]?.radius, fit: rects[0]?.fit, lazy: rects.filter((r) => r.lazy === "lazy").length, srcset: rects.filter((r) => r.srcset).length, upscale: rects.filter((r) => r.upscale).length, sinAlt: rects.filter((r) => !r.alt).length, nat: rects.slice(0, 4).map((r) => r.nat + "→" + r.w + "x" + r.h), transition: rects.find((r) => r.transition)?.transition || "", anim: rects.find((r) => r.anim)?.anim || "", bg: bg(best), bgSec: sec ? bg(sec) : null, filtro, first, cls: +window.__cls.toFixed(4), selector: best.tagName.toLowerCase() + (best.id ? "#" + best.id : "") + (best.className && typeof best.className === "string" ? "." + best.className.trim().split(/\s+/).slice(0, 2).join(".") : "") };
  }); } catch (e) { m = { n: 0, error: String(e).slice(0, 80) }; }
  if (m.n) {
    await p.evaluate((t) => window.scrollTo(0, Math.max(0, t - 60)), m.top); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(out, `${tag}-${vk}.png`) });
    // hover en 1280
    if (vk === 1280) { try { const im = p.locator("img").filter({ visible: true }).nth(0); const box = await im.boundingBox(); if (box) { await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(500); m.hover = await im.evaluate((el) => { const box = el.closest("a, figure, li, div") || el; return { img: getComputedStyle(el).transform, box: getComputedStyle(box).transform, opacity: getComputedStyle(el).opacity, filter: getComputedStyle(el).filter }; }); } } catch {} }
    // apertura: tocar la primera miniatura
    try {
      const before = p.url(); const im = p.locator("img").filter({ visible: true }).nth(0); const box = await im.boundingBox();
      if (box) { await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(1500); }
      const after = p.url(); const dlg = await p.evaluate(() => { const d = document.querySelector("[role=dialog], dialog[open], .lightbox, .pswp, [class*=lightbox], [class*=modal]"); if (!d) return null; const r = d.getBoundingClientRect(); const im = d.querySelector("img, video"); const cls = d.querySelector("button[aria-label], [aria-label*=lose], [class*=close]"); return { w: Math.round(r.width), h: Math.round(r.height), img: im ? im.tagName.toLowerCase() + " " + (im.naturalWidth || im.videoWidth) + "x" + (im.naturalHeight || im.videoHeight) : "", cerrar: cls ? (cls.getAttribute("aria-label") || cls.className.toString().slice(0, 30)) : "", focus: document.activeElement?.tagName.toLowerCase() + (document.activeElement?.getAttribute("aria-label") ? "[" + document.activeElement.getAttribute("aria-label") + "]" : "") }; });
      m.apertura = after !== before ? { tipo: "ruta", url: after.slice(0, 100) } : dlg ? { tipo: "lightbox", ...dlg } : { tipo: "nada visible" };
      await p.screenshot({ path: path.join(out, `${tag}-${vk}-abierta.png`) });
      if (dlg) { await p.keyboard.press("Escape"); await p.waitForTimeout(500); m.escape = await p.evaluate(() => !document.querySelector("[role=dialog], dialog[open], .pswp")); }
    } catch (e) { m.apertura = { tipo: "error", e: String(e).slice(0, 60) }; }
  }
  // GALERIA-02 B2 · movimiento y profundidad: librerías presentes, animation-timeline, y qué cambia en las 6 primeras piezas
  // (transform, opacity, filter, box-shadow) entre 5 posiciones de scroll alrededor del bloque; coste con CPU ×4 (long tasks y frames > 33 ms).
  if (m.n) {
    try {
      const libs = await p.evaluate(() => ({ gsap: !!window.gsap, ScrollTrigger: !!window.ScrollTrigger, swiper: !!(window.Swiper || document.querySelector(".swiper")), lenis: !!(window.Lenis || document.documentElement.classList.contains("lenis")), locomotive: !!document.querySelector("[data-scroll-container]"), flickity: !!document.querySelector(".flickity-enabled"), splide: !!document.querySelector(".splide"), framer: !!document.querySelector("[data-projection-id], [data-framer-name]"), aos: !!document.querySelector("[data-aos]"), scrollTimeline: [...document.querySelectorAll("*")].slice(0, 3000).some((e) => { const cs = getComputedStyle(e); return cs.animationTimeline && cs.animationTimeline !== "auto" && cs.animationTimeline !== "none"; }), snap: [...document.querySelectorAll("*")].slice(0, 3000).some((e) => /x|both|inline/.test(getComputedStyle(e).scrollSnapType)) }));
      const sel = m.selector.split(".")[0].split("#")[0];
      const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const mov = await p.evaluate(async ({ top, alto, H }) => {
        const best = (() => { const imgs = [...document.querySelectorAll("img")].filter((i) => { const r = i.getBoundingClientRect(); return r.width >= 80 && r.height >= 80; }); const count = new Map(); for (const im of imgs) { let el = im; for (let i = 0; i < 6 && el; i++) { el = el.parentElement; if (!el) break; count.set(el, (count.get(el) || 0) + 1); } } let b = null, n = 0; for (const [el, c] of count) if (c >= 4 && (c > n)) { b = el; n = c; } if (b) for (const [el, c] of count) if (c === n && b.contains(el) && el !== b) b = el; return b; })();
        if (!best) return null;
        const items = [...best.querySelectorAll("img")].filter((i) => i.getBoundingClientRect().width >= 80).slice(0, 6).map((im) => im.closest("a, li, figure, article, div") || im);
        const snap = (el) => { const cs = getComputedStyle(el); const ics = getComputedStyle(el.querySelector("img") || el); return { t: cs.transform, o: cs.opacity, f: ics.filter, s: cs.boxShadow.slice(0, 30), it: ics.transform }; };
        const long = []; let frames = 0, slow = 0; const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push(Math.round(e.duration)); }); try { po.observe({ type: "longtask", buffered: true }); } catch {}
        const seq = []; const ys = [top - H, top - H * 0.6, top - H * 0.3, top, top + alto * 0.5, top + alto - H * 0.5];
        for (const y of ys) { window.scrollTo(0, Math.max(0, y)); let last = performance.now(); await new Promise((r) => { let n = 0; const f = (t) => { frames++; if (t - last > 33) slow++; last = t; if (++n < 24) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }); seq.push({ y: Math.round(y), items: items.map(snap) }); }
        po.disconnect();
        const cambia = { transform: 0, opacity: 0, filter: 0, shadow: 0, imgTransform: 0 };
        for (let i = 0; i < items.length; i++) { const vals = seq.map((s) => s.items[i]); if (new Set(vals.map((v) => v.t)).size > 1) cambia.transform++; if (new Set(vals.map((v) => v.o)).size > 1) cambia.opacity++; if (new Set(vals.map((v) => v.f)).size > 1) cambia.filter++; if (new Set(vals.map((v) => v.s)).size > 1) cambia.shadow++; if (new Set(vals.map((v) => v.it)).size > 1) cambia.imgTransform++; }
        const ejemplo = seq.map((s) => s.items[0].t + "|" + s.items[0].o).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
        return { piezas: items.length, cambia, ejemplo, longTasks: long.length, longMs: long.reduce((a, b) => a + b, 0), frames, over33: slow };
      }, { top: m.top, alto: m.alto, H: vk < 768 ? 812 : 800 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); await cdp.detach();
      m.movimiento = { libs: Object.entries(libs).filter(([, v]) => v).map(([k]) => k), ...(mov || {}) };
    } catch (e) { m.movimiento = { error: String(e).slice(0, 80) }; }
  }
  m.red = { imagenes: imgN, KB: Math.round(imgBytes / 1024), formatos: fmts };
  // reduced motion
  const ctx2 = await b.newContext({ viewport: { width: vk < 768 ? 375 : 1280, height: vk < 768 ? 812 : 800 }, reducedMotion: "reduce", userAgent: vk < 768 ? UA_IPHONE : undefined }); const p2 = await ctx2.newPage();
  try { await p2.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }); await p2.waitForTimeout(1500); m.reduced = await p2.evaluate(() => { const im = [...document.querySelectorAll("img")].find((i) => i.getBoundingClientRect().width >= 80); if (!im) return null; const cs = getComputedStyle(im); return { transition: cs.transition.slice(0, 40), anim: cs.animationName }; }); } catch {} await ctx2.close();
  rep.vistas[vk] = m;
  console.log(`${tag} ${vk}: ${m.n ? `${m.total} img · ${m.cols} col · ${m.masonry ? "masonry" : "uniforme"} · aspecto ${m.ar.join("/")} · hueco ${m.gapX}/${m.gapY} px · radio ${m.radius} · sangrado ${m.sangrado} · ancho ${m.w} · lazy ${m.lazy}/${m.n} · srcset ${m.srcset}/${m.n} · upscale ${m.upscale} · sin alt ${m.sinAlt} · apertura ${m.apertura?.tipo}${m.apertura?.img ? " " + m.apertura.img : ""} · filtro ${m.filtro ? m.filtro.n + " (" + m.filtro.textos.slice(0, 50) + ")" : "no"} · CLS ${m.cls} · red ${m.red.KB} KB/${m.red.imagenes} img ${JSON.stringify(m.red.formatos)} · transition ${m.transition || "—"} · hover ${m.hover ? m.hover.img + "|" + m.hover.box : "—"} · fondo ${m.bg.color}${m.bg.image ? " +img" : ""} · MOV libs ${m.movimiento?.libs?.join(",") || "—"} cambia ${JSON.stringify(m.movimiento?.cambia || m.movimiento?.error || "—")} ej ${JSON.stringify(m.movimiento?.ejemplo || [])} CPU×4 long ${m.movimiento?.longTasks ?? "—"}/${m.movimiento?.longMs ?? "—"}ms frames>33 ${m.movimiento?.over33 ?? "—"}/${m.movimiento?.frames ?? "—"}` : "sin galería detectable"}`);
  await ctx.close();
}
fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify(rep, null, 1)); await b.close();
