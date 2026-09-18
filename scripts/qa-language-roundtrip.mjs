/** Recorre los 4 idiomas con el LanguageSwitcher real y registra hero/brand/servicios. Uso: node scripts/qa-language-roundtrip.mjs [--outdir dir] [--base url] */
import { chromium } from "playwright"; import { mkdirSync } from "node:fs";
const args = process.argv.slice(2); const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const base = arg("base", "http://localhost:3000/"); const outdir = arg("outdir", null); if (outdir) mkdirSync(outdir, { recursive: true });
const ORDER = ["he", "en", "he", "ar", "he", "ru", "en"];
const LABEL = { he: "עברית", en: "English", ru: "Русский", ar: "العربية" };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" }); const p = await ctx.newPage();
await p.goto(base, { waitUntil: "domcontentloaded" }); await p.waitForSelector("#hero", { timeout: 60000 }); await p.waitForTimeout(6000);
const read = async () => ({
  lang: await p.evaluate(() => document.documentElement.lang),
  h1: (await p.locator("#hero h1").first().innerText()).replace(/\s+/g, " ").trim(),
  title: await p.title(),
  services: await p.locator("#services h3").allInnerTexts().then(a => a.slice(0, 3).map(s => s.trim())),
  empties: await p.evaluate(() => [...document.querySelectorAll("#hero h1, #hero p, #services h3, #services p, #contact h2")].filter(e => !e.textContent.trim()).length),
});
for (const lang of ORDER) {
  await p.locator('button[aria-label="Change language"]:visible').first().click();
  await p.getByRole("button", { name: LABEL[lang] }).locator('visible=true').first().click();
  await p.waitForTimeout(1200);
  const r = await read(); console.log(JSON.stringify(r));
  if (outdir) await p.screenshot({ path: `${outdir}/roundtrip-${lang}-${Date.now()}.png`, animations: "disabled" });
}
await b.close();
