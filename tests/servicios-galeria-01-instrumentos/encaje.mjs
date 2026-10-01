// SERVICIOS-GALERIA-01 · copia promovida (TEAM-RESENAS-01, D-174) de encaje.mjs: ¿cada texto entra donde tiene que entrar? services (home
// + /servicios). Busca texto recortado por overflow, «…» por text-overflow, nombre y precio que se pisan en una fila de /servicios y avisos
// de texto faltante. Lo que mide no cambia; las esperas son condiciones (./_nav.mjs) y SG_CASOS elige los casos.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, contexto, url, sinMaterial, toma, listo, quieta, enRuta } from "./_nav.mjs";
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const PL = { a: "a", c: "c" };
const VW = [[375, 812], [1280, 800], [1366, 657], [1920, 945]];
const SERVICIOS = 'section[data-surface="textura"].min-h-screen';
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
  await listo(pg, "#services");
  const k = `${p}-${lang}-${w}x${h}`;
  const fila = { k, avisos };
  await pg.evaluate(() => document.querySelector("#services")?.scrollIntoView({ block: "start", behavior: "instant" }));
  await quieta(pg, "#services");
  fila["#services"] = await pg.evaluate(detector, "#services");
  await pg.screenshot({ path: `${OUT}/${k}-services.png` });
  // /servicios
  await pg.evaluate(() => { const bt = [...document.querySelectorAll("#services button")].find((x) => !x.closest(".svc-slide") && !x.classList.contains("svc-arrow")); bt?.click(); });
  await enRuta(pg, "/servicios", SERVICIOS);
  fila["/servicios"] = await pg.evaluate(detector, SERVICIOS);
  fila["/servicios-pisadas"] = await pg.evaluate((s) => [...document.querySelectorAll(`${s} li`)].map((li) => {
    const a = li.querySelector("h3")?.getBoundingClientRect(), b = li.querySelector("h3 + span")?.getBoundingClientRect();
    return a && b && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top) ? li.querySelector("h3").textContent.trim().slice(0, 30) : null;
  }).filter(Boolean), SERVICIOS);
  await pg.screenshot({ path: `${OUT}/${k}-servicios.png`, fullPage: true });
  informe.push(fila);
  await ctx.close();
}
await b.close();
writeFileSync(`${OUT}/encaje.json`, JSON.stringify(informe, null, 1));
let total = 0;
for (const f of informe) {
  const probs = ["#services", "/servicios"].flatMap((s) => (f[s] || []).map((x) => `${s} ${x.error || `«${x.txt}» ${x.recorte} (${x.sw}/${x.cw}×${x.sh}/${x.ch}) .${x.clase}`}`));
  if (f["/servicios-pisadas"].length) probs.push(`/servicios se pisan nombre y precio: ${f["/servicios-pisadas"].join(", ")}`);
  if (f.avisos.length) probs.push(...f.avisos.map((a) => "aviso: " + a));
  total += probs.length;
  if (probs.length) { console.log(`\n${f.k}: ${probs.length}`); probs.forEach((x) => console.log("  " + x)); }
}
console.log(`\nTOTAL ${total} en ${informe.length} casos`);
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
