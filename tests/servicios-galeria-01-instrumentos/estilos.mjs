// SERVICIOS-GALERIA-01 · copia promovida (TEAM-RESENAS-01, D-174) de estilos.mjs. Lo que mide no cambia, salvo que la máscara de la
// pared se devuelve entera junto con --gal-fade en px (la copia a vigila su primera parada); las esperas son condiciones (./_nav.mjs)
// y SG_CASOS elige plantilla e idioma (tomaPL). Sólo lectura. Uso: node estilos.mjs <salida.json>. Mide en A y C, he/en/ru/ar, la página renderizada:
//  leyenda F-C (< 1024): dónde está, tipografía, color, ancho, fundido de 180 ms (sin fundido con reduced-motion), la reserva de alto
//    al cargar y después de pasar por 200 px de ancho (D16); y en oscuro, con frases (C con las frases de A: la plantilla C no trae
//    ninguna), su contraste en el peor píxel detrás de las letras;
//  título de services: kicker en --text y halo (text-shadow) en el h2, el kicker y «ver todos»;
//  /servicios: el fundido de FONDO-02 no se pinta, «reservar» en contorno de --accent-strong, WhatsApp sin borde ni fondo, la fila sin
//    foto con su lugar de 64 × 64 en --surface-alt;
//  galería: el kicker del pie en --text.
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, contexto, url, sinMaterial, RAIZ, tomaPL, listo, quieta, leyendaLista, enRuta } from "./_nav.mjs";
const OUT = process.argv[2];
const LANGS = (process.argv[3] || "he,en,ru,ar").split(",");
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const b = await chromium.launch();
const filas = [];
async function pagina(p, lang, w, h, extra = {}) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, ...extra.ctx });
  if (extra.frases) {
    // C con frases: las de A en hebreo, por posición (la plantilla C no trae ninguna; el diseño en oscuro necesita verse con frase)
    const a = JSON.parse(readFileSync(join(RAIZ, "dev-fixtures", "peluqueria-paleta-a.json"), "utf8"));
    await ctx.route(/\/dev-fixtures\/peluqueria-paleta-c\.json(\?.*)?$/, async (r) => {
      const res = await r.fetch(); const fx = await res.json();
      fx.services = fx.services.map((s, i) => ({ ...s, description: a.services[i % a.services.length].description }));
      await r.fulfill({ response: res, json: fx });
    });
  }
  const pg = await ctx.newPage();
  // el color de una variable de la página como rgb(...), para compararlo con el computado de un elemento
  await pg.addInitScript(() => { window.__color = (v) => { const e = document.createElement("i"); e.style.color = `var(${v})`; document.body.append(e); const c = getComputedStyle(e).color; e.remove(); return c; }; });
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(p), { waitUntil: "networkidle", timeout: 120000 });
  await listo(pg, "#services");
  return { ctx, pg };
}
async function contraste(pg, sel) {
  const el = await pg.$(sel); if (!el) return null;
  const dec = (buf) => pg.evaluate(async (b64) => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0); return Array.from(cx.getImageData(0, 0, img.width, img.height).data); }, buf.toString("base64"));
  let peor = Infinity; const det = [];
  for (const pos of ["arriba", "centro", "abajo"]) {
    await el.evaluate((e, pos) => { const q = e.getBoundingClientRect(); const d = pos === "arriba" ? 96 : pos === "centro" ? (innerHeight - q.height) / 2 : innerHeight - q.height - 90; scrollTo({ top: q.top + scrollY - d, behavior: "instant" }); }, pos);
    await quieta(pg, sel);
    const box = await el.boundingBox(); if (!box || box.height < 1) { det.push(pos + ":sin-caja"); continue; }
    const con = await pg.screenshot({ clip: box });
    await el.evaluate((e) => e.style.setProperty("color", "transparent", "important")); await el.evaluate((e) => new Promise((ok) => { const ya = () => (getComputedStyle(e).color === "rgba(0, 0, 0, 0)" ? requestAnimationFrame(() => requestAnimationFrame(ok)) : requestAnimationFrame(ya)); ya(); }));
    const sin = await pg.screenshot({ clip: box });
    await el.evaluate((e) => e.style.removeProperty("color"));
    const A = await dec(con), B = await dec(sin); let colorT = null, maxD = 0, n = 0, p = Infinity;
    for (let k = 0; k < A.length; k += 4) { const d = Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]); if (d > maxD) { maxD = d; colorT = [A[k], A[k + 1], A[k + 2]]; } }
    for (let k = 0; k < A.length; k += 4) { const d = Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]); if (d < 60) continue; n++; p = Math.min(p, ratio(colorT, [B[k], B[k + 1], B[k + 2]])); }
    if (!n) { det.push(pos + ":sin-letra"); continue; }
    det.push(pos + ":" + p.toFixed(2)); peor = Math.min(peor, p);
  }
  return { peor: peor === Infinity ? null : +peor.toFixed(2), det: det.join(" ") };
}

for (const p of ["a", "c"]) for (const lang of LANGS) {
  if (!tomaPL(p, lang)) continue;
  const f = { k: `${p}-${lang}` };
  // ── móvil 375: la leyenda, su reserva antes y después de pasar por 200 px, el título y /servicios
  {
    const { ctx, pg } = await pagina(p, lang, 375, 812);
    await pg.evaluate(() => { const c = document.querySelector("#services .svc-slide"); scrollTo({ top: c.getBoundingClientRect().top + scrollY - 84, behavior: "instant" }); });
    await leyendaLista(pg);
    const ley = () => pg.evaluate(() => {
      const color = window.__color; const sec = document.getElementById("services"); const cap = sec.querySelector(".svc-caption");
      if (!cap) return null;
      const cs = getComputedStyle(cap); const ul = sec.querySelector(".svc-carousel"); const central = sec.querySelector('.svc-slide[data-centrada="1"] .svc-card');
      const titulo = document.getElementById("services-title").closest("div").parentElement.getBoundingClientRect();
      const q = cap.getBoundingClientRect();
      return { visible: cs.display !== "none" && q.height > 0, txt: cap.textContent.trim(), alto: Math.round(q.height), minH: cs.minHeight,
        debajo: q.top >= ul.getBoundingClientRect().bottom - 40 && q.bottom <= titulo.top + 1, bajoTarjeta: central ? Math.round(q.top - central.getBoundingClientRect().bottom) : null, antesTitulo: Math.round(titulo.top - q.bottom),
        fuente: cs.fontSize, linea: cs.lineHeight, color: cs.color, esText: cs.color === color("--text"), anchoMax: cs.maxWidth, alineado: cs.textAlign,
        transicion: `${cs.transitionProperty} ${cs.transitionDuration}` };
    });
    f.leyenda = await ley();
    if (f.leyenda) {
      await pg.setViewportSize({ width: 200, height: 812 }); await quieta(pg, "#services");
      await pg.setViewportSize({ width: 375, height: 812 }); await leyendaLista(pg);
      const d = await ley(); f.leyenda.d16 = { alto: d?.alto, minH: d?.minH };
    }
    f.titulo = await pg.evaluate(() => {
      const color = window.__color; const h2 = document.getElementById("services-title"); const k = h2.nextElementSibling; const ver = document.querySelector("#services button.min-h-11");
      const halo = (e) => e ? getComputedStyle(e).textShadow : null;
      return { kickerEsText: getComputedStyle(k).color === color("--text"), kicker: getComputedStyle(k).color, text: color("--text"), sombras: [halo(h2), halo(k), halo(ver)].map((s) => (s && s !== "none" ? s.split("px,").length : 0)) };
    });
    // /servicios
    await pg.evaluate(() => { const bt = [...document.querySelectorAll("#services button")].find((x) => !x.closest(".svc-slide") && !x.classList.contains("svc-arrow")); bt?.click(); });
    await enRuta(pg, "/servicios", 'section[data-surface="textura"].min-h-screen');
    f.servicios = await pg.evaluate(() => {
      const color = window.__color; const page = document.querySelector('section[data-surface="textura"].min-h-screen');
      if (!page) return { error: "no se abrió /servicios" };
      const bef = getComputedStyle(page, "::before");
      const alfa = (c) => { const m = c.match(/[\d.]+/g); return m ? (m[3] === undefined ? 1 : +m[3]) : 0; };
      const reservar = [...page.querySelectorAll("li button")].map((e) => { const cs = getComputedStyle(e); return { fondoAlfa: alfa(cs.backgroundColor), texto: cs.color, contorno: cs.boxShadow + " | " + cs.borderColor + " " + cs.borderWidth }; });
      const acento = color("--accent-strong");
      const wa = [...page.querySelectorAll('li a[href^="https://wa.me"]')].map((e) => { const cs = getComputedStyle(e); return { fondoAlfa: alfa(cs.backgroundColor), bordeAlfa: parseFloat(cs.borderTopWidth) ? alfa(cs.borderTopColor) : 0 }; });
      const filas = [...page.querySelectorAll("li")].map((li) => { const c = li.firstElementChild; const q = c.getBoundingClientRect(); return { img: c.tagName === "IMG", w: Math.round(q.width), h: Math.round(q.height), fondo: getComputedStyle(c).backgroundColor }; });
      return { fundido: { display: bef.display, content: bef.content, alto: bef.height, fondo: bef.backgroundImage.slice(0, 40) },
        reservarContorno: reservar.every((r) => r.fondoAlfa <= 0.05 && r.texto === acento && r.contorno.includes(acento)), reservar: reservar.slice(0, 1), acento,
        waComoEnlace: wa.every((x) => x.fondoAlfa <= 0.05 && x.bordeAlfa <= 0.05), wa: wa.slice(0, 1),
        filasSinFoto: filas.filter((x) => !x.img), lugarFoto: filas.every((x) => x.w === 64 && x.h === 64), surfaceAlt: color("--surface-alt") };
    });
    await pg.screenshot({ path: `${OUT}-${f.k}-servicios.png` }).catch(() => {});
    await ctx.close();
  }
  // ── reduced-motion: la leyenda sin fundido
  {
    const { ctx, pg } = await pagina(p, lang, 375, 812, { ctx: { reducedMotion: "reduce" } });
    f.leyendaReducida = await pg.evaluate(() => { const c = document.querySelector("#services .svc-caption"); if (!c) return null; const cs = getComputedStyle(c); return `${cs.transitionProperty} ${cs.transitionDuration}`; });
    await ctx.close();
  }
  // ── C con frases (oscuro): la leyenda y su contraste en 3 posiciones de scroll
  if (p === "c") {
    const { ctx, pg } = await pagina(p, lang, 375, 812, { frases: true });
    await pg.evaluate(() => { const c = document.querySelector("#services .svc-slide"); scrollTo({ top: c.getBoundingClientRect().top + scrollY - 84, behavior: "instant" }); });
    await leyendaLista(pg);
    f.oscuroConFrase = await pg.evaluate(() => { const c = document.querySelector("#services .svc-caption"); return c ? { visible: getComputedStyle(c).display !== "none", txt: c.textContent.trim().slice(0, 40), fondo: getComputedStyle(c).backgroundImage.slice(0, 30), sombra: getComputedStyle(c).textShadow.slice(0, 30), dark: document.documentElement.classList.contains("dark") } : null; });
    f.oscuroContraste = f.oscuroConFrase?.visible ? await contraste(pg, "#services .svc-caption") : null;
    await ctx.close();
  }
  // ── escritorio 1366 × 657 (la pantalla baja de S-AC1): la tarjeta entera bajo el navbar, los nombres alineados, la frase dentro de
  //    la tarjeta con su alto fijo; la galería (alto y ancho ocupado) y el kicker de su pie
  {
    const { ctx, pg } = await pagina(p, lang, 1366, 657);
    await pg.evaluate(() => { const nav = document.querySelector("nav").getBoundingClientRect().bottom; const c = document.querySelector("#services .svc-slide"); scrollTo({ top: c.getBoundingClientRect().top + scrollY - nav - 8, behavior: "instant" }); });
    await quieta(pg, "#services");
    f.escritorio = await pg.evaluate(() => {
      const sec = document.getElementById("services");
      const vis = [...sec.querySelectorAll(".svc-slide")].filter((s) => { const q = s.getBoundingClientRect(); return q.right > 1 && q.left < innerWidth - 1; });
      const card = sec.querySelector(".svc-slide .svc-card").getBoundingClientRect();
      const ys = vis.map((s) => Math.round(s.querySelector(".svc-name").getBoundingClientRect().top));
      const frases = [...sec.querySelectorAll(".svc-card .svc-phrase:not(:empty)")].map((e) => Math.round(e.getBoundingClientRect().height));
      const cap = sec.querySelector(".svc-caption");
      return { tarjetaAbajo: Math.round(card.bottom), alto: innerHeight, nombresY: [Math.min(...ys), Math.max(...ys)], frasesAlto: [...new Set(frases)], leyendaOculta: !cap || getComputedStyle(cap).display === "none" };
    });
    f.galeria = await pg.evaluate(() => {
      const color = window.__color; const sec = document.getElementById("gallery"); const k = document.querySelector("#gallery-title + p");
      const inner = sec.querySelector(".gal-inner"); const pad = parseFloat(getComputedStyle(inner).paddingLeft);
      const piezas = [...sec.querySelectorAll(".gal-piece")].map((e) => e.getBoundingClientRect());
      const izq = Math.min(...piezas.map((q) => q.left)), der = Math.max(...piezas.map((q) => q.right));
      // G2-a: el fondo de la sección sube en rampa hasta --surface antes de que entre la textura (y la pared entra con máscara)
      const wall = sec.querySelector(".gal-wall");
      return { rampa: getComputedStyle(sec).backgroundImage.slice(0, 60), mascara: wall ? (getComputedStyle(wall).maskImage || getComputedStyle(wall).webkitMaskImage || "") : null, galFade: wall ? (() => { const i = document.createElement("i"); i.style.cssText = "position:absolute;height:var(--gal-fade)"; wall.append(i); const v = i.getBoundingClientRect().height; i.remove(); return +v.toFixed(2); })() : null, variante: sec.dataset.gallery, alto: sec.offsetHeight, ocupado: Math.round(((der - izq) / (inner.getBoundingClientRect().width - 2 * pad)) * 100), kickerEsText: k ? getComputedStyle(k).color === color("--text") : null, kicker: k ? getComputedStyle(k).color : null };
    });
    await ctx.close();
  }
  filas.push(f); console.log(JSON.stringify(f));
}
await b.close();
writeFileSync(`${OUT}.json`, JSON.stringify(filas, null, 1));
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
