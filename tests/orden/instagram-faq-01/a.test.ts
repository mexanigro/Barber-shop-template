// INSTAGRAM-FAQ-01 · A1–A3, B1–B3, C1–C3, D1, E1, E5 (T) · faq e instagram como en local, D20, la cita de reseñas y la regresión de los
// seis. Sesión A (2026-10-02): tests rojos.
//
// Mandato (INFORME §§ 6.7 y 6.8, CERRADOS, con los cambios de Liam después del cierre): «T tiene que quedar exactamente como está en
// local». La aceptación son los instrumentos de la sesión de diseño (`diseno/faq/verificacion` y `diseno/instagram/verificacion`),
// COPIADOS a `./instrumentos/` con cambios que no tocan lo que miden (`_nav.mjs`: la url de cada plantilla, playwright del árbol medido,
// el material de Storage desde disco y cada espera como una condición; las clases `proto-faq…`/`proto-ig…` se llaman `faq6…`/`ig6…` en
// T, D-189), más `estilos.mjs`, que mide lo que el paquete fija y ningún instrumento medía, `cita.mjs` (la cita de reseñas v6, E1),
// `seis.mjs` y `d20.mjs` (la flota) y `lanzamientos.mjs` (E5). Los jueces (`_jueces.ts`) dan 0 sobre las salidas del prototipo local
// salvo lo que la HOJA declara por encima de local (D-191). Las páginas: un Vite por plantilla en este proceso (`conPlantillas`), con su
// fixture y sin Firebase; los instrumentos corren como procesos asíncronos contra esas url.
// Todos los tests de navegador de la orden viven en este archivo: `node --test` corre en serie los tests de un archivo y en paralelo los
// archivos, y medir contraste por píxel con otro Chromium al lado es lo que no hay que hacer. Cada instrumento corre UNA vez por corrida
// (memo) y lo leen los tests que lo necesitan. La primera aserción de casi todos los tests sale de la SONDA (`estilos.mjs` sólo en
// móvil, A, hebreo y árabe, ~40 s, sin exigir el material): en el árbol rojo cae ahí, sin correr los instrumentos largos.
// Sólo en T (inciso n). Nada sale a las webs desplegadas, a Firestore, a Storage ni a Vercel. No escribe fuera de su carpeta temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, SEIS, borrar, carpetaTemporal, clonDe, clonLimpio, conNicho, conPlantillas, correrNode, entornoLimpio, instrumento, leerJson, quitarEnlace, rojoDeEstaOrden, sinMaterial, subcarpeta, type Salida, type Urls } from "./_comun.ts";
import { D20, juezCita, juezContraste, juezD20, juezFaq, juezIg, juezPesos, juezResumen } from "./_jueces.ts";

type Fila = Record<string, any>;
const LANGS = "he,en,ru,ar";
/** Los selectores de contraste de la sesión de diseño (FAQ-01 § 5, INSTAGRAM-01 § 7), con los nombres de T (D-189). */
const SEL = {
  faqPreguntas: [".faq6-qt, .faq6-foot h2, .faq6-foot > div > p, .faq6-more", "#faq"],
  // las respuestas, abiertas a la fuerza sólo para medir (como FAQ-01 § 5)
  faqRespuestas: [".faq6-hoja p", "#faq", ".faq6-a{grid-template-rows:1fr!important;visibility:visible!important}.faq6-hoja{transform:none!important}"],
  igPie: [".ig6-foot h2, .ig6-more", "#instagram"],
} as const;
/** Cuántos textos mide cada uno (medido en local el 2026-10-02; ver HOJA). */
const N = { faqPreguntas: 144, faqRespuestas: 96, igPie: 32 };

// ── el arnés: dos Vite (A y C) abiertos mientras corre el archivo; cada instrumento, una vez ────────────────────────────────────
let base = "";
let urls: Urls;
let cerrar: () => void = () => {};
before(async () => {
  base = carpetaTemporal();
  await new Promise<void>((listo, fallo) => {
    conPlantillas(base, (u) => { urls = u; listo(); return new Promise<void>((fin) => { cerrar = fin; }); }).catch(fallo);
  });
});
after(async () => { cerrar(); await new Promise((r) => setTimeout(r, 500)); borrar(base); });

const memo = new Map<string, Promise<Salida>>();
/** Corre un instrumento una sola vez por corrida; la salida y el exit quedan para los tests que lo lean. */
function medir(clave: string, nombre: string, args: (dir: string) => string[], exigirMaterial = true): Promise<Salida> {
  if (!memo.has(clave)) {
    const dir = subcarpeta(base, clave);
    memo.set(clave, instrumento(nombre, args(dir), urls, base).then((s) => {
      // la sonda no lo exige: mide lo que no depende de las fotos, y en el clon neutro del rojo dev-fixtures/media/ no está (ignorado)
      if (exigirMaterial) assert.equal(sinMaterial(s), 0, `${nombre}: el material de Storage se responde desde dev-fixtures/media/ y no falta ningún archivo (${s.out.match(/SIN MATERIAL.*/)?.[0]})`);
      return s;
    }));
  }
  return memo.get(clave)!;
}
const json = (clave: string, archivo: string) => leerJson(join(base, clave, archivo));
/** La sonda: estilos.mjs sólo en móvil, A, hebreo y árabe, sin exigir el material. */
const sonda = async () => { await medir("sonda", "estilos.mjs", (d) => [join(d, "estilos"), "he,ar", "a", "sonda"], false); return json("sonda", "estilos.json") as Fila[]; };
const estilos = async () => { await medir("estilos", "estilos.mjs", (d) => [join(d, "estilos")]); return json("estilos", "estilos.json") as Fila[]; };
const de = (filas: Fila[], k: string) => { const f = filas.find((x) => x.k === k); assert.ok(f, `sin medida para ${k}`); return f!; };
const contraste = async (clave: keyof typeof SEL) => {
  const [sel, seccion, mutar] = SEL[clave] as readonly string[];
  return juezContraste((await medir(`cs-${clave}`, "contraste-sel.mjs", () => [sel, seccion, "a,c", LANGS, "375,1280", ...(mutar ? [mutar] : [])])).out, N[clave]);
};
const faq = async () => juezResumen((await medir("faq", "faq.mjs", () => [])).out, "faq.mjs", 32);
const ig = async () => juezResumen((await medir("ig", "ig.mjs", () => [])).out, "ig.mjs", 36);

test("faq de peluquería es una variante propia, «fichas sobre la mesa» (`sections.faq.variant` v6), con la dinámica de la galería —`data-dinamica` v6 en A y v7 en C, tomada de `sections.gallery.variant`—: cada pregunta es un solo control que abre su respuesta, una por vez, también con Enter; C no promete lo que no ofrece y el árabe no dice «التجاعيد»; y `faq.mjs` da 32 de 32 sin problemas", async () => {
  // (1) La sonda. Hoy faq es la v1: aquí está el rojo.
  const s = de(await sonda(), "a-he").faq;
  assert.ok(s?.existe, `a-he: #faq pinta la variante de peluquería (.faq6) (hoy: ${JSON.stringify(s)})`);
  for (const f of await estilos()) assert.equal(f.faq.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
  // (2) faq.mjs.
  assert.deepEqual(await faq(), [], "faq.mjs: 32 de 32 sin problemas");
});

test("faq como en local: la sección arranca y termina en `--surface` con la textura en una capa propia (`--surface-alt` + la textura, con máscara) y el relleno de la galería; la mesa (lejos del centro de la pantalla la columna se recuesta desde abajo y las fichas de arriba se ven más chicas; en el centro, derechas); la ficha en `--card` con relieve y borde de acento en oscuro, la pregunta un `<button aria-expanded aria-controls>` en un h3, 16 px / 500 (17 en escritorio) con un + que no se lee, cerrada fuera del lector, abierta se acerca 16 px y las demás se alejan 10, una por vez, y el `<li>` no recibe el toque; cada rango «45–60» en `<bdi dir=\"ltr\">` sin partirse; el pie (h2 `sections.faq.title` 16/500, kicker `sections.faq.subtitle` 12 px en `--text` y la acción F-1 escrita en cada idioma a `wa.me/<teléfono>`, 15/500 y 44 px; sin teléfono, ninguna acción), con halo y en oscuro fondo radial; escritorio en 2 columnas, la segunda de A desfasada 2,5 rem y las dos de A en sentidos opuestos con el scroll, las de C alineadas y quietas; quieto con reduced-motion; y en ruso ninguna palabra de una letra con espacio común", async () => {
  // (1) La sonda.
  assert.deepEqual(juezFaq(de(await sonda(), "a-he")), [], "a-he: faq como en local (sonda)");
  // (2) Los cuatro idiomas, A y C.
  assert.deepEqual((await estilos()).flatMap(juezFaq), [], "faq como en local en A y C, cuatro idiomas");
});

test("el contraste de faq en el peor píxel detrás de las letras, en 3 posiciones de scroll, A y C, cuatro idiomas, 375 y 1280: preguntas, h2, kicker y acción del pie dan 144 de 144 ≥ 4,5, y las respuestas (abiertas a la fuerza para medir) 96 de 96", async () => {
  // (1) La sonda.
  assert.ok(de(await sonda(), "a-he").faq?.existe, "a-he: #faq pinta la variante de peluquería (sonda)");
  // (2) contraste-sel.
  const p = await contraste("faqPreguntas");
  assert.deepEqual(p.problemas, [], `preguntas y pie: ${N.faqPreguntas} de ${N.faqPreguntas} ≥ 4,5 (OK ${p.ok}, peor ${p.peor})`);
  const r = await contraste("faqRespuestas");
  assert.deepEqual(r.problemas, [], `respuestas: ${N.faqRespuestas} de ${N.faqRespuestas} ≥ 4,5 (OK ${r.ok}, peor ${r.peor})`);
});

test("instagram de peluquería es una variante propia, «abanico de polaroids» (`sections.instagram.variant` v6), en una `section` con `id=\"instagram\"` y un h2 que la nombra, con la dinámica de la galería —`data-dinamica` v6 en A y v7 en C—; va entre reseñas y preguntas (`PELUQUERIA_SECTION_ORDER`: hero, services, gallery, team, testimonials, instagram, faq, contactHub) y una clienta con su `sectionOrder` conserva el suyo; y `ig.mjs` da 36 de 36 sin problemas, con el arrastre en móvil", async () => {
  // (1) La sonda. Hoy instagram es la v1, sin id ni h2, y va después de faq: aquí está el rojo.
  const s = de(await sonda(), "a-he").ig;
  assert.ok(s?.existe, `a-he: #instagram pinta la variante de peluquería (.ig6) (hoy: ${JSON.stringify(s)})`);
  for (const f of await estilos()) {
    assert.equal(f.ig.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
    assert.ok(f.ig.etiqueta && f.ig.seccion === "SECTION", `${f.k}: section#instagram con su h2 (aria-labelledby)`);
    assert.match(f.ig.orden, /^hero>services>gallery>team>testimonials>instagram>faq>contact$/, `${f.k}: el orden del nicho`);
    if ("ordenClienta" in f) assert.match(f.ordenClienta, /testimonials>faq>instagram/, `${f.k}: con su sectionOrder (faq antes que instagram), la clienta conserva el suyo`);
  }
  // (2) ig.mjs.
  assert.deepEqual(await ig(), [], "ig.mjs: 36 de 36 sin problemas");
});

test("instagram como en local: el fondo es el velo de team sobre la foto del local con la rampa de arriba y media rampa abajo; el abanico de 6 fotos cuadradas de `clamp(200px, 56vw, 300px)` en marco de polaroid (`--card`, `--radius-ui`, relieve, pie del marco de 33 px —46 desde 600—, borde de acento en oscuro) que se abre con el scroll (apiladas a 1° al entrar, 9° —9,5° desde 600— en el centro, A con giro desparejo y C simétrico) y reserva su caída; cada foto un `<button aria-pressed>` con el alt de la pieza de galería con la misma foto (si no está en la galería, «título · n»), la imagen no arrastrable; en móvil se desliza con el dedo; las fotos de A y C son las 6 de su galería; el pie (h2 `sections.instagram.title` 16/500; sin cuenta, la acción a `/galeria` con el texto de «ver toda la galería»; con cuenta, «@cuenta» y «Instagram» a su url), con halo y en oscuro fondo radial; abierto y quieto con reduced-motion", async () => {
  // (1) La sonda.
  assert.deepEqual(juezIg(de(await sonda(), "a-he")), [], "a-he: instagram como en local (sonda)");
  // (2) Los cuatro idiomas, A y C.
  assert.deepEqual((await estilos()).flatMap(juezIg), [], "instagram como en local en A y C, cuatro idiomas");
});

test("el contraste del pie de instagram en el peor píxel detrás de las letras, en 3 posiciones de scroll, A y C, cuatro idiomas, 375 y 1280: h2 y acción dan 32 de 32 ≥ 4,5", async () => {
  // (1) La sonda.
  assert.ok(de(await sonda(), "a-he").ig?.existe, "a-he: #instagram pinta la variante de peluquería (sonda)");
  // (2) contraste-sel.
  const p = await contraste("igPie");
  assert.deepEqual(p.problemas, [], `pie de instagram: ${N.igPie} de ${N.igPie} ≥ 4,5 (OK ${p.ok}, peor ${p.peor})`);
});

test("los instrumentos de aceptación de diseno/faq/verificacion y diseno/instagram/verificacion, corridos sobre T, dan lo mismo que en local —`faq.mjs` 32 de 32, `ig.mjs` 36 de 36, el contraste de las preguntas y el pie de faq 144 de 144, el de las respuestas 96 de 96 y el del pie de instagram 32 de 32, en 3 posiciones de scroll—", async () => {
  // (1) La sonda.
  const s = de(await sonda(), "a-he");
  assert.ok(s.faq?.existe && s.ig?.existe, "a-he: faq «fichas sobre la mesa» e instagram «abanico de polaroids» (sonda)");
  // (2) Los totales, como los da local.
  assert.deepEqual(await faq(), [], "faq.mjs: 32 de 32");
  assert.deepEqual(await ig(), [], "ig.mjs: 36 de 36");
  assert.equal((await contraste("faqPreguntas")).ok, N.faqPreguntas, `contraste de las preguntas y el pie de faq: ${N.faqPreguntas} de ${N.faqPreguntas}`);
  assert.equal((await contraste("faqRespuestas")).ok, N.faqRespuestas, `contraste de las respuestas: ${N.faqRespuestas} de ${N.faqRespuestas}`);
  assert.equal((await contraste("igPie")).ok, N.igPie, `contraste del pie de instagram: ${N.igPie} de ${N.igPie}`);
});

test("en `#faq` y en `#instagram` de peluquería Frank Ruhl Libre se usa sólo en 300 y 500 (pendiente c de ARREGLOS-02, continuado sección por sección como en TEAM-RESENAS-01; contacto y pie quedan para su orden)", async () => {
  // (1) La sonda (hebreo, 375). Hoy el h2 de faq va en 700: aquí está el rojo.
  assert.deepEqual(juezPesos(de(await sonda(), "a-he")), [], "a-he: Frank Ruhl Libre sólo en 300 y 500 en #faq y #instagram");
  // (2) Las dos plantillas.
  assert.deepEqual((await estilos()).filter((f) => f.k.endsWith("-he")).flatMap(juezPesos), [], "A y C: Frank Ruhl Libre sólo en 300 y 500 en #faq y #instagram");
});

test("D20 sólo en peluquería: en árabe, «ver toda la galería» y la acción de instagram sin cuenta dicen «استكشفي المعرض الكامل» (la web le habla a la clienta en femenino) en A y en C, y en barbería, que lee el locale árabe general, sigue diciendo «استكشف المعرض الكامل»", async () => {
  // (1) La sonda (A, árabe). Hoy dice «استكشف» (masculino): aquí está el rojo.
  assert.deepEqual(juezD20(de(await sonda(), "a-ar")), [], "a-ar: D20 en la galería y en instagram (sonda)");
  // (2) A y C.
  assert.deepEqual((await estilos()).flatMap(juezD20), [], "A y C en árabe: D20 en la galería y en instagram");
  // (3) La otra dirección: barbería en árabe no cambia.
  const r = await conNicho(ROOT, "barberia", base, async (u) => instrumento("d20.mjs", [u, "barberia"], { a: u, c: u }, base, 5));
  assert.equal(r.status, 0, `d20.mjs barberia: exit ${r.status}\n${r.out.slice(-600)}`);
  const d = JSON.parse(r.stdout.trim().split(/\r?\n/).pop() ?? "{}");
  assert.equal(d.lang, "ar", "barbería en árabe");
  assert.ok(d.textos?.some((t: string) => t.includes(D20.flota)) && !d.textos.some((t: string) => t.includes(D20.peluqueria)), `barbería sigue diciendo «${D20.flota}» (${JSON.stringify(d.textos)})`);
});

test("lo nuevo alcanza sólo a peluquería: faq «fichas sobre la mesa» e instagram «abanico de polaroids» se pintan en las plantillas de peluquería; en la home de los seis nichos de la flota a 375 ninguna sección pinta `.faq6` ni `.ig6`, y el estilo computado de cada sección y de su `::before` y `::after` es el mismo en el árbol del commit rojo que en HEAD", async () => {
  // (1) La sonda.
  const s = de(await sonda(), "a-he");
  assert.ok(s.faq?.existe && s.ig?.existe, "a-he: faq e instagram de peluquería (sonda)");
  // (2) Los seis nichos: la firma del estilo de sus secciones, igual en el árbol rojo y en HEAD, y sin lo nuevo.
  const rojo = rojoDeEstaOrden();
  assert.ok(rojo, "el commit rojo de esta orden (el último que añade su HOJA.md)");
  const clon = clonDe(base, "rojo", rojo);
  try {
    for (const nicho of SEIS) {
      const firma = async (raiz: string) => conNicho(raiz, nicho, base, async (u) => {
        const r = await instrumento("seis.mjs", [u, nicho], { a: u, c: u }, base, 5);
        assert.equal(r.status, 0, `seis.mjs ${nicho} (${raiz === ROOT ? "HEAD" : "rojo"}): exit ${r.status}\n${r.out.slice(-600)}`);
        return r.stdout.trim().split(/\r?\n/).pop() ?? "";
      });
      const antes = JSON.parse(await firma(clon)), ahora = JSON.parse(await firma(ROOT));
      assert.ok(antes.secciones > 0, `${nicho}: la home tiene secciones`);
      assert.equal(ahora.nuevas, 0, `${nicho}: ninguna sección pinta .faq6 ni .ig6`);
      assert.deepEqual(ahora, antes, `${nicho}: el estilo de cada sección y de su ::before/::after es el mismo en el rojo (${rojo.slice(0, 7)}) que en HEAD`);
    }
  } finally { quitarEnlace(clon); }
});

test("la cita de reseñas v6 mide lo que fija el paquete —por su largo, 22, 19 y 15,5 px en móvil y 32, 23 y 17 en escritorio, con los datos de A y de C sin desbordar— y una palabra que no entra baja la letra de esa cita hasta que entra, nunca de 15, también cuando las fuentes terminan de cargar después de montar: con «Superextraordinariamentebueno מעולה» en la primera reseña de A (el caso de la verificadora de TEAM-RESENAS-01), hebreo, 375 y 1280, reduced-motion, la cita no desborda", async () => {
  // (1) cita.mjs. Hoy, ya cargadas las fuentes, la cita queda en 22 y 32 px desbordando: aquí está el rojo.
  await medir("cita", "cita.mjs", (d) => [join(d, "cita")]);
  assert.deepEqual(juezCita(json("cita", "cita.json")), [], "la cita de reseñas v6: los tamaños del paquete y la palabra que no entra");
});

test("`scripts/qa-regresion-seis.mjs` captura cada nicho en un navegador propio —lanza un Chromium para cada nicho y lo cierra antes del siguiente—, y en un clon limpio del mismo árbol la captura de un nicho es la misma corrida con los seis que corrida sola (remodelaciones, hero y services, idénticas o 0 px)", async () => {
  const QA = "scripts/qa-regresion-seis.mjs";
  const preload = resolve(ROOT, "tests/orden/instagram-faq-01/instrumentos/lanzamientos.mjs");
  const clon = clonLimpio(subcarpeta(base, "qa"));
  try {
    const correr = (nichos: string, out: string, extra: string[] = []) => {
      const tmp = subcarpeta(base, `tmp-qa-${out}`), log = join(base, `qa-${out}.jsonl`);
      const r = correrNode(["--import", `file:///${preload.replace(/\\/g, "/")}`, QA, "--niches", nichos, "--out", join(base, `qa-${out}`), ...extra], { cwd: clon, env: entornoLimpio({ TEMP: tmp, TMP: tmp, TMPDIR: tmp, QA_LOG: log }), minutos: 15 });
      const eventos = existsSync(log) ? readFileSync(log, "utf8").trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
      return { r, eventos };
    };
    /** Por cada nicho capturado, el navegador en que se abrió y si el anterior ya estaba cerrado. */
    const navegadores = (eventos: Fila[]) => {
      const gotos = eventos.filter((e) => e.ev === "goto");
      return gotos.map((g, i) => ({ navegador: g.navegador, anteriorCerrado: i === 0 || eventos.slice(0, eventos.indexOf(g)).some((e) => e.ev === "close" && e.navegador === gotos[i - 1].navegador) }));
    };
    // (1) Dos nichos: cada uno en su navegador, cerrado antes del siguiente. Hoy los seis comparten el mismo: aquí está el rojo.
    const dos = correr("barberia,remodelaciones", "dos");
    const n = navegadores(dos.eventos);
    assert.ok(n.length === 2 && n[0].navegador !== n[1].navegador && n[1].anteriorCerrado, `cada nicho en un navegador propio, cerrado antes del siguiente (hoy: ${JSON.stringify(n)}; exit ${dos.r.status}${n.length === 2 ? "" : `\n${dos.r.out.slice(-1200)}`})`);
    assert.equal(dos.r.status, 0, `${QA} --niches barberia,remodelaciones sale 0 (salió ${dos.r.status})\n${dos.r.out.slice(-1200)}`);
    // (2) El control: el mismo árbol, con los seis y con remodelaciones sola, da las mismas capturas de remodelaciones.
    const seis = correr("barberia,estetica,tattoo,nails,cafeteria,remodelaciones", "seis");
    assert.equal(seis.r.status, 0, `${QA} con los seis sale 0\n${seis.r.out.slice(-1200)}`);
    assert.equal(new Set(navegadores(seis.eventos).map((x) => x.navegador)).size, 6, "con los seis, seis navegadores");
    const sola = correr("remodelaciones", "sola", ["--baseline", join(base, "qa-seis")]);
    assert.equal(sola.r.status, 0, `${QA} con remodelaciones sola sale 0\n${sola.r.out.slice(-1200)}`);
    for (const toma of ["hero", "services"]) {
      const linea = sola.r.out.split(/\r?\n/).find((l) => l.startsWith(`remodelaciones-${toma}:`)) ?? "";
      assert.match(linea, /IDÉNTICO \(bytes\)| 0 px distintos /, `remodelaciones-${toma}: con los seis y sola, la misma captura («${linea}»)`);
    }
  } finally { quitarEnlace(clon); }
});
