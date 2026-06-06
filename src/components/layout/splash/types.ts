import type { LucideIcon } from "lucide-react";

export type SplashProps = {
  brand: {
    name: string;
    logo?: string;
    logoDark?: string;
    logoIconName?: string;
  };
  durationMs: number;
  /** Resolved logo src (light/dark aware). */
  logoSrc: string | undefined;
  /** Alternate logo src to try if the preferred splash logo fails to load. */
  fallbackLogoSrc?: string;
  /** Resolved fallback icon. */
  Icon: LucideIcon;
  /** Optional background image URL from splash config. */
  backgroundImage?: string;
};
