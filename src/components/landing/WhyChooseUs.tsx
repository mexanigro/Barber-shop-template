import React from "react";
import * as Icons from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";

export function WhyChooseUs() {
  const { sections } = siteConfig;
  const { whyChooseUs: sectionConfig } = sections;

  return (
    <section id="why-choose-us" className="bg-card px-6 py-24 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="aspect-square overflow-hidden rounded-3xl border border-border shadow-elevated transition-colors duration-300"
            >
              <img
                src={sectionConfig.mainImage}
                className="h-full w-full object-cover contrast-[1.02] saturate-[1.03]"
                alt="Operational Standard"
              />
            </motion.div>
            <div className="absolute -bottom-10 -right-10 hidden w-64 rotate-6 rounded-3xl bg-accent-light p-8 shadow-elevated md:block hover:rotate-0 transition-transform duration-500">
               <Icons.Star className="mb-4 text-zinc-950" size={40} fill="currentColor" />
               <h4 className="whitespace-pre-line text-2xl font-black uppercase leading-tight text-zinc-950">
                  {sectionConfig.badge}
               </h4>
            </div>
          </div>

          <div className="space-y-12">
            <div>
              <h2 className="text-accent-light font-bold uppercase tracking-[0.3em] text-xs mb-4">{sectionConfig.title}</h2>
              <h3 className="text-4xl font-black uppercase tracking-tighter text-card-foreground md:text-6xl">{sectionConfig.subtitle}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              {sectionConfig.benefits.map((benefit, i) => {
                const IconComponent = (Icons as any)[benefit.iconName] || Icons.HelpCircle;
                return (
                  <motion.div 
                     key={i}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.1 }}
                     className="space-y-4"
                  >
                    <div className="w-12 h-12 bg-accent-light/10 rounded-xl flex items-center justify-center">
                      <IconComponent className="text-accent-light" size={24} />
                    </div>
                    <h4 className="text-xl font-bold text-card-foreground transition-colors duration-300">{benefit.title}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground transition-colors duration-300">
                      {benefit.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
