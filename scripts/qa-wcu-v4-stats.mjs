/** One-off: verify v4 stats-counter branch (remodelaciones preset has hero.stats). */
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
for (const [lang, vp] of [
  ["en", { width: 1440, height: 1000 }],
  ["he", { width: 1440, height: 1000 }],
  ["en", { width: 390, height: 844 }],
]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(
    `http://localhost:5183/dev/variants-preview?section=whyChooseUs&variant=v4&niche=remodelaciones&lang=${lang}&mode=dark`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector('body[data-variants-ready="1"]', { timeout: 25000 });
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 900));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 900));
  });
  const r = await page.evaluate(() => {
    const sec = document.querySelector("#why-choose-us");
    const counters = [...sec.querySelectorAll("span[aria-label]")].map((c) => {
      const wrap = c.closest("span.font-serif") || c.parentElement;
      return {
        aria: c.getAttribute("aria-label"),
        shown: c.textContent,
        numeric: getComputedStyle(c).fontVariantNumeric,
        fontPx: Math.round(parseFloat(getComputedStyle(wrap).fontSize)),
      };
    });
    return {
      dir: getComputedStyle(document.documentElement).direction,
      vw: innerWidth,
      counters,
      hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  console.log(lang, vp.width, JSON.stringify(r), "errors:", errors.length);
  await page.screenshot({ path: `qa-wcu/v4-stats-${lang}-${vp.width}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
