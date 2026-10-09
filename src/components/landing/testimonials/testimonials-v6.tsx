/**
 * testimonials-v6.tsx — reseñas de peluquería, «voces en collage» (TEAM-RESENAS-01, D-173), migrada de
 * `diseno/resenas/prototipo/proto.{css,js}` (INFORME § 6.6, RESENAS-01 §§ 3 y 6; cerrada en local el 2026-09-28). Las reseñas no
 * son un control: no se levantan ni llevan a ningún lado. La dinámica sale de `sections.gallery.variant` (v6 collage → A: zigzag en
 * móvil y columnas que se mueven en escritorio; v7 mosaico → C: por tramos en móvil y columnas quietas). El tamaño de la cita lo
 * decide el largo, y una palabra que no entra baja la letra de esa pieza de a 1 px hasta 15 (`encajar`). Honestidad como Google
 * (D-130, D11-3, D11-4): una traducción nunca se hace pasar por original —si todas son traducción del mismo idioma, una nota de
 * sección con «ver originales»; si no, una por reseña— y el promedio y la cantidad salen de los datos (R-1). Los textos de interfaz
 * viven en los locales (`testimonials.*`, escritos por idioma). Estilos en index.css (`.res6…`).
 */
import React from "react";
// «ver original» / «ver traducción» cambian el texto en el acto, dentro del mismo clic, como el prototipo (sin esperar al render)
import { flushSync } from "react-dom";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { resolveVariant } from "../../../lib/section-variants";
import type { Testimonial } from "../../../types";

type Resena = Testimonial & { service?: string; lang?: string; originalLang?: string; originalText?: string; translated?: boolean };
type Idioma = "he" | "en" | "ru" | "ar";
const RTL = ["he", "ar"];

const palabras = (t?: string) => (t || "").trim().split(/\s+/).filter(Boolean).length;
/** El tamaño de la letra lo decide el largo: la frase corta se lee como titular, el párrafo como texto. */
const largo = (t: string) => { const n = palabras(t); return n <= 4 ? "corto" : n <= 12 ? "medio" : "largo"; };
const tipografia = (t: string) => (localeConfig.lang === "ru" ? t.replace(/(^|\s)([а-яё])\s/giu, "$1$2 ") : t);
const con = (plantilla: string, valores: Record<string, string | number>) => plantilla.replace(/\{(\w+)\}/g, (_, k) => String(valores[k] ?? ""));

/** R-1: la cantidad con el plural del idioma (Intl.PluralRules). */
function cantidad(n: number): string {
  const formas = localeConfig.testimonials.count as Record<string, string>;
  const f = new Intl.PluralRules(localeConfig.lang).select(n);
  return con(formas[f] ?? formas.other, { n });
}

/** Una palabra larga no se corta: la letra de ESA pieza baja de a 1 px hasta que entra (nunca de 15). */
function encajar(raiz: HTMLElement) {
  for (const p of Array.from(raiz.querySelectorAll<HTMLElement>(".res6-quote p"))) {
    if (!p.clientWidth) continue; // sin caja no hay nada que medir: se deja como está
    p.style.fontSize = "";
    let t = parseFloat(getComputedStyle(p).fontSize);
    while (p.scrollWidth > p.clientWidth + 1 && t > 15) { t -= 1; p.style.fontSize = t + "px"; }
  }
}
/** Alguna cita desborda y todavía puede bajar la letra. */
const desborda = (raiz: HTMLElement) =>
  Array.from(raiz.querySelectorAll<HTMLElement>(".res6-quote p")).some((p) => p.clientWidth > 0 && p.scrollWidth > p.clientWidth + 1 && parseFloat(getComputedStyle(p).fontSize) > 15);

function useColumnas() {
  const consulta = "(min-width: 1024px)";
  const [cols, setCols] = React.useState(() => (window.matchMedia(consulta).matches ? 3 : 2));
  React.useEffect(() => {
    const mq = window.matchMedia(consulta);
    const cambio = () => setCols(mq.matches ? 3 : 2);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return cols;
}

export function TestimonialsV6() {
  const T = localeConfig.testimonials;
  const lang = localeConfig.lang as Idioma;
  const t = siteConfig.sections.testimonials;
  const lista = ((siteConfig.testimonials || []) as Resena[]).filter((x) => x && x.text);
  const galeria = resolveVariant(siteConfig.sections.gallery?.variant) === "v7" ? "v7" : "v6";
  const cols = useColumnas();
  const zigzag = cols === 2 && galeria === "v6";
  const origenDe = (x: Resena) => (x.originalLang || x.lang || lang) as Idioma;
  // si TODAS son traducción del mismo idioma, una sola nota con un solo botón para toda la sección; si no, una por reseña
  const notaUnica = lista.length > 1 && lista.every((x) => x.translated && x.originalText && origenDe(x) === origenDe(lista[0]));
  const [originales, setOriginales] = React.useState<Set<number>>(new Set());
  const [todas, setTodas] = React.useState(false);
  const raizRef = React.useRef<HTMLDivElement | null>(null);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const firma = [lang, cols, galeria, lista.map((x) => x.text).join("|")].join("·");

  React.useEffect(() => { setOriginales(new Set()); setTodas(false); }, [firma]);
  React.useEffect(() => {
    const raiz = raizRef.current; if (!raiz) return;
    // INSTAGRAM-FAQ-01 (E1, D-195): cuando llega una cara nueva de fuente, el navegador puede componer UN cuadro con la letra todavía
    // sin resolver (medido: la palabra «entra» a 22 px, 245 = 245, y al cuadro siguiente, sin evento, mide 304 > 256). Así que después
    // de montar, de cada evento de fuentes y de cada cambio de ancho, la sección se vigila cuadro a cuadro y se vuelve a encajar
    // mientras una cita desborde con letra > 15, hasta QUIETOS cuadros seguidos sin nada que corregir (una condición, no un tiempo).
    const QUIETOS = 10;
    let vivo = true, cuadro = 0, quietos = 0;
    const ajustar = () => encajar(raiz);
    const vigilar = () => { cuadro = requestAnimationFrame(() => { if (!vivo) return; if (desborda(raiz)) { ajustar(); quietos = 0; } else quietos++; if (quietos < QUIETOS) vigilar(); }); };
    const ajustarYVigilar = () => { ajustar(); quietos = 0; cancelAnimationFrame(cuadro); vigilar(); };
    ajustarYVigilar();
    window.addEventListener("resize", ajustarYVigilar);
    document.fonts?.addEventListener("loadingdone", ajustarYVigilar);
    document.fonts?.ready.then(() => { if (vivo) ajustarYVigilar(); }); // como el prototipo
    // dinámica de A (collage v6), como la galería: columnas vecinas en sentidos opuestos al hacer scroll (C: quietas por CSS)
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => { raf = 0; const g = gridRef.current; if (!g) return; const q = g.getBoundingClientRect(), vh = window.innerHeight; const p = Math.max(-1, Math.min(1, (q.top + q.height / 2 - vh / 2) / (vh / 2 + q.height / 2))); g.style.setProperty("--res-dy", (p * 20).toFixed(1) + "px"); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    if (!quieto) { tick(); window.addEventListener("scroll", onScroll, { passive: true }); }
    return () => {
      vivo = false; cancelAnimationFrame(cuadro);
      window.removeEventListener("resize", ajustarYVigilar);
      document.fonts?.removeEventListener("loadingdone", ajustarYVigilar);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [firma, originales, todas]);

  const nombres = T.languageNames as Record<Idioma, string>;
  const pieza = (x: Resena, i: number) => {
    const idiomaOriginal = origenDe(x);
    const original = (notaUnica ? todas : originales.has(i)) && !!x.originalText;
    // la escrita en otro idioma lleva su lang; la traducida, el del original sólo mientras se ve el original
    const pLang = original ? idiomaOriginal : !x.translated && idiomaOriginal !== lang ? idiomaOriginal : undefined;
    const notaPropia = !notaUnica && (x.translated || idiomaOriginal !== lang);
    const n = Math.max(0, Math.min(5, Math.round(+x.rating || 0)));
    return (
      <li key={(x as { id?: string }).id ?? i}>
        <figure className="res6-piece" data-largo={largo(x.text)}>
          <blockquote className="res6-quote">
            <p lang={pLang} dir={pLang ? (RTL.includes(pLang) ? "rtl" : "ltr") : undefined}>{original ? x.originalText : tipografia(x.text)}</p>
          </blockquote>
          <figcaption className="res6-cap">
            {/* el nombre no se traduce (como Google); dir="auto": un nombre hebreo en página LTR deja el punto de su lado */}
            <span className="res6-who" dir="auto">{tipografia(x.name || "")}</span>
            {x.service && <span className="res6-svc">{tipografia(x.service)}</span>}
            {n > 0 && (
              <span className="res6-stars" role="img" aria-label={con(localeConfig.testimonials.ratingAria, { n })}>
                {[0, 1, 2, 3, 4].map((k) => <span key={k} className={k < n ? undefined : "res6-off"} aria-hidden="true">★</span>)}
              </span>
            )}
          </figcaption>
          {notaPropia && (
            <p className="res6-note">
              {x.translated && x.originalText ? (
                <>
                  {`${con(T.reviewTranslatedFrom, { lang: nombres[idiomaOriginal] })} · `}
                  <button type="button" onClick={() => flushSync(() => setOriginales((s) => { const o = new Set(s); if (o.has(i)) o.delete(i); else o.add(i); return o; }))}>
                    {tipografia(original ? T.reviewSeeTranslation : T.reviewSeeOriginal)}
                  </button>
                </>
              ) : tipografia(con(T.reviewWrittenIn, { lang: (T.languageNamesIn as Record<Idioma, string>)[idiomaOriginal] }))}
            </p>
          )}
        </figure>
      </li>
    );
  };

  // móvil: A (collage) en zigzag; C (mosaico) por tramos —una reseña larga a ancho entero, las cortas de a dos—. Escritorio: 3 columnas.
  const bloques: React.ReactNode[] = [];
  if (zigzag) bloques.push(<ul key="zig" className="res6-zig">{lista.map(pieza)}</ul>);
  else {
    let columnas: React.ReactNode[][] | null = null, enTramo = 0;
    const cerrar = () => { if (columnas) bloques.push(<div key={`t${bloques.length}`} className="res6-tramo" style={{ "--res-cols": cols } as React.CSSProperties}>{columnas.map((c, j) => <ul key={j} className="res6-col">{c}</ul>)}</div>); columnas = null; };
    lista.forEach((x, i) => {
      if (cols === 2 && largo(x.text) === "largo") { cerrar(); bloques.push(<ul key={`s${i}`} className="res6-solo">{pieza(x, i)}</ul>); }
      else { if (!columnas) { columnas = Array.from({ length: cols }, (): React.ReactNode[] => []); enTramo = 0; } columnas[enTramo++ % cols].push(pieza(x, i)); }
    });
    cerrar();
  }

  const conNota = lista.filter((x) => +x.rating > 0);
  const prom = conNota.length ? conNota.reduce((a, x) => a + +x.rating, 0) / conNota.length : 0;
  const origenTodas = lista[0] ? origenDe(lista[0]) : lang;

  return (
    // la caja de la sección es la de la v1 (las mismas clases): local monta la variante dentro de ella; fondo y relleno en index.css
    <section id="testimonials" data-res="v6" aria-labelledby="testimonials-title" className="flex flex-col justify-center bg-background px-5 py-8 transition-colors duration-300 sm:px-6 sm:py-28 lg:block">
      <div ref={raizRef} className="res6" data-dinamica={galeria}>
        <div className="res6-wall" />
        <div className="res6-inner">
          <div ref={gridRef} className="res6-grid">{bloques}</div>
          {notaUnica && (
            <p className="res6-note">
              {`${todas ? T.reviewsShowingOriginals : con(T.reviewsTranslatedFrom, { lang: nombres[origenTodas] })} · `}
              <button type="button" onClick={() => flushSync(() => setTodas((v) => !v))}>{tipografia(todas ? T.reviewsSeeTranslations : T.reviewsSeeOriginals)}</button>
            </p>
          )}
          <div className="res6-foot">
            <div>
              <h2 id="testimonials-title">{tipografia(t.subtitle || "")}</h2>
              <p>{tipografia(t.title || "")}</p>
            </div>
            <p className="res6-agg">
              {conNota.length > 0 && (
                <>
                  <span className="res6-avg">{prom.toFixed(1)}</span>
                  <span className="res6-star" aria-hidden="true">★</span>
                  <span>{tipografia(` ${T.averageRating || ""} · ${cantidad(conNota.length)}`)}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
