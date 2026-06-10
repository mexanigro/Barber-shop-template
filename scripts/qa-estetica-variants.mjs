/**
 * QA screenshots for the estética-specific section variants.
 *
 * Loads /dev/variants-preview for each section × variant in the estética
 * niche and saves full-section screenshots (desktop light + mobile light,
 * optional RTL) under qa-estetica/. Reports console errors and horizontal
 * overflow, mirroring scripts/qa-variants.mjs conventions.
 *
 * Usage: node scripts/qa-estetica-variants.mjs --base http://localhost:5191
 *        [--sections hero,services] [--variants v2,v3,v4,v5] [--rtl] [--dark]
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
}
const hasFlag = (name) => args.includes(`--${name}`);

const BASE = argValue("base", "http://localhost:5191");
const SECTIONS = argValue("sections", "hero").split(",");
const VARIANTS = argValue("variants", "v2,v3,v4,v5").split(",");
const OUT = resolve("qa-estetica");
mkdirSync(OUT, { recursive: true });

const CONTEXTS = [
  { id: "d", lang: "en", width: 1280, height: 900 },
  { id: "m", lang: "en", width: 375, height: 812 },
];
if (hasFlag("rtl")) CONTEXTS.push({ id: "rtl", lang: "he", width: 1280, height: 900 });
const MODE = hasFlag("dark") ? "dark" : "light";

const IGNORED_CONSOLE = [
  /Firebase config is missing/i,
  /Firebase not configured/i,
  /React DevTools/i,
  /\[vite\]/i,
  /Failed to load resource/i,
  /container has a non-static position/i,
  /ws:\/\/localhost:24678/i,
  /falling back to the default/i,
];

const browser = await chromium.launch();
let issues = 0;

for (const ctx of CONTEXTS) {
  const bctx = await browser.newContext({
    viewport: { width: ctx.width, height: ctx.height },
    reducedMotion: "reduce",
  });
  const page = await bctx.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) {
      errors.push(msg.text().slice(0, 300));
    }
  });
  page.on("pageerror", (err) => errors.push(`PAGEERROR: ${String(err).slice(0, 300)}`));

  for (const section of SECTIONS) {
    for (const variant of VARIANTS) {
      errors.length = 0;
      const url = `${BASE}/dev/variants-preview?section=${section}&variant=${variant}&niche=estetica&lang=${ctx.lang}&mode=${MODE}&labels=0`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("body[data-variants-ready='1']", { timeout: 20000 });
        await page.waitForTimeout(400);

        // Sweep the page so every whileInView({once:true}) reveal fires before
        // the fullPage capture — below-fold elements stay opacity:0 otherwise.
        await page.evaluate(async () => {
          const step = Math.max(200, window.innerHeight * 0.8);
          const max = document.documentElement.scrollHeight;
          for (let y = 0; y <= max; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(350);

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > doc.clientWidth + 1 ? doc.scrollWidth - doc.clientWidth : 0;
        });

        const name = `${section}-${variant}-${ctx.id}.png`;
        await page.screenshot({ path: resolve(OUT, name), fullPage: true });

        const flags = [];
        if (overflow) flags.push(`H-OVERFLOW +${overflow}px`);
        if (errors.length) flags.push(`CONSOLE: ${errors.join(" | ")}`);
        if (flags.length) issues++;
        console.log(`${flags.length ? "✗" : "✓"} ${name}${flags.length ? "  " + flags.join("  ") : ""}`);
      } catch (err) {
        issues++;
        console.log(`✗ ${section}-${variant}-${ctx.id}  LOAD FAILED: ${String(err).slice(0, 200)}`);
      }
    }
  }
  await bctx.close();
}

await browser.close();
console.log(issues ? `\n${issues} issue(s) — see flags above` : "\nAll clean");
process.exit(0);
