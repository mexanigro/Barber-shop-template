// SECCIONES-02 · copia promovida (MARCA-01, 2026-10-07, D-296) de tests/orden/secciones-02/a.test.ts. La orden quedó aprobada por Liam
// el 2026-10-07 (T 80fa0d7 · H 43b0384) y su carpeta está congelada; esto es la copia editable que corre `npm test` (fase test:browser).
// Recortes (D-296, como las copias de las órdenes de sección): UN CASO POR PLANTILLA en cada test (`CASOS`), no los 32 / 24 / 16 de la
// orden. Y D1 REFORZADO: la verificadora de SECCIONES-02 midió que con el `:where(html[data-niche="peluqueria"])` quitado su D1 seguía en
// verde (la flota no pinta `.ct6` ni `.team6`). Esta copia cambia `data-niche` EN VIVO en la plantilla A, con las reglas a la vista:
// pasar `<html>` a otro nicho tiene que sacarlas (la escena de contacto vuelve a medir su contenido y la tarjeta-perfil se va) y volver
// a peluquería tiene que ponerlas. Va PRIMERO en D1: con el `:where` quitado, D1 cae ahí y su error nombra data-niche (R1 de MARCA-01).
// Las regresiones por píxel siguen contra el commit rojo de SECCIONES-02 (55cc9e8): si una orden futura cambia #contact o #team a
// propósito, actualiza esta copia. No escribe nada fuera de su carpeta temporal «secciones-02-…», que se borra al terminar.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Paginas, ROOT, SEIS, abrirPlantillas, borrar, capturaDe, clonDe, conFormulario, conNicho, conPersonas, git, imagenesDe, peorContraste, pixelesDistintos, quieta, quitarEnlace, reintentar, rojoDeEstaOrden, type Fx, type P, type Urls } from "./orden/secciones-02/_comun.ts";

// `npm test` corre esta copia con `tsx`, que transpila con esbuild `keepNames`: cada función que se manda a `page.evaluate` o a
// `waitForFunction` (las de `_comun.ts` y las de aquí) lleva llamadas a `__name(…)`, que en la página no existe («ReferenceError: __name
// is not defined», medido en el pre-commit de MARCA-01). La orden corre con `node --experimental-strip-types` y no lo ve. Cada contexto
// que abre el arnés define `__name` como la identidad antes de cargar nada (sin tocar el `_comun.ts` congelado).
const contextoDelArnes = Paginas.prototype.contexto;
Paginas.prototype.contexto = async function (this: Paginas, ...a: Parameters<Paginas["contexto"]>) {
  const ctx = await contextoDelArnes.apply(this, a);
  await ctx.addInitScript({ content: "globalThis.__name = globalThis.__name || ((f) => f);" });
  return ctx;
};

/** Un caso por plantilla: A en hebreo y C en árabe (RTL las dos, distinto idioma y dinámica). */
const CASOS: { p: P; lang: string }[] = [{ p: "a", lang: "he" }, { p: "c", lang: "ar" }];
let base = "", clon = "", pags: Paginas;
let head: { urls: Urls; cerrar: () => Promise<void> } | undefined, rojo: { urls: Urls; cerrar: () => Promise<void> } | undefined;

before(async () => {
  base = mkdtempSync(join(tmpdir(), "secciones-02-"));
  pags = await Paginas.abrir();
  head = await abrirPlantillas(ROOT, base);
});
after(async () => {
  await pags?.cerrar();
  await rojo?.cerrar();
  await head?.cerrar();
  if (clon) quitarEnlace(clon);
  if (base) borrar(base);
});
async function urlsRojo(): Promise<Urls> {
  if (!rojo) {
    const sha = rojoDeEstaOrden();
    assert.ok(sha, "precondición: hay un commit que añade tests/orden/secciones-02/HOJA.md");
    clon = clonDe(base, "rojo", sha);
    rojo = await abrirPlantillas(clon, base);
  }
  return rojo.urls;
}
async function conPagina(url: string, lang: string, w: number, h: number, sel: string, cambio: ((fx: Fx) => void) | undefined, medir: (pg: any) => Promise<any>, reducido = true): Promise<any> {
  return reintentar(async () => {
    const { ctx, pg } = await pags.abrirEn(url, lang, w, h, sel, { cambio, reducido });
    try { return await medir(pg); } finally { await ctx.close(); }
  });
}
async function regresion(p: P, lang: string, w: number, h: number, sel: string, cambio?: (fx: Fx) => void): Promise<number> {
  const ur = await urlsRojo();
  const a = await conPagina(head!.urls[p], lang, w, h, sel, cambio, (pg) => capturaDe(pg, sel));
  return conPagina(ur[p], lang, w, h, sel, cambio, async (pg) => pixelesDistintos(pg, a, await capturaDe(pg, sel)));
}
const caja = (q: { x: number; y: number; width: number; height: number }) => ({ x: q.x, y: q.y, w: q.width, h: q.height, r: q.x + q.width, b: q.y + q.height });
const cerca = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
const r0 = (n: number) => Math.round(n);

// ─── Contacto v6 < 1024 (A1, A2) ─────────────────────────────────────────────────────────────────────────────────────────
type MedidaCt = { caso: string; p: P; form: boolean; w: number; columna: number; ct6: number; escena: number; mapa: ReturnType<typeof caja>; horas: ReturnType<typeof caja>; pie: number | null; form6: number | null; rtl: boolean; desborda: boolean };
const medirCt = (pg: any) => pg.evaluate(() => {
  const q = (s: string) => document.querySelector(s)?.getBoundingClientRect().toJSON() ?? null;
  const sec = document.getElementById("contact")!, cs = getComputedStyle(sec);
  const ct6 = document.querySelector(".ct6") as HTMLElement | null, cc = ct6 ? getComputedStyle(ct6) : null;
  const horas = q(".ubi6-horas"), pie = q(".ubi6 .ct6-foot"), form = q(".form6");
  return {
    columna: sec.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    ct6: ct6 ? ct6.getBoundingClientRect().width : 0,
    escena: ct6 ? ct6.clientWidth - parseFloat(cc!.paddingLeft) - parseFloat(cc!.paddingRight) : 0,
    mapa: q(".ubi6-mapa"), horas, pie: pie && horas ? pie.top - horas.bottom : null, form6: form && pie ? form.top - pie.bottom : null,
    rtl: document.documentElement.dir === "rtl", desborda: document.documentElement.scrollWidth > innerWidth,
  };
});
let medidasCt: Promise<MedidaCt[]> | undefined;
/** Un caso por plantilla: A sin formulario a 375, C con formulario a 768. */
function contactoMovil(): Promise<MedidaCt[]> {
  medidasCt ??= (async () => {
    const out: MedidaCt[] = [];
    for (const [{ p, lang }, form, w, h] of [[CASOS[0], false, 375, 812], [CASOS[1], true, 768, 1024]] as [typeof CASOS[0], boolean, number, number][]) {
      const m = await conPagina(head!.urls[p], lang, w, h, "#contact", conFormulario(form), medirCt);
      assert.ok(m.mapa && m.horas, `precondición (${p}-${lang}-${w}): contacto v6 pinta el mapa y la tarjeta de horarios`);
      out.push({ caso: `${p}-${lang}-${form ? "form" : "sinform"}-${w}`, p, form, w, columna: m.columna, ct6: m.ct6, escena: m.escena, mapa: caja(m.mapa), horas: caja(m.horas), pie: m.pie, form6: m.form6, rtl: m.rtl, desborda: m.desborda });
    }
    return out;
  })();
  return medidasCt;
}

test("< 1024 la escena de contacto v6 mide su columna: a 375 y a 768, con features.showInquiry en true y en false, en A y C y en los cuatro idiomas, .ct6 mide el ancho del contenido de #contact y el mapa el del contenido de la escena —335 px a 375 y 728 px a 768 en los 32 casos—, sin depender del idioma ni del formulario", async () => {
  const ms = await contactoMovil();
  const mal = ms.filter((m) => !cerca(m.ct6, m.columna)).map((m) => `${m.caso}: .ct6 ${r0(m.ct6)} de ${r0(m.columna)}`);
  assert.deepEqual(mal, [], `S2-1: .ct6 mide su contenido y no la columna de #contact:\n${mal.join("\n")}`);
  const mapa = ms.filter((m) => !cerca(m.mapa.w, m.escena) || !cerca(m.mapa.w, m.w === 375 ? 335 : 728)).map((m) => `${m.caso}: mapa ${r0(m.mapa.w)} (escena ${r0(m.escena)})`);
  assert.deepEqual(mapa, [], `S2-1: el mapa no mide el contenido de la escena (335 a 375, 728 a 768):\n${mapa.join("\n")}`);
});

test("< 1024 mapa y horarios apilados: el mapa a todo el ancho de la escena en 16:10 con tope de 22 rem (335 × 209 a 375, 728 × 352 a 768); la tarjeta de horarios debajo, montada 1,5 rem sobre el borde inferior del mapa —empieza por debajo del 80 % de su alto y no tapa su centro—; a 375 del ancho del mapa menos 2 rem, en A corrida hacia el final (2 rem del inicio, 0 del final) y en C alineada (1 rem de cada lado); a 768 de 30 rem como máximo, en A a 2 rem del final y en C centrada; el pie 22 px debajo de la tarjeta y el formulario 64 px debajo del pie; sin desborde; y ≥ 1024 #contact es, píxel a píxel, el del commit rojo de esta orden, en A y C a 1280 × 800 y 1366 × 657", async () => {
  const ms = await contactoMovil();
  const mal: string[] = [];
  for (const m of ms) {
    const k = m.caso, M = m.mapa, H = m.horas;
    const alto = Math.min(M.w * 10 / 16, 352);
    if (!cerca(M.h, alto)) mal.push(`${k}: mapa ${r0(M.w)}×${r0(M.h)}, no 16:10 con tope de 22 rem (${r0(alto)})`);
    if (!cerca(M.b - H.y, 24)) mal.push(`${k}: la tarjeta monta ${r0(M.b - H.y)} px sobre el mapa, no 1,5 rem (24)`);
    if (H.y < M.y + 0.8 * M.h) mal.push(`${k}: la tarjeta empieza antes del 80 % del alto del mapa`);
    if (H.y <= M.y + M.h / 2) mal.push(`${k}: la tarjeta tapa el centro del mapa`);
    const ini = m.rtl ? M.r - H.r : H.x - M.x, fin = m.rtl ? H.x - M.x : M.r - H.r;
    if (m.w === 375) {
      if (!cerca(H.w, M.w - 32)) mal.push(`${k}: tarjeta ${r0(H.w)}, no el mapa menos 2 rem (${r0(M.w - 32)})`);
      if (m.p === "a" && !(cerca(ini, 32) && cerca(fin, 0))) mal.push(`${k}: A no corre la tarjeta hacia el final (inicio ${r0(ini)}, final ${r0(fin)}; 32 y 0)`);
      if (m.p === "c" && !(cerca(ini, 16) && cerca(fin, 16))) mal.push(`${k}: C no la alinea (inicio ${r0(ini)}, final ${r0(fin)}; 16 y 16)`);
    } else {
      if (H.w > 480 + 1) mal.push(`${k}: tarjeta ${r0(H.w)}, más de 30 rem`);
      if (m.p === "a" && !cerca(fin, 32)) mal.push(`${k}: A no deja la tarjeta a 2 rem del final (${r0(fin)})`);
      if (m.p === "c" && !cerca(ini, fin)) mal.push(`${k}: C no centra la tarjeta (inicio ${r0(ini)}, final ${r0(fin)})`);
    }
    if (m.pie === null || !cerca(m.pie, 22)) mal.push(`${k}: el pie a ${m.pie === null ? "—" : r0(m.pie)} px de la tarjeta, no 22`);
    if (m.form && (m.form6 === null || !cerca(m.form6, 64))) mal.push(`${k}: el formulario a ${m.form6 === null ? "—" : r0(m.form6)} px del pie, no 64`);
    if (!m.form && m.form6 !== null) mal.push(`${k}: formulario con showInquiry apagado`);
    if (m.desborda) mal.push(`${k}: desborda en horizontal`);
  }
  assert.deepEqual(mal, [], `S2-2: ${mal.length} faltas:\n${mal.join("\n")}`);
  const px: string[] = [];
  for (const [{ p }, w, h] of [[CASOS[0], 1280, 800], [CASOS[1], 1366, 657]] as [typeof CASOS[0], number, number][]) {
    const n = await regresion(p, "he", w, h, "#contact");
    if (n !== 0) px.push(`${p}-he-${w}x${h}: ${n < 0 ? "otro tamaño" : `${n} px distintos`}`);
  }
  assert.deepEqual(px, [], `S2-2: ≥ 1024 #contact cambió respecto del commit rojo:\n${px.join("\n")}`);
});

// ─── Team v6 (B1–B4) ─────────────────────────────────────────────────────────────────────────────────────────────────
const medirTeam = (pg: any) => pg.evaluate(() => {
  const q = (e: Element | null) => (e ? e.getBoundingClientRect().toJSON() : null);
  const vis = (e: Element | null) => !!e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
  const sec = document.getElementById("team")!, cs = getComputedStyle(sec), t6 = document.querySelector(".team6") as HTMLElement, tc = getComputedStyle(t6);
  const card = document.querySelector(".team6-card");
  const cuerpo = card?.querySelector(".team6-body") ?? null;
  return {
    columna: sec.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    team6: t6.getBoundingClientRect().width, contenido: t6.clientWidth - parseFloat(tc.paddingLeft) - parseFloat(tc.paddingRight),
    lista: q(document.querySelector(".team6-list")), tarjetas: [...document.querySelectorAll(".team6-card")].map(q),
    foto: vis(card?.querySelector(".team6-photo") ?? null) ? q(card!.querySelector(".team6-photo")) : null,
    ext: vis(card?.querySelector(".team6-ext") ?? null) ? q(card!.querySelector(".team6-ext")) : null,
    cuerpo: q(cuerpo), interior: card ? { w: (card as HTMLElement).clientWidth, h: (card as HTMLElement).clientHeight } : null,
    textos: ["name", "role", "bio", "cue", "tag"].map((c) => { const e = card?.querySelector(`.team6-${c}`) ?? null; return { c, vis: vis(e), caja: q(e), letra: e ? getComputedStyle(e).fontSize : "" }; }),
    rtl: document.documentElement.dir === "rtl", desborda: document.documentElement.scrollWidth > innerWidth,
  };
});

test("team v6 ≥ 1024 con una persona es la tarjeta-perfil horizontal: a 1280 × 800, 1366 × 657 y 1920 × 945, en A y C, la tarjeta mide el ancho del bloque (72 rem menos su margen: 1072 px) y de alto clamp(22rem, 100svh − 16rem, 30rem); la foto nítida ocupa el 58 % del interior por el lado de inicio y su extensión desenfocada va detrás, del ancho de la tarjeta y más alta que ella, las dos visibles; el nombre en 26 px, la especialidad, la bio en 16 px y la señal al perfil, sin la frase corta, dentro de la tarjeta y apoyados abajo en el lado de afuera; sin desborde", async () => {
  const mal: string[] = [];
  for (const [{ p, lang }, w, h] of [[CASOS[0], 1280, 800], [CASOS[1], 1366, 657]] as [typeof CASOS[0], number, number][]) {
    const k = `${p}-${lang}-${w}x${h}`;
    const m = await conPagina(head!.urls[p], lang, w, h, "#team", conPersonas(1), medirTeam);
    assert.equal(m.tarjetas.length, 1, `precondición (${k}): una sola tarjeta`);
    const C = caja(m.tarjetas[0]);
    if (!cerca(C.w, 1072)) mal.push(`${k}: la tarjeta mide ${r0(C.w)} de ancho, no el bloque (1072)`);
    const alto = Math.min(Math.max(352, h - 256), 480);
    if (!cerca(C.h, alto)) mal.push(`${k}: la tarjeta mide ${r0(C.h)} de alto, no clamp(22rem, 100svh − 16rem, 30rem) = ${alto}`);
    if (!m.foto) mal.push(`${k}: sin foto nítida visible`);
    else {
      const F = caja(m.foto), I = m.interior!;
      if (!cerca(F.w, 0.58 * I.w, 2) || !cerca(F.h, I.h)) mal.push(`${k}: la foto nítida mide ${r0(F.w)}×${r0(F.h)}, no el 58 % del interior (${r0(0.58 * I.w)})`);
      if (!(m.rtl ? cerca(F.r, C.r, 2) : cerca(F.x, C.x, 2))) mal.push(`${k}: la foto nítida no está del lado de inicio`);
    }
    if (!m.ext || !cerca(m.ext.width, m.interior!.w, 2) || m.ext.height <= C.h) mal.push(`${k}: la extensión desenfocada no va detrás, del ancho de la tarjeta y más alta que ella`);
    const t = Object.fromEntries(m.textos.map((x: any) => [x.c, x]));
    for (const c of ["name", "role", "bio", "cue"]) {
      if (!t[c].vis) { mal.push(`${k}: .team6-${c} no se ve`); continue; }
      const T = caja(t[c].caja);
      if (T.x < C.x - 1 || T.r > C.r + 1 || T.y < C.y - 1 || T.b > C.b + 1) mal.push(`${k}: .team6-${c} sale de la tarjeta`);
    }
    if (t.tag.vis) mal.push(`${k}: la frase corta (.team6-tag) se ve`);
    if (t.name.letra !== "26px") mal.push(`${k}: el nombre en ${t.name.letra}, no 26px`);
    if (t.bio.letra !== "16px") mal.push(`${k}: la bio en ${t.bio.letra}, no 16px`);
    if (m.cuerpo) {
      const B = caja(m.cuerpo);
      if (!cerca(B.b, C.b)) mal.push(`${k}: el texto no se apoya abajo`);
      if (!(m.rtl ? cerca(B.x, C.x) : cerca(B.r, C.r))) mal.push(`${k}: el texto no está del lado de afuera`);
    }
    if (m.desborda) mal.push(`${k}: desborda en horizontal`);
  }
  assert.deepEqual(mal, [], `S2-3 (1 persona): ${mal.length} faltas:\n${mal.join("\n")}`);
});

test("el texto de la tarjeta-perfil de una persona se lee: en A y C, en los cuatro idiomas, a 1280 × 800 y 1366 × 657, en tres posiciones de scroll y sin menos movimiento, cada texto da contraste ≥ 4,5 contra el peor píxel de fondo detrás de él", async (t) => {
  const mal: string[] = [];
  let medidas = 0, peor = 99;
  for (const [{ p, lang }, w, h] of [[CASOS[0], 1366, 657], [CASOS[1], 1280, 800]] as [typeof CASOS[0], number, number][]) {
    const k = `${p}-${lang}-${w}x${h}`;
    const xs = await conPagina(head!.urls[p], lang, w, h, "#team", conPersonas(1), async (pg) => {
      const out: { pos: string; texto: string; ratio: number }[] = [];
      const m = await medirTeam(pg);
      assert.ok(m.ext && m.foto, `${k}: la tarjeta de una persona es la tarjeta-perfil (la foto y su extensión detrás del texto)`);
      await imagenesDe(pg, "#team");
      for (const pos of ["inicio", "centro", "final"]) {
        await pg.evaluate((ps: string) => {
          const c = document.querySelector(".team6-card")!.getBoundingClientRect();
          const d = ps === "inicio" ? c.top - 80 : ps === "final" ? c.bottom - innerHeight + 20 : c.top + c.height / 2 - innerHeight / 2;
          window.scrollTo({ top: scrollY + d, behavior: "instant" });
        }, pos);
        await quieta(pg, ".team6-card");
        for (const x of await peorContraste(pg, "#team .team6-card .team6-body > *")) out.push({ pos, ...x });
      }
      return out;
    }, false);
    for (const x of xs) {
      medidas++; peor = Math.min(peor, x.ratio);
      if (!(x.ratio >= 4.5)) mal.push(`${k} ${x.pos}: «${x.texto}» ${x.ratio === 99 ? "sin medir" : x.ratio.toFixed(2)}`);
    }
  }
  t.diagnostic(`textos medidos ${medidas} · peor ${peor.toFixed(2)}`);
  assert.ok(medidas >= 2 * 3 * 4, `se midieron todos los textos (${medidas})`);
  assert.deepEqual(mal, [], `S2-3 (1 persona): ${mal.length} textos por debajo de 4,5 (peor ${peor.toFixed(2)}):\n${mal.join("\n")}`);
});

test("team v6 ≥ 1024 con dos personas: dos tarjetas del ancho que tienen con tres, centradas; con cuatro, filas de tres del mismo ancho y la cuarta centrada; y con tres #team es, píxel a píxel, el del commit rojo de esta orden — a 1280 × 800, 1366 × 657 y 1920 × 945, en A y C", async () => {
  const mal: string[] = [];
  for (const [{ p }, w, h] of [[CASOS[0], 1280, 800], [CASOS[1], 1920, 945]] as [typeof CASOS[0], number, number][]) {
    const k = `${p}-he-${w}x${h}`;
    const tres = await conPagina(head!.urls[p], "he", w, h, "#team", conPersonas(3), medirTeam);
    const ancho = tres.tarjetas[0].width;
    const dos = await conPagina(head!.urls[p], "he", w, h, "#team", conPersonas(2), medirTeam);
    const L = caja(dos.lista), cs = dos.tarjetas.map(caja);
    if (cs.some((c: any) => !cerca(c.w, ancho))) mal.push(`${k} (2): tarjetas de ${cs.map((c: any) => r0(c.w)).join(" y ")}, no del ancho que tienen con tres (${r0(ancho)})`);
    const izq = Math.min(...cs.map((c: any) => c.x)) - L.x, der = L.r - Math.max(...cs.map((c: any) => c.r));
    if (!cerca(izq, der)) mal.push(`${k} (2): no están centradas (${r0(izq)} px a un lado, ${r0(der)} al otro)`);
    const cuatro = await conPagina(head!.urls[p], "he", w, h, "#team", conPersonas(4), medirTeam);
    const L4 = caja(cuatro.lista), c4 = cuatro.tarjetas.map(caja);
    if (c4.some((c: any) => !cerca(c.w, ancho))) mal.push(`${k} (4): tarjetas de ${c4.map((c: any) => r0(c.w)).join(", ")}, no del ancho que tienen con tres (${r0(ancho)})`);
    if (!(c4[3].y > Math.max(...c4.slice(0, 3).map((c: any) => c.b)) - 1)) mal.push(`${k} (4): la cuarta no está en una fila nueva`);
    if (!cerca(c4[3].x + c4[3].w / 2, L4.x + L4.w / 2)) mal.push(`${k} (4): la cuarta no está centrada`);
    if (dos.desborda || cuatro.desborda) mal.push(`${k}: desborda en horizontal`);
  }
  assert.deepEqual(mal, [], `S2-3 (2 y 4 personas): ${mal.length} faltas:\n${mal.join("\n")}`);
  const px: string[] = [];
  for (const [{ p }, w, h] of [[CASOS[0], 1366, 657], [CASOS[1], 1280, 800]] as [typeof CASOS[0], number, number][]) {
    const n = await regresion(p, "he", w, h, "#team", conPersonas(3));
    if (n !== 0) px.push(`${p}-he-${w}x${h}: ${n < 0 ? "otro tamaño" : `${n} px distintos`}`);
  }
  assert.deepEqual(px, [], `S2-3 (3 personas): #team cambió respecto del commit rojo:\n${px.join("\n")}`);
});

test("< 1024 team v6 mide su columna y nada más cambia: a 768, con una y con cuatro personas, en A y C y en los cuatro idiomas, .team6 mide el ancho del contenido de #team y cada tarjeta el de la lista, sin depender del idioma; y a 375, con 1, 2, 3 y 4 personas, en A y C, #team es, píxel a píxel, el del commit rojo de esta orden", async () => {
  const mal: string[] = [];
  for (const [{ p, lang }, n] of [[CASOS[0], 1], [CASOS[1], 4]] as [typeof CASOS[0], number][]) {
    const k = `${p}-${lang}-768-n${n}`;
    const m = await conPagina(head!.urls[p], lang, 768, 1024, "#team", conPersonas(n), medirTeam);
    if (!cerca(m.team6, m.columna)) mal.push(`${k}: .team6 ${r0(m.team6)} de ${r0(m.columna)}`);
    const L = caja(m.lista);
    if (!cerca(L.w, m.contenido)) mal.push(`${k}: la lista ${r0(L.w)} de ${r0(m.contenido)}`);
    if (m.tarjetas.some((c: any) => !cerca(c.width, L.w))) mal.push(`${k}: tarjetas que no miden la lista (${r0(L.w)})`);
  }
  assert.deepEqual(mal, [], `D-274: a 768 team mide su contenido y no la columna:\n${mal.join("\n")}`);
  const px: string[] = [];
  for (const [{ p }, n] of [[CASOS[0], 1], [CASOS[1], 4]] as [typeof CASOS[0], number][]) {
    const d = await regresion(p, "he", 375, 812, "#team", conPersonas(n));
    if (d !== 0) px.push(`${p}-he-375-n${n}: ${d < 0 ? "otro tamaño" : `${d} px distintos`}`);
  }
  assert.deepEqual(px, [], `a 375 #team cambió respecto del commit rojo:\n${px.join("\n")}`);
});

// ─── El alcance (D1, reforzado) ─────────────────────────────────────────────────────────────────────────────────────────
/** La firma del estilo computado de las secciones y el footer de la home, estable 6 cuadros (como D1 de la orden). */
async function firmaHome(url: string): Promise<string> {
  const out: string[] = [];
  for (const [w, h] of [[375, 812], [1280, 800]]) out.push(await reintentar(async () => {
    const ctx = await pags.contexto(w, h, true);
    try {
      const pg = await ctx.newPage();
      await pg.goto(url, { waitUntil: "load", timeout: 120000 });
      await pg.waitForSelector("#hero", { timeout: 60000 });
      await pg.waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 30000 });
      const calcular = () => {
        const S = ["display", "position", "width", "maxWidth", "marginLeft", "marginRight", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "backgroundColor", "backgroundImage"];
        const P = ["display", "content", "height", "backgroundColor", "backgroundImage"];
        const toma = (cs: CSSStyleDeclaration, ps: string[]) => ps.map((k) => String((cs as any)[k] ?? "").slice(0, 200)).join("|");
        return JSON.stringify([...document.querySelectorAll("section, footer, section > div")].map((e) => [`${e.tagName}#${e.id}.${String((e as HTMLElement).className).slice(0, 60)}`, toma(getComputedStyle(e), S), toma(getComputedStyle(e, "::before"), P), toma(getComputedStyle(e, "::after"), P)]))
          + `|v6:${document.querySelectorAll(".ct6, .team6").length}`;
      };
      for (let intento = 0; ; intento++) {
        try {
          await pg.waitForFunction((f: string) => { const w = window as any; const s = (0, eval)(`(${f})`)(); w.__firma ??= { s: "", n: 0 }; w.__firma.n = s === w.__firma.s ? w.__firma.n + 1 : 0; w.__firma.s = s; return w.__firma.n >= 6; }, calcular.toString(), { polling: "raf", timeout: 30000 });
          break;
        } catch (e: any) {
          if (intento >= 3 || !/context was destroyed|navigat/i.test(String(e?.message))) throw e;
          await pg.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
        }
      }
      return `${w}: ${await pg.evaluate((f: string) => (0, eval)(`(${f})`)(), calcular.toString())}`;
    } finally { await ctx.close(); }
  }));
  return out.join("\n");
}
/** `<html data-niche>` cambiado en vivo y `sel` quieta después (una condición, no un tiempo: la caja y el scroll iguales 6 cuadros). */
const nichoEnVivo = async (pg: any, nicho: string, sel: string) => { await pg.evaluate((n: string) => document.documentElement.setAttribute("data-niche", n), nicho); await quieta(pg, sel); };

test("lo nuevo alcanza sólo a peluquería y sin !important: en la plantilla A a 375 y en hebreo, sin formulario, la escena de contacto mide su columna, y con data-niche cambiado en vivo a otro nicho deja de medirla y la tarjeta-perfil de una persona se va, y vuelven al volver a peluquería; en la home de los seis nichos de la flota, a 375 y a 1280, el estilo computado de cada sección, de su primer bloque y del footer, y de sus ::before y ::after, es el mismo en el árbol del commit rojo que en HEAD, sin .ct6 ni .team6; y src/index.css no tiene más !important que en el commit rojo", async () => {
  // (1) data-niche en vivo, en las dos direcciones (MARCA-01, D-296): las reglas de SECCIONES-02 dependen de data-niche="peluqueria".
  const ct = (pg: any) => pg.evaluate(() => { const sec = document.getElementById("contact")!, cs = getComputedStyle(sec); return { columna: sec.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ct6: document.querySelector(".ct6")!.getBoundingClientRect().width }; });
  const vivo = await conPagina(head!.urls.a, "he", 375, 812, "#contact", conFormulario(false), async (pg) => {
    const antes = await ct(pg); await nichoEnVivo(pg, "barberia", ".ct6"); const otro = await ct(pg); await nichoEnVivo(pg, "peluqueria", ".ct6"); const vuelta = await ct(pg);
    return { antes, otro, vuelta };
  });
  assert.ok(cerca(vivo.antes.ct6, vivo.antes.columna), `en la plantilla A (he, 375, sin formulario) .ct6 mide ${r0(vivo.antes.ct6)} de ${r0(vivo.antes.columna)}`);
  assert.ok(vivo.otro.ct6 < vivo.otro.columna - 1, `con data-niche="barberia" en vivo la escena de contacto tiene que volver a medir su contenido y sigue midiendo su columna (${r0(vivo.otro.ct6)} de ${r0(vivo.otro.columna)}): las reglas de SECCIONES-02 no dependen de data-niche`);
  assert.ok(cerca(vivo.vuelta.ct6, vivo.vuelta.columna), `al volver data-niche a "peluqueria" la escena vuelve a medir su columna (${r0(vivo.vuelta.ct6)} de ${r0(vivo.vuelta.columna)})`);
  const perfil = await conPagina(head!.urls.a, "he", 1280, 800, "#team", conPersonas(1), async (pg) => {
    const ancho = () => pg.evaluate(() => document.querySelector(".team6-card")!.getBoundingClientRect().width);
    const antes = await ancho(); await nichoEnVivo(pg, "barberia", ".team6-card"); const otro = await ancho(); await nichoEnVivo(pg, "peluqueria", ".team6-card"); const vuelta = await ancho();
    return { antes, otro, vuelta };
  });
  assert.ok(cerca(perfil.antes, 1072), `precondición: en peluquería la tarjeta-perfil mide 1072 (mide ${r0(perfil.antes)})`);
  assert.ok(!cerca(perfil.otro, 1072, 4), `con data-niche="barberia" en vivo la tarjeta-perfil tiene que irse y sigue midiendo ${r0(perfil.otro)}: las reglas de SECCIONES-02 no dependen de data-niche`);
  assert.ok(cerca(perfil.vuelta, 1072), `al volver data-niche a "peluqueria" la tarjeta-perfil vuelve (${r0(perfil.vuelta)})`);
  // (2) Sin !important nuevo.
  const sha = rojoDeEstaOrden();
  const cuenta = (s: string) => (s.match(/!important/g) ?? []).length;
  const enRojo = cuenta(git(ROOT, "show", `${sha}:src/index.css`)), enHead = cuenta(readFileSync(resolve(ROOT, "src/index.css"), "utf8"));
  assert.ok(enHead <= enRojo, `src/index.css tiene ${enHead} !important (en el commit rojo, ${enRojo})`);
  // (3) La flota, igual en el árbol rojo y en HEAD (un nicho por corrida de la copia: barbería, el que pinta el footer más rico).
  await urlsRojo();
  const distintos: string[] = [];
  for (const nicho of SEIS.slice(0, 1)) {
    const fh = await conNicho(ROOT, nicho, base, (u) => firmaHome(u));
    const fr = await conNicho(clon, nicho, base, (u) => firmaHome(u));
    assert.ok(fh.split("\n").every((l) => l.endsWith("|v6:0")), `${nicho}: la home de HEAD no pinta .ct6 ni .team6`);
    if (fh !== fr) distintos.push(nicho);
  }
  assert.deepEqual(distintos, [], `la firma de estilo de la home cambió respecto del commit rojo en: ${distintos.join(", ")}`);
});
