import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Clock, ChevronDown, ChevronUp, CalendarRange, Heart } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { nicheFadeUp, nicheStagger } from "../../../lib/motion";
import type { Service } from "../../../types";

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];
const NICHE = "estetica" as const;

interface Props {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
}

function deriveFilters(services: Service[], configured?: string[]): string[] {
  if (configured && configured.length > 0) return configured;
  const cats = Array.from(new Set(services.map((s) => s.category).filter(Boolean))) as string[];
  return cats;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatPrice(price: number, currency = "ils"): string {
  const symbol = currency === "ils" ? "₪" : currency === "usd" ? "$" : currency === "eur" ? "€" : currency.toUpperCase();
  return `${symbol}${price.toLocaleString()}`;
}

function getCategoryBadgeClass(category: string, index: number): { bg: string; border: string } {
  const palette: Array<{ bg: string; border: string }> = [
    { bg: "bg-muted text-accent", border: "border-border" },
    { bg: "bg-secondary text-muted-foreground", border: "border-border" },
    { bg: "bg-background text-accent", border: "border-border" },
  ];
  const hash = Array.from(category).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function AuraServices({ onBookClick, onNavigateToServices }: Props) {
  const { services, sections, payment } = siteConfig;
  const servicesSection = sections.services;

  const filters = deriveFilters(services, servicesSection.filters);
  const allCategories: string[] = ["all", ...filters];

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const images: string[] = servicesSection.images ?? [];

  const filteredServices = activeCategory === "all"
    ? services
    : services.filter((s) => s.category === activeCategory);

  const toggleExpand = (id: string) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const currency = payment.currency ?? "ils";
  const ctaLabel = servicesSection.ctaLabel ?? localeConfig.buttons.bookNow;

  const sectionFadeUp = nicheFadeUp(NICHE);
  const stagger = nicheStagger(NICHE);

  return (
    <section
      id="servicios"
      className="py-20 md:py-28 bg-background scroll-mt-6 border-b border-border/50"
    >
      <div className="container mx-auto px-6 max-w-7xl">

        {/* Section header */}
        <motion.div
          {...sectionFadeUp}
          className="text-center space-y-4 max-w-2xl mx-auto mb-16"
        >
          <div className="inline-flex items-center justify-center space-x-1.5 text-xs font-semibold tracking-widest text-accent uppercase">
            <Sparkles size={14} />
            <span>{servicesSection.eyebrow ?? servicesSection.title}</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-foreground leading-tight">
            {servicesSection.title}
          </h2>
          <div className="h-0.5 w-12 bg-accent/60 mx-auto" />
          {servicesSection.subtitle && (
            <p className="text-sm text-muted-foreground">
              {servicesSection.description ?? servicesSection.subtitle}
            </p>
          )}
        </motion.div>

        {/* Category tabs */}
        {filters.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12 sm:mb-16">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setExpandedCardId(null);
                }}
                className={`rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide uppercase select-none cursor-pointer min-h-[44px] active:scale-[0.97] transition-[transform,background-color,color,box-shadow] duration-200 ${
                  activeCategory === cat
                    ? "bg-foreground text-background shadow-elevated"
                    : "bg-muted text-muted-foreground"
                }`}
                style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        )}

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, index) => {
              const globalIndex = services.indexOf(service);
              const image = images[globalIndex] ?? "";
              const isExpanded = expandedCardId === service.id;
              const badgeClass = service.category
                ? getCategoryBadgeClass(service.category, index)
                : { bg: "bg-muted text-muted-foreground", border: "border-border" };
              const benefits = service.features ?? [];

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4, delay: stagger(index), ease: EASE_OUT_EXPO }}
                  key={service.id}
                  className="group flex flex-col h-full rounded-2xl border border-border bg-card shadow-soft overflow-hidden relative transition-[box-shadow,border-color] duration-300"
                  style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                  onMouseEnter={(e) => {
                    if (window.matchMedia("(hover: hover)").matches) {
                      e.currentTarget.style.boxShadow = "var(--shadow-elevated)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  {/* Image */}
                  {image && (
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      <img
                        src={image}
                        alt={service.name}
                        className="w-full h-full object-cover transition-transform duration-700 select-none group-hover:scale-[1.03]"
                        style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                        referrerPolicy="no-referrer"
                      />
                      {service.category && (
                        <span
                          className={`absolute top-4 left-4 border text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full backdrop-blur-xs ${badgeClass.bg} ${badgeClass.border}`}
                        >
                          {service.category}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-6 md:p-7 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                        <span className="flex items-center">
                          <Clock size={12} className="mr-1" />
                          {formatDuration(service.duration)}
                        </span>
                        <span className="flex items-center font-bold text-accent font-sans tracking-wide">
                          {service.fromPrice
                            ? `from ${service.fromPrice}`
                            : formatPrice(service.price, currency)}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg md:text-xl text-foreground transition-colors duration-200 leading-snug">
                        {service.name}
                      </h3>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {service.description}
                      </p>
                    </div>

                    {/* Expandable benefits */}
                    {benefits.length > 0 && (
                      <div className="pt-2 border-t border-border mt-4">
                        <button
                          onClick={() => toggleExpand(service.id)}
                          className="w-full py-1.5 flex justify-between items-center text-xs font-semibold text-accent transition-colors duration-200 uppercase tracking-widest select-none cursor-pointer min-h-[44px] hover:text-foreground"
                        >
                          <span>
                            {isExpanded
                              ? "Hide clinical details"
                              : "View clinical details"}
                          </span>
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                              className="overflow-hidden"
                            >
                              <div className="py-3 space-y-3">
                                <h4 className="text-[10px] font-semibold text-foreground tracking-wider uppercase flex items-center">
                                  <Heart size={10} className="mr-1.5 text-accent/60" />
                                  Main Benefits:
                                </h4>
                                <ul className="space-y-2 pl-1.5">
                                  {benefits.map((benefit, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start">
                                      <span className="h-1.5 w-1.5 rounded-full bg-accent/60 mt-1.5 mr-2 shrink-0" />
                                      <span>{benefit}</span>
                                    </li>
                                  ))}
                                </ul>
                                <div className="rounded-xl bg-muted/60 p-2.5 text-[10px] text-muted-foreground italic border border-border/50 mt-2">
                                  * An initial consultation is recommended to tailor the exact protocol to your needs.
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <button
                      onClick={() => onBookClick(service.id)}
                      className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-foreground py-3 text-xs font-semibold tracking-wider text-background cursor-pointer min-h-[48px] active:scale-[0.97] transition-[transform,background-color] duration-200"
                      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                    >
                      <CalendarRange size={14} />
                      <span>{ctaLabel}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom CTA row */}
        {onNavigateToServices && (
          <div className="flex justify-center mt-14">
            <button
              onClick={onNavigateToServices}
              className="inline-flex items-center space-x-2 rounded-full border border-border px-8 py-3 text-xs font-semibold tracking-widest uppercase text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer min-h-[48px]"
            >
              <span>{servicesSection.ctaLabel ?? "Explore all services"}</span>
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
