// INSTAGRAM-FAQ-01 · estilos: lo que el paquete de migración aprobado fija y los instrumentos de diseño no miden (sesión A, 2026-10-02).
// Sólo lectura. Uso: node estilos.mjs <salida> [idiomas] [plantillas] [sonda]. Mide en la página renderizada (INFORME §§ 6.7 y 6.8, FAQ-01 §§ 3-bis
// y 5, INSTAGRAM-01 §§ 6 y 7, y los cambios de Liam después del cierre: faq en textura, instagram en velo y el arrastre):
//  faq: la variante (raíz `.faq6` con `data-dinamica` = la de la galería), la superficie (textura en capa propia con máscara, la sección
//    en --surface sin ::before/::after), la mesa (las fichas de arriba más chicas que las de abajo lejos del centro, iguales en el
//    centro), la ficha (--card, radio, relieve, borde en oscuro; la pregunta es UN <button aria-expanded aria-controls> de 16/500 —17 en
//    escritorio—; cerrada, oculta al lector; abierta, se acerca y las demás se alejan; una por vez), el pie (h2, kicker y la acción F-1
//    a WhatsApp, halo y en oscuro fondo radial; sin teléfono, ninguna acción), los rangos en RTL (<bdi dir="ltr"> sin partirse), dos
//    columnas en escritorio (A desfasada 2,5 rem y en sentidos opuestos; C alineadas y quietas), quieto con reduced-motion y ruso (D18);
//  instagram: la sección (`section#instagram` con h2 y aria-labelledby, `.ig6` con `data-dinamica`), el orden (testimonials › instagram ›
//    faq; con el `sectionOrder` de una clienta, el de ella), la superficie (velo de team con su rampa y media rampa), el abanico (6 fotos de
//    56vw entre 200 y 300 px, el marco de polaroid, el paso de 9° —9,5° desde 600 px—, la caída reservada, cerrado antes de entrar),
//    cada foto un <button aria-pressed> con el alt de la pieza de galería con la misma src (o «título · n» si no está), el pie (sin
//    cuenta: a /galeria con el texto de «ver toda la galería»; con cuenta: «Instagram» a su url y «@cuenta»), móvil que se desliza con el
//    dedo (`touch-action: pan-y`) y quieto y abierto con reduced-motion;
//  D20: en árabe, «ver toda la galería» y la acción de instagram sin cuenta hablan en femenino;
//  y los pesos de Frank Ruhl Libre visibles en #faq y #instagram (pendiente c de ARREGLOS-02, sólo esas dos secciones).
// Escribe <salida>.json. La SONDA es este mismo instrumento sólo en móvil, con dos idiomas y una plantilla (`estilos.mjs <salida> he,ar a sonda`).
import { writeFileSync } from "node:fs";
import { chromium, contexto, conFixture, url, listo, quieta, sinTransiciones, tic, sinMaterial } from "./_nav.mjs";
const OUT = process.argv[2];
const LANGS = (process.argv[3] || "he,en,ru,ar").split(",");
const PLANTILLAS = (process.argv[4] || "a,c").split(",");
const SONDA = process.argv[5] === "sonda";

const b = await chromium.launch();
const filas = [];
async function pagina(p, lang, w, h, extra = {}, cambio = null) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, ...extra });
  if (cambio) await conFixture(ctx, cambio);
  const pg = await ctx.newPage();
  // el valor computado de una expresión CSS de la página (un color, un largo), para compararlo con el de un elemento
  await pg.addInitScript(() => {
    window.__css = (prop, valor) => { const e = document.createElement("i"); e.style.position = "absolute"; e.style.setProperty(prop, valor); document.body.append(e); const c = getComputedStyle(e)[prop.replace(/-(\w)/g, (_, l) => l.toUpperCase())]; e.remove(); return c; };
    window.__color = (v) => window.__css("color", `var(${v})`);
  });
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(p), { waitUntil: "load", timeout: 120000 });
  await listo(pg, "#faq");
  return { ctx, pg };
}
// si la sección no existe (hoy, instagram no tiene id), no hay a dónde ir: se mide lo que haya
const alCentro = async (pg, sel) => { if (await pg.evaluate((s) => { const e = document.querySelector(s); e?.scrollIntoView({ block: "center", behavior: "instant" }); return !!e; }, sel)) await quieta(pg, sel); };

// ── faq ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function medirFaq(pg, w) {
  return pg.evaluate(async (w) => {
    const css = window.__css, color = window.__color;
    const s = await import("/src/config/site.ts"); const W = await import("/src/lib/whatsapp.ts");
    const cfg = s.siteConfig; const f = cfg.sections?.faq || {};
    const sec = document.getElementById("faq"); const raiz = sec?.querySelector(".faq6");
    if (!raiz) return { existe: false };
    const cs = (e, p) => (e ? getComputedStyle(e, p) : null);
    const txt = (e) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
    const oscuro = document.documentElement.classList.contains("dark");
    const wall = sec.querySelector(".faq6-wall"), mesa = raiz.querySelector(".faq6-mesa"), foot = raiz.querySelector(".faq6-foot");
    const cols = [...raiz.querySelectorAll(".faq6-col")], items = [...raiz.querySelectorAll(".faq6-item")];
    const h2 = foot?.querySelector("h2"), kicker = foot?.querySelector(":scope > div > p"), mas = raiz.querySelector(".faq6-more");
    const datos = (f.items || []).filter((x) => x && x.question && x.answer);
    const RANGO = /\d+(?:[.,]\d+)?\s?[–-]\s?\d+(?:[.,]\d+)?%?/g;
    return {
      existe: true, dinamica: raiz.dataset.dinamica, galeria: document.getElementById("gallery")?.dataset.gallery ?? null, oscuro,
      superficie: {
        seccion: cs(sec).backgroundColor === color("--surface"), antes: cs(sec, "::before").display, despues: cs(sec, "::after").display,
        arriba: cs(sec).paddingTop, abajo: cs(sec).paddingBottom,
        esperado: [css("padding-top", "calc(var(--gal-fade, 12vh) * 0.6)"), css("padding-top", "calc(var(--gal-fade, 12vh) + 0.5rem)")],
        pared: wall ? { pos: cs(wall).position, fondo: cs(wall).backgroundColor === color("--surface-alt"), img: /url\(/.test(cs(wall).backgroundImage), mascara: /linear-gradient/.test(cs(wall).maskImage || cs(wall).webkitMaskImage || "") } : null,
      },
      etiqueta: sec.getAttribute("aria-labelledby") && sec.getAttribute("aria-labelledby") === h2?.id,
      columnas: cols.length, datos: datos.length,
      fichas: items.map((li, i) => {
        const card = li.querySelector(".faq6-card"), q = li.querySelector("button.faq6-q"), panel = q ? document.getElementById(q.getAttribute("aria-controls")) : null;
        const hoja = panel?.querySelector(".faq6-hoja");
        return {
          pregunta: txt(q?.querySelector(".faq6-qt")), esperada: datos[i]?.question ?? null, h3: q?.parentElement?.tagName ?? null,
          aria: q ? [q.getAttribute("aria-expanded"), !!panel, panel?.getAttribute("role"), panel?.getAttribute("aria-labelledby") === q.id] : null,
          letra: q ? [cs(q).fontSize, cs(q).fontWeight] : null, alto: q ? Math.round(q.getBoundingClientRect().height) : null,
          signo: !!q?.querySelector(".faq6-sign[aria-hidden='true']"),
          fondo: cs(card).backgroundColor === color("--card"), radio: cs(card).borderTopLeftRadius, sombra: cs(card).boxShadow !== "none",
          borde: oscuro ? `${cs(card).borderTopWidth} ${cs(card).borderTopStyle} ${cs(card).borderTopColor}` : null,
          toque: [cs(li).pointerEvents, cs(card).pointerEvents],
          cerrada: panel ? { visibilidad: cs(panel).visibility, filas: cs(panel).gridTemplateRows, hoja: hoja ? cs(hoja).transform : null } : null,
          rangos: hoja ? { texto: (txt(hoja).match(RANGO) || []).length, bdi: [...hoja.querySelectorAll("bdi")].filter((b) => b.getAttribute("dir") === "ltr" && cs(b).whiteSpace === "nowrap" && /^\d+(?:[.,]\d+)?\s?[–-]\s?\d+(?:[.,]\d+)?%?$/.test(b.textContent.trim())).length } : null,
        };
      }),
      colTransform: cols.map((c) => cs(c).transform !== "none"), radioUi: css("border-top-left-radius", "var(--radius-ui, 8px)"), acento: color("--accent-strong"),
      pie: foot ? {
        abajo: foot.getBoundingClientRect().top >= mesa.getBoundingClientRect().bottom - 1,
        h2: [txt(h2), cs(h2).fontSize, cs(h2).fontWeight], kicker: kicker ? [txt(kicker), cs(kicker).fontSize, cs(kicker).color === color("--text")] : null,
        titulo: f.title || "", subtitulo: f.subtitle || "",
        accion: mas ? { txt: txt(mas), href: mas.getAttribute("href"), target: mas.getAttribute("target"), alto: Math.round(mas.getBoundingClientRect().height), letra: [cs(mas).fontSize, cs(mas).fontWeight] } : null,
        numero: W.toWhatsAppNumber?.(cfg.contact?.phone || "") || "",
        sombras: [h2, kicker, mas].map((e) => { const v = cs(e)?.textShadow; return v && v !== "none" ? v.split("px,").length : 0; }),
        radial: oscuro ? /radial-gradient/.test(cs(foot).backgroundImage) : null,
      } : null,
      escritorio: w >= 1024 ? { margen: cols.map((c) => cs(c).marginTop) } : null,
    };
  }, w);
}
/** La mesa: con la lista lejos del centro (su borde de arriba en el borde de abajo de la pantalla) las fichas de arriba se ven más chicas
 *  que las de abajo (la columna entera se recuesta desde abajo); en el centro, iguales. Ancho de la primera ficha ÷ la última. */
async function mesa(pg) {
  const proporcion = () => pg.evaluate(() => { const c = [...document.querySelectorAll(".faq6-col")[0]?.querySelectorAll(".faq6-card") ?? []]; if (c.length < 2) return null; return +(c[0].getBoundingClientRect().width / c[c.length - 1].getBoundingClientRect().width).toFixed(4); });
  await pg.evaluate(() => { const m = document.querySelector(".faq6-mesa"); const q = m.getBoundingClientRect(); scrollBy({ top: q.top - innerHeight, behavior: "instant" }); });
  await quieta(pg, "#faq");
  const lejos = await proporcion();
  await alCentro(pg, ".faq6-mesa");
  const centro = await proporcion();
  return { lejos, centro };
}
/** Escritorio, A: las dos columnas se mueven en sentidos opuestos con el scroll; C: quietas. La distancia vertical entre las dos al
 *  mover la página 200 px. */
async function columnas(pg) {
  const dist = () => pg.evaluate(() => { const [a, b] = document.querySelectorAll(".faq6-col"); return a && b ? b.getBoundingClientRect().top - a.getBoundingClientRect().top : null; });
  await alCentro(pg, ".faq6-mesa"); const d0 = await dist();
  await pg.evaluate(() => scrollBy({ top: 200, behavior: "instant" })); await quieta(pg, "#faq"); const d1 = await dist();
  return d0 == null || d1 == null ? null : +(d1 - d0).toFixed(1);
}
/** Abrir: la primera se abre, se acerca (translateZ 16 px) y las demás se alejan (−10 px); la hoja derecha; abrir otra cierra la primera. */
async function abrir(pg) {
  await alCentro(pg, ".faq6-mesa");
  const qs = await pg.$$(".faq6-q");
  if (qs.length < 2) return null;
  await qs[0].click(); await sinTransiciones(pg, "#faq");
  const una = await pg.evaluate(() => {
    const it = [...document.querySelectorAll(".faq6-item")];
    const z = (li) => +new DOMMatrix(getComputedStyle(li.querySelector(".faq6-card")).transform).m43.toFixed(1);
    const p = document.getElementById(it[0].querySelector(".faq6-q").getAttribute("aria-controls")), h = p.querySelector(".faq6-hoja");
    return { aria: it.map((li) => li.querySelector(".faq6-q").getAttribute("aria-expanded")).join(","), z: it.map(z), visible: getComputedStyle(p).visibility, hoja: getComputedStyle(h).transform };
  });
  await qs[1].click(); await sinTransiciones(pg, "#faq");
  const otra = await pg.evaluate(() => [...document.querySelectorAll(".faq6-q")].map((q) => q.getAttribute("aria-expanded")).join(","));
  return { una, otra };
}

// ── instagram ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function medirIg(pg, w) {
  return pg.evaluate(async (w) => {
    const css = window.__css, color = window.__color;
    const s = await import("/src/config/site.ts");
    const cfg = s.siteConfig; const ig = cfg.sections?.instagram || {}, gal = cfg.sections?.gallery || {};
    const sec = document.getElementById("instagram"); const raiz = sec?.querySelector(".ig6");
    if (!raiz) return { existe: false, seccion: sec ? sec.tagName : null };
    const cs = (e, p) => (e ? getComputedStyle(e, p) : null);
    const txt = (e) => (e?.textContent ?? "").replace(/[↖↗]/g, "").replace(/\s+/g, " ").trim();
    const oscuro = document.documentElement.classList.contains("dark");
    const foot = raiz.querySelector(".ig6-foot"), h2 = foot?.querySelector("h2"), kicker = foot?.querySelector(":scope > div > p"), mas = raiz.querySelector(".ig6-more");
    const abanico = raiz.querySelector(".ig6-abanico"), fotos = [...raiz.querySelectorAll(".ig6-foto")];
    const altDe = (src, i) => { const it = (gal.items || []).find((x) => x && x.src === src); return it ? (gal.alts?.[it.id] || it.alt || "") : `${ig.title || ""} · ${i + 1}`; };
    const rampa = parseFloat(css("height", "var(--veil-ramp-h, 12vh)"));
    const antes = cs(sec, "::before"), despues = cs(sec, "::after");
    const vt = document.querySelector("#gallery .gal-more");
    return {
      existe: true, seccion: sec.tagName, dinamica: raiz.dataset.dinamica, galeria: document.getElementById("gallery")?.dataset.gallery ?? null, oscuro,
      etiqueta: !!h2 && sec.getAttribute("aria-labelledby") === h2.id && h2.tagName === "H2",
      orden: [...document.querySelectorAll("[data-backdrop-content] > section, main > section")].map((x) => x.id).filter(Boolean).join(">"),
      fondo: {
        color: cs(sec).backgroundColor, velo: css("background-color", "color-mix(in srgb, var(--surface) calc(var(--veil-team, 0.65) * 100%), transparent)"), imagen: cs(sec).backgroundImage, relleno: [cs(sec).paddingTop, cs(sec).paddingBottom], rampa,
        antes: { top: antes.top, alto: antes.height, img: antes.backgroundImage.slice(0, 60) }, despues: { bottom: despues.bottom, alto: despues.height, img: despues.backgroundImage.slice(0, 60) },
      },
      abanico: abanico ? { alto: Math.round(abanico.getBoundingClientRect().height), toque: cs(abanico).touchAction } : null,
      fotos: fotos.map((li, i) => {
        const bt = li.querySelector("button.ig6-marco"), img = bt?.querySelector("img");
        return {
          boton: !!bt, presionado: bt?.getAttribute("aria-pressed") ?? null, etiqueta: bt?.getAttribute("aria-label") ?? null, esperada: img ? altDe(img.getAttribute("src"), i) : null,
          src: img?.getAttribute("src") ?? null, alt: img?.getAttribute("alt") ?? null, arrastrable: img?.draggable ?? null, ancho: bt?.offsetWidth ?? null,
          marco: bt ? { fondo: cs(bt).backgroundColor === color("--card"), radio: cs(bt).borderTopLeftRadius, sombra: cs(bt).boxShadow !== "none", relleno: [cs(bt).paddingTop, cs(bt).paddingBottom], borde: oscuro ? `${cs(bt).borderTopWidth} ${cs(bt).borderTopStyle} ${cs(bt).borderTopColor}` : null } : null,
          giro: +(Math.atan2(new DOMMatrix(cs(li).transform).b, new DOMMatrix(cs(li).transform).a) * 180 / Math.PI).toFixed(2),
        };
      }),
      galeriaSrc: (gal.items || []).slice(0, 6).map((x) => x.src), radioUi: css("border-top-left-radius", "var(--radius-ui, 8px)"), acento: color("--accent-strong"),
      pie: foot ? {
        h2: [txt(h2), cs(h2).fontSize, cs(h2).fontWeight], titulo: ig.title || "", kicker: kicker ? [txt(kicker), cs(kicker).fontSize] : null,
        accion: mas ? { txt: txt(mas), href: mas.getAttribute("href"), target: mas.getAttribute("target"), rel: mas.getAttribute("rel"), alto: Math.round(mas.getBoundingClientRect().height) } : null,
        verTodo: txt(vt), url: ig.url || "", cuenta: ig.handle || "",
        sombras: [h2, mas].map((e) => { const v = cs(e)?.textShadow; return v && v !== "none" ? v.split("px,").length : 0; }),
        radial: oscuro ? /radial-gradient/.test(cs(foot).backgroundImage) : null,
      } : null,
    };
  }, w);
}
/** El abanico al entrar (su centro al 105 % de la pantalla) y en el centro: los giros de cada foto. */
async function abanico(pg) {
  const giros = () => pg.evaluate(() => [...document.querySelectorAll(".ig6-foto")].map((li) => { const m = new DOMMatrix(getComputedStyle(li).transform); return +(Math.atan2(m.b, m.a) * 180 / Math.PI).toFixed(2); }));
  const ir = (pos) => pg.evaluate((pos) => { const a = document.querySelector(".ig6-abanico"); const q = a.getBoundingClientRect(); scrollBy({ top: q.top + q.height / 2 - innerHeight * pos, behavior: "instant" }); }, pos);
  await ir(1.05); await sinTransiciones(pg, "#instagram"); const cerrado = await giros();
  await ir(0.5); await sinTransiciones(pg, "#instagram"); const abierto = await giros();
  return { cerrado, abierto };
}

// ── D20 y pesos ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const d20 = (pg) => pg.evaluate(() => ({ galeria: (document.querySelector("#gallery .gal-more")?.textContent ?? "").replace(/[↖↗←→]/g, "").trim(), instagram: (document.querySelector(".ig6-more")?.textContent ?? "").replace(/[↖↗←→]/g, "").trim() }));
async function pesosSerif(pg) {
  // el predicado de bloque-04/4.3.md § «Pendiente … tipografía», sólo en #faq y en la sección de instagram, y sólo lo visible. La v1 de
  // instagram no tiene id: se la reconoce por su título (`sections.instagram.title`), como el prototipo.
  return pg.evaluate(async () => {
    const s = await import("/src/config/site.ts"); const t = (s.siteConfig.sections?.instagram?.title || "").trim();
    const secIg = document.getElementById("instagram") ?? [...document.querySelectorAll("section")].find((x) => t && [...x.querySelectorAll("h2, h3, p")].some((h) => h.textContent.trim() === t));
    const out = {};
    for (const [id, sec] of [["faq", document.getElementById("faq")], ["instagram", secIg]]) {
      const set = new Set();
      for (const el of sec?.querySelectorAll("*") ?? []) {
        const cs = getComputedStyle(el);
        if (!/^\s*["']?Frank Ruhl Libre/.test(cs.fontFamily)) continue;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        if (!el.checkVisibility()) continue;
        set.add(cs.fontWeight + " (" + el.tagName.toLowerCase() + ": " + el.textContent.trim().slice(0, 14) + ")");
      }
      out[id] = sec ? [...set].sort() : null;
    }
    return out;
  });
}
const sueltas = (pg, sel) => pg.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent).filter((t) => /(^|\s)[а-яё] /iu.test(t)).map((t) => t.slice(0, 40)), sel);

for (const p of PLANTILLAS) for (const lang of LANGS) {
  const f = { k: `${p}-${lang}` };
  // ── móvil 375
  {
    const { ctx, pg } = await pagina(p, lang, 375, 812);
    await alCentro(pg, "#faq");
    f.faq = await medirFaq(pg, 375);
    if (f.faq.existe) { f.mesa = await mesa(pg); f.abrir = await abrir(pg); }
    await alCentro(pg, "#instagram");
    f.ig = await medirIg(pg, 375);
    if (f.ig.existe) f.abanico = await abanico(pg);
    f.pesos = await pesosSerif(pg);
    if (lang === "ar") f.d20 = await d20(pg);
    if (lang === "ru") f.rusoSueltas = await sueltas(pg, ".faq6-qt, .faq6-hoja p, .faq6-foot h2, .faq6-foot p, .ig6-foot h2");
    await ctx.close();
  }
  if (SONDA) { filas.push(f); console.log(JSON.stringify(f)); continue; }
  // ── escritorio 1366 × 657 (la pantalla baja)
  {
    const { ctx, pg } = await pagina(p, lang, 1366, 657);
    await alCentro(pg, "#faq");
    const e = await medirFaq(pg, 1366); f.faqEscritorio = e.existe ? { columnas: e.columnas, margen: e.escritorio?.margen, letra: e.fichas.map((x) => x.letra) } : null;
    if (e.existe) f.faqSentidos = await columnas(pg);
    await alCentro(pg, "#instagram");
    const g = await medirIg(pg, 1366); f.igEscritorio = g.existe ? { anchos: g.fotos.map((x) => x.ancho), relleno: g.fotos.map((x) => x.marco?.relleno), alto: g.abanico?.alto, toque: g.abanico?.toque } : null;
    if (g.existe) f.abanicoEscritorio = await abanico(pg);
    await ctx.close();
  }
  // ── reduced-motion (escritorio, que es donde A mueve las columnas de faq): nada se mueve y el abanico queda abierto
  if (lang === "he") {
    const { ctx, pg } = await pagina(p, lang, 1366, 657, { reducedMotion: "reduce" });
    await alCentro(pg, "#faq");
    f.quietoFaq = await pg.evaluate(async () => { scrollBy({ top: 300, behavior: "instant" }); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return [...document.querySelectorAll(".faq6-col, .faq6-hoja")].map((e) => getComputedStyle(e).transform).filter((t) => t !== "none"); });
    f.quietoIg = await pg.evaluate(() => { const a = document.querySelector(".ig6-abanico"); return a ? { ...[...document.querySelectorAll(".ig6-foto")].reduce((o, li, i) => ({ ...o, [i]: getComputedStyle(li).transitionDuration }), {}) } : null; });
    if (f.quietoIg) f.abanicoQuieto = await abanico(pg);
    await ctx.close();
  }
  // ── casos de prueba por el fixture (sólo hebreo, móvil): con cuenta de Instagram, sin teléfono, una foto que no está en la galería
  //    y el orden de una clienta
  if (lang === "he") {
    {
      const { ctx, pg } = await pagina(p, lang, 375, 812, {}, (fx) => { fx.sections.instagram = { ...fx.sections.instagram, url: "https://www.instagram.com/prueba.salon/", handle: "prueba.salon" }; });
      await alCentro(pg, "#instagram");
      const g = await medirIg(pg, 375); f.conCuenta = g.existe ? g.pie : null;
      await ctx.close();
    }
    {
      const { ctx, pg } = await pagina(p, lang, 375, 812, {}, (fx) => { fx.contact = { ...fx.contact, phone: "" }; });
      await alCentro(pg, "#faq");
      f.sinTelefono = await pg.evaluate(() => (document.querySelector(".faq6") ? { accion: document.querySelectorAll(".faq6-more").length } : null));
      await ctx.close();
    }
    {
      // la primera foto de instagram pasa a ser una que no está en la galería (la de un servicio, que también está en el material)
      const { ctx, pg } = await pagina(p, lang, 375, 812, {}, (fx) => { const otra = (fx.sections.services?.images || []).find((x) => x && !(fx.sections.gallery.items || []).some((g) => g.src === x)); const imgs = fx.sections.instagram?.images; if (otra && Array.isArray(imgs) && imgs.length) fx.sections.instagram = { ...fx.sections.instagram, images: [otra, ...imgs.slice(1)] }; });
      await alCentro(pg, "#instagram");
      const g = await medirIg(pg, 375); f.fueraDeGaleria = g.existe ? g.fotos.slice(0, 2).map((x) => ({ etiqueta: x.etiqueta, esperada: x.esperada })) : null;
      await ctx.close();
    }
    {
      const orden = ["hero", "services", "gallery", "team", "testimonials", "faq", "instagram", "contactHub"];
      const { ctx, pg } = await pagina(p, lang, 375, 812, {}, (fx) => { fx.sectionOrder = orden; });
      f.ordenClienta = await pg.evaluate(() => [...document.querySelectorAll("[data-backdrop-content] > section, main > section")].map((x) => x.id).filter(Boolean).join(">"));
      await ctx.close();
    }
  }
  filas.push(f); console.log(JSON.stringify(f));
}
await b.close();
writeFileSync(`${OUT}.json`, JSON.stringify(filas, null, 1));
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
