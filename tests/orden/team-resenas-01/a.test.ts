// TEAM-RESENAS-01 · A1–A3, B1–B3, C1, C2, D1 (T) · team v6 y reseñas «voces en collage» como en local. Sesión A (2026-10-01): tests
// rojos.
//
// Mandato (INFORME §§ 6.5 y 6.6, CERRADOS): «T tiene que quedar exactamente como está en local» (`diseno/ver-prototipo.ps1`, A :4101,
// C :4103, prototipos services + galería + team + reseñas). La aceptación son los instrumentos de la sesión de diseño
// (`diseno/team/verificacion`, `diseno/resenas/verificacion` y, para «services sigue en 32/32» y «encaje», `diseno/services/verificacion`),
// COPIADOS a `./instrumentos/` con cambios que no tocan lo que miden (`_nav.mjs`: la url de cada plantilla, playwright del árbol
// medido, el material de Storage desde disco; y las clases `proto-team…`/`proto-res…` se llaman `team6…`/`res6…` en T, D-173), más
// `estilos.mjs`, que mide lo que el paquete fija y ningún instrumento medía. Los jueces (`_jueces.ts`) dan 0 sobre las salidas del
// prototipo local (medido por A el 2026-10-01, en la HOJA). Las páginas: un Vite por plantilla en este proceso (`conPlantillas`), con su
// fixture y sin Firebase; los instrumentos corren como procesos asíncronos contra esas url.
// Todos los tests de navegador de la orden viven en este archivo: `node --test` corre en serie los tests de un archivo y en paralelo los
// archivos, y medir contraste por píxel con otro Chromium al lado es lo que no hay que hacer. Cada instrumento corre UNA vez por corrida
// (memo) y lo leen los tests que lo necesitan. La primera aserción de cada test sale de la SONDA (`estilos.mjs` sólo en hebreo, ~1 min,
// sin exigir el material): en el árbol rojo cae ahí, sin correr los instrumentos largos.
// Sólo en T (inciso n). Nada sale a las webs desplegadas, a Firestore, a Storage ni a Vercel. No escribe fuera de su carpeta temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, SEIS, borrar, carpetaTemporal, clonDe, conNicho, conPlantillas, instrumento, leerJson, quitarEnlace, rojoDeEstaOrden, sinMaterial, subcarpeta, type Salida, type Urls } from "./_comun.ts";
import { juezContraste, juezEncaje, juezPesos, juezResenas, juezResumen, juezTeam, juezVerificar } from "./_jueces.ts";

type Fila = Record<string, any>;
const LANGS = "he,en,ru,ar";
/** Los selectores de contraste de la sesión de diseño (TEAM-01 § 3-ter, RESENAS-01 § 6), con los nombres de T (D-173). */
const SEL = {
  tarjetas: ".team6-name, .team6-role, .team6-tag, .team6-cue",
  pie: ".team6-foot h2, .team6-foot p, .team6-book, .team6-desc",
  resenas: ".res6-quote p, .res6-who, .res6-svc, .res6-stars, .res6-note, .res6-foot h2, .res6-foot > div > p, .res6-agg",
  estrellas: ".res6-stars, .res6-avg",
};
/** Cuántos textos mide cada uno (medido en local el 2026-10-01; ver HOJA). */
const N = { tarjetas: 288, pie: 64, resenas: 508, estrellas: 56 };

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
/** La sonda: estilos.mjs sólo en hebreo, sin exigir el material. */
const sonda = async () => { await medir("sonda", "estilos.mjs", (d) => [join(d, "estilos"), "he"], false); return json("sonda", "estilos.json") as Fila[]; };
const estilos = async () => { await medir("estilos", "estilos.mjs", (d) => [join(d, "estilos")]); return json("estilos", "estilos.json") as Fila[]; };
const de = (filas: Fila[], k: string) => { const f = filas.find((x) => x.k === k); assert.ok(f, `sin medida para ${k}`); return f!; };
const contraste = async (clave: keyof typeof SEL, plantillas = "a,c", anchos = "375,1280") =>
  juezContraste((await medir(`cs-${clave}`, "contraste-sel.mjs", () => [SEL[clave], clave.startsWith("t") || clave === "pie" ? "#team" : "#testimonials", plantillas, LANGS, anchos])).out, N[clave]);
const team = async () => juezResumen((await medir("team", "team.mjs", (d) => [d])).out, "team.mjs");
const resenas = async () => juezResumen((await medir("resenas", "resenas.mjs", () => [])).out, "resenas.mjs");

/** ¿El catálogo de la plantilla trae frase de services en ese idioma? (para el juez de services: A sí, C no). */
const fixture = (p: "a" | "c") => JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures", `peluqueria-paleta-${p}.json`), "utf8"));
const conFrase = (p: string, lang: string) => {
  const fx = fixture(p as "a" | "c");
  if (lang === "he") return fx.services.some((s: Fila) => (s.description ?? "").trim());
  return Object.values(fx.translations?.[lang]?.services ?? {}).some((x: any) => (x?.description ?? "").trim());
};

test("team de peluquería es una variante propia (`sections.team.variant` v6) con la dinámica de la galería —`data-dinamica` v6 en A y v7 en C, tomada de `sections.gallery.variant`—: la tarjeta es un solo control, el enlace a `/equipo/<slug>` con el nombre accesible «nombre · especialidad · team.viewProfile» en el idioma de la página; la frase de la tarjeta móvil es la primera oración de la bio y va en todas o en ninguna (CT-2); y `team.mjs` da 32 de 32 sin problemas", async () => {
  // (1) La sonda. Hoy team es la v1: aquí está el rojo.
  const s = de(await sonda(), "a-he").team;
  assert.ok(s?.existe, `a-he: #team pinta la variante de peluquería (.team6) (hoy: ${JSON.stringify(s)})`);
  for (const f of await estilos()) {
    assert.equal(f.team.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
    for (const c of f.team.tarjetas) assert.equal(c.label, c.esperado, `${f.k}: el nombre accesible de la tarjeta`);
  }
  // (2) team.mjs.
  assert.deepEqual(await team(), [], "team.mjs: 32 de 32 sin problemas");
});

test("team como en local: el pie abajo (h2 `sections.team.subtitle` 16 px/500, kicker `sections.team.title` 12 px en `--text`, una sola acción de texto «reservar» de 44 px que abre el wizard y debajo `sections.team.description` de 40 rem), halo tonal y en oscuro fondo radial; el fondo como services (el velo de services, la rampa de arriba y media rampa abajo, 24 px arriba y media rampa + 2 rem abajo); en móvil la foto en dos capas (extensión desenfocada de 16 px y retrato del 60 % con máscara desde el 55 %), scrim, letra en `--on-scrim` 17/13/13 px, el texto al borde de afuera con 28 px del lado de la foto y 16 del de afuera, zigzag en A y la foto del mismo lado en C; en escritorio 3 columnas, retrato 4:5 con `50% 22%`, la del centro de A desfasada 2,5 rem y el bloque de `min(72rem, (100svh − 6,5rem − 15rem − desfase) × 2,4 + 8rem)`; quieto con reduced-motion; en ruso ninguna palabra de una letra con espacio común; y la descripción árabe de team, la corregida (D17)", async () => {
  // (1) La sonda.
  assert.deepEqual(juezTeam(de(await sonda(), "a-he")), [], "a-he: team como en local (sonda)");
  // (2) Los cuatro idiomas.
  const filas = await estilos();
  assert.deepEqual(filas.flatMap(juezTeam), [], "team como en local en A y C, cuatro idiomas");
  const esperada = JSON.parse(readFileSync(resolve(ROOT, "tests/orden/team-resenas-01/d17-ar.json"), "utf8")).description;
  for (const p of ["a", "c"]) assert.equal(de(filas, `${p}-ar`).descripcionAr, esperada, `${p}-ar: la descripción de team en árabe es la corregida (D17: «rizos», no «arrugas»)`);
});

test("el contraste de team en el peor píxel detrás de las letras, en 3 posiciones de scroll, A y C, cuatro idiomas: nombre, especialidad, frase y «perfil» de las tarjetas a 375, 400 y 768 dan 288 de 288 ≥ 4,5, y el pie y la descripción a 375 y 1280 dan 64 de 64 ≥ 4,5", async () => {
  // (1) La sonda.
  assert.ok(de(await sonda(), "a-he").team?.existe, "a-he: #team pinta la variante de peluquería (sonda)");
  // (2) contraste-sel.
  const t = await contraste("tarjetas", "a,c", "375,400,768");
  assert.deepEqual(t.problemas, [], `tarjetas: 288 de 288 ≥ 4,5 (OK ${t.ok}, peor ${t.peor})`);
  const p = await contraste("pie");
  assert.deepEqual(p.problemas, [], `pie y descripción: 64 de 64 ≥ 4,5 (OK ${p.ok}, peor ${p.peor})`);
});

test("reseñas de peluquería son «voces en collage», una variante propia (`sections.testimonials.variant` v6) con la dinámica de la galería —`data-dinamica` v6 en A y v7 en C—: todas las reseñas pintadas, ninguna pieza fuera de su columna ni encima de otra (con la sección centrada, entrando y saliendo), ninguna palabra que no entre, el promedio igual al de los datos, nota sólo si hay traducción, «ver originales» ida y vuelta y todo en el alfabeto del idioma; y `resenas.mjs` da 32 de 32 sin problemas", async () => {
  // (1) La sonda. Hoy reseñas es la v1: aquí está el rojo.
  const s = de(await sonda(), "a-he").resenas;
  assert.ok(s?.existe, `a-he: #testimonials pinta las voces en collage (.res6) (hoy: ${JSON.stringify(s)})`);
  for (const f of await estilos()) assert.equal(f.resenas.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
  // (2) resenas.mjs.
  assert.deepEqual(await resenas(), [], "resenas.mjs: 32 de 32 sin problemas");
});

test("reseñas como en local: la sección arranca y termina en `--surface` con la textura en una capa propia (`--surface-alt` + la textura, con máscara); cada pieza es una `figure` que no es un control, en `--card` con relieve y borde de acento en oscuro; la cita en la serif del idioma en su peso liviano, sin cursiva ni comillas, del tamaño que decide el largo (hasta 4 palabras 22 px, de 5 a 12 19 px, más de 12 15,5 px en móvil; nunca menos de 15) y sin cortar palabras; el nombre con `dir=\"auto\"`, el servicio de 13 px en `--text-muted` y 5 estrellas con las que faltan apagadas (`role=\"img\"`, «n/5»; `--brand-accent`, en oscuro `--highlight`); en en, ru y ar la nota de sección (R-2) en `--text` con su botón de 44 px, en hebreo ninguna, y con reseñas de dos idiomas la nota por reseña (D11-4) y la escrita en otro idioma con su `lang`; el pie (h2 `sections.testimonials.subtitle`, kicker `sections.testimonials.title`) con el promedio y la cantidad calculados de los datos y su plural (R-1); móvil en zigzag en A (56–86 %) y por tramos en C; escritorio en 3 columnas con la del medio de A desfasada 3,5 rem; quieto con reduced-motion y en ruso ninguna palabra de una letra con espacio común", async () => {
  // (1) La sonda.
  assert.deepEqual(juezResenas(de(await sonda(), "a-he")), [], "a-he: reseñas como en local (sonda)");
  // (2) Los cuatro idiomas.
  assert.deepEqual((await estilos()).flatMap(juezResenas), [], "reseñas como en local en A y C, cuatro idiomas");
});

test("el contraste de reseñas en el peor píxel detrás de las letras, en 3 posiciones de scroll, A y C, cuatro idiomas, 375 y 1280: citas, nombre, servicio, estrellas, nota, pie y promedio dan 508 de 508 ≥ 4,5, y las estrellas y el promedio de C (en `--highlight`) 56 de 56", async () => {
  // (1) La sonda.
  assert.ok(de(await sonda(), "a-he").resenas?.existe, "a-he: #testimonials pinta las voces en collage (sonda)");
  // (2) contraste-sel.
  const r = await contraste("resenas");
  assert.deepEqual(r.problemas, [], `reseñas: ${N.resenas} de ${N.resenas} ≥ 4,5 (OK ${r.ok}, peor ${r.peor})`);
  const e = await contraste("estrellas", "c");
  assert.deepEqual(e.problemas, [], `estrellas y promedio de C: 56 de 56 ≥ 4,5 (OK ${e.ok}, peor ${e.peor})`);
});

test("los instrumentos de aceptación de diseno/team/verificacion y diseno/resenas/verificacion, corridos sobre T, dan lo mismo que en local —`team.mjs` 32 de 32, el contraste de las tarjetas 288 de 288 y el del pie y la descripción 64 de 64, `resenas.mjs` 32 de 32, el contraste de reseñas 508 de 508 y 56 de 56 en las estrellas de C, en 3 posiciones de scroll—, `encaje` da 0 problemas de texto en team y testimonials en 32 casos, y services sigue en 32 de 32 (`verificar-proto`)", async () => {
  // (1) La sonda.
  const s = de(await sonda(), "a-he");
  assert.ok(s.team?.existe && s.resenas?.existe, "a-he: team v6 y las voces en collage (sonda)");
  // (2) Los totales, como los da local.
  assert.deepEqual(await team(), [], "team.mjs: 32 de 32");
  assert.equal((await contraste("tarjetas", "a,c", "375,400,768")).ok, N.tarjetas, "contraste de las tarjetas: 288 de 288");
  assert.equal((await contraste("pie")).ok, N.pie, "contraste del pie y la descripción: 64 de 64");
  assert.deepEqual(await resenas(), [], "resenas.mjs: 32 de 32");
  assert.equal((await contraste("resenas")).ok, N.resenas, `contraste de reseñas: ${N.resenas} de ${N.resenas}`);
  assert.equal((await contraste("estrellas", "c")).ok, N.estrellas, "contraste de las estrellas y el promedio de C: 56 de 56");
  assert.deepEqual(juezEncaje((await medir("encaje", "encaje.mjs", (d) => [d])).out), [], "encaje: 0 problemas de texto en team y testimonials en 32 casos");
  await medir("vp", "verificar-proto.mjs", (d) => [d]);
  assert.deepEqual(juezVerificar(json("vp", "verificacion.json"), conFrase), [], "services sigue en 32 de 32 (verificar-proto)");
});

test("en `#team` y `#testimonials` de peluquería Frank Ruhl Libre se usa sólo en 300 y 500 (pendiente c de ARREGLOS-02, acotado a estas dos secciones por decisión de Liam; la página entera queda para las órdenes de faq, contacto y pie)", async () => {
  // (1) La sonda (hebreo, 375). Hoy team usa 900 y reseñas 700 y 900: aquí está el rojo.
  assert.deepEqual(juezPesos(de(await sonda(), "a-he")), [], "a-he: Frank Ruhl Libre sólo en 300 y 500 en #team y #testimonials");
  // (2) Las dos plantillas.
  assert.deepEqual((await estilos()).filter((f) => f.k.endsWith("-he")).flatMap(juezPesos), [], "A y C: Frank Ruhl Libre sólo en 300 y 500 en #team y #testimonials");
});

test("lo nuevo alcanza sólo a peluquería: team v6 y las voces en collage se pintan en las plantillas de peluquería; en la home de los seis nichos de la flota a 375 ninguna sección pinta `.team6` ni `.res6`, y el estilo computado de cada sección y de su `::before` y `::after` es el mismo en el árbol del commit rojo que en HEAD", async () => {
  // (1) La sonda.
  const s = de(await sonda(), "a-he");
  assert.ok(s.team?.existe && s.resenas?.existe, "a-he: team v6 y las voces en collage en peluquería (sonda)");
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
      assert.equal(ahora.nuevas, 0, `${nicho}: ninguna sección pinta .team6 ni .res6`);
      assert.deepEqual(ahora, antes, `${nicho}: el estilo de cada sección y de su ::before/::after es el mismo en el rojo (${rojo.slice(0, 7)}) que en HEAD`);
    }
  } finally { quitarEnlace(clon); }
});
