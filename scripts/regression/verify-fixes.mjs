// Focused post-fix verification for the 2026-06-11 regression fixes.
import { chromium } from "playwright";

const CHECKS = [
  {
    site: "santi", url: "https://demo-santi-mq3luclw.arzac.studio/",
    expect: "no #team anchor link",
    run: async (page) => {
      const teamLinks = await page.$$eval('a[href="#team"]', (a) => a.length);
      return { pass: teamLinks === 0, detail: `a[href=#team] count=${teamLinks}` };
    },
  },
  {
    site: "pintureria-el-paolo", url: "https://demo-pintureria-el-paolo-mpfwkvuh.arzac.studio/",
    expect: "no #team anchor link",
    run: async (page) => {
      const teamLinks = await page.$$eval('a[href="#team"]', (a) => a.length);
      return { pass: teamLinks === 0, detail: `a[href=#team] count=${teamLinks}` };
    },
  },
  {
    site: "cafe-aristano", url: "https://demo-cafe-aristano-mpfwjz7c.arzac.studio/",
    expect: "no #services/#why-choose-us links + hero brand Aristano",
    run: async (page) => {
      const bad = await page.$$eval('a[href="#services"], a[href="#why-choose-us"]', (a) => a.length);
      const h1 = await page.$eval("h1", (e) => e.textContent.trim());
      const brandOk = /aristano/i.test(h1);
      return { pass: bad === 0 && brandOk, detail: `phantom links=${bad}; h1="${h1.slice(0, 60)}"` };
    },
  },
  {
    site: "velvet-muse", url: "https://demo-velvet-muse.arzac.studio/",
    expect: "hero primary CTA is a button that opens booking wizard",
    run: async (page) => {
      const bookingAnchors = await page.$$eval('a[href="#booking"]', (a) => a.length);
      // click the hero primary CTA (first button/link inside the hero containing book-ish text)
      const cta = await page.$("main button:has-text('Book'), main button:has-text('הזמ'), main button:has-text('קבע'), main button:has-text('consultation')");
      let opened = false;
      if (cta) {
        await cta.click().catch(() => {});
        opened = await page.waitForSelector('[data-testid="booking-wizard"]', { timeout: 9000 }).then(() => true).catch(() => false);
        if (opened) await page.waitForTimeout(2500);
      }
      return { pass: bookingAnchors === 0 && opened, detail: `a[href=#booking]=${bookingAnchors}; ctaFound=${!!cta}; wizardOpened=${opened}` };
    },
  },
  {
    site: "estetica-prueba", url: "https://demo-estetica-prueba-mpfvpl5u.arzac.studio/",
    expect: "(diagnostic) what does the book CTA do",
    run: async (page) => {
      const cta = await page.$("header button:has-text('ייעוץ'), main button:has-text('ייעוץ'), header a:has-text('ייעוץ'), main a:has-text('ייעוץ')");
      if (!cta) return { pass: false, detail: "no CTA found" };
      const tag = await cta.evaluate((e) => e.tagName + " href=" + (e.getAttribute("href") || "none"));
      await cta.click().catch(() => {});
      const opened = await page.waitForSelector('[data-testid="booking-wizard"]', { timeout: 8000 }).then(() => true).catch(() => false);
      const scrollY = await page.evaluate(() => window.scrollY);
      const anyDialog = await page.$$eval('[role="dialog"]', (d) => d.length);
      return { pass: opened || scrollY > 200 || anyDialog > 0, detail: `cta=${tag}; wizardOpened=${opened}; scrollY=${Math.round(scrollY)}; dialogs=${anyDialog}` };
    },
  },
  {
    site: "barberia", url: "https://barber-shop-template-ten.vercel.app/",
    expect: "no gtag CSP violation in console",
    run: async (page, log) => {
      await page.waitForTimeout(4000);
      const cspErrors = log.consoleErrors.filter((e) => /googletagmanager|Content Security Policy/i.test(e));
      return { pass: cspErrors.length === 0, detail: cspErrors[0] ? cspErrors[0].slice(0, 120) : "console clean" };
    },
  },
  {
    site: "barberia-en", url: "https://barber-shop-template-en.vercel.app/",
    expect: "no gtag CSP violation + no dead twitter link",
    run: async (page, log) => {
      await page.waitForTimeout(4000);
      const cspErrors = log.consoleErrors.filter((e) => /googletagmanager|Content Security Policy/i.test(e));
      const twitter = await page.$$eval('a[href*="twitter.com"]', (a) => a.map((x) => x.href));
      return { pass: cspErrors.length === 0 && twitter.length === 0, detail: `csp=${cspErrors.length}; twitterLinks=${JSON.stringify(twitter)}` };
    },
  },
  {
    site: "martellin", url: "https://demo-martellin-mpfwij1m.arzac.studio/",
    expect: "no dead twitter link in footer",
    run: async (page) => {
      const twitter = await page.$$eval('a[href*="twitter.com"]', (a) => a.map((x) => x.href));
      return { pass: twitter.length === 0, detail: JSON.stringify(twitter) };
    },
  },
  {
    site: "unas-de-mar", url: "https://demo-u-as-de-mar-mpfynv07.arzac.studio/",
    expect: "no dead twitter link in footer",
    run: async (page) => {
      const twitter = await page.$$eval('a[href*="twitter.com"]', (a) => a.map((x) => x.href));
      return { pass: twitter.length === 0, detail: JSON.stringify(twitter) };
    },
  },
];

const ONLY = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
let failures = 0;
for (const c of CHECKS) {
  if (ONLY.length && !ONLY.includes(c.site)) continue;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const log = { consoleErrors: [] };
  page.on("console", (m) => { if (m.type() === "error") log.consoleErrors.push(m.text()); });
  try {
    await page.goto(c.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(14000); // tenant config + splash settle
    const res = await c.run(page, log);
    if (!res.pass) failures++;
    console.log(`${res.pass ? "PASS" : "FAIL"}  ${c.site} — ${c.expect} :: ${res.detail}`);
  } catch (e) {
    failures++;
    console.log(`ERROR ${c.site}: ${String(e).slice(0, 160)}`);
  } finally {
    await ctx.close();
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
