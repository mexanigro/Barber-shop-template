import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "http://localhost:4200/?clientId=demo-estetica";
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 };

const SHOTS = [
  { file: "mobile-01-hero.png",         scrollVh: 0 },
  { file: "mobile-02-services.png",     scrollVh: 1 },
  { file: "mobile-03-whychooseus.png",  scrollVh: 2 },
  { file: "mobile-04-gallery.png",      scrollVh: 3 },
  { file: "mobile-05-testimonials.png", scrollVh: 4 },
  { file: "mobile-06-team.png",         scrollVh: 5 },
  { file: "mobile-07-contact.png",      scrollVh: 6 },
  { file: "mobile-08-footer.png",       scrollVh: 7 },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: VIEWPORT.width, height: VIEWPORT.height },
    deviceScaleFactor: VIEWPORT.deviceScaleFactor,
  });
  const page = await ctx.newPage();

  console.log("Navigating to", BASE_URL);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Wait for React render + any splash screen
  await page.waitForTimeout(3000);

  // Sanity check: no tour overlay
  const tourPresent = await page.evaluate(() =>
    !!document.querySelector(".driver-popover") ||
    document.body.innerText.includes("Welcome to your website")
  );
  if (tourPresent) {
    console.warn("⚠ Tour overlay detected — screenshots may be obscured");
  } else {
    console.log("✓ No tour overlay");
  }

  // Get total page height so we know when we've hit the bottom
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`Page height: ${pageHeight}px, viewport: ${VIEWPORT.height}px`);

  for (const { file, scrollVh } of SHOTS) {
    const scrollY = scrollVh * VIEWPORT.height;

    // Skip if we're past the page bottom
    if (scrollY >= pageHeight) {
      console.log(`⏭ ${file} — skipped (scroll ${scrollY}px >= page height ${pageHeight}px)`);
      continue;
    }

    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scrollY);
    // Wait 2s for animations as requested
    await page.waitForTimeout(2000);

    const dest = path.join(ROOT, file);
    await page.screenshot({
      path: dest,
      fullPage: false,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
    const { size } = fs.statSync(dest);
    console.log(`✓ ${file} (scroll ${scrollY}px) — ${Math.round(size / 1024)}KB`);
  }

  await browser.close();
  console.log("\nAll screenshots saved to repo root.");
}

main().catch((e) => { console.error(e); process.exit(1); });
