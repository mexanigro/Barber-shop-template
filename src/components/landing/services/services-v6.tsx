/**
 * services-v6.tsx — P-A «TARJETA CON FOTO DEL RESULTADO» (genérica, BLOQUE-04).
 *
 * Patrón elegido por Liam (bloque-04/PATRONES-SERVICIOS.md; Drybar [S1] +
 * Superpower [R2]): seis servicios destacados (`popular` primero, luego los
 * primeros del catálogo) en tarjeta — foto 4:3 del resultado, nombre + rango
 * «₪120–350» en una línea, frase ≤ 12 palabras, duración y **botón a ancho
 * completo** (reservar → wizard con el servicio; consulta → wa.me con el nombre).
 * Debajo, «כל השירותים» despliega el catálogo completo como filas compactas
 * (plegado por defecto, `<details>` nativo). Un acento por pantalla: el botón
 * relleno; la píldora «מבוקש» va en contorno. Radio 0, sin sombras, separación
 * por superficie (DESIGN-PELUQUERIA).
 *
 * Entrada: tarjetas `whileInView once` 450 ms con escalón 40 ms (≤ 8); la foto
 * entra con `clip-path` desde abajo, 400 ms, misma curva. Con
 * prefers-reduced-motion todo es estático. Sin data-niche: el carácter lo dan
 * preset + config.branding. Fotos: `sections.services.images[i]` ↔ `services[i]`.
 */
import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Calendar, MessageCircle, Clock, ChevronDown } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { currencySymbol } from "../../../lib/currency";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import { leadSentences } from "../../../lib/words";
import { handleImgError } from "../../../lib/utils";
import type { Service } from "../../../types";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const VIEWPORT = { once: true, amount: 0.2 } as const;
const FEATURED = 6;
const MAX_WORDS = 12;

function priceLabel(s: Service, symbol: string): { main: string; prefix?: string } {
  const t = localeConfig.services;
  // Se pinta en un span dir="ltr": en RTL un «120–350» suelto se reordena a «350–120».
  if (s.mode === "consulta") return { prefix: t.fromPrice, main: `${symbol}${s.price}` };
  if (!s.price && !s.priceMax) return { main: t.free };
  if (s.priceMax && s.priceMax > s.price) return { main: `${symbol}${s.price}–${s.priceMax}` };
  return { main: `${symbol}${s.price}` };
}

/** `popular` primero, luego los primeros del catálogo, conservando el orden del catálogo. */
function pickFeatured(services: Service[]): Service[] {
  const popular = services.filter((s) => s.popular);
  const rest = services.filter((s) => !s.popular);
  const chosen = new Set([...popular, ...rest].slice(0, FEATURED).map((s) => s.id));
  return services.filter((s) => chosen.has(s.id));
}

export function ServicesV6({ onBookClick }: Props) {
  const { services, sections, contact } = siteConfig;
  const header = sections.services;
  const symbol = currencySymbol();
  const wa = toWhatsAppNumber(contact.phone);
  const t = localeConfig.services;
  const reduced = !!useReducedMotion();

  const featured = pickFeatured(services);
  const imageOf = (s: Service) => header.images?.[services.indexOf(s)];
  // Contrato: foto obligatoria en las destacadas (el validador del hub lo marca); aquí se avisa y la tarjeta sale sin bloque de foto.
  React.useEffect(() => {
    if (import.meta.env.DEV) featured.filter((s) => !imageOf(s)).forEach((s) => console.warn(`[copy] services.${s.id}: falta la foto (sections.services.images[i]); la tarjeta se muestra sin foto.`));
  }, [featured.map((s) => s.id).join()]);
  const waHref = (s: Service) => `https://wa.me/${wa}?text=${encodeURIComponent(s.name)}`;

  const Price = ({ s, className }: { s: Service; className: string }) => {
    const p = priceLabel(s, symbol);
    return (
      <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
        {p.prefix && <span className="text-[11px] font-normal text-muted-foreground">{p.prefix}</span>}
        <span dir="ltr">{p.main}</span>
      </span>
    );
  };

  const Card = ({ s, index }: { s: Service; index: number }) => {
    const consulta = s.mode === "consulta" && !!wa;
    const img = imageOf(s);
    const delay = Math.min(index, 8) * 0.04;
    const btnCls = "flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-ui,0px)] bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
    return (
      <motion.article
        initial={reduced ? false : "hidden"}
        whileInView="show"
        viewport={VIEWPORT}
        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay } } }}
        className="flex flex-col overflow-hidden rounded-[var(--radius-ui,0px)] border border-border bg-card text-card-foreground"
      >
        {/* El clip va en el contenedor (no en la <img>, que con clip al 100 % no carga en diferido) y lo dispara la
            tarjeta por variantes: un elemento recortado al 100 % no interseca y su propio whileInView nunca saltaría. */}
        {img && (
          <motion.div
            variants={{ hidden: { clipPath: "inset(100% 0 0 0)" }, show: { clipPath: "inset(0% 0 0 0)", transition: { duration: 0.4, ease: EASE, delay: delay + 0.05 } } }}
            className="relative aspect-[4/3] overflow-hidden bg-muted"
          >
            <img src={img} alt={s.name} loading="lazy" decoding="async" onError={handleImgError} className="absolute inset-0 h-full w-full object-cover" />
          </motion.div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[17px] font-medium leading-snug">{s.name}</h3>
            <Price s={s} className="shrink-0 text-[17px] font-medium" />
          </div>
          {s.popular && (
            <span className="mt-2 self-start rounded-full border border-foreground/30 px-2 py-0.5 text-[11px] font-medium leading-none text-foreground/80">{t.popular}</span>
          )}
          {s.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{leadSentences(s.description, MAX_WORDS, `services.${s.id}.description`)}</p>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={12} aria-hidden="true" />
            <span className="tabular-nums">{s.duration}</span> {t.minutesShort}
          </p>
          <div className="mt-auto pt-5">
            {consulta ? (
              <a href={waHref(s)} target="_blank" rel="noopener noreferrer" className={btnCls}>
                <MessageCircle size={16} aria-hidden="true" />
                {t.quoteCta}
              </a>
            ) : (
              <button type="button" onClick={() => onBookClick(s.id)} className={btnCls}>
                <Calendar size={16} aria-hidden="true" />
                {t.bookService}
              </button>
            )}
          </div>
        </div>
      </motion.article>
    );
  };

  const Row = ({ s }: { s: Service }) => {
    const consulta = s.mode === "consulta" && !!wa;
    const action = consulta
      ? { href: waHref(s), label: t.quoteAction, Icon: MessageCircle }
      : { onClick: () => onBookClick(s.id), label: t.bookService, Icon: Calendar };
    const inner = (
      <>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium leading-snug">{s.name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={11} aria-hidden="true" />
            <span className="tabular-nums">{s.duration}</span> {t.minutesShort}
          </span>
        </span>
        <Price s={s} className="shrink-0 text-base font-medium" />
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:bg-foreground group-hover:text-background" aria-hidden="true">
          <action.Icon size={15} />
        </span>
      </>
    );
    const cls = "group flex w-full items-center gap-4 py-3.5 text-start focus:outline-none focus-visible:bg-muted";
    return (
      <li className="border-b border-border last:border-b-0">
        {"href" in action ? (
          <a href={action.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} — ${action.label}`} className={cls}>{inner}</a>
        ) : (
          <button type="button" onClick={action.onClick} aria-label={`${s.name} — ${action.label}`} className={cls}>{inner}</button>
        )}
      </li>
    );
  };

  return (
    // Liam (2026-09-19): «el espacio entre los servicios y el hero tiene que ser casi nulo … tiene que seguir justo debajo.
    // Reubicar el título para que no marque tan bruscamente la separación». Las tarjetas van primero, pegadas al pie del
    // hero (pt-3); el título pasa debajo de las tarjetas, en una línea compacta (sigue siendo el h2 de la sección: aria-labelledby).
    <section id="services" data-surface={header.surface} aria-labelledby="services-title" className="bg-background px-5 pb-16 pt-3 text-foreground sm:pb-20 sm:pt-4 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {featured.map((s, i) => <Card key={s.id} s={s} index={i} />)}
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1"
        >
          <h2 id="services-title" className="text-base font-medium leading-tight">{header.subtitle}</h2>
          <p className="text-xs text-muted-foreground">{header.title}</p>
        </motion.div>

        {services.length > 0 && (
          <details className="group/all mt-8 border-t border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium marker:hidden focus:outline-none focus-visible:bg-muted [&::-webkit-details-marker]:hidden">
              <span>
                {t.allServices} <span className="ms-1 text-xs font-normal text-muted-foreground tabular-nums">{services.length}</span>
              </span>
              <ChevronDown size={18} aria-hidden="true" className="transition-transform duration-200 group-open/all:rotate-180" />
            </summary>
            <ul className="border-t border-border">
              {services.map((s) => <Row key={s.id} s={s} />)}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
