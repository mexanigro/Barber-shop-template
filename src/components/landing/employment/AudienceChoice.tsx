/**
 * AudienceChoice.tsx
 *
 * Full-viewport dual-audience choice screen for the Lekt Grigori
 * employment niche. The visitor picks whether they're looking for
 * work (worker) or looking for workers (business). The choice is
 * persisted in localStorage and the user is routed to the matching
 * landing. Subsequent visits bypass this screen via auto-redirect.
 *
 * Aesthetic register: brand. Dark, restrained palette anchored on
 * cyan/teal — the surface IS the brand. No card grids, no glass,
 * no gradient text. Split-pane reveal driven by hover (desktop) and
 * tap (mobile). RTL-aware throughout.
 */

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Briefcase, Building2, HardHat } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { setAudience, type EmploymentAudience } from "../../../lib/employment-audience";
import { LanguageSwitcher } from "../../ui/LanguageSwitcher";
import { ThemeToggle } from "../../theme/ThemeToggle";

// ─── Easing — Emil Kowalski strong ease-out + drawer curve ────────────────────

const EASE = [0.23, 1, 0.32, 1] as const;
const SLOW = [0.32, 0.72, 0, 1] as const;

// ─── i18n shim — pulls the audienceChoice block from any of the 4 locales ────

type ChoiceLocale = {
  eyebrow: string;
  brandLine: string;
  switchHint: string;
  worker: {
    label: string;
    headline: string;
    sub: string;
    cta: string;
  };
  business: {
    label: string;
    headline: string;
    sub: string;
    cta: string;
  };
};

function getChoiceLocale(): ChoiceLocale {
  // The block is added to every locale file under `employment.audienceChoice`.
  // Cast through unknown so the TS narrowing across the 4 locale unions
  // doesn't require an exhaustive shared type.
  const root = localeConfig as unknown as {
    employment?: { audienceChoice?: ChoiceLocale };
  };
  return (
    root.employment?.audienceChoice ?? {
      eyebrow: "Choose your path",
      brandLine: siteConfig.brand?.name ?? "",
      switchHint: "You can switch any time",
      worker: {
        label: "Worker",
        headline: "I'm looking for work",
        sub: "Find a job that fits — register in 60 seconds.",
        cta: "Find work",
      },
      business: {
        label: "Business",
        headline: "I'm looking for workers",
        sub: "Hire verified people, fast. Tell us what you need.",
        cta: "Hire workers",
      },
    }
  );
}

// ─── Panel artwork ───────────────────────────────────────────────────────────
// Two carefully chosen, on-brand photographs. They are loaded eagerly because
// the entire screen IS these two images — there is no "below the fold".

const WORKER_IMG =
  "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1600&q=82&auto=format&fit=crop";
const BUSINESS_IMG =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=82&auto=format&fit=crop";

// ─── Tint pair — cyan for workers (warm/active), indigo for business (cool/strategic) ───

const TINT = {
  worker: {
    accent: "#22D3EE",
    accentDeep: "#0891B2",
    glow: "rgba(34,211,238,0.55)",
    glowSoft: "rgba(8,145,178,0.32)",
    label: "rgba(34,211,238,0.92)",
    overlay:
      "linear-gradient(135deg, rgba(6,32,46,0.78) 0%, rgba(8,145,178,0.42) 55%, rgba(6,32,46,0.62) 100%)",
  },
  business: {
    accent: "#A5B4FC",
    accentDeep: "#4F46E5",
    glow: "rgba(165,180,252,0.45)",
    glowSoft: "rgba(79,70,229,0.28)",
    label: "rgba(165,180,252,0.92)",
    overlay:
      "linear-gradient(135deg, rgba(8,12,30,0.78) 0%, rgba(79,70,229,0.38) 55%, rgba(8,12,30,0.62) 100%)",
  },
} as const;

// ─── Single panel ────────────────────────────────────────────────────────────

interface PanelProps {
  audience: EmploymentAudience;
  hovered: boolean;
  otherHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onChoose: () => void;
  copy: ChoiceLocale["worker"] | ChoiceLocale["business"];
  imageSrc: string;
  iconA: React.ReactNode;
  iconB: React.ReactNode;
  rtl: boolean;
  index: 0 | 1;
}

function Panel({
  audience,
  hovered,
  otherHovered,
  onHover,
  onLeave,
  onChoose,
  copy,
  imageSrc,
  iconA,
  iconB,
  rtl,
  index,
}: PanelProps) {
  const tint = TINT[audience];
  const dimmed = otherHovered && !hovered;
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onChoose}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      aria-label={copy.headline}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.7,
        delay: 0.15 + index * 0.08,
        ease: EASE,
      }}
      className="group relative flex w-full flex-1 cursor-pointer items-stretch overflow-hidden text-start outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:basis-1/2"
      style={{
        // Layout weight shifts on hover. Wrapped in motion below for smoothness.
        // Base lg basis is set via Tailwind; we override via inline flex on hover.
      }}
    >
      {/* ── Background image with kenburns-style scale on hover ─────────── */}
      <motion.div
        className="absolute inset-0"
        animate={
          reduce
            ? {}
            : {
                scale: hovered ? 1.06 : dimmed ? 1.0 : 1.02,
              }
        }
        transition={{ duration: 0.9, ease: SLOW }}
      >
        <img
          src={imageSrc}
          alt=""
          role="presentation"
          loading="eager"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center"
          style={{
            filter: dimmed ? "saturate(0.6) brightness(0.62)" : "saturate(1) brightness(1)",
            transition: "filter 0.55s cubic-bezier(0.23,1,0.32,1)",
          }}
        />
        {/* Tint overlay — coloured wash carrying brand. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: tint.overlay }}
        />
        {/* Subtle vignette so type stays legible at the centre. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.45) 95%)",
          }}
        />
      </motion.div>

      {/* ── Accent glow that bleeds in from the outer edge ─────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-[55%]"
        style={{
          [index === 0 ? "left" : "right"]: 0,
          background: `radial-gradient(ellipse 70% 100% at ${
            index === 0 ? "0%" : "100%"
          } 50%, ${tint.glow} 0%, ${tint.glowSoft} 35%, transparent 70%)`,
          mixBlendMode: "screen",
        }}
        animate={{ opacity: hovered ? 0.9 : 0.5 }}
        transition={{ duration: 0.45, ease: EASE }}
      />

      {/* ── Hairline divider between the two panels ─────────────────────── */}
      <div
        aria-hidden
        className={[
          "absolute z-10 bg-white/10",
          // mobile: horizontal split → divider is horizontal at the bottom
          // desktop: vertical split → divider is vertical at the inner edge
          index === 0
            ? "inset-x-0 bottom-0 h-px lg:bottom-auto lg:inset-y-0 lg:end-0 lg:h-auto lg:w-px"
            : "inset-x-0 top-0 h-px lg:top-auto lg:inset-y-0 lg:start-0 lg:h-auto lg:w-px",
        ].join(" ")}
      />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div
        className={[
          "relative z-20 flex w-full flex-col justify-between gap-8 px-7 py-12",
          "sm:px-10 sm:py-16 lg:p-16 xl:px-20 xl:py-24",
          "items-start text-start",
        ].join(" ")}
      >
        {/* Top: icon pair + label */}
        <div className="flex w-full items-center justify-between gap-3">
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md sm:h-14 sm:w-14"
            style={{
              borderColor: `${tint.accent}66`,
              background: `${tint.accentDeep}22`,
              color: tint.accent,
            }}
            animate={
              reduce
                ? {}
                : {
                    y: hovered ? -3 : 0,
                    boxShadow: hovered
                      ? `0 18px 48px -16px ${tint.glow}`
                      : `0 8px 24px -12px ${tint.glow}`,
                  }
            }
            transition={{ duration: 0.4, ease: EASE }}
          >
            {iconA}
          </motion.div>
          <span
            className="rounded-full border px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.22em] sm:text-[11px]"
            style={{
              borderColor: `${tint.accent}55`,
              background: "rgba(0,0,0,0.32)",
              color: tint.label,
            }}
          >
            {copy.label}
          </span>
        </div>

        {/* Middle: headline + sub. Headline kept extrabold-condensed feel. */}
        <div className="flex w-full max-w-xl flex-col gap-4 sm:gap-5">
          <motion.h2
            animate={
              reduce
                ? {}
                : {
                    y: hovered ? -4 : 0,
                  }
            }
            transition={{ duration: 0.45, ease: EASE }}
            className="font-serif text-[clamp(2.1rem,5.5vw,4rem)] font-black leading-[1.02] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
          >
            {copy.headline}
          </motion.h2>
          <p
            className="font-sans text-[15px] leading-relaxed text-white/82 sm:text-base md:text-lg"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {copy.sub}
          </p>
        </div>

        {/* Bottom: CTA chip with travel arrow. */}
        <motion.div
          className="mt-auto flex items-center gap-3"
          animate={
            reduce
              ? {}
              : {
                  x: hovered ? (rtl ? -6 : 6) : 0,
                }
          }
          transition={{ duration: 0.45, ease: EASE }}
        >
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14"
            style={{
              background: tint.accent,
              color: "#020617",
              boxShadow: `0 14px 44px -12px ${tint.glow}`,
            }}
          >
            {/* Arrow points outward — to the inactive side first, then user clicks it back. RTL flipped automatically. */}
            <ArrowLeft
              size={20}
              strokeWidth={2.4}
              className={rtl ? "" : "rotate-180"}
              aria-hidden
            />
          </span>
          <span className="font-sans text-base font-bold tracking-wide text-white sm:text-lg">
            {copy.cta}
          </span>
          <span aria-hidden className="hidden sm:inline-block">
            {iconB}
          </span>
        </motion.div>
      </div>
    </motion.button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface AudienceChoiceProps {
  onSelect: (audience: EmploymentAudience) => void;
}

export function AudienceChoice({ onSelect }: AudienceChoiceProps) {
  const copy = getChoiceLocale();
  const rtl = localeConfig.dir === "rtl";
  const [hovered, setHovered] = React.useState<EmploymentAudience | null>(null);
  const [chosen, setChosen] = React.useState<EmploymentAudience | null>(null);
  const reduce = useReducedMotion();

  const handleChoose = (audience: EmploymentAudience) => {
    if (chosen) return; // prevent double-fire while exit anim plays
    setAudience(audience);
    setChosen(audience);
    // Brief consume animation, then route. ~320 ms feels intentional but never
    // gets in the way: under the 300 ms ceiling for repeat use, but this is a
    // first-visit, one-time interaction so we allow slightly longer.
    const delay = reduce ? 0 : 340;
    window.setTimeout(() => onSelect(audience), delay);
  };

  return (
    <div
      className="relative isolate flex min-h-dvh w-full flex-col overflow-hidden text-white"
      style={{
        background: "#040813",
      }}
    >
      {/* ── Ambient back layer: subtle noise + radial pull from centre ───── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 30%, rgba(8,145,178,0.18) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 50% 80%, rgba(79,70,229,0.16) 0%, transparent 55%)",
        }}
      />

      {/* ── Header band: brand mark + eyebrow ───────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
        className="relative z-30 flex items-center justify-between gap-4 px-6 pt-6 pb-6 sm:px-10 sm:pt-9 sm:pb-8 lg:px-14 lg:pt-11 lg:pb-10"
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] backdrop-blur-md"
            style={{ color: "#22D3EE" }}
          >
            <Briefcase size={16} strokeWidth={2.2} />
          </span>
          <span className="font-sans text-sm font-semibold tracking-tight text-white/90 sm:text-base">
            {copy.brandLine}
          </span>
        </div>

        {/* ── Controls: theme toggle + language switcher ──────────────── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="[&_button]:border-white/15 [&_button]:bg-white/[0.06] [&_button]:text-white/80 [&_button]:shadow-none [&_button]:backdrop-blur-md [&_button]:hover:text-white [&_button]:hover:bg-white/[0.12]">
            <ThemeToggle />
          </div>
          <LanguageSwitcher variant="light" align="end" />
        </div>
      </motion.header>

      {/* ── Split panels ─────────────────────────────────────────────────── */}
      {/* Layout: stacked on mobile, side-by-side on desktop. Hover changes
          basis on lg+ for a 55/45 weight shift. */}
      <div className="relative z-10 flex flex-1 flex-col lg:flex-row">
        <motion.div
          className="flex flex-1 lg:flex-none"
          animate={{
            flexBasis: !hovered ? "50%" : hovered === "worker" ? "55%" : "45%",
          }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{ minHeight: "44dvh" }}
        >
          <Panel
            audience="worker"
            hovered={hovered === "worker"}
            otherHovered={hovered === "business"}
            onHover={() => setHovered("worker")}
            onLeave={() => setHovered((h) => (h === "worker" ? null : h))}
            onChoose={() => handleChoose("worker")}
            copy={copy.worker}
            imageSrc={WORKER_IMG}
            iconA={<HardHat size={22} strokeWidth={2.2} />}
            iconB={
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                01
              </span>
            }
            rtl={rtl}
            index={0}
          />
        </motion.div>

        <motion.div
          className="flex flex-1 lg:flex-none"
          animate={{
            flexBasis: !hovered ? "50%" : hovered === "business" ? "55%" : "45%",
          }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{ minHeight: "44dvh" }}
        >
          <Panel
            audience="business"
            hovered={hovered === "business"}
            otherHovered={hovered === "worker"}
            onHover={() => setHovered("business")}
            onLeave={() => setHovered((h) => (h === "business" ? null : h))}
            onChoose={() => handleChoose("business")}
            copy={copy.business}
            imageSrc={BUSINESS_IMG}
            iconA={<Building2 size={22} strokeWidth={2.2} />}
            iconB={
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                02
              </span>
            }
            rtl={rtl}
            index={1}
          />
        </motion.div>
      </div>

      {/* ── Foot hint ────────────────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
        className="relative z-30 flex items-center justify-center gap-2 px-6 pb-6 sm:pb-8"
      >
        <span
          aria-hidden
          className="inline-block h-1 w-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.4)" }}
        />
        <span className="font-sans text-[11px] font-medium tracking-wide text-white/55 sm:text-xs">
          {copy.switchHint}
        </span>
      </motion.footer>

      {/* ── Choice consume overlay ───────────────────────────────────────── */}
      {/* When the user picks, the chosen side floods the viewport with its
          brand colour from the edge, then dissolves. Provides confident
          spatial continuity to the destination route. */}
      {chosen && (
        <motion.div
          aria-hidden
          initial={{ clipPath: `inset(0 ${chosen === "worker" ? "100%" : "0"} 0 ${chosen === "worker" ? "0" : "100%"})` }}
          animate={{ clipPath: "inset(0 0 0 0)" }}
          transition={{ duration: 0.34, ease: EASE }}
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            background:
              chosen === "worker"
                ? "linear-gradient(120deg, rgba(8,145,178,0.95) 0%, rgba(34,211,238,0.85) 100%)"
                : "linear-gradient(120deg, rgba(79,70,229,0.95) 0%, rgba(165,180,252,0.85) 100%)",
          }}
        />
      )}
    </div>
  );
}

export default AudienceChoice;
