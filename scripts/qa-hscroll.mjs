/**
 * Targeted follow-up to qa-variants.mjs: distinguishes REAL page-level
 * horizontal overflow from intentional in-section scrollers/marquees.
 * Flags a section only when the document itself scrolls horizontally AND
 * the offending element is not inside an overflow-clipping ancestor.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const COMBOS = [];
for (const ctx of [
  { id: "barberia-en-dark-desktop", niche: "barberia", lang: "en", mode: "dark", width: 1280, height: 900 },
  { id: "barberia-he-dark-desktop", niche: "barberia", lang: "he", mode: "dark", width: 1280, height: 900 },
  { id: "barberia-en-dark-mobile", niche: "barberia", lang: "en", mode: "dark", width: 375, height: 812 },
  { id: "nails-he-light-mobile", niche: "nails", lang: "he", mode: "light", width: 375, height: 812 },
]) {
  for (const v of ["v1", "v2", "v3", "v4", "v5"]) COMBOS.push({ ctx, v });
}

const browser = await chromium.launch();
for (const { ctx, v } of COMBOS) {
  const bctx = await browser.newContext({ viewport: { width: ctx.width, height: ctx.height } });
  const page = await bctx.newPage();
  const url = `${BASE}/dev/variants-preview?section=all&variant=${v}&niche=${ctx.niche}&lang=${ctx.lang}&mode=${ctx.mode}&labels=0`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('body[data-variants-ready="1"]', { timeout: 20000 });
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const docScroll = doc.scrollWidth - vw;

    const clips = (el) => {
      for (let a = el.parentElement; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX) || /(auto|scroll|hidden|clip)/.test(s.overflow)) return true;
      }
      return false;
    };

    const bad = [];
    if (docScroll > 1) {
      for (const sec of document.querySelectorAll("[data-qa]")) {
        let n = 0;
        for (const el of sec.querySelectorAll("*")) {
          if (++n > 5000) break;
          if (!(el instanceof HTMLElement) || el.offsetParent === null) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if ((r.right > vw + 2 || r.left < -2) && !clips(el)) {
            bad.push(
              `${sec.getAttribute("data-qa")}: ${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 4).join(".").slice(0, 90)} [L${Math.round(r.left)} R${Math.round(r.right)} vw${vw}]`,
            );
            break; // one offender per section is enough
          }
        }
      }
    }
    return { docScroll, bad };
  });

  if (result.docScroll > 1) {
    console.log(`REAL H-SCROLL +${result.docScroll}px  ${ctx.id} ${v}`);
    result.bad.forEach((b) => console.log(`   ${b}`));
  } else {
    console.log(`ok  ${ctx.id} ${v}`);
  }
  await bctx.close();
}
await browser.close();
