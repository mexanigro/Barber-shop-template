/**
 * QA script — WhyChooseUs v2-v5 modernization pass (2026).
 * Drives /dev/variants-preview with its own browser (preview MCP is contested).
 * Captures screenshots + computed-style checks in LTR/RTL, desktop/mobile.
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:5183/dev/variants-preview";
const OUT = path.join(ROOT, "qa-wcu");
fs.mkdirSync(OUT, { recursive: true });

async function settle(page) {
  await page.waitForSelector('body[data-variants-ready="1"]', { timeout: 25000 });
  await page.mouse.move(5, 5); // neutralize hover
  // trigger whileInView for the whole section
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 600));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 600));
  });
}

const commonChecks = () => {
  const sec = document.querySelector("#why-choose-us");
  if (!sec) return { missing: true };
  const doc = document.documentElement;
  const h2 = sec.querySelector("h2");
  const descs = [...sec.querySelectorAll("p")].filter((p) =>
    getComputedStyle(p).textWrap === "pretty");
  const imgs = [...sec.querySelectorAll("img")].map((i) => ({
    decoding: i.decoding,
    draggable: i.draggable,
    loading: i.loading,
    hasSkeleton: Boolean(
      i.previousElementSibling &&
      getComputedStyle(i.previousElementSibling).animationName !== "none" &&
      getComputedStyle(i.previousElementSibling).position === "absolute",
    ),
  }));
  const small = [...sec.querySelectorAll("a, button")]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { t: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) };
    })
    .filter((x) => (x.w > 0 || x.h > 0) && x.w < 44 && x.h < 44);
  return {
    dir: getComputedStyle(doc).direction,
    h2Wrap: h2 ? getComputedStyle(h2).textWrap : "no-h2",
    prettyDescCount: descs.length,
    hOverflow: doc.scrollWidth - doc.clientWidth,
    imgs,
    smallTargets: small,
  };
};

const variantChecks = {
  v2: () => {
    const sec = document.querySelector("#why-choose-us");
    // node circle should be horizontally centered on the track line at lg+
    const node = sec.querySelector("ol li span");
    const track = sec.querySelector('[aria-hidden="true"]');
    const n = node.getBoundingClientRect();
    const t = track.getBoundingClientRect();
    return {
      nodeCenterX: Math.round(n.x + n.width / 2),
      trackX: Math.round(t.x),
      h3Wrap: getComputedStyle(sec.querySelector("ol h3")).textWrap,
    };
  },
  v3: () => {
    const sec = document.querySelector("#why-choose-us");
    return {
      srOnlyLabels: sec.querySelectorAll(".sr-only").length,
    };
  },
  v4: () => {
    const sec = document.querySelector("#why-choose-us");
    const counter = sec.querySelector('span[aria-label]');
    return {
      counterNumeric: counter ? getComputedStyle(counter).fontVariantNumeric : "no-stats",
      counterFontPx: counter
        ? Math.round(parseFloat(getComputedStyle(counter.closest("span.font-serif") || counter.parentElement).fontSize))
        : null,
      counterText: counter ? counter.textContent : null,
      counterAria: counter ? counter.getAttribute("aria-label") : null,
    };
  },
  v5: () => {
    const sec = document.querySelector("#why-choose-us");
    const quote = sec.querySelector("blockquote");
    return {
      quoteDir: quote ? quote.getAttribute("dir") : "no-quote",
      quoteWrap: quote ? getComputedStyle(quote).textWrap : null,
      rating: sec.querySelector('[role="img"]')?.getAttribute("aria-label") ?? null,
    };
  },
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = {};
  for (const variant of ["v2", "v3", "v4", "v5"]) {
    for (const lang of ["en", "he"]) {
      for (const vp of [{ n: "desktop", w: 1440, h: 1000 }, { n: "mobile", w: 390, h: 844 }]) {
        for (const mode of vp.n === "desktop" ? ["dark", "light"] : ["dark"]) {
          const key = `${variant}-${lang}-${vp.n}-${mode}`;
          const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
          const page = await ctx.newPage();
          const errors = [];
          page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
          await page.goto(`${BASE}?section=whyChooseUs&variant=${variant}&niche=barberia&lang=${lang}&mode=${mode}`, { waitUntil: "domcontentloaded" });
          await settle(page);
          const r = { common: await page.evaluate(commonChecks), errors };
          if (vp.n === "desktop") r.variant = await page.evaluate(variantChecks[variant]);
          results[key] = r;
          await page.screenshot({ path: path.join(OUT, `${key}.png`), fullPage: true });
          await ctx.close();
        }
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });
