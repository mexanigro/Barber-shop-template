import { chromium, contexto, url, sinMaterial } from "./_nav.mjs";
// Copia de diseno/galeria/verificacion/gal-comp.mjs; cambios en ./_nav.mjs y aquí: la plantilla en vez del puerto.
const b = await chromium.launch();
for (const [p, port] of [["a", "a"], ["c", "c"]]) for (const [w, h] of [[375, 812], [1280, 800], [1366, 657], [1920, 945]]) {
  const pg = await (await contexto(b, { viewport: { width: w, height: h } })).newPage();
  await pg.goto(url(port), { waitUntil: "networkidle", timeout: 120000 }); await pg.waitForTimeout(2500);
  const r = await pg.evaluate(() => {
    const sec = document.getElementById("gallery"); const inner = sec.querySelector(".gal-inner").getBoundingClientRect();
    const piezas = [...sec.querySelectorAll(".gal-piece")].map((e) => e.getBoundingClientRect());
    const izq = Math.min(...piezas.map((q) => q.left)), der = Math.max(...piezas.map((q) => q.right));
    const cs = getComputedStyle(sec), wall = sec.querySelector(".gal-wall"), wcs = getComputedStyle(wall);
    const bef = getComputedStyle(sec, "::before");
    return { cols: sec.querySelector(".gal-grid").dataset.cols, contenedor: Math.round(inner.width), ocupado: Math.round(der - izq), pct: Math.round((der - izq) / (inner.width - 2 * parseFloat(getComputedStyle(sec.querySelector(".gal-inner")).paddingLeft)) * 100), alto: sec.offsetHeight,
      fondoSeccion: cs.backgroundImage.slice(0, 60) + " / " + cs.backgroundColor, wall: { h: Math.round(wall.getBoundingClientRect().height), img: wcs.backgroundImage.slice(0, 90), mask: (wcs.maskImage || wcs.webkitMaskImage || "").slice(0, 90), op: wcs.opacity }, before: { disp: bef.display, content: bef.content, h: bef.height, img: bef.backgroundImage.slice(0, 80) } };
  });
  console.log(p, w, JSON.stringify(r));
  await pg.close();
}
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
await b.close();
