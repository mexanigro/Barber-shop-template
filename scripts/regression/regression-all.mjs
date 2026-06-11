// Mass production regression: every demo site × (mobile/tablet/desktop) × (he/en) × (light/dark)
// plus per-site interactive pass (splash, booking wizard, links, chatbot FAB).
// Output: qa-regression/results/<site>.json + screenshots in qa-regression/shots/<site>/
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "qa-regression");
const SHOTS = path.join(OUT, "shots");
const RESULTS = path.join(OUT, "results");
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(RESULTS, { recursive: true });

const SITES = [
  { id: "santi", url: "https://demo-santi-mq3luclw.arzac.studio/" },
  { id: "lekt-grigori", url: "https://demo-lekt-grigori-mpyhjweg.arzac.studio/" },
  { id: "martellin", url: "https://demo-martellin-mpfwij1m.arzac.studio/" },
  { id: "future-tattoo-old", url: "https://demo-future-tattoo.arzac.studio/" },
  { id: "barberia", url: "https://barber-shop-template-ten.vercel.app/" },
  { id: "pintureria-el-paolo", url: "https://demo-pintureria-el-paolo-mpfwkvuh.arzac.studio/" },
  { id: "future-tattoo-piercing", url: "https://demo-future-tattoo-piercing-mq743hl4.arzac.studio/" },
  { id: "cafe-aristano", url: "https://demo-cafe-aristano-mpfwjz7c.arzac.studio/" },
  { id: "estetica-prueba", url: "https://demo-estetica-prueba-mpfvpl5u.arzac.studio/" },
  { id: "igal-tattz", url: "https://demo-igal-tattz.arzac.studio/" },
  { id: "velvet-muse", url: "https://demo-velvet-muse.arzac.studio/" },
  { id: "marganink", url: "https://demo-marganink.arzac.studio/" },
  { id: "gooli-ink", url: "https://demo-gooli-ink.arzac.studio/" },
  { id: "barberia-en", url: "https://barber-shop-template-en.vercel.app/" },
  { id: "unas-de-mar", url: "https://demo-u-as-de-mar-mpfynv07.arzac.studio/" },
  { id: "dari-inks", url: "https://demo-dari-inks.arzac.studio/" },
  { id: "remodelaciones", url: "https://remodelaciones-template.vercel.app/" },
  { id: "cafeteria", url: "https://cafeteria-soft-template.vercel.app/" },
  { id: "nails", url: "https://nails-template-zeta.vercel.app/" },
  { id: "tattoo", url: "https://tattoo-template-lac.vercel.app/" },
];

const ONLY = process.argv.slice(2); // optional site ids to restrict run
const VIEWPORTS = {
  m: { width: 390, height: 844 },
  t: { width: 768, height: 1024 },
  d: { width: 1440, height: 900 },
};
const PLACEHOLDER_MARK = "1a1a2e"; // handleImgError fallback svg gradient color

async function sweep(page, stepMs = 220) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  for (let y = 0; y < height; y += Math.max(400, vh - 120)) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
    await page.waitForTimeout(stepMs);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(700);
}

const CHECKS = () => {
  const html = document.documentElement;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const vis = (r) => r.width > 4 && r.height > 4;

  const imgs = [...document.images];
  const placeholderImgs = imgs
    .filter((i) => i.src.startsWith("data:image/svg") && i.src.includes("1a1a2e"))
    .map((i) => (i.getAttribute("alt") || i.className || "img").slice(0, 80));
  const brokenImgs = imgs
    .filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:"))
    .map((i) => (i.currentSrc || i.src).slice(0, 160));

  // navbar overlap: visible interactive items inside header/nav, pairwise intersection
  const navRoot = document.querySelector("header") || document.querySelector("nav");
  let navOverlaps = [];
  let navOffscreen = [];
  if (navRoot) {
    const items = [...navRoot.querySelectorAll("a, button, img, h1, [role=button]")]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
      })
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter((x) => vis(x.r) && x.r.top < 140);
    for (let a = 0; a < items.length; a++) {
      for (let b = a + 1; b < items.length; b++) {
        const A = items[a], B = items[b];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const ox = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
        const oy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
        if (ox > 8 && oy > 8) {
          const tag = (x) => `${x.el.tagName}:${(x.el.textContent || x.el.getAttribute("aria-label") || x.el.getAttribute("alt") || "").trim().slice(0, 24)}`;
          navOverlaps.push(`${tag(A)} <-> ${tag(B)} (${Math.round(ox)}x${Math.round(oy)}px)`);
        }
      }
      const r = items[a].r;
      if (r.left < -4 || r.right > vw + 4) navOffscreen.push(`${items[a].el.tagName}:${(items[a].el.textContent || "").trim().slice(0, 24)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
    navOverlaps = [...new Set(navOverlaps)].slice(0, 8);
    navOffscreen = [...new Set(navOffscreen)].slice(0, 8);
  }

  // fixed elements near bottom (chat FAB, a11y, sticky CTAs): mutual overlap + out of viewport
  const fixedBottom = [...document.querySelectorAll("body *")]
    .filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.visibility === "hidden" || cs.display === "none") return false;
      const r = el.getBoundingClientRect();
      return vis(r) && r.top > vh * 0.55 && r.width < vw * 0.9; // ignore full-width bars
    })
    .map((el) => ({
      label: (el.getAttribute("aria-label") || el.id || el.className?.toString?.() || el.tagName).slice(0, 50),
      r: el.getBoundingClientRect(),
    }));
  const fabIssues = [];
  for (let a = 0; a < fixedBottom.length; a++) {
    const A = fixedBottom[a];
    if (A.r.right > vw + 2 || A.r.left < -2 || A.r.bottom > vh + 2) fabIssues.push(`offscreen: ${A.label} [${Math.round(A.r.left)},${Math.round(A.r.top)},${Math.round(A.r.right)},${Math.round(A.r.bottom)}]`);
  }

  const sections = [...document.querySelectorAll("section")].filter((s) => s.getBoundingClientRect().height > 40);

  return {
    dir: html.dir || "ltr",
    lang: html.lang,
    niche: html.dataset.niche || null,
    dark: html.classList.contains("dark"),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    h1: document.querySelector("h1")?.textContent?.trim().slice(0, 70) || null,
    sectionCount: sections.length,
    sectionIds: sections.map((s) => s.id || s.className.toString().split(" ")[0]).slice(0, 24),
    rootEmpty: !document.getElementById("root")?.childElementCount,
    hOverflowPx: Math.max(0, document.documentElement.scrollWidth - vw),
    placeholderImgs: placeholderImgs.slice(0, 10),
    brokenImgs: brokenImgs.slice(0, 10),
    imgCount: imgs.length,
    navOverlaps,
    navOffscreen,
    fabIssues: [...new Set(fabIssues)].slice(0, 6),
    fixedBottomCount: fixedBottom.length,
  };
};

async function newPage(browser, viewport, init) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", locale: "en-US" });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const page = await ctx.newPage();
  const log = { consoleErrors: [], pageErrors: [], failedReqs: [] };
  page.on("console", (m) => { if (m.type() === "error") log.consoleErrors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => log.pageErrors.push(String(e).slice(0, 200)));
  page.on("response", (res) => {
    const s = res.status();
    if (s >= 400) log.failedReqs.push(`${s} ${res.url().slice(0, 170)}`);
  });
  return { ctx, page, log };
}

async function runCombo(browser, site, comboName, viewport, lang, theme) {
  const init = lang
    ? {
        fn: ([l, t]) => {
          try {
            localStorage.setItem("preferred_language", l);
            if (t) localStorage.setItem("vite-ui-theme", t);
          } catch {}
        },
        arg: [lang, theme],
      }
    : null;
  const { ctx, page, log } = await newPage(browser, viewport, init);
  try {
    await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(6500); // tenant config + splash
    await sweep(page);
    const checks = await page.evaluate(CHECKS);
    const dir = path.join(SHOTS, site.id);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `${comboName}.jpg`), type: "jpeg", quality: 55 });
    return {
      combo: comboName,
      ...checks,
      consoleErrors: [...new Set(log.consoleErrors)].slice(0, 8),
      pageErrors: [...new Set(log.pageErrors)].slice(0, 5),
      failedReqs: [...new Set(log.failedReqs)].slice(0, 15),
    };
  } catch (e) {
    return { combo: comboName, fatal: String(e).slice(0, 250) };
  } finally {
    await ctx.close();
  }
}

async function interactivePass(browser, site) {
  const out = { splash: {}, booking: {}, links: {} };

  // --- splash behaviour (fresh visitor, no storage) ---
  {
    const { ctx, page } = await newPage(browser, VIEWPORTS.d, null);
    try {
      await page.goto(site.url, { waitUntil: "commit", timeout: 45000 });
      await page.waitForTimeout(1200);
      const early = await page.evaluate(() => {
        const vw = innerWidth, vh = innerHeight;
        return [...document.querySelectorAll("body *")].some((el) => {
          const cs = getComputedStyle(el);
          if (cs.position !== "fixed" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false;
          const r = el.getBoundingClientRect();
          return r.width > vw * 0.9 && r.height > vh * 0.9 && +cs.zIndex >= 50;
        });
      });
      await page.waitForTimeout(13000);
      const late = await page.evaluate(() => {
        const vw = innerWidth, vh = innerHeight;
        const el = [...document.querySelectorAll("body *")].find((el) => {
          const cs = getComputedStyle(el);
          if (cs.position !== "fixed" || cs.visibility === "hidden" || +cs.opacity < 0.05 || cs.pointerEvents === "none") return false;
          const r = el.getBoundingClientRect();
          return r.width > vw * 0.9 && r.height > vh * 0.9 && +cs.zIndex >= 50 && !el.querySelector("input,form");
        });
        return el ? (el.className?.toString?.() || el.tagName).slice(0, 60) : null;
      });
      out.splash = { shown: early, stuckAfter14s: late };
    } catch (e) {
      out.splash = { fatal: String(e).slice(0, 200) };
    } finally {
      await ctx.close();
    }
  }

  // --- booking wizard + link collection (default lang desktop) ---
  {
    const { ctx, page } = await newPage(browser, VIEWPORTS.d, null);
    try {
      await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(15000); // let splash finish fully

      // collect links before clicking anything
      out.links.collected = await page.evaluate(() => {
        const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
        const ids = new Set([...document.querySelectorAll("[id]")].map((e) => e.id));
        const uniq = [...new Set(hrefs)];
        return {
          http: uniq.filter((h) => /^https?:\/\//.test(h)).slice(0, 40),
          hashMissing: uniq.filter((h) => /^#.+/.test(h) && !ids.has(h.slice(1))),
          other: uniq.filter((h) => !/^https?:\/\//.test(h) && !/^#/.test(h)).slice(0, 15),
        };
      });

      // find a Book CTA
      const bookRe = /book|appoint|reserv|הזמן|קבע|לקביעת|תור|запис|הרשמה/i;
      const btns = await page.$$("header a, header button, nav a, nav button, main a, main button, button, a");
      let clicked = false;
      for (const b of btns) {
        const txt = ((await b.textContent()) || "") + " " + ((await b.getAttribute("aria-label")) || "");
        if (bookRe.test(txt) && (await b.isVisible())) {
          await b.click({ timeout: 4000 }).catch(() => {});
          clicked = true;
          break;
        }
      }
      if (clicked) {
        try {
          await page.waitForSelector('[data-testid="booking-wizard"]', { timeout: 9000 });
          await page.waitForTimeout(2000); // lazy-loaded wizard body (Suspense)
          const wiz = await page.evaluate(() => {
            const w = document.querySelector('[data-testid="booking-wizard"]');
            const r = w.getBoundingClientRect();
            return { visible: r.width > 200 && r.height > 200, hasContent: w.textContent.trim().length > 30 };
          });
          out.booking = { ctaFound: true, opened: true, ...wiz };
          const dir = path.join(SHOTS, site.id);
          fs.mkdirSync(dir, { recursive: true });
          await page.screenshot({ path: path.join(dir, "booking.jpg"), type: "jpeg", quality: 55 });
        } catch {
          out.booking = { ctaFound: true, opened: false };
        }
      } else {
        out.booking = { ctaFound: false };
      }
    } catch (e) {
      out.booking.fatal = String(e).slice(0, 200);
    } finally {
      await ctx.close();
    }
  }

  // --- verify collected http links from node (no CORS) ---
  if (out.links.collected?.http?.length) {
    const broken = [];
    await Promise.all(
      out.links.collected.http.map(async (u) => {
        try {
          const ctl = new AbortController();
          const t = setTimeout(() => ctl.abort(), 12000);
          let res = await fetch(u, { method: "HEAD", redirect: "follow", signal: ctl.signal });
          if (res.status >= 400 || res.status === 405) res = await fetch(u, { method: "GET", redirect: "follow", signal: ctl.signal });
          clearTimeout(t);
          if (res.status >= 400) broken.push(`${res.status} ${u.slice(0, 140)}`);
        } catch (e) {
          broken.push(`ERR(${String(e.cause?.code || e.name).slice(0, 20)}) ${u.slice(0, 140)}`);
        }
      })
    );
    out.links.broken = broken;
  }
  return out;
}

async function runSite(browser, site) {
  const t0 = Date.now();
  const combos = [];
  for (const lang of ["he", "en"]) {
    for (const theme of ["light", "dark"]) {
      for (const [vk, vp] of Object.entries(VIEWPORTS)) {
        combos.push(await runCombo(browser, site, `${lang}-${theme}-${vk}`, vp, lang, theme));
      }
    }
  }
  const interactive = await interactivePass(browser, site);
  const result = { site: site.id, url: site.url, tookSec: Math.round((Date.now() - t0) / 1000), combos, interactive };
  fs.writeFileSync(path.join(RESULTS, `${site.id}.json`), JSON.stringify(result, null, 2));
  console.log(`DONE ${site.id} (${result.tookSec}s)`);
  return result;
}

async function main() {
  const list = ONLY.length ? SITES.filter((s) => ONLY.includes(s.id)) : SITES;
  const browser = await chromium.launch({ headless: true });
  const queue = [...list];
  const WORKERS = 4;
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (queue.length) {
        const site = queue.shift();
        try {
          await runSite(browser, site);
        } catch (e) {
          console.error(`SITE-FATAL ${site.id}:`, String(e).slice(0, 300));
          fs.writeFileSync(path.join(RESULTS, `${site.id}.json`), JSON.stringify({ site: site.id, url: site.url, fatal: String(e).slice(0, 300) }, null, 2));
        }
      }
    })
  );
  await browser.close();
  console.log("ALL DONE");
}

main().catch((e) => { console.error(e); process.exit(1); });
