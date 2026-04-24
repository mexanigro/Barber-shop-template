import React from "react";
import * as Icons from "lucide-react";
import { cn } from "../../lib/utils";
import { siteConfig } from "../../config/site";

// ─── TEMPLATE COMPONENT: BrandLogo ────────────────────────────────────────────
//
// Renders the brand identity mark in every location that needs it (Navbar,
// Footer, etc.). Handles three scenarios automatically:
//
//  1. No logo defined  →  Lucide icon in accent container + brand name text.
//                         (current behaviour, no config needed)
//
//  2. Logo defined     →  <img> that switches between `logo` (light bg) and
//                         `logoDark` (dark bg) automatically.
//
//  3. Partial logos    →  If only one URL is provided it is used everywhere.
//
// HOW TO ACTIVATE FOR A CLIENT
// ─────────────────────────────
// In the niche preset (e.g. barberia.ts), add to the `brand` object:
//
//   logo:     "https://cdn.client.com/logo.png",       // for light backgrounds
//   logoDark: "https://cdn.client.com/logo-white.png", // for dark bg / dark mode
//
// The client sends the files → upload them to /public, a CDN, or any URL →
// paste the URLs → done. No component file needs to be touched.
//
// VARIANT PROP
// ────────────
//  "auto"  (default) — lets CSS `dark:` classes handle light/dark switching.
//                      Use this everywhere EXCEPT when the element sits on a
//                      dark background regardless of the color scheme (e.g.
//                      navbar overlaying the hero image in light mode).
//  "dark"  (forced)  — always picks logoDark (or logo as fallback).
//                      Use for: navbar over hero, hero section, dark overlays.
//
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandLogoProps {
  /**
   * "auto"  → CSS dark: classes switch the logo (use in Footer, scrolled Navbar).
   * "dark"  → forces the dark variant regardless of color scheme (use in Navbar
   *            when overlaying the hero image, or in any dark-background context).
   */
  variant?: "auto" | "dark";
  /** Height of the logo image in px. Default: 36. */
  height?: number;
  /**
   * Extra classes for the icon wrapper div (fallback/no-logo mode only).
   * Use to add Navbar-specific effects like rotation: "rotate-3 group-hover:rotate-0"
   */
  iconWrapperClassName?: string;
  /** Extra classes for the brand name <span> (fallback/no-logo mode only). */
  nameClassName?: string;
  className?: string;
}

export function BrandLogo({
  variant = "auto",
  height = 36,
  iconWrapperClassName,
  nameClassName,
  className,
}: BrandLogoProps) {
  const { brand } = siteConfig;
  const logo     = brand.logo;
  const logoDark = brand.logoDark;
  const hasLogo  = !!logo || !!logoDark;

  // ── Fallback: Lucide icon + brand name text ────────────────────────────────
  if (!hasLogo) {
    const Icon = (Icons as any)[brand.logoIconName || "Scissors"] || Icons.Scissors;
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
  const imgBase = cn(
    "w-auto object-contain transition-opacity duration-300 group-hover:opacity-85",
    className,
  );

  // ── Forced dark variant (navbar over hero image) ───────────────────────────
  if (variant === "dark") {
    return (
      <img
        src={logoDark ?? logo!}
        alt={brand.name}
        style={{ height }}
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
          style={{ height }}
          className={cn(imgBase, "dark:hidden")}
          draggable={false}
        />
        <img
          src={logoDark}
          alt={brand.name}
          style={{ height }}
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
      style={{ height }}
      className={imgBase}
      draggable={false}
    />
  );
}
