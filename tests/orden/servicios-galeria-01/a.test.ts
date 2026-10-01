// SERVICIOS-GALERIA-01 · A1–A4, B1–B3, C1 (T) · services v6 + /servicios y gallery v6/v7 + /galeria, como en local. Sesión A
// (2026-10-01): tests rojos.
//
// Mandato (INFORME §§ 6.3 y 6.4, CERRADOS): «T tiene que quedar exactamente como está en local» (`diseno/ver-prototipo.ps1`, A :4101,
// C :4103, prototipos services + galería). La aceptación son los instrumentos de la sesión de diseño (`diseno/services/verificacion`,
// `diseno/galeria/verificacion`), COPIADOS a `./instrumentos/` con tres cambios que no tocan lo que miden (`_nav.mjs`: la url de cada
// plantilla, playwright del árbol medido y el material de Storage desde disco; y en services la leyenda se llama `.svc-caption`),
// más `estilos.mjs`, que mide lo que el paquete fija y ningún instrumento medía. Los jueces (`_jueces.ts`) dan 0 sobre las salidas del
// prototipo local (medido por A el 2026-10-01, en la HOJA). Las páginas: un Vite por plantilla en este proceso (`conPlantillas`), con
// su fixture y sin Firebase; los instrumentos corren como procesos asíncronos contra esas url.
// Todos los tests de navegador de la orden viven en este archivo: `node --test` corre en serie los tests de un archivo y en paralelo
// los archivos, y medir contraste por píxel con otro Chromium al lado es lo que no hay que hacer. Cada instrumento corre UNA vez por
// corrida (memo) y lo leen los tests que lo necesitan. La primera aserción de cada test sale de la SONDA (`estilos.mjs` sólo en
// hebreo, ~1 min): en el árbol rojo cae ahí, sin correr los instrumentos largos.
// Sólo en T (inciso n). Nada sale a las webs desplegadas, a Firestore, a Storage ni a Vercel. No escribe fuera de su carpeta temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, SEIS, borrar, carpetaTemporal, clonDe, conNicho, conPlantillas, instrumento, leerJson, quitarEnlace, rojoDeEstaOrden, sinMaterial, subcarpeta, type Salida, type Urls } from "./_comun.ts";
import { juezContraste, juezEncaje, juezGaleria, juezNombres, juezVerificar, leerComp, leerSiluetas } from "./_jueces.ts";

type Fila = Record<string, any>;
const LANGS = ["he", "en", "ru", "ar"];
const SEL_SERVICES = "#services-title, #services-title + p, #services button.min-h-11";
const SEL_GALERIA = "#gallery-title, #gallery-title + p, #gallery .gal-more";

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
const verificar = async () => { await medir("vp", "verificar-proto.mjs", (d) => [d]); return json("vp", "verificacion.json") as Fila[]; };
const de = (filas: Fila[], k: string) => { const f = filas.find((x) => x.k === k); assert.ok(f, `sin medida para ${k}`); return f!; };

/** ¿El catálogo de la plantilla trae frase en ese idioma? (A sí en los cuatro; C en ninguno: prueba el caso mínimo). */
const FIXTURES = { a: "peluqueria-paleta-a", c: "peluqueria-paleta-c" } as const;
const fixture = (p: "a" | "c") => JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures", `${FIXTURES[p]}.json`), "utf8"));
const conFrase = (p: string, lang: string) => {
  const fx = fixture(p as "a" | "c");
  if (lang === "he") return fx.services.some((s: Fila) => (s.description ?? "").trim());
  const capa = fx.translations?.[lang]?.services ?? {};
  return Object.values(capa).some((x: any) => (x?.description ?? "").trim());
};

test("F-C en < 1024: la frase de la tarjeta central se lee en `#services .svc-caption`, debajo del carrusel —a 16 px de la tarjeta central y 24 px antes de la fila del título, centrada, 14 px / 21 px, en `--text`, ancho máximo 352 px, fundido de opacidad de 180 ms y sin fundido con reduced-motion—, ninguna frase queda dentro de las tarjetas, la leyenda reserva el alto de la frase más larga de ese idioma y ese ancho y es el mismo después de pasar la página por 200 px de ancho y volver (D16); sin frases en el catálogo (C) no se muestra; en oscuro, con frases (C con las de A), su peor píxel da ≥ 4,5 en las 3 posiciones de scroll; y `verificar-proto` da 0 fallas en sus 8 casos de móvil", async () => {
  // (1) La sonda. Hoy no hay leyenda: aquí está el rojo.
  const s = de(await sonda(), "a-he");
  assert.ok(s.leyenda?.visible, `a-he 375: la frase de la central se lee debajo del carrusel en #services .svc-caption (hoy: ${JSON.stringify(s.leyenda)})`);
  // (2) Los cuatro idiomas.
  const filas = await estilos();
  for (const p of ["a", "c"]) for (const lang of LANGS) {
    const f = de(filas, `${p}-${lang}`); const l = f.leyenda;
    if (!conFrase(p, lang)) { assert.ok(!l?.visible, `${p}-${lang}: sin frases en el catálogo la leyenda no se muestra`); continue; }
    assert.ok(l?.visible && l.debajo, `${p}-${lang}: leyenda visible debajo del carrusel y antes del título (${JSON.stringify(l)})`);
    assert.ok(Math.abs(l.bajoTarjeta - 16) <= 2 && Math.abs(l.antesTitulo - 24) <= 2, `${p}-${lang}: 16 px bajo la tarjeta central y 24 px antes del título (${l.bajoTarjeta} / ${l.antesTitulo})`);
    assert.deepEqual([l.fuente, l.linea, l.esText, l.anchoMax, l.alineado], ["14px", "21px", true, "352px", "center"], `${p}-${lang}: 14 px / 21 px, --text, máximo 352 px, centrada`);
    assert.match(l.transicion, /opacity[^,]*0\.18s/, `${p}-${lang}: fundido de opacidad de 180 ms (${l.transicion})`);
    assert.ok(/none|\b0s|1e-05s|0\.01s/.test(f.leyendaReducida ?? ""), `${p}-${lang}: con reduced-motion, sin fundido (${f.leyendaReducida})`);
    assert.equal(l.minH, `${l.alto}px`, `${p}-${lang}: la leyenda reserva su alto (min-height ${l.minH}, alto ${l.alto})`);
    assert.deepEqual([l.d16?.alto, l.d16?.minH], [l.alto, l.minH], `${p}-${lang}: D16 — después de pasar por 200 px y volver, la reserva es la misma que al cargar`);
  }
  for (const lang of LANGS) {
    const c = de(filas, `c-${lang}`);
    assert.ok(c.oscuroConFrase?.visible && c.oscuroConFrase.dark, `c-${lang}: en oscuro, con frases, la leyenda se ve (${JSON.stringify(c.oscuroConFrase)})`);
    assert.ok(c.oscuroContraste?.peor >= 4.5, `c-${lang}: en oscuro, el peor píxel detrás de la leyenda da ≥ 4,5 en las 3 posiciones (${JSON.stringify(c.oscuroContraste)})`);
  }
  // (3) verificar-proto, móvil.
  assert.deepEqual(juezVerificar(await verificar(), conFrase, "movil"), [], "verificar-proto: 0 fallas en los casos de móvil");
});

test("F-C y H-A en ≥ 1024: la frase queda dentro de la tarjeta con un alto fijo de 2 líneas (las tarjetas sin frase reservan el mismo), los nombres de las tarjetas visibles a la misma altura, tres tarjetas enteras, la tarjeta entera dentro de la pantalla también en 1366 × 657 —el bloque mide `min(72rem, (100svh − 6,5rem) × 27/16 + 3rem)`— y la leyenda de móvil oculta; `verificar-proto` da 0 fallas en sus 24 casos de escritorio y `nombres` da 0", async () => {
  // (1) La sonda en 1366 × 657. Hoy la tarjeta baja a 738 con la pantalla en 657: aquí está el rojo.
  const s = de(await sonda(), "a-he").escritorio;
  assert.ok(s.tarjetaAbajo <= s.alto, `a-he 1366×657: la tarjeta entera dentro de la pantalla (baja a ${s.tarjetaAbajo}, pantalla ${s.alto})`);
  // (2) Los cuatro idiomas.
  for (const f of await estilos()) {
    const e = f.escritorio;
    assert.ok(e.tarjetaAbajo <= e.alto, `${f.k} 1366×657: tarjeta dentro de la pantalla (${e.tarjetaAbajo} > ${e.alto})`);
    assert.equal(e.nombresY[0], e.nombresY[1], `${f.k} 1366×657: nombres a la misma altura (${e.nombresY})`);
    assert.ok(e.frasesAlto.length <= 1, `${f.k} 1366×657: la frase tiene un alto fijo (${e.frasesAlto})`);
    assert.ok(e.leyendaOculta, `${f.k} 1366×657: la leyenda de móvil no se muestra en escritorio`);
  }
  // (3) verificar-proto, escritorio; nombres.
  assert.deepEqual(juezVerificar(await verificar(), conFrase, "escritorio"), [], "verificar-proto: 0 fallas en los casos de escritorio");
  const n = await medir("nombres", "nombres.mjs", () => []);
  assert.deepEqual(juezNombres(n.out), [], "nombres: el nombre y la frase de TODAS las tarjetas entran (0)");
});

test("el título de services: el kicker en `--text`, el h2, el kicker y «ver todos» con halo tonal (`text-shadow`), y `contraste-sel` sobre esos tres en 3 posiciones de scroll, A y C, cuatro idiomas, 375 y 1280, da 48 de 48 ≥ 4,5 (en oscuro lo sostiene además el fondo radial tonal)", async () => {
  // (1) La sonda. Hoy el kicker está en --text-muted: aquí está el rojo.
  const s = de(await sonda(), "a-he").titulo;
  assert.ok(s.kickerEsText, `a-he: el kicker del título de services en --text (es ${s.kicker}, --text es ${s.text})`);
  // (2) Los cuatro idiomas.
  for (const f of await estilos()) {
    assert.ok(f.titulo.kickerEsText, `${f.k}: kicker en --text (${f.titulo.kicker})`);
    assert.ok(f.titulo.sombras.every((n: number) => n >= 1), `${f.k}: halo (text-shadow) en el h2, el kicker y «ver todos» (${f.titulo.sombras})`);
  }
  // (3) Contraste en 3 posiciones de scroll.
  const c = await medir("cs-services", "contraste-sel.mjs", () => [SEL_SERVICES, "#services", "a,c", LANGS.join(","), "375,1280"]);
  const j = juezContraste(c.out, 48);
  assert.deepEqual(j.problemas, [], `contraste-sel del título de services: 48 de 48 ≥ 4,5 (OK ${j.ok}, peor ${j.peor})`);
});

test("`/servicios`: en las secciones con textura de peluquería no se pinta el fundido de FONDO-02 (`::before`), «reservar» va en contorno de `--accent-strong` sin relleno, WhatsApp como enlace (sin borde ni fondo), cada fila tiene en el lugar de la foto una caja de 64 × 64 —la fila sin foto, en `--surface-alt`— y la columna de texto alineada, sin acciones rellenas fuera del navbar; `verificar-proto` da 0 fallas en sus 16 casos de `/servicios` y `encaje` 0 problemas de texto en services y `/servicios`", async () => {
  // (1) La sonda. Hoy el fundido se pinta (display: block, 128 px): aquí está el rojo.
  const s = de(await sonda(), "a-he").servicios;
  const pinta = (x: Fila) => !(x.display === "none" || x.content === "none" || x.alto === "0px");
  assert.ok(s && !s.error && !pinta(s.fundido), `a-he /servicios: el fundido de FONDO-02 no se pinta sobre la textura (${JSON.stringify(s?.fundido ?? s)})`);
  // (2) Los cuatro idiomas.
  for (const f of await estilos()) {
    const v = f.servicios;
    assert.ok(!v.error, `${f.k}: ${v.error}`);
    assert.ok(!pinta(v.fundido), `${f.k}: sin fundido (${JSON.stringify(v.fundido)})`);
    assert.ok(v.reservarContorno, `${f.k}: «reservar» en contorno de --accent-strong (${v.acento}) sin relleno (${JSON.stringify(v.reservar)})`);
    assert.ok(v.waComoEnlace, `${f.k}: WhatsApp como enlace, sin borde ni fondo (${JSON.stringify(v.wa)})`);
    assert.ok(v.lugarFoto, `${f.k}: cada fila tiene su caja de 64 × 64 en el lugar de la foto`);
    for (const x of v.filasSinFoto) assert.equal(x.fondo, v.surfaceAlt, `${f.k}: la fila sin foto reserva el lugar en --surface-alt (${x.fondo})`);
  }
  assert.ok(de(await estilos(), "a-he").servicios.filasSinFoto.length >= 1, "precondición: A tiene una fila sin foto (kids-cut)");
  // (3) verificar-proto en /servicios; encaje.
  assert.deepEqual(juezVerificar(await verificar(), conFrase, "servicios"), [], "verificar-proto: 0 fallas en /servicios");
  const e = await medir("encaje", "encaje.mjs", (d) => [d]);
  assert.deepEqual(juezEncaje(e.out), [], "encaje: 0 problemas de texto en services y /servicios");
});

test("G1-a: en ≥ 1024 la galería v6 de A ocupa el 100 % del ancho de su contenido y mide de 782 a 851 px de alto en 1280 × 800, 1366 × 657 y 1920 × 945 (antes 1.708–1.777), y C sigue en v7; `galeria.mjs` da 0 problemas en sus 32 casos", async () => {
  // (1) La sonda en 1366 × 657. Hoy A mide 1.708 px: aquí está el rojo.
  const s = de(await sonda(), "a-he").galeria;
  assert.ok(s.alto >= 782 && s.alto <= 851, `a-he 1366×657: la galería v6 de A mide de 782 a 851 px (mide ${s.alto})`);
  // (2) La composición: gal-comp y los cuatro idiomas.
  const comp = leerComp((await medir("comp", "gal-comp.mjs", () => [])).out);
  for (const w of [1280, 1366, 1920]) {
    assert.ok(comp[`a-${w}`]?.pct >= 99, `A ${w}: las piezas ocupan el 100 % del ancho (${comp[`a-${w}`]?.pct} %)`);
    assert.ok(comp[`a-${w}`].alto >= 782 && comp[`a-${w}`].alto <= 851, `A ${w}: alto ${comp[`a-${w}`].alto} (782–851)`);
  }
  for (const f of await estilos()) assert.equal(f.galeria.variante, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: variante`);
  // (3) galeria.mjs.
  await medir("galeria", "galeria.mjs", (d) => [d]);
  assert.deepEqual(juezGaleria(json("galeria", "galeria.json")), [], "galeria.mjs: 0 problemas en 32 casos");
});

test("G2-a: donde entra la textura de la galería (tramo 40–100 % de la franja de arriba) la foto del local ya no se ve —`siluetas` da ≤ 1,0 de diferencia media por píxel en A y C, 375 y 1920 (local 0,40–0,95; T antes 4,8–11,6)— y el instrumento sigue viéndola con la costura revertida (su mutación da ≥ 4)", async () => {
  // (1) La sonda: la sección pinta su rampa hasta --surface (hoy background-image: none): aquí está el rojo.
  const r = de(await sonda(), "a-he").galeria;
  assert.ok(/gradient/.test(r.rampa), `a-he: el fondo de la galería sube en rampa hasta --surface antes de la textura (background-image: ${r.rampa})`);
  const s = leerSiluetas((await medir("siluetas", "siluetas.mjs", () => [])).out);
  for (const k of ["a-375", "a-1920", "c-375", "c-1920"]) {
    assert.ok(s.con[k] <= 1, `${k}: con G2-a, ≤ 1,0 (${s.con[k]})`);
    assert.ok(s.sin[k] >= 4, `${k}: el instrumento la ve con la costura revertida (mutación ${s.sin[k]})`);
  }
});

test("G3-a: el kicker del pie de la galería en `--text`, y `contraste-sel` sobre el título, el kicker y «ver toda la galería» en 3 posiciones de scroll, A y C, cuatro idiomas, 375 y 1280, da 48 de 48 ≥ 4,5", async () => {
  // (1) La sonda. Hoy el kicker está en --text-muted: aquí está el rojo.
  const s = de(await sonda(), "a-he").galeria;
  assert.ok(s.kickerEsText, `a-he: el kicker del pie de la galería en --text (es ${s.kicker})`);
  for (const f of await estilos()) assert.ok(f.galeria.kickerEsText, `${f.k}: kicker de la galería en --text (${f.galeria.kicker})`);
  const c = await medir("cs-galeria", "contraste-sel.mjs", () => [SEL_GALERIA, "#gallery", "a,c", LANGS.join(","), "375,1280"]);
  const j = juezContraste(c.out, 48);
  assert.deepEqual(j.problemas, [], `contraste-sel del pie de la galería: 48 de 48 ≥ 4,5 (OK ${j.ok}, peor ${j.peor})`);
});

test("el retiro del fundido de FONDO-02 alcanza sólo a peluquería: en `/servicios` de peluquería el `::before` de la sección con textura no se pinta; todo selector de `src/index.css` que une `[data-surface=\"textura\"]` con `::before` lleva `html[data-niche=\"peluqueria\"]` (y hay al menos uno); y en la home de los seis nichos de la flota a 375 el estilo computado de cada sección y de su `::before` y `::after` es el mismo en el árbol del commit rojo que en HEAD", async () => {
  // (1) La sonda (A4): hoy el fundido se pinta sobre la textura de /servicios. Aquí está el rojo.
  const s = de(await sonda(), "a-he").servicios;
  assert.ok(s && !s.error && (s.fundido.display === "none" || s.fundido.content === "none" || s.fundido.alto === "0px"), `a-he /servicios: el fundido de FONDO-02 no se pinta (${JSON.stringify(s?.fundido ?? s)})`);
  // (2) El límite, en el selector (condición de Liam, 2026-10-01: el test cae si se quita html[data-niche="peluqueria"]).
  const css = readFileSync(resolve(ROOT, "src/index.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const selectores = [...css.matchAll(/([^{}]+)\{/g)].flatMap((m) => m[1].split(",")).map((x) => x.trim()).filter((x) => /data-surface="textura"/.test(x) && /::before/.test(x));
  assert.ok(selectores.length > 0, "src/index.css tiene al menos un selector que une [data-surface=\"textura\"] con ::before (el retiro del fundido)");
  for (const x of selectores) assert.ok(x.includes('html[data-niche="peluqueria"]'), `el selector «${x}» lleva html[data-niche="peluqueria"]: el retiro no alcanza a la flota`);
  // (3) Los seis nichos: la firma del estilo de sus secciones, igual en el árbol rojo y en HEAD.
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
      assert.deepEqual(ahora, antes, `${nicho}: el estilo de cada sección y de su ::before/::after es el mismo en el rojo (${rojo.slice(0, 7)}) que en HEAD`);
    }
  } finally { quitarEnlace(clon); }
});

test("los instrumentos de aceptación de diseno/services/verificacion y diseno/galeria/verificacion, corridos sobre T, dan lo mismo que en local: `verificar-proto` 0 fallas en 32 casos, `encaje` 0 problemas de texto en 32, `nombres` 0, `contraste-sel` 48 de 48 en el título de services y 48 de 48 en el pie de la galería, en 3 posiciones de scroll, y `galeria.mjs` 0 problemas en 32", async () => {
  // (1) La sonda (la leyenda F-C): en el árbol rojo cae aquí, sin correr los instrumentos largos.
  assert.ok(de(await sonda(), "a-he").leyenda?.visible, "a-he 375: la frase de la central se lee debajo del carrusel (sonda)");
  // (2) Los totales, como los da local.
  assert.deepEqual(juezVerificar(await verificar(), conFrase, "todo"), [], "verificar-proto: 0 fallas en 32 casos");
  assert.deepEqual(juezEncaje((await medir("encaje", "encaje.mjs", (d) => [d])).out), [], "encaje: 0 en 32");
  assert.deepEqual(juezNombres((await medir("nombres", "nombres.mjs", () => [])).out), [], "nombres: 0");
  const cs = juezContraste((await medir("cs-services", "contraste-sel.mjs", () => [SEL_SERVICES, "#services", "a,c", LANGS.join(","), "375,1280"])).out, 48);
  assert.equal(cs.ok, 48, `contraste-sel, título de services: 48 de 48 (OK ${cs.ok}, peor ${cs.peor})`);
  const cg = juezContraste((await medir("cs-galeria", "contraste-sel.mjs", () => [SEL_GALERIA, "#gallery", "a,c", LANGS.join(","), "375,1280"])).out, 48);
  assert.equal(cg.ok, 48, `contraste-sel, pie de la galería: 48 de 48 (OK ${cg.ok}, peor ${cg.peor})`);
  await medir("galeria", "galeria.mjs", (d) => [d]);
  assert.deepEqual(juezGaleria(json("galeria", "galeria.json")), [], "galeria.mjs: 0 en 32");
});
