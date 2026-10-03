// Verificación de INSTAGRAM-01 en la página renderizada: A (suelto) y C (prolijo) × 4 idiomas × 375, 1280×800, 1366×657,
// 1920×945, más un caso por plantilla con prefers-reduced-motion. Uso: node ig.mjs. Sale 1 si hay problemas.
// INSTAGRAM-FAQ-01 · copia de diseno/instagram/verificacion/ig.mjs (sesión A, 2026-10-02). Cambios, ninguno en lo que mide: la página,
// playwright y el material de Storage salen de ./_nav.mjs; las clases del prototipo «proto-ig…» se llaman «ig6…» en T y la sección se
// busca por su id (`#instagram`, que el prototipo también pone) y no por `data-proto-ig`; cada espera de tiempo fijo es una condición
// (`listo`, `sinTransiciones`); y al final imprime «SIN MATERIAL».
import { chromium, contexto, url, listo, sinTransiciones, toma, sinMaterial } from "./_nav.mjs";
const ESC = { he: /[\u0590-\u05FF]/, ar: /[\u0600-\u06FF]/, ru: /[\u0400-\u04FF]/, en: /[A-Za-z]/ };
const b = await chromium.launch(); let mal = 0; const casos = [];
for (const p of ["a", "c"]) {
  for (const lang of ["he", "en", "ru", "ar"]) for (const vp of [[375, 812], [1280, 800], [1366, 657], [1920, 945]]) if (toma(p, lang, ...vp)) casos.push([p, p, lang, vp, false]);
  if (toma(p, "he", 768, 1024)) casos.push([p, p, "he", [768, 1024], false]);
  if (toma(p, "he", 375, 812)) casos.push([p, p, "he", [375, 812], true]);
}
const abierto = (pg) => pg.evaluate(() => +getComputedStyle(document.querySelector(".ig6-abanico")).getPropertyValue("--ig-open"));
const ir = (pg, pos) => pg.evaluate((pos) => { const a = document.querySelector(".ig6-abanico"); const q = a.getBoundingClientRect(); scrollBy({ top: q.top + q.height / 2 - innerHeight * pos, behavior: "instant" }); }, pos);
for (const [p, port, lang, [w, h], reduce] of casos) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: reduce ? "reduce" : "no-preference" });
  const pg = await ctx.newPage(); const err = []; pg.on("pageerror", (e) => err.push(e.message.slice(0, 100)));
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port), { waitUntil: "load", timeout: 120000 }); await listo(pg, "#hero"); // #hero: la app ya montó (y con ella el splash, si lo hay), así que «el splash ido» significa algo
  const m = []; const k = `${p}-${lang}-${w}x${h}${reduce ? "-reduce" : ""}`;
  const r = await pg.evaluate(() => {
    const raiz = document.querySelector(".ig6"); if (!raiz) return { proto: false };
    const orden = [...document.querySelectorAll("[data-backdrop-content] > section, main > section")].map((s) => s.id || (s.dataset.protoIg ? "instagram" : "")).filter(Boolean);
    const sec = raiz.parentElement;
    return { proto: true, dinamica: raiz.dataset.dinamica, orden: orden.join(">"), fotos: raiz.querySelectorAll(".ig6-foto").length,
      alts: [...raiz.querySelectorAll(".ig6-marco")].map((x) => x.getAttribute("aria-label") || ""),
      v1Visible: [...sec.children].filter((e) => !e.classList.contains("ig6") && getComputedStyle(e).display !== "none").length,
      accion: raiz.querySelector(".ig6-more")?.getAttribute("href"), textos: [...raiz.querySelectorAll(".ig6-foot h2, .ig6-more")].map((e) => e.textContent.replace(/[↖↗]/g, "").trim()) };
  });
  if (!r.proto) m.push("no se pintó");
  else {
    if (!/testimonials>instagram>faq/.test(r.orden)) m.push(`orden ${r.orden}`);
    if (r.dinamica !== (p === "a" ? "v6" : "v7")) m.push(`dinámica ${r.dinamica}`);
    if (r.fotos !== 6) m.push(`fotos ${r.fotos}`); if (r.v1Visible) m.push("v1 visible");
    if (r.alts.some((a) => !a) || r.alts.some((a) => !ESC[lang].test(a))) m.push("alt vacío o en otro idioma");
    if (r.textos.some((t) => !t || !ESC[lang].test(t))) m.push(`texto: ${r.textos.join(" / ")}`);
    if (r.accion !== "/galeria") m.push(`acción ${r.accion} (sin cuenta de Instagram tiene que ir a la galería)`);
    // se abre al entrar: cerrado con la pila abajo en la pantalla, abierto al centro (con movimiento reducido: siempre abierto)
    await ir(pg, 1.05); await sinTransiciones(pg, "#instagram"); const cerrado = await abierto(pg);
    await ir(pg, 0.5); await sinTransiciones(pg, "#instagram"); const centro = await abierto(pg);
    if (reduce ? cerrado < 0.99 : cerrado > 0.05) m.push(`abierto antes de entrar: ${cerrado}`); if (centro < 0.99) m.push(`no se abre: ${centro}`);
    await sinTransiciones(pg, "#instagram");
    // abierto: las de los extremos pueden salir de la pantalla (mano de cartas; la sección recorta), pero las dos del centro se
    // ven enteras y NINGUNA tapa la fila del título (Liam, 2026-09-28: «muy chico, mal distribuido»; al agrandarlo, tapaban el pie)
    const reparto = await pg.evaluate(() => {
      const ms = [...document.querySelectorAll(".ig6-marco")].map((x) => x.getBoundingClientRect()); const n = ms.length;
      const centro = [ms[Math.floor((n - 1) / 2)], ms[Math.ceil((n - 1) / 2)]].every((q) => q.left >= 0 && q.right <= innerWidth);
      const pie = [...document.querySelectorAll(".ig6-foot h2, .ig6-more")].map((x) => x.getBoundingClientRect());
      // lo que se PINTA, no la caja: la caja de una foto girada incluye triángulos vacíos (daba falsos «tapa» a 375)
      let tapa = false; for (const f of pie) for (let fx = 0.05; fx <= 0.95; fx += 0.1) for (let fy = 0.2; fy <= 0.8; fy += 0.3) { const e = document.elementFromPoint(f.left + f.width * fx, f.top + f.height * fy); if (e && e.closest(".ig6-marco")) tapa = true; }
      const ancho = Math.max(0, ...[...document.querySelectorAll(".ig6-marco")].map((x) => x.offsetWidth)); /* el ancho real: la caja de una foto girada es más ancha */
      return { centro, tapa, ancho };
    });
    if (!reparto.centro) m.push("las fotos del centro no se ven enteras"); if (reparto.tapa) m.push("una foto tapa la fila del título");
    if (reparto.ancho < Math.min(w * 0.5, 250)) m.push(`fotos chicas: ${reparto.ancho} px`);
    if (await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth)) m.push("desborda");
    // móvil: las de los extremos salen de la pantalla, así que el abanico se gira con el dedo. Arrastrando en horizontal, la del
    // extremo tiene que quedar entera en la pantalla, sin que el arrastre cuente como toque, y sin tapar la fila del título.
    if (w < 600) {
      const entera = (n) => pg.evaluate((n) => { const q = document.querySelector(`.ig6-foto:nth-child(${n}) .ig6-marco`).getBoundingClientRect(); return q.left >= -1 && q.right <= innerWidth + 1; }, n);
      const visible = (n) => pg.evaluate((n) => { const b = document.querySelector(`.ig6-foto:nth-child(${n}) .ig6-marco`); const q = b.getBoundingClientRect(); for (let fy = 0.2; fy <= 0.8; fy += 0.1) for (let fx = 0.05; fx <= 0.95; fx += 0.05) { const x = q.left + q.width * fx, y = q.top + q.height * fy; if (x > 2 && x < innerWidth - 2 && b.contains(document.elementFromPoint(x, y))) return { x, y }; } return null; }, n);
      // 1) tocar la foto más de afuera que asoma a medias la trae al centro, entera (en C la del extremo queda tapada por su vecina:
      //    a esa se llega arrastrando, parte 2)
      let n = null, pu = null; for (const k of [6, 5, 1, 2]) { if (await entera(k)) continue; const v = await visible(k); if (v) { n = k; pu = v; break; } }
      if (!n) m.push("ninguna foto asoma a medias (la prueba no prueba nada)"); else { await pg.mouse.click(pu.x, pu.y); await sinTransiciones(pg, "#instagram", 24); /* 24 cuadros quietos: la foto tocada se trae al centro después de acercarse (en el prototipo, a los 240 ms; con reduced-motion no hay transición que esperar) */ if (!(await entera(n))) m.push(`tocar la foto ${n}, que asoma, no la trae a la pantalla`);
        const des = await pg.evaluate((n) => { const q = document.querySelector(`.ig6-foto:nth-child(${n}) .ig6-marco`).getBoundingClientRect(); return Math.round(Math.abs(q.left + q.width / 2 - innerWidth / 2)); }, n);
        if (des > 20) m.push(`la foto tocada no queda en el centro (${des} px)`); }

      await pg.reload({ waitUntil: "load" }); await listo(pg, "#instagram"); await ir(pg, 0.5); await sinTransiciones(pg, "#instagram");
      // 2) arrastrar en horizontal lleva la del otro extremo a la pantalla, sin contar como toque y sin tapar el título
      const antes = await entera(1);
      const c = await pg.evaluate(() => { const q = document.querySelector(".ig6-abanico").getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height * 0.45 }; });
      const hacia = (await pg.evaluate(() => document.querySelector(".ig6-foto:nth-child(1) .ig6-marco").getBoundingClientRect().left)) < 0 ? 1 : -1;
      await pg.mouse.move(c.x, c.y); await pg.mouse.down(); for (let k = 1; k <= 20; k++) await pg.mouse.move(c.x + hacia * k * 12, c.y); await pg.mouse.up(); await sinTransiciones(pg, "#instagram");
      if (antes) m.push("la primera ya entraba (la prueba no prueba nada)"); if (!(await entera(1))) m.push("arrastrando no se llega a la foto del extremo");
      if (await pg.evaluate(() => document.querySelectorAll(".ig6-marco[aria-pressed='true']").length)) m.push("el arrastre contó como toque");
      const tapaTras = await pg.evaluate(() => { const pie = [...document.querySelectorAll(".ig6-foot h2, .ig6-more")].map((x) => x.getBoundingClientRect()); let t = false; for (const f of pie) for (let fx = 0.05; fx <= 0.95; fx += 0.1) { const e = document.elementFromPoint(f.left + f.width * fx, f.top + f.height / 2); if (e && e.closest(".ig6-marco")) t = true; } return t; });
      if (tapaTras) m.push("corrido, una foto tapa la fila del título");
      // lo que sigue arranca con la página limpia (sin foto acercada ni abanico corrido)
      await pg.reload({ waitUntil: "load" }); await listo(pg, "#instagram"); await ir(pg, 0.5); await sinTransiciones(pg, "#instagram");
    }
    // tocar una foto la acerca y queda arriba de todas; tocarla otra vez la devuelve. Se toca un punto VISIBLE de la foto (en un
    // abanico el centro de una puede estar tapado por la vecina: se toca lo que se ve)
    const tercera = ".ig6-foto:nth-child(3) .ig6-marco";
    const punto = () => pg.evaluate((s) => { const b = document.querySelector(s); const q = b.getBoundingClientRect(); for (let fy = 0.2; fy <= 0.8; fy += 0.1) for (let fx = 0.1; fx <= 0.9; fx += 0.1) { const x = q.left + q.width * fx, y = q.top + q.height * fy; if (b.contains(document.elementFromPoint(x, y))) return { x, y }; } return null; }, tercera);
    let pt = await punto(); if (!pt) m.push("la tercera foto no se ve en ningún punto");
    else { await pg.mouse.click(pt.x, pt.y); await sinTransiciones(pg, "#instagram"); }
    const arriba = await pg.evaluate((s) => { const b = document.querySelector(s); const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height * 0.4); return b.getAttribute("aria-pressed") === "true" && b.contains(e); }, tercera);
    if (!arriba) m.push("la foto tocada no queda adelante");
    const cortada = await pg.evaluate((s) => { const q = document.querySelector(s).getBoundingClientRect(), z = document.getElementById("instagram").getBoundingClientRect(); return q.top < z.top + 1 || q.bottom > z.bottom - 1; }, tercera);
    if (cortada) m.push("la foto acercada sale de la sección (se corta)");
    pt = await punto(); if (pt) { await pg.mouse.click(pt.x, pt.y); await sinTransiciones(pg, "#instagram"); }
    if (await pg.evaluate(() => document.querySelectorAll(".ig6-marco[aria-pressed='true']").length)) m.push("no se devuelve");
    // teclado: Enter sobre la primera la acerca
    await pg.focus(".ig6-foto:nth-child(1) .ig6-marco"); await pg.keyboard.press("Enter"); await sinTransiciones(pg, "#instagram");
    if (await pg.evaluate(() => document.querySelector(".ig6-foto:nth-child(1) .ig6-marco").getAttribute("aria-pressed")) !== "true") m.push("Enter no acerca");
  }
  const errs = err.filter((e) => !/WebSocket closed without opened/.test(e)); if (errs.length) m.push("errores JS " + errs.join(";"));
  if (m.length) { mal++; console.log(`${k}: ${m.join(" | ")}`); }
  await ctx.close();
}
await b.close();
console.log(`${casos.length} casos, con problemas ${mal}`);
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
process.exit(mal ? 1 : 0);
