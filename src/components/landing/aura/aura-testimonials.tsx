import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Quote, ChevronLeft, ChevronRight, MessageSquareHeart } from "lucide-react";
import { siteConfig } from "../../../config/site";
import type { Testimonial } from "../../../types";

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function AuraTestimonials() {
  const testimonials: Testimonial[] = siteConfig.testimonials ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);

  if (testimonials.length === 0) return null;

  const { title, subtitle } = siteConfig.sections.testimonials;
  const curr = testimonials[currentIndex];

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <section id="testimonios" className="py-20 md:py-24 bg-muted/60 border-b border-border/50">
      <div className="container mx-auto px-6 max-w-5xl">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="text-center space-y-3 max-w-2xl mx-auto mb-14"
        >
          <div className="inline-flex items-center space-x-1.5 text-xs font-semibold tracking-widest text-accent uppercase">
            <MessageSquareHeart size={14} />
            <span>{subtitle}</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground leading-tight">
            {title}
          </h2>
          <div className="h-0.5 w-10 bg-accent mx-auto" />
        </motion.div>

        {/* Testimonial card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="relative bg-card border border-border rounded-2xl p-8 md:p-14 shadow-elevated overflow-hidden"
        >

          <div className="absolute top-6 right-8 text-border/40 pointer-events-none select-none">
            <Quote size={120} strokeWidth={1} className="rotate-180 opacity-60" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="relative z-10 space-y-6 md:space-y-8"
            >
              <div className="flex space-x-1.5 justify-center md:justify-start">
                {[...Array(curr.rating)].map((_, i) => (
                  <Star key={i} size={16} className="fill-accent text-accent" />
                ))}
              </div>

              <blockquote className="font-serif text-lg md:text-2xl text-foreground font-normal leading-relaxed text-center md:text-left italic">
                "{curr.text}"
              </blockquote>

              <div className="flex flex-col md:flex-row items-center md:justify-between pt-6 border-t border-border/40 gap-4">
                <div className="text-center md:text-left">
                  <span className="block text-sm font-bold text-foreground">{curr.name}</span>
                </div>

                {curr.title && (
                  <div className="inline-flex items-center space-x-2 rounded-full border border-border bg-secondary px-4 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {curr.title}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-center md:justify-start space-x-4 mt-8 md:absolute md:bottom-14 md:right-14 md:mt-0 z-20">
            <button
              onClick={prevTestimonial}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/50 text-foreground cursor-pointer min-h-[44px] min-w-[44px] active:scale-[0.95] transition-[transform,border-color,background-color] duration-200"
              style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextTestimonial}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/50 text-foreground cursor-pointer min-h-[44px] min-w-[44px] active:scale-[0.95] transition-[transform,border-color,background-color] duration-200"
              style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              aria-label="Next testimonial"
            >
              <ChevronRight size={18} />
            </button>
          </div>

        </motion.div>

        {/* Dots */}
        <div className="flex justify-center space-x-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-[width,background-color] duration-300 ${
                currentIndex === i ? "w-6 bg-accent" : "w-2 bg-secondary"
              }`}
              style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
