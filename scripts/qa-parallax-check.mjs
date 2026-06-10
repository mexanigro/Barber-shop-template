/** One-off: verify hero-v5 parallax responds to global.parallaxEnabled. */
import { chromium } from "playwright";

const browser = await chromium.launch();
for (const parallaxEnabled of [true, false]) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "no-preference",
  });
  const page = await ctx.newPage();
  const g = encodeURIComponent(JSON.stringify({ animationLevel: "rich", parallaxEnabled }));
  await page.goto(
    `http://localhost:3000/dev/variants-preview?section=all&variant=v5&niche=barberia&lang=en&mode=dark&labels=0&global=${g}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector('body[data-variants-ready="1"]', { timeout: 20000 });
  const result = await page.evaluate(async () => {
    const layer = document.querySelector("#hero > div"); // bg layer (motion.div)
    if (!layer) return "no-layer";
    const before = getComputedStyle(layer).transform;
    window.scrollTo(0, 500);
    await new Promise((r) => setTimeout(r, 900));
    const after = getComputedStyle(layer).transform;
    return {
      attr: document.documentElement.getAttribute("data-gs-parallax"),
      before,
      after,
      moved: before !== after,
    };
  });
  console.log(`parallaxEnabled=${parallaxEnabled}:`, JSON.stringify(result));
  await ctx.close();
}
await browser.close();
