import React from "react";
import { Clock, DollarSign, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { siteConfig } from "../../config/site";

export function Services({ onBookClick }: { onBookClick: () => void }) {
  const { sections } = siteConfig;
  const { services: sectionConfig } = sections;

  const serviceCount = siteConfig.services.length;
  // Last card in an odd-count 2-col grid: span both columns and cap width so it
  // reads as a "featured" card rather than a stretched orphan.
  const isLastOdd = (i: number) => serviceCount % 2 !== 0 && i === serviceCount - 1;

  return (
    <section id="services" className="bg-background px-6 py-24 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-accent-light font-black uppercase tracking-[0.3em] text-xs mb-4"
          >
            {sectionConfig.title}
          </motion.h2>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-foreground"
          >
            {sectionConfig.subtitle}
          </motion.h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {siteConfig.services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent-light/45 hover:shadow-xl dark:bg-card/90 sm:flex-row",
                siteConfig.features.showBooking && "cursor-pointer",
                // Orphan: span the full 2-col row and self-center so the card
                // keeps a natural width instead of stretching edge-to-edge.
                isLastOdd(index) && "md:col-span-2 md:mx-auto md:max-w-2xl"
              )}
              onClick={siteConfig.features.showBooking ? onBookClick : undefined}
            >
              <div className="sm:w-2/5 aspect-[4/3] sm:aspect-auto relative overflow-hidden">
                 <img 
                    src={sectionConfig.images[index % sectionConfig.images.length]} 
                    alt={service.name} 
                    className="h-full w-full object-cover transition-transform duration-700 contrast-[1.02] saturate-[1.03] group-hover:scale-[1.03]"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-card sm:bg-gradient-to-r sm:from-transparent to-transparent sm:to-card" />
              </div>
              
              <div className="p-8 sm:w-3/5 flex flex-col justify-center">
                {siteConfig.features.showBooking && (
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="text-accent-light" />
                  </div>
                )}

                <h4 className="mb-3 text-2xl font-black tracking-tight text-card-foreground transition-colors group-hover:text-accent-light">
                  {service.name}
                </h4>
                <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground transition-colors duration-300">
                  {service.description}
                </p>

                <div className="flex items-center gap-6 mt-auto">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 font-bold text-secondary-foreground transition-colors duration-300">
                    <DollarSign size={16} className="text-accent-light" />
                    <span>{service.price}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors duration-300">
                    <Clock size={14} className="text-muted-foreground" />
                    <span>{service.duration} min</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
