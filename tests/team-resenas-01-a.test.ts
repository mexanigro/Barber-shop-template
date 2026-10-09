// TEAM-RESENAS-01 · copia promovida (INSTAGRAM-FAQ-01, 2026-10-02, D-200) de tests/orden/team-resenas-01/a.test.ts: A1–A3, B1–B3, C1, C2,
// D1 (T), en `test:browser`. La orden quedó aprobada por Liam el 2026-10-02 (T 471d2be · H dab461c) y su carpeta está congelada. Lo que
// cambia respecto de la orden congelada, y por qué:
//  - UN CASO POR PLANTILLA (D-165, D-200), declarado en `CASOS` y pasado a los instrumentos por SG_CASOS: A en móvil y en hebreo (las
//    tarjetas de team en dos capas, el zigzag de A, la mezcla de idiomas de reseñas) y C en escritorio bajo y en árabe (RTL, oscuro, la
//    descripción de team de D-187 y D17). `estilos.mjs` mide de esas dos plantillas e idiomas su parte de 375 y de 1366; los totales que
//    la orden fijaba (32 casos, 288/64/508/56 medidas) pasan a ser los de estos casos.
//  - EL JUEZ DE LA CITA FIJA LOS TAMAÑOS DEL PAQUETE (verificadora de TEAM-RESENAS-01, d1): con los datos de A y de C ninguna cita
//    desborda y cada una mide exactamente lo de su largo, en móvil y en escritorio (`TAMANO`, de diseno/resenas/prototipo/proto.css). El
//    juez congelado aceptaba cualquier valor entre 15 y la base y no tenía escritorio.
//  - NINGUNA ESPERA DE TIEMPO FIJO, ni acá ni en lo que se lanza: los instrumentos son las copias editables de
//    `tests/team-resenas-01-instrumentos/` (cada espera es una condición), no los congelados de la orden; y el cierre espera a que los dos
//    Vite terminen de cerrarse antes de borrar.
//  - Las tarjetas de team se miden en el caso de móvil (en escritorio la frase de la tarjeta no se pinta: no hay letra que medir).
// Nada sale a las webs desplegadas, a Firestore, a Storage ni a Vercel. No escribe fuera de su carpeta temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ORDEN, ROOT, SEIS, borrar, carpetaTemporal, clonDe, conNicho, conPlantillas, correrNodeAsync, entornoLimpio, leerJson, quitarEnlace, rojoDeEstaOrden, sinMaterial, subcarpeta, type Salida, type Urls } from "./orden/team-resenas-01/_comun.ts";
import { juezContraste, juezEncaje, juezPesos, juezResenas, juezResumen, juezTeam, juezVerificar } from "./team-resenas-01-instrumentos/_jueces.ts";

type Fila = Record<string, any>;
/** Un caso de A y uno de C (D-165, D-200). */
const CASOS = ["a-he-375x812", "c-ar-1366x657"];
const PL = CASOS.map((k) => k.split("-").slice(0, 2).join("-"));
const MOVIL = CASOS.filter((k) => Number(k.split("-")[2].split("x")[0]) < 1024);
const INSTRUMENTOS = resolve(ROOT, "tests", `${ORDEN}-instrumentos`);
/** Los selectores de contraste de la sesión de diseño (TEAM-01 § 3-ter, RESENAS-01 § 6), con los nombres de T (D-173). */
const SEL = {
  tarjetas: ".team6-name, .team6-role, .team6-tag, .team6-cue",
  pie: ".team6-foot h2, .team6-foot p, .team6-book, .team6-desc",
  resenas: ".res6-quote p, .res6-who, .res6-svc, .res6-stars, .res6-note, .res6-foot h2, .res6-foot > div > p, .res6-agg",
  estrellas: ".res6-stars, .res6-avg",
};
/** Los tamaños de la cita que fija el paquete de reseñas (diseno/resenas/prototipo/proto.css), por largo, en móvil y en escritorio. */
const TAMANO = { movil: { corto: 22, medio: 19, largo: 15.5 }, escritorio: { corto: 32, medio: 23, largo: 17 } } as const;

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

/** Un instrumento de las copias editables contra las dos plantillas, con SG_CASOS (por defecto los de CASOS), como proceso asíncrono. */
function instrumento(nombre: string, args: string[], u: Urls, casos = CASOS, minutos = 30): Promise<Salida> {
  const tmp = subcarpeta(base, `tmp-${nombre.replace(/\W+/g, "-")}-${Date.now().toString(36)}`);
  return correrNodeAsync([join(INSTRUMENTOS, nombre), ...args], { cwd: ROOT, minutos, env: entornoLimpio({ SG_A: u.a, SG_C: u.c, SG_RAIZ: ROOT, SG_CASOS: casos.join(","), TEMP: tmp, TMP: tmp, TMPDIR: tmp }) });
}
const memo = new Map<string, Promise<Salida>>();
function medir(clave: string, nombre: string, args: (dir: string) => string[], casos = CASOS): Promise<Salida> {
  if (!memo.has(clave)) {
    const dir = subcarpeta(base, clave);
    memo.set(clave, instrumento(nombre, args(dir), urls, casos).then((s) => {
      assert.equal(sinMaterial(s), 0, `${nombre}: no falta material de Storage (${s.out.match(/SIN MATERIAL.*/)?.[0]})`);
      return s;
    }));
  }
  return memo.get(clave)!;
}
const json = (clave: string, archivo: string) => leerJson(join(base, clave, archivo));
const estilos = async () => { await medir("estilos", "estilos.mjs", (d) => [join(d, "estilos")]); return json("estilos", "estilos.json") as Fila[]; };
const de = (filas: Fila[], k: string) => { const f = filas.find((x) => x.k === k); assert.ok(f, `sin medida para ${k}`); return f!; };
/** Los jueces de la orden fijan sus totales (32 casos): acá el total es el de CASOS, y se afirma aparte. */
const sinTotal = (problemas: string[]) => problemas.filter((p) => !/\(32\)$|sus 32 casos/.test(p));
/** contraste-sel en los casos dados: todo lo medido ≥ 4,5 y nada sin medir; devuelve el juez y cuántas midió. */
const contraste = async (clave: keyof typeof SEL, casos = CASOS) => {
  const s = await medir(`cs-${clave}`, "contraste-sel.mjs", () => [SEL[clave], clave === "tarjetas" || clave === "pie" ? "#team" : "#testimonials", "a,c", "he", "375"], casos);
  const medidas = s.out.split(/\r?\n/).filter((l) => /^[ac] \w\w \d+ «/.test(l)).length;
  return { ...juezContraste(s.out, medidas), medidas };
};
const team = async () => sinTotal(juezResumen((await medir("team", "team.mjs", (d) => [d])).out, "team.mjs"));
const resenas = async () => sinTotal(juezResumen((await medir("resenas", "resenas.mjs", () => [])).out, "resenas.mjs"));
const casosDe = (s: Salida) => Number(s.out.match(/^(\d+) casos, con problemas/m)?.[1] ?? NaN);

/** ¿El catálogo de la plantilla trae frase de services en ese idioma? (para el juez de services: A sí, C no). */
const fixture = (p: "a" | "c") => JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures", `peluqueria-paleta-${p}.json`), "utf8"));
const conFrase = (p: string, lang: string) => {
  const fx = fixture(p as "a" | "c");
  if (lang === "he") return fx.services.some((s: Fila) => (s.description ?? "").trim());
  return Object.values(fx.translations?.[lang]?.services ?? {}).some((x: any) => (x?.description ?? "").trim());
};
/** La cita de cada pieza mide exactamente lo de su largo y no desborda, en móvil (375) y en escritorio (1366). */
function juezCita(f: Fila): string[] {
  const m: string[] = [];
  const piezas: Fila[] = f.resenas?.piezas ?? [];
  if (!piezas.length) m.push("móvil: no hay piezas");
  for (const [i, x] of piezas.entries()) {
    const base = (TAMANO.movil as Record<string, number>)[x.largo];
    if (x.cita?.letra !== base || x.cita?.desborda !== false) m.push(`móvil: cita ${i + 1} (${x.largo}) en ${x.cita?.letra} px${x.cita?.desborda ? " desbordando" : ""} (el paquete: ${base} px)`);
  }
  const esc: Fila[] = f.citasEscritorio ?? [];
  if (!esc.length) m.push("escritorio: no hay piezas");
  for (const [i, x] of esc.entries()) {
    const base = (TAMANO.escritorio as Record<string, number>)[x.largo];
    if (x.letra !== base || x.desborda !== false) m.push(`escritorio: cita ${i + 1} (${x.largo}) en ${x.letra} px${x.desborda ? " desbordando" : ""} (el paquete: ${base} px)`);
  }
  return m.map((x) => `${f.k}: ${x}`);
}

test("team de peluquería es una variante propia (`sections.team.variant` v6) con la dinámica de la galería —`data-dinamica` v6 en A y v7 en C, tomada de `sections.gallery.variant`—: la tarjeta es un solo control, el enlace a `/equipo/<slug>` con el nombre accesible «nombre · especialidad · team.viewProfile» en el idioma de la página; la frase de la tarjeta móvil es la primera oración de la bio y va en todas o en ninguna (CT-2); y `team.mjs` da 0 problemas en los casos de CASOS", async () => {
  const filas = await estilos();
  assert.deepEqual(filas.map((f) => f.k).sort(), [...PL].sort(), "estilos mide la plantilla y el idioma de cada caso");
  for (const f of filas) {
    assert.ok(f.team?.existe, `${f.k}: #team pinta la variante de peluquería (.team6)`);
    assert.equal(f.team.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
    for (const c of f.team.tarjetas) assert.equal(c.label, c.esperado, `${f.k}: el nombre accesible de la tarjeta`);
  }
  assert.equal(casosDe(await medir("team", "team.mjs", (d) => [d])), CASOS.length, "team.mjs corre los casos de CASOS");
  assert.deepEqual(await team(), [], "team.mjs: 0 problemas");
});

test("team como en local (juez de la orden sobre `estilos.mjs`, las dos plantillas en sus casos) y la descripción árabe de team, la corregida (D17)", async () => {
  const filas = await estilos();
  assert.deepEqual(filas.flatMap(juezTeam), [], "team como en local");
  const esperada = JSON.parse(readFileSync(resolve(ROOT, "tests/orden/team-resenas-01/d17-ar.json"), "utf8")).description;
  for (const k of PL.filter((x) => x.endsWith("-ar"))) assert.equal(de(filas, k).descripcionAr, esperada, `${k}: la descripción de team en árabe es la corregida (D17: «rizos», no «arrugas»)`);
  assert.ok(PL.some((x) => x.endsWith("-ar")), "precondición: un caso en árabe (D17, D-187)");
});

test("el contraste de team en el peor píxel detrás de las letras, en 3 posiciones de scroll: nombre, especialidad, frase y «perfil» de las tarjetas en el caso de móvil y el pie y la descripción en los dos casos, todo ≥ 4,5", async () => {
  const t = await contraste("tarjetas", MOVIL);
  assert.ok(t.medidas >= 12, `tarjetas: medidas en el caso de móvil (${t.medidas})`);
  assert.deepEqual(t.problemas, [], `tarjetas: ${t.medidas} de ${t.medidas} ≥ 4,5 (OK ${t.ok}, peor ${t.peor})`);
  const p = await contraste("pie");
  assert.ok(p.medidas >= 4 * CASOS.length, `pie y descripción: medidos en los dos casos (${p.medidas})`);
  assert.deepEqual(p.problemas, [], `pie y descripción: ${p.medidas} de ${p.medidas} ≥ 4,5 (OK ${p.ok}, peor ${p.peor})`);
});

test("reseñas de peluquería son «voces en collage», una variante propia (`sections.testimonials.variant` v6) con la dinámica de la galería: todas las reseñas pintadas, ninguna pieza fuera de su columna ni encima de otra, ninguna palabra que no entre, el promedio igual al de los datos, nota sólo si hay traducción y «ver originales» ida y vuelta; y `resenas.mjs` da 0 problemas en los casos de CASOS", async () => {
  for (const f of await estilos()) {
    assert.ok(f.resenas?.existe, `${f.k}: #testimonials pinta las voces en collage (.res6)`);
    assert.equal(f.resenas.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
  }
  assert.equal(casosDe(await medir("resenas", "resenas.mjs", () => [])), CASOS.length, "resenas.mjs corre los casos de CASOS");
  assert.deepEqual(await resenas(), [], "resenas.mjs: 0 problemas");
});

test("reseñas como en local (juez de la orden sobre `estilos.mjs`) y la cita en el tamaño que fija el paquete: con los datos de A y de C, cada cita mide exactamente lo de su largo —22, 19 y 15,5 px en móvil; 32, 23 y 17 en escritorio— y ninguna desborda", async () => {
  const filas = await estilos();
  assert.deepEqual(filas.flatMap(juezResenas), [], "reseñas como en local");
  assert.deepEqual(filas.flatMap(juezCita), [], "la cita en los tamaños del paquete, sin desbordar, en móvil y en escritorio");
});

test("el contraste de reseñas en el peor píxel detrás de las letras, en 3 posiciones de scroll: citas, nombre, servicio, estrellas, nota, pie y promedio en los dos casos, y las estrellas y el promedio de C (en `--highlight`), todo ≥ 4,5", async () => {
  const r = await contraste("resenas");
  assert.ok(r.medidas > 0, `reseñas: medidas (${r.medidas})`);
  assert.deepEqual(r.problemas, [], `reseñas: ${r.medidas} de ${r.medidas} ≥ 4,5 (OK ${r.ok}, peor ${r.peor})`);
  const e = await contraste("estrellas", CASOS.filter((k) => k.startsWith("c")));
  assert.ok(e.medidas > 0, `estrellas de C: medidas (${e.medidas})`);
  assert.deepEqual(e.problemas, [], `estrellas y promedio de C: ${e.medidas} de ${e.medidas} ≥ 4,5 (OK ${e.ok}, peor ${e.peor})`);
});

test("los instrumentos de aceptación, en los casos de CASOS, dan lo mismo que en local —`team.mjs` y `resenas.mjs` 0 problemas, el contraste de team y de reseñas todo ≥ 4,5—, `encaje` da 0 problemas de texto en team y testimonials y services sigue en 0 fallas (`verificar-proto`)", async () => {
  assert.deepEqual(await team(), [], "team.mjs: 0 problemas");
  assert.deepEqual(await resenas(), [], "resenas.mjs: 0 problemas");
  for (const [clave, casos] of [["tarjetas", MOVIL], ["pie", CASOS], ["resenas", CASOS]] as const) assert.deepEqual((await contraste(clave, casos)).problemas, [], `contraste de ${clave}`);
  const e = await medir("encaje", "encaje.mjs", (d) => [d]);
  assert.match(e.out, new RegExp(`TOTAL \\d+ en ${CASOS.length} casos`), "encaje corre los casos de CASOS");
  assert.deepEqual(sinTotal(juezEncaje(e.out)), [], "encaje: 0 problemas de texto en team y testimonials");
  await medir("vp", "verificar-proto.mjs", (d) => [d]);
  const vp = json("vp", "verificacion.json") as Fila[];
  assert.deepEqual(vp.map((f) => f.k).sort(), [...CASOS].sort(), "verificar-proto corre los casos de CASOS");
  assert.deepEqual(sinTotal(juezVerificar(vp, conFrase)), [], "services sigue en 0 fallas (verificar-proto)");
});

test("en `#team` y `#testimonials` de peluquería Frank Ruhl Libre se usa sólo en 300 y 500 (en las plantillas e idiomas de CASOS que son hebreo)", async () => {
  const he = (await estilos()).filter((f) => f.k.endsWith("-he"));
  assert.ok(he.length > 0, "precondición: un caso en hebreo");
  assert.deepEqual(he.flatMap(juezPesos), [], "Frank Ruhl Libre sólo en 300 y 500 en #team y #testimonials");
});

test("lo nuevo alcanza sólo a peluquería: en la home de los seis nichos de la flota a 375 ninguna sección pinta `.team6` ni `.res6`, y el estilo computado de cada sección y de su `::before` y `::after` es el mismo en el árbol del commit rojo de TEAM-RESENAS-01 que en HEAD", async () => {
  const rojo = rojoDeEstaOrden();
  assert.ok(rojo, "el commit rojo de TEAM-RESENAS-01 (el último que añade su HOJA.md)");
  const clon = clonDe(base, "rojo", rojo);
  try {
    for (const nicho of SEIS) {
      const firma = async (raiz: string) => conNicho(raiz, nicho, base, async (u) => {
        const r = await instrumento("seis.mjs", [u, nicho], { a: u, c: u }, CASOS, 5);
        assert.equal(r.status, 0, `seis.mjs ${nicho} (${raiz === ROOT ? "HEAD" : "rojo"}): exit ${r.status}\n${r.out.slice(-600)}`);
        return r.stdout.trim().split(/\r?\n/).pop() ?? "";
      });
      const antes = JSON.parse(await firma(clon)), ahora = JSON.parse(await firma(ROOT));
      assert.ok(antes.secciones > 0, `${nicho}: la home tiene secciones`);
      assert.equal(ahora.nuevas, 0, `${nicho}: ninguna sección pinta .team6 ni .res6`);
      assert.deepEqual(ahora, antes, `${nicho}: el estilo de cada sección y de su ::before/::after es el mismo en el rojo (${rojo.slice(0, 7)}) que en HEAD`);
    }
  } finally { quitarEnlace(clon); }
});
