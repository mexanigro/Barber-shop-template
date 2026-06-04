import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "../../../config/site";
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

// ─── Stock photos per category id ────────────────────────────────────────────
// Keyed by the stable category `id` so all 4 languages share one map.
// Unsplash hot-link (auto-format + crop, ~800w for retina-friendly 2-col grid).

const IMAGES_BY_ID: Record<string, string> = {
  supermarket: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=900",
  warehouse: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=900",
  cleaning: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=900",
  logistics: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=900",
  drivers: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=900",
  cooking: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=900",
  construction: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=900",
  other: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=900",
};

const FALLBACK_IMAGE = IMAGES_BY_ID.other;

// ─── Category card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: CategoryItem;
  staggerDelay: number;
  flavor: ReturnType<typeof getNicheFlavor>;
  isLast: boolean;
}

function CategoryCard({ category, staggerDelay, flavor, isLast }: CategoryCardProps) {
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const imageUrl = IMAGES_BY_ID[category.id] ?? FALLBACK_IMAGE;

  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent("employment-category-select", { detail: category.id }),
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
      whileHover={{ y: -4, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
      whileTap={{ scale: 0.97 }}
      aria-label={category.label}
      className={[
        "group relative block w-full overflow-hidden rounded-2xl",
        "aspect-[3/4] sm:aspect-[4/5]",
        "shadow-sm ring-1 ring-border/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8820C] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "[transition:box-shadow_0.25s_ease,transform_0.2s_ease]",
        "hover:shadow-lg hover:shadow-black/20",
      ].join(" ")}
    >
      {/* Photo */}
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover [transition:transform_0.5s_cubic-bezier(0.23,1,0.32,1),filter_0.3s_ease] group-hover:scale-[1.06]"
        draggable={false}
      />

      {/* Bottom gradient for legibility */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
      />

      {/* Top accent bar — only on "other" to flag it as a CTA-style card */}
      {isLast && (
        <span
          aria-hidden
          className="absolute end-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E8820C] text-white shadow-md ring-1 ring-white/30 [transition:transform_0.25s_cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
        >
          <ArrowUpRight size={14} strokeWidth={2.5} className="rtl:-scale-x-100" />
        </span>
      )}

      {/* Text overlay */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-4 text-start sm:p-5">
        <motion.span
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: staggerDelay + 0.1, ease }}
          className="font-serif text-base font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] sm:text-lg md:text-xl"
        >
          {category.label}
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: staggerDelay + 0.15, ease }}
          className="line-clamp-2 font-sans text-[11px] font-medium leading-snug text-white/85 sm:text-xs"
        >
          {category.description}
        </motion.span>
      </div>
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
      className="relative overflow-hidden bg-muted/30 py-20 sm:py-24 md:py-32"
    >
      {/* Background ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(232,130,12,0.06) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        {/* ── Section header ──────────────────────────────────────────────── */}
        <div className="mb-10 text-center sm:mb-12 md:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 0.8, ease }}
            className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#E8820C] sm:text-sm"
          >
            {data?.title}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: Y_MD }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, delay: 0.07, ease }}
            className="font-serif text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            {data?.subtitle}
          </motion.h2>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT_STRONG }}
            className="mx-auto mt-5 h-[2px] w-12 origin-center bg-[#E8820C]"
            aria-hidden
          />
        </div>

        {/* ── Photo grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5 lg:gap-6">
          {categories.map((category, i) => (
            <CategoryCard
              key={category.id}
              category={category}
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
