import React from "react";
import { motion } from "motion/react";
import { Link2, LayoutGrid } from "lucide-react";
import { siteConfig } from "../../config/site";

export function Gallery({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections } = siteConfig;
  const { gallery: sectionConfig } = sections;
  const previewImages = gallery.slice(0, 6);

  return (
    <section id="gallery" className="bg-background px-6 py-24 transition-colors duration-300">
      <div className="max-w-7xl mx-auto text-center">
        <div className="text-center mb-16">
          <h2 className="text-accent-light font-bold uppercase tracking-[0.3em] text-xs mb-4">{sectionConfig.title}</h2>
          <h3 className="text-4xl font-black uppercase tracking-tighter text-foreground md:text-5xl">{sectionConfig.subtitle}</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {previewImages.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-muted/30 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-transparent dark:shadow-none dark:hover:shadow-elevated"
            >
              <img
                src={src}
                className="h-full w-full object-cover transition-all duration-700 contrast-[1.02] saturate-[1.03] group-hover:scale-[1.03]"
                alt={`Portfolio piece ${i + 1}`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          ))}
        </div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onClick={onViewFull}
          className="group relative inline-flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-secondary px-10 py-5 font-black uppercase tracking-[0.2em] text-secondary-foreground shadow-elevated transition-all duration-300 hover:border-accent-light hover:bg-muted"
        >
          <LayoutGrid size={20} className="text-accent-light group-hover:scale-125 transition-transform" />
          <span>View Full Manifest</span>
          <div className="absolute inset-0 bg-accent-light/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </motion.button>
      </div>
    </section>
  );
}
