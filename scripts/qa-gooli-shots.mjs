import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "http://localhost:3000/";
const label = process.argv[2] || "before";
const OUT = path.join(ROOT, "qa-gooli", label);
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1 },
  { name: "mobile", width: 390, height: 844, dpr: 2 },
];

async function capture(page, vp) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  // splash + config fetch + fonts
  await page.waitForTimeout(6500);

  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`[${vp.name}] page height: ${pageHeight}px`);

  // walk the page once so whileInView reveals fire before shots
  for (let y = 0; y < pageHeight; y += vp.height) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
    await page.waitForTimeout(450);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(1200);

  let i = 0;
  for (let y = 0; y < pageHeight; y += vp.height) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
    await page.waitForTimeout(900);
    const file = path.join(OUT, `${vp.name}-${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    console.log(`[${vp.name}] shot ${i} @ ${y}px`);
    i++;
    if (i > 14) break;
  }

  // horizontal overflow check
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { sw: doc.scrollWidth, cw: doc.clientWidth };
  });
  if (overflow.sw > overflow.cw + 1) {
    console.warn(`[${vp.name}] ⚠ HORIZONTAL OVERFLOW: scrollWidth ${overflow.sw} > clientWidth ${overflow.cw}`);
  } else {
    console.log(`[${vp.name}] ✓ no horizontal overflow`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
    });
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`[${vp.name}] console.error:`, m.text().slice(0, 200));
    });
    await capture(page, vp);
    await ctx.close();
  }
  await browser.close();
  console.log("DONE →", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
