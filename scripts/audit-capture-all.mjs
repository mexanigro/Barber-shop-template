import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ROOT = path.join(ROOT, "qa-audit");
fs.mkdirSync(OUT_ROOT, { recursive: true });

const SITES = [
  { id: "barberia", url: "https://barber-shop-template-ten.vercel.app/" },
  { id: "barberia-en", url: "https://barber-shop-template-en.vercel.app/" },
  { id: "estetica", url: "https://demo-estetica-prueba-mpfvpl5u.arzac.studio/" },
  { id: "velvet-muse", url: "https://demo-velvet-muse.arzac.studio/" },
  { id: "gooli-ink", url: "https://demo-gooli-ink.arzac.studio/" },
  { id: "igal-tattz", url: "https://demo-igal-tattz.arzac.studio/" },
  { id: "future-tattoo", url: "https://demo-future-tattoo.arzac.studio/" },
  { id: "future-piercing", url: "https://demo-future-tattoo-piercing-mq743hl4.arzac.studio/" },
  { id: "dari-inks", url: "https://demo-dari-inks.arzac.studio/" },
  { id: "marganink", url: "https://demo-marganink.arzac.studio/" },
  { id: "martellin", url: "https://demo-martellin-mpfwij1m.arzac.studio/" },
  { id: "nails-mar", url: "https://demo-u-as-de-mar-mpfynv07.arzac.studio/" },
  { id: "cafe-aristano", url: "https://demo-cafe-aristano-mpfwjz7c.arzac.studio/" },
  { id: "santi", url: "https://demo-santi-mq3luclw.arzac.studio/" },
  { id: "pintureria", url: "https://demo-pintureria-el-paolo-mpfwkvuh.arzac.studio/" },
  { id: "lekt-grigori", url: "https://demo-lekt-grigori-mpyhjweg.arzac.studio/" },
  { id: "tpl-tattoo", url: "https://tattoo-template-lac.vercel.app/" },
  { id: "tpl-nails", url: "https://nails-template-zeta.vercel.app/" },
  { id: "tpl-cafeteria", url: "https://cafeteria-soft-template.vercel.app/" },
  { id: "tpl-remodelaciones", url: "https://remodelaciones-template.vercel.app/" },
];

async function sweep(page, height) {
  for (let y = 0; y < height; y += 800) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(600);
}

async function captureViewport(browser, site, { name, viewport, maxShots }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 160)));
  const outDir = path.join(OUT_ROOT, site.id);
  fs.mkdirSync(outDir, { recursive: true });
  const report = { site: site.id, viewport: name, url: site.url };
  try {
    await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(7000); // splash + firestore overlay
    const height = await page.evaluate(() => document.body.scrollHeight);
    await sweep(page, height);

    report.broken = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:"))
        .map((i) => i.src.slice(0, 140))
    );
    report.probe = await page.evaluate(() => {
      const h = document.documentElement;
      const h1 = document.querySelector("h1");
      return {
        cls: h.className,
        dir: h.getAttribute("dir"),
        niche: h.getAttribute("data-niche"),
        bg: getComputedStyle(document.body).backgroundColor,
        h1: h1 ? h1.textContent.trim().slice(0, 60) : null,
        title: document.title.slice(0, 70),
        height: document.body.scrollHeight,
        sections: [...document.querySelectorAll("section[id], section[data-section]")].map(s => s.id || s.getAttribute("data-section")).slice(0, 20),
      };
    });
    report.errors = [...new Set(errors)].slice(0, 6);

    let i = 0;
    const fullH = report.probe.height;
    for (let y = 0; y < fullH && i <= maxShots; y += viewport.height - 80) {
      await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(outDir, `${name}-${String(i).padStart(2, "0")}.jpg`), quality: 70, type: "jpeg" });
      i++;
    }
    report.shots = i;
  } catch (e) {
    report.fatal = String(e).slice(0, 200);
  }
  await ctx.close();
  return report;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const reports = [];
  const queue = [...SITES];
  async function worker() {
    while (queue.length) {
      const site = queue.shift();
      for (const vp of [
        { name: "d", viewport: { width: 1440, height: 900 }, maxShots: 14 },
        { name: "m", viewport: { width: 390, height: 844 }, maxShots: 18 },
      ]) {
        const r = await captureViewport(browser, site, vp);
        reports.push(r);
        console.log(JSON.stringify(r));
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  fs.writeFileSync(path.join(OUT_ROOT, "report.json"), JSON.stringify(reports, null, 2));
  await browser.close();
  console.log("DONE");
}

main().catch((e) => { console.error(e); process.exit(1); });
