/**
 * QA sweep for the 5-variant section system using /dev/variants-preview.
 *
 * For every context (niche/lang/mode/viewport) × variant it loads the
 * preview route, waits for the stable-paint marker, then records:
 *   - console errors + uncaught page errors (Firebase "not configured"
 *     noise filtered out — expected in local dev)
 *   - failed network requests (4xx/5xx)
 *   - per-section: rendered height and horizontal-overflow offenders
 *   - one element screenshot per section under qa-screenshots/
 *
 * Usage:  node scripts/qa-variants.mjs [--base http://localhost:3000]
 *         [--variants v2,v3] [--contexts barberia-en-dark-desktop,...]
 * Output: qa-screenshots/report.json + PNGs
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = argValue("base", "http://localhost:3000");
const OUT = resolve("qa-screenshots");

const CONTEXTS = [
  { id: "barberia-en-dark-desktop", niche: "barberia", lang: "en", mode: "dark", width: 1280, height: 900 },
  { id: "barberia-he-dark-desktop", niche: "barberia", lang: "he", mode: "dark", width: 1280, height: 900 },
  { id: "barberia-en-dark-mobile", niche: "barberia", lang: "en", mode: "dark", width: 375, height: 812 },
  { id: "nails-en-light-desktop", niche: "nails", lang: "en", mode: "light", width: 1280, height: 900 },
  { id: "nails-he-light-mobile", niche: "nails", lang: "he", mode: "light", width: 375, height: 812 },
];

const VARIANTS = argValue("variants", "v1,v2,v3,v4,v5").split(",");
const contextFilter = argValue("contexts", null);
const contexts = contextFilter
  ? CONTEXTS.filter((c) => contextFilter.split(",").includes(c.id))
  : CONTEXTS;

/** Console noise expected in local dev (no Firebase env configured). */
const IGNORED_CONSOLE = [
  /Firebase config is missing/i,
  /Firebase not configured/i,
  /React DevTools/i,
  /\[vite\]/i,
  /Failed to load resource.*40[34]/i, // surfaced separately via request tracking
  // Dev-only motion warning: fires for any useScroll({target}) because the
  // default container (html) is position:static. Stripped from prod builds.
  /container has a non-static position/i,
  // Dev-only: CSP meta blocks Vite's HMR websocket. Not a product issue.
  /ws:\/\/localhost:24678/i,
];

function isNoise(text) {
  return IGNORED_CONSOLE.some((re) => re.test(text));
}

const report = [];

const browser = await chromium.launch();

for (const ctx of contexts) {
  // reducedMotion:"reduce" — MotionConfig reducedMotion="user" honours it, so
  // whileInView reveals render at full opacity instantly. Without it, element
  // screenshots catch sections mid-stagger (opacity ~0) and report ghosts.
  // Splash pages get their own non-reduced context below (the reduced splash
  // is a simplified render path that wouldn't QA the real variant).
  const bctx = await browser.newContext({
    viewport: { width: ctx.width, height: ctx.height },
    reducedMotion: "reduce",
  });
  const page = await bctx.newPage();
  const splashCtx = await browser.newContext({
    viewport: { width: ctx.width, height: ctx.height },
    reducedMotion: "no-preference",
  });
  const splashPage = await splashCtx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (msg) => {
    if ((msg.type() === "error" || msg.type() === "warning") && !isNoise(msg.text())) {
      consoleErrors.push(`[${msg.type()}] ${msg.text().slice(0, 300)}`);
    }
  });
  page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 500)));
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("favicon")) {
      failedRequests.push(`${res.status()} ${res.url().slice(0, 200)}`);
    }
  });
  splashPage.on("console", (msg) => {
    if ((msg.type() === "error" || msg.type() === "warning") && !isNoise(msg.text())) {
      consoleErrors.push(`[${msg.type()}] ${msg.text().slice(0, 300)}`);
    }
  });
  splashPage.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 500)));

  for (const variant of VARIANTS) {
    for (const sectionPage of ["all", "navbar", "splash"]) {
      // Splash only needs the primary desktop + one mobile context.
      if (
        sectionPage === "splash" &&
        !["barberia-en-dark-desktop", "barberia-en-dark-mobile"].includes(ctx.id)
      ) continue;

      const entry = {
        context: ctx.id,
        variant,
        page: sectionPage,
        url: "",
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        sections: [],
      };
      consoleErrors.length = 0;
      pageErrors.length = 0;
      failedRequests.length = 0;

      const url =
        `${BASE}/dev/variants-preview?section=${sectionPage}&variant=${variant}` +
        `&niche=${ctx.niche}&lang=${ctx.lang}&mode=${ctx.mode}&labels=0`;
      entry.url = url;

      const activePage = sectionPage === "splash" ? splashPage : page;
      try {
        await activePage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await activePage.waitForSelector('body[data-variants-ready="1"]', { timeout: 20000 });

        if (sectionPage === "all") {
          // Scroll through the page to trigger lazy images / whileInView reveals.
          await activePage.evaluate(async () => {
            const step = window.innerHeight;
            for (let y = 0; y <= document.body.scrollHeight; y += step) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 150));
            }
            window.scrollTo(0, 0);
          });
          // Wait for every <img> to finish loading (8s cap).
          await activePage.evaluate(() =>
            Promise.race([
              Promise.all(
                [...document.images]
                  .filter((i) => !i.complete)
                  .map((i) => new Promise((r) => { i.onload = i.onerror = r; })),
              ),
              new Promise((r) => setTimeout(r, 8000)),
            ]),
          );
          await activePage.waitForTimeout(300);
        } else if (sectionPage === "splash") {
          // Let the splash entrance animation finish (durationMs ≈ 2100).
          await activePage.waitForTimeout(1500);
        } else {
          await activePage.waitForTimeout(600);
        }

        // Per-section metrics: height + horizontal overflow offenders.
        entry.sections = await activePage.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          return [...document.querySelectorAll("[data-qa]")].map((sec) => {
            const rect = sec.getBoundingClientRect();
            const offenders = [];
            let scanned = 0;
            for (const el of sec.querySelectorAll("*")) {
              if (++scanned > 4000) break;
              if (!(el instanceof HTMLElement) || el.offsetParent === null) continue;
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) continue;
              if (r.right > vw + 8 || r.left < -8) {
                offenders.push(
                  `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".").slice(0, 80)} ` +
                  `[L${Math.round(r.left)} R${Math.round(r.right)} vw${vw}]`,
                );
                if (offenders.length >= 5) break;
              }
            }
            return {
              id: sec.getAttribute("data-qa"),
              height: Math.round(sec.scrollHeight || rect.height),
              overflow: offenders,
            };
          });
        });

        // Screenshots.
        const dir = `${OUT}/${ctx.id}/${variant}`;
        mkdirSync(dir, { recursive: true });
        if (sectionPage === "all") {
          for (const sec of entry.sections) {
            try {
              await activePage
                .locator(`[data-qa="${sec.id}"]`)
                .screenshot({ path: `${dir}/${sec.id}.png`, timeout: 8000, animations: "disabled" });
            } catch (e) {
              sec.screenshotError = String(e).slice(0, 200);
            }
          }
        } else {
          // navbar (fixed) and splash (overlay): viewport screenshot.
          await activePage.screenshot({ path: `${dir}/${sectionPage}-viewport.png` });
        }
      } catch (e) {
        entry.loadError = String(e).slice(0, 500);
      }

      entry.consoleErrors = [...new Set(consoleErrors)];
      entry.pageErrors = [...new Set(pageErrors)];
      entry.failedRequests = [...new Set(failedRequests)];
      report.push(entry);

      const flag =
        entry.loadError || entry.pageErrors.length || entry.consoleErrors.length ||
        entry.sections.some((s) => s.overflow.length || s.height < 40)
          ? " ⚠"
          : "";
      console.log(`${ctx.id} ${variant} ${sectionPage}${flag}`);
    }
  }

  await bctx.close();
  await splashCtx.close();
}

await browser.close();

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

// Compact summary of problems only.
const problems = report
  .map((e) => ({
    key: `${e.context}/${e.variant}/${e.page}`,
    loadError: e.loadError,
    pageErrors: e.pageErrors,
    consoleErrors: e.consoleErrors,
    failedRequests: e.failedRequests.slice(0, 5),
    tinySections: e.sections.filter((s) => s.height < 40).map((s) => s.id),
    overflow: e.sections
      .filter((s) => s.overflow.length)
      .map((s) => ({ id: s.id, offenders: s.overflow })),
  }))
  .filter(
    (p) =>
      p.loadError || p.pageErrors.length || p.consoleErrors.length ||
      p.failedRequests.length || p.tinySections.length || p.overflow.length,
  );
writeFileSync(`${OUT}/problems.json`, JSON.stringify(problems, null, 2));
console.log(`\n${report.length} page loads, ${problems.length} with findings → qa-screenshots/problems.json`);
