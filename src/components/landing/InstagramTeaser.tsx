import React from "react";
import { Instagram } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { cn, handleImgError } from "../../lib/utils";
import { Y_SM, Y_MD, VIEWPORT_ONCE } from "../../lib/motion";

/**
 * Static Instagram grid driven by `sections.instagram` preset data.
 * Renders 6–9 square images in a clean grid with a follow CTA.
 * Does NOT call the Instagram API; images are static URLs from the preset.
 */
export function InstagramTeaser() {
  const ig = siteConfig.sections.instagram;
  if (!ig || ig.images.length === 0) return null;

  const isHe = localeConfig.lang === "he";
  const isEstetica = siteConfig.business.type === "estetica";

  return (
    <section className="bg-background px-6 py-24 transition-colors duration-300">
      <div className="mx-auto max-w-5xl">

        {/* Header: title + handle */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          className="mb-10 text-center"
        >
          <p className={cn(
            "mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light",
            isEstetica && "font-medium tracking-[0.3em]",
          )}>
            {ig.title}
          </p>
          <a
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Instagram size={16} className="text-accent-light" />
            <span>{ig.handle}</span>
          </a>
        </motion.div>

        {/* Photo grid: 3 cols mobile, 6 cols desktop (for 6 images) or 3 cols (for 9) */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-1.5 sm:gap-2"
        >
          {ig.images.map((src, i) => (
            <a
              key={i}
              href={ig.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group relative overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                isEstetica && "rounded-sm",
              )}
            >
              <img
                src={src}
                alt={`Instagram post ${i + 1}`}
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                loading="lazy"
                onError={handleImgError}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/25">
                <Instagram
                  size={20}
                  className="text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              </div>
            </a>
          ))}
        </motion.div>

        {/* Follow CTA */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <a
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl border border-border px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 hover:border-accent/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Instagram size={14} />
            {isHe ? "עקבו באינסטגרם" : "Follow on Instagram"}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
