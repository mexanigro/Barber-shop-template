/**
 * services-v6.tsx — «CON PRECIOS» = TARJETA-BOTÓN (SERVICES-02 fase 2, 2026-09-19; hipótesis D6-bis a prueba).
 *
 * Contrato: bloque-04/CONTRATOS-HUECOS.md § services v6 «con precios». Dos destacados (`sections.services.featured`;
 * sin dato → los 2 primeros `popular` o los 2 primeros del catálogo), cada uno UNA tarjeta que ES el control:
 * `<button>` (reserva → wizard con el servicio) o `<a>` (consulta → WhatsApp con el nombre), nombre accesible
 * «<servicio> · <precio> · <acción>», foco visible. Contenido como adamsmaja.co.il sección 2 (foto a sangre, nombre y precio
 * integrados sobre la foto con scrim tonal del modo, frase corta, duración discreta, señal de acción al final); forma como su
 * sección 3 (radio --radius-ui, borde con luz, sombra tonal, volumen al tocar/hover: index.css `.svc-card`). En 375 las dos
 * van en carrusel horizontal con scroll-snap (inclinación 3D leve por posición vía scroll-timeline donde exista, sin JS);
 * en 1280, rejilla de 2. Título integrado DEBAJO de las tarjetas (R23) y botón «ver todos» → /servicios.
 *
 * Entrada (Liam, 2026-09-19: «animaciones muy duras»): sin desplazamiento ni escalón; sólo fundido de opacidad ≤ 250 ms;
 * con prefers-reduced-motion, nada. El movimiento de la tarjeta es su relieve al tocar, no su entrada.
 * Sin foto la tarjeta NO se monta (aviso en dev). Fotos: `sections.services.images[i]` ↔ `services[i]`.
 */
import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Clock, MessageCircle, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { currencySymbol } from "../../../lib/currency";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import { leadSentences } from "../../../lib/words";
import { handleImgError } from "../../../lib/utils";
import { interpolate } from "../../../lib/interpolate";
import type { Service } from "../../../types";
import { pickFeatured, priceLabel } from "../../../lib/services-v6";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

const MAX_WORDS = 12;
const FADE = 0.22; // ≤ 250 ms, sólo opacidad

export function ServicesV6({ onBookClick, onNavigateToServices }: Props) {
  const { services, sections, contact } = siteConfig;
  const header = sections.services;
  const symbol = currencySymbol();
  const wa = toWhatsAppNumber(contact.phone);
  const t = localeConfig.services;
  const reduced = !!useReducedMotion();
  const isRtl = localeConfig.dir === "rtl";
  const Arrow = isRtl ? ArrowUpLeft : ArrowUpRight;

  const imageOf = (s: Service) => header.images?.[services.indexOf(s)];
  const featured = pickFeatured(services, header.featured);
  const cards = featured.filter((s) => !!imageOf(s));
  React.useEffect(() => {
    if (import.meta.env.DEV) featured.filter((s) => !imageOf(s)).forEach((s) => console.warn(`[copy] services.${s.id}: sin foto (sections.services.images[i]); la tarjeta-botón no se monta.`));
  }, [featured.map((s) => s.id).join()]);

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
        <span className="relative block aspect-[4/3] overflow-hidden">
          <img src={img} alt="" loading="lazy" decoding="async" onError={handleImgError} className="absolute inset-0 h-full w-full object-cover" />
          {/* nombre + precio integrados sobre la foto, scrim tonal del modo (--scrim → transparente) */}
          <span className="svc-card-band absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3 pt-14">
            <span className="text-[17px] font-medium leading-snug">{s.name}</span>
            <Price s={s} className="shrink-0 text-[17px] font-medium" />
          </span>
        </span>
        <span className="flex flex-col gap-2 px-4 pb-4 pt-3">
          {phrase && <span className="text-sm leading-relaxed text-muted-foreground">{phrase}</span>}
          <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} aria-hidden="true" />
              <span className="tabular-nums">{s.duration}</span> {t.minutesShort}
            </span>
            <span className="svc-card-cue inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent-strong)] text-[color:var(--accent-foreground)]" aria-hidden="true">
              {consulta ? <MessageCircle size={15} /> : <Arrow size={16} />}
            </span>
          </span>
        </span>
      </>
    );
    const cls = "svc-card group block w-full overflow-hidden rounded-[var(--radius-ui,8px)] bg-card text-start text-card-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]";
    return consulta ? (
      <a href={`https://wa.me/${wa}?text=${encodeURIComponent(s.name)}`} target="_blank" rel="noopener noreferrer" aria-label={label} className={cls}>{inner}</a>
    ) : (
      <button type="button" onClick={() => onBookClick(s.id)} aria-label={label} className={cls}>{inner}</button>
    );
  };

  const fade = reduced ? {} : { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true, amount: 0.2 }, transition: { duration: FADE, ease: "easeOut" as const } };

  return (
    // R23: la sección sigue justo debajo del hero (pt-3), lo primero es contenido; el h2 va debajo (aria-labelledby).
    <section id="services" data-surface={header.surface} aria-labelledby="services-title" className="px-5 pb-16 pt-3 text-foreground sm:pb-20 sm:pt-4 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {cards.length > 0 && (
          <ul className="svc-carousel -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 pt-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:overflow-visible lg:px-0">
            {cards.map((s) => (
              <motion.li key={s.id} {...fade} className="svc-slide w-[82%] shrink-0 snap-center lg:w-auto">
                <Card s={s} />
              </motion.li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
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
