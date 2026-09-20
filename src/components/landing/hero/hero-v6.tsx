/**
 * hero-v6.tsx — P1 «BLOQUE INICIO CON SCRIM Y PRUEBA» (genérico, BLOQUE-04).
 *
 * Patrón elegido por Liam (bloque-04/PATRONES-HERO.md, Superpower/Hairstory
 * [V1][V8]) con regla dura: **máximo 30 palabras sobre el vídeo** —
 * eyebrow ≤ 4, titular 4–6 en una o dos líneas, frase ≤ 12, CTA relleno +
 * CTA de texto, una sola línea de confianza (★ media · N reseñas). Anclado
 * abajo-inicio en móvil; centro-inicio en escritorio. Sin tira, sin chips,
 * sin párrafo.
 *
 * Contraste: scrim desde el lado del texto + sombra de texto suave
 * (Hairstory [V8]); el vídeo respira en el otro lado. Infraestructura que se
 * conserva: `hero.video` (WebM antes que MP4, póster, respaldo de imagen,
 * pausa fuera de pantalla), salida ligada al scroll a partir del 20 % del
 * recorrido, `prefers-reduced-motion` (póster, sin autoplay, sin
 * desplazamiento) y pausa como icono solo, abajo al lado final [V2][V7][V9].
 * Sin data-niche: el carácter lo dan preset + config.branding.
 */
import React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowUpLeft, ArrowUpRight, Star, Pause, Play } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { interpolate } from "../../../lib/interpolate";
import { toWhatsAppNumber } from "../../../lib/whatsapp";
import { handleImgError } from "../../../lib/utils";
import { clampWords, warnWords } from "../../../lib/words";

/** Ease-out fuerte del repo (las curvas nativas son demasiado débiles). */
const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
const STAGGER = 0.04; // 40 ms por capa
const LIMITS = { eyebrow: 4, subtitle: 12 } as const;

/* ── Fondo: vídeo con póster y respaldo de imagen, o sólo imagen ────────── */
function HeroMedia({ reduced, isRtl, centered }: { reduced: boolean; isRtl: boolean; centered: boolean }) {
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
      // D4: un play() interrumpido por un pause() (AbortError, pasa al pausar/reanudar en el borde con CPU ocupada) NO es un fallo:
      // si se marcara `failed`, el vídeo se sustituiría por el póster para siempre. Sólo NotAllowed/NotSupported degradan al póster.
      if (p) p.then(() => setPlaying(true)).catch((err: unknown) => { if ((err as { name?: string })?.name === "AbortError") return; setPlaying(false); setFailed(true); });
    };
    // D18 (R4): reproducir sólo en pantalla; pausar al salir del hero («que deje de consumir») y volver a reproducir al volver
    // (si el visitante no lo pausó). Sin cambio visual. iOS ya pausa solo; aquí vale para todos.
    // GALERIA-03 D4 (Liam: «se tilda» al volver a subir): la reanudación se hace con HISTÉRESIS y ANTES de que el hero entre —
    // dos observadores: `ioPlay` con rootMargin (el vídeo arranca cuando el hero está a --hero-resume-margin de entrar, así el
    // reenganche del decodificador ocurre fuera de pantalla) y `ioPause` que pausa sólo cuando el hero salió del todo y un margen más
    // (no en el borde exacto, para no pausar/reanudar en cada rebote). `play()` diferido a rAF: nunca dentro del callback del observador.
    // No hay load() ni cambio de src: el buffer se conserva.
    let raf = 0; const playLater = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!userPaused.current && el.paused) tryPlay(); }); };
    const ioPlay = new IntersectionObserver(([e]) => { if (e.isIntersecting) playLater(); }, { rootMargin: `${RESUME_MARGIN_PX}px 0px ${RESUME_MARGIN_PX}px 0px`, threshold: 0 });
    const ioPause = new IntersectionObserver(([e]) => { if (!e.isIntersecting && !el.paused) { el.pause(); setPlaying(false); } }, { rootMargin: `${PAUSE_MARGIN_PX}px 0px ${PAUSE_MARGIN_PX}px 0px`, threshold: 0 });
    ioPlay.observe(el); ioPause.observe(el);
    const io = { disconnect: () => { ioPlay.disconnect(); ioPause.disconnect(); cancelAnimationFrame(raf); } };
    // Pestaña oculta al cargar: reintentar al mostrarse.
    const onVisible = () => { if (!document.hidden && !userPaused.current && el.paused) tryPlay(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVisible); };
  }, [showVideo]);

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { userPaused.current = false; el.play().then(() => setPlaying(true)).catch(() => setFailed(true)); }
    else { userPaused.current = true; el.pause(); setPlaying(false); }
  };

  // Retrato: el navegador elige la <source> por `media` al cargar; el póster es un solo atributo, se elige aquí.
  const portrait = React.useMemo(() => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches, []);
  const poster = (portrait && video?.portrait?.poster) || video?.poster || hero.backgroundImage;
  const focus = video?.focus ? { objectPosition: video.focus } : undefined;
  // Scrim desde el lado del texto (inicio) + apoyo desde abajo para el bloque móvil.
  const side = isRtl ? "left" : "right";
  // Tono de la paleta (--scrim, nunca negro puro) con las mismas opacidades; sin token (otros nichos) cae a negro.
  const s = (a: number) => `color-mix(in srgb, var(--scrim, #000) ${Math.round(a * 100)}%, transparent)`;
  // FONDO-03/FONDO-04 (historia): --hero-fade-h y --hero-plateau valen 0 salvo html[data-hero-fade="on"].
  // TRANSICION-02 (T-B, 2026-09-19, sólo peluquería): el vídeo y el póster llevan MÁSCARA ALFA hacia el fondo del hero, que es
  // --surface del modo (`.hero-v6-media` en index.css, alto `--hero-mask-h`): el hero se disuelve en la misma superficie de la
  // página, no en un color pintado. El scrim es sólo lo que el texto necesita sobre el vídeo, en el MISMO tono --surface (nunca
  // un tercer tono): medido en el peor píxel bajo el bloque (captura-fondo --solo mascara): con 0,55/0,45/0,25 el texto oscuro
  // daba 1,9 (A) y 3,3 (B) sobre el pelo; con 0,6 hasta la máscara +25 % → 0,3 a +40 % → 0 a +55 % llega a ≥ 4,5. Se retiran la banda
  // --hero-foot, el traspaso y la costura clara a prueba (S6). D14: texto centrado y abajo; scrim sólo de abajo hacia arriba.
  const l = (a: number) => `color-mix(in srgb, var(--surface, #fff) ${Math.round(a * 100)}%, transparent)`;
  // fase 2 (máscara 15/12 %): el scrim bajo el bloque sube por modo con --hero-scrim-a (claro 0,6 · oscuro 0,72: C daba 4,25 sobre
  // la luz blanca del lavabo); el segundo escalón es la mitad. Sólo bajo el bloque de texto, nunca sobre el resto del vídeo.
  const ls = (k: number) => `color-mix(in srgb, var(--surface, #fff) calc(var(--hero-scrim-a, 0.6) * ${k * 100}%), transparent)`;
  const scrim = centered
    ? `linear-gradient(to top, ${ls(1)} 0, ${ls(1)} calc(var(--hero-mask-h, 25%) + 25%), ${ls(0.5)} calc(var(--hero-mask-h, 25%) + 40%), ${l(0)} calc(var(--hero-mask-h, 25%) + 55%))`
    : `linear-gradient(to top, ${s(1)} 0, ${s(1)} var(--hero-plateau, 0px), ${s(0)} calc(var(--hero-fade-h, 0px) + var(--hero-plateau, 0px))), linear-gradient(to ${side}, ${s(0.62)} 0%, ${s(0.28)} 45%, ${s(0)} 78%), linear-gradient(to top, ${s(0.55)} 0%, ${s(0)} 55%)`;
  const mediaCls = centered ? "hero-v6-media absolute inset-0 h-full w-full object-cover" : "absolute inset-0 h-full w-full object-cover";

  return (
    <>
      {showVideo ? (
        <video
          ref={videoRef}
          className={mediaCls}
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          style={focus}
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setFailed(true)}
        >
          {/* AJUSTES-01: mp4 (H.264 CRF 16–18) ANTES que webm en las tres variantes — el navegador toma la primera que puede,
              y el VP9 era más blando; el webm queda de reserva (CRF 22–24 desde AJUSTES-01) para quien no reproduzca H.264. */}
          {video.portrait && <source src={video.portrait.mp4} type="video/mp4" media="(orientation: portrait)" />}
          {video.portrait?.webm && <source src={video.portrait.webm} type="video/webm" media="(orientation: portrait)" />}
          {video.medium && <source src={video.mp4} type="video/mp4" media="(min-width: 1024px)" />}
          {video.medium?.webm && <source src={video.webm} type="video/webm" media="(min-width: 1024px)" />}
          {video.medium && <source src={video.medium.mp4} type="video/mp4" />}
          {video.medium?.webm && <source src={video.medium.webm} type="video/webm" />}
          {!video.medium && <source src={video.mp4} type="video/mp4" />}
          {!video.medium && video.webm && <source src={video.webm} type="video/webm" />}
        </video>
      ) : (
        <img
          src={poster}
          alt={localeConfig.hero.backgroundAlt}
          onError={handleImgError}
          className={mediaCls}
          style={focus}
          fetchPriority="high"
        />
      )}
      <div className="absolute inset-0" style={{ backgroundImage: scrim }} aria-hidden="true" />
      {showVideo && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? localeConfig.hero.pauseVideo : localeConfig.hero.playVideo}
          aria-pressed={!playing}
          className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] end-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-on-media/15 bg-media-scrim/20 text-on-media/80 backdrop-blur-sm transition-[transform,background-color] duration-150 ease-out hover:bg-media-scrim/35 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-on-media/70"
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        </button>
      )}
    </>
  );
}

/** D4 (GALERIA-03): el vídeo se reanuda cuando el hero está a esta distancia de entrar en pantalla (fuera de vista) y se pausa sólo cuando salió del todo y otro tanto más. */
export const RESUME_MARGIN_PX = 400, PAUSE_MARGIN_PX = 300;

export function HeroV6({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, contact, testimonials } = siteConfig;
  const reduced = !!useReducedMotion();
  const sectionRef = React.useRef<HTMLElement>(null);
  const isRtl = localeConfig.dir === "rtl";
  const Arrow = isRtl ? ArrowUpLeft : ArrowUpRight;
  const wa = toWhatsAppNumber(contact.phone);
  // D14 (Liam 2026-09-19, sólo peluquería): «la info del hero escrita por encima del video tiene que estar centrada y abajo».
  const centered = siteConfig.business.type === "peluqueria";

  // Salida ligada al scroll a partir del 20 % del recorrido del hero: el copy se
  // apaga y sube; sólo opacity/transform. Mapeo por función (con rangos Motion 12
  // delega en ScrollTimeline e ignora `target`). Con reduce: estático.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const after20 = (v: number) => Math.min(1, Math.max(0, (v - 0.2) / 0.8));
  const contentOpacity = useTransform(scrollYProgress, (v) => 1 - 0.6 * after20(v));
  const contentTransform = useTransform(scrollYProgress, (v) => `translateY(${(-40 * after20(v)).toFixed(2)}px)`);
  const mediaOpacity = useTransform(scrollYProgress, (v) => 1 - 0.4 * after20(v));

  // Texto: ≤ 30 palabras en total (eyebrow 4 + titular 6 + frase 12 + CTA 4 + confianza 4).
  const eyebrow = clampWords(hero.eyebrow || brand.tagline, LIMITS.eyebrow, "eyebrow");
  const subtitle = clampWords(hero.subtitle, LIMITS.subtitle, "subtitle");
  // Contrato (CONTRATOS-HUECOS): titular 2–6 palabras, CTA 1–2 (suma ≤ 30 sobre el vídeo); aquí sólo se avisa (no se recorta un titular).
  React.useEffect(() => {
    warnWords(`${hero.titlePrefix} ${hero.titleHighlight} ${hero.titleSuffix ?? ""}`, 2, 6, "hero.title");
    warnWords(hero.ctaPrimary, 1, 2, "hero.ctaPrimary");
    warnWords(hero.ctaSecondary, 1, 2, "hero.ctaSecondary");
  }, [hero.titlePrefix, hero.titleHighlight, hero.titleSuffix, hero.ctaPrimary, hero.ctaSecondary]);
  const rated = testimonials.filter((t) => typeof t.rating === "number");
  const avg = rated.length ? rated.reduce((a, t) => a + (t.rating ?? 0), 0) / rated.length : 0;

  const enter = (i: number) => ({
    initial: { opacity: 0, transform: reduced ? "none" : "translateY(8px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.45, ease: EASE, delay: 0.05 + i * STAGGER },
  });
  const ink = centered; // T-B: en peluquería el texto va en --text del modo sobre el vídeo disuelto en --surface
  const shadow = ink ? undefined : { textShadow: "0 1px 2px rgba(0,0,0,0.28), 0 6px 28px rgba(0,0,0,0.28)" };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className={centered ? "hero-v6-box relative overflow-hidden bg-[color:var(--surface,#111)] text-foreground" : "hero-v6-box relative overflow-hidden bg-[color:var(--brand-surface-dark,#111)] text-on-media"} /* R7 (precisada 2026-09-19): caja 100lvh (respaldo 100vh) en index.css; el bloque va a 100svh; nunca dvh; nada la tapa. T-B: en peluquería el fondo es --surface del modo y el texto --text */
    >
      <motion.div className="absolute inset-0" style={reduced ? undefined : { opacity: mediaOpacity }} aria-hidden="true">
        <HeroMedia reduced={reduced} isRtl={isRtl} centered={centered} />
      </motion.div>

      {/* Bloque: abajo-inicio en móvil, centro-inicio en escritorio; D14 (peluquería): centrado y abajo en 375 y 1280 */}
      <motion.div
        className={centered ? "hero-v6-block relative flex flex-col justify-end" : "hero-v6-block relative flex flex-col justify-end lg:justify-center"}
        style={reduced ? undefined : { opacity: contentOpacity, transform: contentTransform }}
      >
        {/* pb 9rem en móvil: deja libre la columna de inicio (WhatsApp 72–120 px + a11y 16–60 px) */}
        {/* D14-bis (2026-09-19): margen inferior del bloque por token --hero-block-pb / --hero-block-pb-lg (3 o 5 rem, Liam elige con captura); el texto centrado no coincide con la columna de FAB/a11y */}
        <div className={centered ? "mx-auto w-full max-w-6xl px-5 pb-[calc(var(--hero-block-pb,5rem)+env(safe-area-inset-bottom))] pt-28 text-center lg:px-10 lg:pb-[var(--hero-block-pb-lg,5rem)]" : "mx-auto w-full max-w-6xl px-5 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-28 lg:px-10 lg:pb-16"}>
          <div className={centered ? "mx-auto max-w-md lg:max-w-2xl" : "max-w-md lg:max-w-xl"}>
            {eyebrow && (
              <motion.p {...enter(0)} className={ink ? "mb-3 text-[13px] font-medium tracking-wide text-foreground/75" : "mb-3 text-[13px] font-medium tracking-wide text-on-media/75"} style={shadow}>
                {eyebrow}
              </motion.p>
            )}
            <motion.h1 {...enter(1)} className="text-[2.5rem] leading-[1.05] sm:text-5xl lg:text-6xl" style={shadow}>
              <span className="font-light">{hero.titlePrefix} </span>
              <span className={ink ? "font-medium text-[color:var(--highlight,currentColor)]" : "font-medium text-[color:var(--highlight-on-dark,currentColor)]"}>{hero.titleHighlight}</span>
              {hero.titleSuffix && <span className="block font-light">{hero.titleSuffix}</span>}
            </motion.h1>
            {subtitle && (
              <motion.p {...enter(2)} className={ink ? "mt-4 text-[15px] leading-relaxed text-foreground/85 sm:text-base" : "mt-4 text-[15px] leading-relaxed text-on-media/85 sm:text-base"} style={shadow}>
                {subtitle}
              </motion.p>
            )}

            {/* CTA: un solo relleno de acento; el segundo es texto */}
            <motion.div {...enter(3)} className={centered ? "mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3" : "mt-6 flex flex-wrap items-center gap-x-5 gap-y-3"}>
              <button
                type="button"
                onClick={() => onBookClick()}
                className="inline-flex h-12 items-center rounded-[var(--radius-ui,0px)] bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-on-media/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {hero.ctaPrimary}
              </button>
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ink ? "inline-flex min-h-11 items-center gap-1.5 border-b border-foreground/45 text-[15px] font-medium text-foreground transition-colors duration-150 hover:border-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/70" : "inline-flex min-h-11 items-center gap-1.5 border-b border-on-media/45 text-[15px] font-medium text-on-media transition-colors duration-150 hover:border-on-media focus:outline-none focus-visible:ring-2 focus-visible:ring-on-media/70"}
                  style={shadow}
                >
                  {hero.ctaSecondary}
                  <Arrow size={16} aria-hidden="true" />
                </a>
              )}
            </motion.div>

            {/* Una sola línea de confianza */}
            {rated.length > 0 && (
              <motion.p {...enter(4)} className={centered ? (ink ? "mt-5 flex items-center justify-center gap-1.5 text-sm text-foreground/85" : "mt-5 flex items-center justify-center gap-1.5 text-sm text-on-media/85") : "mt-5 flex items-center gap-1.5 text-sm text-on-media/85"} style={shadow} aria-label={localeConfig.hero.trustRow}>
                <Star size={14} className="fill-current" aria-hidden="true" />
                <span className="font-semibold tabular-nums">{avg.toFixed(1)}</span>
                <span className={ink ? "text-foreground/60" : "text-on-media/60"} aria-hidden="true">·</span>
                <span>{interpolate(localeConfig.hero.reviewsCount, { count: rated.length })}</span>
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
