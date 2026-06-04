import { motion } from "motion/react";
import { HelpCircle, ArrowUpRight } from "lucide-react";
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
    iconBg: "rgba(8,145,178,0.10)",
    iconColor: "#0891B2",
    iconGlow: "0 0 24px -4px rgba(8,145,178,0.45)",
    borderBase: "rgba(8,145,178,0.28)",
    borderHover: "#0891B2",
    cardHoverBg: "rgba(8,145,178,0.06)",
  },
  // 1 — warm teal
  {
    iconBg: "rgba(20,184,166,0.10)",
    iconColor: "#0F9488",
    iconGlow: "0 0 24px -4px rgba(20,184,166,0.45)",
    borderBase: "rgba(20,184,166,0.28)",
    borderHover: "#14B8A6",
    cardHoverBg: "rgba(20,184,166,0.06)",
  },
  // 2 — indigo
  {
    iconBg: "rgba(99,102,241,0.10)",
    iconColor: "#4F46E5",
    iconGlow: "0 0 24px -4px rgba(99,102,241,0.45)",
    borderBase: "rgba(99,102,241,0.28)",
    borderHover: "#6366F1",
    cardHoverBg: "rgba(99,102,241,0.05)",
  },
  // 3 — sky blue (brighter accent)
  {
    iconBg: "rgba(2,132,199,0.10)",
    iconColor: "#0284C7",
    iconGlow: "0 0 24px -4px rgba(56,189,248,0.45)",
    borderBase: "rgba(56,189,248,0.32)",
    borderHover: "#0284C7",
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
        "text-start",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "min-h-[124px]",
        isLast
          ? "border-[1.5px] border-dashed hover:bg-[rgba(8,145,178,0.04)]"
          : "border shadow-sm hover:bg-[var(--cat-hover-bg)] hover:shadow-md",
        "[transition:background-color_0.2s_ease,border-color_0.2s_ease,box-shadow_0.2s_ease,transform_0.2s_ease]",
        "hover:border-[var(--cat-hover-border)]",
      ].join(" ")}
      style={
        {
          background: isLast ? "transparent" : "var(--card)",
          borderColor: tint.borderBase,
          "--cat-hover-bg": tint.cardHoverBg,
          "--cat-hover-border": tint.borderHover,
        } as React.CSSProperties
      }
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
          className="font-sans text-sm font-bold leading-snug text-foreground sm:text-base"
        >
          {category.label}
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: staggerDelay + 0.15, ease }}
          className="font-sans text-xs leading-relaxed text-muted-foreground"
        >
          {category.description}
        </motion.span>
      </div>

      {/* "Other" call-to-action hint */}
      {isLast && (
        <span
          aria-hidden
          className="absolute bottom-3 end-3 inline-flex items-center justify-center rounded-full p-1.5 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
          style={{
            background: tint.iconBg,
            color: tint.iconColor,
          }}
        >
          <ArrowUpRight size={12} strokeWidth={2.5} className="rtl:-scale-x-100" />
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
            className="font-serif text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
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
