// Copia editable de tests/orden/team-resenas-01/_jueces.ts (congelado). Cambios: los tres textos aprobados que Liam mandó cambiar el 2026-10-09
// (aria de las estrellas por idioma, F-1 árabe neutro, coma árabe en la dirección). Lo demás, byte a byte.
// TEAM-RESENAS-01 · los jueces de la aceptación (sesión A, 2026-10-01). Sólo en T. Puros: reciben lo que dejó cada instrumento de
// `./instrumentos/` y devuelven la lista de problemas (vacía = como en local). Los criterios son los del paquete de migración aprobado
// (diseno/INFORME.md §§ 6.5 y 6.6, team/TEAM-01.md §§ 1, 3-bis y 3-ter, resenas/RESENAS-01.md §§ 3 y 6) y los números que A midió el
// 2026-10-01 en local (prototipo, `ver-prototipo` con services + galería + team + reseñas) y en T de hoy; están en la HOJA, afirmación
// por afirmación. Un mismo criterio para local y para T: estos jueces dan 0 sobre las salidas del prototipo local.
// `juezVerificar` y `juezContraste` son copia de ../servicios-galeria-01/_jueces.ts (congelada al aprobarse esa orden).
type Fila = Record<string, any>;

/** Plantilla, idioma y ancho de una clave «a-he-375x812». */
export const caso = (k: string) => { const [p, lang, vp] = k.split("-"); const [w, h] = vp.split("x").map(Number); return { p, lang, w, h }; };

/** team.mjs y resenas.mjs: «N casos, con problemas M» con N = 32 y M = 0; si no, las líneas de problemas que imprimió. */
export function juezResumen(salida: string, nombre: string): string[] {
  const m = salida.match(/^(\d+) casos, con problemas (\d+)$/m);
  if (!m) return [`${nombre} no terminó: ${salida.slice(-400)}`];
  const out = salida.split(/\r?\n/).filter((l) => /^[ac]-\w\w-\d+x\d+: /.test(l));
  if (Number(m[1]) !== 32) out.push(`${nombre}: ${m[1]} casos (32)`);
  if (Number(m[2]) !== out.filter((l) => !/casos \(32\)$/.test(l)).length) out.push(`${nombre}: «con problemas ${m[2]}»`);
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

/** encaje: los problemas de texto (recortado, «…») de #team y #testimonials, y los avisos de texto faltante. No cuentan los avisos
 *  `[copy]` del hero (D12, aprobado: R22) ni el de la tarjeta sin foto de A (`kids-cut`, por contrato), que salen igual en local. */
export function juezEncaje(salida: string): string[] {
  const conocidos = /aviso: \[copy\] (hero\.|subtitle |services\.kids-cut: sin foto)/;
  const out: string[] = []; let k = "";
  for (const l of salida.split(/\r?\n/)) {
    const c = l.match(/^(\S+-\S+-\d+x\d+): \d+$/); if (c) { k = c[1]; continue; }
    if (/^  (#team|#testimonials|aviso:)/.test(l) && !conocidos.test(l)) out.push(`${k}: ${l.trim()}`);
  }
  if (!/TOTAL \d+ en 32 casos/.test(salida)) out.push(`encaje no terminó sus 32 casos: ${salida.slice(-300)}`);
  return out;
}

/** verificar-proto (services sigue en 32/32): copia del juez de SERVICIOS-GALERIA-01. */
export function juezVerificar(filas: Fila[], conFrase: (p: string, lang: string) => boolean): string[] {
  const out: string[] = [];
  for (const f of filas) {
    const { p, lang, w } = caso(f.k); const m: string[] = [];
    if (f.cardBottom > f.vpH) m.push(`la tarjeta baja hasta ${f.cardBottom} con la pantalla en ${f.vpH}`);
    if (w >= 1024 && f.enteras < 3) m.push(`${f.enteras} tarjetas enteras (3)`);
    if (w >= 1024 && f.nombresY && f.nombresY[0] !== f.nombresY[1]) m.push(`nombres a alturas distintas ${f.nombresY}`);
    if (w < 1024) {
      if (conFrase(p, lang)) { if (!f.cap?.visible) m.push("sin la frase de la central debajo del carrusel (.svc-caption)"); else if (!f.cap.coincide) m.push(`la leyenda no es la frase de la central («${f.cap.txt}»)`); }
      else if (f.cap?.visible) m.push(`leyenda visible sin frases en el catálogo («${f.cap.txt}»)`);
      if (f.fraseEnTarjeta) m.push("frase dentro de la tarjeta");
    }
    const s = f.servicios;
    if (s) {
      if (s.error) m.push(s.error);
      else {
        if (s.rellenasEnPantalla.length) m.push(`/servicios: ${s.rellenasEnPantalla.length} acciones rellenas fuera del navbar (${s.rellenasEnPantalla.join(" | ")})`);
        if (s.fundidoArriba !== "none") m.push(`/servicios: fundido de arriba ${s.fundidoArriba}`);
        if (s.columnaTexto[0] !== s.columnaTexto[1]) m.push(`/servicios: columna de texto corrida ${s.columnaTexto}`);
      }
    }
    if (m.length) out.push(`${f.k}: ${m.join("; ")}`);
  }
  if (filas.length !== 32) out.push(`${filas.length} casos (32)`);
  return out;
}

// ── estilos.mjs ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Texto comparable: el espacio duro del ruso (D18) cuenta como espacio. */
const plano = (s: unknown) => String(s ?? "").replace(/ /g, " ");
const px = (v: string | number) => (typeof v === "number" ? v : parseFloat(v));
const cerca = (a: string | number, b: string | number, tol = 1) => Math.abs(px(a) - px(b)) <= tol;

/** team (INFORME § 6.5; TEAM-01 §§ 1, 3-bis, 3-ter), una fila de estilos.json. Medido en local el 2026-10-01: 0 problemas. */
export function juezTeam(f: Fila): string[] {
  const m: string[] = [];
  const { p } = { p: f.k.split("-")[0] };
  const t = f.team;
  if (!t?.existe) return [`${f.k}: no hay team v6 (#team .team6)`];
  if (t.dinamica !== (p === "a" ? "v6" : "v7") || t.dinamica !== t.galeria) m.push(`dinámica ${t.dinamica} (galería ${t.galeria})`);
  if (t.tarjetas.length !== 3) m.push(`${t.tarjetas.length} tarjetas (3)`);
  for (const [i, c] of t.tarjetas.entries()) {
    if (c.tag !== "A" || !/^\/equipo\/[^/]+$/.test(c.href ?? "")) m.push(`tarjeta ${i + 1}: no es el enlace al perfil (${c.tag} ${c.href})`);
    if (c.label !== c.esperado) m.push(`tarjeta ${i + 1}: nombre accesible «${c.label}» (esperado «${c.esperado}»)`);
    if (c.controlesDentro) m.push(`tarjeta ${i + 1}: ${c.controlesDentro} controles dentro (un solo control)`);
    if (c.radio !== t.radioUi || !c.sombra) m.push(`tarjeta ${i + 1}: radio ${c.radio} (--radius-ui ${t.radioUi}) / relieve ${c.sombra}`);
    if (!/transform[^,]*,?.*0\.16s/.test(c.transicion)) m.push(`tarjeta ${i + 1}: sube en 160 ms (${c.transicion})`);
    if (t.oscuro && c.borde !== `1px solid ${t.acento}`) m.push(`tarjeta ${i + 1}: borde --accent-strong en oscuro (${c.borde})`);
  }
  const pie = t.pie;
  if (!pie) m.push("sin pie");
  else {
    if (!pie.abajo) m.push("el pie no está debajo de las tarjetas");
    if (plano(pie.h2[0]) !== plano(pie.subtitulo) || pie.h2[1] !== "16px" || pie.h2[2] !== "500") m.push(`h2 ${JSON.stringify(pie.h2)} (sections.team.subtitle, 16 px, 500)`);
    if (plano(pie.kicker[0]) !== plano(pie.titulo) || pie.kicker[1] !== "12px" || !pie.kicker[2]) m.push(`kicker ${JSON.stringify(pie.kicker)} (sections.team.title, 12 px, --text)`);
    if (!pie.reservar || pie.reservar.tag !== "BUTTON" || !plano(pie.reservar.txt).startsWith(plano(pie.reservar.esperado)) || pie.reservar.alto < 44) m.push(`reservar ${JSON.stringify(pie.reservar)} (buttons.bookAppointment, ≥ 44 px)`);
    if (!pie.descripcion || plano(pie.descripcion.txt) !== plano(pie.descripcion.esperado) || pie.descripcion.anchoMax !== "640px" || !pie.descripcion.debajo) m.push(`descripción ${JSON.stringify(pie.descripcion)} (sections.team.description, debajo, 40 rem)`);
    if (pie.sombras.some((n: number) => n < 1)) m.push(`halo (text-shadow) en h2, kicker, reservar y descripción (${pie.sombras})`);
    if (t.oscuro && pie.radial?.some((x: boolean) => !x)) m.push(`fondo radial en oscuro (${pie.radial})`);
  }
  const fo = t.fondo;
  if (fo.color !== fo.velo || fo.imagen !== "none") m.push(`fondo ${fo.color} / ${fo.imagen} (el velo de services ${fo.velo})`);
  if (fo.arriba !== "24px" || !cerca(fo.abajo, fo.rampa * 0.5 + 32)) m.push(`relleno ${fo.arriba} / ${fo.abajo} (24 px; rampa × 0,5 + 2 rem = ${fo.rampa * 0.5 + 32})`);
  if (fo.antes.top !== "0px" || fo.antes.alto !== "128px" || !/^linear-gradient\(rgb/.test(fo.antes.img)) m.push(`rampa de arriba ${JSON.stringify(fo.antes)} (top 0, 128 px como en local, --surface → transparente)`);
  if (fo.despues.bottom !== "0px" || !cerca(fo.despues.alto, fo.rampa * 0.5) || !/^linear-gradient\(to top, rgb/.test(fo.despues.img)) m.push(`rampa de abajo ${JSON.stringify(fo.despues)} (bottom 0, la mitad de la rampa, hacia --surface)`);
  const frases = t.frases.filter((x: string | null) => x);
  if (frases.length && frases.length !== t.tarjetas.length) m.push(`frase en unas tarjetas y en otras no (${t.frases})`);
  for (const [i, x] of (t.movil ?? []).entries()) {
    const [a, b] = x.columnas.split(" ").map(px), foto = x.fotoLado === "izq" ? a : b;
    if (!cerca(Math.min(a, b) / x.ancho, 0.4, 0.01)) m.push(`tarjeta ${i + 1} móvil: columnas ${x.columnas} (40 % / resto)`);
    if (!x.ext || x.ext.display === "none" || x.ext.filtro !== "blur(16px)") m.push(`tarjeta ${i + 1} móvil: la extensión desenfocada (${JSON.stringify(x.ext)})`);
    if (!/linear-gradient.*55%/.test(x.mascara) || x.fotoAncho !== 60) m.push(`tarjeta ${i + 1} móvil: retrato nítido del 60 % con máscara desde el 55 % (${x.fotoAncho} %, ${x.mascara})`);
    if (!/gradient/.test(x.scrim)) m.push(`tarjeta ${i + 1} móvil: scrim (${x.scrim})`);
    if (x.letra[0] !== "17px" || x.letra[1] !== "13px" || (x.letra[2] !== null && x.letra[2] !== "13px")) m.push(`tarjeta ${i + 1} móvil: letra ${x.letra} (17/13/13)`);
    if (!x.colorLetra) m.push(`tarjeta ${i + 1} móvil: letra en --on-scrim`);
    if (x.cuerpoLado === x.fotoLado) m.push(`tarjeta ${i + 1} móvil: el texto del lado de la foto`);
    const [izq, der] = x.relleno.map(px), haciaFoto = x.fotoLado === "izq" ? izq : der, afuera = x.fotoLado === "izq" ? der : izq;
    if (haciaFoto !== 28 || afuera !== 16) m.push(`tarjeta ${i + 1} móvil: 28 px del lado de la foto y 16 del de afuera (${x.relleno})`);
    void foto;
  }
  if (t.movil) {
    const lados = t.movil.map((x: Fila) => x.fotoLado);
    if (p === "a" && lados.some((l: string, i: number) => i > 0 && l === lados[i - 1])) m.push(`A: zigzag (la foto cambia de lado en cada tarjeta: ${lados})`);
    if (p === "c" && new Set(lados).size !== 1) m.push(`C: la foto siempre del mismo lado (${lados})`);
  }
  const e = f.teamEscritorio;
  if (e) {
    if (e.columnas !== 3) m.push(`escritorio: ${e.columnas} columnas (3)`);
    if (!cerca(e.fotoProp, 1.25, 0.01) || e.encuadre !== "50% 22%") m.push(`escritorio: retrato 4:5 con 50% 22% (${e.fotoProp}, ${e.encuadre})`);
    const desf = e.desfase.map(px);
    if (p === "a" ? !(desf[0] === 0 && desf[1] === 40 && desf[2] === 0) : desf.some((d: number) => d !== 0)) m.push(`escritorio: desfase ${e.desfase} (A: la del centro 2,5 rem; C: ninguno)`);
    if (!cerca(e.ancho, e.tope, 2)) m.push(`escritorio: el bloque mide ${e.ancho} (min(72rem, (100svh − 6,5rem − 15rem − desfase) × 2,4 + 8rem) = ${e.tope})`);
    if (e.tarjetaAbajo > e.alto) m.push(`escritorio 1366×657: la tarjeta baja a ${e.tarjetaAbajo} (pantalla ${e.alto})`);
  } else m.push("sin medida de escritorio");
  if (f.quietoTeam?.length) m.push(`reduced-motion: se mueve (${f.quietoTeam.slice(0, 2)})`);
  if (f.rusoSueltas?.length) m.push(`ruso: palabra de una letra con espacio común (${f.rusoSueltas.slice(0, 2).join(" / ")})`);
  return m.map((x) => `${f.k}: team ${x}`);
}

/** Lo que dicen los textos de interfaz nuevos de reseñas (INFORME § 7: R-1, R-2; D11-4), copiados del prototipo aprobado
 *  (`diseno/resenas/prototipo/proto.js`, CANTIDAD, ROTULO y ROTULO_TODAS): son del template, escritos por idioma (R24). */
export function cantidad(lang: string, n: number): string {
  if (lang === "he") return n === 1 ? "ביקורת אחת" : `${n} ביקורות`;
  if (lang === "ru") { const f = new Intl.PluralRules("ru").select(n); return `${n} ${f === "one" ? "отзыв" : f === "few" ? "отзыва" : "отзывов"}`; }
  if (lang === "ar") { const f = new Intl.PluralRules("ar").select(n); return f === "one" ? "مراجعة واحدة" : f === "two" ? "مراجعتان" : f === "few" ? `${n} مراجعات` : `${n} مراجعة`; }
  return n === 1 ? "1 review" : `${n} reviews`;
}
export const NOTA_SECCION: Record<string, string> = {
  en: "Reviews translated from Hebrew · See originals",
  ru: "Отзывы переведены с иврита · Показать оригиналы",
  ar: "المراجعات مترجمة من العبرية · عرض النصوص الأصلية",
};
export const NOTA_PIEZA: Record<string, { traducida: string; escrita: string }> = {
  he: { traducida: "תורגם · הצגת המקור", escrita: "נכתב בשפה אחרת" },
  en: { traducida: "Translated from Hebrew · See original", escrita: "Written in Hebrew" },
  ru: { traducida: "Переведено с иврита · Показать оригинал", escrita: "Написано на иврите" },
  ar: { traducida: "مترجمة من العبرية · عرض الأصل", escrita: "مكتوبة بالعبرية" },
};
const TAMANO = { movil: { corto: 22, medio: 19, largo: 15.5 } };
const sinEspacios = (s: string) => s.replace(/\s+/g, " ").replace(/\s*★\s*/g, "★").trim();

/** reseñas (INFORME § 6.6; RESENAS-01 §§ 3 y 6), una fila de estilos.json. Medido en local el 2026-10-01: 0 problemas. */
/** El aria de las estrellas en el idioma de la página (Liam 2026-10-09; antes «n/5»). */
const ARIA_ESTRELLAS: Record<string, string> = {"en":"Rated {n} out of 5","he":"דירוג {n} מתוך 5","ru":"Оценка {n} из 5","ar":"التقييم: {n} من 5"};
export function juezResenas(f: Fila): string[] {
  const m: string[] = [];
  const [p, lang] = f.k.split("-");
  const r = f.resenas;
  if (!r?.existe) return [`${f.k}: no hay reseñas en collage (#testimonials .res6)`];
  if (r.dinamica !== (p === "a" ? "v6" : "v7") || r.dinamica !== r.galeria) m.push(`dinámica ${r.dinamica} (galería ${r.galeria})`);
  const s = r.superficie;
  if (!s.seccion || s.antes !== "none" || s.despues !== "none") m.push(`la sección arranca y termina en --surface sin ::before/::after (${JSON.stringify(s)})`);
  if (!s.pared || s.pared.pos !== "absolute" || !s.pared.fondo || !s.pared.img || !s.pared.mascara) m.push(`textura en capa propia con máscara (${JSON.stringify(s.pared)})`);
  for (const [i, x] of r.piezas.entries()) {
    if (x.tag !== "FIGURE" || x.controles) m.push(`pieza ${i + 1}: no es un control (${x.tag}, ${x.controles} controles)`);
    if (!x.fondo || !x.sombra) m.push(`pieza ${i + 1}: --card con relieve`);
    if (r.oscuro && !/^1px solid /.test(x.borde ?? "")) m.push(`pieza ${i + 1}: borde de acento en oscuro (${x.borde})`);
    const largo = x.palabras <= 4 ? "corto" : x.palabras <= 12 ? "medio" : "largo";
    if (x.largo !== largo) m.push(`pieza ${i + 1}: ${x.palabras} palabras → ${largo} (es ${x.largo})`);
    const c = x.cita;
    if (!c || c.familia !== r.serif || c.estilo !== "normal" || c.comillas) m.push(`pieza ${i + 1}: la cita en la serif del idioma, sin cursiva ni comillas (${JSON.stringify(c)})`);
    else {
      if (r.serif === "Frank Ruhl Libre" && c.peso !== "300") m.push(`pieza ${i + 1}: peso ${c.peso} (300)`);
      if (!/^manual normal/.test(c.corte)) m.push(`pieza ${i + 1}: sin guionado ni corte de palabra (${c.corte})`);
      const base = TAMANO.movil[largo as keyof typeof TAMANO.movil];
      if (c.letra > base || c.letra < Math.min(15, base)) m.push(`pieza ${i + 1}: letra ${c.letra} (${base}, o menos hasta 15 si una palabra no entra)`);
    }
    if (x.quien !== "auto") m.push(`pieza ${i + 1}: el nombre con dir="auto"`);
    if (!x.servicio || x.servicio[0] !== "13px" || !x.servicio[1]) m.push(`pieza ${i + 1}: servicio 13 px en --text-muted (${x.servicio})`);
    const e = x.estrellas;
    if (!e || e.rol !== "img" || e.label !== ARIA_ESTRELLAS[lang].replace("{n}", String(e.nota)) || e.n !== 5 || e.apagadas !== 5 - e.nota) m.push(`pieza ${i + 1}: 5 estrellas, las que faltan apagadas, role=img «${ARIA_ESTRELLAS[lang]}» (${JSON.stringify(e)})`);
    else if (e.color !== (r.oscuro ? r.colores.resalte : r.colores.acento)) m.push(`pieza ${i + 1}: estrellas en ${r.oscuro ? "--highlight" : "--brand-accent"} (${e.color})`);
  }
  if (lang === "he") { if (r.nota || r.notasPorPieza) m.push("nota en la página en el idioma original"); }
  else if (!r.nota || r.nota.txt !== NOTA_SECCION[lang] || !r.nota.color || r.nota.boton < 44) m.push(`nota de sección ${JSON.stringify(r.nota)} (esperada «${NOTA_SECCION[lang]}», --text, botón ≥ 44 px)`);
  const pie = r.pie;
  if (!pie) m.push("sin pie");
  else {
    if (!pie.abajo) m.push("el pie no está debajo del collage");
    if (plano(pie.h2[0]) !== plano(pie.subtitulo) || pie.h2[1] !== "16px" || pie.h2[2] !== "500") m.push(`h2 ${JSON.stringify(pie.h2)} (sections.testimonials.subtitle, 16 px, 500)`);
    if (!pie.kicker || plano(pie.kicker[0]) !== plano(pie.titulo) || pie.kicker[1] !== "12px" || !pie.kicker[2]) m.push(`kicker ${JSON.stringify(pie.kicker)} (sections.testimonials.title, 12 px, --text)`);
    const prom = ({ a: "4.9", c: "4.8" } as Record<string, string>)[p];
    const esperado = sinEspacios(`${prom}★ ${pie.promedio} · ${cantidad(lang, pie.n)}`);
    if (sinEspacios(plano(pie.agg)) !== esperado) m.push(`promedio y cantidad «${pie.agg}» (esperado «${esperado}»)`);
    if (!pie.avg || pie.avg[0] !== r.serif || pie.avg[1] !== "18px" || pie.avg[2] !== "500") m.push(`el promedio en la serif, 18 px, 500 (${pie.avg})`);
  }
  const mv = r.movil;
  if (mv) {
    if (p === "a") {
      if (!mv.zigzag || mv.zigzag.length !== r.piezas.length) m.push(`A móvil: zigzag (${JSON.stringify(mv.zigzag)})`);
      else {
        if (mv.zigzag.some((z: Fila) => z.pct < 55 || z.pct > 87)) m.push(`A móvil: cada pieza del 56 al 86 % (${mv.zigzag.map((z: Fila) => z.pct)})`);
        if (mv.zigzag.some((z: Fila, i: number) => z.lado === "medio" || (i > 0 && z.lado === mv.zigzag[i - 1].lado))) m.push(`A móvil: las piezas alternan de lado (${mv.zigzag.map((z: Fila) => z.lado)})`);
      }
    } else if (mv.zigzag || !mv.solos || !mv.solosLargos || mv.tramos.some((n: number) => n !== 2)) m.push(`C móvil: por tramos, la larga a ancho entero y las cortas de a dos (${JSON.stringify(mv)})`);
  }
  const e = f.resenasEscritorio;
  if (!e || e.columnas !== 3) m.push(`escritorio: 3 columnas (${JSON.stringify(e)})`);
  else if (p === "a" ? !(px(e.desfase[1]) === 56 && px(e.desfase[0]) === 0) : e.desfase.some((d: string) => px(d) !== 0)) m.push(`escritorio: desfase ${e.desfase} (A: la del medio 3,5 rem; C: ninguno)`);
  if (f.quietoResenas?.length) m.push(`reduced-motion: se mueve (${f.quietoResenas.slice(0, 2)})`);
  if (f.mezcla) {
    const x = f.mezcla;
    if (x.notaSeccion) m.push("mezcla de idiomas: nota de sección (va por reseña)");
    if (lang === "he") {
      if (x.notas[0] !== NOTA_PIEZA.he.escrita || x.notas.slice(1).some((n: string | null) => n)) m.push(`mezcla he: «${NOTA_PIEZA.he.escrita}» sólo en la escrita en inglés (${JSON.stringify(x.notas)})`);
      if (x.primera?.lang !== "en" || x.primera?.dir !== "ltr") m.push(`mezcla he: la escrita en inglés con lang="en" dir="ltr" (${JSON.stringify(x.primera)})`);
    } else if (x.notas[0] !== null || x.notas.slice(1).some((n: string | null) => n !== NOTA_PIEZA.en.traducida)) m.push(`mezcla en: sin nota la escrita en inglés y «${NOTA_PIEZA.en.traducida}» en las traducidas (${JSON.stringify(x.notas)})`);
  }
  return m.map((x) => `${f.k}: reseñas ${x}`);
}

/** Los pesos de Frank Ruhl Libre visibles en #team y #testimonials (pendiente c de ARREGLOS-02, sólo esas dos secciones): 300 y 500. */
export function juezPesos(f: Fila): string[] {
  const out: string[] = [];
  for (const id of ["team", "testimonials"]) for (const w of f.pesos?.[id] ?? []) if (!/^(300|500) /.test(w)) out.push(`${f.k}: #${id} usa Frank Ruhl Libre en ${w}`);
  if (!f.pesos) out.push(`${f.k}: sin medida de pesos`);
  return out;
}
