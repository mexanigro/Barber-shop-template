import React from "react";
import { motion } from "motion/react";
import { Award, HeartHandshake, HelpCircle } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import { VIEWPORT_ONCE, Y_MD } from "../../../lib/motion";

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface Props {
  onNavigateToAbout?: () => void;
}

export function AuraWhyChooseUs({ onNavigateToAbout: _onNavigateToAbout }: Props) {
  const { sections } = siteConfig;
  const { whyChooseUs: section } = sections;

  if (!section?.benefits) return null;

  return (
    <section
      id="why-choose-us"
      className="scroll-mt-6 border-b border-border/50 bg-card py-20 md:py-28"
    >
      <div className="container mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">

          {/* Left block */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="space-y-6 lg:col-span-5"
          >
            {/* Badge */}
            <div className="inline-flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
              <Award size={14} />
              <span>{section.badge}</span>
            </div>

            {/* Title */}
            <h2 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {section.title}
            </h2>

            {/* Divider */}
            <div className="h-0.5 w-12 bg-accent/60" />

            {/* Guarantee card — badge as heading, subtitle as body */}
            <div className="flex items-start space-x-4 rounded-2xl border border-border bg-background p-5 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
                <HeartHandshake size={20} />
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-bold uppercase tracking-wide text-foreground">
                  {section.badge}
                </span>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {section.subtitle}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: 2x2 card grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8">
              {section.benefits.map((benefit, index) => {
                const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
                return (
                  <motion.div
                    key={`${benefit.title.slice(0, 20)}-${index}`}
                    initial={{ opacity: 0, y: Y_MD }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.08,
                      ease: EASE_OUT_EXPO,
                    }}
                    whileHover={{ y: -4 }}
                    className="group space-y-3.5 rounded-2xl border border-border bg-muted/30 p-5 transition-[box-shadow,border-color,background-color] duration-250 hover:border-border/80 hover:bg-background hover:shadow-md md:p-6"
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm text-accent transition-transform duration-250">
                      <IconComponent size={22} />
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-base font-medium leading-snug text-foreground">
                      {benefit.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs leading-relaxed text-muted-foreground">
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
