import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { cn, handleImgError } from "../../lib/utils";
import {
  Y_MD, Y_SM, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants, EASE_OUT_STRONG,
  NICHE_CARD_HOVER,
} from "../../lib/motion";

export function Portfolio({
  onNavigateToProjects,
}: {
  onNavigateToProjects?: () => void;
} = {}) {
  const data = siteConfig.sections.portfolio;
  if (!data) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const isRemodelaciones = niche === "remodelaciones";

  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = activeFilter === "all"
    ? data.projects
    : data.projects.filter((p) => p.filter === activeFilter);

  return (
    <section id="portfolio" className="relative overflow-hidden py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          viewport={VIEWPORT_ONCE}
          className="mb-12 text-center md:mb-16"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {data.title}
          </p>
          <motion.h2
            variants={sectionTitleContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className={isRemodelaciones
              ? "text-3xl font-extrabold tracking-tight text-foreground md:text-4xl lg:text-5xl"
              : "text-3xl font-bold text-foreground md:text-4xl lg:text-5xl"
            }
          >
            {data.subtitle.split(" ").map((word: string, i: number) => (
              <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                {word}&nbsp;
              </motion.span>
            ))}
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          viewport={VIEWPORT_ONCE}
          className="mb-10 flex flex-wrap justify-center gap-2"
        >
          {data.filters.map((filter) => (
            <motion.button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.12, ease: EASE_OUT_STRONG }}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                activeFilter === filter.key
                  ? "bg-accent text-white shadow-md"
                  : "bg-card text-muted-foreground hover:bg-accent/10 hover:text-foreground",
              )}
            >
              {filter.label}
            </motion.button>
          ))}
        </motion.div>

        <div className={cn(
          "grid gap-6",
          isRemodelaciones ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3",
        )}>
          <AnimatePresence mode="popLayout">
            {filtered.map((project, i) => (
              <motion.div
                key={project.title}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: NICHE_DURATION[flavor] * 1.1, ease: EASE_OUT_STRONG, delay: stagger(i) }}
                whileHover={{
                  y: NICHE_CARD_HOVER[flavor].y,
                  boxShadow: NICHE_CARD_HOVER[flavor].shadow,
                }}
                className={cn(
                  "group overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-colors hover:border-accent/30",
                  isRemodelaciones && onNavigateToProjects && "cursor-pointer",
                )}
                onClick={isRemodelaciones && onNavigateToProjects ? onNavigateToProjects : undefined}
                {...(isRemodelaciones && onNavigateToProjects && {
                  role: "button" as const,
                  tabIndex: 0,
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNavigateToProjects();
                    }
                  },
                })}
              >
                {project.images[0] && (
                  <div className={cn(
                    "relative overflow-hidden bg-muted",
                    isRemodelaciones ? "h-52 sm:h-64 md:h-72" : "h-48",
                  )}>
                    <img
                      src={project.images[0]}
                      alt={project.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      onError={handleImgError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-3 start-3 rounded-full bg-accent/90 px-3 py-1 text-xs font-medium text-white">
                      {project.type}
                    </span>
                  </div>
                )}

                <div className="p-5">
                  <h3 className="mb-2 text-base font-bold text-foreground">
                    {project.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  {(project.duration || project.size) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                      {project.duration && <span>{project.duration}</span>}
                      {project.duration && project.size && <span>·</span>}
                      {project.size && <span>{project.size}</span>}
                    </div>
                  )}
                  {isRemodelaciones && onNavigateToProjects && project.gallery && project.gallery.length > 0 && (
                    <div className="portfolio-ba-link mt-4 flex items-center gap-1 text-xs font-medium text-accent transition-all duration-300">
                      <span>{localeConfig.lang === "he" ? "לפני ואחרי" : localeConfig.lang === "ru" ? "До и после" : localeConfig.lang === "ar" ? "قبل وبعد" : "Before & After"}</span>
                      <ChevronRight size={12} className="rtl:rotate-180" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {isRemodelaciones && onNavigateToProjects && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.3 }}
            className="mt-10 text-center"
          >
            <button
              type="button"
              onClick={onNavigateToProjects}
              className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {localeConfig.lang === "he" ? "צפו בכל הפרויקטים" : localeConfig.lang === "ru" ? "Все проекты" : localeConfig.lang === "ar" ? "عرض جميع المشاريع" : "View All Projects"}
              <ChevronRight size={14} />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
