import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await page.goto("https://demo-dari-inks.arzac.studio/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(7000);
await page.evaluate(() => document.querySelector("#gallery")?.scrollIntoView());
await page.waitForTimeout(1500);

const data = await page.evaluate(() => {
  const gallery = document.querySelector("#gallery");
  // find the horizontally scrollable strip
  const strips = [...gallery.querySelectorAll("div")].filter((d) => {
    const cs = getComputedStyle(d);
    return (cs.overflowX === "auto" || cs.overflowX === "scroll") && d.scrollWidth > d.clientWidth;
  });
  return strips.map((s) => {
    const r = s.getBoundingClientRect();
    const kids = [...s.children].slice(0, 3).map((k) => {
      const kr = k.getBoundingClientRect();
      return { x: Math.round(kr.x), w: Math.round(kr.width), cls: (k.className || "").toString().slice(0, 60) };
    });
    const active = s.querySelector('[aria-current="true"], [data-active="true"], .ring-2, [class*="border-accent"]');
    const ar = active ? active.getBoundingClientRect() : null;
    return {
      scrollLeft: s.scrollLeft,
      scrollWidth: s.scrollWidth,
      clientWidth: s.clientWidth,
      stripX: Math.round(r.x), stripW: Math.round(r.width),
      firstKids: kids,
      activeRect: ar ? { x: Math.round(ar.x), w: Math.round(ar.width) } : null,
    };
  });
});
console.log(JSON.stringify(data, null, 1));
await browser.close();
