// Verificación de RESENAS-01 en la página renderizada: A (collage) y C (mosaico) × 4 idiomas × 375, 1280×800, 1366×657, 1920×945.
// TEAM-RESENAS-01 · copia de diseno/resenas/verificacion/resenas.mjs. Cambios, ninguno en lo que mide: la página, playwright y el material
// de Storage salen de ./_nav.mjs; las clases del prototipo `proto-res…` se llaman `res6…` en T (D-173); y al final imprime «SIN MATERIAL».
// Uso: node resenas.mjs. Sale 1 si hay problemas.
// COPIA PROMOVIDA (INSTAGRAM-FAQ-01, D-200) de tests/orden/team-resenas-01/instrumentos/resenas.mjs: lo que mide no cambia; cada espera es
// una condición (`listo`, `quieta`) y, con SG_CASOS, sólo esos casos.
import { chromium, contexto, url, sinMaterial, listo, quieta, toma } from "./_nav.mjs";
const [pA, pC] = ["a", "c"];
const ESC = { he: /[\u0590-\u05FF]/, ar: /[\u0600-\u06FF]/, ru: /[\u0400-\u04FF]/, en: /[A-Za-z]/ };
const b = await chromium.launch(); let mal = 0;
const casos = [];
for (const [p, port] of [["a", pA], ["c", pC]]) for (const lang of ["he", "en", "ru", "ar"]) for (const vp of [[375, 812], [1280, 800], [1366, 657], [1920, 945]]) if (toma(p, lang, ...vp)) casos.push([p, port, lang, vp]);
for (const [p, port, lang, [w, h]] of casos) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const pg = await ctx.newPage(); const err = []; pg.on("pageerror", (e) => err.push(e.message.slice(0, 100)));
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port), { waitUntil: "networkidle", timeout: 120000 }); await listo(pg, "#testimonials");
  await pg.evaluate(() => document.getElementById("testimonials")?.scrollIntoView({ block: "center", behavior: "instant" })); await quieta(pg, "#testimonials");
  const r = await pg.evaluate(async () => {
    const s = await import("/src/config/site.ts"); const datos = (s.siteConfig.testimonials || []).filter((t) => t && t.text);
    const raiz = document.querySelector(".res6"); const sec = document.getElementById("testimonials");
    if (!raiz) return { proto: false, v1: [...sec.children].some((e) => getComputedStyle(e).display !== "none") };
    const piezas = [...raiz.querySelectorAll(".res6-piece")], grid = raiz.querySelector(".res6-grid").getBoundingClientRect();
    const fuera = piezas.filter((x) => { const q = x.getBoundingClientRect(); return q.left < grid.left - 1 || q.right > grid.right + 1; }).length;
    const rs = piezas.map((x) => x.getBoundingClientRect()); let pisadas = 0; // ninguna pieza encima de otra (el collage con tramos se pisaba)
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], c = rs[j]; if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1) pisadas++; }
    const palabraCortada = [...raiz.querySelectorAll(".res6-quote p")].filter((x) => x.scrollWidth > x.clientWidth + 1).length;
    const prom = datos.length ? (datos.reduce((a, t) => a + +t.rating, 0) / datos.length).toFixed(1) : null;
    const textos = [...raiz.querySelectorAll(".res6-quote p, .res6-foot h2, .res6-foot > div > p, .res6-svc")].map((e) => e.textContent.trim());
    return { proto: true, dinamica: raiz.dataset.dinamica, piezas: piezas.length, datos: datos.length, fuera, pisadas, palabraCortada, overflowX: document.documentElement.scrollWidth > innerWidth,
      avg: raiz.querySelector(".res6-avg")?.textContent, prom, notas: raiz.querySelectorAll(".res6-note").length, textos,
      v1Visible: [...sec.children].filter((e) => !e.classList.contains("res6") && getComputedStyle(e).display !== "none").length,
      traducidas: datos.filter((t) => t.translated).length };
  });
  // las piezas se pisaban por el movimiento ligado al scroll, que vale 0 con la sección centrada: se mide también arriba y abajo
  if (r.proto) for (const pos of ["entra", "sale"]) { // entrando (arriba de la lista a 150 px del pie) y saliendo (abajo a 150 px del borde)
    await pg.evaluate((pos) => { const g = document.querySelector(".res6-grid").getBoundingClientRect(); scrollBy({ top: pos === "entra" ? g.top - (innerHeight - 150) : g.bottom - 150, behavior: "instant" }); }, pos); await quieta(pg, "#testimonials");
    r.pisadas += await pg.evaluate(() => { const rs = [...document.querySelectorAll(".res6-piece")].map((x) => x.getBoundingClientRect()); let n = 0;
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], c = rs[j]; if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1) n++; } return n; });
  }
  const m = [];
  if (!r.proto) m.push("no se pintó");
  else {
    if (r.dinamica !== (p === "a" ? "v6" : "v7")) m.push(`dinámica ${r.dinamica}`); if (r.pisadas) m.push(`piezas pisadas ${r.pisadas}`);
    if (r.piezas !== r.datos) m.push(`piezas ${r.piezas}/${r.datos}`); if (r.fuera) m.push(`piezas fuera ${r.fuera}`); if (r.palabraCortada) m.push(`palabra que no entra ${r.palabraCortada}`);
    if (r.overflowX) m.push("desborda"); if (r.v1Visible) m.push("v1 visible"); if (r.avg !== r.prom) m.push(`promedio ${r.avg} ≠ ${r.prom}`);
    if (r.traducidas && r.notas < 1) m.push("traducción sin nota"); if (!r.traducidas && r.notas) m.push("nota sin traducción");
    const otro = r.textos.filter((t) => t && !ESC[lang].test(t) && /[A-Za-z\u0590-\u06FF\u0400-\u04FF]/.test(t)); if (otro.length) m.push(`texto en otro idioma: ${otro.slice(0, 2).join(" / ")}`);
    if (r.traducidas) { // ida y vuelta del original
      const ida = await pg.evaluate(() => { const b = document.querySelector(".res6-note button"); b.click(); return document.querySelector(".res6-quote p").textContent; });
      const vuelta = await pg.evaluate(() => { const b = document.querySelector(".res6-note button"); b.click(); return document.querySelector(".res6-quote p").textContent; });
      if (!/[\u0590-\u05FF]/.test(ida)) m.push("«ver original» no muestra el hebreo"); if (!ESC[lang].test(vuelta)) m.push("no vuelve a la traducción");
    }
  }
  const errs = err.filter((e) => !/WebSocket closed without opened/.test(e)); /* D15: recarga en caliente de Vite con A y C a la vez */ if (errs.length) m.push("errores JS " + errs.join(";"));
  if (m.length) { mal++; console.log(`${p}-${lang}-${w}x${h}: ${m.join(" | ")}`); }
  await ctx.close();
}
await b.close();
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
console.log(`${casos.length} casos, con problemas ${mal}`); process.exit(mal ? 1 : 0);
