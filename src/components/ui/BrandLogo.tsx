import { Scissors } from "lucide-react";
import { cn } from "../../lib/utils";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { LogoSvg } from "../branding/logo-svg";
import { getTypography } from "../../lib/typography";

// ─── TEMPLATE COMPONENT: BrandLogo ────────────────────────────────────────────
//
// Renders the brand identity mark in every location that needs it (Navbar,
// Footer, etc.). Handles four scenarios automatically:
//
//  1. Editorial SVG  →  `brand.logoSvg === true` opts into the in-house
//                       `<LogoSvg/>` monogram + wordmark (Velvet Muse style).
//  2. Logo URL       →  `<img>` that switches between `logo` (light bg) and
//                       `logoDark` (dark bg) automatically.
//  3. Partial logos  →  If only one URL is provided it is used everywhere.
//  4. No logo        →  Lucide icon in accent container + brand name text.

export interface BrandLogoProps {
  variant?: "auto" | "dark";
  /** Fixed pixel height (fallback). Ignored when `heightClass` is set. */
  height?: number;
  /** Responsive Tailwind height classes, e.g. "h-16 lg:h-20". Takes
   *  precedence over the numeric `height` prop. */
  heightClass?: string;
  iconWrapperClassName?: string;
  nameClassName?: string;
  className?: string;
}

export function BrandLogo({
  variant = "auto",
  height = 36,
  heightClass,
  iconWrapperClassName,
  nameClassName,
  className,
}: BrandLogoProps) {
  const { brand } = siteConfig;
  const logo     = brand.logo;
  const logoDark = brand.logoDark;
  const hasLogo  = !!logo || !!logoDark;

  // ── Editorial SVG logo (Velvet Muse–style) ─────────────────────────────────
  // Opt-in via `brand.logoSvg: true` on the niche preset or Firestore overlay.
  // Renders the in-house <LogoSvg/> with the brand name as the wordmark and
  // honours the active UI language for the serif family.
  if (brand.logoSvg) {
    const fonts = getTypography(localeConfig.lang);
    const monogramLetters = brand.logoMonogram
      ?? brand.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
      ?? "VM";
    return (
      <span
        className={cn(
          "inline-flex items-center transition-colors duration-300",
          variant === "dark" ? "text-white drop-shadow" : "text-foreground",
          className,
        )}
      >
        <LogoSvg
          brand={brand.name}
          suffix={brand.logoSuffix ?? "SALON"}
          monogram={monogramLetters}
          serifFamily={fonts.serifFamily}
          sansFamily={fonts.sansFamily}
          width={height * 3.8}
        />
      </span>
    );
  }

  // ── Fallback: Lucide icon + brand name text ────────────────────────────────
  if (!hasLogo) {
    const Icon = resolveLucideIcon(brand.logoIconName, Scissors);
    return (
      <>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
            "bg-accent-light shadow-md shadow-accent/20",
            "group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent/35",
            iconWrapperClassName,
          )}
        >
          <Icon className="text-zinc-950" size={20} />
        </div>
        <span
          className={cn(
            "font-serif text-xl font-bold tracking-wide transition-colors duration-300",
            variant === "dark" ? "text-white drop-shadow" : "text-foreground",
            nameClassName,
          )}
        >
          {brand.name}
        </span>
      </>
    );
  }

  // ── Shared image props ─────────────────────────────────────────────────────
  // `shrink-0` is critical: the navbar brand wrapper is `flex min-w-0`, which
  // would otherwise collapse a `w-auto` <img> to width 0 before its intrinsic
  // ratio resolves. Pair with `max-w-full` so we never overflow the container.
  const imgBase = cn(
    "block w-auto max-w-full shrink-0 object-contain transition-opacity duration-300 group-hover:opacity-85",
    heightClass,
    className,
  );
  const imgStyle = heightClass ? undefined : { height };

  // ── Forced dark variant (navbar over hero image) ───────────────────────────
  if (variant === "dark") {
    return (
      <img
        src={logoDark ?? logo!}
        alt={brand.name}
        style={imgStyle}
        className={imgBase}
        draggable={false}
      />
    );
  }

  // ── Auto: both URLs defined → CSS handles the switch ──────────────────────
  if (logo && logoDark) {
    return (
      <>
        <img
          src={logo}
          alt={brand.name}
          style={imgStyle}
          className={cn(imgBase, "dark:hidden")}
          draggable={false}
        />
        <img
          src={logoDark}
          alt={brand.name}
          style={imgStyle}
          className={cn(imgBase, "hidden dark:block")}
          draggable={false}
        />
      </>
    );
  }

  // ── Auto: only one URL defined → show it in both modes ────────────────────
  return (
    <img
      src={logo ?? logoDark!}
      alt={brand.name}
      style={imgStyle}
      className={imgBase}
      draggable={false}
    />
  );
}
