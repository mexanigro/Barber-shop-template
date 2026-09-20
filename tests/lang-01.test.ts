// LANG-01 (2026-09-20, bug de flota, a11y/SEO): con un idioma guardado (`preferred_language`) y recarga, `html[lang]`
// tiene que ser ese idioma y `dir` coherente. Antes `useSEO` volvía a escribir `lang = env.uiLanguage` (el del deploy) al
// montar, mientras `dir` y los textos ya salían del idioma guardado (`main.tsx` ← `localeConfig`). Guard sobre la página
// real (Vite en proceso, fixture A del nicho peluquería, deploy «he»): en → lang en/ltr; ar → lang ar/rtl; sin preferencia → he/rtl.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");

test("LANG-01: html[lang] y dir siguen al idioma guardado en la recarga", async () => {
  process.env.VITE_ACTIVE_NICHE = "peluqueria"; process.env.VITE_UI_LANGUAGE = "he"; process.env.VITE_DEMO_MODE = "false"; process.env.VITE_FIREBASE_API_KEY = ""; process.env.VITE_TENANT_FIXTURE = "peluqueria-paleta-a"; process.env.VITE_HERO_CLIP = "";
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
  await vite.listen(); const url = vite.resolvedUrls!.local[0];
  const b = await chromium.launch();
  try {
    for (const [stored, lang, dir] of [["en", "en", "ltr"], ["ar", "ar", "rtl"], ["ru", "ru", "ltr"], [null, "he", "rtl"]] as const) {
      const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
      if (stored) await ctx.addInitScript((l) => localStorage.setItem("preferred_language", l), stored);
      const p = await ctx.newPage(); await p.goto(url, { waitUntil: "networkidle" }); await p.waitForSelector("#hero"); await p.waitForTimeout(500);
      const got = await p.evaluate(`({ lang: document.documentElement.lang, dir: document.documentElement.dir })`) as { lang: string; dir: string };
      assert.deepEqual(got, { lang, dir }, `preferencia ${stored ?? "ninguna"} → esperado lang=${lang} dir=${dir}, real ${JSON.stringify(got)}`);
      await ctx.close();
    }
  } finally { await b.close(); await vite.close(); }
});
