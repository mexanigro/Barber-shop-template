import { motion } from "motion/react";
import { HelpCircle } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import {
  VIEWPORT_ONCE,
  getNicheFlavor,
  nicheStagger,
  NICHE_DURATION,
  NICHE_EASING,
  EASE_OUT_STRONG,
  Y_MD,
  Y_SM,
} from "../../../lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryItem {
  id: string;
  label: string;
  iconName: string;
  description: string;
}

interface JobCategoriesData {
  title: string;
  subtitle: string;
  categories: CategoryItem[];
}

// ─── Accent tint palette — each card index gets a different hue treatment ────
// Uses the base accent (#0891B2 cyan) but with varying opacity/blend so no two
// cards look identical, while all remain on-brand.

const TINT_VARIANTS: Array<{
  iconBg: string;
  iconColor: string;
  iconGlow: string;
  borderBase: string;
  borderHover: string;
  cardHoverBg: string;
}> = [
  // 0 — pure accent
  {
    iconBg: "rgba(8,145,178,0.13)",
    iconColor: "#0891B2",
    iconGlow: "0 0 18px -4px rgba(8,145,178,0.55)",
    borderBase: "rgba(8,145,178,0.18)",
    borderHover: "#0891B2",
    cardHoverBg: "rgba(8,145,178,0.06)",
  },
  // 1 — warm teal
  {
    iconBg: "rgba(20,184,166,0.13)",
    iconColor: "#14B8A6",
    iconGlow: "0 0 18px -4px rgba(20,184,166,0.55)",
    borderBase: "rgba(20,184,166,0.18)",
    borderHover: "#14B8A6",
    cardHoverBg: "rgba(20,184,166,0.06)",
  },
  // 2 — indigo
  {
    iconBg: "rgba(99,102,241,0.13)",
    iconColor: "#818CF8",
    iconGlow: "0 0 18px -4px rgba(99,102,241,0.5)",
    borderBase: "rgba(99,102,241,0.18)",
    borderHover: "#818CF8",
    cardHoverBg: "rgba(99,102,241,0.05)",
  },
  // 3 — sky blue (brighter accent)
  {
    iconBg: "rgba(56,189,248,0.13)",
    iconColor: "#38BDF8",
    iconGlow: "0 0 18px -4px rgba(56,189,248,0.55)",
    borderBase: "rgba(56,189,248,0.18)",
    borderHover: "#38BDF8",
    cardHoverBg: "rgba(56,189,248,0.06)",
  },
];

// ─── Category card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: CategoryItem;
  index: number;
  staggerDelay: number;
  flavor: ReturnType<typeof getNicheFlavor>;
  isLast: boolean;
}

function CategoryCard({ category, index, staggerDelay, flavor, isLast }: CategoryCardProps) {
  const Icon = resolveLucideIcon(category.iconName, HelpCircle);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  // Cycle through tint variants; last card (Other) gets a special treatment
  const tint = TINT_VARIANTS[index % TINT_VARIANTS.length];

  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent("employment-category-select", { detail: category.id })
    );
    document.getElementById("employment-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, y: Y_MD }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: dur, delay: staggerDelay, ease }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
      }}
      whileTap={{ scale: 0.97 }}
      className={[
        "group relative flex w-full flex-col items-start gap-3 rounded-xl p-4 sm:p-5",
        "text-start transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "min-h-[120px]", // ensures 44px+ touch area even on small content
      ].join(" ")}
      style={
        isLast
          ? {
              background: "transparent",
              border: `1.5px dashed ${tint.borderBase}`,
            }
          : {
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${tint.borderBase}`,
            }
      }
      // CSS-in-JS hover handled by Framer (y) + inline style via onMouseEnter below
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = isLast ? "rgba(8,145,178,0.04)" : tint.cardHoverBg;
        el.style.borderColor = tint.borderHover;
        if (isLast) el.style.borderStyle = "dashed";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = isLast ? "transparent" : "rgba(255,255,255,0.025)";
        el.style.borderColor = tint.borderBase;
        if (isLast) el.style.borderStyle = "dashed";
      }}
    >
      {/* Icon container */}
      <motion.span
        className="flex items-center justify-center rounded-lg p-2.5 transition-shadow duration-300 group-hover:shadow-[var(--icon-glow)]"
        style={
          {
            background: tint.iconBg,
            color: tint.iconColor,
            "--icon-glow": tint.iconGlow,
          } as React.CSSProperties
        }
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: dur * 1.1, delay: staggerDelay + 0.07, ease: EASE_OUT_STRONG }}
      >
        <Icon size={22} aria-hidden />
      </motion.span>

      {/* Text */}
      <div className="flex flex-col gap-0.5">
        <motion.span
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: staggerDelay + 0.1, ease }}
          className="font-sans text-sm font-bold leading-snug text-white sm:text-base"
        >
          {category.label}
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: staggerDelay + 0.15, ease }}
          className="font-sans text-xs leading-relaxed text-white/50"
        >
          {category.description}
        </motion.span>
      </div>

      {/* "Other" call-to-action hint */}
      {isLast && (
        <span
          aria-hidden
          className="absolute bottom-3 end-3 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: tint.iconColor, opacity: 0.7 }}
        >
          + more
        </span>
      )}
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JobCategories() {
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const stagger = nicheStagger(niche);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (siteConfig.sections as any).jobCategories as JobCategoriesData;
  const categories: CategoryItem[] = data?.categories ?? [];
  const lastIndex = categories.length - 1;

  return (
    <section
      id="job-categories"
      className="relative overflow-hidden py-20 sm:py-24 md:py-32 bg-muted/30"
    >
      {/* Background ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(8,145,178,0.06) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        {/* ── Section header ──────────────────────────────────────────────── */}
        <div className="mb-10 text-center sm:mb-12 md:mb-16">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 0.8, ease }}
            className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#0891B2] sm:text-sm"
          >
            {data?.title}
          </motion.p>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: Y_MD }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, delay: 0.07, ease }}
            className="font-serif text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            {data?.subtitle}
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

        {/* ── Cards grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5 lg:gap-6">
          {categories.map((category, i) => (
            <CategoryCard
              key={category.id}
              category={category}
              index={i}
              staggerDelay={stagger(i)}
              flavor={flavor}
              isLast={i === lastIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
