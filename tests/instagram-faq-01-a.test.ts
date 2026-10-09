// INSTAGRAM-FAQ-01 · copia promovida (CONTACTO-PIE-01, 2026-10-03, D-210) de tests/orden/instagram-faq-01/a.test.ts: A1–A3, B1–B3,
// C1–C3, D1, E1 y la parte (1) de E5 (T), en `test:browser`. La orden quedó aprobada por Liam el 2026-10-03 (T 392acff · H 75ede45) y
// su carpeta está congelada. Lo que cambia respecto de la orden congelada, y por qué:
//  - UN CASO POR PLANTILLA (D-165, D-210), declarado en `CASOS` y pasado a los instrumentos por SG_CASOS: A en móvil y en hebreo (la mesa
//    de faq, el abanico con el arrastre, el orden del nicho) y C en escritorio bajo y en árabe (RTL, oscuro, D17 y D20). `estilos.mjs`
//    mide de esas dos plantillas e idiomas su parte de 375 y de 1366; los totales que la orden fijaba (32 y 36 casos, 144/96/32 medidas)
//    pasan a ser los de estos casos, y se afirma que todo lo medido da ≥ 4,5 y que no falta ninguno.
//  - NINGUNA ESPERA DE TIEMPO FIJO, ni acá ni en lo que se lanza: los instrumentos son las copias editables de
//    `tests/instagram-faq-01-instrumentos/` (cada espera es una condición), no los congelados de la orden; y el cierre espera a que los dos
//    Vite terminen de cerrarse antes de borrar (la orden esperaba medio segundo).
//  - E5 sólo con su parte (1): dos nichos, cada uno en su navegador, cerrado antes del siguiente. El control de los seis contra uno solo
//    queda fuera de la copia (335 s en el pre-commit, D-210).
// Nada sale a las webs desplegadas, a Firestore, a Storage ni a Vercel. No escribe fuera de su carpeta temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ORDEN, ROOT, SEIS, borrar, carpetaTemporal, clonDe, clonLimpio, conNicho, conPlantillas, correrNode, correrNodeAsync, entornoLimpio, leerJson, quitarEnlace, rojoDeEstaOrden, sinMaterial, subcarpeta, type Salida, type Urls } from "./orden/instagram-faq-01/_comun.ts";
import { D20, juezCita, juezContraste, juezD20, juezFaq, juezIg, juezPesos, juezResumen } from "./instagram-faq-01-instrumentos/_jueces.ts";

type Fila = Record<string, any>;
/** Un caso de A y uno de C (D-165, D-210). */
const CASOS = ["a-he-375x812", "c-ar-1366x657"];
const PL = CASOS.map((k) => k.split("-").slice(0, 2).join("-"));
const INSTRUMENTOS = resolve(ROOT, "tests", `${ORDEN}-instrumentos`);
/** Los selectores de contraste de la sesión de diseño (FAQ-01 § 5, INSTAGRAM-01 § 7), con los nombres de T (D-189). */
const SEL = {
  faqPreguntas: [".faq6-qt, .faq6-foot h2, .faq6-foot > div > p, .faq6-more", "#faq"],
  // las respuestas, abiertas a la fuerza sólo para medir (como FAQ-01 § 5)
  faqRespuestas: [".faq6-hoja p", "#faq", ".faq6-a{grid-template-rows:1fr!important;visibility:visible!important}.faq6-hoja{transform:none!important}"],
  igPie: [".ig6-foot h2, .ig6-more", "#instagram"],
} as const;

// ── el arnés: dos Vite (A y C) abiertos mientras corre el archivo; cada instrumento, una vez ────────────────────────────────────
let base = "";
let urls: Urls;
let cerrar: () => void = () => {};
let cerrados: Promise<unknown> = Promise.resolve();
before(async () => {
  base = carpetaTemporal();
  await new Promise<void>((listo, fallo) => {
    cerrados = conPlantillas(base, (u) => { urls = u; listo(); return new Promise<void>((fin) => { cerrar = fin; }); }).catch(fallo);
  });
});
after(async () => { cerrar(); await cerrados; borrar(base); });

/** Un instrumento de las copias editables contra las dos plantillas, con SG_CASOS (los de CASOS), como proceso asíncrono. */
function instrumento(nombre: string, args: string[], u: Urls, minutos = 30): Promise<Salida> {
  const tmp = subcarpeta(base, `tmp-${nombre.replace(/\W+/g, "-")}-${Date.now().toString(36)}`);
  return correrNodeAsync([join(INSTRUMENTOS, nombre), ...args], { cwd: ROOT, minutos, env: entornoLimpio({ SG_A: u.a, SG_C: u.c, SG_RAIZ: ROOT, SG_CASOS: CASOS.join(","), TEMP: tmp, TMP: tmp, TMPDIR: tmp }) });
}
const memo = new Map<string, Promise<Salida>>();
function medir(clave: string, nombre: string, args: (dir: string) => string[]): Promise<Salida> {
  if (!memo.has(clave)) {
    const dir = subcarpeta(base, clave);
    memo.set(clave, instrumento(nombre, args(dir), urls).then((s) => {
      assert.equal(sinMaterial(s), 0, `${nombre}: no falta material de Storage (${s.out.match(/SIN MATERIAL.*/)?.[0]})`);
      return s;
    }));
  }
  return memo.get(clave)!;
}
const json = (clave: string, archivo: string) => leerJson(join(base, clave, archivo));
const estilos = async () => { await medir("estilos", "estilos.mjs", (d) => [join(d, "estilos")]); return json("estilos", "estilos.json") as Fila[]; };
const casosDe = (s: Salida) => Number(s.out.match(/^(\d+) casos, con problemas/m)?.[1] ?? NaN);
/** contraste-sel en los casos de CASOS: todo lo medido ≥ 4,5 y nada sin medir. */
const contraste = async (clave: keyof typeof SEL) => {
  const [sel, seccion, mutar] = SEL[clave] as readonly string[];
  const s = await medir(`cs-${clave}`, "contraste-sel.mjs", () => [sel, seccion, "a,c", "he", "375", ...(mutar ? [mutar] : [])]);
  const medidas = s.out.split(/\r?\n/).filter((l) => /^[ac] \w\w \d+ «/.test(l)).length;
  return { ...juezContraste(s.out, medidas), medidas };
};
/** faq.mjs / ig.mjs en los casos de CASOS: los totales de la orden pasan a ser los que corrió (y al menos uno por caso). */
const resumen = async (clave: string, nombre: string) => {
  const s = await medir(clave, nombre, () => []);
  assert.ok(casosDe(s) >= CASOS.length, `${nombre} corre los casos de CASOS (${casosDe(s)})`);
  return juezResumen(s.out, nombre, casosDe(s));
};

test("faq de peluquería es una variante propia, «fichas sobre la mesa» (`sections.faq.variant` v6), con la dinámica de la galería —`data-dinamica` v6 en A y v7 en C—: cada pregunta es un solo control que abre su respuesta, una por vez; y `faq.mjs` da 0 problemas en los casos de CASOS", async () => {
  const filas = await estilos();
  assert.deepEqual(filas.map((f) => f.k).sort(), [...PL].sort(), "estilos mide la plantilla y el idioma de cada caso");
  for (const f of filas) {
    assert.ok(f.faq?.existe, `${f.k}: #faq pinta la variante de peluquería (.faq6)`);
    assert.equal(f.faq.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
  }
  assert.deepEqual(await resumen("faq", "faq.mjs"), [], "faq.mjs: 0 problemas");
});

test("faq como en local (juez de la orden sobre `estilos.mjs`, las dos plantillas en sus casos)", async () => {
  assert.deepEqual((await estilos()).flatMap(juezFaq), [], "faq como en local");
});

test("el contraste de faq en el peor píxel detrás de las letras, en 3 posiciones de scroll, en los casos de CASOS: preguntas, h2, kicker y acción del pie, y las respuestas (abiertas a la fuerza para medir), todo ≥ 4,5", async () => {
  const p = await contraste("faqPreguntas");
  assert.ok(p.medidas > 0, `preguntas y pie: medidas (${p.medidas})`);
  assert.deepEqual(p.problemas, [], `preguntas y pie: ${p.medidas} de ${p.medidas} ≥ 4,5 (OK ${p.ok}, peor ${p.peor})`);
  const r = await contraste("faqRespuestas");
  assert.ok(r.medidas > 0, `respuestas: medidas (${r.medidas})`);
  assert.deepEqual(r.problemas, [], `respuestas: ${r.medidas} de ${r.medidas} ≥ 4,5 (OK ${r.ok}, peor ${r.peor})`);
});

test("instagram de peluquería es una variante propia, «abanico de polaroids» (`sections.instagram.variant` v6), en una `section` con `id=\"instagram\"` y un h2 que la nombra, con la dinámica de la galería; va entre reseñas y preguntas (`PELUQUERIA_SECTION_ORDER`); y `ig.mjs` da 0 problemas en los casos de CASOS, con el arrastre en móvil", async () => {
  for (const f of await estilos()) {
    assert.ok(f.ig?.existe, `${f.k}: #instagram pinta la variante de peluquería (.ig6)`);
    assert.equal(f.ig.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
    assert.ok(f.ig.etiqueta && f.ig.seccion === "SECTION", `${f.k}: section#instagram con su h2 (aria-labelledby)`);
    assert.match(f.ig.orden, /^hero>services>gallery>team>testimonials>instagram>faq>contact$/, `${f.k}: el orden del nicho`);
    if ("ordenClienta" in f) assert.match(f.ordenClienta, /testimonials>faq>instagram/, `${f.k}: con su sectionOrder (faq antes que instagram), la clienta conserva el suyo`);
  }
  assert.deepEqual(await resumen("ig", "ig.mjs"), [], "ig.mjs: 0 problemas");
});

test("instagram como en local (juez de la orden sobre `estilos.mjs`, las dos plantillas en sus casos)", async () => {
  assert.deepEqual((await estilos()).flatMap(juezIg), [], "instagram como en local");
});

test("el contraste del pie de instagram en el peor píxel detrás de las letras, en 3 posiciones de scroll, en los casos de CASOS: h2 y acción, todo ≥ 4,5", async () => {
  const p = await contraste("igPie");
  assert.ok(p.medidas > 0, `pie de instagram: medidas (${p.medidas})`);
  assert.deepEqual(p.problemas, [], `pie de instagram: ${p.medidas} de ${p.medidas} ≥ 4,5 (OK ${p.ok}, peor ${p.peor})`);
});

test("los instrumentos de aceptación, en los casos de CASOS, dan lo mismo que en local —`faq.mjs` e `ig.mjs` 0 problemas, el contraste de faq y del pie de instagram todo ≥ 4,5—", async () => {
  assert.deepEqual(await resumen("faq", "faq.mjs"), [], "faq.mjs: 0 problemas");
  assert.deepEqual(await resumen("ig", "ig.mjs"), [], "ig.mjs: 0 problemas");
  for (const k of ["faqPreguntas", "faqRespuestas", "igPie"] as const) assert.deepEqual((await contraste(k)).problemas, [], `contraste de ${k}`);
});

test("en `#faq` y en `#instagram` de peluquería Frank Ruhl Libre se usa sólo en 300 y 500 (en las plantillas e idiomas de CASOS que son hebreo)", async () => {
  const he = (await estilos()).filter((f) => f.k.endsWith("-he"));
  assert.ok(he.length > 0, "precondición: un caso en hebreo");
  assert.deepEqual(he.flatMap(juezPesos), [], "Frank Ruhl Libre sólo en 300 y 500 en #faq y #instagram");
});

test("D20 sólo en peluquería: en árabe, «ver toda la galería» y la acción de instagram sin cuenta dicen «استكشفي المعرض الكامل» en el caso árabe de CASOS, y en barbería, que lee el locale árabe general, sigue diciendo «استكشف المعرض الكامل»", async () => {
  const ar = (await estilos()).filter((f) => f.k.endsWith("-ar"));
  assert.ok(ar.length > 0, "precondición: un caso en árabe");
  assert.deepEqual(ar.flatMap(juezD20), [], "D20 en la galería y en instagram");
  const r = await conNicho(ROOT, "barberia", base, async (u) => instrumento("d20.mjs", [u, "barberia"], { a: u, c: u }, 5));
  assert.equal(r.status, 0, `d20.mjs barberia: exit ${r.status}\n${r.out.slice(-600)}`);
  const d = JSON.parse(r.stdout.trim().split(/\r?\n/).pop() ?? "{}");
  assert.equal(d.lang, "ar", "barbería en árabe");
  assert.ok(d.textos?.some((t: string) => t.includes(D20.flota)) && !d.textos.some((t: string) => t.includes(D20.peluqueria)), `barbería sigue diciendo «${D20.flota}» (${JSON.stringify(d.textos)})`);
});

test("lo nuevo alcanza sólo a peluquería: en la home de los seis nichos de la flota a 375 ninguna sección pinta `.faq6` ni `.ig6`, y el estilo computado de cada sección y de su `::before` y `::after` es el mismo en el árbol del commit rojo de INSTAGRAM-FAQ-01 que en HEAD", async () => {
  const rojo = rojoDeEstaOrden();
  assert.ok(rojo, "el commit rojo de INSTAGRAM-FAQ-01 (el último que añade su HOJA.md)");
  const clon = clonDe(base, "rojo", rojo);
  try {
    for (const nicho of SEIS) {
      const firma = async (raiz: string) => conNicho(raiz, nicho, base, async (u) => {
        const r = await instrumento("seis.mjs", [u, nicho], { a: u, c: u }, 5);
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

test("la cita de reseñas v6 mide lo que fija el paquete —por su largo, 22, 19 y 15,5 px en móvil y 32, 23 y 17 en escritorio, con los datos de A y de C sin desbordar— y una palabra que no entra baja la letra de esa cita hasta que entra, nunca de 15, también cuando las fuentes terminan de cargar después de montar (el caso de la verificadora de TEAM-RESENAS-01)", async () => {
  await medir("cita", "cita.mjs", (d) => [join(d, "cita")]);
  assert.deepEqual(juezCita(json("cita", "cita.json")), [], "la cita de reseñas v6: los tamaños del paquete y la palabra que no entra");
});

test("`scripts/qa-regresion-seis.mjs` captura cada nicho en un navegador propio —lanza un Chromium para cada nicho y lo cierra antes del siguiente— (con dos nichos, en un clon limpio)", async () => {
  const QA = "scripts/qa-regresion-seis.mjs";
  const preload = join(INSTRUMENTOS, "lanzamientos.mjs");
  const clon = clonLimpio(subcarpeta(base, "qa"));
  try {
    const tmp = subcarpeta(base, "tmp-qa-dos"), log = join(base, "qa-dos.jsonl");
    const r = correrNode(["--import", `file:///${preload.replace(/\\/g, "/")}`, QA, "--niches", "barberia,remodelaciones", "--out", join(base, "qa-dos")], { cwd: clon, env: entornoLimpio({ TEMP: tmp, TMP: tmp, TMPDIR: tmp, QA_LOG: log }), minutos: 15 });
    const eventos: Fila[] = existsSync(log) ? readFileSync(log, "utf8").trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
    const gotos = eventos.filter((e) => e.ev === "goto");
    const n = gotos.map((g, i) => ({ navegador: g.navegador, anteriorCerrado: i === 0 || eventos.slice(0, eventos.indexOf(g)).some((e) => e.ev === "close" && e.navegador === gotos[i - 1].navegador) }));
    assert.ok(n.length === 2 && n[0].navegador !== n[1].navegador && n[1].anteriorCerrado, `cada nicho en un navegador propio, cerrado antes del siguiente (${JSON.stringify(n)}; exit ${r.status}${n.length === 2 ? "" : `\n${r.out.slice(-1200)}`})`);
    assert.equal(r.status, 0, `${QA} --niches barberia,remodelaciones sale 0 (salió ${r.status})\n${r.out.slice(-1200)}`);
  } finally { quitarEnlace(clon); }
});
