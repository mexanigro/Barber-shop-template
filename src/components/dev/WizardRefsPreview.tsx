/**
 * Dev-only route used by Nichos-hub's `scripts/capture-wizard-refs.mjs` to
 * generate thumbnail references for the onboarding wizard.
 *
 * Loaded only when `import.meta.env.DEV` is true. Reads `niche` and `section`
 * from the URL query string, swaps the active niche preset in-place via
 * `switchSiteToNiche`, then renders the requested landing section in
 * isolation (no navbar, footer, or splash). Marks `<body>` with
 * `data-wizard-ref-ready="1"` once layout settles so Playwright can wait
 * for a stable paint before taking the screenshot.
 *
 * URL: /dev/wizard-refs-preview?niche=barberia&section=hero
 *
 * Supported sections: hero | benefits | testimonials | faq
 */

import React from "react";
import { switchSiteToNiche, siteConfig } from "../../config/site";
import { applySiteThemeCssVars } from "../../lib/site-theme";
import type { BusinessNiche } from "../../types";
import { Hero } from "../landing/Hero";
import { WhyChooseUs } from "../landing/WhyChooseUs";
import { Testimonials } from "../landing/Testimonials";
import { FAQ } from "../landing/FAQ";

const VALID_NICHES: readonly BusinessNiche[] = [
  "barberia",
  "estetica",
  "tattoo",
  "nails",
  "cafeteria",
  "remodelaciones",
];

type SectionKey = "hero" | "benefits" | "testimonials" | "faq";
const VALID_SECTIONS: readonly SectionKey[] = ["hero", "benefits", "testimonials", "faq"];

function readParams(): { niche: BusinessNiche; section: SectionKey } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const rawNiche = (params.get("niche") || "").toLowerCase();
  const rawSection = (params.get("section") || "").toLowerCase();
  if (!VALID_NICHES.includes(rawNiche as BusinessNiche)) return null;
  if (!VALID_SECTIONS.includes(rawSection as SectionKey)) return null;
  return {
    niche: rawNiche as BusinessNiche,
    section: rawSection as SectionKey,
  };
}

/**
 * Run niche swap exactly once per page load — at module scope so it executes
 * BEFORE the first React render. Keeps the section components' first read of
 * `siteConfig` consistent with the requested niche.
 */
const LIGHT_NICHES: ReadonlySet<BusinessNiche> = new Set(["estetica", "nails", "cafeteria"]);

let _switched = false;
function ensureNicheSwitched(niche: BusinessNiche): void {
  if (_switched) return;
  _switched = true;
  switchSiteToNiche(niche);
  applySiteThemeCssVars();
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (LIGHT_NICHES.has(niche)) {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }
}

const NOOP = () => {};

export function WizardRefsPreview() {
  const params = readParams();
  if (!params) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", color: "#f00" }}>
        Invalid params. Expected ?niche=barberia&section=hero (niches:{" "}
        {VALID_NICHES.join(", ")}; sections: {VALID_SECTIONS.join(", ")}).
      </div>
    );
  }

  ensureNicheSwitched(params.niche);

  // Mark ready on next frame after the section paints. Two RAFs give the
  // motion-driven viewport entry animations a frame to settle so the
  // screenshot isn't taken mid-stagger.
  React.useEffect(() => {
    const t = setTimeout(() => {
      document.body.setAttribute("data-wizard-ref-ready", "1");
    }, 800);
    return () => {
      clearTimeout(t);
      document.body.removeAttribute("data-wizard-ref-ready");
    };
  }, []);

  const section = renderSection(params.section);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      data-niche={siteConfig.business.type}
    >
      {section}
    </div>
  );
}

function renderSection(section: SectionKey): React.ReactNode {
  switch (section) {
    case "hero":
      return <Hero onBookClick={NOOP} />;
    case "benefits":
      return <WhyChooseUs />;
    case "testimonials":
      return <Testimonials />;
    case "faq":
      return <FAQ />;
  }
}
