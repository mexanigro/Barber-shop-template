import React from "react";
import { Quote, Star } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";

export function Testimonials() {
  const { testimonials, sections } = siteConfig;
  const { testimonials: sectionConfig } = sections;

  return (
    <section id="testimonials" className="bg-background px-6 py-24 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-accent-light font-bold uppercase tracking-[0.3em] text-xs mb-4">{sectionConfig.title}</h2>
          <h3 className="text-4xl font-black uppercase tracking-tighter text-foreground md:text-5xl">{sectionConfig.subtitle}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-3xl border border-border bg-card/95 p-10 shadow-elevated backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-card/90"
            >
              <Quote className="absolute right-8 top-8 text-border dark:text-white/15" size={60} />
              
              <div className="flex gap-1 mb-6">
                {[...Array(review.rating)].map((_, j) => (
                  <Star key={j} className="text-accent-light" size={16} fill="currentColor" />
                ))}
              </div>

              <p className="mb-8 text-lg italic leading-relaxed text-muted-foreground transition-colors duration-300">
                "{review.text}"
              </p>

              <div>
                <h4 className="text-lg font-bold text-card-foreground">{review.name}</h4>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-300">{review.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
