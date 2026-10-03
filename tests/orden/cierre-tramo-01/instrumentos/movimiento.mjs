// CIERRE-TRAMO-01 · movimiento (sesión A, 2026-10-03): la duración de transición y de animación que el estilo computado da a cada
// elemento de la home (y a su `::before` y `::after`), con y sin la preferencia de menos movimiento del visitante, sin «velocidad de
// transiciones» y con cada una de las tres que escribe la casilla de estilo global del hub (`global.transitionSpeed` → `<html
// data-gs-speed="none|fast|slow">`). Sólo estilo computado, nunca píxeles. Contexto y material por ./_nav.mjs (copia byte a byte de la de
// tests/orden/contacto-pie-01/instrumentos/). La espera es una condición, como seis.mjs: la red quieta, las fuentes, el `#hero` y el
// splash ido —no la página quieta: en la flota un pase de diapositivas no se queda quieto nunca—; si Vite recarga la página a mitad
// (optimiza una dependencia), vuelve a esperar sobre la carga nueva. Uso: node movimiento.mjs <url> <etiqueta>
// Imprime, en la última línea, {etiqueta, elementos, medidas: {"<reduce|no-preference>|<sin|none|fast|slow>": {transicion:
// {"<duración>": n}, animacion: {"<duración>": n}}}}: cuántos elementos (y pseudo-elementos con contenido) tienen cada duración.
import { chromium, contexto } from "./_nav.mjs";
const [url, etiqueta] = process.argv.slice(2);
const b = await chromium.launch();
try {
  const ctx = await contexto(b, { viewport: { width: 375, height: 812 } });
  const pg = await ctx.newPage();
  await pg.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  for (let intento = 0; ; intento++) {
    try {
      await pg.waitForSelector("#hero", { timeout: 60000 });
      await pg.waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 30000 });
      await pg.waitForFunction(() => !document.querySelector('[role="dialog"]') && document.body.style.overflow !== "hidden", null, { timeout: 30000 });
      break;
    } catch (e) {
      if (intento >= 3 || !/context was destroyed|navigat/i.test(String(e?.message))) throw e;
      await pg.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
    }
  }
  const medidas = {};
  let elementos = 0;
  for (const preferencia of ["reduce", "no-preference"]) {
    await pg.emulateMedia({ reducedMotion: preferencia });
    for (const velocidad of ["sin", "none", "fast", "slow"]) {
      const r = await pg.evaluate((v) => {
        const html = document.documentElement;
        if (v === "sin") html.removeAttribute("data-gs-speed"); else html.setAttribute("data-gs-speed", v);
        const transicion = {}, animacion = {};
        const sumar = (h, k) => { h[k] = (h[k] ?? 0) + 1; };
        const todos = [...document.querySelectorAll("*")];
        for (const e of todos) {
          for (const pseudo of [null, "::before", "::after"]) {
            const cs = getComputedStyle(e, pseudo);
            if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
            sumar(transicion, cs.transitionDuration);
            sumar(animacion, cs.animationDuration);
          }
        }
        return { n: todos.length, transicion, animacion };
      }, velocidad);
      elementos = r.n;
      medidas[`${preferencia}|${velocidad}`] = { transicion: r.transicion, animacion: r.animacion };
    }
  }
  console.log(JSON.stringify({ etiqueta, elementos, medidas }));
} finally { await b.close(); }
