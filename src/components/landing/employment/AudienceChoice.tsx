/**
 * AudienceChoice.tsx
 *
 * Full-viewport dual-audience choice screen for the Lekt Grigori
 * employment niche. The visitor picks whether they're looking for
 * work (worker) or looking for workers (business). The choice is
 * persisted in localStorage and the user is routed to the matching
 * landing. The screen waits indefinitely for user input.
 *
 * Aesthetic register: brand. Dark, restrained palette anchored on
 * cyan/teal — the surface IS the brand. No card grids, no glass,
 * no gradient text. Split-pane reveal driven by hover (desktop) and
 * tap (mobile). RTL-aware throughout.
 */

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Briefcase, Building2, HardHat, Moon, Sun } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { setAudience, type EmploymentAudience } from "../../../lib/employment-audience";
import { LanguageSwitcher } from "../../ui/LanguageSwitcher";
import { useTheme } from "../../theme/ThemeProvider";

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
      className="group relative flex h-full w-full cursor-pointer items-stretch overflow-hidden text-start outline-none focus-visible:ring-2 focus-visible:ring-white/60"
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
          className="h-full w-full object-cover"
          style={{
            // Bias the crop toward the subject zone of each photo so faces /
            // hands / tools stay framed even when the panel is short.
            objectPosition: audience === "worker" ? "50% 38%" : "50% 42%",
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

      {/* ── Content ──────────────────────────────────────────────────────────
          Three-row grid pinned to the panel: header / story / cta. Using a
          grid (not justify-between) guarantees the bottom CTA sits on a fixed
          baseline in every panel — so side-by-side on desktop the two buttons
          land on the exact same Y, and stacked on mobile they hug the bottom
          of each half identically. min-h-0 lets the middle row shrink instead
          of forcing the container past 100vh. ────────────────────────────── */}
      <div
        className={[
          "relative z-20 grid h-full w-full",
          // Header — Middle (shrinks) — CTA
          "grid-rows-[auto_minmax(0,1fr)_auto]",
          "px-6 py-5 sm:px-9 sm:py-7 lg:px-12 lg:py-10 xl:px-16 xl:py-14",
          "gap-y-4 sm:gap-y-6 lg:gap-y-8",
          "items-start text-start",
        ].join(" ")}
      >
        {/* Top: icon + label badge */}
        <div className="flex w-full items-start justify-between gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-2xl border backdrop-blur-md sm:h-12 sm:w-12 lg:h-14 lg:w-14"
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
            className="rounded-full border px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.22em] sm:px-3 sm:text-[11px]"
            style={{
              borderColor: `${tint.accent}55`,
              background: "rgba(0,0,0,0.32)",
              color: tint.label,
            }}
          >
            {copy.label}
          </span>
        </div>

        {/* Middle: headline + sub. Lives in the 1fr row and is allowed to
            overflow-hidden if a translation ever runs unusually long. */}
        <div className="flex min-h-0 w-full max-w-xl flex-col justify-center gap-2.5 sm:gap-3.5 lg:gap-5">
          <motion.h2
            animate={
              reduce
                ? {}
                : {
                    y: hovered ? -4 : 0,
                  }
            }
            transition={{ duration: 0.45, ease: EASE }}
            className="font-serif text-[clamp(1.5rem,4.4vw,3.25rem)] font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]"
          >
            {copy.headline}
          </motion.h2>
          <p
            className="font-sans text-[13px] leading-snug text-white/85 sm:text-sm sm:leading-relaxed md:text-base lg:text-lg"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {copy.sub}
          </p>
        </div>

        {/* Bottom: CTA chip — sits in the third grid row, identical across
            both panels, so the buttons share a baseline. */}
        <motion.div
          className="flex items-center gap-3"
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
            className="flex h-11 w-11 items-center justify-center rounded-full sm:h-12 sm:w-12 lg:h-14 lg:w-14"
            style={{
              background: tint.accent,
              color: "#020617",
              boxShadow: `0 14px 44px -12px ${tint.glow}`,
            }}
          >
            {/* Arrow points outward — to the inactive side first, then user clicks it back. RTL flipped automatically. */}
            <ArrowLeft
              size={18}
              strokeWidth={2.4}
              className={rtl ? "" : "rotate-180"}
              aria-hidden
            />
          </span>
          <span className="font-sans text-sm font-bold tracking-wide text-white sm:text-base lg:text-lg">
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
  const reduce = useReducedMotion();
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  const [hovered, setHovered] = React.useState<EmploymentAudience | null>(null);
  const [chosen, setChosen] = React.useState<EmploymentAudience | null>(null);
  const handled = React.useRef(false);

  const handleChoose = React.useCallback((audience: EmploymentAudience) => {
    if (handled.current) return;
    handled.current = true;
    setAudience(audience);
    setChosen(audience);
    const delay = reduce ? 0 : 340;
    window.setTimeout(() => onSelect(audience), delay);
  }, [reduce, onSelect]);

  return (
    <div
      className="relative isolate flex h-dvh w-full flex-col overflow-hidden text-white"
      style={{
        background: isLight ? "#eef2f7" : "#040813",
        transition: "background 0.4s cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      {/* ── Ambient back layer: subtle noise + radial pull from centre ───── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: isLight
            ? "radial-gradient(ellipse 90% 60% at 50% 30%, rgba(8,145,178,0.08) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 50% 80%, rgba(79,70,229,0.06) 0%, transparent 55%)"
            : "radial-gradient(ellipse 90% 60% at 50% 30%, rgba(8,145,178,0.18) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 50% 80%, rgba(79,70,229,0.16) 0%, transparent 55%)",
          transition: "opacity 0.5s ease",
        }}
      />

      {/* ── Header band: brand mark + controls ──────────────────────────────
          shrink-0 so it never steals height from the split panels. Vertical
          padding is asymmetric (pb > pt) to give the logo breathing room
          before the panels begin. ──────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
        className="relative z-30 flex shrink-0 items-center justify-between gap-4 px-5 pt-3 pb-4 sm:px-8 sm:pt-4 sm:pb-5 lg:px-12 lg:pt-5 lg:pb-6"
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur-md"
            style={{
              border: `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.15)"}`,
              background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
              color: "#22D3EE",
              transition: "border-color 0.3s, background 0.3s",
            }}
          >
            <Briefcase size={16} strokeWidth={2.2} />
          </span>
          <span
            className="font-sans text-sm font-semibold tracking-tight sm:text-base transition-colors duration-300"
            style={{ color: isLight ? "#1e293b" : "rgba(255,255,255,0.9)" }}
          >
            {copy.brandLine}
          </span>
        </div>

        {/* ── Controls: theme toggle + language switcher ──────────────── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* ── Premium pill theme toggle ─────────────────────────────── */}
          <motion.button
            onClick={() => setTheme(isLight ? "dark" : "light")}
            className="relative flex h-8 w-[60px] items-center rounded-full p-[3px] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            style={{
              border: `1px solid ${isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)"}`,
              background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
            aria-label={localeConfig.a11y.toggleTheme}
          >
            <motion.span
              className="relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full"
              animate={{ x: isLight ? 0 : 28 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{
                background: isLight ? "#f59e0b" : "#6366f1",
                boxShadow: isLight
                  ? "0 2px 10px rgba(245,158,11,0.4)"
                  : "0 2px 10px rgba(99,102,241,0.4)",
              }}
            >
              {isLight ? (
                <Sun size={14} strokeWidth={2.4} color="#fff" />
              ) : (
                <Moon size={14} strokeWidth={2.4} color="#fff" />
              )}
            </motion.span>
          </motion.button>

          {/* ── Language switcher ─────────────────────────────────────── */}
          <div
            className={
              isLight
                ? "[&_button]:text-slate-600 [&_button]:hover:text-slate-900"
                : ""
            }
          >
            <LanguageSwitcher variant="light" align="end" />
          </div>
        </div>
      </motion.header>

      {/* ── Split panels ────────────────────────────────────────────────────
          The split is the working area of the screen. `flex-1 min-h-0` is the
          key combination: flex-1 claims all remaining vertical space after the
          shrink-0 header/footer, and min-h-0 lets the children actually fit
          inside that space (without min-h-0 flex children refuse to shrink
          below their content height and force the page to overflow).
          ────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        <div
          className="flex min-h-0 flex-1 lg:flex-none lg:basis-1/2 lg:[transition:flex-basis_550ms_cubic-bezier(0.23,1,0.32,1)]"
          style={
            hovered === null
              ? undefined
              : { flexBasis: hovered === "worker" ? "55%" : "45%" }
          }
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
            iconA={<HardHat size={20} strokeWidth={2.2} />}
            iconB={
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                01
              </span>
            }
            rtl={rtl}
            index={0}
          />
        </div>

        <div
          className="flex min-h-0 flex-1 lg:flex-none lg:basis-1/2 lg:[transition:flex-basis_550ms_cubic-bezier(0.23,1,0.32,1)]"
          style={
            hovered === null
              ? undefined
              : { flexBasis: hovered === "business" ? "55%" : "45%" }
          }
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
            iconA={<Building2 size={20} strokeWidth={2.2} />}
            iconB={
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                02
              </span>
            }
            rtl={rtl}
            index={1}
          />
        </div>
      </div>

      {/* ── Foot hint ──────────────────────────────────────────────────────
          shrink-0 + compact padding. Small enough that it never competes for
          the panel height. ──────────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
        className="relative z-30 flex shrink-0 items-center justify-center gap-2 px-6 pb-3 pt-2 sm:pb-4 sm:pt-2"
      >
        <span
          aria-hidden
          className="inline-block h-1 w-1 rounded-full transition-colors duration-300"
          style={{ background: isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.4)" }}
        />
        <span
          className="font-sans text-[11px] font-medium tracking-wide sm:text-xs transition-colors duration-300"
          style={{ color: isLight ? "#64748b" : "rgba(255,255,255,0.55)" }}
        >
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
