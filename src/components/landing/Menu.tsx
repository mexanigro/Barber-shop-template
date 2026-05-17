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
  if (!menuConfig) return null;

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
    <section id="menu" className="bg-background px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-16 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {menuConfig.title}
            </motion.p>
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className="font-serif text-4xl font-normal tracking-wide text-foreground md:text-5xl"
            >
              {menuConfig.subtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
          </div>

          {/* Category filters */}
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap gap-3"
          >
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-widest transition-all duration-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  activeCategory === cat.key
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:border-accent/40 hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Divider line */}
        <div className="mb-12 h-px bg-border relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/4 bg-accent-light/40" />
        </div>

        {/* Menu grid */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
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
                <div className="relative mb-5 overflow-hidden rounded-2xl bg-muted">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                      onError={handleImgError}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="absolute left-4 top-4">
                      <span className="rounded-full bg-black/50 px-3 py-1.5 text-[11px] uppercase tracking-widest text-white/80 backdrop-blur-sm">
                        {categoryBadgeLabel(item.category)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="px-1">
                  <h3 className="font-serif text-xl text-foreground transition-colors duration-300 group-hover:text-accent">
                    {item.name}
                  </h3>
                  <p className="mb-3 mt-1 text-xs uppercase tracking-widest text-accent-light">
                    {item.subtitle}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <p className="font-serif text-lg italic">
              {localeConfig.lang === "he" ? "אין פריטים בקטגוריה זו" : "No items in this category"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
