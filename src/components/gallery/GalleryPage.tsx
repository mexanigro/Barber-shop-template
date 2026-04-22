import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Maximize2, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import { cn } from "../../lib/utils";

export function GalleryPage({ onBack }: { onBack: () => void }) {
  const { gallery, sections } = siteConfig;
  const { gallery: sectionConfig } = sections;
  const [selectedImage, setSelectedImage] = React.useState<number | null>(null);

  const nextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % gallery.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + gallery.length) % gallery.length);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImage === null) return;
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") setSelectedImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-24 text-foreground transition-colors duration-300 sm:px-6">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <button
              onClick={onBack}
              className="group mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              {localeConfig.galleryPage.backHome}
            </button>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-black uppercase leading-none tracking-tighter text-foreground sm:text-6xl md:text-7xl"
            >
              {sectionConfig.subtitle}
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex w-fit shrink-0 items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light/10 text-accent-light">
              <Camera size={20} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-foreground">
                {interpolate(localeConfig.galleryPage.worksMeta, { count: gallery.length })}
              </p>
              <p className="text-xs text-muted-foreground">{localeConfig.galleryPage.inPortfolio}</p>
            </div>
          </motion.div>
        </div>

        {/* ── Masonry grid ────────────────────────────────────────── */}
        <div className="columns-2 gap-3 space-y-3 sm:gap-4 sm:space-y-4 lg:columns-3 lg:gap-4 lg:space-y-4 xl:columns-4">
          {gallery.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.04, 0.35) }}
              className="group relative cursor-zoom-in overflow-hidden break-inside-avoid rounded-2xl border border-border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated lg:rounded-3xl"
              onClick={() => setSelectedImage(i)}
            >
              <img
                src={src}
                className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                alt={interpolate(localeConfig.gallery.portfolioAlt, { n: i + 1 })}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              {/* Hover overlay — desktop only */}
              <div className="absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-black/75 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-400 group-hover:opacity-100 sm:flex sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    {interpolate(localeConfig.gallery.workNumber, {
                      n: String(i + 1).padStart(2, "0"),
                    })}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
                    <Maximize2 size={13} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Mobile: always-visible expand icon */}
              <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm sm:hidden">
                <Maximize2 size={10} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 p-3 backdrop-blur-xl sm:p-6 md:p-10"
            onClick={() => setSelectedImage(null)}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              aria-label={localeConfig.a11y.close}
              className={cn(
                "absolute right-3 top-3 z-10 flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl",
                "bg-muted text-foreground transition-all hover:bg-secondary sm:rounded-full sm:bg-transparent sm:p-2 sm:text-muted-foreground sm:hover:bg-muted sm:hover:text-foreground"
              )}
            >
              <X size={22} />
            </button>

            {/* Desktop arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              type="button"
              aria-label={localeConfig.a11y.previous}
              className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full p-3 text-foreground/50 transition-all hover:bg-muted hover:text-foreground md:flex"
            >
              <ChevronLeft size={36} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              type="button"
              aria-label={localeConfig.a11y.next}
              className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full p-3 text-foreground/50 transition-all hover:bg-muted hover:text-foreground md:flex"
            >
              <ChevronRight size={36} />
            </button>

            {/* Image */}
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border/20 shadow-2xl sm:rounded-3xl"
              style={{ maxHeight: "calc(100vh - 120px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={gallery[selectedImage]}
                className="h-full w-full object-contain"
                alt={interpolate(localeConfig.gallery.portfolioAlt, { n: selectedImage + 1 })}
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-5 sm:p-7">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-light">
                  {localeConfig.galleryPage.portfolioLabel}
                </p>
                <p className="text-base font-black uppercase tracking-tight text-white sm:text-xl">
                  {siteConfig.brand.name}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {interpolate(localeConfig.galleryPage.counterOf, {
                    current: selectedImage + 1,
                    total: gallery.length,
                  })}
                </p>
              </div>
            </motion.div>

            {/* Mobile nav bar */}
            <div className="mt-4 flex items-center gap-6 md:hidden">
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                type="button"
                aria-label={localeConfig.a11y.previous}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-all active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-semibold text-muted-foreground">
                {interpolate(localeConfig.galleryPage.counterSlash, {
                  current: selectedImage + 1,
                  total: gallery.length,
                })}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                type="button"
                aria-label={localeConfig.a11y.next}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-all active:scale-95"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
