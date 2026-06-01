import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { localeConfig } from "../../config/locale";
import { EASE_OUT_STRONG } from "../../lib/motion";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(window.scrollY > 300);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 16 }}
          transition={{
            duration: 0.25,
            ease: EASE_OUT_STRONG,
          }}
          whileTap={{ scale: 0.92 }}
          onClick={scrollToTop}
          className="group fixed bottom-20 end-16 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-accent-light text-zinc-950 shadow-elevated shadow-accent-light/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:bottom-6 sm:end-6 sm:h-14 sm:w-14"
          style={{
            transition: "background-color 0.3s cubic-bezier(0.23,1,0.32,1), box-shadow 0.3s cubic-bezier(0.23,1,0.32,1)",
          }}
          aria-label={localeConfig.a11y.scrollToTop}
        >
          <ArrowUp size={18} className="sm:h-6 sm:w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
