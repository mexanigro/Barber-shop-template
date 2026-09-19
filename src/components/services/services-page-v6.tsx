/**
 * services-page-v6.tsx — página /servicios de peluquería (SERVICES-02 fase 2, 2026-09-19; CONTRATOS § services v6).
 * Catálogo completo agrupado por modo (`reserva` → groupFixed; `consulta` → groupQuote), cada fila con foto pequeña (si hay),
 * nombre, frase, precio/rango, duración y SUS DOS acciones (reservar + WhatsApp; `consulta` sin teléfono → sólo reservar).
 * Título y meta por locale; vuelta a la home; navbar v6 y FAB los pone App (misma shell que /treatments); fondo con la
 * textura del modo (R21: `data-surface="textura"` + `--texture-url`). Ruta SPA: /servicios (history.pushState).
 * Sin entradas animadas (Liam 2026-09-19); lo que se mueve es el relieve de los botones.
 */
import React from "react";
import { ArrowLeft, ArrowRight, Calendar, Clock, MessageCircle } from "lucide-react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { interpolate } from "../../lib/interpolate";
import { currencySymbol } from "../../lib/currency";
import { toWhatsAppNumber } from "../../lib/whatsapp";
import { leadSentences } from "../../lib/words";
import { handleImgError } from "../../lib/utils";
import { priceLabel } from "../../lib/services-v6";
import type { Service } from "../../types";

export function ServicesPageV6({ onBack, onBookClick }: { onBack: () => void; onBookClick: (serviceId?: string) => void }) {
  const { services, sections, brand, contact } = siteConfig;
  const header = sections.services;
  const t = localeConfig.services;
  const isRtl = localeConfig.dir === "rtl";
  const Back = isRtl ? ArrowRight : ArrowLeft;
  const symbol = currencySymbol();
  const wa = toWhatsAppNumber(contact.phone);
  const texture = siteConfig.branding?.texture;

  React.useEffect(() => {
    document.title = `${header.subtitle} · ${brand.name}`;
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content");
    meta?.setAttribute("content", interpolate(t.servicesPageIntro, { count: services.length }));
    const root = document.documentElement;
    if (texture) root.style.setProperty("--texture-url", `url("${texture}")`);
    return () => { if (prev != null) meta?.setAttribute("content", prev); root.style.removeProperty("--texture-url"); };
  }, []);

  const groups = ([
    { key: "reserva", label: t.groupFixed as string, items: services.filter((s) => s.mode !== "consulta") },
    { key: "consulta", label: t.groupQuote as string, items: services.filter((s) => s.mode === "consulta") },
  ] as const).filter((g) => g.items.length > 0);
  const imageOf = (s: Service) => header.images?.[services.indexOf(s)];
  const btn = "inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-ui,8px)] px-3.5 text-[14px] font-semibold transition-transform duration-150 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]";

  return (
    <section data-surface="textura" className="min-h-screen px-5 pb-20 pt-28 text-foreground lg:px-10">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]">
          <Back size={16} aria-hidden="true" />
          {localeConfig.about.backToHome}
        </button>
        <h1 className="mt-6 text-3xl font-light leading-tight sm:text-4xl">{header.subtitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{interpolate(t.servicesPageIntro, { count: services.length })}</p>

        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`services-group-${g.key}`} className="mt-10">
            <h2 id={`services-group-${g.key}`} className="text-xs font-medium tracking-wide text-muted-foreground">{g.label}</h2>
            <ul className="mt-3 divide-y divide-border rounded-[var(--radius-ui,8px)] border border-border bg-card">
              {g.items.map((s) => {
                const p = priceLabel(s, symbol, t);
                const img = imageOf(s);
                return (
                  <li key={s.id} className="flex gap-4 p-4">
                    {img && <img src={img} alt="" loading="lazy" decoding="async" onError={handleImgError} className="h-16 w-16 shrink-0 rounded-[var(--radius-ui,8px)] object-cover" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-[16px] font-medium leading-snug">{s.name}</h3>
                        <span className="shrink-0 text-[16px] font-medium tabular-nums">
                          {p.prefix && <span className="me-1 text-[11px] font-normal text-muted-foreground">{p.prefix}</span>}
                          <span dir="ltr">{p.main}</span>
                        </span>
                      </div>
                      {s.description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{leadSentences(s.description, 12, `services.${s.id}.description`)}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="me-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={12} aria-hidden="true" />
                          <span className="tabular-nums">{s.duration}</span> {t.minutesShort}
                        </span>
                        {wa && (
                          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(s.name)}`} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} — ${t.quoteAction}`} className={`${btn} border border-border bg-transparent text-foreground`}>
                            <MessageCircle size={15} aria-hidden="true" />
                            {t.quoteAction}
                          </a>
                        )}
                        <button type="button" onClick={() => onBookClick(s.id)} aria-label={`${s.name} — ${t.bookService}`} className={`${btn} bg-primary text-primary-foreground`}>
                          <Calendar size={15} aria-hidden="true" />
                          {t.bookService}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
