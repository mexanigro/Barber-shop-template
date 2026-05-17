import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "../../config/site";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants, EASE_OUT_STRONG,
  NICHE_CARD_HOVER, BUTTON_PRESS,
} from "../../lib/motion";

export function Portfolio() {
  const data = siteConfig.sections.portfolio;
  if (!data) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

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
            className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl"
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
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-accent text-white shadow-md"
                  : "bg-card text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              }`}
            >
              {filter.label}
            </motion.button>
          ))}
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                className="group overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-colors hover:border-accent/30"
              >
                {project.images[0] && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={project.images[0]}
                      alt={project.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
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
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
