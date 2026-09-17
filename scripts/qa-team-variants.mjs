/**
 * QA script — Team v2-v5 modernization pass (2026).
 * Drives /dev/variants-preview with its own browser (preview MCP is contested).
 * Captures screenshots + computed-style checks in LTR/RTL, desktop/mobile.
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:5183/dev/variants-preview";
const OUT = path.join(ROOT, "qa-team");
fs.mkdirSync(OUT, { recursive: true });

const STRONG = "cubic-bezier(0.23, 1, 0.32, 1)";

async function settle(page) {
  await page.waitForSelector('body[data-variants-ready="1"]', { timeout: 25000 });
  await page.mouse.move(5, 5); // neutralize hover
  await page.waitForTimeout(400);
}

const commonChecks = () => {
  const team = document.querySelector("#team");
  const h2 = team.querySelector("h2");
  const imgs = [...team.querySelectorAll("img")];
  const underlays = imgs
    .map((i) => i.previousElementSibling)
    .filter((u) => u && getComputedStyle(u).position === "absolute");
  const doc = document.documentElement;
  // visible interactive elements below 44px in BOTH dimensions
  const small = [...team.querySelectorAll("a, button")]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { t: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) };
    })
    .filter((x) => (x.w > 0 || x.h > 0) && x.w < 44 && x.h < 44);
  return {
    dir: getComputedStyle(doc).direction,
    h2Wrap: getComputedStyle(h2).textWrap,
    hOverflow: doc.scrollWidth - doc.clientWidth,
    imgCount: imgs.length,
    skeletons: underlays.map((u) => getComputedStyle(u).animationName),
    imgTimings: [...new Set(imgs.map((i) => getComputedStyle(i).transitionTimingFunction))],
    smallTargets: small,
  };
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = {};
  for (const variant of ["v2", "v3", "v4", "v5"]) {
    for (const lang of ["en", "he"]) {
      for (const vp of [{ n: "desktop", w: 1440, h: 1000 }, { n: "mobile", w: 390, h: 844 }]) {
        const key = `${variant}-${lang}-${vp.n}`;
        const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
        await page.goto(`${BASE}?section=team&variant=${variant}&niche=barberia&lang=${lang}&mode=dark`, { waitUntil: "domcontentloaded" });
        await settle(page);
        const r = { common: await page.evaluate(commonChecks), errors };

        if (variant === "v2") {
          r.v2 = await page.evaluate(async () => {
            const team = document.querySelector("#team");
            const rail = team.querySelector("[data-team-card]").parentElement;
            rail.scrollLeft = (getComputedStyle(rail).direction === "rtl" ? -1 : 1) * 200;
            rail.dispatchEvent(new Event("scroll"));
            await new Promise((res) => setTimeout(res, 350));
            const wrap = team.querySelector(":scope > div");
            const bar = [...wrap.children].find((c) => c.className.includes("mt-3"));
            const inner = bar?.firstElementChild;
            if (inner) inner.style.transitionDuration = "0s";
            const arrows = [...team.querySelectorAll("button[aria-label]")].map((b) => {
              const rr = b.getBoundingClientRect();
              return { w: Math.round(rr.width), h: Math.round(rr.height), scaleOfChevron: getComputedStyle(b.querySelector("svg")).scale };
            });
            return {
              canScroll: rail.scrollWidth - rail.clientWidth > 4,
              progressRendered: !!inner,
              progressOrigin: inner ? getComputedStyle(inner).transformOrigin : null,
              trackW: bar ? Math.round(bar.getBoundingClientRect().width) : null,
              progressTransform: inner ? getComputedStyle(inner).transform : null,
              arrows,
            };
          });
        }

        if (variant === "v3" && vp.n === "desktop") {
          // hover first card → slide-up panel
          await page.hover("#team article:first-of-type");
          await page.waitForTimeout(450);
          r.v3 = await page.evaluate(() => {
            const card = document.querySelector("#team article");
            const panel = card.querySelector(".absolute.inset-x-0.bottom-0");
            const cs = panel ? getComputedStyle(panel) : null;
            const socials = [...card.querySelectorAll('a[aria-label^="Instagram"], a[aria-label^="Facebook"]')].map((a) => {
              const rr = a.getBoundingClientRect();
              return { w: Math.round(rr.width), h: Math.round(rr.height) };
            });
            return cs
              ? { opacity: cs.opacity, translate: cs.translate, timing: cs.transitionTimingFunction, props: cs.transitionProperty, socials }
              : { panel: "missing" };
          });
        }

        if (variant === "v4" && vp.n === "desktop") {
          const row = page.locator("#team ul a").first();
          if (await row.count()) {
            const before = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
            await row.hover();
            await page.waitForTimeout(350);
            const after = await row.evaluate((el) => {
              el.style.transitionDuration = "0s";
              return getComputedStyle(el).backgroundColor;
            });
            r.v4 = { rowBgBefore: before, rowBgAfter: after, rowHoverChanges: before !== after };
          } else {
            r.v4 = { rows: "none (single member?)" };
          }
        }

        if (variant === "v5" && vp.n === "desktop") {
          const avatar = page.locator("#team .group").first();
          await avatar.hover();
          await page.waitForTimeout(450);
          r.v5 = await page.evaluate(() => {
            const group = document.querySelector("#team .group");
            const img = group.querySelector("img");
            const caption = group.querySelector("div.mt-3");
            const ci = getComputedStyle(img);
            const cc = getComputedStyle(caption);
            return {
              imgFilterOnHover: ci.filter,
              imgTiming: ci.transitionTimingFunction,
              captionOpacityTarget: caption.matches(":hover, :where(.group:hover *)") ? "n/a" : null,
              captionTiming: cc.transitionTimingFunction,
              captionProps: cc.transitionProperty,
            };
          });
        }

        await page.mouse.move(5, 5);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(OUT, `team-${key}.png`), fullPage: true });
        results[key] = r;
        await ctx.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
