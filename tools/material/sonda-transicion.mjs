#!/usr/bin/env node
/**
 * sonda-transicion.mjs — TRANSICION-01 (sólo lectura): cómo cose una web su hero con la sección siguiente.
 * Por viewport (375×812 móvil dpr 2 con UA iPhone, 1280×800): localiza los bloques de página entera (ancho ≥ 90 % del
 * viewport, alto 0,4–4 vh), toma las N primeras costuras (pie del bloque k → bloque k+1) y en cada una:
 *   · 5 puntos de scroll alrededor (la costura a 0,9 · 0,5 · 0,25 · 0,05 vh del borde superior y 0,25 vh por encima, ya pasada): captura del viewport;
 *   · con la costura a mitad de pantalla: pila de capas (barrido geométrico de todo el DOM, no `elementsFromPoint`, que salta los `pointer-events: none` de overlays y degradados) en 3 columnas × 5 filas (−60 … +60 px) con
 *     `position`, `z-index`, `background-color/-image`, `mask-image`, `mix-blend-mode`, `opacity`, `filter`,
 *     `backdrop-filter`, `transform`, si es <video>/<img>/<canvas>, rect; tira ×4 de 40 px CSS en torno a la costura;
 *     perfil vertical (160 filas, 80 % del ancho → 1 columna) en OKLab: ΔE máximo entre filas consecutivas y dónde, ΔE del
 *     borde, ΔE acumulado (cuánto cambia el tono en la franja) — «se nota / no se nota» en número;
 *   · hojas de estilo alcanzables: cuántas reglas usan mask-image, mix-blend-mode, animation-timeline, sticky, fixed,
 *     background-attachment, backdrop-filter, gradientes; y si hay imágenes con el degradado horneado (se lista la imagen
 *     de fondo de la capa que toca la costura para inspeccionarla a mano).
 * No acepta cookies ni pulsa nada: los banners fijos se ocultan sólo en la captura (visibility) si tapan la costura.
 * Uso: node tools/material/sonda-transicion.mjs <url> --tag <id> --out <carpeta> [--costuras 1] [--solo 375|1280] [--modo dark|light]
 */
import { chromium, devices } from "playwright"; import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const url = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!url || !opt("tag")) { console.error("uso: node tools/material/sonda-transicion.mjs <url> --tag <id> --out <carpeta> [--costuras 1] [--solo 375|1280]"); process.exit(2); }
const tag = opt("tag"); const out = path.resolve(opt("out", path.join(ROOT, "capturas-transicion"))); const nCost = +opt("costuras", 1); const solo = opt("solo", ""); fs.mkdirSync(out, { recursive: true });
const { rgbToOklab, deltaE } = await import("../../src/lib/oklab.ts");
const ff = (a) => spawnSync("ffmpeg", ["-v", "error", "-y", ...a], { encoding: "utf8" });
const rep = { url, tag, fecha: new Date().toISOString().slice(0, 10), viewports: {} };
const b = await chromium.launch();
const PAGE_JS = {
  bloques: `(() => { const vw = innerWidth, vh = innerHeight; const out = []; const seen = new Set();
    for (const el of document.querySelectorAll("body *")) { const cs = getComputedStyle(el); if (cs.position === "fixed") continue; const r = el.getBoundingClientRect(); if (r.width < vw * 0.9 || r.height < vh * 0.4 || r.height > vh * 4) continue; const top = Math.round(r.top + scrollY); const key = top + ":" + Math.round(r.height); if (seen.has(key)) continue; seen.add(key); out.push({ top, bottom: Math.round(r.bottom + scrollY), h: Math.round(r.height), tag: el.tagName.toLowerCase(), id: el.id || "", cls: (typeof el.className === "string" ? el.className : "").slice(0, 60), video: !!el.querySelector("video") }); }
    out.sort((a, b) => a.top - b.top || b.h - a.h); const res = []; for (const o of out) { const last = res[res.length - 1]; if (last && Math.abs(last.top - o.top) < 8) continue; if (last && o.top < last.bottom - 8 && o.bottom <= last.bottom + 8) continue; res.push(o); } return { vw, vh, doc: document.documentElement.scrollHeight, bloques: res.slice(0, 8) }; })()`,
  // pila geométrica (no elementsFromPoint: ignora pointer-events:none, que es justo lo que llevan los overlays y degradados)
  pila: (y) => `(() => { const vw = innerWidth; const cols = [0.1, 0.5, 0.9].map((f) => Math.round(vw * f)); const res = [];
    const all = [...document.querySelectorAll("body, body *")].map((el, i) => ({ el, i, cs: getComputedStyle(el), r: el.getBoundingClientRect() })).filter((o) => o.cs.display !== "none" && o.cs.visibility !== "hidden");
    const short = (s) => (s && s !== "none" ? s.slice(0, 160) : "");
    for (const x of cols) for (const dy of [-60, -20, 0, 20, 60]) { const yy = ${y} + dy;
      const hit = all.filter((o) => o.r.left <= x && o.r.right >= x && o.r.top <= yy && o.r.bottom >= yy && o.r.width > 0 && o.r.height > 0);
      const capas = hit.map(({ el, cs, r, i }) => ({ el: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""), i, pos: cs.position, z: cs.zIndex, pe: cs.pointerEvents === "none" ? "pe:none" : "", bg: cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? cs.backgroundColor : "", bgi: short(cs.backgroundImage), mask: short(cs.maskImage !== "none" ? cs.maskImage : cs.webkitMaskImage), blend: cs.mixBlendMode !== "normal" ? cs.mixBlendMode : "", op: cs.opacity !== "1" ? cs.opacity : "", filter: short(cs.filter), bf: short(cs.backdropFilter || cs.webkitBackdropFilter), tf: cs.transform !== "none" ? cs.transform.slice(0, 60) : "", media: el.tagName === "VIDEO" ? "video:" + (el.currentSrc || el.src || "").slice(-70) : el.tagName === "IMG" ? "img:" + (el.currentSrc || el.src || "").slice(-70) : el.tagName === "CANVAS" ? "canvas" : "", top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) }))
        .filter((l) => l.bg || l.bgi || l.mask || l.blend || l.op || l.media || l.filter || l.bf);
      res.push({ x, dy, capas: capas.slice(-14) }); }
    return res; })()`,
  css: `(async () => { const cnt = { maskImage: 0, mixBlend: 0, animTimeline: 0, sticky: 0, fixed: 0, bgAttachFixed: 0, backdropFilter: 0, gradient: 0, clipPath: 0, hojas: 0, hojasInalcanzables: 0 }; const texts = [];
    for (const s of document.styleSheets) { try { const t = [...s.cssRules].map((r) => r.cssText).join("\\n"); texts.push(t); cnt.hojas++; } catch { cnt.hojasInalcanzables++; if (s.href) { try { const r = await fetch(s.href); texts.push(await r.text()); cnt.hojas++; } catch {} } } }
    for (const st of document.querySelectorAll("[style]")) texts.push(st.getAttribute("style"));
    const all = texts.join("\\n"); const n = (re) => (all.match(re) || []).length;
    cnt.maskImage = n(/mask-image\\s*:/g); cnt.mixBlend = n(/mix-blend-mode\\s*:\\s*(?!normal)/g); cnt.animTimeline = n(/animation-timeline\\s*:/g); cnt.sticky = n(/position\\s*:\\s*sticky/g); cnt.fixed = n(/position\\s*:\\s*fixed/g); cnt.bgAttachFixed = n(/background-attachment\\s*:\\s*fixed/g); cnt.backdropFilter = n(/backdrop-filter\\s*:/g); cnt.gradient = n(/linear-gradient\\(/g); cnt.clipPath = n(/clip-path\\s*:/g);
    return cnt; })()`,
  libs: `(() => { const s = [...document.scripts].map((x) => x.src).join(" "); const w = window; return { gsap: !!w.gsap, scrollTrigger: !!(w.ScrollTrigger || (w.gsap && w.gsap.plugins && w.gsap.plugins.ScrollTrigger)), lenis: !!(w.Lenis || w.lenis), locomotive: /locomotive/i.test(s) || !!w.LocomotiveScroll, framer: /framer|motion/i.test(s), webflow: /webflow/i.test(s), three: !!w.THREE || /three/i.test(s), wix: /wix|parastorage/i.test(s), shopify: /shopify/i.test(s), webgl: !!document.querySelector("canvas") }; })()`,
  ocultarFijos: `(() => { const A = innerWidth * innerHeight; for (const el of document.querySelectorAll("body *")) { const cs = getComputedStyle(el); if (cs.position !== "fixed" && cs.position !== "absolute") continue; const r = el.getBoundingClientRect(); const big = r.width * r.height >= A * 0.25; const nombre = (el.id + " " + el.className + " " + (el.getAttribute("aria-label") || "") + " " + (el.getAttribute("role") || "")); const dialogo = /dialog|modal|cookie|consent|gdpr|privacy|onetrust|ketch|country|region|newsletter|popup|overlay/i.test(nombre) || el.getAttribute("aria-modal") === "true"; if ((cs.position === "fixed" && (dialogo || (big && +cs.zIndex >= 1000))) || (big && dialogo && !el.querySelector("video"))) el.style.setProperty("visibility", "hidden", "important"); } document.documentElement.style.overflow = ""; document.body.style.overflow = ""; })()`,
};
const perfil = (png, W, dpr, seamY) => { // 160 filas CSS alrededor de la costura (80 % del ancho → 1 columna) en OKLab
  const raw = `${out}/.${tag}-rows.rgb`; const rows = 160 * dpr; const y0 = Math.max(0, (seamY - 80) * dpr);
  ff(["-i", png, "-vf", `crop=iw*0.8:${rows}:iw*0.1:${y0},scale=1:${rows}:flags=area`, "-pix_fmt", "rgb24", "-f", "rawvideo", raw]);
  if (!fs.existsSync(raw)) return null; const buf = fs.readFileSync(raw); fs.rmSync(raw, { force: true });
  const labs = []; for (let i = 0; i < rows; i++) labs.push(rgbToOklab([buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]]));
  let max = 0, at = 0, acum = 0; for (let i = 1; i < rows; i++) { const d = deltaE(labs[i - 1], labs[i]); acum += d; if (d > max) { max = d; at = i; } }
  const mid = Math.round(rows / 2); const borde = deltaE(labs[mid - 1], labs[mid]); const total = deltaE(labs[0], labs[rows - 1]);
  const media = (a, b) => { const n = b - a; const s = [0, 0, 0]; for (let i = a; i < b; i++) for (let k = 0; k < 3; k++) s[k] += buf[i * 3 + k]; return "#" + s.map((x) => Math.round(x / n).toString(16).padStart(2, "0")).join(""); };
  return { maxDeltaE: +max.toFixed(4), enFila: Math.round((at - mid) / dpr), bordeDeltaE: +borde.toFixed(4), acumDeltaE: +acum.toFixed(3), extremosDeltaE: +total.toFixed(4), L0: +labs[0][0].toFixed(3), L1: +labs[rows - 1][0].toFixed(3), arriba: media(mid - 12 * dpr, mid - 2 * dpr), abajo: media(mid + 2 * dpr, mid + 12 * dpr) };
};
try {
  for (const vk of [375, 1280]) {
    if (solo && +solo !== vk) continue;
    const dpr = vk < 768 ? 2 : 1; const H = vk < 768 ? 812 : 800;
    const ctx = vk < 768 ? await b.newContext({ ...devices["iPhone 13"], viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, locale: "he-IL" }) : await b.newContext({ viewport: { width: 1280, height: 800 }, locale: "he-IL" });
    const p = await ctx.newPage(); const v = { vk, errores: [] };
    try { await p.goto(url, { waitUntil: "load", timeout: 45000 }); await p.waitForTimeout(2500); try { await p.waitForLoadState("networkidle", { timeout: 8000 }); } catch {} }
    catch (e) { v.errores.push("goto: " + e.message.split("\n")[0]); rep.viewports[vk] = v; await ctx.close(); continue; }
    await p.evaluate(PAGE_JS.ocultarFijos);
    if (opt("modo")) await p.evaluate(`document.documentElement.classList.remove("light", "dark"); document.documentElement.classList.add("${opt("modo")}")`); // sólo para medir (p. ej. C mientras main.tsx fuerza light)
    // desplazamiento previo para que se monten las secciones perezosas
    for (let y = 0; y < Math.min(6000, await p.evaluate("document.documentElement.scrollHeight")); y += 400) { await p.evaluate(`window.scrollTo(0, ${y})`); await p.waitForTimeout(80); }
    await p.evaluate("window.scrollTo(0, 0)"); await p.waitForTimeout(800);
    const bl = await p.evaluate(PAGE_JS.bloques); v.bloques = bl.bloques; v.doc = bl.doc; v.libs = await p.evaluate(PAGE_JS.libs); v.css = await p.evaluate(PAGE_JS.css);
    v.costuras = [];
    for (let k = 0; k < Math.min(nCost, bl.bloques.length - 1); k++) {
      const seam = bl.bloques[k].bottom; const next = bl.bloques[k + 1]; const c = { k, seamY: seam, de: bl.bloques[k], a: next, hueco: next.top - seam, puntos: [] };
      for (const q of [0.9, 0.5, 0.25, 0.05, -0.25]) { // la costura a q·H desde el borde superior del viewport (q<0: ya pasó)
        const y = Math.max(0, Math.round(seam - q * H));
        await p.evaluate(`window.scrollTo(0, ${y})`); await p.waitForTimeout(700);
        const f0 = `${out}/${tag}-${vk}-c${k}-q${String(q).replace("-", "m").replace(".", "")}.png`; await p.screenshot({ path: f0, clip: { x: 0, y: 0, width: vk, height: H } });
        c.puntos.push({ q, scrollY: y, png: path.basename(f0) });
      }
      // costura a mitad de pantalla: pila, tira ×4 y perfil
      const yMid = Math.max(0, seam - Math.round(H / 2)); await p.evaluate(`window.scrollTo(0, ${yMid})`); await p.waitForTimeout(900);
      const seamView = seam - (await p.evaluate("scrollY"));
      const png = `${out}/${tag}-${vk}-c${k}-costura.png`; await p.screenshot({ path: png, clip: { x: 0, y: 0, width: vk, height: H } });
      ff(["-i", png, "-vf", `crop=iw:${40 * dpr}:0:${Math.max(0, (seamView - 20) * dpr)},scale=iw*4:ih*4:flags=neighbor`, `${out}/${tag}-${vk}-c${k}-tira.png`]);
      c.perfil = perfil(png, vk, dpr, seamView); c.pila = await p.evaluate(PAGE_JS.pila(seamView));
      // resumen de la pila: capas distintas que tocan la costura (columna central, dy 0) y qué aportan
      const centro = c.pila.find((q) => q.x === Math.round(vk * 0.5) && q.dy === 0); c.capasEnCostura = centro ? centro.capas.map((l) => `${l.el}${l.pos !== "static" ? " [" + l.pos + (l.z !== "auto" ? " z" + l.z : "") + "]" : ""}${l.pe ? " " + l.pe : ""}${l.bg ? " bg " + l.bg : ""}${l.bgi ? " bgi " + l.bgi.slice(0, 90) : ""}${l.mask ? " MASK " + l.mask.slice(0, 60) : ""}${l.blend ? " BLEND " + l.blend : ""}${l.op ? " op " + l.op : ""}${l.filter ? " filter " + l.filter : ""}${l.bf ? " backdrop " + l.bf : ""}${l.media ? " " + l.media : ""}`) : [];
      v.costuras.push(c);
      console.log(`${tag} ${vk} costura ${k}: y=${seam} (${c.de.tag}${c.de.id ? "#" + c.de.id : ""} ${c.de.h}px${c.de.video ? " +video" : ""} → ${next.tag}${next.id ? "#" + next.id : ""}, hueco ${c.hueco}px) · ΔE borde ${c.perfil?.bordeDeltaE} · máx ${c.perfil?.maxDeltaE} (fila ${c.perfil?.enFila}) · acum ${c.perfil?.acumDeltaE} · extremos ${c.perfil?.extremosDeltaE} (L ${c.perfil?.L0} → ${c.perfil?.L1}) · 10 px arriba ${c.perfil?.arriba} / abajo ${c.perfil?.abajo}`);
      for (const l of c.capasEnCostura) console.log(`   · ${l}`);
    }
    console.log(`${tag} ${vk} css: ${JSON.stringify(v.css)} libs: ${JSON.stringify(Object.fromEntries(Object.entries(v.libs).filter(([, x]) => x)))}`);
    rep.viewports[vk] = v; await ctx.close();
  }
} finally { await b.close(); }
fs.writeFileSync(`${out}/${tag}-sonda.json`, JSON.stringify(rep, null, 1)); console.log("→", `${out}/${tag}-sonda.json`);
