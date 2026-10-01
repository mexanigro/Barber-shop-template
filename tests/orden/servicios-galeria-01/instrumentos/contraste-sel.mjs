// Contraste en el peor píxel DETRÁS de las letras (máscara de letra) para cada elemento de un selector.
// Uso: node contraste-sel.mjs "<selector>" "<sección para scroll>" a[,c] idioma[,idioma] ancho[,ancho] [MUTAR_CSS]
// Copia de diseno/{services,galeria}/verificacion/contraste-sel.mjs (iguales); cambios en ./_nav.mjs y aquí: la plantilla (a, c) en vez del puerto.
import { chromium, contexto, url, sinMaterial } from "./_nav.mjs";
const [sel, seccion, puertos, idiomas, anchos, mutar] = process.argv.slice(2);
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const b = await chromium.launch(); let peorGlobal = Infinity;
for (const port of puertos.split(",")) for (const lang of idiomas.split(",")) for (const w of anchos.split(",").map(Number)) {
  const pg = await (await contexto(b, { viewport: { width: w, height: w < 768 ? 812 : 945 }, isMobile: w < 768 })).newPage();
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(port, process.env.QS || ""), { waitUntil: "networkidle", timeout: 120000 }); await pg.waitForTimeout(2500);
  await pg.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "center", behavior: "instant" }), seccion); await pg.waitForTimeout(1200);
  if (mutar) await pg.addStyleTag({ content: mutar });
  const els = await pg.$$(sel);
  const dec = (buf) => pg.evaluate(async (b64) => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0); return Array.from(cx.getImageData(0, 0, img.width, img.height).data); }, buf.toString("base64"));
  const H = w < 768 ? 812 : 945;
  for (const [i, el] of els.entries()) {
    // la foto del local está FIJA detrás del contenido: el fondo de la letra cambia con el scroll → se mide en 3 posiciones
    let peorEl = Infinity, detalle = [], txt = "";
    for (const pos of ["arriba", "centro", "abajo"]) {
      await el.evaluate((e, pos) => { const q = e.getBoundingClientRect(); const destino = pos === "arriba" ? 96 : pos === "centro" ? (innerHeight - q.height) / 2 : innerHeight - q.height - 90; scrollTo({ top: q.top + scrollY - destino, behavior: "instant" }); }, pos);
      await pg.waitForTimeout(250);
      const box = await el.boundingBox(); if (!box || box.x < 0 || box.x + box.width > w || box.y < 0 || box.y + box.height > H) { detalle.push(pos + ":fuera"); continue; }
      const info = await el.evaluate((e) => {
        const q = e.getBoundingClientRect(); const arriba = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        // flotantes fijos (FAB de WhatsApp, accesibilidad, navbar) que se cruzan con el texto: pasan POR ENCIMA, no son su fondo
        const fijos = [...document.querySelectorAll("body *")].filter((x) => { const cs = getComputedStyle(x); return cs.position === "fixed" && cs.display !== "none" && cs.visibility !== "hidden" && !x.contains(e); }).map((x) => x.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0 && r.width < innerWidth * 0.9);
        const cruza = fijos.some((r) => !(r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top >= q.bottom));
        return { txt: e.textContent.trim().slice(0, 24), tapado: (!!arriba && !e.contains(arriba) && !arriba.contains(e)) || cruza };
      });
      txt = info.txt; if (info.tapado) { detalle.push(pos + ":tapado"); continue; }
      const con = await pg.screenshot({ clip: box });
      await el.evaluate((e) => e.style.setProperty("color", "transparent", "important")); await pg.waitForTimeout(100);
      const sin = await pg.screenshot({ clip: box });
      await el.evaluate((e) => e.style.removeProperty("color"));
      const A = await dec(con), B = await dec(sin);
      let peor = Infinity, nLetra = 0, colorTexto = null, maxD = 0;
      for (let k = 0; k < A.length; k += 4) { const d = Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]); if (d > maxD) { maxD = d; colorTexto = [A[k], A[k + 1], A[k + 2]]; } }
      for (let k = 0; k < A.length; k += 4) { const d = Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]); if (d < 60) continue; nLetra++; peor = Math.min(peor, ratio(colorTexto, [B[k], B[k + 1], B[k + 2]])); }
      if (!nLetra) { detalle.push(pos + ":sin-letra"); continue; }
      detalle.push(pos + ":" + peor.toFixed(2)); peorEl = Math.min(peorEl, peor);
    }
    if (peorEl === Infinity) { console.log(port, lang, w, `«${txt}»`, "SIN MEDIR", detalle.join(" ")); continue; }
    peorGlobal = Math.min(peorGlobal, peorEl);
    console.log(port, lang, w, `«${txt}»`, `peor ${peorEl.toFixed(2)}`, detalle.join(" "), peorEl >= 4.5 ? "OK" : "NO");
  }
  await pg.close();
}
await b.close(); console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" ")); console.log("PEOR", peorGlobal.toFixed(2)); process.exit(peorGlobal >= 4.5 ? 0 : 1);
