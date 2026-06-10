/** One-off: computed-style resolution of directly conflicting flag pairs. */
import { chromium } from "playwright";

const CASES = [
  { id: "c5 cardStyle:glass + glassmorphism:false", global: { cardStyle: "glass", glassmorphism: false } },
  { id: "c5b cardStyle:glass + glassmorphism:true", global: { cardStyle: "glass", glassmorphism: true } },
  { id: "c6 shadowStyle:none + cardStyle:elevated", global: { shadowStyle: "none", cardStyle: "elevated" } },
  { id: "c7 animationLevel:none + transitionSpeed:slow", global: { animationLevel: "none", transitionSpeed: "slow" } },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

for (const c of CASES) {
  const g = encodeURIComponent(JSON.stringify(c.global));
  await page.goto(
    `http://localhost:3000/dev/variants-preview?section=all&variant=v4&niche=barberia&lang=en&mode=dark&labels=0&global=${g}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector('body[data-variants-ready="1"]', { timeout: 20000 });
  await page.waitForTimeout(500);
  const probes = await page.evaluate(() => {
    const pick = (sel, props) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      return Object.fromEntries(props.map((p) => [p, s.getPropertyValue(p)]));
    };
    return {
      card: pick(".glass-card-interactive, .shadow-elevated", [
        "backdrop-filter", "box-shadow", "background-color", "border-color",
      ]),
      anyBlur: pick('[class*="backdrop-blur"]', ["backdrop-filter"]),
      transition: pick("button", ["transition-duration"]),
      animatedEl: (() => {
        const el = document.querySelector('[class*="animate-"]');
        return el ? getComputedStyle(el).animationDuration : null;
      })(),
    };
  });
  console.log(`== ${c.id}\n${JSON.stringify(probes, null, 1)}`);
}
await ctx.close();
await browser.close();
