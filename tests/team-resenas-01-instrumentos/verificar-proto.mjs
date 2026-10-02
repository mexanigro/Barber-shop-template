// TEAM-RESENAS-01 · copia promovida (INSTAGRAM-FAQ-01, D-200): «services sigue en 32/32» con la copia editable de
// tests/servicios-galeria-01-instrumentos/verificar-proto.mjs, que es ésta sin cambios.
// SERVICIOS-GALERIA-01 · copia promovida (TEAM-RESENAS-01, D-174) de verificar-proto.mjs (SERVICES-03): medidas de services en la home y
// en /servicios. Lo que mide no cambia; las esperas son condiciones (./_nav.mjs: la leyenda con la frase de la central, la ruta nueva,
// la página quieta) y SG_CASOS elige los casos.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, contexto, url, sinMaterial, toma, listo, leyendaLista, enRuta } from "./_nav.mjs";
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const PL = { a: "a", c: "c" };
const LANGS = (process.argv[3] || "he,en,ru,ar").split(",");
const VW = [[375, 812], [1280, 800], [1366, 657], [1920, 945]];
const SERVICIOS = 'section[data-surface="textura"].min-h-screen';
const b = await chromium.launch();
const filas = [];
for (const [p, port] of Object.entries(PL)) for (const lang of LANGS) for (const [w, h] of VW) {
  if (!toma(p, lang, w, h)) continue;
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const pg = await ctx.newPage();
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port), { waitUntil: "networkidle", timeout: 120000 });
  await listo(pg, "#services");
  await pg.evaluate(() => { const nav = document.querySelector("nav").getBoundingClientRect().bottom; const c = document.querySelector("#services .svc-slide"); scrollTo({ top: c.getBoundingClientRect().top + scrollY - nav - 8, behavior: "instant" }); });
  await leyendaLista(pg);
  const m = await pg.evaluate((w) => {
    const sec = document.getElementById("services");
    const vis = [...sec.querySelectorAll(".svc-slide")].filter((s) => { const q = s.getBoundingClientRect(); return q.right > 1 && q.left < innerWidth - 1; });
    const wrap = sec.querySelector(":scope > div.max-w-6xl").getBoundingClientRect();
    const dentroBloque = vis.filter((s) => { const q = s.getBoundingClientRect(); return q.left >= wrap.left - 1 && q.right <= wrap.right + 1; });
    const cap = sec.querySelector(".svc-caption");
    const central = sec.querySelector('.svc-slide[data-centrada="1"] .svc-phrase:not(:empty)');
    const nombresY = vis.map((s) => Math.round(s.querySelector(".svc-name").getBoundingClientRect().top));
    const card = sec.querySelector(".svc-slide .svc-card").getBoundingClientRect();
    return {
      lang: document.documentElement.lang, dir: document.documentElement.dir,
      card: [Math.round(card.width), Math.round(card.height)], cardBottom: Math.round(card.bottom), vpH: innerHeight,
      enteras: dentroBloque.length, visibles: vis.length,
      nombresY: w >= 1024 ? [Math.min(...nombresY), Math.max(...nombresY)] : null,
      cap: cap ? { visible: getComputedStyle(cap).display !== "none", txt: cap.textContent.slice(0, 70), coincide: !central || cap.textContent.trim() === central.textContent.trim(), h: Math.round(cap.getBoundingClientRect().height), minH: cap.style.minHeight } : null,
      fraseEnTarjeta: w < 1024 ? [...sec.querySelectorAll(".svc-card .svc-phrase")].some((e) => getComputedStyle(e).display !== "none") : null,
    };
  }, w);
  filas.push({ k: `${p}-${lang}-${w}x${h}`, ...m });
  await pg.screenshot({ path: `${OUT}/${p}-${lang}-${w}x${h}.png` });
  // /servicios: acciones rellenas, fundido de arriba, columna de texto
  if (w === 375 || w === 1920) {
    await pg.evaluate(() => { const b = [...document.querySelectorAll("#services button")].find((x) => !x.closest(".svc-slide") && !x.classList.contains("svc-arrow")); b?.click(); });
    await enRuta(pg, "/servicios", SERVICIOS);
    const s = await pg.evaluate((sel) => {
      const page = document.querySelector(sel);
      if (!page) return { error: "no se abrió /servicios" };
      const rellenas = [...document.querySelectorAll("button, a")].filter((el) => {
        const q = el.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight || q.width === 0) return false;
        const bg = getComputedStyle(el).backgroundColor; const m = bg.match(/[\d.]+/g); return m && (m[3] === undefined || +m[3] > 0.5) && !el.closest("nav") && !el.closest("[class*=fixed]");
      }).map((el) => el.textContent.trim().slice(0, 20));
      const antes = getComputedStyle(page, "::before").display;
      const cols = [...page.querySelectorAll("li")].map((li) => Math.round(li.querySelector("h3").getBoundingClientRect()[document.documentElement.dir === "rtl" ? "right" : "left"]));
      return { path: location.pathname, rellenasEnPantalla: rellenas, fundidoArriba: antes, columnaTexto: [Math.min(...cols), Math.max(...cols)] };
    }, SERVICIOS);
    filas[filas.length - 1].servicios = s;
    await pg.screenshot({ path: `${OUT}/${p}-${lang}-${w}x${h}-servicios.png` });
  }
  await ctx.close();
}
await b.close();
writeFileSync(`${OUT}/verificacion.json`, JSON.stringify(filas, null, 1));
for (const f of filas) console.log(JSON.stringify(f));
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
