/**
 * QA of GLOBAL STYLE FLAG COMBINATIONS over /dev/variants-preview.
 *
 * For each combo × niche context it loads section=all with the combo in the
 * `global` query param, then records:
 *   - the data-gs-* attributes actually applied to <html>
 *   - computed-style probes (card radius, shadows, backdrop-filter, section
 *     padding, accent derivations) so flag conflicts show up as hard numbers
 *   - screenshots of key sections for visual review
 *
 * Usage: node scripts/qa-flag-combos.mjs   →  qa-screenshots/combos/
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "http://localhost:3000";
const OUT = resolve("qa-screenshots/combos");

const CONTEXTS = [
  { id: "barberia-dark", niche: "barberia", lang: "en", mode: "dark", width: 1280, height: 900 },
  { id: "nails-light", niche: "nails", lang: "en", mode: "light", width: 1280, height: 900 },
];

const COMBOS = [
  { id: "c1-radiusNone-cardGlass", variant: "v2", global: { borderRadius: "none", cardStyle: "glass" } },
  { id: "c2-pill-dramatic-compact", variant: "v2", global: { borderRadius: "pill", shadowStyle: "dramatic", spacing: "compact" } },
  { id: "c3-glass-monochrome", variant: "v2", global: { glassmorphism: true, colorScheme: "monochrome" } },
  { id: "c4-rich-parallax", variant: "v5", global: { animationLevel: "rich", parallaxEnabled: true } },
  // Conflictos directos:
  { id: "c5-cardGlass-noGlassmorphism", variant: "v2", global: { cardStyle: "glass", glassmorphism: false } },
  { id: "c6-noShadow-cardElevated", variant: "v2", global: { shadowStyle: "none", cardStyle: "elevated" } },
  { id: "c7-animNone-speedSlow", variant: "v2", global: { animationLevel: "none", transitionSpeed: "slow" } },
  { id: "c8-pill-squareImages", variant: "v3", global: { borderRadius: "pill", imageStyle: "square", buttonShape: "square" } },
  { id: "c9-compact-airy-ornament", variant: "v4", global: { spacing: "compact", density: "airy", dividerStyle: "ornament" } },
];

const SHOT_SECTIONS = ["hero", "services", "team", "testimonials", "contact", "footer"];

const report = [];
const browser = await chromium.launch();

for (const ctx of CONTEXTS) {
  const bctx = await browser.newContext({
    viewport: { width: ctx.width, height: ctx.height },
    reducedMotion: "reduce",
  });
  const page = bctx.pages()[0] ?? (await bctx.newPage());
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));

  for (const combo of COMBOS) {
    pageErrors.length = 0;
    const url =
      `${BASE}/dev/variants-preview?section=all&variant=${combo.variant}` +
      `&niche=${ctx.niche}&lang=${ctx.lang}&mode=${ctx.mode}&labels=0` +
      `&global=${encodeURIComponent(JSON.stringify(combo.global))}`;

    const entry = { context: ctx.id, combo: combo.id, url, pageErrors: [], probes: null };
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector('body[data-variants-ready="1"]', { timeout: 20000 });
      // Trigger lazy content + let images settle.
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y <= document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 130));
        }
        window.scrollTo(0, 0);
      });
      await page.evaluate(() =>
        Promise.race([
          Promise.all(
            [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })),
          ),
          new Promise((r) => setTimeout(r, 8000)),
        ]),
      );
      await page.waitForTimeout(300);

      entry.probes = await page.evaluate(() => {
        const html = document.documentElement;
        const cs = getComputedStyle(html);
        const gsAttrs = {};
        for (const a of html.attributes) {
          if (a.name.startsWith("data-gs-")) gsAttrs[a.name] = a.value;
        }

        const probe = (selector, props) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const s = getComputedStyle(el);
          const out = {};
          for (const p of props) out[p] = s.getPropertyValue(p);
          return out;
        };

        // Page-level horizontal overflow = layout broken by the combo.
        const docScroll = html.scrollWidth - html.clientWidth;

        return {
          gsAttrs,
          vars: {
            cardRadius: cs.getPropertyValue("--gs-card-radius").trim(),
            imageRadius: cs.getPropertyValue("--gs-image-radius").trim(),
            btnRadius: cs.getPropertyValue("--gs-btn-radius").trim(),
            sectionPy: cs.getPropertyValue("--gs-section-py").trim(),
            gap: cs.getPropertyValue("--gs-gap").trim(),
            accentAlt: cs.getPropertyValue("--gs-accent-alt").trim(),
            overlay: cs.getPropertyValue("--gs-overlay-opacity").trim(),
          },
          card: probe(".glass-card-interactive, .shadow-elevated", [
            "border-radius",
            "box-shadow",
            "backdrop-filter",
            "background-color",
            "border-color",
          ]),
          glassPanel: probe(".glass-panel", ["backdrop-filter", "background-color"]),
          blurEl: probe('[class*="backdrop-blur"]', ["backdrop-filter"]),
          section: probe('#main-content section[class*="py-"]:not(#hero)', ["padding-top", "padding-bottom"]),
          button: probe('button[class*="rounded"]', ["border-radius"]),
          docScroll,
        };
      });

      // Parallax probe (combo c4 only): scroll and check the hero bg layer moves.
      if (combo.id.startsWith("c4")) {
        entry.parallax = await page.evaluate(async () => {
          const layer = document.querySelector("#hero > div");
          if (!layer) return "no-layer";
          const before = getComputedStyle(layer).transform;
          window.scrollTo(0, 600);
          await new Promise((r) => setTimeout(r, 700));
          const after = getComputedStyle(layer).transform;
          window.scrollTo(0, 0);
          return { before, after, moved: before !== after };
        });
      }

      const dir = `${OUT}/${ctx.id}/${combo.id}`;
      mkdirSync(dir, { recursive: true });
      for (const sec of SHOT_SECTIONS) {
        try {
          await page
            .locator(`[data-qa="${sec}"]`)
            .screenshot({ path: `${dir}/${sec}.png`, timeout: 8000, animations: "disabled" });
        } catch {
          /* section may not render in this niche — fine */
        }
      }
    } catch (e) {
      entry.loadError = String(e).slice(0, 400);
    }
    entry.pageErrors = [...new Set(pageErrors)];
    report.push(entry);
    console.log(`${ctx.id} ${combo.id}${entry.loadError || entry.pageErrors.length ? " ⚠" : ""}${entry.probes?.docScroll > 1 ? ` HSCROLL+${entry.probes.docScroll}` : ""}`);
  }
  await bctx.close();
}

await browser.close();
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/probes.json`, JSON.stringify(report, null, 2));
console.log(`\n${report.length} combos → qa-screenshots/combos/probes.json`);
