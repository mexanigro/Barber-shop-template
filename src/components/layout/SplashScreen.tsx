import React from "react";
import { Scissors } from "lucide-react";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { siteConfig } from "../../config/site";
import {
  SplashClassic,
  SplashCurtain,
  SplashPulse,
  SplashTypewriter,
  SplashVortex,
} from "./splash";
import type { SplashProps } from "./splash";

export function SplashScreen() {
  const { brand, splash } = siteConfig;

  const logo = brand.logo;
  const logoDark = brand.logoDark;
  const logoSrc = logoDark ?? logo;

  const Icon = resolveLucideIcon(brand.logoIconName, Scissors);

  const props: SplashProps = {
    brand: {
      name: brand.name,
      logo: brand.logo,
      logoDark: brand.logoDark,
      logoIconName: brand.logoIconName,
    },
    durationMs: splash.durationMs,
    logoSrc: logoSrc ?? undefined,
    Icon,
    backgroundImage: splash.image,
  };

  // Per-niche default splash when no explicit variant is configured
  const NICHE_SPLASH: Record<string, number> = {
    barberia: 1,  // Classic — logo reveal, professional & trustworthy
    tattoo: 5,    // Vortex — orbital particles, artistic & edgy
    nails: 3,     // Pulse — radial burst, elegant & sparkly
    estetica: 4,  // Typewriter — character reveal, clinical & premium
  };
  const variant = splash.variant ?? NICHE_SPLASH[siteConfig.business.type] ?? 1;

  switch (variant) {
    case 2:
      return <SplashCurtain {...props} />;
    case 3:
      return <SplashPulse {...props} />;
    case 4:
      return <SplashTypewriter {...props} />;
    case 5:
      return <SplashVortex {...props} />;
    case 1:
    default:
      return <SplashClassic {...props} />;
  }
}
