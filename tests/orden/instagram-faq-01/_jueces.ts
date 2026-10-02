// INSTAGRAM-FAQ-01 · los jueces de la aceptación (sesión A, 2026-10-02). Sólo en T. Puros: reciben lo que dejó cada instrumento de
// `./instrumentos/` y devuelven la lista de problemas (vacía = como en local). Los criterios son los del paquete de migración aprobado
// (diseno/INFORME.md §§ 6.7 y 6.8 con los cambios de Liam después del cierre, faq/FAQ-01.md §§ 3-bis y 5, instagram/INSTAGRAM-01.md
// §§ 6 y 7, y el prototipo: faq/prototipo/proto.{css,js} e instagram/prototipo/proto.{css,js}) y los números que A midió el 2026-10-02 en
// local y en T de hoy; están en la HOJA, afirmación por afirmación. Un mismo criterio para local y para T: estos jueces dan 0 sobre las
// salidas del prototipo local, salvo lo que la HOJA declara por encima de local (D20, el alt de una foto que no está en la galería y
// la cita de reseñas, que el prototipo de reseñas ya hace bien). `juezContraste` y `juezResumen` son copia de ../team-resenas-01/_jueces.ts.
type Fila = Record<string, any>;

/** faq.mjs (32 casos) e ig.mjs (36): «N casos, con problemas M» con M = 0; si no, las líneas de problemas que imprimió. */
export function juezResumen(salida: string, nombre: string, casos: number): string[] {
  const m = salida.match(/^(\d+) casos, con problemas (\d+)$/m);
  if (!m) return [`${nombre} no terminó: ${salida.slice(-400)}`];
  const out = salida.split(/\r?\n/).filter((l) => /^[ac]-\w\w-\d+x\d+(-reduce)?: /.test(l));
  if (Number(m[1]) !== casos) out.push(`${nombre}: ${m[1]} casos (${casos})`);
  if (Number(m[2]) !== out.filter((l) => !/ casos \(\d+\)$/.test(l)).length) out.push(`${nombre}: «con problemas ${m[2]}»`);
  return out;
}

/** contraste-sel: `esperadas` medidas, todas OK (≥ 4,5 en el peor píxel de las 3 posiciones), ninguna sin medir. */
export function juezContraste(salida: string, esperadas: number): { problemas: string[]; ok: number; peor: number } {
  const lineas = salida.split(/\r?\n/).filter((l) => /^[ac] \w\w \d+ «/.test(l));
  const ok = lineas.filter((l) => / OK$/.test(l)).length;
  const peor = Number(salida.match(/^PEOR ([\d.]+|Infinity)/m)?.[1] ?? NaN);
  const problemas = lineas.filter((l) => !/ OK$/.test(l));
  if (lineas.length !== esperadas) problemas.push(`${lineas.length} medidas (${esperadas})`);
  return { problemas, ok, peor };
}

// ── textos ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** F-1 (INFORME § 7): la acción del pie de faq, escrita por idioma como original (R24). */
export const F1: Record<string, string> = {
  he: "שאלה אחרת? בוואטסאפ",
  en: "Another question? WhatsApp us",
  ru: "Другой вопрос? Напишите в WhatsApp",
  ar: "سؤال آخر؟ راسلينا على واتساب",
};
/** D20 (INFORME § 8): «ver toda la galería» en árabe, en femenino (la web le habla a la clienta en femenino), sólo en peluquería. */
export const D20 = { peluqueria: "استكشفي المعرض الكامل", flota: "استكشف المعرض الكامل" };
const flecha = (lang: string) => (lang === "he" || lang === "ar" ? "↖" : "↗");
/** Texto comparable: el espacio duro del ruso (D18) cuenta como espacio. */
const plano = (s: unknown) => String(s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const px = (v: string | number) => (typeof v === "number" ? v : parseFloat(v));
const cerca = (a: string | number, b: string | number, tol = 1) => Math.abs(px(a) - px(b)) <= tol;

// ── faq ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** faq (INFORME § 6.7; FAQ-01 §§ 3-bis y 5), una fila de estilos.json. */
export function juezFaq(f: Fila): string[] {
  const m: string[] = [];
  const [p, lang] = f.k.split("-");
  const q = f.faq;
  if (!q?.existe) return [`${f.k}: no hay faq «fichas sobre la mesa» (#faq .faq6)`];
  if (q.dinamica !== (p === "a" ? "v6" : "v7") || q.dinamica !== q.galeria) m.push(`dinámica ${q.dinamica} (galería ${q.galeria})`);
  const s = q.superficie;
  if (!s.seccion || s.antes !== "none" || s.despues !== "none") m.push(`la sección arranca y termina en --surface sin ::before/::after (${JSON.stringify(s)})`);
  if (!cerca(s.arriba, s.esperado[0]) || !cerca(s.abajo, s.esperado[1])) m.push(`relleno ${s.arriba} / ${s.abajo} (--gal-fade × 0,6 = ${s.esperado[0]}; --gal-fade + 0,5 rem = ${s.esperado[1]})`);
  if (!s.pared || s.pared.pos !== "absolute" || !s.pared.fondo || !s.pared.img || !s.pared.mascara) m.push(`textura en capa propia (--surface-alt + la textura) con máscara (${JSON.stringify(s.pared)})`);
  if (!q.etiqueta) m.push("la sección sin aria-labelledby a su h2");
  if (q.columnas !== 1) m.push(`móvil: ${q.columnas} columnas (1)`);
  if (!q.datos || q.fichas.length !== q.datos) m.push(`${q.fichas.length} fichas (${q.datos} preguntas en los datos)`);
  for (const [i, x] of q.fichas.entries()) {
    const n = `ficha ${i + 1}`;
    if (plano(x.pregunta) !== plano(x.esperada)) m.push(`${n}: pregunta «${x.pregunta}» (esperada «${x.esperada}»)`);
    if (x.h3 !== "H3" || JSON.stringify(x.aria) !== JSON.stringify(["false", true, "region", true])) m.push(`${n}: un <button aria-expanded="false" aria-controls> dentro de un h3, con su región (${x.h3} ${JSON.stringify(x.aria)})`);
    if (JSON.stringify(x.letra) !== JSON.stringify(["16px", "500"])) m.push(`${n}: la pregunta en 16 px / 500 (${x.letra})`);
    if (!x.signo) m.push(`${n}: sin el signo + (aria-hidden)`);
    if (!x.fondo || x.radio !== q.radioUi || !x.sombra) m.push(`${n}: --card, --radius-ui (${q.radioUi}) y relieve (${x.fondo} ${x.radio} ${x.sombra})`);
    if (q.oscuro && x.borde !== `1px solid ${q.acento}`) m.push(`${n}: borde --accent-strong en oscuro (${x.borde})`);
    if (JSON.stringify(x.toque) !== JSON.stringify(["none", "auto"])) m.push(`${n}: el <li> no recibe el toque y la ficha sí (${x.toque})`);
    if (!x.cerrada || x.cerrada.visibilidad !== "hidden" || x.cerrada.filas !== "0px" || !/matrix3d/.test(x.cerrada.hoja ?? "")) m.push(`${n}: cerrada, fuera del lector, sin alto y con la hoja doblada (${JSON.stringify(x.cerrada)})`);
    if (!x.rangos || x.rangos.bdi !== x.rangos.texto) m.push(`${n}: cada rango «45–60» en <bdi dir="ltr"> sin partirse (${JSON.stringify(x.rangos)})`);
  }
  if (!f.mesa || !(f.mesa.lejos < 0.95) || !(f.mesa.centro > 0.995)) m.push(`la mesa: lejos del centro las fichas de arriba más chicas que las de abajo, en el centro iguales (ancho de la primera ÷ la última ${JSON.stringify(f.mesa)}; local 0,93 / 1)`);
  const a = f.abrir;
  if (!a) m.push("abrir: menos de dos preguntas");
  else {
    const n = a.una.z.length;
    if (a.una.aria !== ["true", ...Array(n - 1).fill("false")].join(",")) m.push(`abrir la primera: sólo ella abierta (${a.una.aria})`);
    if (a.una.z[0] !== 16 || a.una.z.slice(1).some((z: number) => z !== -10)) m.push(`la abierta se acerca 16 px y las demás se alejan 10 (${a.una.z})`);
    if (a.una.visible !== "visible" || !/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(a.una.hoja)) m.push(`abierta, la respuesta visible y la hoja derecha (${a.una.visible} ${a.una.hoja})`);
    if (a.otra !== ["false", "true", ...Array(n - 2).fill("false")].join(",")) m.push(`abrir otra cierra la anterior (${a.otra})`);
  }
  const pie = q.pie;
  if (!pie) m.push("sin pie");
  else {
    if (!pie.abajo) m.push("el pie no está debajo de las fichas");
    if (plano(pie.h2[0]) !== plano(pie.titulo) || pie.h2[1] !== "16px" || pie.h2[2] !== "500") m.push(`h2 ${JSON.stringify(pie.h2)} (sections.faq.title, 16 px, 500)`);
    if (!pie.kicker || plano(pie.kicker[0]) !== plano(pie.subtitulo) || pie.kicker[1] !== "12px" || !pie.kicker[2]) m.push(`kicker ${JSON.stringify(pie.kicker)} (sections.faq.subtitle, 12 px, --text)`);
    const ac = pie.accion, esperado = `${F1[lang]} ${flecha(lang)}`;
    if (!pie.numero || !ac || plano(ac.txt) !== plano(esperado) || ac.href !== `https://wa.me/${pie.numero}` || ac.target !== "_blank" || ac.alto < 44 || JSON.stringify(ac.letra) !== JSON.stringify(["15px", "500"])) m.push(`la acción F-1 «${esperado}» a wa.me/<teléfono>, 15/500, ≥ 44 px (${JSON.stringify(ac)}, número «${pie.numero}»)`);
    if (pie.sombras.some((n: number) => n < 1)) m.push(`halo (text-shadow) en h2, kicker y acción (${pie.sombras})`);
    if (q.oscuro && pie.radial !== true) m.push("fondo radial del pie en oscuro");
  }
  const e = f.faqEscritorio;
  if (e) {
    if (e.columnas !== 2) m.push(`escritorio: ${e.columnas} columnas (2)`);
    if (JSON.stringify(e.margen) !== JSON.stringify(p === "a" ? ["0px", "40px"] : ["0px", "0px"])) m.push(`escritorio: ${p === "a" ? "la segunda columna desfasada 2,5 rem" : "las dos columnas alineadas"} (${e.margen})`);
    if (e.letra.some((l: string[]) => JSON.stringify(l) !== JSON.stringify(["17px", "500"]))) m.push(`escritorio: la pregunta en 17 px / 500 (${JSON.stringify(e.letra[0])})`);
    // local: A 14,2–15,6 px; C 0 en he, en y ar y −1,9 en ru (sólo la mesa, que se endereza: las columnas de C no se mueven)
    if (f.faqSentidos == null || (p === "a" ? !(Math.abs(f.faqSentidos) >= 10) : Math.abs(f.faqSentidos) > 3)) m.push(`escritorio: ${p === "a" ? "las dos columnas se mueven en sentidos opuestos con el scroll" : "las columnas quietas"} (al bajar 200 px la distancia entre las dos cambia ${f.faqSentidos} px; local A 14,2–15,6, C 0 a −1,9)`);
  } else if ("faqEscritorio" in f) m.push("sin medida de escritorio");
  if (f.quietoFaq?.length) m.push(`reduced-motion: se mueve (${f.quietoFaq.slice(0, 2)})`);
  if ("sinTelefono" in f && (!f.sinTelefono || f.sinTelefono.accion !== 0)) m.push(`sin teléfono, ninguna acción en el pie (${JSON.stringify(f.sinTelefono)})`);
  // D18, más que local: el prototipo reemplaza sin solaparse y deja «3–5 ч в зависимости» (la «в» después de otra palabra de una letra)
  // en la respuesta de tiempos de A en ruso; T no deja ninguna (HOJA, D-191).
  if (f.rusoSueltas?.length) m.push(`ruso: palabra de una letra con espacio común (${f.rusoSueltas.slice(0, 2).join(" / ")})`);
  return m.map((x) => `${f.k}: faq ${x}`);
}

// ── instagram ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** El giro de A por foto (prototipo: DESPAREJO, «como tiradas con la mano»); C es simétrico. */
const DESPAREJO = [-2.5, 1.5, -1, 2, -1.5, 2.5];
/** El giro esperado de cada foto: (i − 2,5) × (1° + (paso − 1°) × abierto) + desparejo × abierto (prototipo, `.proto-ig-foto`). */
const giros = (p: string, paso: number, abierto: number) => Array.from({ length: 6 }, (_, i) => (i - 2.5) * (1 + (paso - 1) * abierto) + (p === "a" ? DESPAREJO[i] * abierto : 0));
const igualesGiros = (a: number[] | undefined, b: number[]) => !!a && a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= 0.06);

/** instagram (INFORME § 6.8; INSTAGRAM-01 §§ 6 y 7), una fila de estilos.json. */
export function juezIg(f: Fila): string[] {
  const m: string[] = [];
  const [p] = f.k.split("-");
  const g = f.ig;
  if (!g?.existe) return [`${f.k}: no hay instagram «abanico de polaroids» (#instagram .ig6; hoy: ${g?.seccion ?? "ninguna sección con id instagram"})`];
  if (g.seccion !== "SECTION" || !g.etiqueta) m.push("la sección con su h2 (aria-labelledby)");
  if (g.dinamica !== (p === "a" ? "v6" : "v7") || g.dinamica !== g.galeria) m.push(`dinámica ${g.dinamica} (galería ${g.galeria})`);
  if (!/testimonials>instagram>faq/.test(g.orden)) m.push(`orden ${g.orden} (testimonials › instagram › faq)`);
  const fo = g.fondo;
  if (fo.color !== fo.velo || fo.imagen !== "none" || JSON.stringify(fo.relleno) !== JSON.stringify(["0px", "0px"])) m.push(`fondo ${fo.color} / ${fo.imagen} / ${fo.relleno} (el velo de team ${fo.velo}, sin relleno)`);
  if (fo.antes.top !== "0px" || fo.antes.alto !== "128px" || !/^linear-gradient\(rgb/.test(fo.antes.img)) m.push(`rampa de arriba ${JSON.stringify(fo.antes)} (top 0, 128 px como en local, --surface → transparente)`);
  if (fo.despues.bottom !== "0px" || !cerca(fo.despues.alto, fo.rampa * 0.5) || !/^linear-gradient\(to top, rgb/.test(fo.despues.img)) m.push(`rampa de abajo ${JSON.stringify(fo.despues)} (bottom 0, la mitad de la rampa, hacia --surface)`);
  if (!g.abanico || g.abanico.alto !== 359 || g.abanico.toque !== "pan-y") m.push(`móvil: el abanico mide foto + pie + caída + 40 = 359 px y se desliza con el dedo (touch-action pan-y) (${JSON.stringify(g.abanico)})`);
  if (g.fotos.length !== 6) m.push(`${g.fotos.length} fotos (6)`);
  for (const [i, x] of g.fotos.entries()) {
    const n = `foto ${i + 1}`;
    if (!x.boton || x.presionado !== "false") m.push(`${n}: un <button aria-pressed="false">`);
    if (!x.etiqueta || plano(x.etiqueta) !== plano(x.esperada)) m.push(`${n}: el nombre accesible «${x.etiqueta}» (el alt de la pieza de galería con la misma foto: «${x.esperada}»)`);
    if (x.alt !== "" || x.arrastrable !== false) m.push(`${n}: la imagen con alt vacío (lo nombra el botón) y draggable=false (${x.alt} ${x.arrastrable})`);
    if (x.ancho !== 210) m.push(`${n}: ${x.ancho} px a 375 (clamp(200px, 56vw, 300px) = 210)`);
    const mc = x.marco;
    if (!mc || !mc.fondo || mc.radio !== g.radioUi || !mc.sombra || JSON.stringify(mc.relleno) !== JSON.stringify(["7px", "26px"])) m.push(`${n}: marco de polaroid en --card, --radius-ui, relieve y pie más alto (7/26 px) (${JSON.stringify(mc)})`);
    if (g.oscuro && mc?.borde !== `1px solid ${g.acento}`) m.push(`${n}: borde --accent-strong en oscuro (${mc?.borde})`);
  }
  if (JSON.stringify(g.fotos.map((x: Fila) => x.src)) !== JSON.stringify(g.galeriaSrc)) m.push("las fotos no son las 6 de la galería, en su orden (provisorias, como en local)");
  if (!igualesGiros(f.abanico?.cerrado, giros(p, 9, 0)) || !igualesGiros(f.abanico?.abierto, giros(p, 9, 1))) m.push(`el abanico: apilado al entrar (1° entre fotos) y abierto en el centro (9°${p === "a" ? " y desparejo" : ""}) (${JSON.stringify(f.abanico)})`);
  const pie = g.pie;
  if (!pie) m.push("sin pie");
  else {
    if (plano(pie.h2[0]) !== plano(pie.titulo) || pie.h2[1] !== "16px" || pie.h2[2] !== "500") m.push(`h2 ${JSON.stringify(pie.h2)} (sections.instagram.title, 16 px, 500)`);
    if (pie.kicker) m.push(`sin cuenta, sin «@cuenta» (${pie.kicker})`);
    if (!pie.accion || pie.accion.href !== "/galeria" || !pie.verTodo || plano(pie.accion.txt) !== plano(pie.verTodo) || pie.accion.alto < 44) m.push(`sin cuenta, la acción a /galeria con el texto de «ver toda la galería» «${pie.verTodo}», ≥ 44 px (${JSON.stringify(pie.accion)})`);
    if (pie.sombras.some((n: number) => n < 1)) m.push(`halo (text-shadow) en h2 y acción (${pie.sombras})`);
    if (g.oscuro && pie.radial !== true) m.push("fondo radial del pie en oscuro");
  }
  const e = f.igEscritorio;
  if (e) {
    if (e.anchos.some((w: number) => w !== 300) || e.relleno.some((r: string[]) => JSON.stringify(r) !== JSON.stringify(["10px", "36px"])) || e.alto !== 516 || e.toque !== "auto") m.push(`escritorio: fotos de 300 px, pie del marco 46 px (10/36), el abanico de 516 px y sin arrastre (${JSON.stringify(e)})`);
    if (!igualesGiros(f.abanicoEscritorio?.cerrado, giros(p, 9.5, 0)) || !igualesGiros(f.abanicoEscritorio?.abierto, giros(p, 9.5, 1))) m.push(`escritorio: apilado al entrar y abierto en el centro con 9,5° (${JSON.stringify(f.abanicoEscritorio)})`);
  } else if ("igEscritorio" in f) m.push("sin medida de escritorio");
  if ("abanicoQuieto" in f && (!igualesGiros(f.abanicoQuieto?.cerrado, giros(p, 9.5, 1)) || !igualesGiros(f.abanicoQuieto?.abierto, giros(p, 9.5, 1)))) m.push(`reduced-motion: abierto y quieto desde el principio (${JSON.stringify(f.abanicoQuieto)})`);
  if ("quietoIg" in f && !f.quietoIg) m.push("reduced-motion: no hay abanico");
  if ("conCuenta" in f) {
    const c = f.conCuenta;
    if (!c || !c.kicker || c.kicker[0] !== "@prueba.salon" || !c.accion || plano(c.accion.txt) !== "Instagram" || c.accion.href !== "https://www.instagram.com/prueba.salon/" || c.accion.target !== "_blank") m.push(`con cuenta: «@cuenta» y la acción «Instagram» a su url en otra pestaña (${JSON.stringify(c && { kicker: c.kicker, accion: c.accion })})`);
  }
  if ("fueraDeGaleria" in f) {
    const x = f.fueraDeGaleria;
    if (!x || plano(x[0]?.esperada) !== plano(`${g.pie?.titulo} · 1`) || plano(x[0]?.etiqueta) !== plano(x[0]?.esperada) || plano(x[1]?.etiqueta) !== plano(x[1]?.esperada)) m.push(`una foto que no está en la galería se nombra «título · n» y las demás con el alt de su pieza (${JSON.stringify(x)})`);
  }
  if ("ordenClienta" in f && !/testimonials>faq>instagram/.test(f.ordenClienta ?? "")) m.push(`con el sectionOrder de la clienta (faq antes que instagram), el de ella (${f.ordenClienta})`);
  return m.map((x) => `${f.k}: instagram ${x}`);
}

/** D20: en árabe, en peluquería, «ver toda la galería» y la acción de instagram sin cuenta en femenino. */
export function juezD20(f: Fila): string[] {
  if (!f.k.endsWith("-ar")) return [];
  const d = f.d20;
  const out: string[] = [];
  if (d?.galeria !== D20.peluqueria) out.push(`${f.k}: «ver toda la galería» dice «${d?.galeria}» (D20: «${D20.peluqueria}»)`);
  if (d?.instagram !== D20.peluqueria) out.push(`${f.k}: la acción de instagram sin cuenta dice «${d?.instagram}» (D20: «${D20.peluqueria}»)`);
  return out;
}

/** Los pesos de Frank Ruhl Libre visibles en #faq y en la sección de instagram (pendiente c de ARREGLOS-02, sólo estas dos): 300 y 500. */
export function juezPesos(f: Fila): string[] {
  const out: string[] = [];
  for (const id of ["faq", "instagram"]) {
    if (!f.pesos?.[id]) { out.push(`${f.k}: sin medida de pesos en ${id}`); continue; }
    for (const w of f.pesos[id]) if (!/^(300|500) /.test(w)) out.push(`${f.k}: ${id} usa Frank Ruhl Libre en ${w}`);
  }
  return out;
}

// ── la cita de reseñas v6 ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Los tamaños de la cita que fija el paquete de reseñas (diseno/resenas/prototipo/proto.css): por largo, en móvil y en escritorio. */
export const TAMANO = { movil: { corto: 22, medio: 19, largo: 15.5 }, escritorio: { corto: 32, medio: 23, largo: 17 } } as const;
/** cita.mjs: con los datos de los fixtures, cada cita en el tamaño de su largo y sin desbordar; con una palabra que no entra, la letra de
 *  esa cita baja hasta que entra (nunca de 15) también cuando las fuentes terminan de cargar después de montar. */
export function juezCita(c: Fila): string[] {
  const out: string[] = [];
  for (const t of c.tamanos ?? []) {
    const w = Number(t.k.match(/-(\d+)x/)[1]), vista = w < 1024 ? "movil" : "escritorio";
    if (!t.piezas?.length) { out.push(`${t.k}: no hay citas de reseñas v6`); continue; }
    for (const [i, x] of t.piezas.entries()) {
      const base = (TAMANO[vista] as Record<string, number>)[x.largo];
      if (x.letra !== base || x.desborda) out.push(`${t.k}: cita ${i + 1} (${x.largo}) en ${x.letra} px${x.desborda ? " desbordando" : ""} (el paquete: ${base} px en ${vista})`);
    }
  }
  if ((c.tamanos ?? []).length !== 4) out.push(`${(c.tamanos ?? []).length} páginas de tamaños (4)`);
  for (const k of c.caso ?? []) {
    const w = Number(k.k.match(/-(\d+)x/)[1]), base = TAMANO[w < 1024 ? "movil" : "escritorio"].corto;
    const x = k.lista;
    if (!x) { out.push(`${k.k}: no está la cita con la palabra que no entra`); continue; }
    if (x.desborda || x.letra < 15 || x.letra >= base) out.push(`${k.k}: con «Superextraordinariamentebueno מעולה», ya cargadas las fuentes, la cita mide ${x.letra} px y ${x.desborda ? `desborda (scroll ${x.scroll} > client ${x.client})` : "entra"} (tiene que bajar de ${base} hasta entrar, nunca de 15; local 15 px sin desbordar)`);
  }
  if ((c.caso ?? []).length !== 2) out.push(`${(c.caso ?? []).length} casos de la palabra larga (2)`);
  return out;
}
