import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowRight, Calendar } from "lucide-react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { HeroObject3D } from "../3d-impact/hero-object-3d";
import { AmbientParticles } from "../3d-impact/ambient-particles";
import { SPLASH_HERO_LAYOUT_ID } from "../3d-impact/splash-impact-reveal-3d";
import { getTypographyCssVars } from "../../lib/typography";
import { TitleWithItalic, type TitlePart } from "./hero/title-with-italic";
import {
  FloatingCards,
  type AvailabilityCardConfig,
  type TrustCardConfig,
} from "./hero/floating-cards";
import { HeroStatsBar, type HeroStat } from "./hero/stats-bar";

type Props = {
  onBookClick: () => void;
};

/**
 * `<HeroVariant3DObject>` — the Velvet Muse–style editorial Hero.
 *
 * Layout (desktop ≥ lg): copy column (42%) on the left with eyebrow, title,
 * subtitle, CTAs and two floating cards (availability + trust). Composition
 * column (58%) on the right with the HeroObject3D wrapped in an outer
 * parallax + mouse-tilt + ambient-float container. A stats strip is pinned
 * to the bottom of the hero with rose-gold icons + 4 quick "why us" cells.
 *
 * Mobile (< lg): composition stacks above the copy, floating cards drop
 * inline under the CTAs, stats bar wraps to 2 columns.
 *
 * Activated by `siteConfig.hero.heroVariant === "hero-3d-object"`.
 * Every textual decision falls back gracefully to the legacy `hero.*`
 * shape so existing clients continue to work unchanged. Editorial-only
 * tokens (titleParts, availabilityCard, trustCard, statsBar) are opt-in
 * via Firestore overlay. See `docs/HERO_TOKENS.md` for the full reference.
 */
export function HeroVariant3DObject({ onBookClick }: Props) {
  const { hero } = siteConfig;
  const prefersReduced = useReducedMotion();

  const splashVariant = siteConfig.splash?.variant;
  const sharedLayoutId =
    splashVariant === "impact-reveal-3d" ? SPLASH_HERO_LAYOUT_ID : undefined;

  const particles = siteConfig.heroObjects?.primary?.particles;
  const globalParticles = siteConfig.globalAmbientParticles?.type;

  const showBookingCta =
    siteConfig.features.showBooking || siteConfig.features.showInquiry;
  const primaryLabel = hero.ctaPrimary ?? localeConfig.hero.scrollHint;
  const secondaryLabel = hero.ctaSecondary;

  // ── Resolve title with editorial fallbacks. The new schema lets the
  // owner pass an array of parts (regular vs italic+accent+underline);
  // legacy clients still use the prefix/highlight/suffix triple, which
  // we re-shape into the same structure so the rest of the render path
  // doesn't have to branch.
  const titleParts: TitlePart[] = useMemo(() => {
    if (hero.titleParts && hero.titleParts.length > 0) {
      return hero.titleParts;
    }
    const parts: TitlePart[] = [];
    if (hero.titlePrefix) parts.push({ text: hero.titlePrefix.trim() });
    if (hero.titleHighlight) {
      parts.push({
        text: " " + hero.titleHighlight.trim() + " ",
        italic: true,
        color: "var(--vm-accent, #8b3a4b)",
        underline: true,
      });
    }
    if (hero.titleSuffix) parts.push({ text: hero.titleSuffix.trim() });
    return parts;
  }, [hero.titleParts, hero.titlePrefix, hero.titleHighlight, hero.titleSuffix]);

  const eyebrow = hero.eyebrow ?? "Full-Service Salon";

  const availabilityConfig: AvailabilityCardConfig | false = useMemo(() => {
    const cfg = hero.availabilityCard;
    if (cfg?.enabled === false) return false;
    const fallbackAddress = {
      name: siteConfig.brand?.name,
      street: siteConfig.contact?.address?.street,
      cityZip: siteConfig.contact?.address?.cityStateZip,
    };
    return {
      title: cfg?.title,
      slots: cfg?.slots,
      address: cfg?.address ?? fallbackAddress,
      thumbnailSrc: cfg?.thumbnailSrc,
      footerLabel: cfg?.footerLabel,
      footerHref: cfg?.footerHref,
    };
  }, [hero.availabilityCard]);

  const trustConfig: TrustCardConfig | false = useMemo(() => {
    const cfg = hero.trustCard;
    if (cfg?.enabled === false) return false;
    return {
      rating: cfg?.rating,
      text: cfg?.text,
      avatars: cfg?.avatars,
    };
  }, [hero.trustCard]);

  const statsBarItems: HeroStat[] | undefined = useMemo(() => {
    const cfg = hero.statsBar;
    if (cfg?.enabled === false) return undefined;
    if (cfg?.items && cfg.items.length > 0) return cfg.items;
    return undefined;
  }, [hero.statsBar]);

  const statsBarEnabled = hero.statsBar?.enabled !== false;

  // ── Background tokens. Cream-to-blush is the Velvet Muse default; can be
  // overridden via `hero.bg.*` per client.
  const bgGradient = hero.bg?.gradient
    ?? "linear-gradient(180deg, #fff5ec 0%, #f7f0ea 60%, #f7e8e0 100%)";
  const glowColor = hero.bg?.glowColor ?? "#fff8ef";
  const silkOpacity = hero.bg?.silkTextureOpacity ?? 0.04;

  // ── Outer mouse-tilt + scroll parallax for the composition container.
  // This is independent from HeroObject3D's own inner tilt: the inner one
  // reacts to pointer events inside the object's box, this outer one
  // reacts to the whole hero so the parallax reads across the entire
  // illustration area.
  const compRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smoothX = useSpring(mx, { stiffness: 120, damping: 22, mass: 0.5 });
  const smoothY = useSpring(my, { stiffness: 120, damping: 22, mass: 0.5 });
  const tiltY = useTransform(smoothX, [-1, 1], [-8, 8]);
  const tiltX = useTransform(smoothY, [-1, 1], [4, -4]);

  const { scrollY } = useScroll();
  const compY = useTransform(scrollY, [0, 600], [0, -60]);

  useEffect(() => {
    if (prefersReduced) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mx.set((e.clientX / w) * 2 - 1);
      my.set((e.clientY / h) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [prefersReduced, mx, my]);

  // CSS variables expose typography + accent to descendant subcomponents
  // (TitleWithItalic, FloatingCards, HeroStatsBar) without prop drilling.
  const typographyVars = getTypographyCssVars(localeConfig.lang);
  const cssVars: CSSProperties = {
    ...typographyVars,
    ["--vm-accent" as string]: hero.theme?.accent ?? "#8b3a4b",
    ["--vm-accent-light" as string]: hero.theme?.accentLight ?? "#c9a37a",
    ["--vm-surface" as string]: hero.theme?.surface ?? "#fdf6ec",
    ["--vm-ink" as string]: hero.theme?.ink ?? "#3b1820",
  };

  return (
    <section
      id="hero"
      className="velvet-hero relative isolate w-full overflow-hidden"
      style={{ ...cssVars, background: bgGradient }}
    >
      {/* Local keyframes — inlined so removing the variant unmounts the rules too. */}
      <style>{HERO_LOCAL_CSS}</style>

      {/* Radial champagne glow centred behind the composition. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[55%] top-[35%] -z-10 h-[900px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(circle, " + glowColor + " 0%, transparent 70%)",
        }}
      />

      {/* Silk noise texture — mix-blend-multiply for soft tooth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mix-blend-multiply"
        style={{
          opacity: silkOpacity,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8," +
            encodeURIComponent(
              "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(#n)' opacity='0.6'/></svg>",
            ) +
            "\")",
        }}
      />

      {/* Ambient pearls along the lateral margins (when configured). */}
      {globalParticles && globalParticles !== "none" && (
        <div className="pointer-events-none absolute inset-0 -z-10">
          <AmbientParticles type={globalParticles} density="low" />
        </div>
      )}

      <div className="mx-auto w-full max-w-[1320px] px-6 pb-[160px] pt-[120px] md:px-10 md:pt-[140px] lg:pb-[200px] lg:pt-[160px]">
        <div className="relative grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] lg:gap-10 xl:gap-16">
          {/* ── Copy column ─────────────────────────────────────────── */}
          <div className="relative order-2 flex flex-col items-start text-left lg:order-1 lg:pt-12">
            {/* Eyebrow with flourish divider */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mb-8 flex items-center gap-3"
            >
              <span
                className="text-[12px] font-medium uppercase tracking-[0.32em]"
                style={{ color: "var(--vm-accent)" }}
              >
                {eyebrow}
              </span>
              <EyebrowFlourish prefersReduced={!!prefersReduced} />
            </motion.div>

            {/* Title with italic word + handwriting underline */}
            <TitleWithItalic
              parts={titleParts}
              className="mb-7 max-w-[14ch]"
              maxFontSize={96}
              minFontSize={42}
            />

            {/* Body copy */}
            {hero.subtitle && (
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.6 }}
                className="mb-10 max-w-[480px] text-[16px] leading-[1.5] md:text-[17px]"
                style={{
                  fontFamily: "var(--font-sans-hero)",
                  color: "#5e4a52",
                }}
              >
                {hero.subtitle}
              </motion.p>
            )}

            {/* CTAs */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.75 }}
              className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
            >
              {showBookingCta && primaryLabel && (
                <PrimaryCta
                  label={hero.ctaPrimaryLabel ?? primaryLabel ?? "Book a consultation"}
                  href={hero.ctaPrimaryHref}
                  onClick={onBookClick}
                />
              )}
              {secondaryLabel && (
                <SecondaryCta
                  label={secondaryLabel}
                  href={hero.ctaSecondaryHref ?? "#services"}
                />
              )}
            </motion.div>

            {/* ── Floating cards (anchored on desktop, inline on mobile) ── */}
            <div className="relative mt-12 hidden h-[260px] w-full lg:block">
              <FloatingCards
                availability={availabilityConfig}
                trust={trustConfig}
                availabilityClassName="absolute left-0 top-0"
                trustClassName="absolute left-[210px] top-[150px]"
              />
            </div>

            <div className="mt-10 flex w-full flex-col items-center gap-4 lg:hidden">
              <FloatingCards
                availability={availabilityConfig}
                trust={trustConfig}
              />
            </div>
          </div>

          {/* ── Composition column ─────────────────────────────────── */}
          <motion.div
            ref={compRef}
            className="relative order-1 mx-auto flex w-full max-w-[720px] items-center justify-center lg:order-2 lg:max-w-none lg:justify-end"
            style={{
              perspective: prefersReduced ? undefined : "1400px",
              y: prefersReduced ? undefined : compY,
            }}
          >
            <motion.div
              className="velvet-float relative h-[420px] w-full sm:h-[520px] lg:h-[640px] xl:h-[720px]"
              style={{
                rotateX: prefersReduced ? 0 : tiltX,
                rotateY: prefersReduced ? 0 : tiltY,
                transformStyle: "preserve-3d",
              }}
            >
              {particles && particles !== "none" && (
                <div className="pointer-events-none absolute inset-0 -z-10">
                  <AmbientParticles type={particles} density="medium" />
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center">
                <HeroObject3D
                  slotName="primary"
                  priority
                  size="xl"
                  alt={hero.titleHighlight || hero.titlePrefix || ""}
                  layoutId={sharedLayoutId}
                  className="!h-full !w-full"
                  fallback={
                    <div
                      aria-hidden
                      className="h-72 w-72 rounded-3xl bg-white/30 sm:h-96 sm:w-96"
                    />
                  }
                />
              </div>

              {/* Pink ribbon decoration — opt-in via hero.composition.ribbonSrc.
                  TODO: when the parallel BRIA pipeline finishes, point this at
                  the `decoration-ribbon-pink` slot URL from the output JSON. */}
              {hero.composition?.ribbonSrc && (
                <img
                  src={hero.composition.ribbonSrc}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-4 h-32 w-32 select-none object-contain opacity-80 mix-blend-multiply"
                  loading="eager" fetchPriority="high" decoding="async"
                />
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Stats bar pinned at the bottom of the hero ── */}
      {statsBarEnabled && (
        <div className="absolute inset-x-0 bottom-6 z-10 px-6 md:bottom-10 md:px-10">
          <div className="mx-auto w-full max-w-[1280px]">
            <HeroStatsBar items={statsBarItems} />
          </div>
        </div>
      )}
    </section>
  );
}

/** Small flourish next to the eyebrow — star + hairline that draws in on load. */
function EyebrowFlourish({ prefersReduced }: { prefersReduced: boolean }) {
  return (
    <svg
      width={68}
      height={14}
      viewBox="0 0 68 14"
      aria-hidden
      style={{ color: "var(--vm-accent)" }}
    >
      <path
        d="M 6 7 L 8 5 L 6 3 L 4 5 Z M 6 7 L 8 9 L 6 11 L 4 9 Z"
        fill="currentColor"
        opacity={0.9}
      />
      <motion.path
        d="M 14 7 L 64 7"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        initial={prefersReduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
      <circle cx={64} cy={7} r={1.2} fill="currentColor" />
    </svg>
  );
}

function PrimaryCta({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick: () => void;
}) {
  const cls =
    "vm-cta-primary group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-[13px] font-medium tracking-wide transition-all duration-300";
  const style: CSSProperties = {
    background: "var(--vm-accent)",
    color: "#fff7f0",
    boxShadow: "0 12px 30px -12px rgba(139,58,75,0.6)",
    fontFamily: "var(--font-sans-hero)",
  };
  const inner = (
    <>
      <Calendar size={15} aria-hidden className="shrink-0" />
      <span className="truncate">{label}</span>
    </>
  );
  return href ? (
    <a href={href} className={cls} style={style}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {inner}
    </button>
  );
}

function SecondaryCta({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="vm-cta-secondary group inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3 text-[13px] font-medium tracking-wide transition-all duration-300"
      style={{
        borderColor: "var(--vm-accent)",
        color: "var(--vm-accent)",
        background: "rgba(255,255,255,0.4)",
        fontFamily: "var(--font-sans-hero)",
      }}
    >
      <span className="truncate">{label}</span>
      <ArrowRight
        size={15}
        aria-hidden
        className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
      />
    </a>
  );
}

/**
 * Local keyframes for the Velvet Muse hero. Inlined so the variant is
 * self-contained — turn it off and the rules unmount with it.
 *
 *   • velvet-float — slow ambient drift of the composition wrapper.
 *   • vm-bob-a / vm-bob-b — the two floating cards bob at different
 *     phases so they never sync up.
 *   • vm-cta-primary/secondary hover states.
 */
const HERO_LOCAL_CSS = `
@keyframes velvet-float-key {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}
.velvet-float {
  animation: velvet-float-key 6.5s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .velvet-float { animation: none; }
}

@keyframes vm-bob-a-key {
  0% { transform: translateY(0px); }
  50% { transform: translateY(calc(var(--vm-bob-amp, 3px) * -1)); }
  100% { transform: translateY(0px); }
}
@keyframes vm-bob-b-key {
  0% { transform: translateY(0px); }
  50% { transform: translateY(var(--vm-bob-amp, 3px)); }
  100% { transform: translateY(0px); }
}
.vm-bob-a { animation: vm-bob-a-key 4.2s ease-in-out infinite; }
.vm-bob-b { animation: vm-bob-b-key 4.6s ease-in-out 1.3s infinite; }
@media (prefers-reduced-motion: reduce) {
  .vm-bob-a, .vm-bob-b { animation: none; }
}

.vm-cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 40px -16px rgba(139,58,75,0.7);
  filter: brightness(1.04);
}
.vm-cta-secondary:hover {
  background: var(--vm-accent);
  color: #fff7f0;
}
`;
