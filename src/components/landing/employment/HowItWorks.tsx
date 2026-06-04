import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { HelpCircle } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import {
  VIEWPORT_ONCE,
  getNicheFlavor,
  nicheStagger,
  NICHE_DURATION,
  NICHE_EASING,
  Y_MD,
  Y_SM,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepData {
  number: string;
  title: string;
  description: string;
  iconName: string;
}

// ─── Animated connector line ──────────────────────────────────────────────────

function ConnectorDesktop({ triggered }: { triggered: boolean }) {
  const rtl = localeConfig.dir === "rtl";
  // The first segment should always grow from the visual start of the row.
  // In LTR the visual start is the physical left; in RTL it's the right.
  const firstOrigin = rtl ? "right center" : "left center";
  const lastOrigin = rtl ? "left center" : "right center";
  return (
    <div
      aria-hidden
      className="absolute top-[3.25rem] left-[calc(33.333%+1.5rem)] right-[calc(33.333%+1.5rem)] hidden items-center md:flex"
      style={{ pointerEvents: "none" }}
    >
      {/* First dashed segment — grows from the visual start */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={triggered ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 0.55, delay: 0.55, ease: EASE_OUT_STRONG }}
        style={{ transformOrigin: firstOrigin }}
        className="h-px flex-1 border-t-2 border-dashed border-[#0891B2]/55"
      />
      {/* Midpoint chevron */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={triggered ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.3, delay: 0.82, ease: EASE_OUT_STRONG }}
        className="mx-2 size-2 rotate-45 border-r-2 border-t-2 border-[#0891B2]/75 rtl:-scale-x-100"
      />
      {/* Second dashed segment — grows toward the visual end */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={triggered ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 0.55, delay: 0.68, ease: EASE_OUT_STRONG }}
        style={{ transformOrigin: lastOrigin }}
        className="h-px flex-1 border-t-2 border-dashed border-[#0891B2]/55"
      />
    </div>
  );
}

// ─── Vertical connector (mobile timeline) ────────────────────────────────────

function ConnectorMobile({ triggered }: { triggered: boolean }) {
  return (
    <div
      aria-hidden
      className="absolute start-[1.75rem] top-[4.5rem] bottom-[4.5rem] w-px md:hidden"
      style={{ pointerEvents: "none" }}
    >
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={triggered ? { scaleY: 1, opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.4, ease: EASE_OUT_STRONG }}
        style={{ transformOrigin: "top center" }}
        className="h-full border-s-2 border-dashed border-[#0891B2]/50"
      />
    </div>
  );
}

// ─── Single step card ─────────────────────────────────────────────────────────

interface StepCardProps {
  step: StepData;
  index: number;
  flavor: ReturnType<typeof getNicheFlavor>;
  staggerDelay: number;
}

function StepCard({ step, index, flavor, staggerDelay }: StepCardProps) {
  const Icon = resolveLucideIcon(step.iconName, HelpCircle);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  // Alternate vertical offset so the row feels dynamic rather than flat
  const yOffset = index === 1 ? 10 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: Y_MD + yOffset }}
      whileInView={{ opacity: 1, y: yOffset }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: dur, delay: staggerDelay, ease }}
      className="group relative flex flex-row gap-4 md:flex-col md:items-center md:text-center"
    >
      {/* ── Large decorative step number ──────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1 -start-1 select-none font-serif text-[2.75rem] font-black leading-none tracking-tighter text-[#0891B2]/10 sm:-top-2 sm:start-0 sm:text-[3.5rem] md:static md:mb-[-3.5rem] md:self-center md:text-[5rem] md:text-[#0891B2]/10"
      >
        {step.number}
      </div>

      {/* ── Icon container ────────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 md:self-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur * 1.1, delay: staggerDelay + 0.08, ease: EASE_OUT_STRONG }}
          whileHover={{ scale: 1.07 }}
          className="flex size-14 items-center justify-center rounded-2xl border border-[#0891B2]/40 bg-[rgba(8,145,178,0.14)] text-[#0891B2] shadow-[0_8px_28px_-10px_rgba(8,145,178,0.55)] transition-shadow duration-300 group-hover:shadow-[0_10px_36px_-8px_rgba(8,145,178,0.75)] sm:size-[3.75rem]"
        >
          <Icon size={26} aria-hidden />
        </motion.div>
      </div>

      {/* ── Text ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center md:items-center">
        <motion.h3
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: staggerDelay + 0.1, ease }}
          className="mb-1.5 font-sans text-base font-bold text-foreground sm:text-lg md:text-xl"
        >
          {step.title}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: staggerDelay + 0.16, ease }}
          className="font-sans text-sm leading-relaxed text-muted-foreground md:max-w-[14rem]"
        >
          {step.description}
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HowItWorks() {
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const stagger = nicheStagger(niche);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (siteConfig.sections as any).howItWorks as {
    title: string;
    subtitle: string;
    steps: StepData[];
  };

  // Trigger connector animations once section enters viewport
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative overflow-hidden py-20 sm:py-24 md:py-32"
    >
      {/* ── Background radial glow ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(8,145,178,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">
        {/* ── Section header ────────────────────────────────────────────────── */}
        <div className="mb-14 text-center sm:mb-16 md:mb-20">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 0.8, ease }}
            className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#0891B2] sm:text-sm"
          >
            {data.title}
          </motion.p>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: Y_MD }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, delay: 0.07, ease }}
            className="font-serif text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            {data.subtitle}
          </motion.h2>

          {/* Accent divider */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT_STRONG }}
            className="mx-auto mt-5 h-[2px] w-12 origin-center bg-[#0891B2]"
            aria-hidden
          />
        </div>

        {/* ── Steps + connectors ────────────────────────────────────────────── */}
        <div className="relative">
          {/* Desktop horizontal connector */}
          <ConnectorDesktop triggered={isInView} />

          {/* Mobile vertical connector */}
          <ConnectorMobile triggered={isInView} />

          {/* Steps grid */}
          <div className="relative grid gap-8 sm:gap-10 md:grid-cols-3 md:gap-6 lg:gap-8">
            {data.steps.map((step, i) => (
              <StepCard
                key={step.number}
                step={step}
                index={i}
                flavor={flavor}
                staggerDelay={stagger(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
