// Verificación de PIE-01 en la página renderizada: A y C × 4 idiomas × 375, 1280×800, 1366×657, 1920×945 (más 768).
// CONTACTO-PIE-01 · copia de diseno/pie/verificacion/pie.mjs (sesión A, 2026-10-03). Cambios, ninguno en lo que mide: la página,
// playwright, el material de Storage y el mapa de Google salen de ./_nav.mjs; las clases del prototipo `proto-pie…`/`proto-cierre…` se
// llaman `pie6…`/`cierre6…` en T (D-202); cada espera de tiempo fijo es una condición: después de cargar, `listo`; después de mover el
// scroll, `quieta`; el enlace de navegación, hasta que la sección destino deja de moverse; reservar, hasta que aparece el diálogo (o
// un tope); el legal, hasta que cambia la ruta (o un tope); con SG_CASOS corre sólo esos casos; y al final imprime «SIN MATERIAL».
// Uso: node pie.mjs. Sale 1 si hay problemas.
import { chromium, contexto, url, listo, quieta, toma, sinMaterial } from "./_nav.mjs";
const ESC = { he: /[֐-׿]/, ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/, en: /[A-Za-z]/ };
const b = await chromium.launch(); let mal = 0; const casos = [];
for (const p of ["a", "c"]) { for (const lang of ["he", "en", "ru", "ar"]) for (const vp of [[375, 812], [1280, 800], [1366, 657], [1920, 945]]) if (toma(p, lang, ...vp)) casos.push([p, lang, vp]); if (toma(p, "he", 768, 1024)) casos.push([p, "he", [768, 1024]]); }
/** Lleva la barra legal al borde de abajo y espera a que la página quede quieta (en el diseño: cuatro veces con 350 ms; aquí, hasta que no se mueve). */
async function alFinal(pg) {
  for (let i = 0; i < 4; i++) { await pg.evaluate(() => document.querySelector(".pie6-barra").scrollIntoView({ block: "end", behavior: "instant" })); await quieta(pg, ".pie6-barra"); }
}
for (const [p, lang, [w, h]] of casos) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  const pg = await ctx.newPage(); const err = []; pg.on("pageerror", (e) => err.push(e.message.slice(0, 100)));
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  const abrir = async () => { await pg.goto(url(p), { waitUntil: "load", timeout: 120000 }); await listo(pg, "footer"); };
  await abrir();
  const m = []; const k = `${p}-${lang}-${w}x${h}`;
  const r = await pg.evaluate(() => {
    const raiz = document.querySelector(".pie6"); if (!raiz) return { proto: false };
    const pie = document.querySelector("footer");
    const nav = [...document.querySelector("nav[data-nav-v6], nav").querySelectorAll('a[href^="#"]')].map((a) => a.textContent.trim() + "|" + a.getAttribute("href"));
    const mios = [...raiz.querySelectorAll(".pie6-lista--nav a")].map((a) => a.textContent.trim() + "|" + a.getAttribute("href"));
    const textos = [...raiz.querySelectorAll(".cierre6-eyebrow, .cierre6-titulo, .cierre6-accion, .pie6-h, .pie6-lista--nav a, .pie6-legal a, .pie6-legal button")].map((e) => e.textContent.replace(/[↖↗]/g, "").trim());
    const img = raiz.querySelector(".cierre6-foto");
    return { proto: true, v1Visible: [...pie.children].filter((e) => !e.classList.contains("pie6") && getComputedStyle(e).display !== "none").length,
      cierre: !!raiz.querySelector(".cierre6"), foto: !!img?.getAttribute("src"), nav, mios, textos, legales: raiz.querySelectorAll(".pie6-legal a").length, admin: !!raiz.querySelector(".pie6-legal button"),
      contacto: [...raiz.querySelectorAll(".pie6-col:not(nav) a")].map((a) => a.getAttribute("href").split(":")[0].split("?")[0]),
      overflowX: document.documentElement.scrollWidth > innerWidth, faltaLink: /למה לבחור|Why choose|Почему|لماذا/.test(raiz.textContent) };
  });
  if (!r.proto) m.push("no se pintó");
  else {
    if (r.v1Visible) m.push("v1 visible"); if (!r.cierre) m.push("sin cierre"); if (!r.foto) m.push("cierre sin foto");
    if (r.nav.join() !== r.mios.join()) m.push(`enlaces ≠ navbar: ${r.mios.join(", ")}`);
    if (r.faltaLink) m.push("enlace a una sección que no existe (¿por qué elegirnos?)");
    if (r.legales !== 3) m.push(`legales ${r.legales}`); if (!r.admin) m.push("sin «ניהול»");
    if (!r.contacto.includes("https") || !r.contacto.includes("tel")) m.push(`contacto: ${r.contacto.join(",")}`);
    if (r.overflowX) m.push("desborda");
    const otro = r.textos.filter((t) => t && !ESC[lang].test(t) && /[A-Za-z֐-ۿЀ-ӿ]/.test(t)); if (otro.length) m.push(`otro idioma: ${otro.slice(0, 2).join(" / ")}`);
    // flotantes: al final de la página, ningún enlace legal queda debajo de un botón flotante
    await alFinal(pg); // scrollTo(scrollHeight) no llegaba al final: se medía fuera de pantalla y no podía dar rojo
    const tapado = await pg.evaluate(() => [...document.querySelectorAll(".pie6-legal :is(a, button), .pie6-copy")].some((e) => { const q = e.getBoundingClientRect(); for (const fx of [0.1, 0.5, 0.9]) { const x = q.left + q.width * fx, y = q.top + q.height / 2; const h = document.elementFromPoint(x, y); if (h && !e.contains(h) && !h.contains(e)) return true; } return false; }));
    if (tapado) m.push("un botón flotante tapa la barra legal");
    // un enlace de navegación lleva a su sección (la del medio de la lista)
    const i = Math.floor(r.mios.length / 2), destino = r.mios[i].split("|")[1];
    await pg.click(`.pie6-lista--nav li:nth-child(${i + 1}) a`); await quieta(pg, destino, 10);
    const lejos = await pg.evaluate((d) => Math.abs(document.querySelector(d).getBoundingClientRect().top), destino);
    if (lejos > 140) m.push(`el enlace no lleva a ${destino} (${Math.round(lejos)} px)`);
    // reservar abre el asistente (el mismo de la v1)
    await abrir(); await pg.evaluate(() => document.querySelector(".cierre6-accion").scrollIntoView({ block: "center", behavior: "instant" })); await quieta(pg, ".cierre6-accion");
    await pg.click(".cierre6-accion");
    const dialogo = await pg.waitForSelector('[role="dialog"], dialog[open], [aria-modal="true"]', { timeout: 10000 }).then(() => true, () => false);
    if (!dialogo) m.push("reservar no abre el asistente");
    // un legal navega a su página (como la v1)
    await abrir(); await alFinal(pg);
    const href = await pg.evaluate(() => document.querySelector(".pie6-legal a").getAttribute("href"));
    await pg.click(".pie6-legal a", { force: true });
    await pg.waitForFunction((h) => location.pathname === h, href, { timeout: 10000 }).catch(() => {});
    if (await pg.evaluate(() => location.pathname) !== href) m.push(`el legal no navega a ${href}`);
  }
  const errs = err.filter((e) => !/WebSocket closed without opened/.test(e)); if (errs.length) m.push("errores JS " + errs.join(";"));
  if (m.length) { mal++; console.log(`${k}: ${m.join(" | ")}`); }
  await ctx.close();
}
await b.close();
console.log(`${casos.length} casos, con problemas ${mal}`);
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
process.exit(mal ? 1 : 0);
