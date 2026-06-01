import { useMemo } from "react";
import { motion } from "motion/react";
import { Instagram, Heart, MessageCircle } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";

function getCtaLabel(): string {
  switch (localeConfig.lang) {
    case "he": return "עקבו אחרינו באינסטגרם";
    case "ar": return "تابعونا على إنستغرام";
    case "ru": return "Подпишитесь на нас в Instagram";
    default:   return "Follow Us on Instagram";
  }
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function AuraInstagram() {
  const { gallery, sections } = siteConfig;
  const instagramSection = sections.instagram;

  const feedImages = useMemo(() => {
    const source =
      instagramSection?.images && instagramSection.images.length > 0
        ? instagramSection.images
        : gallery;
    if (!source || source.length === 0) return [];
    const capped = source.slice(0, 6);
    return capped;
  }, [instagramSection?.images, gallery]);

  if (feedImages.length === 0) return null;

  const title = instagramSection?.title ?? "";
  const handle = instagramSection?.handle ?? "";
  const url = instagramSection?.url ?? `https://instagram.com/${handle.replace(/^@/, "")}`;
  const ctaLabel = getCtaLabel();

  return (
    <section id="instagram" className="py-20 md:py-24 bg-muted/40 border-b border-border/50">
      <div className="container mx-auto px-6 max-w-7xl">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="text-center space-y-3 max-w-2xl mx-auto mb-12"
        >
          {handle && (
            <div className="inline-flex items-center justify-center space-x-1.5 text-xs font-semibold tracking-widest text-accent uppercase">
              <Instagram size={14} />
              <span>{handle}</span>
            </div>
          )}
          {title && (
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground leading-tight">
              {title}
            </h2>
          )}
          <div className="h-0.5 w-10 bg-accent mx-auto" />
        </motion.div>

        {/* Grid with staggered entrance */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
          {feedImages.map((src, index) => (
            <motion.div
              key={src + index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: index * 0.06, ease: EASE_OUT_EXPO }}
              className="group relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm bg-card cursor-pointer"
            >
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 select-none group-hover:scale-105"
                style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                referrerPolicy="no-referrer"
              />

              {/* Hover overlay */}
              <div
                className="absolute inset-0 bg-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex flex-col justify-end p-4 z-10 text-background pointer-events-none"
                style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
              >
                <div className="flex items-center justify-start space-x-4 text-[11px] font-semibold text-background/80">
                  <span className="flex items-center leading-none">
                    <Heart size={12} className="mr-1 fill-background/60 text-background/60" />
                  </span>
                  <span className="flex items-center leading-none">
                    <MessageCircle size={12} className="mr-1 text-background/60" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-10 md:mt-12">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-xs font-semibold tracking-widest text-foreground border border-border rounded-xl px-6 py-3 shadow-sm uppercase min-h-[48px] cursor-pointer active:scale-[0.97] transition-[transform,background-color,color] duration-200 hover:bg-foreground hover:text-background"
            style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
          >
            <Instagram size={14} />
            <span>{ctaLabel}</span>
          </a>
        </div>

      </div>
    </section>
  );
}
