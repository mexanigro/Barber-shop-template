// SERVICIOS-GALERIA-01 · copia promovida (TEAM-RESENAS-01, D-174) de galeria.mjs: auditoría de galería (home + /galeria) en A (v6) y C
// (v7). Lo que mide no cambia; las esperas son condiciones (./_nav.mjs: la página quieta, el diálogo abierto o cerrado, la ruta nueva)
// y SG_CASOS elige los casos. Uso: node galeria.mjs <salida> [idiomas]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, contexto, url, sinMaterial, toma, listo, quieta, enRuta } from "./_nav.mjs";
const [OUT, langsArg = "he,en,ru,ar"] = process.argv.slice(2); const pA = "a", pC = "c";
mkdirSync(OUT, { recursive: true });
const ESCRITURA = { he: /[֐-׿]/, ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/, en: /[A-Za-z]/ };
const recortes = (raiz) => {
  const out = [];
  for (const el of (raiz ? raiz.querySelectorAll("*") : [])) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") continue;
    const x = cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1, y = cs.overflowY !== "visible" && el.scrollHeight > el.clientHeight + 1;
    if (x || y || (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1)) out.push(`«${el.textContent.trim().slice(0, 40)}» ${x ? "X" : ""}${y ? "Y" : ""}`);
  }
  return out;
};
// salto de color en una frontera: media de color por fila en ±24 px; salto de la frontera vs mediana de saltos de la franja
const costura = async (pg, y) => {
  const vw = await pg.evaluate(() => innerWidth);
  const buf = await pg.screenshot({ clip: { x: 0, y: Math.max(0, y - 24), width: vw, height: 48 } });
  return pg.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, img.width, img.height).data; const filas = [];
    for (let r = 0; r < img.height; r++) { let R = 0, G = 0, B = 0; for (let c = 0; c < img.width; c++) { const i = (r * img.width + c) * 4; R += d[i]; G += d[i + 1]; B += d[i + 2]; } filas.push([R / img.width, G / img.width, B / img.width]); }
    const saltos = filas.slice(1).map((f, i) => Math.hypot(f[0] - filas[i][0], f[1] - filas[i][1], f[2] - filas[i][2]));
    const orden = [...saltos].sort((a, b) => a - b); const mediana = orden[Math.floor(orden.length / 2)] || 0.01;
    const max = Math.max(...saltos); return { max: +max.toFixed(1), mediana: +mediana.toFixed(2), filaMax: saltos.indexOf(max) - 23 };
  }, buf.toString("base64"));
};
const b = await chromium.launch();
const filas = [];
for (const [p, port] of [["a", pA], ["c", pC]]) for (const lang of langsArg.split(",")) for (const [w, h] of [[375, 812], [1280, 800], [1366, 657], [1920, 945]]) {
  if (!toma(p, lang, w, h)) continue;
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const pg = await ctx.newPage(); const k = `${p}-${lang}-${w}x${h}`;
  const avisos = []; pg.on("console", (m) => { if (/gallery|galer/i.test(m.text()) && /warn|copy/i.test(m.type() + m.text())) avisos.push(m.text().slice(0, 140)); });
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port), { waitUntil: "networkidle", timeout: 120000 }); await listo(pg, "#gallery");
  const f = { k, avisos };
  const rects = await pg.evaluate(() => { const g = document.getElementById("gallery"), s = document.getElementById("services"), t = document.getElementById("team"); const top = (e) => e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; return { variante: g?.dataset.gallery, top: top(g), bottom: g ? top(g) + g.offsetHeight : null, h: g?.offsetHeight, team: top(t), svcBottom: s ? top(s) + s.offsetHeight : null }; });
  f.variante = rects.variante; f.alto = rects.h;
  await pg.evaluate((y) => scrollTo({ top: y - 80, behavior: "instant" }), rects.top); await quieta(pg, "#gallery");
  const g = await pg.evaluate(() => {
    const sec = document.getElementById("gallery");
    const imgs = [...sec.querySelectorAll("img.gal-img")];
    return { piezas: imgs.length, altVacios: imgs.filter((i) => !i.alt.trim()).length, alts: imgs.map((i) => i.alt), overflowX: document.documentElement.scrollWidth > innerWidth,
      piezasFuera: [...sec.querySelectorAll(".gal-piece")].filter((e) => { const q = e.getBoundingClientRect(); return q.left < -1 || q.right > innerWidth + 1; }).length,
      pie: [...sec.querySelectorAll(".gal-foot h2, .gal-foot p, .gal-foot a")].map((e) => e.textContent.trim()) };
  });
  const esc = ESCRITURA[lang];
  f.piezas = g.piezas; f.altVacios = g.altVacios; f.altOtroIdioma = g.alts.filter((a) => a && !esc.test(a)).length; f.overflowX = g.overflowX; f.piezasFuera = g.piezasFuera; f.pie = g.pie.join(" | ");
  f.recortes = await pg.evaluate(`(${recortes.toString()})(document.getElementById("gallery"))`);
  await pg.screenshot({ path: `${OUT}/${k}-home.png` });
  // costuras services→gallery y gallery→team
  for (const [nombre, y] of [["svc→gal", rects.top], ["gal→team", rects.bottom]]) {
    if (y == null) continue;
    await pg.evaluate((yy) => scrollTo({ top: yy - 300, behavior: "instant" }), y); await quieta(pg, "#gallery");
    const yv = await pg.evaluate((yy) => yy - scrollY, y);
    f[nombre] = await costura(pg, yv);
    await pg.screenshot({ path: `${OUT}/${k}-${nombre.replace("→", "-a-")}.png` });
  }
  // lightbox: abrir la primera pieza con teclado (Enter), medir, Escape, foco de vuelta
  await pg.evaluate((y) => scrollTo({ top: y - 80, behavior: "instant" }), rects.top); await quieta(pg, "#gallery");
  await pg.focus("#gallery .gal-piece"); await pg.keyboard.press("Enter");
  await pg.waitForSelector("dialog[open]", { timeout: 10000 }).catch(() => {});
  if (await pg.$("dialog[open]")) await quieta(pg, "dialog[open]");
  const lb = await pg.evaluate(() => {
    const dlg = document.querySelector("dialog[open]");
    return { abre: !!dlg, texto: dlg ? dlg.innerText.replace(/\s+/g, " ").trim().slice(0, 120) : null, focoDentro: !!dlg && dlg.contains(document.activeElement) };
  });
  if (lb.abre) {
    f.lbRecortes = await pg.evaluate(`(${recortes.toString()})(document.querySelector("dialog[open]"))`);
    await pg.screenshot({ path: `${OUT}/${k}-lightbox.png` });
    await pg.keyboard.press("Escape");
    await pg.waitForFunction(() => !document.querySelector("dialog[open]"), null, { timeout: 10000 }).catch(() => {});
    await pg.waitForFunction(() => document.activeElement?.classList.contains("gal-piece"), null, { timeout: 5000 }).catch(() => {});
    lb.cierraEsc = await pg.evaluate(() => !document.querySelector("dialog[open]"));
    lb.focoVuelve = await pg.evaluate(() => document.activeElement?.classList.contains("gal-piece"));
  }
  f.lightbox = lb;
  // /galeria
  await pg.evaluate(() => document.querySelector("#gallery .gal-more")?.click());
  await enRuta(pg, "/galeria", "main");
  f.pagina = await pg.evaluate(() => {
    const imgs = [...document.querySelectorAll("main img")];
    const pills = [...document.querySelectorAll("main .gal-pill")].map((e) => e.textContent.trim()).filter(Boolean);
    return { path: location.pathname, fotos: imgs.length, altVacios: imgs.filter((i) => !i.alt.trim()).length, pills: pills.slice(0, 8).join(" · "), overflowX: document.documentElement.scrollWidth > innerWidth };
  });
  f.pagina.recortes = await pg.evaluate(`(${recortes.toString()})(document.querySelector("main"))`);
  await pg.screenshot({ path: `${OUT}/${k}-galeria.png`, fullPage: true });
  filas.push(f); await ctx.close();
}
await b.close();
writeFileSync(`${OUT}/galeria.json`, JSON.stringify(filas, null, 1));
for (const f of filas) console.log(JSON.stringify(f));
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
