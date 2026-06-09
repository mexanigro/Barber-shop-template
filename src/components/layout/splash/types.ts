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
  /** Resolved fallback icon. */
  Icon: LucideIcon;
  /** Optional background image URL from splash config. */
  backgroundImage?: string;
  /** Optional dominant color (hex) for the splash animation. */
  color?: string;
  /** CSS var overrides that lock the splash to niche-default-mode colors. */
  themeVars?: React.CSSProperties;
  /** When true, the splash runs its exit animation. */
  isExiting?: boolean;
  /** Called when the exit animation finishes. */
  onExitComplete?: () => void;
};
