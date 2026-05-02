import React from "react";
import { Scissors } from "lucide-react";
import { motion } from "motion/react";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { cn } from "../../lib/utils";
import { siteConfig } from "../../config/site";

function calcStagger(nameLength: number, durationMs: number): number {
  const NAME_DELAY   = 0.45;
  const EXIT_BUFFER  = 0.55;
  const available    = durationMs / 1000 - NAME_DELAY - EXIT_BUFFER;
  const raw          = nameLength > 1 ? available / (nameLength - 1) : available;
  return Math.min(0.07, Math.max(0.02, raw));
}

const letterVariants = {
  hidden:  { opacity: 0, y: 8, rotate: -4 },
  visible: { opacity: 1, y: 0, rotate:  0 },
};

export function SplashScreen() {
  const { brand, splash } = siteConfig;
  const isEstetica = siteConfig.business.type === "estetica";
  const logo     = brand.logo;
  const logoDark = brand.logoDark;
  const hasLogo  = !!logo || !!logoDark;
  // Estetica uses light splash bg — prefer light-bg logo variant
  const logoSrc  = isEstetica ? (logo ?? logoDark) : (logoDark ?? logo);

  const Icon = resolveLucideIcon(brand.logoIconName, Scissors);
  const chars = brand.name.split("");
  const stagger = calcStagger(chars.length, splash.durationMs);

  const accentCls = [
    "h-0.5 w-32 rounded-full",
    "max-w-[min(16rem,70vw)]",
    "bg-gradient-to-r",
    "from-transparent from-10%",
    isEstetica ? "via-[#b08d79]/60 via-50%" : "via-accent-light/85 via-50%",
    "to-transparent to-90%",
  ].join(" ");

  return (
    <motion.div
      key="splash"
      exit={{ y: "-100%" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8",
        isEstetica ? "bg-[#faf9f7]" : "bg-black",
      )}
    >
      <h1 className="sr-only">{brand.name}</h1>

      <div aria-hidden="true">
        {hasLogo ? (
          <motion.img
            src={logoSrc}
            alt=""
            draggable={false}
            className="h-16 w-auto object-contain md:h-20"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.85, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        ) : (
          <motion.div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-2xl shadow-xl",
              isEstetica
                ? "bg-[#b08d79]/15 shadow-[#b08d79]/10"
                : "bg-accent-light shadow-accent/30",
            )}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Icon size={40} className={isEstetica ? "text-[#b08d79]" : "text-zinc-950"} />
          </motion.div>
        )}
      </div>

      {/* dir="ltr" forces correct letter order in RTL (Hebrew) deploys */}
      <motion.div
        aria-hidden="true"
        dir="ltr"
        className="flex max-w-[min(90vw,42rem)] flex-wrap items-baseline justify-center overflow-hidden px-4 text-center"
        variants={{
          hidden:  {},
          visible: {
            transition: {
              staggerChildren: stagger,
              delayChildren:   0.45,
            },
          },
        }}
        initial="hidden"
        animate="visible"
      >
        {chars.map((char, i) => (
          <motion.span
            key={i}
            variants={letterVariants}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "inline-block whitespace-pre font-serif text-3xl font-bold tracking-wide md:text-4xl lg:text-5xl",
              isEstetica ? "text-[#1c1917]" : "text-white",
            )}
          >
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        aria-hidden="true"
        className={accentCls}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
    </motion.div>
  );
}
