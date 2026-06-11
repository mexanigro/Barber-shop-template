import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await page.goto("https://demo-dari-inks.arzac.studio/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(7000);
await page.evaluate(() => document.querySelector("#testimonials")?.scrollIntoView());
await page.waitForTimeout(1500);

const data = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#testimonials [role="img"]')];
  return rows.slice(0, 12).map((row) => {
    const stars = [...row.querySelectorAll("svg")];
    return {
      label: row.getAttribute("aria-label"),
      stars: stars.map((s) => {
        const cs = getComputedStyle(s);
        return { fill: s.getAttribute("fill"), color: cs.color };
      }).slice(0, 5),
    };
  });
});
console.log(JSON.stringify(data, null, 1));
await browser.close();
