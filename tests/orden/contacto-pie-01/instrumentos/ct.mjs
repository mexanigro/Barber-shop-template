// Verificación de CONTACTO-01 en la página renderizada: A y C × 4 idiomas × 375, 1280×800, 1366×657, 1920×945 (más 768).
// CONTACTO-PIE-01 · copia de diseno/contacto/verificacion/ct.mjs (sesión A, 2026-10-03). Cambios, ninguno en lo que mide: la página,
// playwright, el material de Storage y el mapa de Google salen de ./_nav.mjs; las clases del prototipo `proto-ct…`/`proto-ubi…`/`proto-form…`
// se llaman `ct6…`/`ubi6…`/`form6…` en T (D-202); cada espera de tiempo fijo es una condición (`listo`, `quieta`); `--sin-formulario`
// apaga `features.showInquiry` por el fixture que pide la página (`conFixture`), en vez de una capa local aparte; con SG_CASOS corre
// sólo esos casos; y al final imprime «SIN MATERIAL». Uso: node ct.mjs [--sin-formulario]. Sale 1 si hay problemas.
import { chromium, contexto, conFixture, url, listo, quieta, toma, sinMaterial } from "./_nav.mjs";
const sinForm = process.argv.slice(2).includes("--sin-formulario");
const ESC = { he: /[֐-׿]/, ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/, en: /[A-Za-z]/ };
const b = await chromium.launch(); let mal = 0; const casos = [];
for (const p of ["a", "c"]) {
  for (const lang of ["he", "en", "ru", "ar"]) for (const vp of (sinForm ? [[375, 812], [1280, 800]] : [[375, 812], [1280, 800], [1366, 657], [1920, 945]])) if (toma(p, lang, ...vp)) casos.push([p, lang, vp]);
  if (!sinForm && toma(p, "he", 768, 1024)) casos.push([p, "he", [768, 1024]]);
}
for (const [p, lang, [w, h]] of casos) {
  const ctx = await contexto(b, { viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  if (sinForm) await conFixture(ctx, (fx) => { fx.features = { ...(fx.features || {}), showInquiry: false }; });
  const pg = await ctx.newPage(); const err = []; pg.on("pageerror", (e) => err.push(e.message.slice(0, 100)));
  await pg.addInitScript((l) => { try { localStorage.setItem("preferred_language", l); } catch {} }, lang);
  await pg.goto(url(p), { waitUntil: "load", timeout: 120000 }); await listo(pg, "#contact");
  await pg.evaluate(() => document.getElementById("contact")?.scrollIntoView({ behavior: "instant" })); await quieta(pg, "#contact");
  const m = []; const k = `${p}-${lang}-${w}x${h}`;
  const r = await pg.evaluate(() => {
    const raiz = document.querySelector(".ct6"); if (!raiz) return { proto: false };
    const sec = document.getElementById("contact");
    const mapa = raiz.querySelector(".ubi6-mapa"), fr = mapa?.querySelector("iframe");
    const filas = [...raiz.querySelectorAll(".ubi6-lista li")];
    // «09:00–20:00»: la primera hora a la IZQUIERDA de la segunda, también en RTL (D19)
    const orden = [...raiz.querySelectorAll(".ubi6-rango > *")].every((bd) => { const t = bd.firstChild, s = t.textContent; const r1 = document.createRange(); r1.setStart(t, 0); r1.setEnd(t, 2); const r2 = document.createRange(); r2.setStart(t, s.length - 2); r2.setEnd(t, s.length); return r1.getBoundingClientRect().left < r2.getBoundingClientRect().left; });
    const form = raiz.querySelector(".form6-card");
    const campos = form ? [...form.querySelectorAll("input, textarea")] : [];
    const etiquetas = campos.every((c) => { const l = form.querySelector(`label[for="${c.id}"]`); return l && l.textContent.trim(); });
    const letra = campos.every((c) => parseFloat(getComputedStyle(c).fontSize) >= 16);
    const vacio = form ? form.checkValidity() : null;
    if (form) { form.querySelector("[name=name]").value = "Prueba"; form.querySelector("[name=email]").value = "prueba@example.com"; form.querySelector("[name=message]").value = "Hola"; }
    const lleno = form ? form.checkValidity() : null; if (form) form.reset();
    const hc = raiz.querySelector(".ubi6-horas")?.getBoundingClientRect();
    // móvil y tableta: la superposición tiene que leerse a propósito (Liam: «parece sin querer»): mapa y tarjeta corridos a lados
    // opuestos, la tarjeta montada sobre al menos un cuarto del alto del mapa, y el centro del mapa (el pin) sin tapar
    const mp = mapa?.getBoundingClientRect(); let compo = null;
    if (mp && hc && innerWidth < 1024) { const rtl = document.documentElement.dir === "rtl"; const e = raiz.querySelector(".ubi6-escena").getBoundingClientRect(); /* contra la caja de la escena: en tableta el contenido es más angosto que la pantalla */
      const mapaInicio = rtl ? e.right - mp.right < 2 : mp.left - e.left < 2, horasFinal = rtl ? hc.left - e.left < 2 : e.right - hc.right < 2;
      const lados = rtl ? (mp.left > hc.left + 20 && mp.right > hc.right + 20) : (mp.left < hc.left - 20 && mp.right < hc.right - 20);
      compo = { lados: mapaInicio && horasFinal && lados, monta: (mp.bottom - hc.top) / mp.height, pin: hc.top > mp.top + mp.height / 2 + 12 }; }
    const textos = [...raiz.querySelectorAll(".ct6-foot h2, .ct6-foot > div > p, .ubi6-eyebrow, .ubi6-dir, .ubi6-dia, .form6-desc, .form6-campo label, .form6-enviar")].map((e) => e.textContent.trim());
    return { proto: true, v1Visible: [...sec.children].filter((e) => !e.classList.contains("ct6") && getComputedStyle(e).display !== "none").length,
      mapaHref: mapa?.getAttribute("href") || "", frSrc: fr?.src || "", frToque: fr ? getComputedStyle(fr).pointerEvents : "", mapaLabel: mapa?.getAttribute("aria-label") || "",
      filas: filas.length, hoy: filas.filter((x) => x.dataset.hoy).map((x) => filas.indexOf(x)), hoyDia: new Date().getDay(), cerrados: filas.filter((x) => x.dataset.cerrado).length, orden,
      compo, filasFuera: (() => { const card = raiz.querySelector(".ubi6-horas"); if (!card) return 0; const c = card.getBoundingClientRect(), pad = 12; return [...card.querySelectorAll(".ubi6-izq, .ubi6-rango")].filter((e) => { const q = e.getBoundingClientRect(); return q.left < c.left + pad || q.right > c.right - pad; }).length; })(), form: !!form, etiquetas, letra, vacio, lleno, horasDentro: hc ? hc.left >= -1 && hc.right <= innerWidth + 1 : null,
      overflowX: document.documentElement.scrollWidth > innerWidth, textos, lang: document.documentElement.lang };
  });
  if (!r.proto) m.push("no se pintó");
  else {
    if (r.v1Visible) m.push("v1 visible");
    if (!/google\.com\/maps\/search\/\?api=1&query=/.test(r.mapaHref)) m.push(`mapa: enlace ${r.mapaHref}`);
    if (!r.frSrc.includes(`hl=${lang}`) || !/output=embed/.test(r.frSrc)) m.push("mapa: iframe sin idioma o sin embed");
    if (r.frToque !== "none") m.push("el mapa atrapa el toque (scroll)"); if (!ESC[lang].test(r.mapaLabel)) m.push("mapa: aria-label en otro idioma");
    if (r.filas !== 7) m.push(`horarios: ${r.filas} filas`); if (r.hoy.length !== 1) m.push(`hoy: ${r.hoy.length}`); if (r.cerrados !== 1) m.push(`cerrados: ${r.cerrados}`);
    if (r.compo) { if (!r.compo.lados) m.push("móvil: mapa y horarios no están corridos a lados opuestos"); if (r.compo.monta < 0.25) m.push(`móvil: la tarjeta apenas monta sobre el mapa (${Math.round(r.compo.monta * 100)} %)`); if (!r.compo.pin) m.push("móvil: la tarjeta tapa el centro del mapa (el pin)"); }
    if (!r.orden) m.push("horas al revés (20:00–09:00)");
    if (r.filasFuera) m.push(`horarios: ${r.filasFuera} textos pegados al borde de la tarjeta o afuera`); if (r.horasDentro === false) m.push("la tarjeta de horarios sale de la pantalla");
    if (sinForm) { if (r.form) m.push("formulario visible con showInquiry apagado"); }
    else {
      if (!r.form) m.push("sin formulario"); else {
        if (!r.etiquetas) m.push("campo sin etiqueta"); if (!r.letra) m.push("letra < 16 px (iOS hace zoom)");
        if (r.vacio !== false) m.push("vacío pasa la validación"); if (r.lleno !== true) m.push("lleno no pasa la validación");
      }
    }
    if (r.overflowX) m.push("desborda");
    const otro = r.textos.filter((t) => t && !ESC[lang].test(t) && /[A-Za-z֐-ۿЀ-ӿ]/.test(t)); if (otro.length) m.push(`otro idioma: ${otro[0].slice(0, 30)}`);
  }
  const errs = err.filter((e) => !/WebSocket closed without opened/.test(e)); if (errs.length) m.push("errores JS " + errs.join(";"));
  if (m.length) { mal++; console.log(`${k}: ${m.join(" | ")}`); }
  await ctx.close();
}
await b.close();
console.log(`${casos.length} casos${sinForm ? " (formulario apagado)" : ""}, con problemas ${mal}`);
console.log("SIN MATERIAL", sinMaterial.size, [...sinMaterial].join(" "));
process.exit(mal ? 1 : 0);
