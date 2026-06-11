import { chromium } from "playwright";

const checks = [
  {
    url: "https://demo-estetica-prueba-mpfvpl5u.arzac.studio/",
    probe: () => ({
      tagline: document.body.innerText.includes("HACEMOS LABIOS") ? "SPANISH-LEAK" : "ok",
      lipFiller: document.body.innerText.includes("Relleno de Labios") ? "SPANISH-LEAK" : "ok",
      district: document.body.innerText.includes("Centro") ? "CENTRO-LEAK" : "ok",
      beforeAfter: document.querySelector("#before-after, [data-section='beforeAfter']") ? "STILL-ON" : "off",
    }),
  },
  {
    url: "https://demo-cafe-aristano-mpfwjz7c.arzac.studio/",
    probe: () => ({
      h1: document.querySelector("h1")?.textContent?.trim().slice(0, 40),
      tagline: document.body.innerText.includes("Artisanal Coffee") ? "EN-LEAK" : "ok",
      rating49: document.body.innerText.includes("4.9") ? "STILL-4.9" : "ok",
    }),
  },
  {
    url: "https://demo-marganink.arzac.studio/",
    probe: () => ({
      la: document.body.innerText.includes("Los Angeles") ? "LA-LEAK" : "ok",
      artists3: document.body.innerText.includes("אמני מקצוע") ? "3-ARTISTS-LEAK" : "ok",
      teamTitle: document.body.innerText.includes("האמנית") ? "feminine-ok" : "check",
    }),
  },
  {
    url: "https://barber-shop-template-ten.vercel.app/",
    probe: () => ({
      liamEmail: document.body.innerText.includes("liam.arzac") ? "LIAM-EMAIL-LEAK" : "ok",
      shekel: document.body.innerText.includes("₪") ? "SHEKEL-STILL" : "ok",
    }),
  },
  {
    url: "https://demo-future-tattoo.arzac.studio/",
    probe: () => ({
      la: document.body.innerText.includes("Los Angeles") ? "LA-LEAK" : "ok",
      h1Font: document.querySelector("h1") ? getComputedStyle(document.querySelector("h1")).fontFamily.slice(0, 40) : null,
    }),
  },
];

const browser = await chromium.launch({ headless: true });
for (const c of checks) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  try {
    await page.goto(c.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(8000);
    // sweep to render lazy sections
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 900) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(200);
    }
    const result = await page.evaluate(c.probe);
    console.log(c.url, "→", JSON.stringify(result));
  } catch (e) {
    console.log(c.url, "ERR", String(e).slice(0, 120));
  }
  await page.close();
}
await browser.close();
