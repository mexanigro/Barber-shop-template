// SERVICIOS-GALERIA-01 · copia promovida (TEAM-RESENAS-01, D-174) de siluetas.mjs (G2): ¿cuánto se ve la foto del local donde entra la
// textura de galería? Diferencia media por píxel (0–255) entre la franja de entrada con la foto visible y con la foto oculta, en dos
// tramos: [0–40 %] y [40–100 %] (entra la textura: acá la foto NO tiene que verse). Con y sin la corrección (mutación = CSS de G2
// revertido). Lo que mide no cambia; las esperas son condiciones (./_nav.mjs) y, con SG_CASOS, las pantallas son las de los casos.
import { chromium, contexto, url, sinMaterial, CASOS, listo, quieta } from "./_nav.mjs";
const MUT = `html[data-niche="peluqueria"] :is(main, [data-backdrop-content]) > section#gallery.gal[data-surface="textura"][data-surface] { background-image: none !important; }
section#gallery .gal-wall { -webkit-mask-image: linear-gradient(to bottom, transparent, #000 var(--gal-fade), #000 calc(100% - var(--gal-fade)), transparent) !important; mask-image: linear-gradient(to bottom, transparent, #000 var(--gal-fade), #000 calc(100% - var(--gal-fade)), transparent) !important; }`;
const VISTAS = CASOS
  ? CASOS.map((k) => { const [p, , vp] = k.split("-"); const [w, h] = vp.split("x").map(Number); return [p, w, h]; })
  : ["a", "c"].flatMap((p) => [[375, 812], [1920, 945]].map(([w, h]) => [p, w, h]));
const b = await chromium.launch();
for (const mut of [false, true]) for (const [p, w, h] of VISTAS) {
  const pg = await (await contexto(b, { viewport: { width: w, height: h } })).newPage();
  await pg.goto(url(p), { waitUntil: "networkidle", timeout: 120000 }); await listo(pg, "#gallery");
  if (mut) { await pg.addStyleTag({ content: MUT }); await quieta(pg, "#gallery"); }
  await pg.evaluate(() => { const g = document.getElementById("gallery"); scrollTo({ top: g.getBoundingClientRect().top + scrollY - 200, behavior: "instant" }); });
  await quieta(pg, "#gallery");
  const zona = await pg.evaluate(() => { const g = document.getElementById("gallery").getBoundingClientRect(); return { y: Math.round(g.top), fadePx: Math.round(innerHeight * 0.12) }; });
  const clip = { x: 0, y: zona.y, width: w, height: zona.fadePx };
  const con = await pg.screenshot({ clip });
  await pg.addStyleTag({ content: ".local-backdrop-layer, [data-local-backdrop] img, [data-local-backdrop] picture { visibility: hidden !important; }" });
  await quieta(pg, "#gallery"); await pg.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
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
