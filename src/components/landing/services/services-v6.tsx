/**
 * services-v6.tsx — LISTA DENSA, PRECIO PRIMERO (genérica, BLOQUE-04).
 *
 * Referencia Seed [R4]: casi acromático, pesos 300–350, píldoras, sin sombras,
 * nunca blanco puro. Brief peluquería: «elige por qué tan buena sos y cuánto
 * cobrás» → el precio es la primera columna, no la última.
 *
 * Disposición propia, distinta de v1–v5/estética/aura:
 *   - dos grupos por modo de contratación (precio fijo → reservar; según
 *     diagnóstico → WhatsApp), cada uno con su cabecera y su cuenta;
 *   - filas de libro mayor: [rango de precio, grande y ligero] [nombre +
 *     duración + píldora] [acción]; todas las filas, sin recorte ni «ver más»;
 *   - separación sólo por líneas de 1 px; el único acento es la píldora
 *     «מבוקש» del servicio `popular`.
 * Sin data-niche: el carácter lo dan preset + config.branding.
 */
import React from "react";
import { motion } from "motion/react";
import { Calendar, MessageCircle, Clock } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { currencySymbol } from "../../../lib/currency";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import type { Service } from "../../../types";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const VIEWPORT = { once: true, amount: 0.2 } as const;

function priceLabel(s: Service, symbol: string): { main: string; prefix?: string } {
  const t = localeConfig.services;
  // Se pinta en un span dir="ltr": en RTL un «120–350» suelto se reordena a «350–120».
  if (s.mode === "consulta") return { prefix: t.fromPrice, main: `${symbol}${s.price}` };
  if (!s.price && !s.priceMax) return { main: t.free };
  if (s.priceMax && s.priceMax > s.price) return { main: `${symbol}${s.price}–${s.priceMax}` };
  return { main: `${symbol}${s.price}` };
}

export function ServicesV6({ onBookClick }: Props) {
  const { services, sections, contact } = siteConfig;
  const header = sections.services;
  const symbol = currencySymbol();
  const wa = toWhatsAppNumber(contact.phone);
  const t = localeConfig.services;

  const fixed = services.filter((s) => s.mode !== "consulta");
  const quoted = services.filter((s) => s.mode === "consulta");
  const groups = [
    { key: "fixed", label: t.groupFixed, items: fixed },
    { key: "quote", label: t.groupQuote, items: quoted },
  ].filter((g) => g.items.length > 0);

  const Row = ({ s, index }: { s: Service; index: number }) => {
    const consulta = s.mode === "consulta";
    const p = priceLabel(s, symbol);
    const action = consulta && wa
      ? { href: `https://wa.me/${wa}`, label: t.quoteAction, Icon: MessageCircle }
      : { onClick: () => onBookClick(s.id), label: t.book, Icon: Calendar };
    const inner = (
      <>
        <span className="flex min-w-[6.5rem] flex-col items-start tabular-nums">
          {p.prefix && <span className="text-[11px] leading-none text-muted-foreground">{p.prefix}</span>}
          <span dir="ltr" className="text-2xl font-light leading-none tracking-tight text-foreground">{p.main}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-medium leading-snug text-foreground">{s.name}</span>
            {s.popular && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">{t.popular}</span>
            )}
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={11} aria-hidden="true" />
            {s.duration} {t.minutesShort}
          </span>
        </span>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors group-hover:bg-foreground group-hover:text-background" aria-hidden="true">
          <action.Icon size={15} />
        </span>
      </>
    );
    const cls = "group flex w-full items-center gap-4 py-4 text-start focus:outline-none focus-visible:bg-muted";
    return (
      <motion.li
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.45, ease: EASE, delay: Math.min(index, 8) * 0.04 }}
        className="border-b border-border last:border-b-0"
      >
        {"href" in action ? (
          <a href={action.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} — ${action.label}`} className={cls}>{inner}</a>
        ) : (
          <button type="button" onClick={action.onClick} aria-label={`${s.name} — ${action.label}`} className={cls}>{inner}</button>
        )}
      </motion.li>
    );
  };

  return (
    <section id="services" className="bg-background px-5 py-16 text-foreground sm:py-20 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{header.title}</p>
            <h2 className="text-3xl font-light leading-tight sm:text-4xl">{header.subtitle}</h2>
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">{services.length}</p>
        </motion.div>

        <div className="space-y-10">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mb-1 flex items-center justify-between border-b border-foreground/20 pb-2 text-xs text-muted-foreground">
                <span>{g.label}</span>
                <span className="tabular-nums">{g.items.length}</span>
              </div>
              <ul>
                {g.items.map((s, i) => <Row key={s.id} s={s} index={i} />)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
