/**
 * hero-v6.tsx — CINEMÁTICO CON FILA DE CONFIANZA (genérico, BLOQUE-04).
 *
 * Fundamentos en bloque-04/DESIGN-PELUQUERIA.md (aprobado 2026-09-18):
 *   - 100 dvh, foto o vídeo a sangre bajo un scrim en degradado; el único
 *     acento de la pantalla es el relleno del CTA [A2][B21].
 *   - Copy anclado abajo-inicio (eyebrow → titular con contraste de peso →
 *     subtítulo), CTA relleno + CTA de texto, fila de confianza con datos
 *     reales (valoración, «abierto hoy hasta», barrio) y tira de servicios
 *     asomando que abre el wizard con ese servicio [C1][C2].
 *   - Entrada: fade + 8 px en capas escalonadas 40 ms, ease-out fuerte [B23].
 *   - Salida ligada al scroll: `useScroll` + `useTransform` sobre opacity y
 *     transform (aceleradas, ScrollTimeline donde exista) [B1]; la sección
 *     siguiente entra por cambio de superficie, sin pin [A2].
 *   - `hero.video` opcional: <video autoplay muted loop playsinline
 *     preload="metadata" poster> con WebM antes que MP4 y la foto como
 *     respaldo [E1][B9][B11][B12]; pausa fuera de pantalla; con
 *     prefers-reduced-motion no se autoreproduce (queda el póster) [B18];
 *     icono de pausa discreto con aria-label (WCAG 2.2.2) [B19].
 * Sin data-niche: el carácter lo dan preset + config.branding.
 */
import React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowUpLeft, ArrowUpRight, Star, Clock, MapPin, Pause, Play } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { interpolate } from "../../../lib/interpolate";
import { currencySymbol } from "../../../lib/currency";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import { handleImgError } from "../../../lib/utils";
import type { BusinessHours } from "../../../types";

/** Ease-out fuerte del repo (emil: las curvas nativas son demasiado débiles). */
const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const STAGGER = 0.04; // 40 ms por capa (DESIGN, límite 4)
const DAY_KEYS: (keyof BusinessHours)[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function todayHours(hours: BusinessHours | undefined) {
  if (!hours) return null;
  const day = hours[DAY_KEYS[new Date().getDay()]];
  return day && typeof day === "object" && "end" in day ? (day as { start: string; end: string }) : null;
}

/* ── Fondo: vídeo con póster y respaldo de imagen, o sólo imagen ────────── */
function HeroMedia({ reduced }: { reduced: boolean }) {
  const { hero } = siteConfig;
  const video = hero.video;
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const userPaused = React.useRef(false);

  // Sin vídeo, con reduce o si el navegador no pudo reproducir: la foto (o el póster).
  const showVideo = !!video?.mp4 && !reduced && !failed;

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el || !showVideo) return;
    const tryPlay = () => {
      const p = el.play();
      if (p) p.then(() => setPlaying(true)).catch(() => { setPlaying(false); setFailed(true); }); // [B10]
    };
    // Reproducir sólo en pantalla; pausar al salir (iOS ya lo hace solo) [B11][B12].
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!userPaused.current) tryPlay(); }
      else { el.pause(); setPlaying(false); }
    }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [showVideo]);

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { userPaused.current = false; el.play().then(() => setPlaying(true)).catch(() => setFailed(true)); }
    else { userPaused.current = true; el.pause(); setPlaying(false); }
  };

  const poster = video?.poster || hero.backgroundImage;

  return (
    <>
      {showVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setFailed(true)}
        >
          {video.webm && <source src={video.webm} type="video/webm" />}
          <source src={video.mp4} type="video/mp4" />
        </video>
      ) : (
        <img
          src={poster}
          alt={localeConfig.hero.backgroundAlt}
          onError={handleImgError}
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
      )}
      {/* Scrim: contraste garantizado del copy y del CTA sobre cualquier cuadro [B20][B21]. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" aria-hidden="true" />
      {showVideo && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? localeConfig.hero.pauseVideo : localeConfig.hero.playVideo}
          aria-pressed={!playing}
          className="absolute end-4 top-24 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/80 backdrop-blur-sm transition-[transform,background-color] duration-150 ease-out hover:bg-black/50 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        </button>
      )}
    </>
  );
}

export function HeroV6({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, contact, services, testimonials, sections } = siteConfig;
  const reduced = !!useReducedMotion();
  const sectionRef = React.useRef<HTMLElement>(null);
  const peekRef = React.useRef<HTMLDivElement>(null);

  // Salida ligada al scroll: mientras el hero sale por arriba, el copy se
  // apaga y sube; sólo opacity/transform (aceleradas) [B1]. Con reduce: estático.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  // Mapeo por función, no por rangos: con rangos Motion 12 delega en ScrollTimeline
  // pero ignora `target` (medido: el progreso pasa a ser el del documento entero).
  // La función mantiene el cálculo en JS (2 escrituras de estilo por cuadro) y el
  // pintado sigue acelerado porque sólo tocamos opacity/transform.
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const contentOpacity = useTransform(scrollYProgress, (v) => 1 - 0.6 * clamp01(v / 0.6));
  const contentTransform = useTransform(scrollYProgress, (v) => `translateY(${(-40 * clamp01(v)).toFixed(2)}px)`);
  const mediaOpacity = useTransform(scrollYProgress, (v) => 1 - 0.4 * clamp01((v - 0.4) / 0.6));

  // Mientras la tira de servicios está en pantalla, index.css eleva el FAB de
  // accesibilidad (mismo mecanismo que la barra fija: atributo en <html> + variable).
  React.useEffect(() => {
    const el = peekRef.current;
    if (!el) return;
    const root = document.documentElement;
    const setHeight = () => root.style.setProperty("--hero-peek-h", `${el.offsetHeight}px`);
    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) root.setAttribute("data-hero-peek", "1");
      else root.removeAttribute("data-hero-peek");
    }, { threshold: 0.05 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
      root.removeAttribute("data-hero-peek");
      root.style.removeProperty("--hero-peek-h");
    };
  }, []);

  const isRtl = localeConfig.dir === "rtl";
  const Arrow = isRtl ? ArrowUpLeft : ArrowUpRight;
  const wa = toWhatsAppNumber(contact.phone);
  const symbol = currencySymbol();

  const rated = testimonials.filter((t) => typeof t.rating === "number");
  const avg = rated.length ? rated.reduce((a, t) => a + (t.rating ?? 0), 0) / rated.length : 0;
  const hasHours = !!siteConfig.hours && DAY_KEYS.some((k) => siteConfig.hours[k]);
  const today = hasHours ? todayHours(siteConfig.hours) : null;
  const district = contact.address?.district || contact.address?.cityStateZip || "";
  const peek = services.slice(0, 3);
  const images = sections.services?.images ?? [];

  // Entrada: fade + 8 px, ease-out, capa a capa (40 ms). Con reduce: sólo fade.
  const enter = (i: number) => ({
    initial: { opacity: 0, transform: reduced ? "none" : "translateY(8px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.45, ease: EASE, delay: 0.05 + i * STAGGER },
  });

  const chip = "inline-flex min-h-9 items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 backdrop-blur-sm";

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-[100dvh] overflow-hidden bg-[color:var(--brand-surface-dark,#111)] text-white"
    >
      <motion.div className="absolute inset-0" style={reduced ? undefined : { opacity: mediaOpacity }} aria-hidden="true">
        <HeroMedia reduced={reduced} />
      </motion.div>

      <motion.div
        className="relative flex min-h-[100dvh] flex-col justify-end"
        style={reduced ? undefined : { opacity: contentOpacity, transform: contentTransform }}
      >
        <div className="mx-auto w-full max-w-6xl px-5 pt-28 lg:px-10">
          <motion.p {...enter(0)} className="mb-3 text-[13px] font-medium tracking-wide text-white/70">
            {brand.tagline}
          </motion.p>
          <motion.h1 {...enter(1)} className="max-w-3xl text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl">
            <span className="block font-light">{hero.titlePrefix}</span>
            <span className="block font-medium">{hero.titleHighlight}</span>
            {hero.titleSuffix && <span className="block font-light">{hero.titleSuffix}</span>}
          </motion.h1>
          {hero.subtitle && (
            <motion.p {...enter(2)} className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80 sm:text-base">
              {hero.subtitle}
            </motion.p>
          )}

          {/* CTA: un solo relleno de acento; el segundo es texto */}
          <motion.div {...enter(3)} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              onClick={() => onBookClick()}
              className="inline-flex h-12 items-center gap-2 bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {hero.ctaPrimary}
            </button>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 border-b border-white/40 text-[15px] font-medium text-white transition-colors duration-150 hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {hero.ctaSecondary}
                <Arrow size={16} aria-hidden="true" />
              </a>
            )}
          </motion.div>

          {/* Fila de confianza con datos reales */}
          <motion.ul {...enter(4)} className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/85" aria-label={localeConfig.hero.trustRow}>
            {rated.length > 0 && (
              <li className={chip}>
                <Star size={12} className="fill-current" aria-hidden="true" />
                <span className="font-semibold">{avg.toFixed(1)}</span>
                <span className="text-white/60">·</span>
                <span>{interpolate(localeConfig.hero.reviewsCount, { count: rated.length })}</span>
              </li>
            )}
            {hasHours && (
              <li className={chip}>
                <Clock size={12} aria-hidden="true" />
                <span>{today ? interpolate(localeConfig.hero.openTodayUntil, { time: today.end }) : localeConfig.hero.closedToday}</span>
              </li>
            )}
            {district && (
              <li className={chip}>
                <MapPin size={12} aria-hidden="true" />
                <span>{district}</span>
              </li>
            )}
          </motion.ul>
        </div>

        {/* Servicios asomando en el borde inferior → wizard con ese servicio */}
        {peek.length > 0 && (
          <motion.div
            ref={peekRef}
            {...enter(5)}
            className="mx-auto mt-7 w-full max-w-6xl"
            role="region"
            aria-label={localeConfig.hero.servicesPeek}
          >
            <ul className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto px-5 pb-5 lg:px-10 [&>li]:snap-start">
              {peek.map((s, i) => {
                const img = s.image || images[i % Math.max(images.length, 1)];
                const consulta = s.mode === "consulta";
                const inner = (
                  <>
                    {img && <img src={img} alt="" onError={handleImgError} className="aspect-[4/3] w-full object-cover" loading="lazy" />}
                    <span className="block px-3 pt-2.5 text-[13px] font-medium leading-tight text-white">{s.name}</span>
                    <span className="block px-3 pb-3 pt-1 text-xs text-white/65">
                      {localeConfig.services.fromPrice} {symbol}{s.price}
                      {consulta ? ` · ${localeConfig.inquiry.whatsapp}` : ""}
                    </span>
                  </>
                );
                const cls = "block w-full text-start transition-transform duration-150 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
                return (
                  <li key={s.id} className="w-[150px] shrink-0 bg-black/55 backdrop-blur-sm sm:w-[180px]">
                    {consulta && wa ? (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
                    ) : (
                      <button type="button" onClick={() => onBookClick(s.id)} className={cls}>{inner}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
