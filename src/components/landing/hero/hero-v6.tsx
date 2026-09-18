/**
 * hero-v6.tsx — CINEMÁTICO CON FILA DE CONFIANZA (genérico, BLOQUE-04).
 *
 * Referencia Superpower [R2]: fotografía a sangre que domina el hero, un solo
 * acento (el relleno del CTA principal) y «cada CTA acompañado de una fila de
 * confianza». Disposición propia, distinta de v1–v5/estética/aura:
 *   1. bloque de copy anclado abajo-inicio (eyebrow → titular en tres líneas
 *      con contraste de peso, no de color → subtítulo),
 *   2. par de CTA: reservar (relleno) + WhatsApp (texto con flecha),
 *   3. fila de confianza con datos reales de la config: valoración media y
 *      número de reseñas, «abierto hoy hasta», barrio,
 *   4. tira de servicios «asomando» en el borde inferior (foto + nombre +
 *      «desde» precio) que lleva directo al wizard con ese servicio.
 * Sin sombras; separación por superficie (bordes 1 px). Sin data-niche: el
 * carácter lo dan preset + config.branding.
 */
import React from "react";
import { motion } from "motion/react";
import { ArrowUpLeft, ArrowUpRight, Star, Clock, MapPin } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { interpolate } from "../../../lib/interpolate";
import { currencySymbol } from "../../../lib/currency";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import { handleImgError } from "../../../lib/utils";
import type { BusinessHours } from "../../../types";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const DAY_KEYS: (keyof BusinessHours)[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function todayHours(hours: BusinessHours | undefined) {
  if (!hours) return null;
  const key = DAY_KEYS[new Date().getDay()];
  const day = hours[key];
  return day && typeof day === "object" && "end" in day ? (day as { start: string; end: string }) : null;
}

export function HeroV6({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, contact, services, testimonials, sections } = siteConfig;
  const isRtl = localeConfig.dir === "rtl";
  const Arrow = isRtl ? ArrowUpLeft : ArrowUpRight;
  const wa = toWhatsAppNumber(contact.phone);
  const symbol = currencySymbol();

  const rated = testimonials.filter((t) => typeof t.rating === "number");
  const avg = rated.length ? rated.reduce((a, t) => a + (t.rating ?? 0), 0) / rated.length : 0;
  const today = todayHours(siteConfig.hours);
  const district = contact.address?.district || contact.address?.cityStateZip || "";
  const peek = services.slice(0, 3);
  const images = sections.services?.images ?? [];

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: EASE, delay },
  });

  return (
    <section id="hero" className="relative min-h-[100dvh] overflow-hidden bg-[color:var(--brand-surface-dark,#111)] text-white">
      {/* Foto a sangre: el único protagonista visual. */}
      <img
        src={hero.backgroundImage}
        alt={localeConfig.hero.backgroundAlt}
        onError={handleImgError}
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" aria-hidden="true" />

      <div className="relative flex min-h-[100dvh] flex-col justify-end">
        <div className="mx-auto w-full max-w-6xl px-5 pt-28 lg:px-10">
          {/* 1 · copy anclado abajo-inicio */}
          <motion.p {...fade(0.05)} className="mb-3 text-[13px] font-medium tracking-wide text-white/70">
            {brand.tagline}
          </motion.p>
          <motion.h1 {...fade(0.12)} className="max-w-3xl text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl">
            <span className="block font-light">{hero.titlePrefix}</span>
            <span className="block font-medium">{hero.titleHighlight}</span>
            {hero.titleSuffix && <span className="block font-light">{hero.titleSuffix}</span>}
          </motion.h1>
          {hero.subtitle && (
            <motion.p {...fade(0.2)} className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80 sm:text-base">
              {hero.subtitle}
            </motion.p>
          )}

          {/* 2 · CTA: un solo relleno de acento; el segundo es texto */}
          <motion.div {...fade(0.28)} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              onClick={() => onBookClick()}
              className="inline-flex h-12 items-center gap-2 bg-primary px-6 text-[15px] font-semibold text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {hero.ctaPrimary}
            </button>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 border-b border-white/40 pb-0.5 text-[15px] font-medium text-white hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {hero.ctaSecondary}
                <Arrow size={16} aria-hidden="true" />
              </a>
            )}
          </motion.div>

          {/* 3 · fila de confianza con datos reales */}
          <motion.ul {...fade(0.36)} className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/85" aria-label={localeConfig.hero.trustRow}>
            {rated.length > 0 && (
              <li className="inline-flex items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                <Star size={12} className="fill-current" aria-hidden="true" />
                <span className="font-semibold">{avg.toFixed(1)}</span>
                <span className="text-white/60">·</span>
                <span>{interpolate(localeConfig.hero.reviewsCount, { count: rated.length })}</span>
              </li>
            )}
            <li className="inline-flex items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
              <Clock size={12} aria-hidden="true" />
              <span>{today ? interpolate(localeConfig.hero.openTodayUntil, { time: today.end }) : localeConfig.hero.closedToday}</span>
            </li>
            {district && (
              <li className="inline-flex items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                <MapPin size={12} aria-hidden="true" />
                <span>{district}</span>
              </li>
            )}
          </motion.ul>
        </div>

        {/* 4 · servicios asomando en el borde inferior */}
        {peek.length > 0 && (
          <motion.div
            {...fade(0.46)}
            className="mx-auto mt-7 w-full max-w-6xl"
            role="region"
            aria-label={localeConfig.hero.servicesPeek}
          >
            <ul className="no-scrollbar flex snap-x snap-mandatory gap-px overflow-x-auto bg-white/10 px-5 pb-5 lg:px-10 [&>li]:snap-start">
              {peek.map((s, i) => {
                const img = s.image || images[i % Math.max(images.length, 1)];
                const consulta = s.mode === "consulta";
                const inner = (
                  <>
                    {img && <img src={img} alt="" onError={handleImgError} className="aspect-[4/3] w-full object-cover" loading="lazy" />}
                    <span className="block px-3 pt-2.5 text-[13px] font-medium leading-tight text-white">{s.name}</span>
                    <span className="block px-3 pb-3 pt-1 text-xs text-white/65">
                      {localeConfig.services.fromPrice} {s.price}{symbol}
                      {consulta ? ` · ${localeConfig.inquiry.whatsapp}` : ""}
                    </span>
                  </>
                );
                return (
                  <li key={s.id} className="w-[150px] shrink-0 bg-black/55 backdrop-blur-sm sm:w-[180px]">
                    {consulta && wa ? (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">{inner}</a>
                    ) : (
                      <button type="button" onClick={() => onBookClick(s.id)} className="block w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">{inner}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </div>
    </section>
  );
}
