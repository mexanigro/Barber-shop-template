/**
 * Recorre los 4 idiomas con el LanguageSwitcher real y registra hero/brand/servicios.
 * Falla (exit 1) si en alguna vista hay texto vacío o texto en un alfabeto que no
 * corresponde al idioma: hebreo en en/ru/ar; latino, cirílico o árabe en he.
 * El nombre de marca se excluye del chequeo de alfabeto (es estructura, no se traduce).
 *
 * Uso: node scripts/qa-language-roundtrip.mjs [--outdir dir] [--base url] [--order he,en,he,ar,he,ru,en]
 */
import { chromium } from "playwright"; import { mkdirSync } from "node:fs";
const args = process.argv.slice(2); const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const base = arg("base", "http://localhost:3000/"); const outdir = arg("outdir", null); if (outdir) mkdirSync(outdir, { recursive: true });
const ORDER = arg("order", "he,en,he,ar,he,ru,en").split(",");
const LABEL = { he: "עברית", en: "English", ru: "Русский", ar: "العربية" };

const SCRIPTS = { hebrew: /\p{Script=Hebrew}/u, latin: /\p{Script=Latin}/u, cyrillic: /\p{Script=Cyrillic}/u, arabic: /\p{Script=Arabic}/u };
/** Alfabetos que NO deben aparecer en cada idioma. */
const FORBIDDEN = {
  he: ["latin", "cyrillic", "arabic"],
  en: ["hebrew", "cyrillic", "arabic"],
  ru: ["hebrew", "arabic"],
  ar: ["hebrew", "cyrillic"],
};
/** Texto de UI que se revisa por vista (hero, servicios, equipo, FAQ, contacto). */
const CHECK_SELECTOR = "#hero h1, #hero p, #hero a, #hero button, #services h2, #services h3, #services p, #team h2, #team h3, #team p, #faq h2, #faq h3, #faq button, #contact h2, #contact p, #contact label";

const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" }); const p = await ctx.newPage();
await p.goto(base, { waitUntil: "domcontentloaded" }); await p.waitForSelector("#hero", { timeout: 60000 }); await p.waitForTimeout(6000);

const brandName = (await p.title()).split(/ [—|-] /)[0].trim();

async function read(lang) {
  const texts = await p.evaluate((sel) => [...document.querySelectorAll(sel)].map((e) => (e.textContent || "").replace(/\s+/g, " ").trim()), CHECK_SELECTOR);
  const empties = texts.filter((t) => !t).length;
  const wrongScript = [];
  for (const t of texts) {
    if (!t) continue;
    const stripped = brandName ? t.split(brandName).join("") : t;
    // dígitos, símbolos, ₪, emojis y siglas cortas en latín (B4, WhatsApp, Bit) no cuentan como idioma equivocado
    const words = stripped.replace(/WhatsApp|Bit|Google|Instagram|Waze|SMS|CRM|[A-Z]{1,2}\d{0,2}/g, "");
    for (const s of FORBIDDEN[lang]) if (SCRIPTS[s].test(words)) { wrongScript.push(`${s}: «${t.slice(0, 60)}»`); break; }
  }
  return {
    lang: await p.evaluate(() => document.documentElement.lang),
    h1: (await p.locator("#hero h1").first().innerText()).replace(/\s+/g, " ").trim(),
    title: await p.title(),
    services: await p.locator("#services h3").allInnerTexts().then((a) => a.slice(0, 3).map((s) => s.trim())),
    checked: texts.length,
    empties,
    wrongScript,
  };
}

let failures = 0;
for (const lang of ORDER) {
  await p.locator('button[aria-label="Change language"]:visible').first().click();
  await p.getByRole("button", { name: LABEL[lang] }).locator("visible=true").first().click();
  await p.waitForTimeout(1200);
  const r = await read(lang);
  const bad = r.empties > 0 || r.wrongScript.length > 0 || r.lang !== lang;
  if (bad) failures++;
  console.log(`${bad ? "FAIL" : "ok  "} ${JSON.stringify(r)}`);
  if (outdir) await p.screenshot({ path: `${outdir}/roundtrip-${lang}-${Date.now()}.png`, animations: "disabled" });
}
await b.close();
if (failures) { console.log(`\n${failures} vista(s) con fallo`); process.exit(1); }
console.log("\nsin vacíos ni alfabetos equivocados");
