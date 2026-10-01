import { chromium, contexto, url, sinMaterial } from "./_nav.mjs";
// SERVICES-03 · nombres (copia de diseno/services/verificacion/nombres.mjs; cambios en ./_nav.mjs y aquí: la frase real es
// .svc-phrase:not(:empty)). Nombre y frase de TODAS las tarjetas entran.
const b = await chromium.launch(); let n = 0;
for (const [p, port] of [["a", "a"], ["c", "c"]]) for (const lang of ["he", "en", "ru", "ar"]) for (const [w, h] of [[375, 812], [1366, 657], [1920, 945]]) {
  const pg = await (await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768 })).newPage();
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port), { waitUntil: "networkidle", timeout: 120000 }); await pg.waitForTimeout(2500);
  const malos = await pg.evaluate(() => [...document.querySelectorAll("#services .svc-name, #services .svc-phrase:not(:empty)")]
    .filter((e) => getComputedStyle(e).display !== "none" && e.scrollHeight > e.clientHeight + 1)
    .map((e) => `${e.classList.contains("svc-name") ? "nombre" : "frase"} «${e.textContent.trim()}» ${e.scrollHeight}/${e.clientHeight}`));
  if (malos.length) { n += malos.length; console.log(`${p}-${lang}-${w}:`, malos.join(" | ")); }
  await pg.close();
}
console.log("TOTAL", n); console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" ")); await b.close();
