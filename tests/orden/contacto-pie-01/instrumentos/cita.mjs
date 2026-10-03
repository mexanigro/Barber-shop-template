// CONTACTO-PIE-01 · cita (sesión A, 2026-10-03): el tamaño de la cita de reseñas v6 («voces en collage») con «transiciones lentas».
// Copia de tests/orden/instagram-faq-01/instrumentos/cita.mjs con las dos partes de esa orden sin cambios y una tercera. Sólo lectura.
// Uso: node cita.mjs <salida>. Escribe <salida>.json con tres partes:
//  (1) tamaños: A y C, hebreo, 375 × 812 y 1280 × 800, con los datos del fixture: por cada pieza visible, su largo (`data-largo`), el
//      tamaño de la cita y si desborda. El paquete fija 22/19/15,5 px en móvil y 32/23/17 en escritorio (diseno/resenas/prototipo/proto.css).
//  (2) el caso de la verificadora de TEAM-RESENAS-01 (C:/t/verif5-scr/encaje-sonda.mjs): la primera reseña de A dice
//      «Superextraordinariamentebueno מעולה» (una palabra que no entra), hebreo, 375 × 812 (isMobile, hasTouch) y 1280 × 800,
//      reduced-motion; se mide la cita al montar y cuando la página está lista.
//  (3) «transiciones lentas» (verificadora de INSTAGRAM-FAQ-01, e1 del pedido de Liam; C:/t/verif6/encaje-sonda-gs.mjs): la casilla de
//      estilo global del hub escribe `global.transitionSpeed: "slow"` → `<html data-gs-speed="slow">`, cuya regla da 600 ms de transición
//      a TODAS las propiedades de todo elemento (index.css, con !important), también a `font-size`. A, hebreo, 375 y 1280, con y sin
//      reduced-motion: los tamaños con los datos del fixture y el caso de la palabra que no entra, medidos cuando la página está lista y
//      las transiciones de la sección terminaron.
import { writeFileSync } from "node:fs";
import { chromium, contexto, conFixture, url, listo, quieta, sinTransiciones, sinMaterial } from "./_nav.mjs";
const OUT = process.argv[2];
const PALABRA = "Superextraordinariamentebueno";
const b = await chromium.launch();
const out = { tamanos: [], caso: [], lentas: [] };
const piezas = (pg) => pg.evaluate(() => [...document.querySelectorAll("#testimonials .res6-quote p")].filter((p) => p.checkVisibility()).map((p) => ({ largo: p.closest("[data-largo]")?.dataset.largo ?? null, letra: parseFloat(getComputedStyle(p).fontSize), desborda: p.scrollWidth > p.clientWidth + 1, txt: p.textContent.trim().slice(0, 30) })));
const medirPalabra = (pg) => pg.evaluate((pal) => { const q = [...document.querySelectorAll("#testimonials .res6-quote p")].find((e) => e.textContent.includes(pal)); return q ? { largo: q.closest("[data-largo]")?.dataset.largo ?? null, letra: parseFloat(getComputedStyle(q).fontSize), desborda: q.scrollWidth > q.clientWidth + 1, scroll: q.scrollWidth, client: q.clientWidth, fuentes: document.fonts.status, velocidad: document.documentElement.getAttribute("data-gs-speed") } : null; }, PALABRA);

for (const p of ["a", "c"]) for (const [w, h] of [[375, 812], [1280, 800]]) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const pg = await ctx.newPage();
  await pg.addInitScript(() => { try { localStorage.setItem("preferred_language", "he"); } catch {} });
  await pg.goto(url(p), { waitUntil: "load", timeout: 120000 }); await listo(pg, "#testimonials");
  await pg.evaluate(() => document.querySelector("#testimonials")?.scrollIntoView({ block: "center", behavior: "instant" })); await quieta(pg, "#testimonials");
  out.tamanos.push({ k: `${p}-he-${w}x${h}`, piezas: await piezas(pg) });
  await ctx.close();
}
for (const [w, h] of [[375, 812], [1280, 800]]) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: "reduce" });
  await ctx.addInitScript(() => { try { localStorage.setItem("preferred_language", "he"); } catch {} });
  await conFixture(ctx, (fx) => { fx.testimonials[0].text = `${PALABRA} מעולה`; });
  const pg = await ctx.newPage();
  await pg.goto(url("a"), { waitUntil: "domcontentloaded", timeout: 120000 });
  await pg.waitForSelector("#testimonials .res6-quote p", { state: "attached", timeout: 60000 }).catch(() => {});
  const montada = await medirPalabra(pg);
  await listo(pg, "#testimonials");
  out.caso.push({ k: `a-he-${w}x${h}-reduce`, montada, lista: await medirPalabra(pg) });
  await ctx.close();
}
// (3) «transiciones lentas»: los tamaños con los datos del fixture y la palabra que no entra, con y sin reduced-motion
for (const reduce of [false, true]) for (const [w, h] of [[375, 812], [1280, 800]]) for (const palabra of [false, true]) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, ...(reduce ? { reducedMotion: "reduce" } : {}) });
  await ctx.addInitScript(() => { try { localStorage.setItem("preferred_language", "he"); } catch {} });
  await conFixture(ctx, (fx) => { fx.global = { ...(fx.global || {}), transitionSpeed: "slow" }; if (palabra) fx.testimonials[0].text = `${PALABRA} מעולה`; });
  const pg = await ctx.newPage();
  await pg.goto(url("a"), { waitUntil: "load", timeout: 120000 }); await listo(pg, "#testimonials");
  await pg.evaluate(() => document.querySelector("#testimonials")?.scrollIntoView({ block: "center", behavior: "instant" })); await sinTransiciones(pg, "#testimonials");
  out.lentas.push({ k: `a-he-${w}x${h}-lentas${reduce ? "-reduce" : ""}${palabra ? "-palabra" : ""}`, velocidad: await pg.evaluate(() => document.documentElement.getAttribute("data-gs-speed")), ...(palabra ? { lista: await medirPalabra(pg) } : { piezas: await piezas(pg) }) });
  await ctx.close();
}
await b.close();
writeFileSync(`${OUT}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
