import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Maximize2, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { siteConfig } from "../../config/site";
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
    <div className="min-h-screen bg-background px-3 pb-20 pt-20 text-foreground transition-colors duration-300 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-16 sm:gap-6 md:flex-row md:items-end">
          <div>
            <button
              onClick={onBack}
              className="group mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:mb-6"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              Return to Base
            </button>
            <h1 className="mb-3 text-4xl font-black uppercase leading-none tracking-tighter text-foreground sm:mb-4 sm:text-5xl md:text-7xl">
              Visual <span className="text-accent-light">Manifest</span>
            </h1>
            <p className="max-w-xl text-xs font-medium uppercase leading-relaxed tracking-widest text-muted-foreground sm:text-sm">
              {sectionConfig.title}: {sectionConfig.subtitle} — A comprehensive documentation of operational excellence.
            </p>
          </div>
          <div className="glass-panel flex w-fit items-center gap-4 rounded-2xl p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light/10 text-accent-light">
              <Camera size={20} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-foreground">{gallery.length} DEPLOYMENTS</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">In Archive</p>
            </div>
          </div>
        </div>

        {/*
         * Masonry grid:
         * – Mobile: 2 columns, tight gap → app-like Instagram feel
         * – Tablet: 2–3 columns
         * – Desktop: 3–4 columns
         */}
        <div className="columns-2 gap-1.5 space-y-1.5 sm:columns-2 sm:gap-3 sm:space-y-3 lg:columns-3 lg:gap-4 lg:space-y-4 xl:columns-4">
          {gallery.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="group relative cursor-zoom-in overflow-hidden break-inside-avoid rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated sm:rounded-2xl lg:rounded-3xl"
              onClick={() => setSelectedImage(i)}
            >
              <img
                src={src}
                className="h-auto w-full contrast-[1.02] saturate-[1.03] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                alt={`Gallery ${i + 1}`}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              {/* Hover overlay — hidden on mobile to keep taps clean */}
              <div className="absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:flex sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-0.5 text-[8px] font-black uppercase tracking-widest text-accent-light">Sector 0{i + 1}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white drop-shadow-md">Visual Record</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md">
                    <Maximize2 size={14} />
                  </div>
                </div>
              </div>
              {/* Mobile: always-visible subtle expand indicator */}
              <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm sm:hidden">
                <Maximize2 size={10} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/97 p-2 backdrop-blur-xl transition-colors duration-300 sm:p-6 md:p-10 dark:bg-background/95"
          >
            {/* Close button — large touch target, safe from thumb zone corners */}
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              aria-label="Close"
              className={cn(
                "absolute right-3 top-3 z-10 flex min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl",
                "bg-muted text-foreground transition-all hover:bg-secondary sm:rounded-full sm:bg-transparent sm:p-2 sm:text-muted-foreground sm:hover:bg-muted sm:hover:text-foreground",
              )}
            >
              <X size={22} />
            </button>

            {/* Desktop side-nav arrows (hidden on mobile) */}
            <button
              onClick={prevImage}
              type="button"
              aria-label="Previous"
              className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full p-4 text-foreground/60 transition-all hover:bg-muted hover:text-foreground md:flex"
            >
              <ChevronLeft size={40} />
            </button>
            <button
              onClick={nextImage}
              type="button"
              aria-label="Next"
              className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full p-4 text-foreground/60 transition-all hover:bg-muted hover:text-foreground md:flex"
            >
              <ChevronRight size={40} />
            </button>

            {/* Image */}
            <motion.div
              layoutId={gallery[selectedImage]}
              className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border/30 shadow-2xl sm:rounded-[28px]"
              style={{ maxHeight: "calc(100vh - 120px)" }}
            >
              <img
                src={gallery[selectedImage]}
                className="h-full w-full object-contain"
                alt="Selected"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-5 sm:p-8 md:p-12">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-accent-light sm:mb-2">
                  Operational Frame 0{selectedImage + 1}
                </p>
                <h2 className="text-lg font-black uppercase tracking-tight text-white sm:text-2xl md:text-3xl">
                  Project Documentation Archive
                </h2>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/75 sm:mt-2 sm:text-xs">
                  {selectedImage + 1} / {gallery.length} Records
                </p>
              </div>
            </motion.div>

            {/* Mobile prev/next bottom bar */}
            <div className="mt-4 flex items-center gap-6 md:hidden">
              <button
                onClick={prevImage}
                type="button"
                aria-label="Previous"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-all active:scale-95"
              >
                <ChevronLeft size={22} />
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {selectedImage + 1} / {gallery.length}
              </span>
              <button
                onClick={nextImage}
                type="button"
                aria-label="Next"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-all active:scale-95"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
