// Verificación de FAQ-01 en la página renderizada: A (collage) y C (mosaico) × 4 idiomas × 375, 1280×800, 1366×657, 1920×945.
// INSTAGRAM-FAQ-01 · copia de diseno/faq/verificacion/faq.mjs (sesión A, 2026-10-02). Cambios, ninguno en lo que mide: la página, playwright
// y el material de Storage salen de ./_nav.mjs; las clases del prototipo `proto-faq…` se llaman `faq6…` en T; cada espera de tiempo fijo
// es una condición (`listo`, `quieta`, `sinTransiciones`); y al final imprime «SIN MATERIAL». Uso: node faq.mjs. Sale 1 si hay problemas.
import { chromium, contexto, url, listo, quieta, sinTransiciones, toma, sinMaterial } from "./_nav.mjs";
const ESC = { he: /[\u0590-\u05FF]/, ar: /[\u0600-\u06FF]/, ru: /[\u0400-\u04FF]/, en: /[A-Za-z]/ };
// lo que C NO ofrece (su catálogo: corte, brushing, color, reflejos, tratamiento, evento): su FAQ no puede prometerlo
const C_NO = { he: /החלק(ה|ות) (אורגנית|3)|ילדים|כלה/, en: /straightening 3|children|bridal/i, ru: /выпрямление 3|детей|свадеб/i, ar: /تمليس 3|الأطفال|العروس/ };
const b = await chromium.launch(); let mal = 0; const casos = [];
for (const p of ["a", "c"]) for (const lang of ["he", "en", "ru", "ar"]) for (const vp of [[375, 812], [1280, 800], [1366, 657], [1920, 945]]) if (toma(p, lang, ...vp)) casos.push([p, p, lang, vp]);
for (const [p, port, lang, [w, h]] of casos) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const pg = await ctx.newPage(); const err = []; pg.on("pageerror", (e) => err.push(e.message.slice(0, 100)));
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port), { waitUntil: "load", timeout: 120000 }); await listo(pg, "#faq");
  await pg.evaluate(() => document.querySelector(".faq6-mesa")?.scrollIntoView({ block: "center", behavior: "instant" })); await quieta(pg, "#faq");
  const m = []; const k = `${p}-${lang}-${w}x${h}`;
  const r = await pg.evaluate(async () => {
    const raiz = document.querySelector(".faq6"); if (!raiz) return { proto: false };
    const s = await import("/src/config/site.ts"); const datos = (s.siteConfig.sections?.faq?.items || []).length;
    const qs = [...raiz.querySelectorAll(".faq6-q")];
    const sec = document.getElementById("faq");
    return { proto: true, dinamica: raiz.dataset.dinamica, preguntas: qs.length, datos,
      v1Visible: [...sec.children].filter((e) => !e.classList.contains("faq6") && !e.classList.contains("faq6-wall") && getComputedStyle(e).display !== "none").length,
      cerradasOcultas: [...raiz.querySelectorAll(".faq6-a")].every((a) => getComputedStyle(a).visibility === "hidden"),
      aria: qs.every((q) => q.getAttribute("aria-expanded") === "false" && document.getElementById(q.getAttribute("aria-controls"))),
      overflowX: document.documentElement.scrollWidth > innerWidth,
      textos: [...raiz.querySelectorAll(".faq6-qt, .faq6-hoja p, .faq6-foot h2, .faq6-foot > div > p, .faq6-more")].map((e) => e.textContent.trim()),
      wa: raiz.querySelector(".faq6-more")?.getAttribute("href") || "" };
  });
  if (!r.proto) m.push("no se pintó");
  else {
    if (r.dinamica !== (p === "a" ? "v6" : "v7")) m.push(`dinámica ${r.dinamica}`);
    if (r.preguntas !== r.datos || !r.datos) m.push(`preguntas ${r.preguntas}/${r.datos}`);
    if (r.v1Visible) m.push("v1 visible"); if (!r.cerradasOcultas) m.push("respuesta cerrada visible para el lector"); if (!r.aria) m.push("aria");
    if (r.overflowX) m.push("desborda"); if (!/^https:\/\/wa\.me\/\d{8,}$/.test(r.wa)) m.push(`acción ${r.wa}`);
    const otro = r.textos.filter((t) => t && !ESC[lang].test(t) && /[A-Za-z\u0590-\u06FF\u0400-\u04FF]/.test(t)); if (otro.length) m.push(`otro idioma: ${otro[0].slice(0, 40)}`);
    const todo = r.textos.join(" ");
    if (p === "c" && C_NO[lang].test(todo)) m.push("C promete lo que no ofrece");
    if (lang === "ar" && /التجاعيد/.test(todo)) m.push("árabe: «التجاعيد» (arrugas)");
    // abrir la primera: se abre ella sola, la respuesta queda visible y en el orden correcto de los números; abrir otra cierra la primera
    await pg.click(".faq6-q"); await sinTransiciones(pg, "#faq");
    const u = await pg.evaluate(() => {
      const it = [...document.querySelectorAll(".faq6-item")]; const a = it[0].querySelector(".faq6-a");
      const vis = getComputedStyle(a).visibility === "visible" && a.getBoundingClientRect().height > 20;
      const abiertas = it.filter((x) => x.querySelector(".faq6-q").getAttribute("aria-expanded") === "true").length;
      // «45–60»: el 45 tiene que quedar a la IZQUIERDA del 60 también en RTL
      let orden = true; for (const bd of a.querySelectorAll("bdi.faq6-rango")) { const t = bd.firstChild, s = t.textContent, i = s.search(/[–-]/); if (i < 0) continue;
        const r1 = document.createRange(); r1.setStart(t, 0); r1.setEnd(t, 1); const r2 = document.createRange(); r2.setStart(t, s.length - 1); r2.setEnd(t, s.length);
        if (r1.getBoundingClientRect().left > r2.getBoundingClientRect().left) orden = false; }
      const pie = document.querySelector(".faq6-foot").getBoundingClientRect(); const cortes = [...a.querySelectorAll("p")].filter((x) => x.scrollWidth > x.clientWidth + 1).length;
      return { vis, abiertas, orden, cortes };
    });
    if (!u.vis) m.push("no se abre"); if (u.abiertas !== 1) m.push(`abiertas ${u.abiertas}`); if (!u.orden) m.push("rango al revés (60–45)"); if (u.cortes) m.push("respuesta recortada");
    const qs = await pg.$$(".faq6-q"); await qs[1].click(); await sinTransiciones(pg, "#faq");
    const dos = await pg.evaluate(() => [...document.querySelectorAll(".faq6-q")].map((q) => q.getAttribute("aria-expanded")).join(""));
    if (dos !== "falsetrue" + "false".repeat(Math.max(0, r.preguntas - 2))) m.push(`una por vez: ${dos}`);
    // teclado: Enter sobre la tercera la abre
    await pg.focus(".faq6-item:nth-child(1) .faq6-q").catch(() => {});
    await qs[2].focus(); await pg.keyboard.press("Enter"); await sinTransiciones(pg, "#faq");
    if (await qs[2].getAttribute("aria-expanded") !== "true") m.push("Enter no abre");
  }
  const errs = err.filter((e) => !/WebSocket closed without opened/.test(e)); if (errs.length) m.push("errores JS " + errs.join(";"));
  if (m.length) { mal++; console.log(`${k}: ${m.join(" | ")}`); }
  await ctx.close();
}
await b.close();
console.log(`${casos.length} casos, con problemas ${mal}`);
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
process.exit(mal ? 1 : 0);
