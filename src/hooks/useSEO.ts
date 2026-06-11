import { useEffect } from "react";
import { siteConfig } from "../config/site";
import { env } from "../config/env";
import { getSeoDefaults } from "../lib/seo-defaults";

function setMetaByName(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaByProperty(property: string, content: string) {
  let el = document.head.querySelector(
    `meta[property="${property}"]`,
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let link = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function setHreflang(hreflang: string, href: string) {
  let link = document.head.querySelector(
    `link[rel="alternate"][hreflang="${hreflang}"]`,
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "alternate");
    link.setAttribute("hreflang", hreflang);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

/**
 * Resolves the share image URL for OG/Twitter from the active preset (or tenant override).
 * Order: `brand.ogImage` → absolute `hero.backgroundImage` → niche default from seo-defaults.
 */
export function resolveOgImageUrl(origin: string): string {
  const { brand, hero } = siteConfig;
  const custom = brand.ogImage?.trim();
  if (custom) {
    if (custom.startsWith("http://") || custom.startsWith("https://")) {
      return custom;
    }
    const path = custom.startsWith("/") ? custom : `/${custom}`;
    return `${origin}${path}`;
  }
  const heroBg = hero.backgroundImage?.trim();
  if (heroBg?.startsWith("http://") || heroBg?.startsWith("https://")) {
    return heroBg;
  }
  const defaults = getSeoDefaults(env.activeNiche, env.uiLanguage);
  return defaults.ogImage;
}

/** Default emoji map keyed by logoIconName — used when faviconEmoji is not set. */
const ICON_TO_EMOJI: Record<string, string> = {
  Scissors: "✂️",
  Sparkles: "✨",
  Pen: "🖊️",
  Coffee: "☕",
  Paintbrush: "🏠",
};

function setFavicon(emoji: string, accentHex: string) {
  const encoded = encodeURIComponent(emoji);
  const bg = encodeURIComponent(accentHex);
  const svg =
    `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>` +
    `<rect width='32' height='32' rx='8' fill='${bg}'/>` +
    `<text x='16' y='23' font-size='18' text-anchor='middle' fill='white' font-family='system-ui'>${encoded}</text>` +
    `</svg>`;

  let link = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "icon");
    document.head.appendChild(link);
  }
  link.setAttribute("type", "image/svg+xml");
  link.setAttribute("href", svg);
}

/**
 * Applies `siteConfig.brand` (and niche-aware OG image) to document title, meta description,
 * Open Graph, and Twitter Card tags. Safe to call after `bootstrapTenantConfig()` and from `useSEO`.
 */
export function syncDocumentMetaFromSiteConfig() {
  if (typeof document === "undefined") return;

  const { brand } = siteConfig;
  const shareTitle = `${brand.name} — ${brand.tagline}`;
  const shareDescription = brand.description ?? brand.tagline ?? "";

  document.title = brand.name;

  // Favicon: use brand.faviconEmoji, fallback to logoIconName map, then ✂️
  const emoji = brand.faviconEmoji || ICON_TO_EMOJI[brand.logoIconName ?? ""] || "✂️";
  setFavicon(emoji, siteConfig.theme?.accent ?? "#d97706");

  setMetaByName("description", shareDescription);

  const origin = window.location.origin;
  const canonicalUrl = `${origin}/`;
  const ogImageUrl = resolveOgImageUrl(origin);

  setCanonical(canonicalUrl);
  setMetaByProperty("og:url", canonicalUrl);

  setMetaByProperty("og:title", shareTitle);
  setMetaByProperty("og:description", shareDescription);
  setMetaByProperty("og:type", "website");
  setMetaByProperty("og:site_name", brand.name);
  setMetaByProperty("og:image", ogImageUrl);
  setMetaByProperty("og:image:width", "1200");
  setMetaByProperty("og:image:height", "630");
  setMetaByProperty("og:image:alt", brand.name);

  setMetaByName("theme-color", siteConfig.theme?.accent ?? "#d97706");

  setMetaByName("twitter:card", "summary_large_image");
  setMetaByName("twitter:title", shareTitle);
  setMetaByName("twitter:description", shareDescription);
  setMetaByName("twitter:image", ogImageUrl);

  // og:locale + hreflang — language-aware per deploy
  const langMap: Record<string, string> = { he: "he_IL", en: "en_US", ru: "ru_RU", ar: "ar_SA" };
  const locale = langMap[env.uiLanguage] ?? "en_US";
  const altLocale = env.uiLanguage === "en" ? "he_IL" : "en_US";
  setMetaByProperty("og:locale", locale);
  setMetaByProperty("og:locale:alternate", altLocale);

  // Self-referencing hreflang (x-default = this deploy's language)
  setHreflang(env.uiLanguage, canonicalUrl);
  setHreflang("x-default", canonicalUrl);

  // html[lang] — keep in sync with deploy language
  document.documentElement.setAttribute("lang", env.uiLanguage);
}

/**
 * Applies `siteConfig.brand` to document title, meta description, Open Graph,
 * and Twitter Card tags (absolute URLs for link previews / messaging apps).
 */
export function useSEO() {
  useEffect(() => {
    syncDocumentMetaFromSiteConfig();
  }, []);
}
