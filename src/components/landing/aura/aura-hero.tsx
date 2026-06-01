import { motion } from "motion/react";
import { Sparkles, ArrowRight, ArrowDown, MapPin, Calendar } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { useLanguage } from "../../../contexts/LanguageContext";
import { nicheFadeUp, nicheStagger, EASE_OUT_STRONG } from "../../../lib/motion";

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface Props {
  onBookClick: (serviceId?: string) => void;
}

function buildTitle() {
  const { hero } = siteConfig;
  if (hero.titleParts && hero.titleParts.length > 0) {
    return hero.titleParts;
  }
  return [
    { text: hero.titlePrefix, italic: false },
    { text: hero.titleHighlight, italic: true, color: "accent" },
    { text: hero.titleSuffix, italic: false },
  ].filter((p) => p.text);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_EXPO } },
};

const photoVariants = {
  hidden: { opacity: 0, scale: 0.97, x: 16 },
  visible: { opacity: 1, scale: 1, x: 0, transition: { duration: 0.8, ease: EASE_OUT_EXPO } },
};

export function AuraHero({ onBookClick }: Props) {
  const { language } = useLanguage();
  const { hero, contact, brand } = siteConfig;

  const titleParts = buildTitle();
  const description = hero.description ?? hero.subtitle;
  const stats = hero.stats ?? [];
  const eyebrow = hero.eyebrow ?? "";
  const address = [contact.address.street, contact.address.district, contact.address.cityStateZip]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      id="inicio"
      className="relative min-h-[92vh] flex items-center justify-center pt-20 pb-10 sm:pt-24 sm:pb-16 md:py-28 overflow-hidden bg-background"
    >
      {/* Decorative blur circles */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-muted/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-secondary/35 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">

          {/* Left column — copy */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 space-y-5 md:space-y-8"
          >
            {eyebrow && (
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center space-x-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 backdrop-blur-xs"
              >
                <Sparkles size={14} className="text-accent animate-pulse" />
                <span className="text-xs font-semibold tracking-widest text-accent uppercase font-sans">
                  {eyebrow}
                </span>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-foreground font-medium tracking-tight leading-[1.1]">
                {titleParts.map((part, i) => {
                  const isLast = i === titleParts.length - 1;
                  const cls = part.italic
                    ? "italic text-accent"
                    : "";
                  return (
                    <span key={i} className={`${cls} ${isLast ? "block mt-1" : ""}`}>
                      {part.text}{!isLast && " "}
                    </span>
                  );
                })}
              </h1>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3 md:gap-4 z-20 relative"
            >
              <button
                onClick={() => onBookClick()}
                id="hero-cta-booking"
                className="inline-flex items-center justify-center space-x-2.5 rounded-xl bg-foreground px-7 py-3.5 text-sm font-semibold tracking-wide text-background shadow-elevated cursor-pointer min-h-[48px] active:scale-[0.97] transition-[transform,background-color] duration-200"
                style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              >
                <Calendar size={16} />
                <span>{hero.ctaPrimary}</span>
                <ArrowRight size={15} />
              </button>

              <a
                href="#servicios"
                id="hero-cta-services"
                className="inline-flex items-center justify-center space-x-2 rounded-xl border border-border bg-card/70 px-7 py-3.5 text-sm font-semibold tracking-wide text-foreground min-h-[48px] active:scale-[0.97] transition-[transform,background-color] duration-200"
                style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              >
                <span>{hero.ctaSecondary}</span>
              </a>
            </motion.div>

            {/* Mobile banner */}
            <motion.div
              variants={itemVariants}
              className="relative block lg:hidden my-2 z-10"
            >
              <div className="absolute inset-1 border border-border rounded-xl transform translate-x-1 translate-y-1 pointer-events-none z-0" />
              <div className="relative rounded-xl overflow-hidden aspect-[21/9] shadow-elevated border-2 border-card z-10 bg-secondary">
                <img
                  src={hero.backgroundImage}
                  alt={brand.name}
                  className="w-full h-full object-cover select-none scale-[1.02]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[8px] font-semibold tracking-widest text-background uppercase drop-shadow-sm">
                  <div className="flex items-center space-x-1">
                    <MapPin size={9} className="text-accent" />
                    <span>{contact.address.district || contact.address.cityStateZip}</span>
                  </div>
                  <span className="text-[7px] tracking-wider text-background/80 bg-black/30 px-1.5 py-0.5 rounded-full backdrop-blur-[1px]">
                    {brand.name}
                  </span>
                </div>
              </div>
            </motion.div>

            {description && (
              <motion.div variants={itemVariants}>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl font-normal leading-relaxed">
                  {description}
                </p>
              </motion.div>
            )}

            {stats.length > 0 && (
              <motion.div
                variants={itemVariants}
                className="pt-6 border-t border-border/80 flex flex-wrap gap-8 md:gap-12 text-left"
              >
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <span className="block font-serif text-3xl font-medium text-foreground">
                      {stat.value}
                    </span>
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Desktop visual — right column */}
          <motion.div
            variants={photoVariants}
            initial="hidden"
            animate="visible"
            className="hidden lg:block lg:col-span-5 relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-secondary/40 to-muted/10 rounded-[100px_100px_40px_40px] blur-xl pointer-events-none" />

            <div className="relative aspect-[3/4] rounded-t-full overflow-hidden shadow-floating border-[6px] border-card z-10 bg-secondary group">
              <img
                src={hero.backgroundImage}
                alt={brand.name}
                className="w-full h-full object-cover select-none transition-transform duration-700"
                style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-60" />
            </div>

            {/* Location card */}
            <div className="absolute -bottom-4 -left-6 z-20 bg-card/95 backdrop-blur-md shadow-elevated rounded-2xl p-5 max-w-[220px] border border-border">
              <span className="block text-[9px] font-bold tracking-widest text-accent uppercase">
                {contact.address.district
                  ? `${contact.address.district} · ${contact.address.cityStateZip}`
                  : contact.address.cityStateZip}
              </span>
              <p className="font-serif text-sm text-foreground mt-1">{brand.tagline}</p>
              <div className="h-[1.5px] w-8 bg-accent/60 mt-3.5" />
            </div>

            {/* Decorative bracket */}
            <div className="absolute -top-6 -right-6 w-28 h-28 border-t border-r border-accent/40 rounded-tr-[40px] pointer-events-none z-0" />
            <div className="absolute -top-4 -right-1 flex items-center space-x-1.5 text-accent/70 z-10 select-none">
              <span className="font-sans text-[8px] font-semibold tracking-widest uppercase">
                {eyebrow || brand.name}
              </span>
              <Sparkles size={9} className="animate-spin-slow" />
            </div>
          </motion.div>

        </div>

        {/* Scroll indicator */}
        <div className="hidden md:flex justify-center mt-12">
          <motion.a
            href="#servicios"
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center space-y-1.5 text-muted-foreground/40 transition-colors duration-200 hover:text-foreground pointer-events-auto"
          >
            <span className="text-[10px] font-semibold tracking-widest uppercase">
              {hero.ctaSecondary}
            </span>
            <ArrowDown size={14} className="text-accent/60" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}
