// G2 · ¿cuánto se ve la foto del local donde entra la textura de galería? Diferencia media por píxel (0–255) entre la franja
// de entrada con la foto visible y con la foto oculta, en dos tramos: [0–40 %] (la foto se retira, sigue de services) y
// [40–100 %] (entra la textura: acá la foto NO tiene que verse). Con y sin la corrección (mutación = CSS de G2 revertido).
import { chromium, contexto, url, sinMaterial } from "./_nav.mjs";
const MUT = `html[data-niche="peluqueria"] :is(main, [data-backdrop-content]) > section#gallery.gal[data-surface="textura"][data-surface] { background-image: none !important; }
section#gallery .gal-wall { -webkit-mask-image: linear-gradient(to bottom, transparent, #000 var(--gal-fade), #000 calc(100% - var(--gal-fade)), transparent) !important; mask-image: linear-gradient(to bottom, transparent, #000 var(--gal-fade), #000 calc(100% - var(--gal-fade)), transparent) !important; }`;
// Copia de diseno/galeria/verificacion/siluetas.mjs; cambios en ./_nav.mjs y aquí: la plantilla en vez del puerto.
const b = await chromium.launch();
for (const mut of [false, true]) for (const [p, port] of [["a", "a"], ["c", "c"]]) for (const [w, h] of [[375, 812], [1920, 945]]) {
  const pg = await (await contexto(b, { viewport: { width: w, height: h } })).newPage();
  await pg.goto(url(port), { waitUntil: "networkidle", timeout: 120000 }); await pg.waitForTimeout(2500);
  if (mut) await pg.addStyleTag({ content: MUT });
  const fade = await pg.evaluate(() => { const g = document.getElementById("gallery"); scrollTo({ top: g.getBoundingClientRect().top + scrollY - 200, behavior: "instant" }); return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gal-fade")) || null; });
  await pg.waitForTimeout(900);
  const zona = await pg.evaluate(() => { const g = document.getElementById("gallery").getBoundingClientRect(); const f = parseFloat(getComputedStyle(document.getElementById("gallery")).paddingTop); return { y: Math.round(g.top), fadePx: Math.round(innerHeight * 0.12) }; });
  const clip = { x: 0, y: zona.y, width: w, height: zona.fadePx };
  const con = await pg.screenshot({ clip });
  await pg.addStyleTag({ content: ".local-backdrop-layer, [data-local-backdrop] img, [data-local-backdrop] picture { visibility: hidden !important; }" });
  await pg.waitForTimeout(300);
  const sin = await pg.screenshot({ clip });
  const r = await pg.evaluate(async ([a64, b64]) => {
    const dec = async (s) => { const i = new Image(); i.src = "data:image/png;base64," + s; await i.decode(); const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d"); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
    const A = await dec(a64), B = await dec(b64); const H = A.height, W = A.width; const corte = Math.round(H * 0.4);
    const media = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; s += (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2])) / 3; n++; } return +(s / n).toFixed(2); };
    return { tramo0_40: media(0, corte), tramo40_100: media(corte, H) };
  }, [con.toString("base64"), sin.toString("base64")]);
  console.log(mut ? "SIN G2 (mutación)" : "CON G2", p, w, `franja ${zona.fadePx}px`, JSON.stringify(r));
  await pg.close();
}
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
await b.close();
