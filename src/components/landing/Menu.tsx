import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { cn, handleImgError } from "../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, nicheScaleIn,
  NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants,
} from "../../lib/motion";

export function Menu() {
  const menuConfig = siteConfig.sections.menu;
  if (!menuConfig || !menuConfig.items || !menuConfig.categories) return null;

  const { categories, items } = menuConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  type CatKey = string;
  const [activeCategory, setActiveCategory] = useState<CatKey>("all");

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((item) => item.category === activeCategory);
  }, [activeCategory, items]);

  const categoryBadgeLabel = (categoryKey: string) =>
    categories.find((c) => c.key === categoryKey)?.label ?? categoryKey;

  return (
    <section id="menu" className="bg-background px-4 py-20 transition-colors duration-300 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 sm:mb-16 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-accent-light sm:text-xs"
            >
              {menuConfig.title}
            </motion.p>
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className="font-serif text-3xl font-normal tracking-wide text-foreground sm:text-4xl md:text-5xl"
            >
              {menuConfig.subtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
          </div>

          {/* Category filters — scrollable on mobile, wrapping on desktop */}
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.15 }}
            className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0"
          >
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "min-h-[44px] shrink-0 rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-widest transition-all duration-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  activeCategory === cat.key
                    ? "bg-foreground text-background shadow-sm"
                    : "border border-border text-muted-foreground hover:border-accent/40 hover:text-foreground active:scale-[0.97]",
                )}
              >
                {cat.label}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Divider line */}
        <div className="mb-10 h-px bg-border relative overflow-hidden sm:mb-12">
          <div className="absolute inset-y-0 start-0 w-1/4 bg-accent-light/40" />
        </div>

        {/* Menu grid */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4"
          >
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                {...nicheScaleIn(niche)}
                transition={{
                  delay: stagger(index),
                  duration: NICHE_DURATION[flavor],
                  ease: NICHE_EASING[flavor],
                }}
                className="group"
              >
                {/* Image */}
                <div className="relative mb-4 overflow-hidden rounded-xl bg-muted shadow-sm sm:mb-5 sm:rounded-2xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted sm:aspect-square">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      onError={handleImgError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="absolute start-3 top-3 sm:start-4 sm:top-4">
                      <span className="rounded-full bg-background/80 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-foreground/80 backdrop-blur-md sm:text-[11px]">
                        {categoryBadgeLabel(item.category)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="px-0.5">
                  <h3 className="font-serif text-lg text-foreground transition-colors duration-300 group-hover:text-accent sm:text-xl">
                    {item.name}
                  </h3>
                  <p className="mb-2 mt-1 text-[11px] uppercase tracking-widest text-accent-light sm:mb-3 sm:text-xs">
                    {item.subtitle}
                  </p>
                  <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="py-16 text-center text-muted-foreground sm:py-20">
            <p className="font-serif text-base italic sm:text-lg">
              {localeConfig.lang === "he" ? "אין פריטים בקטגוריה זו" : localeConfig.lang === "ar" ? "لا عناصر في هذه الفئة" : localeConfig.lang === "ru" ? "Нет элементов в этой категории" : "No items in this category"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
