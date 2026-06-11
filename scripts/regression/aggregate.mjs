// Aggregate qa-regression/results/*.json into a console summary (one line per issue).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RESULTS = path.join(ROOT, "qa-regression", "results");

const NOISE = [
  /the server responded with a status of/i, // duplicated by failedReqs
  /Failed to load resource/i,
  /web-vitals/i,
];

for (const f of fs.readdirSync(RESULTS).filter((x) => x.endsWith(".json")).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(RESULTS, f), "utf8"));
  const lines = [];
  if (r.fatal) lines.push(`  SITE-FATAL: ${r.fatal}`);
  const aggFailed = new Map(); // url -> combos
  for (const c of r.combos || []) {
    const tag = c.combo;
    if (c.fatal) { lines.push(`  [${tag}] FATAL: ${c.fatal}`); continue; }
    if (c.rootEmpty) lines.push(`  [${tag}] ROOT EMPTY`);
    if (!c.h1) lines.push(`  [${tag}] NO H1`);
    if (c.sectionCount < 4) lines.push(`  [${tag}] ONLY ${c.sectionCount} SECTIONS: ${JSON.stringify(c.sectionIds)}`);
    const wantDark = tag.includes("-dark-");
    if (c.dark !== wantDark) lines.push(`  [${tag}] THEME MISMATCH want dark=${wantDark} got ${c.dark}`);
    const wantRtl = tag.startsWith("he-");
    if ((c.dir === "rtl") !== wantRtl) lines.push(`  [${tag}] DIR MISMATCH want rtl=${wantRtl} got ${c.dir}`);
    if (c.hOverflowPx > 4) lines.push(`  [${tag}] H-OVERFLOW ${c.hOverflowPx}px`);
    if (c.placeholderImgs?.length) lines.push(`  [${tag}] PLACEHOLDER-IMG x${c.placeholderImgs.length}: ${c.placeholderImgs.slice(0, 3).join(" ; ")}`);
    if (c.brokenImgs?.length) lines.push(`  [${tag}] BROKEN-IMG x${c.brokenImgs.length}: ${c.brokenImgs.slice(0, 2).join(" ; ")}`);
    if (c.navOverlaps?.length) lines.push(`  [${tag}] NAV-OVERLAP: ${c.navOverlaps.join(" || ")}`);
    if (c.navOffscreen?.length) lines.push(`  [${tag}] NAV-OFFSCREEN: ${c.navOffscreen.join(" || ")}`);
    if (c.fabIssues?.length) lines.push(`  [${tag}] FAB: ${c.fabIssues.join(" || ")}`);
    for (const fr of c.failedReqs || []) {
      if (!aggFailed.has(fr)) aggFailed.set(fr, []);
      aggFailed.get(fr).push(tag);
    }
    const errs = (c.consoleErrors || []).filter((e) => !NOISE.some((n) => n.test(e)));
    for (const e of errs.slice(0, 3)) lines.push(`  [${tag}] CONSOLE: ${e.slice(0, 140)}`);
    for (const e of c.pageErrors || []) lines.push(`  [${tag}] PAGEERROR: ${e.slice(0, 140)}`);
  }
  for (const [url, tags] of aggFailed) lines.push(`  REQ-FAIL (${tags.length} combos): ${url}`);
  const i = r.interactive || {};
  if (i.splash) {
    if (i.splash.fatal) lines.push(`  SPLASH check failed: ${i.splash.fatal}`);
    else {
      if (!i.splash.shown) lines.push(`  SPLASH: none shown (info)`);
      if (i.splash.stuckAfter14s) lines.push(`  SPLASH STUCK >14s: ${i.splash.stuckAfter14s}`);
    }
  }
  if (i.booking) {
    if (i.booking.fatal) lines.push(`  BOOKING check failed: ${i.booking.fatal}`);
    else if (!i.booking.ctaFound) lines.push(`  BOOKING: no CTA found (verify niche)`);
    else if (!i.booking.opened) lines.push(`  BOOKING: CTA clicked but wizard did not open`);
    else if (!i.booking.visible || !i.booking.hasContent) lines.push(`  BOOKING: opened but visible=${i.booking.visible} hasContent=${i.booking.hasContent}`);
  }
  for (const b of i.links?.broken || []) lines.push(`  LINK BROKEN: ${b}`);
  for (const h of i.links?.collected?.hashMissing || []) lines.push(`  HASH TARGET MISSING: ${h}`);

  console.log(`\n=== ${r.site} (${r.url}) ${r.tookSec ?? "?"}s ===`);
  console.log(lines.length ? lines.join("\n") : "  CLEAN");
}
