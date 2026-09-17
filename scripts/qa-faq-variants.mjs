/**
 * QA script — FAQ v2-v5 modernization pass (2026, Wave 3).
 * Drives /dev/variants-preview with its own browser (preview MCP is contested).
 * Captures screenshots + computed-style checks in LTR/RTL, desktop/mobile,
 * and exercises the interactions: accordion open, search filter, tab keyboard.
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:3000/dev/variants-preview";
const OUT = path.join(ROOT, "qa-faq");
fs.mkdirSync(OUT, { recursive: true });

async function settle(page) {
  await page.waitForSelector('body[data-variants-ready="1"]', { timeout: 25000 });
  await page.mouse.move(5, 5); // neutralize hover
  await page.waitForTimeout(400);
}

const commonChecks = () => {
  const faq = document.querySelector("#faq");
  const h2 = faq.querySelector("h2");
  const doc = document.documentElement;
  const small = [...faq.querySelectorAll("a, button, input")]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        t: (el.getAttribute("aria-label") || el.textContent || el.placeholder || "").trim().slice(0, 30),
        w: Math.round(r.width), h: Math.round(r.height),
      };
    })
    .filter((x) => (x.w > 0 || x.h > 0) && x.w < 44 && x.h < 44);
  const controls = [...faq.querySelectorAll("button, input")].filter((el) => el.getBoundingClientRect().width > 0);
  return {
    dir: getComputedStyle(doc).direction,
    h2Wrap: getComputedStyle(h2).textWrap,
    bodyWrap: [...new Set([...faq.querySelectorAll("p")].map((p) => getComputedStyle(p).textWrap))],
    hOverflow: doc.scrollWidth - doc.clientWidth,
    smallTargets: small,
    touchAction: [...new Set(controls.map((el) => getComputedStyle(el).touchAction))],
    focusRing: controls.length
      ? getComputedStyle(controls[0]).outlineStyle // baseline: outline suppressed at rest
      : null,
  };
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = {};
  for (const variant of ["v2", "v3", "v4", "v5"]) {
    for (const lang of ["en", "he"]) {
      for (const vp of [{ n: "desktop", w: 1440, h: 1000 }, { n: "mobile", w: 390, h: 844 }]) {
        for (const mode of vp.n === "desktop" ? ["dark", "light"] : ["dark"]) {
          const key = `${variant}-${lang}-${vp.n}-${mode}`;
          const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
          const page = await ctx.newPage();
          const errors = [];
          page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
          await page.goto(`${BASE}?section=faq&variant=${variant}&niche=barberia&lang=${lang}&mode=${mode}`, { waitUntil: "domcontentloaded" });
          await settle(page);
          const r = { common: await page.evaluate(commonChecks), errors };

          // ── Open the first accordion row (v2/v3/v4) and read the panel ──
          if (variant !== "v5") {
            const btn = page.locator("#faq button[aria-expanded]").first();
            if (await btn.count()) {
              await btn.click();
              await page.waitForTimeout(500);
              r.accordion = await page.evaluate(() => {
                const b = document.querySelector('#faq button[aria-expanded="true"]');
                if (!b) return { open: "FAILED" };
                const panel = document.getElementById(b.getAttribute("aria-controls"));
                const p = panel?.querySelector("p");
                const chev = b.querySelector("svg");
                return {
                  open: true,
                  panelVisible: panel ? panel.getBoundingClientRect().height > 10 : false,
                  answerColor: p ? getComputedStyle(p).color : null,
                  answerWrap: p ? getComputedStyle(p).textWrap : null,
                  chevTransform: chev ? getComputedStyle(chev).transform : null,
                };
              });
            }
          }

          // ── v3: search interaction ──
          if (variant === "v3" && vp.n === "desktop") {
            const input = page.locator("#faq input[type=search]");
            await input.fill("zzzznope");
            await page.waitForTimeout(400);
            const empty = await page.evaluate(() => {
              const faq = document.querySelector("#faq");
              const live = faq.querySelector("[aria-live]");
              return {
                liveText: live?.textContent.trim(),
                liveNums: live ? getComputedStyle(live).fontVariantNumeric : null,
                emptyStateShown: !!faq.querySelector(".border-dashed"),
              };
            });
            await page.screenshot({ path: path.join(OUT, `faq-${key}-empty.png`), fullPage: true });
            // clear via the X button, then search something real
            await page.locator("#faq button[aria-label]").first().click();
            await input.fill(lang === "he" ? "תור" : "book");
            await page.waitForTimeout(400);
            const filtered = await page.evaluate(() => {
              const faq = document.querySelector("#faq");
              const marks = [...faq.querySelectorAll("mark")];
              const icon = faq.querySelector("input").parentElement.querySelector("svg");
              const ir = icon.getBoundingClientRect();
              const inr = faq.querySelector("input").getBoundingClientRect();
              return {
                liveText: faq.querySelector("[aria-live]").textContent.trim(),
                markCount: marks.length,
                markBg: marks[0] ? getComputedStyle(marks[0]).backgroundColor : null,
                iconInsideStart:
                  getComputedStyle(document.documentElement).direction === "rtl"
                    ? ir.right <= inr.right && ir.right > inr.right - 60
                    : ir.left >= inr.left && ir.left < inr.left + 60,
              };
            });
            r.v3 = { empty, filtered };
          }

          // ── v4: tabs + keyboard (incl. RTL arrow flip) ──
          if (variant === "v4" && vp.n === "desktop") {
            const tabs = page.locator('#faq [role="tab"]');
            const tabCount = await tabs.count();
            if (tabCount > 1) {
              await tabs.first().click();
              await page.waitForTimeout(300);
              // forward arrow: Right in LTR, Left in RTL
              const fwd = lang === "he" ? "ArrowLeft" : "ArrowRight";
              await page.keyboard.press(fwd);
              await page.waitForTimeout(400);
              r.v4 = await page.evaluate(() => {
                const sel = document.querySelector('#faq [role="tab"][aria-selected="true"]');
                const all = [...document.querySelectorAll('#faq [role="tab"]')];
                return {
                  tabCount: all.length,
                  selectedIndexAfterForwardArrow: all.indexOf(sel),
                  selectedHasFocus: document.activeElement === sel,
                  underline: !!sel.querySelector("span[aria-hidden]"),
                };
              });
              await page.screenshot({ path: path.join(OUT, `faq-${key}-tab2.png`), fullPage: true });
            } else {
              r.v4 = { tabs: tabCount, note: "no tabs (fallback accordion)" };
            }
          }

          // ── v5: bubble alignment + avatar img attrs ──
          if (variant === "v5") {
            r.v5 = await page.evaluate(() => {
              const faq = document.querySelector("#faq");
              const rtl = getComputedStyle(document.documentElement).direction === "rtl";
              const pairs = [...faq.querySelectorAll(":scope div[role='region'] > div")];
              const first = pairs[0];
              const q = first?.children[0]?.firstElementChild; // question bubble
              const a = first?.children[1]; // answer row
              const img = faq.querySelector("img");
              const sect = faq.querySelector("div[role='region']").getBoundingClientRect();
              const qr = q?.getBoundingClientRect();
              const ar = a?.getBoundingClientRect();
              const mid = sect.left + sect.width / 2;
              return {
                pairCount: pairs.length,
                questionOnEndSide: qr ? (rtl ? qr.left < mid : qr.right > mid) : null,
                answerOnStartSide: ar ? (rtl ? ar.right > mid : ar.left < mid) : null,
                imgAttrs: img
                  ? { decoding: img.decoding, draggable: img.draggable, loading: img.loading }
                  : "monogram fallback",
              };
            });
          }

          await page.mouse.move(5, 5);
          await page.waitForTimeout(250);
          await page.screenshot({ path: path.join(OUT, `faq-${key}.png`), fullPage: true });
          results[key] = r;
          await ctx.close();
        }
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
