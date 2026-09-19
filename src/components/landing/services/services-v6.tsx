/**
 * services-v6.tsx — «CON PRECIOS» = TARJETA-BOTÓN en carrusel 3D (SERVICES-02 fase 2b, 2026-09-19; hipótesis D6-bis a prueba).
 *
 * Contrato: bloque-04/CONTRATOS-HUECOS.md § services v6 «con precios» (fase 2b). TODAS las tarjetas del catálogo con foto, en
 * carrusel horizontal (`services.featured` = ORDEN, no cantidad); tarjeta vertical 9:16 con la foto a sangre; cada tarjeta ES el
 * control (`<button>` reserva / `<a>` consulta) con nombre accesible «servicio · precio · acción» y foco visible. Impresión 3D
 * como la referencia medida (adamsmaja.co.il, `FUENTES-TARJETAS-SMAJA.md`): la central a escala 1,2 y opacidad 1 sobre
 * laterales a escala 1 y opacidad 0,5 (transición 200 ms), sombra tonal, solape; sin perspective/rotate (la referencia no gira).
 * La distancia al eje (`--d`, 0 centro → 1 lateral) la pone un listener de scroll con rAF (sin librería: PATRONES-TARJETAS).
 * Entrada sólo opacidad ≤ 250 ms; relieve al tocar = escala −1,5 %; reduced-motion sin transform. Título debajo (R23),
 * «ver todos» → /servicios. Sin foto la tarjeta no se monta (aviso en dev). Fotos: `sections.services.images[i]` ↔ `services[i]`.
 */
import React from "react";
import { motion, useReducedMotion } from "motion/react";
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
const FADE = 0.22; // ≤ 250 ms, sólo opacidad

/** `--d` por slide: distancia del centro del slide al eje del carrusel, en anchos de slide (0 = centrado, ≥ 1 = lateral). */
function useAxisDistance(ref: React.RefObject<HTMLUListElement | null>) {
  React.useEffect(() => {
    const ul = ref.current; if (!ul) return;
    let raf = 0;
    const update = () => {
      raf = 0; const r = ul.getBoundingClientRect(); const axis = r.left + r.width / 2;
      for (const li of Array.from(ul.children) as HTMLElement[]) { const b = li.getBoundingClientRect(); const d = Math.min(1, Math.abs(b.left + b.width / 2 - axis) / b.width); li.style.setProperty("--d", d.toFixed(3)); li.style.zIndex = String(100 - Math.round(d * 100)); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update(); ul.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { ul.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [ref]);
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
  useAxisDistance(ulRef);

  const imageOf = (s: Service) => header.images?.[services.indexOf(s)];
  const ordered = orderFeatured(services, header.featured);
  const cards = ordered.filter((s) => !!imageOf(s));
  React.useEffect(() => {
    if (import.meta.env.DEV) ordered.filter((s) => !imageOf(s)).forEach((s) => console.warn(`[copy] services.${s.id}: sin foto (sections.services.images[i]); la tarjeta-botón no se monta.`));
  }, [ordered.map((s) => s.id).join()]);

  const Price = ({ s, className }: { s: Service; className: string }) => {
    const p = priceLabel(s, symbol, t);
    return (
      <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
        {p.prefix && <span className="text-[11px] font-normal opacity-80">{p.prefix}</span>}
        <span dir="ltr">{p.main}</span>
      </span>
    );
  };

  const Card = ({ s }: { s: Service }) => {
    const consulta = s.mode === "consulta" && !!wa;
    const img = imageOf(s)!;
    const p = priceLabel(s, symbol, t);
    const action = consulta ? t.quoteAction : t.bookService;
    const label = `${s.name} · ${p.prefix ? p.prefix + " " : ""}${p.main} · ${action}`;
    const phrase = s.description ? leadSentences(s.description, MAX_WORDS, `services.${s.id}.description`) : "";
    const inner = (
      <>
        <img src={img} alt="" loading="lazy" decoding="async" onError={handleImgError} className="absolute inset-0 h-full w-full object-cover" />
        {/* tercio inferior: nombre + precio + frase + pie sobre el scrim tonal del modo (Smaja: gradiente horneado a negro) */}
        <span className="svc-card-band absolute inset-x-0 bottom-0 flex flex-col gap-1 px-3 pb-3 pt-16">
          <span className="flex items-end justify-between gap-2">
            <span className="line-clamp-2 text-[15px] font-medium leading-snug">{s.name}</span>
            <Price s={s} className="shrink-0 text-[15px] font-medium" />
          </span>
          {phrase && <span className="line-clamp-2 text-[11.5px] leading-snug opacity-90">{phrase}</span>}
          <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] opacity-90">
            <span className="inline-flex items-center gap-1">
              <Clock size={11} aria-hidden="true" />
              <span className="tabular-nums">{s.duration}</span> {t.minutesShort}
            </span>
            <span className="svc-card-cue inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--accent-strong)] text-[color:var(--accent-foreground)]" aria-hidden="true">
              {consulta ? <MessageCircle size={13} /> : <Arrow size={14} />}
            </span>
          </span>
        </span>
      </>
    );
    const cls = "svc-card relative block aspect-[9/16] w-full overflow-hidden rounded-[var(--radius-ui,8px)] bg-card text-start text-card-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]";
    return consulta ? (
      <a href={`https://wa.me/${wa}?text=${encodeURIComponent(s.name)}`} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>{inner}</a>
    ) : (
      <button type="button" onClick={() => onBookClick(s.id)} aria-label={label} className={cls}>{inner}</button>
    );
  };

  const fade = reduced ? {} : { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true, amount: 0.2 }, transition: { duration: FADE, ease: "easeOut" as const } };
  const step = (dir: 1 | -1) => { const ul = ulRef.current; if (!ul || !ul.firstElementChild) return; const w = (ul.firstElementChild as HTMLElement).getBoundingClientRect().width; ul.scrollBy({ left: dir * w * (isRtl ? -1 : 1), behavior: reduced ? "auto" : "smooth" }); };

  return (
    // R23: la sección sigue justo debajo del hero, lo primero es contenido; el h2 va debajo (aria-labelledby).
    <section id="services" data-surface={header.surface} aria-labelledby="services-title" className="pb-14 text-foreground sm:pb-16">
      <div className="relative mx-auto max-w-6xl">
        {cards.length > 0 && (
          <ul ref={ulRef} className="svc-carousel flex snap-x snap-mandatory overflow-x-auto">
            {cards.map((s) => (
              <motion.li key={s.id} {...fade} className="svc-slide shrink-0 snap-center">
                <Card s={s} />
              </motion.li>
            ))}
          </ul>
        )}
        {cards.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label={t.prevCard} className="svc-arrow start-2 hidden lg:inline-flex">{isRtl ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}</button>
            <button type="button" onClick={() => step(1)} aria-label={t.nextCard} className="svc-arrow end-2 hidden lg:inline-flex">{isRtl ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}</button>
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
