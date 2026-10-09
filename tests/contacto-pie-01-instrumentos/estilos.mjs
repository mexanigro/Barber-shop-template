// CONTACTO-PIE-01 · copia editable (CIERRE-TRAMO-01, D-221) del instrumento congelado de la orden: igual, salvo SG_CASOS (tomaPL).
// CONTACTO-PIE-01 · estilos: lo que el paquete de migración aprobado fija y los instrumentos de diseño no miden (sesión A, 2026-10-03).
// Sólo lectura. Uso: node estilos.mjs <salida> [idiomas] [plantillas] [sonda]. Mide en la página renderizada (INFORME §§ 6.9 y 6.10,
// CONTACTO-01 §§ 2 y 4, PIE-01 § 1, y los prototipos contacto/prototipo y pie/prototipo):
//  contacto: la variante (raíz `.ct6` con `data-dinamica` = la de la galería), dos bloques `<section>` con su h2 (aria-labelledby), la
//    superficie (velo de contacto, rampa de entrada desde --surface arriba y media rampa abajo, las dos delante del velo), el mapa (una
//    tarjeta que es un solo enlace a Google Maps, el iframe sin toque, fuera del foco y del lector, en gris con el tinte del acento —en
//    oscuro invertido—, pedido recién a una pantalla de distancia), la tarjeta de horarios (--card, radio, relieve, borde en oscuro, «hoy»
//    en una pastilla de acento, cerrado en --text-muted), la composición (móvil: desde SECCIONES-02, S2-2 —mapa y horarios apilados—: la
//    escena medida aquí la juzga `juezContactoS22` de la copia promovida, no el «mapa 88 % y tarjeta 84 %» de CONTACTO-01 § 4; escritorio: el mapa ancho de
//    min(62vh, 30rem) y la tarjeta de 20 rem al costado; A en sentidos opuestos con el scroll, C quietos; nada con reduced-motion), el
//    formulario (etiquetas de 13/500, campos de 16 px, enviar en contorno de acento —en oscuro el texto en --highlight—, estado en
//    role=status; dos columnas en escritorio) y los pies (h2 16/500, kicker 12 px, la acción 15/500 de 44 px, halo y en oscuro fondo radial);
//  pie: la variante (raíz `.pie6` en el footer), la superficie (el footer en --surface sin ::before/::after y la pared de textura en una
//    capa propia con la máscara de la galería), el cierre (sólo con showBooking: tarjeta 4:5 —21:9 en escritorio— con la escena del hero
//    —el póster vertical en móvil—, scrim, eyebrow y título en la serif 300 de 32 —52— px, reservar en contorno, la foto que se mueve con
//    el scroll y quieta con reduced-motion), la marca (el logo de la tinta del modo, que vuelve arriba, y brand.tagline), la navegación
//    (nav con su h2, 2 columnas en móvil), el contacto, la barra legal (© con la marca aislada en <bdi>, 144 px abajo en móvil), enlaces
//    de 44 px en --text y 3 columnas en escritorio;
//  y los pesos de Frank Ruhl Libre visibles en #contact y en el footer (pendiente c de ARREGLOS-02: contacto y pie) y, en ruso, ninguna
//  palabra de una letra con espacio común (D18).
// Escribe <salida>.json. La SONDA es este mismo instrumento sólo en móvil, con dos idiomas y una plantilla (`estilos.mjs <salida> he,ar a sonda`).
import { writeFileSync } from "node:fs";
import { chromium, contexto, conFixture, url, listo, quieta, sinTransiciones, sinMaterial, tomaPL } from "./_nav.mjs";
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
  await listo(pg, "footer");
  return { ctx, pg };
}
const alCentro = async (pg, sel) => { if (await pg.evaluate((s) => { const e = document.querySelector(s); e?.scrollIntoView({ block: "center", behavior: "instant" }); return !!e; }, sel)) await quieta(pg, sel); };

// ── contacto ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function medirCt(pg) {
  return pg.evaluate(async () => {
    const css = window.__css, color = window.__color;
    const s = await import("/src/config/site.ts"); const L = (await import("/src/config/locale.ts")).localeConfig; const W = await import("/src/lib/whatsapp.ts");
    const cfg = s.siteConfig;
    const sec = document.getElementById("contact"); const raiz = sec?.querySelector(".ct6");
    if (!raiz) return { existe: false, seccion: sec ? sec.tagName : null };
    const cs = (e, p) => (e ? getComputedStyle(e, p) : null);
    const txt = (e) => (e?.textContent ?? "").replace(/[↖↗]/g, "").replace(/\s+/g, " ").trim();
    const oscuro = document.documentElement.classList.contains("dark");
    const borde = (e) => (e ? `${cs(e).borderTopWidth} ${cs(e).borderTopStyle} ${cs(e).borderTopColor}` : null);
    const halo = (e) => { const v = cs(e)?.textShadow; return v && v !== "none" ? v.split("px,").length : 0; };
    const bloque = (b) => { if (!b) return null; const h2 = b.querySelector(":scope > .ct6-foot h2"); return { tag: b.tagName, etiqueta: !!h2 && b.getAttribute("aria-labelledby") === h2.id }; };
    const pie = (f, h2esp, kesp) => {
      if (!f) return null; const h2 = f.querySelector("h2"), k = f.querySelector(":scope > div > p"), a = f.querySelector(".ct6-more");
      return { h2: [txt(h2), cs(h2).fontSize, cs(h2).fontWeight, cs(h2).color === color("--text")], h2esp, kicker: k ? [txt(k), cs(k).fontSize, cs(k).color === color("--text")] : null, kesp,
        accion: a ? { txt: txt(a), href: a.getAttribute("href"), target: a.getAttribute("target"), alto: Math.round(a.getBoundingClientRect().height), letra: [cs(a).fontSize, cs(a).fontWeight] } : null,
        sombras: [h2, k, a].filter(Boolean).map(halo), radial: oscuro ? /radial-gradient/.test(cs(f).backgroundImage) : null };
    };
    const ubi = raiz.querySelector("section.ubi6"), fb = raiz.querySelector("section.form6");
    const mapa = raiz.querySelector(".ubi6-mapa"), fr = mapa?.querySelector("iframe"), tinte = mapa?.querySelector(".ubi6-tinte");
    const horas = raiz.querySelector(".ubi6-horas"), escena = raiz.querySelector(".ubi6-escena");
    const lis = [...raiz.querySelectorAll(".ubi6-lista li")], hoy = raiz.querySelector(".ubi6-hoy");
    const cerrado = raiz.querySelector('.ubi6-lista li[data-cerrado="1"] .ubi6-rango');
    const card = raiz.querySelector(".form6-card"), enviar = raiz.querySelector(".form6-enviar"), estado = raiz.querySelector(".form6-estado");
    const labels = [...raiz.querySelectorAll(".form6-campo label")], campos = [...raiz.querySelectorAll(".form6-campo :is(input, textarea)")];
    const desc = raiz.querySelector(".form6-desc");
    const antes = cs(sec, "::before"), despues = cs(sec, "::after"), rampa = parseFloat(css("height", "var(--veil-ramp-h, 12vh)"));
    const a = cfg.contact?.address || {}; const direccion = [a.street, a.district, a.cityStateZip].map((x) => (x || "").trim()).filter(Boolean).join(document.documentElement.lang === "ar" ? "، " : ", ");
    const q = (e) => e?.getBoundingClientRect();
    return {
      existe: true, dinamica: raiz.dataset.dinamica, galeria: document.getElementById("gallery")?.dataset.gallery ?? null, oscuro,
      etiquetaSec: sec.getAttribute("aria-labelledby"), ubi: bloque(ubi), form: bloque(fb), formEncendido: !!cfg.features?.showInquiry,
      superficie: {
        color: cs(sec).backgroundColor, velo: css("background-color", "color-mix(in srgb, var(--surface) calc(var(--veil-contact, 0.65) * 100%), transparent)"), imagen: cs(sec).backgroundImage,
        relleno: [cs(sec).paddingTop, cs(sec).paddingBottom], rellenoEsp: [css("padding-top", "1.5rem"), css("padding-top", "calc(var(--veil-ramp-h, 12vh) * 0.5 + 2rem)")], rampa,
        antes: { top: antes.top, alto: antes.height, z: antes.zIndex, img: antes.backgroundImage.slice(0, 40) }, despues: { bottom: despues.bottom, alto: despues.height, z: despues.zIndex, img: despues.backgroundImage.slice(0, 40) },
      },
      mapa: mapa ? {
        tag: mapa.tagName, href: mapa.getAttribute("href"), esperado: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`, target: mapa.getAttribute("target"),
        etiqueta: mapa.getAttribute("aria-label"), etiquetaEsp: `${L.location?.openGoogleMaps || ""}: ${direccion}`, controles: mapa.querySelectorAll("a, button, input, [tabindex]:not([tabindex='-1'])").length,
        radio: cs(mapa).borderTopLeftRadius, sombra: cs(mapa).boxShadow !== "none", borde: oscuro ? borde(mapa) : null,
        iframe: fr ? { toque: cs(fr).pointerEvents, tab: fr.getAttribute("tabindex"), oculto: fr.getAttribute("aria-hidden"), filtro: cs(fr).filter, titulo: fr.getAttribute("title"), src: fr.getAttribute("src") } : null,
        tinte: tinte ? { mezcla: cs(tinte).mixBlendMode, fondo: cs(tinte).backgroundColor === color("--accent-strong"), opacidad: cs(tinte).opacity } : null,
      } : null,
      horas: horas ? {
        fondo: cs(horas).backgroundColor === color("--card"), radio: cs(horas).borderTopLeftRadius, sombra: cs(horas).boxShadow !== "none", borde: oscuro ? borde(horas) : null,
        eyebrow: (() => { const e = horas.querySelector(".ubi6-eyebrow"); return e ? [txt(e), cs(e).fontSize, cs(e).fontWeight] : null; })(), eyebrowEsp: L.businessHours?.eyebrow || "",
        dir: txt(horas.querySelector(".ubi6-dir")), dirEsp: direccion, letraFila: lis[0] ? cs(lis[0]).fontSize : null,
        hoy: hoy ? { fondo: cs(hoy).backgroundColor === color("--accent-strong"), tinta: cs(hoy).color === color("--accent-foreground"), radio: cs(hoy).borderTopLeftRadius, letra: cs(hoy).fontSize, txt: txt(hoy), esp: L.businessHours?.today || "", dentroDelDia: !!hoy.closest(".ubi6-dia") } : null,
        cerrado: cerrado ? cs(cerrado).color === color("--text-muted") : null,
        rangos: [...horas.querySelectorAll(".ubi6-rango bdi")].map((x) => [x.getAttribute("dir"), cs(x.parentElement).whiteSpace]),
      } : null,
      escena: escena && mapa && horas ? { ancho: q(escena).width, mapa: q(mapa).width, horas: q(horas).width, altoMapa: q(mapa).height, columnas: cs(escena).gridTemplateColumns } : null,
      altoMapaEsp: parseFloat(css("height", "min(62vh, 30rem)")), anchoHorasEsp: parseFloat(css("width", "20rem")),
      formulario: card ? {
        margen: cs(fb).marginTop, fondo: cs(card).backgroundColor === color("--card"), radio: cs(card).borderTopLeftRadius, sombra: cs(card).boxShadow !== "none", borde: oscuro ? borde(card) : null,
        columnas: cs(card).gridTemplateColumns.split(" ").length, desc: desc ? [txt(desc), cs(desc).fontSize, cs(desc).color === color("--text"), halo(desc)] : null, descEsp: cfg.sections?.contact?.description || "",
        labels: labels.map((l) => [cs(l).fontSize, cs(l).fontWeight, cs(l).color === color("--text")]), campos: campos.map((c) => [c.tagName, c.name, cs(c).fontSize, c.required, c.getAttribute("autocomplete")]),
        enviar: enviar ? { tipo: enviar.type, fondo: cs(enviar).backgroundColor, tinta: cs(enviar).color, tintaEsp: oscuro ? color("--highlight") : color("--accent-strong"), contorno: /inset/.test(cs(enviar).boxShadow), alto: Math.round(q(enviar).height), letra: [cs(enviar).fontSize, cs(enviar).fontWeight], txt: txt(enviar) } : null,
        estado: estado ? [estado.getAttribute("role"), estado.getAttribute("aria-live")] : null,
      } : null,
      pieUbi: pie(ubi?.querySelector(":scope > .ct6-foot"), cfg.sections?.location?.subtitle || "", cfg.sections?.location?.title || ""),
      pieForm: pie(fb?.querySelector(":scope > .ct6-foot"), cfg.sections?.contact?.subtitle || "", cfg.sections?.contact?.title || ""),
      mapsTxt: L.location?.openInMaps || "", numero: W.toWhatsAppNumber?.(cfg.contact?.phone || "") || "", radioUi: css("border-top-left-radius", "var(--radius-ui, 8px)"), acento: color("--accent-strong"),
    };
  });
}
/** D21: con la página arriba de todo el iframe del mapa no tiene src; a una pantalla de distancia, sí. */
async function mapaDiferido(pg) {
  await pg.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await quieta(pg, "body");
  const arriba = await pg.evaluate(() => document.querySelector(".ubi6-mapa iframe")?.getAttribute("src") ?? null);
  await pg.evaluate(() => { const m = document.querySelector(".ubi6-mapa"); const q = m.getBoundingClientRect(); scrollBy({ top: q.top - innerHeight * 2.5, behavior: "instant" }); }); await quieta(pg, "body");
  const lejos = await pg.evaluate(() => document.querySelector(".ubi6-mapa iframe")?.getAttribute("src") ?? null);
  await alCentro(pg, ".ubi6-mapa");
  await pg.waitForFunction(() => !!document.querySelector(".ubi6-mapa iframe")?.getAttribute("src"), null, { timeout: 10000 }).catch(() => {});
  const cerca = await pg.evaluate(() => document.querySelector(".ubi6-mapa iframe")?.getAttribute("src") ?? null);
  return { arriba, lejos, cerca };
}
/** Escritorio: con el scroll el mapa y la tarjeta de horarios (A) se mueven en sentidos opuestos; C quietos. Distancia vertical entre
 *  los dos al bajar 200 px. */
async function sentidosCt(pg) {
  const dist = () => pg.evaluate(() => { const m = document.querySelector(".ubi6-mapa"), h = document.querySelector(".ubi6-horas"); return m && h ? h.getBoundingClientRect().top - m.getBoundingClientRect().top : null; });
  await alCentro(pg, ".ubi6-escena"); const d0 = await dist();
  await pg.evaluate(() => scrollBy({ top: 200, behavior: "instant" })); await quieta(pg, "#contact"); const d1 = await dist();
  return d0 == null || d1 == null ? null : +(d1 - d0).toFixed(1);
}

// ── pie ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function medirPie(pg) {
  return pg.evaluate(async () => {
    const css = window.__css, color = window.__color;
    const s = await import("/src/config/site.ts"); const L = (await import("/src/config/locale.ts")).localeConfig;
    const cfg = s.siteConfig; const F = L.footer || {};
    const pie = document.querySelector("footer"); const raiz = pie?.querySelector(".pie6");
    if (!raiz) return { existe: false };
    const cs = (e, p) => (e ? getComputedStyle(e, p) : null);
    const txt = (e) => (e?.textContent ?? "").replace(/[↖↗]/g, "").replace(/\s+/g, " ").trim();
    const oscuro = document.documentElement.classList.contains("dark");
    const q = (e) => e?.getBoundingClientRect();
    const wall = raiz.querySelector(".pie6-wall"), cierre = raiz.querySelector("section.cierre6"), card = raiz.querySelector(".cierre6-card");
    const foto = raiz.querySelector(".cierre6-foto"), fuente = raiz.querySelector(".cierre6-card picture source"), titulo = raiz.querySelector(".cierre6-titulo"), eyebrow = raiz.querySelector(".cierre6-eyebrow"), accion = raiz.querySelector(".cierre6-accion");
    const logo = raiz.querySelector(".pie6-logo"), linea = raiz.querySelector(".pie6-linea");
    const nav = raiz.querySelector("nav.pie6-col"), listaNav = raiz.querySelector(".pie6-lista--nav"), heads = [...raiz.querySelectorAll(".pie6-h")];
    const enlaces = [...raiz.querySelectorAll(".pie6-lista a, .pie6-legal :is(a, button), .pie6-logo")];
    const barra = raiz.querySelector(".pie6-barra"), copy = raiz.querySelector(".pie6-copy"), cuerpo = raiz.querySelector(".pie6-cuerpo");
    const v = cfg.hero?.video || {};
    return {
      existe: true, oscuro,
      superficie: { fondo: cs(pie).backgroundColor === color("--surface"), imagen: cs(pie).backgroundImage, antes: cs(pie, "::before").display, despues: cs(pie, "::after").display,
        pared: wall ? { pos: cs(wall).position, fondo: cs(wall).backgroundColor === color("--surface-alt"), img: /url\(/.test(cs(wall).backgroundImage), mascara: /linear-gradient/.test(cs(wall).maskImage || cs(wall).webkitMaskImage || "") } : null },
      reservas: !!cfg.features?.showBooking,
      cierre: cierre ? {
        etiqueta: !!titulo && cierre.getAttribute("aria-labelledby") === titulo.id && titulo.tagName === "H2", relleno: cs(cierre).paddingTop, rellenoEsp: css("padding-top", "calc(var(--gal-fade, 12vh) * 0.6)"),
        proporcion: +(q(card).width / q(card).height).toFixed(3), ancho: q(card).width, alto: q(card).height, radio: cs(card).borderTopLeftRadius, sombra: cs(card).boxShadow !== "none", borde: oscuro ? `${cs(card).borderTopWidth} ${cs(card).borderTopStyle} ${cs(card).borderTopColor}` : null,
        foto: foto ? { src: foto.getAttribute("src"), alt: foto.getAttribute("alt"), ajuste: cs(foto).objectFit, actual: foto.currentSrc } : null, fuente: fuente ? [fuente.getAttribute("media"), fuente.getAttribute("srcset")] : null,
        poster: v.poster || cfg.hero?.backgroundImage || "", posterV: v.portrait?.poster || "",
        scrim: /gradient/.test(cs(card, "::after").backgroundImage),
        eyebrow: eyebrow ? [txt(eyebrow), cs(eyebrow).fontSize, cs(eyebrow).fontWeight] : null, eyebrowEsp: F.ctaEyebrow || "",
        titulo: titulo ? [txt(titulo), cs(titulo).fontSize, cs(titulo).fontWeight, cs(titulo).fontFamily === css("font-family", "var(--font-serif)")] : null, tituloEsp: F.ctaTitle || "",
        accion: accion ? { tag: accion.tagName, txt: txt(accion), esp: L.buttons?.bookAppointment || "", contorno: /inset/.test(cs(accion).boxShadow), alto: Math.round(q(accion).height), letra: [cs(accion).fontSize, cs(accion).fontWeight] } : null,
      } : null,
      marca: logo ? { href: logo.getAttribute("href"), etiqueta: logo.getAttribute("aria-label"), nombre: cfg.brand?.name || "", img: logo.querySelector("img")?.getAttribute("src") ?? null, esperado: oscuro ? (cfg.brand?.logoDark || cfg.brand?.logo || null) : (cfg.brand?.logo || cfg.brand?.logoDark || null), alto: Math.round(q(logo).height) } : null,
      linea: linea ? [txt(linea), cs(linea).fontSize, cs(linea).color === color("--text")] : null, lineaEsp: cfg.brand?.tagline || "",
      nav: nav ? { etiqueta: nav.getAttribute("aria-labelledby") === nav.querySelector("h2")?.id, h2: txt(nav.querySelector("h2")), h2Esp: F.exploreTitle || "", columnas: cs(listaNav).gridTemplateColumns.split(" ").length } : null,
      cabezas: heads.map((h) => [h.tagName, cs(h).fontSize, cs(h).fontWeight]), contactoH: txt(heads[1]), contactoHEsp: F.contactHeading || "",
      enlaces: enlaces.map((e) => [Math.round(q(e).height), cs(e).color === color("--text")]),
      barra: barra ? { abajo: cs(barra).paddingBottom, columnas: cs(barra).gridTemplateColumns.split(" ").length } : null,
      copy: copy ? { txt: txt(copy), bdi: copy.querySelector("bdi")?.textContent ?? null, nombre: cfg.brand?.name || "", derechos: F.rightsReserved || "", letra: cs(copy).fontSize } : null,
      cuerpo: cuerpo ? cs(cuerpo).gridTemplateColumns.split(" ").length : null,
    };
  });
}
/** La foto del cierre se mueve dentro de su tarjeta con el scroll: el desplazamiento vertical de la foto respecto de la tarjeta, en dos
 *  posiciones (la tarjeta abajo de la pantalla y en el centro). */
async function fotoCierre(pg) {
  const dy = () => pg.evaluate(() => { const c = document.querySelector(".cierre6-card"), f = document.querySelector(".cierre6-foto"); return c && f ? +(f.getBoundingClientRect().top - c.getBoundingClientRect().top).toFixed(1) : null; });
  const ir = (pos) => pg.evaluate((pos) => { const c = document.querySelector(".cierre6-card"); const q = c.getBoundingClientRect(); scrollBy({ top: q.top + q.height / 2 - innerHeight * pos, behavior: "instant" }); }, pos);
  if (!(await pg.$(".cierre6-card"))) return null;
  await ir(0.85); await quieta(pg, "footer"); const abajo = await dy();
  await ir(0.5); await quieta(pg, "footer"); const centro = await dy();
  return { abajo, centro };
}

// ── pesos de la serif y ruso ────────────────────────────────────────────────────────────────────────────────────────────────────
async function pesosSerif(pg) {
  // el predicado de bloque-04/4.3.md § «Pendiente … tipografía», sólo en #contact y en el footer, y sólo lo visible
  return pg.evaluate(() => {
    const out = {};
    for (const [id, sec] of [["contact", document.getElementById("contact")], ["footer", document.querySelector("footer")]]) {
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
  if (!tomaPL(p, lang)) continue; // copia promovida (CIERRE-TRAMO-01, D-221): con SG_CASOS, sólo la plantilla y el idioma de cada caso
  const f = { k: `${p}-${lang}` };
  // ── móvil 375
  {
    const { ctx, pg } = await pagina(p, lang, 375, 812);
    if (lang === "he") f.mapaDiferido = (await pg.$(".ubi6-mapa")) ? await mapaDiferido(pg) : null;
    await alCentro(pg, "#contact");
    f.ct = await medirCt(pg);
    await alCentro(pg, "footer");
    f.pie = await medirPie(pg);
    f.pesos = await pesosSerif(pg);
    if (lang === "ru") f.rusoSueltas = await sueltas(pg, ".ct6 :is(h2, p, a, label, button, span), .pie6 :is(h2, p, a, button)");
    await ctx.close();
  }
  if (SONDA) { filas.push(f); console.log(JSON.stringify(f)); continue; }
  // ── escritorio 1366 × 657 (la pantalla baja)
  {
    const { ctx, pg } = await pagina(p, lang, 1366, 657);
    await alCentro(pg, "#contact");
    const c = await medirCt(pg); f.ctEscritorio = c.existe ? { escena: c.escena, altoMapaEsp: c.altoMapaEsp, anchoHorasEsp: c.anchoHorasEsp, columnasForm: c.formulario?.columnas, margenForm: c.formulario?.margen, letraFila: c.horas?.letraFila, desc: c.formulario?.desc?.[1] } : null;
    if (c.existe) f.ctSentidos = await sentidosCt(pg);
    await alCentro(pg, "footer");
    const e = await medirPie(pg); f.pieEscritorio = e.existe ? { cierre: e.cierre && { proporcion: e.cierre.proporcion, alto: e.cierre.alto, titulo: e.cierre.titulo?.[1], foto: e.cierre.foto?.actual }, cuerpo: e.cuerpo, barra: e.barra } : null;
    if (e.existe) f.fotoCierre = await fotoCierre(pg);
    await ctx.close();
  }
  // ── reduced-motion (escritorio, que es donde A mueve el mapa y la tarjeta): nada se mueve
  if (lang === "he") {
    const { ctx, pg } = await pagina(p, lang, 1366, 657, { reducedMotion: "reduce" });
    f.quietoCt = (await pg.$(".ubi6-escena")) ? await sentidosCt(pg) : null;
    f.quietoPie = (await pg.$(".cierre6-card")) ? await fotoCierre(pg) : null;
    await ctx.close();
  }
  // ── casos de prueba por el fixture (sólo hebreo, móvil): sin reservas (sin cierre) y sin teléfono (sin WhatsApp en el pie de contacto)
  if (lang === "he") {
    {
      const { ctx, pg } = await pagina(p, lang, 375, 812, {}, (fx) => { fx.features = { ...(fx.features || {}), showBooking: false }; });
      f.sinReservas = await pg.evaluate(() => (document.querySelector(".pie6") ? { cierre: document.querySelectorAll(".cierre6").length } : null));
      await ctx.close();
    }
    {
      const { ctx, pg } = await pagina(p, lang, 375, 812, {}, (fx) => { fx.contact = { ...fx.contact, phone: "" }; });
      await alCentro(pg, "#contact");
      f.sinTelefono = await pg.evaluate(() => (document.querySelector(".ct6") ? { accion: document.querySelectorAll("section.form6 .ct6-more").length } : null));
      await ctx.close();
    }
  }
  filas.push(f); console.log(JSON.stringify(f));
}
await b.close();
writeFileSync(`${OUT}.json`, JSON.stringify(filas, null, 1));
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
