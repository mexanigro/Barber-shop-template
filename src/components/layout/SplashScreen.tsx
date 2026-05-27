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
  SplashCafeteria,
  SplashRemodelaciones,
} from "./splash";
import type { SplashProps } from "./splash";
import {
  SplashImpactScale,
  SplashImpactSplit,
  SplashImpactReveal3D,
} from "../3d-impact";
import type { SplashVariant } from "../../types";

// Niche → legacy numeric variant when nothing else is configured.
const NICHE_SPLASH_DEFAULT: Record<string, number> = {
  barberia: 1,        // Classic — logo reveal, professional & trustworthy
  tattoo: 5,          // Vortex — orbital particles, artistic & edgy
  nails: 3,           // Pulse — radial burst, elegant & sparkly
  estetica: 4,        // Typewriter — character reveal, clinical & premium
  cafeteria: 6,       // Cafeteria — warm mocha, two-line serif title
  remodelaciones: 7,  // Remodelaciones — bold wipe reveal
};

const NUMERIC_ALIAS: Record<string, number> = {
  classic: 1,
  curtain: 2,
  pulse: 3,
  typewriter: 4,
  vortex: 5,
  cafeteria: 6,
  remodelaciones: 7,
};

/**
 * Resolve which splash variant should render based on the runtime config.
 *
 * Precedence:
 *   1. Explicit `splash.variant` if set.
 *   2. Auto: `"impact-reveal-3d"` when `heroObjects.primary` exists.
 *   3. Niche default (legacy numeric variants 1-7).
 *
 * The string aliases (`"classic"`, `"curtain"`, …) collapse to their
 * numeric equivalents so the legacy hub-side editors keep working.
 */
function resolveVariant(variant: SplashVariant | undefined): SplashVariant {
  if (variant !== undefined && variant !== null) return variant;
  if (siteConfig.heroObjects?.primary?.src) return "impact-reveal-3d";
  const fromNiche = NICHE_SPLASH_DEFAULT[siteConfig.business.type];
  return (fromNiche as SplashVariant | undefined) ?? 1;
}

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

  const variant = resolveVariant(splash.variant);
  const numeric =
    typeof variant === "string"
      ? NUMERIC_ALIAS[variant]
      : variant;

  // Impact family — string-keyed.
  if (variant === "impact-scale") {
    return (
      <SplashImpactScale
        {...props}
        bandCount={splash.bandCount}
        bandDirection={splash.bandDirection}
      />
    );
  }
  if (variant === "impact-split") {
    return (
      <SplashImpactSplit
        {...props}
        splitDirection={splash.splitDirection}
      />
    );
  }
  if (variant === "impact-reveal-3d") {
    return (
      <SplashImpactReveal3D
        {...props}
        ambientParticles={splash.ambientParticles}
      />
    );
  }

  // Legacy numeric variants.
  switch (numeric) {
    case 2:
      return <SplashCurtain {...props} />;
    case 3:
      return <SplashPulse {...props} />;
    case 4:
      return <SplashTypewriter {...props} />;
    case 5:
      return <SplashVortex {...props} />;
    case 6:
      return <SplashCafeteria {...props} />;
    case 7:
      return <SplashRemodelaciones {...props} />;
    case 1:
    default:
      return <SplashClassic {...props} />;
  }
}
