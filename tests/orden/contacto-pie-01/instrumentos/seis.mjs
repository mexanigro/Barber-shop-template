// CONTACTO-PIE-01 · seis (sesión A, 2026-10-03), copia de tests/orden/instagram-faq-01/instrumentos/seis.mjs (la de servicios-galeria-01
// con las esperas como condiciones): la firma del estilo computado de las secciones de la home
// de UN nicho de la flota a 375 (display, posición, fondo y padding de cada `section` y `footer`, y lo que pintan su `::before` y
// `::after`), para comparar el árbol rojo con HEAD (D1). Sólo estilo, nunca píxeles. Lo que mide no cambia; la espera es una
// condición (./_nav.mjs). Uso: node seis.mjs <url> <nicho>
import { chromium, contexto } from "./_nav.mjs";
const [url, nicho] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await contexto(b, { viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
const pg = await ctx.newPage();
await pg.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await pg.waitForSelector("#hero", { timeout: 60000 });
// la firma misma, sin cambiar durante 6 cuadros seguidos (la condición: no la caja del body, que en la flota puede tener un
// pase de diapositivas que nunca se queda quieto)
await pg.waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 30000 });
const calcular = () => {
  const P = ["display", "content", "height", "backgroundColor", "backgroundImage", "maskImage", "opacity", "zIndex"];
  const S = ["display", "position", "backgroundColor", "backgroundImage", "paddingTop", "paddingBottom", "isolation"];
  const toma = (cs, props) => Object.fromEntries(props.map((k) => [k, String(cs[k] ?? "").slice(0, 300)]));
  return [...document.querySelectorAll("section, footer")].map((e) => ({
    el: `${e.tagName.toLowerCase()}#${e.id || ""}.${(e.getAttribute("data-surface") || "")}`,
    estilo: toma(getComputedStyle(e), S),
    antes: toma(getComputedStyle(e, "::before"), P),
    despues: toma(getComputedStyle(e, "::after"), P),
  }));
};
// Vite puede recargar la página la primera vez que optimiza una dependencia: entonces se vuelve a esperar sobre la carga nueva
for (let intento = 0; ; intento++) {
  try {
    await pg.waitForFunction((f) => { const w = (window.__firma ??= { s: "", n: 0 }); const s = JSON.stringify(eval(`(${f})`)()); w.n = s === w.s ? w.n + 1 : 0; w.s = s; return w.n >= 6; }, calcular.toString(), { polling: "raf", timeout: 30000 });
    break;
  } catch (e) {
    if (intento >= 3 || !/context was destroyed|navigat/i.test(String(e?.message))) throw e;
    await pg.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
  }
}
const firma = await pg.evaluate(`(${calcular.toString()})()`);
// CONTACTO-PIE-01 (D1): además, cuántos elementos de las variantes nuevas de peluquería (contacto «ubicación y horarios» + «contacto»,
// el cierre y el pie) pinta la home.
const nuevas = await pg.evaluate(() => document.querySelectorAll(".ct6, .pie6").length);
console.log(JSON.stringify({ nicho, secciones: firma.length, nuevas, firma }));
await b.close();
