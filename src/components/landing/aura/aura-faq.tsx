import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { siteConfig } from "../../../config/site";

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function AuraFaq() {
  const data = siteConfig.sections.faq;
  const items = data?.items ?? [];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const title = data?.title ?? "";
  const subtitle = data?.subtitle ?? "";

  const handleToggle = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-24 bg-card scroll-mt-6 border-b border-border/50">
      <div className="container mx-auto px-6 max-w-4xl">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="text-center space-y-4 max-w-2xl mx-auto mb-14"
        >
          <div className="inline-flex items-center justify-center space-x-1.5 text-xs font-semibold tracking-widest text-accent uppercase">
            <HelpCircle size={14} />
            <span>{subtitle}</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground leading-tight">
            {title}
          </h2>
          <div className="h-0.5 w-12 bg-accent mx-auto" />
        </motion.div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const isOpen = activeIndex === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: index * 0.06, ease: EASE_OUT_EXPO }}
                className="rounded-2xl border border-border bg-card overflow-hidden transition-[border-color,box-shadow] duration-250"
                style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              >
                <button
                  onClick={() => handleToggle(index)}
                  className="w-full flex items-center justify-between text-left p-5 md:p-6 cursor-pointer select-none group min-h-[56px]"
                  aria-expanded={isOpen}
                >
                  <span className="line-clamp-2 font-serif text-base md:text-lg text-foreground transition-colors duration-200 pr-4 group-hover:text-accent">
                    {item.question}
                  </span>
                  <div
                    className={`h-8 w-8 rounded-full border border-border bg-secondary flex items-center justify-center text-foreground shrink-0 transition-[transform,background-color,border-color,color] duration-250 ${
                      isOpen ? "bg-foreground border-foreground text-background rotate-180" : ""
                    }`}
                    style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                  >
                    <ChevronDown size={14} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                    >
                      <div className="p-5 md:p-6 pt-0 border-t border-border/40 text-xs md:text-sm text-muted-foreground leading-relaxed font-sans">
                        <p>{item.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
