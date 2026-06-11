/**
 * Vite plugin: rewrite static SEO / Open Graph / Twitter / favicon tags in
 * `index.html` at build time so each Vercel deploy ships per-tenant link
 * previews. Without this, every deploy shares whatever was hardcoded in the
 * source `index.html` (historically the barber preset).
 *
 * Inputs (Vercel project env vars — all optional):
 *   VITE_ACTIVE_NICHE        — niche key, drives the defaults map
 *   VITE_UI_LANGUAGE         — language key (en|he|ru|ar)
 *   VITE_BRAND_NAME          — explicit brand override
 *   VITE_BRAND_TAGLINE       — explicit tagline override
 *   VITE_BRAND_DESCRIPTION   — explicit description override
 *   VITE_OG_IMAGE            — absolute URL or path (resolved against VITE_APP_URL)
 *   VITE_APP_URL             — canonical origin (e.g. https://my-shop.arzac.studio)
 *   VITE_FAVICON_EMOJI       — single emoji for the data:image favicon
 *   VITE_THEME_ACCENT        — hex color for the favicon background
 *
 * Vercel-derived fallback for VITE_APP_URL:
 *   VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { getSeoDefaults } from "../src/lib/seo-defaults";

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resolveAppUrl(env: NodeJS.ProcessEnv): string {
  const fromExplicit = env.VITE_APP_URL?.trim();
  if (fromExplicit) return fromExplicit.replace(/\/+$/, "");
  const prodHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prodHost) return `https://${prodHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  const deployHost = env.VERCEL_URL?.trim();
  if (deployHost) return `https://${deployHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "";
}

function resolveOgImage(raw: string, appUrl: string): string {
  if (!raw) return "";
  if (/^https?:\/\//.test(raw)) return raw;
  if (!appUrl) return raw;
  return `${appUrl}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function faviconDataUri(emoji: string, accent: string): string {
  const encoded = encodeURIComponent(emoji);
  const fill = encodeURIComponent(accent);
  return (
    `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>` +
    `<rect width='32' height='32' rx='8' fill='${fill}'/>` +
    `<text x='16' y='23' font-size='18' text-anchor='middle' fill='white' font-family='system-ui'>${encoded}</text>` +
    `</svg>`
  );
}

export function seoMetaPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig | undefined;
  return {
    name: "arzac-seo-meta",
    configResolved(config) {
      resolvedConfig = config;
    },
    // Append the per-tenant `Sitemap:` line to the robots.txt that Vite copied
    // from public/. closeBundle runs after the public-dir copy, so the write
    // is not clobbered. No-op when the canonical URL can't be resolved (local
    // builds without VITE_APP_URL/VERCEL_* env).
    closeBundle() {
      const appUrl = resolveAppUrl(process.env);
      if (!appUrl || !resolvedConfig) return;
      const robotsPath = resolve(
        resolvedConfig.root,
        resolvedConfig.build.outDir,
        "robots.txt",
      );
      if (!existsSync(robotsPath)) return;
      const current = readFileSync(robotsPath, "utf8");
      if (/^Sitemap:/m.test(current)) return;
      writeFileSync(
        robotsPath,
        `${current.trimEnd()}\nSitemap: ${appUrl}/sitemap.xml\n`,
      );
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const env = process.env;
        const defaults = getSeoDefaults(env.VITE_ACTIVE_NICHE, env.VITE_UI_LANGUAGE);

        const brand = env.VITE_BRAND_NAME?.trim() || defaults.brand;
        const tagline = env.VITE_BRAND_TAGLINE?.trim() || defaults.tagline;
        const description = env.VITE_BRAND_DESCRIPTION?.trim() || defaults.description;
        const ogImageRaw = env.VITE_OG_IMAGE?.trim() || defaults.ogImage;
        const favicon = env.VITE_FAVICON_EMOJI?.trim() || defaults.faviconEmoji;
        const accent = env.VITE_THEME_ACCENT?.trim() || defaults.accent;
        const lang = (env.VITE_UI_LANGUAGE?.trim() || "en").toLowerCase();

        const appUrl = resolveAppUrl(env);
        const canonical = appUrl ? `${appUrl}/` : "/";
        const ogImage = resolveOgImage(ogImageRaw, appUrl);

        const title = tagline ? `${brand} — ${tagline}` : brand;
        const titleAttr = escapeAttr(title);
        const titleText = escapeText(title);
        const descAttr = escapeAttr(description);
        const faviconHref = faviconDataUri(favicon, accent);

        let out = html;

        out = out.replace(/<html\s+lang="[^"]*"/i, `<html lang="${escapeAttr(lang)}"`);

        out = out.replace(
          /<title>[\s\S]*?<\/title>/i,
          `<title>${titleText}</title>`,
        );

        out = out.replace(
          /<meta\s+name="description"[^>]*\/>/i,
          `<meta name="description" content="${descAttr}" />`,
        );

        out = out.replace(
          /<meta\s+name="theme-color"[^>]*\/>/i,
          `<meta name="theme-color" content="${escapeAttr(accent)}" />`,
        );

        out = out.replace(
          /<meta\s+property="og:title"[^>]*\/>/i,
          `<meta property="og:title" content="${titleAttr}" />`,
        );
        out = out.replace(
          /<meta\s+property="og:site_name"[^>]*\/>/i,
          `<meta property="og:site_name" content="${escapeAttr(brand)}" />`,
        );
        out = out.replace(
          /<meta\s+property="og:image:alt"[^>]*\/>/i,
          `<meta property="og:image:alt" content="${escapeAttr(brand)}" />`,
        );
        out = out.replace(
          /<meta\s+property="og:description"[^>]*\/>/i,
          `<meta property="og:description" content="${descAttr}" />`,
        );
        out = out.replace(
          /<meta\s+property="og:url"[^>]*\/>/i,
          `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
        );
        out = out.replace(
          /<meta\s+property="og:locale"[^>]*\/>/i,
          `<meta property="og:locale" content="${escapeAttr(defaults.locale)}" />`,
        );
        out = out.replace(
          /<link\s+rel="canonical"[^>]*\/>/i,
          `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
        );

        if (ogImage) {
          out = out.replace(
            /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/i,
            `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
          );
          out = out.replace(
            /<meta\s+name="twitter:image"[^>]*\/>/i,
            `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
          );
        }

        out = out.replace(
          /<meta\s+name="twitter:title"[^>]*\/>/i,
          `<meta name="twitter:title" content="${titleAttr}" />`,
        );
        out = out.replace(
          /<meta\s+name="twitter:description"[^>]*\/>/i,
          `<meta name="twitter:description" content="${descAttr}" />`,
        );

        // Favicon: the original `<link rel="icon" href="data:image/svg+xml,…">`
        // embeds `>` and `/>` characters inside the inline SVG. Anchor the
        // match at `type="image/svg+xml" />` so we consume the whole tag.
        out = out.replace(
          /<link\s+rel="icon"[\s\S]*?type="image\/svg\+xml"\s*\/>/i,
          `<link rel="icon" href="${faviconHref}" type="image/svg+xml" />`,
        );

        return out;
      },
    },
  };
}
