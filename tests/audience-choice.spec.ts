import { chromium } from "playwright";

const BASE = "http://localhost:5187";

async function run() {
  const browser = await chromium.launch({ headless: true });
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${e.message}`);
      failed++;
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  // ── Test 1: Desktop 100vh ──────────────────────────────────────────
  await test("fills exactly 100vh on desktop (no scroll)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("button[aria-label]", { timeout: 10000 });

    const box = await page.locator(".isolate").boundingBox();
    assert(box !== null, "container not found");
    assert(box!.height === 800, `expected height 800, got ${box!.height}`);

    const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
    assert(scrollH <= 800, `page scrolls: scrollHeight=${scrollH}`);
    await page.close();
  });

  // ── Test 2: Mobile 100vh ───────────────────────────────────────────
  await test("fills exactly 100vh on mobile (no scroll)", async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("button[aria-label]", { timeout: 10000 });

    const box = await page.locator(".isolate").boundingBox();
    assert(box !== null, "container not found");
    assert(box!.height === 812, `expected height 812, got ${box!.height}`);

    const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
    assert(scrollH <= 812, `page scrolls: scrollHeight=${scrollH}`);
    await page.close();
  });

  // ── Test 3: No auto-redirect after 5 seconds ──────────────────────
  await test("does NOT auto-redirect — screen stays after 5s", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("employment_audience", "worker"));
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("button[aria-label]", { timeout: 10000 });

    // Wait well past the old 3s auto-redirect
    await page.waitForTimeout(5000);

    const buttons = await page.locator("button[aria-label]").count();
    assert(buttons >= 2, `expected 2 audience buttons, found ${buttons}`);
    await page.close();
  });

  // ── Test 4: No progress bar ────────────────────────────────────────
  await test("no auto-resume progress bar exists", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("employment_audience", "worker"));
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("button[aria-label]", { timeout: 10000 });

    const barCount = await page.evaluate(() => {
      const footer = document.querySelector("footer");
      if (!footer) return 0;
      const children = footer.querySelectorAll("[aria-hidden='true']");
      let count = 0;
      children.forEach((el) => {
        const h = (el as HTMLElement);
        if (h.className.includes("h-0.5") || h.style.transformOrigin) count++;
      });
      return count;
    });
    assert(barCount === 0, `found ${barCount} progress bar(s)`);
    await page.close();
  });

  // ── Test 5: Clicking a panel navigates away ────────────────────────
  await test("clicking a panel navigates away from choice screen", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("button[aria-label]", { timeout: 10000 });

    // The audience panels are the two large buttons inside the split container
    const panels = page.locator(".isolate > div:not([aria-hidden]) button.group");
    const panelCount = await panels.count();
    assert(panelCount >= 2, `expected 2 audience panels, found ${panelCount}`);

    await panels.first().click();
    // Wait for the transition overlay + React state update
    await page.waitForTimeout(1500);

    // The audience choice panels should no longer be visible
    const remaining = await page.locator(".isolate > div:not([aria-hidden]) button.group").count();
    assert(remaining === 0, `audience panels should be gone after selection, found ${remaining}`);
    await page.close();
  });

  await browser.close();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
