// CONTACTO-PIE-01 · copia promovida (CIERRE-TRAMO-01, 2026-10-03, D-221) de tests/orden/contacto-pie-01/a.test.ts: A1–A3, B1–B3, C1, C2,
// D1 y E1 (T), en `test:browser`. La orden quedó aprobada por Liam el 2026-10-03 (T bcb746a · H 52a9af4) y su carpeta está congelada.
// Lo que cambia respecto de la orden congelada, y por qué:
//  - UN CASO POR PLANTILLA (D-165, D-221), declarado en `CASOS` y pasado a los instrumentos por SG_CASOS: A en móvil y en hebreo (el mapa
//    y los horarios en sentidos opuestos, el formulario, el cierre) y C en escritorio bajo y en árabe (RTL, oscuro, la tarjeta al costado).
//    Los totales que la orden fijaba (34 y 16 casos, 464/288/48 medidas de contraste) pasan a ser los de estos casos, y se afirma que todo
//    lo medido da ≥ 4,5 y que no falta ninguno. La sonda se va: la primera aserción es `estilos.mjs` sobre los casos.
//  - NINGUNA ESPERA DE TIEMPO FIJO, ni acá ni en lo que se lanza: los instrumentos son las copias editables de
//    `tests/contacto-pie-01-instrumentos/` (cada espera es una condición), no los congelados de la orden; y el cierre espera a que los dos
//    Vite terminen de cerrarse antes de borrar (la orden esperaba medio segundo).
//  - A1 COMPRUEBA QUE EL ENLACE DEL MAPA LLEVA LA DIRECCIÓN de la plantilla en el idioma de la página (`DIRECCION` de los jueces, escrita
//    a mano en la orden): la verificadora de CONTACTO-PIE-01 vio que A1 pasaba con `query=` vacío (`mut.mjs`, mutación A1), porque
//    `ct.mjs` y `juezContacto` miran sólo el prefijo del enlace.
// Nada sale a las webs desplegadas, a Firestore, a Storage ni a Vercel. No escribe fuera de su carpeta temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ORDEN, ROOT, SEIS, borrar, carpetaTemporal, clonDe, conNicho, conPlantillas, correrNodeAsync, entornoLimpio, leerJson, quitarEnlace, rojoDeEstaOrden, sinMaterial, subcarpeta, type Salida, type Urls } from "./orden/contacto-pie-01/_comun.ts";
import { DIRECCION, juezCita, juezContacto, juezContenido, juezContraste, juezPesos, juezPie, juezResumen } from "./orden/contacto-pie-01/_jueces.ts";

type Fila = Record<string, any>;
/** Un caso de A y uno de C (D-165, D-221). */
const CASOS = ["a-he-375x812", "c-ar-1366x657"];
const PL = CASOS.map((k) => k.split("-").slice(0, 2).join("-"));
const INSTRUMENTOS = resolve(ROOT, "tests", `${ORDEN}-instrumentos`);
/** El material de Storage de las plantillas: el del árbol medido, o —en un clon, donde dev-fixtures/media/ no está (ignorado)— el del
 *  T real, sólo lectura (CIERRE-TRAMO-01, D-221: la A1 de esta copia corre en un clon limpio y tiene que caer por lo que mide). */
const MEDIA = existsSync(resolve(ROOT, "dev-fixtures", "media")) ? resolve(ROOT, "dev-fixtures", "media") : "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main/dev-fixtures/media";
/** El enlace del mapa con la dirección escrita a mano en la orden (`contact-v6.tsx` arma el mismo). */
const MAPA = (p: string, lang: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DIRECCION[p][lang])}`;
/** Los selectores de contraste de la sesión de diseño (INFORME §§ 6.9 y 6.10), con los nombres de T (D-202). */
const SEL = {
  contacto: [".ct6-foot h2, .ct6-foot > div > p, .ct6-more, .ubi6-eyebrow, .ubi6-dir, .ubi6-dia, .ubi6-hoy, .ubi6-rango, .form6-desc, .form6-campo label, .form6-enviar", "#contact"],
  pie: [".pie6-linea, .pie6-h, .pie6-lista a, .pie6-copy, .pie6-legal a, .pie6-legal button", "footer"],
  cierre: [".cierre6-eyebrow, .cierre6-titulo, .cierre6-accion", "footer"],
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
  return correrNodeAsync([resolve(INSTRUMENTOS, nombre), ...args], { cwd: ROOT, minutos, env: entornoLimpio({ SG_A: u.a, SG_C: u.c, SG_RAIZ: ROOT, SG_CASOS: CASOS.join(","), SG_MEDIA: MEDIA, TEMP: tmp, TMP: tmp, TMPDIR: tmp }) });
}

const memo = new Map<string, Promise<Salida>>();
/** Corre un instrumento una sola vez por corrida; la salida y el exit quedan para los tests que lo lean. */
function medir(clave: string, nombre: string, args: (dir: string) => string[]): Promise<Salida> {
  if (!memo.has(clave)) {
    const dir = subcarpeta(base, clave);
    memo.set(clave, instrumento(nombre, args(dir), urls).then((s) => {
      assert.equal(sinMaterial(s), 0, `${nombre}: el material de Storage se responde desde dev-fixtures/media/ y no falta ningún archivo (${s.out.match(/SIN MATERIAL.*/)?.[0]})`);
      return s;
    }));
  }
  return memo.get(clave)!;
}
const json = (clave: string, archivo: string) => leerJson(join(base, clave, archivo));
const estilos = async () => { await medir("estilos", "estilos.mjs", (d) => [join(d, "estilos")]); return json("estilos", "estilos.json") as Fila[]; };
const casosDe = (s: Salida) => Number(s.out.match(/^(\d+) casos(?: \(formulario apagado\))?, con problemas/m)?.[1] ?? NaN);
/** contraste-sel en los casos de CASOS: todo lo medido ≥ 4,5 y nada sin medir. */
const contraste = async (clave: keyof typeof SEL) => {
  const [sel, seccion] = SEL[clave] as readonly string[];
  const s = await medir(`cs-${clave}`, "contraste-sel.mjs", () => [sel, seccion, "a,c", "he", "375"]);
  const medidas = s.out.split(/\r?\n/).filter((l) => /^[ac] \w\w \d+ «/.test(l)).length;
  return { ...juezContraste(s.out, medidas), medidas };
};
/** ct.mjs / pie.mjs en los casos de CASOS: los totales de la orden pasan a ser los que corrió (y al menos uno). */
const resumen = async (clave: string, nombre: string, args: string[] = []) => {
  const s = await medir(clave, nombre, () => args);
  assert.ok(casosDe(s) >= 1, `${nombre} ${args.join(" ")} corre casos de CASOS (${casosDe(s)})`);
  return juezResumen(s.out, `${nombre} ${args.join(" ")}`.trim(), casosDe(s));
};
const ct = () => resumen("ct", "ct.mjs");
const ctSinForm = () => resumen("ct-sinform", "ct.mjs", ["--sin-formulario"]);
const pie = () => resumen("pie", "pie.mjs");

test("contacto de peluquería es una variante propia (`sections.contact.variant` v6), con la dinámica de la galería —`data-dinamica` v6 en A y v7 en C—: dentro de `#contact`, «ubicación y horarios» y «contacto», cada uno un `<section>` con su h2; el mapa es una tarjeta que es un solo enlace a Google Maps con la dirección simulada de cada plantilla, calle sin número, escrita en cada idioma —el enlace lleva esa dirección—; los horarios en la tarjeta que flota sobre el mapa; el formulario sólo con `features.showInquiry`; la descripción de contacto de C es la de su catálogo; y `ct.mjs` da 0 problemas en los casos de CASOS, con y sin formulario", async () => {
  const filas = await estilos();
  assert.deepEqual(filas.map((f) => f.k).sort(), [...PL].sort(), "estilos mide la plantilla y el idioma de cada caso");
  for (const f of filas) {
    const [pl, lang] = f.k.split("-");
    assert.ok(f.ct?.existe, `${f.k}: #contact pinta la variante de peluquería (.ct6)`);
    assert.equal(f.ct.dinamica, pl === "a" ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
    assert.deepEqual(juezContenido(f), [], `${f.k}: la dirección simulada en su idioma y la descripción de C`);
    // CIERRE-TRAMO-01 (D-221): el enlace del mapa lleva la dirección (antes pasaba con `query=` vacío).
    assert.equal(f.ct.mapa?.href, MAPA(pl, lang), `${f.k}: el enlace del mapa lleva la dirección de la plantilla en ${lang}`);
  }
  assert.deepEqual(await ct(), [], "ct.mjs: 0 problemas");
  assert.deepEqual(await ctSinForm(), [], "ct.mjs --sin-formulario: 0 problemas");
});

test("contacto como en local (juez de la orden sobre `estilos.mjs`, las dos plantillas en sus casos)", async () => {
  assert.deepEqual((await estilos()).flatMap(juezContacto), [], "contacto como en local");
});

test("el contraste de contacto en el peor píxel detrás de las letras, en 3 posiciones de scroll, en los casos de CASOS: los pies, la tarjeta de horarios (eyebrow, dirección, días, «hoy» y rangos) y el formulario (descripción, etiquetas y enviar), todo ≥ 4,5", async () => {
  const c = await contraste("contacto");
  assert.ok(c.medidas > 0, `contacto: medidas (${c.medidas})`);
  assert.deepEqual(c.problemas, [], `contacto: ${c.medidas} de ${c.medidas} ≥ 4,5 (OK ${c.ok}, peor ${c.peor})`);
});

test("el pie de peluquería es una variante propia (`footer.variant` v6), la misma en A y C: el cierre (sólo con `features.showBooking`) con la escena que abre la web y reservar; y el pie, con la marca, los mismos enlaces que el navbar, el contacto y la barra legal; y `pie.mjs` da 0 problemas en los casos de CASOS", async () => {
  for (const f of await estilos()) assert.ok(f.pie?.existe, `${f.k}: el footer pinta el cierre y el pie de peluquería (.pie6)`);
  assert.deepEqual(await pie(), [], "pie.mjs: 0 problemas");
});

test("el cierre y el pie como en local (juez de la orden sobre `estilos.mjs`, las dos plantillas en sus casos)", async () => {
  assert.deepEqual((await estilos()).flatMap(juezPie), [], "el cierre y el pie como en local");
});

test("el contraste del cierre y del pie en el peor píxel detrás de las letras, en 3 posiciones de scroll, en los casos de CASOS: el pie y el cierre, todo ≥ 4,5", async () => {
  for (const k of ["pie", "cierre"] as const) {
    const c = await contraste(k);
    assert.ok(c.medidas > 0, `${k}: medidas (${c.medidas})`);
    assert.deepEqual(c.problemas, [], `${k}: ${c.medidas} de ${c.medidas} ≥ 4,5 (OK ${c.ok}, peor ${c.peor})`);
  }
});

test("los instrumentos de aceptación de diseno/contacto/verificacion y diseno/pie/verificacion, corridos sobre T en los casos de CASOS, dan lo mismo que en local: `ct.mjs` (con y sin formulario) y `pie.mjs` sin problemas, y el contraste de contacto, del pie y del cierre todo OK", async () => {
  assert.deepEqual(await ct(), [], "ct.mjs");
  assert.deepEqual(await ctSinForm(), [], "ct.mjs --sin-formulario");
  assert.deepEqual(await pie(), [], "pie.mjs");
  for (const k of ["contacto", "pie", "cierre"] as const) { const c = await contraste(k); assert.equal(c.ok, c.medidas, `contraste de ${k}: ${c.ok} de ${c.medidas}`); }
});

test("en `#contact` y en el footer de peluquería Frank Ruhl Libre se usa sólo en 300 y 500 (pendiente c de ARREGLOS-02, la última parte: contacto y pie)", async () => {
  const he = (await estilos()).filter((f) => f.k.endsWith("-he"));
  assert.ok(he.length > 0, "hay un caso en hebreo");
  assert.deepEqual(he.flatMap(juezPesos), [], "Frank Ruhl Libre sólo en 300 y 500 en #contact y en el footer");
});

test("lo nuevo alcanza sólo a peluquería: contacto «ubicación y horarios» + «contacto» y el cierre y el pie se pintan en las plantillas de peluquería; en la home de los seis nichos de la flota a 375 ninguna sección pinta `.ct6` ni `.pie6`, y el estilo computado de cada sección y del footer, y de su `::before` y `::after`, es el mismo en el árbol del commit rojo que en HEAD", async () => {
  // (1) Las plantillas pintan lo nuevo.
  for (const f of await estilos()) assert.ok(f.ct?.existe && f.pie?.existe, `${f.k}: contacto y el pie de peluquería`);
  // (2) Los seis nichos: la firma del estilo de sus secciones, igual en el árbol rojo y en HEAD, y sin lo nuevo.
  const rojo = rojoDeEstaOrden();
  assert.ok(rojo, "el commit rojo de esta orden (el último que añade su HOJA.md)");
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
      assert.equal(ahora.nuevas, 0, `${nicho}: ninguna sección pinta .ct6 ni .pie6`);
      assert.deepEqual(ahora, antes, `${nicho}: el estilo de cada sección y de su ::before/::after es el mismo en el rojo (${rojo.slice(0, 7)}) que en HEAD`);
    }
  } finally { quitarEnlace(clon); }
});

test("la cita de reseñas v6 encaja también con «transiciones lentas» (`global.transitionSpeed: \"slow\"`, que da 600 ms de transición a todas las propiedades, también a `font-size`): en A, hebreo, 375 y 1280, con y sin reduced-motion, cada cita mide el tamaño del paquete por su largo (22, 19 y 15,5 px en móvil; 32, 23 y 17 en escritorio) sin desbordar, y con «Superextraordinariamentebueno מעולה» en la primera reseña la letra de esa cita baja hasta que entra, nunca de 15; y el caso de la verificadora de TEAM-RESENAS-01 (reduced-motion, sin «transiciones lentas») sigue entrando", async () => {
  // (1) cita.mjs. Hoy, con «transiciones lentas», encajar lee el tamaño a mitad de la transición: aquí está el rojo.
  await medir("cita", "cita.mjs", (d) => [join(d, "cita")]);
  assert.deepEqual(juezCita(json("cita", "cita.json")), [], "la cita de reseñas v6 con «transiciones lentas»: los tamaños del paquete y la palabra que no entra");
});
