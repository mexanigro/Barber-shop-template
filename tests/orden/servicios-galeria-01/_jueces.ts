// SERVICIOS-GALERIA-01 · los jueces de la aceptación (sesión A, 2026-10-01). Sólo en T. Puros: reciben lo que dejó cada instrumento
// de `./instrumentos/` y devuelven la lista de problemas (vacía = como en local). Los criterios son los del paquete de migración
// aprobado (diseno/INFORME.md §§ 6.3 y 6.4, services/SERVICES-03.md § 4, galeria/GALERIA-06.md § 6) y los números que A midió el
// 2026-10-01 en local (prototipo, `ver-prototipo.ps1` con services + galería) y en T de hoy; están en la HOJA, afirmación por
// afirmación. Un mismo criterio para local y para T: estos jueces dan 0 sobre las salidas del prototipo local.
type Fila = Record<string, any>;

/** Plantilla, idioma y ancho de una clave «a-he-375x812». */
export const caso = (k: string) => { const [p, lang, vp] = k.split("-"); const [w, h] = vp.split("x").map(Number); return { p, lang, w, h }; };

/** verificar-proto: por caso, con los criterios de SERVICES-03 § 4 (ángulo 1). `conFrase(p, lang)` dice si el catálogo de esa
 *  plantilla tiene frase en ese idioma (C no tiene ninguna: sin frases la leyenda no se muestra). `parte` filtra móvil, escritorio o
 *  /servicios. */
export function juezVerificar(filas: Fila[], conFrase: (p: string, lang: string) => boolean, parte: "movil" | "escritorio" | "servicios" | "todo" = "todo"): string[] {
  const out: string[] = [];
  for (const f of filas) {
    const { p, lang, w } = caso(f.k); const m: string[] = [];
    if (parte === "todo" || parte === (w < 1024 ? "movil" : "escritorio")) {
      if (f.cardBottom > f.vpH) m.push(`la tarjeta baja hasta ${f.cardBottom} con la pantalla en ${f.vpH}`);
      if (w >= 1024 && f.enteras < 3) m.push(`${f.enteras} tarjetas enteras (3)`);
      if (w >= 1024 && f.nombresY && f.nombresY[0] !== f.nombresY[1]) m.push(`nombres a alturas distintas ${f.nombresY}`);
      if (w < 1024) {
        if (conFrase(p, lang)) { if (!f.cap?.visible) m.push("sin la frase de la central debajo del carrusel (.svc-caption)"); else if (!f.cap.coincide) m.push(`la leyenda no es la frase de la central («${f.cap.txt}»)`); }
        else if (f.cap?.visible) m.push(`leyenda visible sin frases en el catálogo («${f.cap.txt}»)`);
        if (f.fraseEnTarjeta) m.push("frase dentro de la tarjeta");
      }
    }
    const s = f.servicios;
    if (s && (parte === "todo" || parte === "servicios")) {
      if (s.error) m.push(s.error);
      else {
        if (s.rellenasEnPantalla.length) m.push(`/servicios: ${s.rellenasEnPantalla.length} acciones rellenas fuera del navbar (${s.rellenasEnPantalla.join(" | ")})`);
        if (s.fundidoArriba !== "none") m.push(`/servicios: fundido de arriba ${s.fundidoArriba}`);
        if (s.columnaTexto[0] !== s.columnaTexto[1]) m.push(`/servicios: columna de texto corrida ${s.columnaTexto}`);
      }
    }
    if (m.length) out.push(`${f.k}: ${m.join("; ")}`);
  }
  return out;
}

/** encaje: los problemas de texto (recortado, «…», nombre y precio pisados) de services y /servicios, y los avisos de texto faltante.
 *  No cuentan los avisos `[copy]` del hero (D12, aprobado: R22) ni el de la tarjeta sin foto de A (`kids-cut`, por contrato: «uno sin
 *  foto»), que salen igual en local. */
export function juezEncaje(salida: string): string[] {
  const conocidos = /aviso: \[copy\] (hero\.|subtitle |services\.kids-cut: sin foto)/;
  const out: string[] = []; let caso = "";
  for (const l of salida.split(/\r?\n/)) {
    const c = l.match(/^(\S+-\S+-\d+x\d+): \d+$/); if (c) { caso = c[1]; continue; }
    if (/^  (#services|\/servicios|aviso:)/.test(l) && !conocidos.test(l)) out.push(`${caso}: ${l.trim()}`);
  }
  if (!/TOTAL \d+ en 32 casos/.test(salida)) out.push(`encaje no terminó sus 32 casos: ${salida.slice(-300)}`);
  return out;
}

/** nombres: «TOTAL 0». */
export function juezNombres(salida: string): string[] {
  const n = salida.match(/^TOTAL (\d+)/m);
  if (!n) return [`nombres no terminó: ${salida.slice(-300)}`];
  return Number(n[1]) === 0 ? [] : salida.split(/\r?\n/).filter((l) => /^[ac]-\w\w-\d+:/.test(l));
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

/** galeria.mjs: por caso, con los criterios de INFORME § 6.4 (aceptación). */
export function juezGaleria(filas: Fila[]): string[] {
  const out: string[] = [];
  for (const f of filas) {
    const { p, w } = caso(f.k); const m: string[] = [];
    if (f.variante !== (p === "a" ? "v6" : "v7")) m.push(`variante ${f.variante}`);
    if (f.piezas !== 6) m.push(`${f.piezas} piezas`);
    if (f.altVacios) m.push(`${f.altVacios} alt vacíos`);
    if (f.altOtroIdioma) m.push(`${f.altOtroIdioma} alt en otro idioma`);
    if (f.overflowX) m.push("desborde horizontal");
    if (f.piezasFuera) m.push(`${f.piezasFuera} piezas fuera`);
    if (f.recortes?.length) m.push(`recortes ${f.recortes.join(", ")}`);
    for (const c of ["svc→gal", "gal→team"]) if (f[c] && f[c].max > 6.4) m.push(`costura ${c} ${f[c].max} niveles`);
    const lb = f.lightbox ?? {};
    if (!lb.abre || !lb.focoDentro || !lb.cierraEsc || !lb.focoVuelve) m.push(`lightbox ${JSON.stringify(lb).slice(0, 100)}`);
    if (f.lbRecortes?.length) m.push(`recortes en el lightbox ${f.lbRecortes.join(", ")}`);
    const pg = f.pagina ?? {};
    if (pg.path !== "/galeria" || !pg.fotos || pg.altVacios || !pg.pills || pg.overflowX || pg.recortes?.length) m.push(`/galeria ${JSON.stringify(pg).slice(0, 160)}`);
    if (p === "a" && w >= 1024 && !(f.alto >= 782 && f.alto <= 851)) m.push(`alto de A en escritorio ${f.alto} px (782–851)`);
    if (f.avisos?.length) m.push(`avisos ${f.avisos.join(" | ")}`);
    if (m.length) out.push(`${f.k}: ${m.join("; ")}`);
  }
  if (filas.length !== 32) out.push(`${filas.length} casos (32)`);
  return out;
}

/** siluetas: la foto del local en la franja donde entra la textura (tramo 40–100 %), con G2 y con la mutación del instrumento. */
export function leerSiluetas(salida: string): { con: Record<string, number>; sin: Record<string, number> } {
  const con: Record<string, number> = {}, sin: Record<string, number> = {};
  for (const l of salida.split(/\r?\n/)) {
    const m = l.match(/^(CON G2|SIN G2 \(mutación\)) ([ac]) (\d+) franja \d+px (\{.*\})$/);
    if (m) (m[1] === "CON G2" ? con : sin)[`${m[2]}-${m[3]}`] = JSON.parse(m[4]).tramo40_100;
  }
  return { con, sin };
}

/** gal-comp: por plantilla y ancho, la parte del ancho que ocupan las piezas y el alto de la sección. */
export function leerComp(salida: string): Record<string, { pct: number; alto: number }> {
  const out: Record<string, { pct: number; alto: number }> = {};
  for (const l of salida.split(/\r?\n/)) { const m = l.match(/^([ac]) (\d+) (\{.*\})$/); if (m) { const j = JSON.parse(m[3]); out[`${m[1]}-${m[2]}`] = { pct: j.pct, alto: j.alto }; } }
  return out;
}
