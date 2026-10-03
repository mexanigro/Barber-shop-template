// INSTAGRAM-FAQ-01 · d20 (sesión A, 2026-10-02): el texto de «ver toda la galería» en árabe en la home de UN nicho de la flota (D20 del
// INFORME, la otra dirección: el arreglo es sólo de peluquería y los otros nichos siguen diciendo lo que decían). Sólo lectura.
// Uso: node d20.mjs <url> <nicho>. Imprime una línea JSON con los textos visibles que contienen «المعرض الكامل».
import { chromium, contexto, listo } from "./_nav.mjs";
const [url, nicho] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await contexto(b, { viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
const pg = await ctx.newPage();
await pg.addInitScript(() => { try { localStorage.setItem("preferred_language", "ar"); } catch {} });
await pg.goto(url, { waitUntil: "load", timeout: 120000 });
await pg.waitForFunction(() => document.documentElement.lang === "ar", null, { timeout: 60000 });
await listo(pg, "#gallery");
const textos = await pg.evaluate(() => [...document.querySelectorAll("#gallery a, #gallery button, #gallery span")].filter((e) => e.children.length === 0 || e.tagName !== "SPAN").map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter((t) => t.includes("المعرض الكامل")));
console.log(JSON.stringify({ nicho, lang: await pg.evaluate(() => document.documentElement.lang), textos: [...new Set(textos)] }));
await b.close();
