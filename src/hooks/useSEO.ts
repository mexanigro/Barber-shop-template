import { useEffect } from "react";
import { siteConfig } from "../config/site";

function setMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${CSS.escape(name)}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaByProperty(property: string, content: string) {
  let el = document.querySelector(
    `meta[property="${CSS.escape(property)}"]`,
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Applies `siteConfig.brand` to document title, meta description, and Open Graph tags.
 * Meta tags are created in `<head>` if missing.
 */
export function useSEO() {
  useEffect(() => {
    const { brand } = siteConfig;
    const description = brand.description ?? brand.tagline ?? "";

    document.title = brand.name;

    setMetaByName("description", description);

    setMetaByProperty("og:title", brand.name);
    setMetaByProperty("og:description", description);
    setMetaByProperty("og:type", "website");
    const ogImage = `${window.location.origin}/og-image.jpg`;
    setMetaByProperty("og:image", ogImage);
  }, []);
}
