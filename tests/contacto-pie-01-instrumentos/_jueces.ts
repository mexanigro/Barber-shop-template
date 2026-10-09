// Copia editable de tests/orden/contacto-pie-01/_jueces.ts (congelado). Cambios: los tres textos aprobados que Liam mandó cambiar el 2026-10-09
// (aria de las estrellas por idioma, F-1 árabe neutro, coma árabe en la dirección). Lo demás, byte a byte.
// CONTACTO-PIE-01 · los jueces de la aceptación (sesión A, 2026-10-03). Sólo en T. Puros: reciben lo que dejó cada instrumento de
// `./instrumentos/` y devuelven la lista de problemas (vacía = como en local). Los criterios son los del paquete de migración aprobado
// (diseno/INFORME.md §§ 6.9 y 6.10, contacto/CONTACTO-01.md §§ 2 a 4, pie/PIE-01.md §§ 1 a 3, y los prototipos
// contacto/prototipo/proto.{css,js} y pie/prototipo/proto.{css,js}) y los números que A midió el 2026-10-03 en local y en T de hoy; están
// en la HOJA, afirmación por afirmación. Un mismo criterio para local y para T: estos jueces dan 0 sobre las salidas del prototipo local.
// `juezContraste` y `juezResumen` son copia de ../instagram-faq-01/_jueces.ts; `juezCita` y `TAMANO`, de la misma, con la parte de
// «transiciones lentas» (E1) agregada.
type Fila = Record<string, any>;

/** ct.mjs (34 casos; 16 sin formulario) y pie.mjs (34): «N casos…, con problemas M» con M = 0; si no, las líneas de problemas. */
export function juezResumen(salida: string, nombre: string, casos: number): string[] {
  const m = salida.match(/^(\d+) casos(?: \(formulario apagado\))?, con problemas (\d+)$/m);
  if (!m) return [`${nombre} no terminó: ${salida.slice(-400)}`];
  const out = salida.split(/\r?\n/).filter((l) => /^[ac]-\w\w-\d+x\d+: /.test(l));
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

const plano = (s: unknown) => String(s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const px = (v: string | number) => (typeof v === "number" ? v : parseFloat(v));
const cerca = (a: string | number, b: string | number, tol = 1) => Math.abs(px(a) - px(b)) <= tol;
const flecha = (lang: string) => (lang === "he" || lang === "ar" ? "↖" : "↗");

/** El pie de un bloque (h2 16/500, kicker 12 px, la acción 15/500 de 44 px, halo y en oscuro fondo radial). */
function juezPieBloque(n: string, pie: Fila | null, oscuro: boolean, accion: { txt: string; href: RegExp } | null): string[] {
  const m: string[] = [];
  if (!pie) return [`${n}: sin pie`];
  if (plano(pie.h2[0]) !== plano(pie.h2esp) || pie.h2[1] !== "16px" || pie.h2[2] !== "500" || !pie.h2[3]) m.push(`${n}: h2 ${JSON.stringify(pie.h2)} («${pie.h2esp}», 16 px, 500, --text)`);
  if (!pie.kicker || plano(pie.kicker[0]) !== plano(pie.kesp) || pie.kicker[1] !== "12px" || !pie.kicker[2]) m.push(`${n}: kicker ${JSON.stringify(pie.kicker)} («${pie.kesp}», 12 px, --text)`);
  if (accion) {
    const a = pie.accion;
    if (!a || plano(a.txt) !== plano(accion.txt.replace(/[↖↗]/g, "")) || !accion.href.test(a.href ?? "") || a.target !== "_blank" || a.alto < 44 || JSON.stringify(a.letra) !== JSON.stringify(["15px", "500"])) m.push(`${n}: la acción «${accion.txt}» (${accion.href.source}), 15/500, ≥ 44 px, en otra pestaña (${JSON.stringify(a)})`);
  } else if (pie.accion) m.push(`${n}: una acción que no va (${JSON.stringify(pie.accion)})`);
  if (pie.sombras.some((x: number) => x < 1)) m.push(`${n}: halo (text-shadow) en h2, kicker y acción (${pie.sombras})`);
  if (oscuro && pie.radial !== true) m.push(`${n}: fondo radial del pie en oscuro`);
  return m;
}

// ── contacto ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** contacto (INFORME § 6.9; CONTACTO-01 §§ 2 y 4), una fila de estilos.json. */
export function juezContacto(f: Fila): string[] {
  const m: string[] = [];
  const [p, lang] = f.k.split("-");
  const c = f.ct;
  if (!c?.existe) return [`${f.k}: no hay contacto «ubicación y horarios» + «contacto» (#contact .ct6)`];
  const ok = c.oscuro;
  if (c.dinamica !== (p === "a" ? "v6" : "v7") || c.dinamica !== c.galeria) m.push(`dinámica ${c.dinamica} (galería ${c.galeria})`);
  if (c.ubi?.tag !== "SECTION" || !c.ubi.etiqueta) m.push(`ubicación y horarios: un <section> con su h2 (aria-labelledby) (${JSON.stringify(c.ubi)})`);
  if (c.formEncendido && (c.form?.tag !== "SECTION" || !c.form.etiqueta)) m.push(`contacto: un <section> con su h2 (aria-labelledby) (${JSON.stringify(c.form)})`);
  const s = c.superficie;
  if (s.color !== s.velo || s.imagen !== "none") m.push(`fondo ${s.color} / ${s.imagen} (el velo de contacto ${s.velo})`);
  if (!cerca(s.relleno[0], s.rellenoEsp[0]) || !cerca(s.relleno[1], s.rellenoEsp[1])) m.push(`relleno ${s.relleno} (${s.rellenoEsp}: 1,5 rem arriba; media rampa + 2 rem abajo)`);
  if (s.antes.top !== "0px" || s.antes.alto !== "128px" || s.antes.z !== "0" || !/^linear-gradient\(rgb/.test(s.antes.img)) m.push(`rampa de entrada ${JSON.stringify(s.antes)} (top 0, 128 px como en local —como instagram, D-197—, z-index 0, desde --surface)`);
  if (s.despues.bottom !== "0px" || !cerca(s.despues.alto, s.rampa * 0.5) || s.despues.z !== "0" || !/^linear-gradient\(to top, rgb/.test(s.despues.img)) m.push(`rampa de salida ${JSON.stringify(s.despues)} (bottom 0, la mitad, z-index 0, hacia --surface)`);
  const mp = c.mapa;
  if (!mp) m.push("sin mapa");
  else {
    if (mp.tag !== "A" || mp.href !== mp.esperado || mp.target !== "_blank" || mp.controles !== 0) m.push(`el mapa: una tarjeta que es UN enlace a Google Maps con la dirección (${mp.tag} ${mp.href} ${mp.target}; ${mp.controles} controles adentro)`);
    if (plano(mp.etiqueta) !== plano(mp.etiquetaEsp)) m.push(`el mapa: aria-label «${mp.etiqueta}» («${mp.etiquetaEsp}»)`);
    if (mp.radio !== c.radioUi || !mp.sombra) m.push(`el mapa: --radius-ui y relieve (${mp.radio} ${mp.sombra})`);
    if (ok && mp.borde !== `1px solid ${c.acento}`) m.push(`el mapa: borde --accent-strong en oscuro (${mp.borde})`);
    const fr = mp.iframe;
    if (!fr || fr.toque !== "none" || fr.tab !== "-1" || fr.oculto !== "true" || !/grayscale\(1\)/.test(fr.filtro) || (ok && !/invert/.test(fr.filtro))) m.push(`el iframe: sin toque, fuera del foco y del lector, en gris${ok ? " e invertido" : ""} (${JSON.stringify(fr)})`);
    const t = mp.tinte;
    if (!t || t.mezcla !== "color" || !t.fondo || t.opacidad !== (ok ? "0.45" : "0.35")) m.push(`el tinte del acento (mix-blend-mode color, ${ok ? 0.45 : 0.35}) (${JSON.stringify(t)})`);
  }
  if ("mapaDiferido" in f) {
    const d = f.mapaDiferido;
    if (!d || d.arriba || d.lejos || !/output=embed/.test(d.cerca ?? "")) m.push(`el mapa se pide recién a una pantalla de distancia (src arriba «${d?.arriba}», a dos pantallas «${d?.lejos}», cerca «${d?.cerca?.slice(0, 40)}»)`);
  }
  const h = c.horas;
  if (!h) m.push("sin tarjeta de horarios");
  else {
    if (!h.fondo || h.radio !== c.radioUi || !h.sombra) m.push(`horarios: --card, --radius-ui y relieve (${h.fondo} ${h.radio} ${h.sombra})`);
    if (ok && h.borde !== `1px solid ${c.acento}`) m.push(`horarios: borde --accent-strong en oscuro (${h.borde})`);
    if (!h.eyebrow || plano(h.eyebrow[0]) !== plano(h.eyebrowEsp) || h.eyebrow[1] !== "12px" || h.eyebrow[2] !== "500") m.push(`horarios: «${h.eyebrowEsp}» 12/500 (${JSON.stringify(h.eyebrow)})`);
    if (plano(h.dir) !== plano(h.dirEsp)) m.push(`horarios: la dirección «${h.dir}» («${h.dirEsp}»)`);
    if (h.letraFila !== "14px") m.push(`horarios: filas de 14 px (${h.letraFila})`);
    if (!h.hoy || !h.hoy.fondo || !h.hoy.tinta || h.hoy.radio !== "999px" || h.hoy.letra !== "11px" || plano(h.hoy.txt) !== plano(h.hoy.esp) || h.hoy.dentroDelDia) m.push(`horarios: «hoy» en una pastilla de --accent-strong al lado del día (${JSON.stringify(h.hoy)})`);
    if (h.cerrado !== true) m.push("horarios: el día cerrado en --text-muted");
    if (h.rangos.length !== 6 || h.rangos.some(([d, w]: string[]) => d !== "ltr" || w !== "nowrap")) m.push(`horarios: cada rango en <bdi dir="ltr"> sin partirse (${JSON.stringify(h.rangos)})`);
  }
  const e = c.escena;
  if (e && !(cerca(e.mapa / e.ancho, 0.88, 0.01) && cerca(e.horas, Math.min(e.ancho * 0.84, 416), 1.5))) m.push(`móvil: el mapa al 88 % y la tarjeta al 84 % (tope 26 rem) de la escena (${JSON.stringify(e)})`);
  const fo = c.formulario;
  if (c.formEncendido) {
    if (!fo) m.push("sin formulario");
    else {
      if (fo.margen !== "64px") m.push(`formulario: 64 px arriba (${fo.margen})`);
      if (!fo.fondo || fo.radio !== c.radioUi || !fo.sombra) m.push(`formulario: --card, --radius-ui y relieve (${fo.fondo} ${fo.radio} ${fo.sombra})`);
      if (ok && fo.borde !== `1px solid ${c.acento}`) m.push(`formulario: borde --accent-strong en oscuro (${fo.borde})`);
      if (fo.columnas !== 1) m.push(`móvil: el formulario en una columna (${fo.columnas})`);
      if (fo.descEsp && (!fo.desc || plano(fo.desc[0]) !== plano(fo.descEsp) || fo.desc[1] !== "15px" || !fo.desc[2] || fo.desc[3] < 1)) m.push(`formulario: la descripción (sections.contact.description) de 15 px en --text con halo (${JSON.stringify(fo.desc)})`);
      if (fo.labels.length !== 4 || fo.labels.some((l: any[]) => l[0] !== "13px" || l[1] !== "500" || !l[2])) m.push(`formulario: 4 etiquetas de 13/500 en --text (${JSON.stringify(fo.labels)})`);
      const esp = [["INPUT", "name", "16px", true, "name"], ["INPUT", "email", "16px", true, "email"], ["INPUT", "subject", "16px", false, null], ["TEXTAREA", "message", "16px", true, null]];
      if (JSON.stringify(fo.campos) !== JSON.stringify(esp)) m.push(`formulario: nombre, email, asunto y mensaje, 16 px, required y autocomplete (${JSON.stringify(fo.campos)})`);
      const en = fo.enviar;
      if (!en || en.tipo !== "submit" || en.fondo !== "rgba(0, 0, 0, 0)" || en.tinta !== en.tintaEsp || !en.contorno || en.alto < 46 || JSON.stringify(en.letra) !== JSON.stringify(["15px", "500"])) m.push(`formulario: enviar en contorno de acento (${ok ? "texto en --highlight" : "texto en --accent-strong"}), 15/500, 46 px (${JSON.stringify(en)})`);
      if (JSON.stringify(fo.estado) !== JSON.stringify(["status", "polite"])) m.push(`formulario: el estado en role=status (${fo.estado})`);
    }
  } else if (fo) m.push("formulario con showInquiry apagado");
  m.push(...juezPieBloque("pie de ubicación", c.pieUbi, ok, { txt: `${c.mapsTxt} ${flecha(lang)}`, href: /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/ }));
  if (c.formEncendido) m.push(...juezPieBloque("pie de contacto", c.pieForm, ok, c.numero ? { txt: `WhatsApp ${flecha(lang)}`, href: new RegExp(`^https://wa\\.me/${c.numero}$`) } : null));
  const d = f.ctEscritorio;
  if (d) {
    const es = d.escena;
    if (!es || !cerca(es.altoMapa, d.altoMapaEsp) || !cerca(es.horas, d.anchoHorasEsp) || es.columnas.split(" ").length !== 2) m.push(`escritorio: el mapa de min(62vh, 30rem) y la tarjeta de 20 rem al costado (${JSON.stringify(es)}; ${d.altoMapaEsp} / ${d.anchoHorasEsp})`);
    if (d.columnasForm != null && d.columnasForm !== 2) m.push(`escritorio: el formulario en dos columnas (${d.columnasForm})`);
    if (d.margenForm != null && d.margenForm !== "80px") m.push(`escritorio: 80 px arriba del formulario (${d.margenForm})`);
    if (d.letraFila !== "15px") m.push(`escritorio: filas de horarios de 15 px (${d.letraFila})`);
    if (d.desc != null && d.desc !== "17px") m.push(`escritorio: la descripción de 17 px (${d.desc})`);
    if (f.ctSentidos == null || (p === "a" ? !(Math.abs(f.ctSentidos) >= 5) : Math.abs(f.ctSentidos) > 0.5)) m.push(`escritorio: ${p === "a" ? "el mapa y la tarjeta en sentidos opuestos con el scroll" : "mapa y tarjeta quietos"} (al bajar 200 px la distancia entre los dos cambia ${f.ctSentidos} px)`);
  } else if ("ctEscritorio" in f) m.push("sin medida de escritorio");
  if ("quietoCt" in f && (f.quietoCt == null || Math.abs(f.quietoCt) > 0.5)) m.push(`reduced-motion: el mapa y la tarjeta se mueven (${f.quietoCt})`);
  if ("sinTelefono" in f && (!f.sinTelefono || f.sinTelefono.accion !== 0)) m.push(`sin teléfono, ninguna acción de WhatsApp en el pie de contacto (${JSON.stringify(f.sinTelefono)})`);
  if (f.rusoSueltas?.length) m.push(`ruso: palabra de una letra con espacio común (${f.rusoSueltas.slice(0, 2).join(" / ")})`);
  return m.map((x) => `${f.k}: contacto ${x}`);
}

// ── pie ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** el cierre y el pie (INFORME § 6.10; PIE-01 § 1), una fila de estilos.json. */
export function juezPie(f: Fila): string[] {
  const m: string[] = [];
  const [p] = f.k.split("-");
  const e = f.pie;
  if (!e?.existe) return [`${f.k}: no hay el cierre y el pie de peluquería (footer .pie6)`];
  const ok = e.oscuro;
  const s = e.superficie;
  if (!s.fondo || s.imagen !== "none" || s.antes !== "none" || s.despues !== "none") m.push(`el footer en --surface, sin ::before/::after (${JSON.stringify({ ...s, pared: undefined })})`);
  if (!s.pared || s.pared.pos !== "absolute" || !s.pared.fondo || !s.pared.img || !s.pared.mascara) m.push(`la pared de textura en capa propia (--surface-alt + la textura) con máscara (${JSON.stringify(s.pared)})`);
  const c = e.cierre;
  if (!e.reservas) { if (c) m.push("el cierre sin reservas"); }
  else if (!c) m.push("sin cierre");
  else {
    if (!c.etiqueta) m.push("el cierre: un <section> con su h2 (aria-labelledby)");
    if (!cerca(c.relleno, c.rellenoEsp)) m.push(`el cierre: ${c.relleno} arriba (--gal-fade × 0,6 = ${c.rellenoEsp})`);
    if (!cerca(c.proporcion, 0.8, 0.01) || c.alto > 544.5) m.push(`móvil: el cierre 4:5, tope 34 rem (${c.proporcion}, ${c.alto} px)`);
    if (c.radio !== "8px" && c.radio !== f.ct?.radioUi) m.push(`el cierre: --radius-ui (${c.radio})`);
    if (!c.sombra) m.push("el cierre: sin relieve");
    if (ok && !/^1px solid /.test(c.borde ?? "")) m.push(`el cierre: borde --accent-strong en oscuro (${c.borde})`);
    if (!c.foto || c.foto.src !== c.poster || c.foto.alt !== "" || c.foto.ajuste !== "cover") m.push(`el cierre: la foto es el póster del hero, decorativa (${JSON.stringify(c.foto)}; hero.video.poster ${c.poster})`);
    if (c.posterV && (!c.fuente || c.fuente[0] !== "(max-width: 767.98px)" || c.fuente[1] !== c.posterV)) m.push(`el cierre: en móvil el póster vertical del hero (${JSON.stringify(c.fuente)}; ${c.posterV})`);
    if (!c.scrim) m.push("el cierre: sin scrim");
    if (!c.eyebrow || plano(c.eyebrow[0]) !== plano(c.eyebrowEsp) || c.eyebrow[1] !== "12px" || c.eyebrow[2] !== "500") m.push(`el cierre: eyebrow «${c.eyebrowEsp}» 12/500 (${JSON.stringify(c.eyebrow)})`);
    if (!c.titulo || plano(c.titulo[0]) !== plano(c.tituloEsp) || c.titulo[1] !== "32px" || c.titulo[2] !== "300" || !c.titulo[3]) m.push(`el cierre: título «${c.tituloEsp}» en la serif (--font-serif) 300 de 32 px (${JSON.stringify(c.titulo)})`);
    const a = c.accion;
    if (!a || a.tag !== "BUTTON" || !plano(a.txt).startsWith(plano(a.esp)) || !a.contorno || a.alto < 46 || JSON.stringify(a.letra) !== JSON.stringify(["15px", "500"])) m.push(`el cierre: reservar «${a?.esp}» en contorno, 15/500, 46 px (${JSON.stringify(a)})`);
  }
  const mk = e.marca;
  if (!mk || mk.href !== "/" || plano(mk.etiqueta) !== plano(mk.nombre) || mk.img !== mk.esperado || mk.alto < 44) m.push(`la marca: el logo de la tinta del modo (${ok ? "logoDark" : "logo"}) que vuelve arriba, nombrado con brand.name, 44 px (${JSON.stringify(mk)})`);
  if (e.lineaEsp && (!e.linea || plano(e.linea[0]) !== plano(e.lineaEsp) || e.linea[1] !== "14px" || !e.linea[2])) m.push(`la línea de la marca (brand.tagline) 14 px en --text (${JSON.stringify(e.linea)})`);
  if (!e.nav || !e.nav.etiqueta || plano(e.nav.h2) !== plano(e.nav.h2Esp) || e.nav.columnas !== 2) m.push(`la navegación: un <nav> con su h2 «${e.nav?.h2Esp}», en 2 columnas en móvil (${JSON.stringify(e.nav)})`);
  if (e.cabezas.length !== 2 || e.cabezas.some((x: string[]) => x[0] !== "H2" || x[1] !== "12px" || x[2] !== "500")) m.push(`títulos de columna: h2 de 12/500 (${JSON.stringify(e.cabezas)})`);
  if (plano(e.contactoH) !== plano(e.contactoHEsp)) m.push(`columna de contacto «${e.contactoH}» («${e.contactoHEsp}»)`);
  if (e.enlaces.some(([h, t]: [number, boolean]) => h < 44 || !t)) m.push(`enlaces de 44 px en --text (${JSON.stringify(e.enlaces.filter(([h, t]: [number, boolean]) => h < 44 || !t).slice(0, 3))})`);
  if (!e.barra || e.barra.abajo !== "144px") m.push(`móvil: 144 px abajo para los botones flotantes (${e.barra?.abajo})`);
  if (!e.copy || e.copy.bdi !== e.copy.nombre || !plano(e.copy.txt).includes(plano(e.copy.derechos)) || !/^© \d{4} /.test(plano(e.copy.txt)) || e.copy.letra !== "13px") m.push(`la barra legal: «© año <bdi>marca</bdi>. ${e.copy?.derechos}» de 13 px (${JSON.stringify(e.copy)})`);
  const d = f.pieEscritorio;
  if (d) {
    if (d.cuerpo !== 3) m.push(`escritorio: 3 columnas (${d.cuerpo})`);
    if (!d.barra || d.barra.columnas !== 2 || d.barra.abajo !== "20px") m.push(`escritorio: la barra legal en una línea, 20 px abajo (${JSON.stringify(d.barra)})`);
    if (d.cierre && (!cerca(d.cierre.proporcion, 21 / 9, 0.02) || d.cierre.alto > 480.5 || d.cierre.titulo !== "52px")) m.push(`escritorio: el cierre 21:9, tope 30 rem, título de 52 px (${JSON.stringify(d.cierre)})`);
    if (d.cierre && f.fotoCierre && !(Math.abs((f.fotoCierre.abajo ?? 0) - (f.fotoCierre.centro ?? 0)) >= 5)) m.push(`la foto del cierre se mueve dentro de la tarjeta con el scroll (${JSON.stringify(f.fotoCierre)})`);
  } else if ("pieEscritorio" in f) m.push("sin medida de escritorio");
  if ("quietoPie" in f && f.quietoPie && Math.abs((f.quietoPie.abajo ?? 0) - (f.quietoPie.centro ?? 0)) > 0.5) m.push(`reduced-motion: la foto del cierre se mueve (${JSON.stringify(f.quietoPie)})`);
  if ("sinReservas" in f && (!f.sinReservas || f.sinReservas.cierre !== 0)) m.push(`sin reservas, sin cierre (${JSON.stringify(f.sinReservas)})`);
  void p;
  return m.map((x) => `${f.k}: pie ${x}`);
}

/** Los pesos de Frank Ruhl Libre visibles en #contact y en el footer (pendiente c de ARREGLOS-02: contacto y pie): 300 y 500. */
export function juezPesos(f: Fila): string[] {
  const out: string[] = [];
  for (const id of ["contact", "footer"]) {
    if (!f.pesos?.[id]) { out.push(`${f.k}: sin medida de pesos en ${id}`); continue; }
    for (const w of f.pesos[id]) if (!/^(300|500) /.test(w)) out.push(`${f.k}: ${id} usa Frank Ruhl Libre en ${w}`);
  }
  return out;
}

// ── la cita de reseñas v6 ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** Los tamaños de la cita que fija el paquete de reseñas (diseno/resenas/prototipo/proto.css): por largo, en móvil y en escritorio. */
export const TAMANO = { movil: { corto: 22, medio: 19, largo: 15.5 }, escritorio: { corto: 32, medio: 23, largo: 17 } } as const;
const vistaDe = (k: string) => (Number(k.match(/-(\d+)x/)![1]) < 1024 ? "movil" : "escritorio");
/** cita.mjs, parte (3): con «transiciones lentas» (global.transitionSpeed slow), con y sin reduced-motion, a 375 y 1280: con los datos
 *  del fixture cada cita en el tamaño de su largo y sin desbordar; con una palabra que no entra, la letra de esa cita baja hasta que
 *  entra, nunca de 15. Las partes (1) y (2) son las de INSTAGRAM-FAQ-01 (E1, aprobada): siguen igual. */
export function juezCita(c: Fila): string[] {
  const out: string[] = [];
  const lentas = c.lentas ?? [];
  for (const x of lentas) {
    if (x.velocidad !== "slow") out.push(`${x.k}: la página no está en «transiciones lentas» (data-gs-speed «${x.velocidad}»)`);
    const vista = vistaDe(x.k);
    if (x.piezas) {
      if (!x.piezas.length) out.push(`${x.k}: no hay citas de reseñas v6`);
      for (const [i, y] of x.piezas.entries()) { const base = (TAMANO[vista] as Record<string, number>)[y.largo]; if (y.letra !== base || y.desborda) out.push(`${x.k}: cita ${i + 1} (${y.largo}) en ${y.letra} px${y.desborda ? " desbordando" : ""} (el paquete: ${base} px)`); }
    } else {
      const y = x.lista, base = TAMANO[vista].corto;
      if (!y) out.push(`${x.k}: no está la cita con la palabra que no entra`);
      else if (y.desborda || y.letra < 15 || y.letra >= base) out.push(`${x.k}: con «Superextraordinariamentebueno מעולה» la cita mide ${y.letra} px y ${y.desborda ? `desborda (scroll ${y.scroll} > client ${y.client})` : "entra"} (tiene que bajar de ${base} hasta entrar, nunca de 15)`);
    }
  }
  if (lentas.length !== 8) out.push(`${lentas.length} casos de «transiciones lentas» (8)`);
  for (const t of c.tamanos ?? []) for (const [i, x] of (t.piezas ?? []).entries()) { const base = (TAMANO[vistaDe(t.k)] as Record<string, number>)[x.largo]; if (x.letra !== base || x.desborda) out.push(`${t.k}: cita ${i + 1} (${x.largo}) en ${x.letra} px (el paquete: ${base} px)`); }
  for (const k of c.caso ?? []) { const x = k.lista, base = TAMANO[vistaDe(k.k)].corto; if (!x || x.desborda || x.letra < 15 || x.letra >= base) out.push(`${k.k}: el caso de la verificadora de TEAM-RESENAS-01 (${JSON.stringify(x)})`); }
  return out;
}

// ── contenido de las plantillas (D-202: de diseno/services/prototipo/idiomas-{a,c}.json, como en local) ─────────────────────────────
/** La dirección simulada de cada plantilla, calle sin número (D85), escrita en cada idioma: calle, barrio y ciudad unidos por «, ». */
export const DIRECCION: Record<string, Record<string, string>> = {
  "a": {
    "he": "רחוב המנופים, הרצליה פיתוח, הרצליה",
    "en": "HaMenofim St, Herzliya Pituach, Herzliya",
    "ru": "ул. ха-Менофим, Герцлия-Питуах, Герцлия",
    "ar": "شارع هامنوفيم، هرتسليا بيتوح، هرتسليا"
  },
  "c": {
    "he": "רחוב פלורנטין, פלורנטין, תל אביב–יפו",
    "en": "Florentin St, Florentin, Tel Aviv-Yafo",
    "ru": "ул. Флорентин, Флорентин, Тель-Авив-Яфо",
    "ar": "شارع فلورنتين، فلورنتين، تل أبيب-يافا"
  }
};
/** La descripción de contacto de C, fiel a su catálogo (CONTACTO-01 § 1), en cada idioma. A conserva la del preset. */
export const DESCRIPCION_C: Record<string, string> = {
  "he": "תור אונליין לכל השירותים; לגוונים — שלחו תמונה בוואטסאפ ונחזור עם הצעה.",
  "en": "Book any service online; for highlights, send us a photo on WhatsApp and we'll come back with a quote.",
  "ru": "Записывайтесь онлайн на любую услугу; для мелирования пришлите фото в WhatsApp — мы ответим с предложением.",
  "ar": "احجزي أونلاين لأي خدمة؛ للخصلات أرسلي صورة عبر واتساب ونعود إليكِ بعرض."
};
/** La dirección que muestra la tarjeta de horarios y la descripción del formulario, por plantilla e idioma. */
export function juezContenido(f: Fila): string[] {
  const [p, lang] = f.k.split("-");
  const out: string[] = [];
  const h = f.ct?.horas;
  if (plano(h?.dir) !== plano(DIRECCION[p][lang])) out.push(`${f.k}: la dirección «${h?.dir}» (${DIRECCION[p][lang]})`);
  if (p === "c" && plano(f.ct?.formulario?.desc?.[0]) !== plano(DESCRIPCION_C[lang])) out.push(`${f.k}: la descripción de contacto de C «${f.ct?.formulario?.desc?.[0]}» (${DESCRIPCION_C[lang]})`);
  return out;
}
