// Verificación de TEAM-01 en la página renderizada: A y C × 4 idiomas × 375, 1280×800, 1366×657, 1920×945.
// TEAM-RESENAS-01 · copia de diseno/team/verificacion/team.mjs. Cambios, ninguno en lo que mide: la página, playwright y el material de
// Storage salen de ./_nav.mjs; las clases del prototipo `proto-team…` se llaman `team6…` en T (D-173); y al final imprime «SIN MATERIAL».
// COPIA PROMOVIDA (INSTAGRAM-FAQ-01, D-200) de tests/orden/team-resenas-01/instrumentos/team.mjs: lo que mide no cambia; cada espera es
// una condición (`listo`, `quieta`, la ruta o el diálogo que se espera) y, con SG_CASOS, sólo esos casos.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, contexto, url, sinMaterial, listo, quieta, toma } from "./_nav.mjs";
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const ESC = { he: /[\u0590-\u05FF]/, ar: /[\u0600-\u06FF]/, ru: /[\u0400-\u04FF]/, en: /[A-Za-z]/ };
const b = await chromium.launch(); const filas = [];
for (const [p, port] of [["a", "a"], ["c", "c"]]) for (const lang of ["he", "en", "ru", "ar"]) for (const [w, h] of [[375, 812], [1280, 800], [1366, 657], [1920, 945]]) {
  if (!toma(p, lang, w, h)) continue;
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const pg = await ctx.newPage(); const k = `${p}-${lang}-${w}x${h}`;
  const errores = []; pg.on("pageerror", (e) => errores.push(e.message.slice(0, 120)));
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port), { waitUntil: "networkidle", timeout: 120000 }); await listo(pg, "#team");
  await pg.evaluate(() => { const nav = document.querySelector("nav").getBoundingClientRect().bottom; const c = document.querySelector(".team6-card"); if (c) scrollTo({ top: c.getBoundingClientRect().top + scrollY - nav - 8, behavior: "instant" }); });
  await quieta(pg, "#team");
  const r = await pg.evaluate(({ w }) => {
    const raiz = document.querySelector(".team6"); if (!raiz) return { error: "no se pintó" };
    const v1Visible = [...document.getElementById("team").children].filter((e) => !e.classList.contains("team6") && getComputedStyle(e).display !== "none").length;
    const cards = [...raiz.querySelectorAll(".team6-card")];
    const recortes = [];
    for (const e of raiz.querySelectorAll("*")) { if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const cs = getComputedStyle(e); if ((cs.overflowX !== "visible" && e.scrollWidth > e.clientWidth + 1) || (cs.overflowY !== "visible" && e.scrollHeight > e.clientHeight + 1)) recortes.push(e.textContent.trim().slice(0, 30)); }
    const q = cards.map((c) => c.getBoundingClientRect());
    const textos = [...raiz.querySelectorAll(".team6-name, .team6-role, .team6-bio, .team6-tag, .team6-foot h2, .team6-foot p")].map((e) => e.textContent.trim()).filter(Boolean);
    return { tarjetas: cards.length, v1Visible, dinamica: raiz.dataset.dinamica, recortes, fueraAncho: q.filter((x) => x.left < -1 || x.right > innerWidth + 1).length, alturaTarjeta: Math.round(q[0]?.height || 0), pieTarjeta: Math.round(Math.max(...q.map((x) => x.bottom))), vpH: innerHeight, overflowX: document.documentElement.scrollWidth > innerWidth, textos, labels: cards.map((c) => c.getAttribute("aria-label")), movil: w < 1024 ? cards.map((c) => { const k = c.getBoundingClientRect(), bo = c.querySelector(".team6-body").getBoundingClientRect(), f = c.querySelector(".team6-photo").getBoundingClientRect(); const nitido = f.left <= k.left + 1 ? [f.left, f.left + f.width * 0.55] : [f.right - f.width * 0.55, f.right]; /* la máscara deja nítido el 55 % del lado de la tarjeta */ return { dentro: bo.top >= k.top - 1 && bo.bottom <= k.bottom + 1 && bo.left >= k.left - 1 && bo.right <= k.right + 1, sobreRetrato: Math.max(0, Math.min(bo.right, nitido[1]) - Math.max(bo.left, nitido[0])) > 4, ext: !!c.querySelector(".team6-ext") && getComputedStyle(c.querySelector(".team6-ext")).display !== "none", tag: c.querySelector(".team6-tag")?.textContent || "", aire: (() => { let izq = Infinity, der = -Infinity; for (const h of c.querySelector(".team6-body").children) { if (getComputedStyle(h).display === "none") continue; const r = document.createRange(); r.selectNodeContents(h); for (const x of r.getClientRects()) { izq = Math.min(izq, x.left); der = Math.max(der, x.right); } } return Math.round(f.left <= k.left + 1 ? k.right - der : izq - k.left); })() }; /* de la letra más de afuera al borde de afuera de la tarjeta */ }) : null, ancho: Math.round(raiz.getBoundingClientRect().width) };
  }, { w });
  if (!r.error) {
    const esc = ESC[lang];
    r.textoOtroIdioma = r.textos.filter((t) => !esc.test(t) && /[A-Za-z\u0590-\u06FF\u0400-\u04FF]/.test(t)).length;
    r.cabe = w >= 1024 ? r.pieTarjeta <= r.vpH : null;
    await pg.screenshot({ path: `${OUT}/${k}.png` });
    // interacción: tarjeta → perfil; volver; reservar → wizard
    await pg.click(".team6-card"); await pg.waitForFunction(() => location.pathname.startsWith("/equipo/"), null, { timeout: 30000 }).catch(() => {});
    r.perfil = await pg.evaluate(() => location.pathname);
    await pg.goBack(); await pg.waitForFunction(() => location.pathname === "/", null, { timeout: 30000 }).catch(() => {}); await listo(pg, "#team");
    await pg.evaluate(() => document.querySelector(".team6-book")?.scrollIntoView({ block: "center", behavior: "instant" })); await quieta(pg, "#team");
    await pg.click(".team6-book").catch(() => {}); await pg.waitForFunction(() => !!document.querySelector('[role="dialog"], dialog[open], [aria-modal="true"]'), null, { timeout: 30000 }).catch(() => {});
    r.wizard = await pg.evaluate(() => !!document.querySelector('[role="dialog"], dialog[open], [aria-modal="true"]'));
  }
  r.errores = errores; r.k = k; filas.push(r); await ctx.close();
}
await b.close();
writeFileSync(`${OUT}/team.json`, JSON.stringify(filas, null, 1));
let mal = 0;
for (const f of filas) {
  const p = [];
  if (f.error) p.push(f.error); else {
    if (f.tarjetas !== 3) p.push("tarjetas " + f.tarjetas); if (f.v1Visible) p.push("v1 visible"); if (f.recortes.length) p.push("recortes " + f.recortes.join(";")); if (f.fueraAncho && !f.k.includes("375")) p.push("fuera " + f.fueraAncho); if (f.overflowX) p.push("desborda");
    if (f.cabe === false) p.push(`no entra ${f.pieTarjeta}/${f.vpH}`); if (f.textoOtroIdioma) p.push("texto en otro idioma " + f.textoOtroIdioma); if (!/\/equipo\//.test(f.perfil)) p.push("tarjeta no lleva al perfil: " + f.perfil); if (!f.wizard) p.push("reservar no abre el wizard");
    for (const [i, m] of (f.movil || []).entries()) { if (!m.dentro) p.push(`texto fuera de la tarjeta ${i + 1}`); if (m.sobreRetrato) p.push(`texto sobre el retrato ${i + 1}`); if (!m.ext) p.push(`sin extensión ${i + 1}`); if (m.tag.split(/\s+/).length > 10) p.push(`frase larga ${i + 1}`); if (m.aire > 19) p.push(`texto despegado del borde de afuera ${i + 1}: ${m.aire}px`); /* 16 px de margen + 1 de borde en oscuro + redondeo; sin ajustarTexto da 20–65 */ }
    if (f.movil && new Set(f.movil.map((m) => !!m.tag)).size > 1) p.push("frase en unas tarjetas y en otras no");
  }
  const errs = f.errores.filter((e) => !/WebSocket closed without opened/.test(e)); if (errs.length) p.push("errores JS " + errs.join(";"));
  if (p.length) { mal++; console.log(f.k + ": " + p.join(" | ")); }
}
console.log(`${filas.length} casos, con problemas ${mal}`);
const ej = filas.find((x) => x.k === "a-en-375x812"); if (ej) console.log("ej. a-en-375:", JSON.stringify({ dinamica: ej.dinamica, labels: ej.labels }));
console.log("dinámica C:", filas.find((x) => x.k.startsWith("c-"))?.dinamica, "· alto tarjeta 1366 A:", filas.find((x) => x.k === "a-he-1366x657")?.alturaTarjeta);
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
