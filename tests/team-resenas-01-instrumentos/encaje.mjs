// TEAM-RESENAS-01 · encaje sobre team y testimonials (D-169; copia de tests/orden/servicios-galeria-01/instrumentos/encaje.mjs, que es copia de
// diseno/services/verificacion/encaje.mjs; cambios en ./_nav.mjs y aquí: sólo #team y #testimonials —services y /servicios ya los midió
// SERVICIOS-GALERIA-01— y el aviso de texto faltante de T, «[D11]», cuenta igual que el del prototipo).
// ¿Cada texto entra donde tiene que entrar? team y testimonials de la home; A y C; 4 idiomas; 4 anchos.
// Busca: texto recortado por overflow, «…» por text-overflow, textos que se pisan en una fila de /servicios, avisos de texto faltante.
// COPIA PROMOVIDA (INSTAGRAM-FAQ-01, D-200) de tests/orden/team-resenas-01/instrumentos/encaje.mjs: lo que mide no cambia; cada espera es
// una condición (`listo`, `quieta`) y, con SG_CASOS, sólo esos casos.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, contexto, url, sinMaterial, listo, quieta, toma } from "./_nav.mjs";
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const PL = { a: "a", c: "c" };
const VW = [[375, 812], [1280, 800], [1366, 657], [1920, 945]];
const detector = (selSeccion) => {
  const raiz = typeof selSeccion === "string" ? document.querySelector(selSeccion) : selSeccion;
  if (!raiz) return [{ error: "sin sección " + selSeccion }];
  const out = [];
  for (const el of raiz.querySelectorAll("*")) {
    const tieneTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!tieneTexto) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
    if (el.closest('[data-centrada="0"]')) continue; // laterales del carrusel: sin texto a propósito (fase 2c)
    const recX = cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1;
    const recY = cs.overflowY !== "visible" && el.scrollHeight > el.clientHeight + 1;
    const elipsis = cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1;
    const puntos = /…\s*["”]?$/.test(el.textContent.trim());
    if (recX || recY || elipsis || puntos) out.push({ txt: el.textContent.trim().slice(0, 50), clase: (el.className + "").slice(0, 40), recorte: [recX && "X", recY && "Y", elipsis && "elipsis", puntos && "«…»"].filter(Boolean).join("+"), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight });
  }
  return out;
};
const b = await chromium.launch();
const informe = [];
for (const [p, port] of Object.entries(PL)) for (const lang of ["he", "en", "ru", "ar"]) for (const [w, h] of VW) {
  if (!toma(p, lang, w, h)) continue;
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const pg = await ctx.newPage();
  const avisos = []; pg.on("console", (m) => { if (/prototipo D11|\[D11\]|\[copy\]/.test(m.text())) avisos.push(m.text().slice(0, 160)); });
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port), { waitUntil: "networkidle", timeout: 120000 });
  await listo(pg, "#testimonials");
  const k = `${p}-${lang}-${w}x${h}`;
  const fila = { k, avisos };
  for (const sec of ["#team", "#testimonials"]) {
    await pg.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start", behavior: "instant" }), sec);
    await quieta(pg, sec);
    fila[sec] = await pg.evaluate(detector, sec);
    await pg.screenshot({ path: `${OUT}/${k}-${sec.slice(1)}.png` });
  }
  informe.push(fila);
  await ctx.close();
}
await b.close();
writeFileSync(`${OUT}/encaje.json`, JSON.stringify(informe, null, 1));
let total = 0;
for (const f of informe) {
  const probs = ["#team", "#testimonials"].flatMap((s) => (f[s] || []).map((x) => `${s} ${x.error || `«${x.txt}» ${x.recorte} (${x.sw}/${x.cw}×${x.sh}/${x.ch}) .${x.clase}`}`));
  if (f.avisos.length) probs.push(...f.avisos.map((a) => "aviso: " + a));
  total += probs.length;
  if (probs.length) { console.log(`\n${f.k}: ${probs.length}`); probs.forEach((x) => console.log("  " + x)); }
}
console.log(`\nTOTAL ${total} en ${informe.length} casos`);
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
