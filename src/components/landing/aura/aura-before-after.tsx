import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Eye, Info } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import type { BeforeAfterCase } from "../../../types";

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function AuraBeforeAfter() {
  const beforeAfterConfig = siteConfig.sections.beforeAfter;
  const cases: BeforeAfterCase[] = beforeAfterConfig?.cases ?? [];

  const [sliderPosition, setSliderPosition] = useState(50);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const activeCase = cases[activeCaseIndex];

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handlePointerDown = () => {
    isDragging.current = true;
  };

  useEffect(() => {
    const handlePointerUp = () => { isDragging.current = false; };
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);
    return () => {
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!cases.length || !activeCase) return null;

  const beforeLabel = localeConfig.hero.sliderCueBefore;
  const afterLabel = localeConfig.hero.sliderCueAfter;

  return (
    <section
      id="antes-despues"
      className="py-20 md:py-28 bg-background scroll-mt-6 border-b border-border/50"
    >
      <div className="container mx-auto px-6 max-w-7xl">

        {/* Section header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="lg:col-span-6 space-y-4"
          >
            <div className="inline-flex items-center space-x-1.5 text-xs font-semibold tracking-widest text-accent uppercase">
              <Eye size={14} />
              <span>{beforeAfterConfig?.title}</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl text-foreground leading-tight">
              {beforeAfterConfig?.subtitle}
            </h2>

            <div className="h-0.5 w-12 bg-accent/60" />
          </motion.div>

          {/* Case switcher buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT_EXPO }}
            className="lg:col-span-6 flex flex-col md:flex-row gap-4 items-stretch justify-end"
          >
            {cases.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveCaseIndex(index);
                  setSliderPosition(50);
                }}
                className={`flex-1 text-left p-4 rounded-xl border cursor-pointer min-h-[44px] active:scale-[0.98] transition-[border-color,background-color,box-shadow,transform] duration-200 ${
                  activeCaseIndex === index
                    ? "bg-card border-accent/50 text-foreground shadow-md"
                    : "bg-card border-border text-muted-foreground"
                }`}
                style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
              >
                <span className="block text-[10px] font-bold tracking-widest uppercase text-accent mb-1">
                  {index + 1}
                </span>
                <span className="font-serif block text-sm font-medium leading-snug">
                  {item.title}
                </span>
              </button>
            ))}
          </motion.div>
        </div>

        {/* Comparison slider + details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          {/* Slider image */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="relative w-full max-w-2xl select-none">

              <div className="absolute top-4 left-4 right-4 text-center z-20 pointer-events-none">
                <span className="bg-foreground/70 backdrop-blur-sm text-[10px] text-card px-3 py-1.5 rounded-full font-semibold uppercase tracking-widest">
                  {localeConfig.hero.sliderThumb}
                </span>
              </div>

              <div
                ref={containerRef}
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
                className="relative overflow-hidden aspect-[4/3] rounded-2xl shadow-lg border border-border select-none cursor-ew-resize"
              >
                {/* Before image (background) */}
                <img
                  src={activeCase.imageBefore}
                  alt={beforeLabel}
                  className="absolute inset-0 w-full h-full object-cover select-none"
                  referrerPolicy="no-referrer"
                />

                <span className="absolute bottom-4 left-4 z-10 bg-foreground text-background text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg">
                  {beforeLabel}
                </span>

                {/* After image (clipped overlay) */}
                <div
                  style={{ width: `${sliderPosition}%` }}
                  className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-accent"
                >
                  <div
                    className="absolute inset-0 h-full"
                    style={{ width: containerRef.current?.getBoundingClientRect().width }}
                  >
                    <img
                      src={activeCase.imageAfter}
                      alt={afterLabel}
                      className="absolute inset-0 object-cover select-none"
                      style={{
                        width: containerRef.current?.getBoundingClientRect().width,
                        height: containerRef.current?.getBoundingClientRect().height,
                        maxWidth: "none",
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <span className="absolute bottom-4 right-4 z-10 bg-accent text-background text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg">
                    {afterLabel}
                  </span>
                </div>

                {/* Drag handle — 44px touch target */}
                <div
                  style={{ left: `${sliderPosition}%` }}
                  className="absolute inset-y-0 -ml-[22px] w-[44px] flex items-center justify-center z-10 cursor-ew-resize"
                >
                  <div className="h-10 w-10 bg-foreground border-2 border-border rounded-full flex items-center justify-center shadow-lg">
                    <div className="flex space-x-1 text-background scale-[0.8] font-semibold font-mono text-xs">
                      <span>‹</span>
                      <span>›</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold tracking-wider text-accent uppercase flex items-center gap-1.5">
                <Sparkles size={12} />
                {beforeAfterConfig?.title}
              </span>
              <h3 className="font-serif text-2xl text-foreground font-medium">
                {activeCase.title}
              </h3>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeCase.description}
            </p>

            <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
              <div className="flex justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider">
                  Treatment
                </span>
                <span className="font-bold text-foreground text-right">
                  {activeCase.treatment}
                </span>
              </div>
              <div className="flex justify-between text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider">
                  Sessions
                </span>
                <span className="font-bold text-foreground">1</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-semibold uppercase tracking-wider">
                  Recovery
                </span>
                <span className="font-bold text-accent">Immediate</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <Info size={14} className="text-accent shrink-0 mt-0.5" />
              <span>
                *Results may vary depending on skin type, healthy habits, and
                patient compliance with home-care protocols.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
