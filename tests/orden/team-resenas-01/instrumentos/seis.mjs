// TEAM-RESENAS-01 · seis (copia de tests/orden/servicios-galeria-01/instrumentos/seis.mjs, sesión A de SERVICIOS-GALERIA-01): la firma del estilo computado de las secciones de la home de UN nicho de la
// flota a 375, para comparar el árbol rojo con HEAD (D1, el blast radius). Sólo estilo, nunca píxeles ni medidas que dependan de
// cargar fotos: por cada `section` (y `footer`) en orden, su display, posición, fondo y padding, y de su `::before` y `::after`
// lo que pintan (display, content, alto, fondo, máscara, opacidad). Sólo lectura. Uso: node seis.mjs <url> <nicho>
import { chromium, contexto } from "./_nav.mjs";
const [url, nicho] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await contexto(b, { viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
const pg = await ctx.newPage();
await pg.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await pg.waitForSelector("#hero", { timeout: 60000 });
await pg.waitForTimeout(1500);
const firma = await pg.evaluate(() => {
  const P = ["display", "content", "height", "backgroundColor", "backgroundImage", "maskImage", "opacity", "zIndex"];
  const S = ["display", "position", "backgroundColor", "backgroundImage", "paddingTop", "paddingBottom", "isolation"];
  const toma = (cs, props) => Object.fromEntries(props.map((k) => [k, String(cs[k] ?? "").slice(0, 300)]));
  return [...document.querySelectorAll("section, footer")].map((e) => ({
    el: `${e.tagName.toLowerCase()}#${e.id || ""}.${(e.getAttribute("data-surface") || "")}`,
    estilo: toma(getComputedStyle(e), S),
    antes: toma(getComputedStyle(e, "::before"), P),
    despues: toma(getComputedStyle(e, "::after"), P),
  }));
});
// TEAM-RESENAS-01 (D1): además, cuántos elementos de las variantes nuevas de peluquería (team v6, reseñas en collage) pinta la home.
const nuevas = await pg.evaluate(() => document.querySelectorAll(".team6, .res6").length);
console.log(JSON.stringify({ nicho, secciones: firma.length, nuevas, firma }));
await b.close();
