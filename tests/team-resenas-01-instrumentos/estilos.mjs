// TEAM-RESENAS-01 · estilos: lo que el paquete de migración aprobado fija y los instrumentos de diseño no miden (sesión A, 2026-10-01).
// Sólo lectura. Uso: node estilos.mjs <salida> [idiomas]. Mide en A y C, he/en/ru/ar, la página renderizada (INFORME §§ 6.5 y 6.6,
// TEAM-01 §§ 1, 3-bis y 3-ter, RESENAS-01 §§ 3 y 6):
//  team: la variante (raíz `.team6` con `data-dinamica` = la de la galería), la tarjeta como un solo control con su nombre accesible,
//    el pie abajo (h2, kicker, «reservar» y la descripción), el halo y el fondo radial en oscuro, el fondo como services (velo y
//    rampas), móvil (las dos capas de la foto, el scrim, el texto al borde de afuera, la frase en todas o en ninguna, el zigzag de A)
//    y escritorio (3 columnas, retrato 4:5, el desfase de A, el ancho del bloque), quieto con reduced-motion, ruso con espacio duro
//    y la descripción árabe de team (D17);
//  reseñas: la variante (`.res6`, `data-dinamica`), la superficie (textura en capa propia con máscara), la pieza (no es un control,
//    la cita en la serif liviana sin cursiva ni comillas, el tamaño según el largo, las estrellas como Google), la nota de sección y
//    sus textos (R-2, D11-4), el pie con el promedio y la cantidad (R-1), móvil (zigzag en A, tramos en C), escritorio (3 columnas,
//    el desfase de A), quieto con reduced-motion y ruso con espacio duro;
//  y los pesos de Frank Ruhl Libre visibles en #team y #testimonials (pendiente c, sólo esas dos secciones).
// Escribe <salida>.json. La sonda es este mismo instrumento con un solo idioma (he).
// COPIA PROMOVIDA (INSTAGRAM-FAQ-01, D-200) de tests/orden/team-resenas-01/instrumentos/estilos.mjs. Lo que mide no cambia, salvo una
// medida más: el desborde de cada cita (para el juez de la copia, que fija los tamaños del paquete en móvil y en escritorio). Las
// esperas son condiciones (./_nav.mjs: `listo`, `quieta`) y, con SG_CASOS, sólo las plantillas e idiomas de los casos.
import { writeFileSync } from "node:fs";
import { chromium, contexto, url, sinMaterial, listo, quieta, tomaPL } from "./_nav.mjs";
const OUT = process.argv[2];
const LANGS = (process.argv[3] || "he,en,ru,ar").split(",");

const b = await chromium.launch();
const filas = [];
async function pagina(p, lang, w, h, extra = {}) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, ...extra });
  const pg = await ctx.newPage();
  // el valor computado de una expresión CSS de la página (un color, un largo), para compararlo con el de un elemento
  await pg.addInitScript(() => {
    window.__css = (prop, valor) => { const e = document.createElement("i"); e.style.position = "absolute"; e.style.setProperty(prop, valor); document.body.append(e); const c = getComputedStyle(e)[prop.replace(/-(\w)/g, (_, l) => l.toUpperCase())]; e.remove(); return c; };
    window.__color = (v) => window.__css("color", `var(${v})`);
  });
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(p), { waitUntil: "networkidle", timeout: 120000 });
  await listo(pg, "#testimonials");
  return { ctx, pg };
}
const alCentro = async (pg, sel) => { await pg.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center", behavior: "instant" }), sel); await quieta(pg, sel); };

// ── lo que se mide en la página (corre en el navegador) ───────────────────────────────────────────────────────────────────────
async function medirTeam(pg, w) {
  return pg.evaluate(async (w) => {
    const css = window.__css, color = window.__color;
    const s = await import("/src/config/site.ts"); const L = (await import("/src/config/locale.ts")).localeConfig;
    const cfg = s.siteConfig; const sec = document.getElementById("team"); const raiz = sec?.querySelector(".team6");
    if (!raiz) return { existe: false };
    const cs = (e, p) => (e ? getComputedStyle(e, p) : null);
    const txt = (e) => (e?.textContent ?? "").trim();
    const cards = [...raiz.querySelectorAll(".team6-card")];
    const staff = cfg.staff || [];
    const t = cfg.sections?.team || {};
    const foot = raiz.querySelector(".team6-foot"), list = raiz.querySelector(".team6-list");
    const h2 = foot?.querySelector("h2"), kicker = foot?.querySelector("p"), book = raiz.querySelector(".team6-book"), desc = raiz.querySelector(".team6-desc");
    const sombras = [h2, kicker, book, desc].map((e) => { const v = cs(e)?.textShadow; return v && v !== "none" ? v.split("px,").length : 0; });
    const secCs = cs(sec), antes = cs(sec, "::before"), despues = cs(sec, "::after");
    const rampa = parseFloat(css("height", "var(--veil-ramp-h, 12vh)"));
    const oscuro = document.documentElement.classList.contains("dark");
    const out = {
      existe: true, dinamica: raiz.dataset.dinamica, galeria: document.getElementById("gallery")?.dataset.gallery ?? null,
      tarjetas: cards.map((c, i) => ({
        tag: c.tagName, href: c.getAttribute("href"), label: c.getAttribute("aria-label"),
        esperado: staff[i] ? `${staff[i].name} · ${staff[i].specialty} · ${L.team?.viewProfile || ""}` : null,
        controlesDentro: c.querySelectorAll("a, button, input, select, textarea, [tabindex]").length,
        radio: cs(c).borderTopLeftRadius, sombra: cs(c).boxShadow !== "none", transicion: `${cs(c).transitionProperty} ${cs(c).transitionDuration}`,
        borde: oscuro ? `${cs(c).borderTopWidth} ${cs(c).borderTopStyle} ${cs(c).borderTopColor}` : null,
      })),
      radioUi: css("border-top-left-radius", "var(--radius-ui, 8px)"), acento: color("--accent-strong"),
      pie: foot && list ? {
        abajo: foot.getBoundingClientRect().top >= list.getBoundingClientRect().bottom - 1,
        h2: [txt(h2), cs(h2).fontSize, cs(h2).fontWeight], kicker: [txt(kicker), cs(kicker).fontSize, cs(kicker).color === color("--text")],
        subtitulo: t.subtitle || "", titulo: t.title || "",
        reservar: book ? { tag: book.tagName, txt: txt(book), alto: Math.round(book.getBoundingClientRect().height), esperado: L.buttons?.bookAppointment || "" } : null,
        descripcion: desc ? { txt: txt(desc), esperado: t.description || "", anchoMax: cs(desc).maxWidth, debajo: desc.getBoundingClientRect().top >= foot.getBoundingClientRect().bottom - 1 } : null,
        sombras, radial: oscuro ? [cs(foot).backgroundImage, desc ? cs(desc).backgroundImage : null].map((v) => /radial-gradient/.test(v ?? "")) : null,
      } : null,
      fondo: {
        color: secCs.backgroundColor, velo: css("background-color", "color-mix(in srgb, var(--surface) calc(var(--veil-services, 0.65) * 100%), transparent)"),
        imagen: secCs.backgroundImage, arriba: secCs.paddingTop, abajo: secCs.paddingBottom, rampa,
        antes: { top: antes.top, alto: antes.height, img: antes.backgroundImage.slice(0, 60) }, despues: { bottom: despues.bottom, alto: despues.height, img: despues.backgroundImage.slice(0, 60) },
      },
      oscuro, frases: cards.map((c) => c.querySelector(".team6-tag")).map((e) => (e && getComputedStyle(e).display !== "none" ? txt(e) : null)),
    };
    if (w < 1024) {
      out.movil = cards.map((c) => {
        const k = c.getBoundingClientRect(), ext = c.querySelector(".team6-ext"), foto = c.querySelector(".team6-photo"), body = c.querySelector(".team6-body");
        const f = foto.getBoundingClientRect(), bo = body.getBoundingClientRect(), bcs = cs(body);
        return {
          columnas: cs(c).gridTemplateColumns, ancho: Math.round(k.width),
          ext: ext ? { display: cs(ext).display, filtro: cs(ext).filter } : null,
          mascara: (cs(foto).maskImage || cs(foto).webkitMaskImage || "").slice(0, 60), fotoAncho: Math.round((f.width / k.width) * 100),
          fotoLado: f.left <= k.left + 1 ? "izq" : "der", scrim: cs(c, "::after").backgroundImage.slice(0, 40),
          letra: [cs(c.querySelector(".team6-name")).fontSize, cs(c.querySelector(".team6-role")).fontSize, c.querySelector(".team6-tag") ? cs(c.querySelector(".team6-tag")).fontSize : null],
          colorLetra: cs(body).color === color("--on-scrim"), relleno: [bcs.paddingLeft, bcs.paddingRight], cuerpoLado: bo.left - k.left < k.right - bo.right ? "izq" : "der",
        };
      });
    } else {
      const lis = [...list.children];
      const foto = cards[0]?.querySelector(".team6-photo"), img = foto?.querySelector("img");
      const off = raiz.dataset.dinamica === "v6" ? 40 : 0;
      const tope = Math.min(1152, (innerHeight - 104 - 240 - off) * 2.4 + 128);
      out.escritorio = {
        columnas: cs(list).gridTemplateColumns.split(" ").length, fotoProp: foto ? +(foto.getBoundingClientRect().height / foto.getBoundingClientRect().width).toFixed(3) : null,
        encuadre: img ? cs(img).objectPosition : null, desfase: lis.map((li) => cs(li).marginTop), ancho: Math.round(raiz.getBoundingClientRect().width), tope: Math.round(tope),
        tarjetaAbajo: Math.round(Math.max(...cards.map((c) => c.getBoundingClientRect().bottom))), alto: innerHeight,
      };
    }
    return out;
  }, w);
}
async function medirResenas(pg, w) {
  return pg.evaluate(async (w) => {
    const css = window.__css, color = window.__color;
    const s = await import("/src/config/site.ts"); const L = (await import("/src/config/locale.ts")).localeConfig;
    const cfg = s.siteConfig; const sec = document.getElementById("testimonials"); const raiz = sec?.querySelector(".res6");
    if (!raiz) return { existe: false };
    const cs = (e, p) => (e ? getComputedStyle(e, p) : null);
    const txt = (e) => (e?.textContent ?? "").replace(/\s+/g, " ").trim();
    const oscuro = document.documentElement.classList.contains("dark");
    const wall = raiz.querySelector(".res6-wall"), grid = raiz.querySelector(".res6-grid"), foot = raiz.querySelector(".res6-foot");
    const piezas = [...raiz.querySelectorAll(".res6-piece")];
    const datos = (cfg.testimonials || []).filter((t) => t && t.text);
    const serif = (cs(document.documentElement).getPropertyValue("--font-serif") || "").split(",")[0].replace(/["']/g, "").trim();
    const h2 = foot?.querySelector("h2"), kicker = foot?.querySelector(":scope > div > p"), agg = raiz.querySelector(".res6-agg"), avg = raiz.querySelector(".res6-avg");
    const notaSeccion = raiz.querySelector(".res6-grid + .res6-note");
    const out = {
      existe: true, dinamica: raiz.dataset.dinamica, galeria: document.getElementById("gallery")?.dataset.gallery ?? null, oscuro,
      superficie: {
        seccion: cs(sec).backgroundColor === color("--surface"), antes: cs(sec, "::before").display, despues: cs(sec, "::after").display,
        pared: wall ? { pos: cs(wall).position, fondo: cs(wall).backgroundColor === color("--surface-alt"), img: /url\(/.test(cs(wall).backgroundImage), mascara: /linear-gradient/.test(cs(wall).maskImage || cs(wall).webkitMaskImage || "") } : null,
      },
      piezas: piezas.map((x, i) => {
        const p = x.querySelector(".res6-quote p"), est = x.querySelector(".res6-stars");
        return {
          tag: x.tagName, controles: x.querySelectorAll("a, [tabindex], input, select").length + (x.closest("a, button") ? 1 : 0),
          fondo: cs(x).backgroundColor === color("--card"), radio: cs(x).borderTopLeftRadius, sombra: cs(x).boxShadow !== "none",
          borde: oscuro ? `${cs(x).borderTopWidth} ${cs(x).borderTopStyle} ${cs(x).borderTopColor}` : null,
          largo: x.dataset.largo, palabras: (datos[i]?.text || "").trim().split(/\s+/).filter(Boolean).length,
          cita: p ? { familia: cs(p).fontFamily.split(",")[0].replace(/["']/g, "").trim(), peso: cs(p).fontWeight, estilo: cs(p).fontStyle, letra: parseFloat(cs(p).fontSize), corte: `${cs(p).hyphens} ${cs(p).overflowWrap} ${cs(p).wordBreak}`, comillas: /^[“"«„]/.test(txt(p)), desborda: p.scrollWidth > p.clientWidth + 1 } : null,
          quien: x.querySelector(".res6-who")?.getAttribute("dir") ?? null,
          servicio: x.querySelector(".res6-svc") ? [cs(x.querySelector(".res6-svc")).fontSize, cs(x.querySelector(".res6-svc")).color === color("--text-muted")] : null,
          estrellas: est ? { rol: est.getAttribute("role"), label: est.getAttribute("aria-label"), n: est.children.length, apagadas: [...est.children].filter((e) => +cs(e).opacity < 0.5).length, color: cs(est).color, nota: +datos[i]?.rating } : null,
        };
      }),
      serif, colores: { acento: color("--brand-accent"), resalte: color("--highlight") },
      nota: notaSeccion ? { txt: txt(notaSeccion), color: cs(notaSeccion).color === color("--text"), boton: Math.round(notaSeccion.querySelector("button")?.getBoundingClientRect().height ?? 0) } : null,
      notasPorPieza: raiz.querySelectorAll(".res6-piece .res6-note").length,
      pie: foot ? {
        abajo: foot.getBoundingClientRect().top >= grid.getBoundingClientRect().bottom - 1,
        h2: [txt(h2), cs(h2).fontSize, cs(h2).fontWeight], kicker: kicker ? [txt(kicker), cs(kicker).fontSize, cs(kicker).color === color("--text")] : null,
        subtitulo: cfg.sections?.testimonials?.subtitle || "", titulo: cfg.sections?.testimonials?.title || "",
        agg: txt(agg), promedio: L.testimonials?.averageRating || "", avg: avg ? [cs(avg).fontFamily.split(",")[0].replace(/["']/g, "").trim(), cs(avg).fontSize, cs(avg).fontWeight] : null,
        n: datos.filter((t) => +t.rating > 0).length,
      } : null,
    };
    const ancho = grid.getBoundingClientRect().width;
    if (w < 1024) {
      const zig = raiz.querySelector(".res6-zig");
      out.movil = {
        zigzag: zig ? [...zig.children].map((li) => { const q = li.getBoundingClientRect(), g = zig.getBoundingClientRect(); return { pct: Math.round((q.width / ancho) * 100), lado: Math.abs(q.left - g.left) < 2 ? "izq" : Math.abs(q.right - g.right) < 2 ? "der" : "medio" }; }) : null,
        solos: raiz.querySelectorAll(".res6-solo").length, solosLargos: [...raiz.querySelectorAll(".res6-solo .res6-piece")].every((x) => x.dataset.largo === "largo"),
        tramos: [...raiz.querySelectorAll(".res6-tramo")].map((t) => cs(t).gridTemplateColumns.split(" ").length),
      };
    } else {
      const cols = [...raiz.querySelectorAll(".res6-col")];
      out.escritorio = { columnas: cols.length, desfase: cols.map((c) => cs(c).marginTop) };
    }
    return out;
  }, w);
}
async function pesosSerif(pg) {
  // el predicado de bloque-04/4.3.md § «Pendiente … tipografía», sólo en #team y #testimonials y sólo lo visible
  return pg.evaluate(() => {
    const out = {};
    for (const id of ["team", "testimonials"]) {
      const set = new Set();
      for (const el of document.getElementById(id)?.querySelectorAll("*") ?? []) {
        const cs = getComputedStyle(el);
        if (!/^\s*["']?Frank Ruhl Libre/.test(cs.fontFamily)) continue;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        if (!el.checkVisibility()) continue;
        set.add(cs.fontWeight + " (" + el.tagName.toLowerCase() + ": " + el.textContent.trim().slice(0, 14) + ")");
      }
      out[id] = [...set].sort();
    }
    return out;
  });
}
// ruso: una palabra de una letra no queda con un espacio común detrás (D18: va pegada a la siguiente con espacio duro)
const sueltas = (pg, sel) => pg.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent).filter((t) => /(^|\s)[а-яё] /iu.test(t)).map((t) => t.slice(0, 40)), sel);
// quieto con reduced-motion: después de mover el scroll, ninguna columna ni tarjeta queda desplazada
const quieto = (pg, sel) => pg.evaluate(async (sel) => { scrollBy({ top: 300, behavior: "instant" }); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return [...document.querySelectorAll(sel)].map((e) => getComputedStyle(e).transform).filter((t) => t !== "none"); }, sel);

for (const p of ["a", "c"]) for (const lang of LANGS) {
  if (!tomaPL(p, lang)) continue;
  const f = { k: `${p}-${lang}` };
  // ── móvil 375
  {
    const { ctx, pg } = await pagina(p, lang, 375, 812);
    await alCentro(pg, "#team");
    f.team = await medirTeam(pg, 375);
    await alCentro(pg, "#testimonials");
    f.resenas = await medirResenas(pg, 375);
    f.pesos = await pesosSerif(pg);
    if (lang === "ru") f.rusoSueltas = await sueltas(pg, ".team6 .team6-name, .team6 .team6-role, .team6 .team6-tag, .team6 .team6-desc, .res6 .res6-quote p, .res6 .res6-svc");
    if (lang === "ar") f.descripcionAr = await pg.evaluate(() => document.querySelector(".team6-desc")?.textContent.trim() ?? null);
    await ctx.close();
  }
  // ── escritorio 1366 × 657 (la pantalla baja)
  {
    const { ctx, pg } = await pagina(p, lang, 1366, 657);
    await alCentro(pg, "#team");
    const t = await medirTeam(pg, 1366); f.teamEscritorio = t.escritorio ?? null;
    await alCentro(pg, "#testimonials");
    const r = await medirResenas(pg, 1366); f.resenasEscritorio = r.escritorio ?? null;
    f.citasEscritorio = r.existe ? r.piezas.map((x) => ({ largo: x.largo, letra: x.cita?.letra ?? null, desborda: x.cita?.desborda ?? null })) : null;
    await ctx.close();
  }
  // ── mezcla de idiomas (A, he y en): la reseña a1 escrita en inglés (`testimonials[0].lang = "en"`, texto en inglés) y las demás en
  //    hebreo con su traducción. Ya no son todas traducción del mismo idioma: la nota va por reseña (D11-3, D11-4) y a1 se lee como
  //    escrita en otro idioma en la página hebrea y sin nota en la inglesa (D-145: la página lee `testimonials[].lang`).
  if (p === "a" && (lang === "he" || lang === "en")) {
    const ctx = await contexto(b, { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    await ctx.route(/\/dev-fixtures\/peluqueria-paleta-a\.json(\?.*)?$/, async (r) => {
      const res = await r.fetch(); const fx = await res.json();
      fx.testimonials = fx.testimonials.map((t, i) => (i === 0 ? { ...t, lang: "en", text: "Worth every shekel." } : t));
      await r.fulfill({ response: res, json: fx });
    });
    const pg = await ctx.newPage();
    await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
    await pg.goto(url(p), { waitUntil: "networkidle", timeout: 120000 });
    await listo(pg, "#testimonials");
    await alCentro(pg, "#testimonials");
    f.mezcla = await pg.evaluate(() => {
      const raiz = document.querySelector(".res6"); if (!raiz) return null;
      const piezas = [...raiz.querySelectorAll(".res6-piece")];
      const p0 = piezas[0]?.querySelector(".res6-quote p");
      return { notaSeccion: !!raiz.querySelector(".res6-grid + .res6-note"), notas: piezas.map((x) => x.querySelector(".res6-note")?.textContent.replace(/\s+/g, " ").trim() ?? null), primera: p0 ? { txt: p0.textContent.trim(), lang: p0.getAttribute("lang"), dir: p0.getAttribute("dir") } : null };
    });
    await ctx.close();
  }
  // ── reduced-motion: nada se mueve (A, escritorio, que es donde A mueve las columnas)
  if (p === "a") {
    const { ctx, pg } = await pagina(p, lang, 1366, 657, { reducedMotion: "reduce" });
    await alCentro(pg, "#team");
    f.quietoTeam = await quieto(pg, ".team6-list > li, .team6-photo img");
    await alCentro(pg, "#testimonials");
    f.quietoResenas = await quieto(pg, ".res6-col");
    await ctx.close();
  }
  filas.push(f); console.log(JSON.stringify(f));
}
await b.close();
writeFileSync(`${OUT}.json`, JSON.stringify(filas, null, 1));
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
