import React from "react";
import { Instagram } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { Y_SM, Y_MD, VIEWPORT_ONCE } from "../../lib/motion";
import { resolveVariant } from "../../lib/section-variants";

/**
 * A compact Instagram feed section showing 6 gallery images in an
 * "organized disorder" layout: slightly varied sizes and subtle rotations
 * that feel curated rather than chaotic. Estetica-first design.
 */
const AuraInstagramModule = React.lazy(() => import("./aura/aura-instagram").then(m => ({ default: m.AuraInstagram })));

const InstagramV2Module = React.lazy(() => import("./instagram/instagram-v2").then(m => ({ default: m.InstagramV2 })));
const InstagramV3Module = React.lazy(() => import("./instagram/instagram-v3").then(m => ({ default: m.InstagramV3 })));
const InstagramV4Module = React.lazy(() => import("./instagram/instagram-v4").then(m => ({ default: m.InstagramV4 })));
const InstagramV5Module = React.lazy(() => import("./instagram/instagram-v5").then(m => ({ default: m.InstagramV5 })));

const INSTAGRAM_VARIANT_MODULES = {
  v2: InstagramV2Module,
  v3: InstagramV3Module,
  v4: InstagramV4Module,
  v5: InstagramV5Module,
} as const;

let warnedMissingInstagramVariantData = false;

export function InstagramFeed() {
  const { gallery, contact, sections } = siteConfig;
  const isEstetica = siteConfig.business.type === "estetica";
  const instagramUrl = contact.social.instagram;
  const instagramImages = sections.instagram?.images;

  /* ── 5-variant dispatcher: v2..v5 render dedicated modules (they require
     sections.instagram data); v1 (or any unknown value) falls through to
     the original feed untouched. ─────────────────────────────────────── */
  const variantCode = resolveVariant(sections.instagram?.variant);
  if (variantCode !== "v1") {
    if (instagramImages && instagramImages.length > 0) {
      const VariantComponent = INSTAGRAM_VARIANT_MODULES[variantCode];
      return (
        <React.Suspense fallback={null}>
          <VariantComponent />
        </React.Suspense>
      );
    }
    if (import.meta.env.DEV && !warnedMissingInstagramVariantData) {
      warnedMissingInstagramVariantData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[InstagramFeed] sections.instagram.variant="${variantCode}" but sections.instagram.images is empty — falling back to the default feed.`,
      );
    }
  }

  if (sections.instagram?.instagramVariant === "aura") {
    return <React.Suspense fallback={null}><AuraInstagramModule /></React.Suspense>;
  }

  // Prefer dedicated instagram images, fallback to gallery
  const feedImages = React.useMemo(() => {
    const source = instagramImages && instagramImages.length > 0 ? instagramImages : gallery;
    if (!source || source.length === 0) return [];
    if (source.length <= 6) return source.slice(0, 6);
    const step = Math.floor(source.length / 6);
    return Array.from({ length: 6 }, (_, i) => source[i * step]);
  }, [instagramImages, gallery]);

  if (feedImages.length === 0 || !instagramUrl) return null;

  // Each image gets a subtle, predetermined rotation + size variation
  // to create the "ordered disorder" the user wants.
  const variations: { rotate: string; span: string; translate: string }[] = [
    { rotate: "-rotate-1", span: "col-span-1 row-span-1", translate: "translate-y-1" },
    { rotate: "rotate-[1.5deg]", span: "col-span-1 row-span-1", translate: "-translate-y-0.5" },
    { rotate: "-rotate-[0.8deg]", span: "col-span-1 row-span-1", translate: "translate-y-2" },
    { rotate: "rotate-1", span: "col-span-1 row-span-1", translate: "-translate-y-1" },
    { rotate: "-rotate-[1.3deg]", span: "col-span-1 row-span-1", translate: "translate-y-0.5" },
    { rotate: "rotate-[0.6deg]", span: "col-span-1 row-span-1", translate: "-translate-y-1.5" },
  ];

  return (
    <section className="flex flex-col justify-center bg-background px-5 py-8 transition-colors duration-300 sm:px-6 sm:py-20 lg:block">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          className="mb-10 text-center"
        >
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 text-muted-foreground transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
          >
            <Instagram size={18} className="text-accent-light" />
            <span className={cn(
              "text-xs font-bold uppercase tracking-[0.25em]",
              isEstetica ? "font-medium tracking-[0.3em]" : "",
            )}>
              {localeConfig.lang === "he" ? "עקבו אחרינו באינסטגרם" : localeConfig.lang === "ar" ? "تابعونا على إنستغرام" : localeConfig.lang === "ru" ? "Подпишитесь на нас в Instagram" : "Follow Us on Instagram"}
            </span>
          </a>
        </motion.div>

        {/* Photo grid — 3 columns x 2 rows, each image slightly off-axis */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 sm:gap-4"
        >
          {feedImages.map((src, i) => (
            <a
              key={i}
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group relative overflow-hidden rounded-lg border border-border bg-muted hover:border-accent/30 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]",
                variations[i].rotate,
                variations[i].translate,
                variations[i].span,
              )}
            >
              <img
                src={src}
                alt={`Instagram post ${i + 1}`}
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                loading="lazy"
                onError={handleImgError}
              />
              {/* Hover overlay with Instagram icon */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/30">
                <Instagram
                  size={22}
                  className="text-white opacity-0 transition-all duration-300 group-hover:opacity-100"
                />
              </div>
            </a>
          ))}
        </motion.div>

        {/* Subtle CTA */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-accent-light"
          >
            <span className="truncate">
              {localeConfig.lang === "he" ? `@${extractHandle(instagramUrl)}` : `@${extractHandle(instagramUrl)}`}
            </span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/** Extract the Instagram handle from a full URL. */
function extractHandle(url: string): string {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "");
    return pathname.split("/").pop() ?? "instagram";
  } catch {
    return "instagram";
  }
}
