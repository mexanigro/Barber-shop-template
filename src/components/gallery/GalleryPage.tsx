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

  // Handle keyboard navigation
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
    <div className="min-h-screen bg-background px-6 pb-20 pt-24 text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div>
            <button 
              onClick={onBack}
              className="group mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Return to Base
            </button>
            <h1 className="mb-4 text-5xl font-black uppercase leading-none tracking-tighter text-foreground md:text-7xl">
              Visual <span className="text-accent-light">Manifest</span>
            </h1>
            <p className="max-w-xl text-sm font-medium uppercase leading-relaxed tracking-widest text-muted-foreground">
              {sectionConfig.title}: {sectionConfig.subtitle} - A comprehensive documentation of operational excellence.
            </p>
          </div>
          <div className="glass-panel flex items-center gap-4 rounded-2xl p-4">
             <div className="w-10 h-10 bg-accent-light/10 rounded-xl flex items-center justify-center text-accent-light">
                <Camera size={20} />
             </div>
             <div>
                <p className="text-sm font-black uppercase tracking-tight text-foreground">{gallery.length} DEPLOYMENTS</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">In Archive</p>
             </div>
          </div>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {gallery.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group relative cursor-zoom-in overflow-hidden rounded-3xl break-inside-avoid shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              onClick={() => setSelectedImage(i)}
            >
              <img
                src={src}
                className="h-auto w-full contrast-[1.02] saturate-[1.03] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                alt={`Operational Documentation ${i + 1}`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                 <div className="flex items-center justify-between">
                    <div>
                       <p className="text-accent-light text-[8px] font-black uppercase tracking-widest mb-1">Sector 0{i + 1}</p>
                       <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white drop-shadow-md">Visual Record</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md">
                       <Maximize2 size={14} />
                    </div>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl transition-colors duration-300 md:p-10 dark:bg-background/90"
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute right-6 top-6 rounded-full p-3 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <X size={32} />
            </button>

            <button 
              onClick={prevImage}
              type="button"
              className="absolute left-6 top-1/2 hidden -translate-y-1/2 rounded-full p-4 text-white/70 transition-all hover:bg-white/10 hover:text-white md:block"
            >
              <ChevronLeft size={40} />
            </button>

            <button 
              onClick={nextImage}
              type="button"
              className="absolute right-6 top-1/2 hidden -translate-y-1/2 rounded-full p-4 text-white/70 transition-all hover:bg-white/10 hover:text-white md:block"
            >
              <ChevronRight size={40} />
            </button>

            <motion.div
              layoutId={gallery[selectedImage]}
              className="relative max-w-5xl w-full max-h-full aspect-auto rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(245,158,11,0.1)] border border-white/5"
            >
              <img
                src={gallery[selectedImage]}
                className="w-full h-full object-contain"
                alt="Selected Documentation"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 bg-gradient-to-t from-black/80 to-transparent">
                 <p className="text-accent-light text-xs font-black uppercase tracking-[0.3em] mb-2">Operational Frame 0{selectedImage + 1}</p>
                 <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">Project Documentation Archive</h2>
                 <p className="mt-2 text-xs uppercase tracking-widest text-white/75">{selectedImage + 1} / {gallery.length} Records</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
