// INSTAGRAM-FAQ-01 · cita (sesión A, 2026-10-02): el tamaño de la cita de reseñas v6 («voces en collage»). Sólo lectura.
// Uso: node cita.mjs <salida>. Escribe <salida>.json con dos partes:
//  (1) tamaños: A y C, hebreo, 375 × 812 y 1280 × 800, con los datos del fixture: por cada pieza visible, su largo (`data-largo`), el
//      tamaño de la cita y si desborda. El paquete fija 22/19/15,5 px en móvil y 32/23/17 en escritorio (diseno/resenas/prototipo/proto.css).
//  (2) el caso de la verificadora de TEAM-RESENAS-01 (C:/t/verif5-scr/encaje-sonda.mjs, pasado por Liam el 2026-10-02): la primera
//      reseña de A dice «Superextraordinariamentebueno מעולה» (una palabra que no entra), hebreo, móvil 375 × 812 (isMobile, hasTouch) y
//      escritorio 1280 × 800, reduced-motion; se mide la cita al montar y cuando la página está lista (fuentes cargadas, el splash ido,
//      quieta). El prototipo vuelve a medir cuando terminan de cargar las fuentes (`document.fonts.ready.then(encajar)`).
import { writeFileSync } from "node:fs";
import { chromium, contexto, conFixture, url, listo, quieta, sinMaterial } from "./_nav.mjs";
const OUT = process.argv[2];
const PALABRA = "Superextraordinariamentebueno";
const b = await chromium.launch();
const out = { tamanos: [], caso: [] };
const piezas = (pg) => pg.evaluate(() => [...document.querySelectorAll("#testimonials .res6-quote p")].filter((p) => p.checkVisibility()).map((p) => ({ largo: p.closest("[data-largo]")?.dataset.largo ?? null, letra: parseFloat(getComputedStyle(p).fontSize), desborda: p.scrollWidth > p.clientWidth + 1, txt: p.textContent.trim().slice(0, 30) })));

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
  const medir = () => pg.evaluate((pal) => { const q = [...document.querySelectorAll("#testimonials .res6-quote p")].find((e) => e.textContent.includes(pal)); return q ? { largo: q.closest("[data-largo]")?.dataset.largo ?? null, letra: parseFloat(getComputedStyle(q).fontSize), desborda: q.scrollWidth > q.clientWidth + 1, scroll: q.scrollWidth, client: q.clientWidth, fuentes: document.fonts.status } : null; }, PALABRA);
  await pg.goto(url("a"), { waitUntil: "domcontentloaded", timeout: 120000 });
  await pg.waitForSelector("#testimonials .res6-quote p", { state: "attached", timeout: 60000 }).catch(() => {});
  const montada = await medir();
  await listo(pg, "#testimonials");
  out.caso.push({ k: `a-he-${w}x${h}-reduce`, montada, lista: await medir() });
  await ctx.close();
}
await b.close();
writeFileSync(`${OUT}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
