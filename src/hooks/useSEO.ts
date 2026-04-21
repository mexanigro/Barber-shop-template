import { useEffect } from "react";
import { siteConfig } from "../config/site";

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

/**
 * Applies `siteConfig.brand` to document title, meta description, Open Graph,
 * and Twitter Card tags (absolute URLs for link previews / messaging apps).
 */
export function useSEO() {
  useEffect(() => {
    const { brand } = siteConfig;
    const shareTitle = `${brand.name} — ${brand.tagline}`;
    const shareDescription = brand.description ?? brand.tagline ?? "";

    document.title = brand.name;

    setMetaByName("description", shareDescription);

    const origin = window.location.origin;
    const ogImageUrl = `${origin}/og-image.png`;

    setMetaByProperty("og:title", shareTitle);
    setMetaByProperty("og:description", shareDescription);
    setMetaByProperty("og:type", "website");
    setMetaByProperty("og:image", ogImageUrl);
    setMetaByProperty("og:image:width", "1200");
    setMetaByProperty("og:image:height", "630");

    setMetaByName("twitter:card", "summary_large_image");
    setMetaByName("twitter:title", shareTitle);
    setMetaByName("twitter:description", shareDescription);
    setMetaByName("twitter:image", ogImageUrl);
  }, []);
}
