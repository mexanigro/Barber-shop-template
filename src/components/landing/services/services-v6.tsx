/**
 * services-v6.tsx — «CON PRECIOS» = TARJETA-BOTÓN en carrusel 3D (SERVICES-02 fase 2b, 2026-09-19; hipótesis D6-bis a prueba).
 *
 * Contrato: bloque-04/CONTRATOS-HUECOS.md § services v6 «con precios» (fase 2b). TODAS las tarjetas del catálogo con foto, en
 * carrusel horizontal (`services.featured` = ORDEN, no cantidad); tarjeta vertical 9:16 con la foto a sangre; cada tarjeta ES el
 * control (`<button>` reserva / `<a>` consulta) con nombre accesible «servicio · precio · acción» y foco visible. Impresión 3D
 * como la referencia medida (adamsmaja.co.il, `FUENTES-TARJETAS-SMAJA.md`): la central a escala 1,2 y opacidad 1 sobre
 * laterales a escala 1 y opacidad 0,5 (transición 200 ms), sombra tonal, solape; sin perspective/rotate (la referencia no gira).
 * La distancia al eje (`--d`, 0 centro → 1 lateral) la pone un listener de scroll con rAF (sin librería: PATRONES-TARJETAS).
 * Fase 2c (PATRONES-CARRUSEL): laterales a opacidad 1 (la atenuación leía «deshabilitado»), sin texto y con scrim más denso;
 * la foto hace parallax dentro de la tarjeta (`--dx`); pista de entrada única (la siguiente se acerca 12 px y vuelve) al entrar la
 * sección; tocar una lateral la centra (sólo la central ejecuta); 1280: tres enteras iguales, sin escala, flechas fuera.
 * Sin animación de entrada (D3, GALERIA-03); relieve al tocar = escala −1,5 %; reduced-motion sin transform. Título debajo (R23),
 * «ver todos» → /servicios. Sin foto la tarjeta no se monta (aviso en dev). Fotos: `sections.services.images[i]` ↔ `services[i]`.
 * SERVICIOS-GALERIA-01 (INFORME § 6.3, cerrado en local): < 1024 la frase de la central se lee DEBAJO del carrusel (`.svc-caption`,
 * F-C), con fundido de 180 ms al cambiar de central y la reserva de alto de la frase más larga de ese idioma y ese ancho, medida desde
 * cero en cada cambio de ancho y cada vez que termina de cargar una fuente (D16); ≥ 1024 queda en la tarjeta con alto fijo, y las tarjetas sin frase reservan el mismo (vacía).
 */
import React from "react";
import { useReducedMotion } from "motion/react";
import { Clock, MessageCircle, ArrowUpLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { currencySymbol } from "../../../lib/currency";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import { leadSentences } from "../../../lib/words";
import { handleImgError } from "../../../lib/utils";
import { interpolate } from "../../../lib/interpolate";
import type { Service } from "../../../types";
import { orderFeatured, priceLabel } from "../../../lib/services-v6";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

const MAX_WORDS = 12;

/** `--d` por slide: distancia del centro del slide al eje del carrusel, en anchos de slide (0 = centrado, ≥ 1 = lateral). */
function useAxisDistance(ref: React.RefObject<HTMLUListElement | null>) {
  React.useEffect(() => {
    const ul = ref.current; if (!ul) return;
    let raf = 0;
    const update = () => {
      raf = 0; const r = ul.getBoundingClientRect(); const axis = r.left + r.width / 2;
      for (const li of Array.from(ul.children) as HTMLElement[]) { const b = li.getBoundingClientRect(); const dx = (b.left + b.width / 2 - axis) / b.width; const d = Math.min(1, Math.abs(dx)); li.style.setProperty("--d", d.toFixed(3)); li.style.setProperty("--dx", Math.max(-1, Math.min(1, dx)).toFixed(3)); li.style.zIndex = String(100 - Math.round(d * 100)); li.dataset.centrada = d < 0.5 ? "1" : "0"; }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update(); ul.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { ul.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [ref]);
}

/** F-C: la frase de la tarjeta central en la leyenda de debajo. Lee la frase del DOM (`.svc-phrase` no vacía de la tarjeta con
 *  `data-centrada="1"`, que pone useAxisDistance) y la cambia con un fundido corto; reserva el alto de la frase más larga de ese idioma
 *  y ese ancho, borrando la reserva anterior antes de medir (si no, sólo podía crecer: D16). Sin frases, la leyenda no se muestra. */
function useCaption(ul: React.RefObject<HTMLUListElement | null>, cap: React.RefObject<HTMLParagraphElement | null>, clave: string) {
  React.useEffect(() => {
    const u = ul.current, c = cap.current; if (!u || !c) return;
    const frase = (li: Element | null) => li?.querySelector(".svc-phrase:not(:empty)")?.textContent?.trim() || "";
    let t = 0;
    const reservar = () => {
      const textos = Array.from(u.querySelectorAll(".svc-slide")).map(frase).filter(Boolean);
      if (!textos.length) { c.style.display = "none"; return; }
      c.style.display = "";
      const previo = c.textContent; let max = 0;
      c.style.minHeight = "";
      for (const x of textos) { c.textContent = x; max = Math.max(max, c.offsetHeight); }
      c.textContent = previo; c.style.minHeight = max + "px";
    };
    const actualizar = () => {
      const x = frase(u.querySelector('.svc-slide[data-centrada="1"]'));
      if (c.dataset.t === x) return;
      c.dataset.t = x; c.style.opacity = "0";
      clearTimeout(t); t = window.setTimeout(() => { c.textContent = x; c.style.opacity = "1"; }, 120);
    };
    delete c.dataset.t;
    const mo = new MutationObserver(actualizar);
    mo.observe(u, { subtree: true, attributes: true, attributeFilter: ["data-centrada"] });
    window.addEventListener("resize", reservar);
    // El corte de línea depende de la fuente: una cara que llega después de medir (p. ej. la cirílica, pedida sólo al pasar a ruso,
    // o la hoja de fuentes tarde) cambia la frase más larga de 2 a 3 líneas. Se vuelve a medir cada vez que termina de cargar una.
    document.fonts?.addEventListener("loadingdone", reservar);
    reservar(); actualizar();
    return () => { mo.disconnect(); window.removeEventListener("resize", reservar); document.fonts?.removeEventListener("loadingdone", reservar); clearTimeout(t); };
  }, [ul, cap, clave]);
}

/** E-C: una sola pista al entrar la sección (la siguiente se acerca 12 px y vuelve); nada con reduced-motion ni en 1280. */
function useEntryHint(ref: React.RefObject<HTMLUListElement | null>, reduced: boolean) {
  React.useEffect(() => {
    const ul = ref.current; if (!ul || reduced || window.matchMedia("(min-width: 1024px)").matches) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect(); ul.classList.add("svc-hint"); setTimeout(() => ul.classList.remove("svc-hint"), 900); }, { threshold: 0.5 });
    io.observe(ul); return () => io.disconnect();
  }, [ref, reduced]);
}

// N-C (Rauno): tocar una lateral la centra; sólo la central ejecuta. Con teclado el foco ya centra (scrollIntoView) y Enter ejecuta.
const llevarAlCentro = (el: HTMLElement, reduced: boolean) => el.closest("li")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
const lateral = (e: React.SyntheticEvent) => { const li = (e.currentTarget as HTMLElement).closest("li") as HTMLElement | null; return !!li && li.dataset.centrada === "0" && !window.matchMedia("(min-width: 1024px)").matches; };

type T = typeof localeConfig.services;

// AUDITORIA-01: Price y Card viven fuera del render de ServicesV6. Declarados dentro, cada repintado de App (el splash, el asistente)
// creaba un tipo de componente nuevo y React reemplazaba las 11 tarjetas: el foco devuelto al cerrar el asistente caía en <body>.
function Price({ s, className, symbol, t }: { s: Service; className: string; symbol: string; t: T }) {
  const p = priceLabel(s, symbol, t);
  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
      {p.prefix && <span className="text-[11px] font-normal opacity-80">{p.prefix}</span>}
      <span dir="ltr">{p.main}</span>
    </span>
  );
}

type CardProps = { s: Service; img: string; phrase: string; anyPhrase: boolean; wa: string; symbol: string; t: T; Arrow: typeof ArrowUpLeft; reduced: boolean; onBookClick: (serviceId?: string) => void };

function Card({ s, img, phrase, anyPhrase, wa, symbol, t, Arrow, reduced, onBookClick }: CardProps) {
  const centrar = (el: HTMLElement) => llevarAlCentro(el, reduced);
  const consulta = s.mode === "consulta" && !!wa;
  const p = priceLabel(s, symbol, t);
  const action = consulta ? t.quoteAction : t.bookService;
  const label = `${s.name} · ${p.prefix ? p.prefix + " " : ""}${p.main} · ${action}`;
  const inner = (
    <>
      <img src={img} alt="" loading="lazy" decoding="async" onError={handleImgError} className="svc-img absolute inset-0 h-full w-full object-cover" />
      {/* tercio inferior: nombre + precio + frase + pie sobre el scrim tonal del modo (Smaja: gradiente horneado a negro) */}
      <span className="svc-card-band absolute inset-x-0 bottom-0 flex flex-col gap-1 px-3 pb-3 pt-16">
        <span className="svc-name block text-[15px] font-medium leading-snug">{s.name}</span>
        {phrase ? <span className="svc-phrase block text-[11.5px] leading-snug opacity-90">{phrase}</span> : anyPhrase && <span className="svc-phrase block text-[11.5px] leading-snug opacity-90" aria-hidden="true" />}
        <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] opacity-90">
          <span className="flex flex-wrap items-baseline gap-x-2">{/* precio y duración enteros: si no caben, bajan de línea como unidad (nunca «₪180–» / «420») */}
            <Price s={s} className="whitespace-nowrap text-[14px] font-medium" symbol={symbol} t={t} />
            <span className="inline-flex items-center gap-1 whitespace-nowrap"><Clock size={11} aria-hidden="true" /><span className="tabular-nums">{s.duration}</span> {t.minutesShort}</span>
          </span>
          <span className="svc-card-cue inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--accent-strong)] text-[color:var(--accent-foreground)]" aria-hidden="true">
            {consulta ? <MessageCircle size={13} /> : <Arrow size={14} />}
          </span>
        </span>
      </span>
    </>
  );
  const cls = "svc-card relative block aspect-[9/16] w-full overflow-hidden rounded-[var(--radius-ui,8px)] bg-card text-start text-card-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]";
  const onFocus = (e: React.FocusEvent<HTMLElement>) => { if (lateral(e)) centrar(e.currentTarget); };
  return consulta ? (
    <a href={`https://wa.me/${wa}?text=${encodeURIComponent(s.name)}`} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls} onFocus={onFocus} onClick={(e) => { if (lateral(e) && e.detail > 0) { e.preventDefault(); centrar(e.currentTarget); } }}>{inner}</a>
  ) : (
    <button type="button" onClick={(e) => { if (lateral(e) && e.detail > 0) { centrar(e.currentTarget); return; } onBookClick(s.id); }} aria-label={label} className={cls} onFocus={onFocus}>{inner}</button>
  );
}

export function ServicesV6({ onBookClick, onNavigateToServices }: Props) {
  const { services, sections, contact } = siteConfig;
  const header = sections.services;
  const symbol = currencySymbol();
  const wa = toWhatsAppNumber(contact.phone);
  const t = localeConfig.services;
  const reduced = !!useReducedMotion();
  const isRtl = localeConfig.dir === "rtl";
  const Arrow = isRtl ? ArrowUpLeft : ArrowUpRight;
  const ulRef = React.useRef<HTMLUListElement | null>(null);
  const capRef = React.useRef<HTMLParagraphElement | null>(null);
  useAxisDistance(ulRef);
  useEntryHint(ulRef, reduced);

  const imageOf = (s: Service) => header.images?.[services.indexOf(s)];
  const ordered = orderFeatured(services, header.featured);
  const cards = ordered.filter((s) => !!imageOf(s));
  const phrases = new Map(cards.map((s) => [s.id, s.description ? leadSentences(s.description, MAX_WORDS, `services.${s.id}.description`) : ""]));
  const anyPhrase = [...phrases.values()].some(Boolean);
  useCaption(ulRef, capRef, [...phrases].join("|"));
  React.useEffect(() => {
    if (import.meta.env.DEV) ordered.filter((s) => !imageOf(s)).forEach((s) => console.warn(`[copy] services.${s.id}: sin foto (sections.services.images[i]); la tarjeta-botón no se monta.`));
  }, [ordered.map((s) => s.id).join()]);

  // GALERIA-03 D3 (Liam): SIN animación de aparición (el fundido de opacidad al primer scroll «genera un bug»); el movimiento (relieve, parallax, carrusel) queda.
  const step = (dir: 1 | -1) => { const ul = ulRef.current; if (!ul || !ul.firstElementChild) return; const w = (ul.firstElementChild as HTMLElement).getBoundingClientRect().width; ul.scrollBy({ left: dir * w * (isRtl ? -1 : 1), behavior: reduced ? "auto" : "smooth" }); };

  return (
    // R23: la sección sigue justo debajo del hero, lo primero es contenido; el h2 va debajo (aria-labelledby).
    <section id="services" data-surface={header.surface} aria-labelledby="services-title" className="pb-14 text-foreground sm:pb-16 lg:pb-20">
      <div className="relative mx-auto max-w-6xl">
        {cards.length > 0 && (
          <ul ref={ulRef} className="svc-carousel flex snap-x snap-mandatory overflow-x-auto">
            {cards.map((s) => (
              <li key={s.id} className="svc-slide shrink-0 snap-center">
                <Card s={s} img={imageOf(s)!} phrase={phrases.get(s.id) ?? ""} anyPhrase={anyPhrase} wa={wa} symbol={symbol} t={t} Arrow={Arrow} reduced={reduced} onBookClick={onBookClick} />
              </li>
            ))}
          </ul>
        )}
        {cards.length > 0 && <p ref={capRef} className="svc-caption" />}
        {cards.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label={t.prevCard} className="svc-arrow svc-arrow-prev hidden lg:inline-flex">{isRtl ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}</button>
            <button type="button" onClick={() => step(1)} aria-label={t.nextCard} className="svc-arrow svc-arrow-next hidden lg:inline-flex">{isRtl ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}</button>
          </>
        )}

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 px-5 lg:px-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="services-title" className="text-base font-medium leading-tight">{header.subtitle}</h2>
            <p className="text-xs text-muted-foreground">{header.title}</p>
          </div>
          {services.length > 0 && onNavigateToServices && (
            <button type="button" onClick={onNavigateToServices} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]">
              {interpolate(t.viewAllServices, { count: services.length })}
              <Arrow size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
