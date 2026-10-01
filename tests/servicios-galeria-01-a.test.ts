// SERVICIOS-GALERIA-01 · copia promovida (TEAM-RESENAS-01, 2026-10-01, D-174) de tests/orden/servicios-galeria-01/a.test.ts:
// A1–A4, B1–B3, C1, D1 (T), en `test:browser`. Lo que cambia respecto de la orden congelada, y por qué:
//  - UN CASO POR PLANTILLA (D-165), declarado en `CASOS` y pasado a los instrumentos por SG_CASOS: A en escritorio bajo (1366 × 657,
//    la pantalla de S-AC1 y donde se mide el alto de la galería v6) y C en móvil y en árabe (RTL, oscuro). `estilos.mjs` mide de esas
//    dos plantillas e idiomas también su parte de 375 y de 1366; los totales que la orden fijaba en 32/48 pasan a ser los de estos casos.
//  - La parte de G2-a vigila además la MÁSCARA de `.gal-wall`: su primera parada está en el 55 % de la franja (0,55 × --gal-fade).
//    Sin esa condición B2 quedaba verde con la máscara de antes y la galería cambiaba entre 66.984 y 388.197 px contra local
//    (verificadora de SERVICIOS-GALERIA-01).
//  - NINGUNA ESPERA DE TIEMPO FIJO, ni acá ni en lo que se lanza: los instrumentos son las copias editables de
//    `tests/servicios-galeria-01-instrumentos/` (cada espera es una condición: `listo`, `quieta`, `leyendaLista`, `enRuta` de su
//    `_nav.mjs`), no los congelados de la orden; y el cierre espera a que los dos Vite terminen de cerrarse antes de borrar.
//  - gal-comp no se corre: el alto y el ancho ocupado de la galería de A los da `estilos.mjs` (`galeria.alto`, `galeria.ocupado`).
// Nada sale a las webs desplegadas, a Firestore, a Storage ni a Vercel. No escribe fuera de su carpeta temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ORDEN, ROOT, SEIS, borrar, carpetaTemporal, clonDe, conNicho, conPlantillas, correrNodeAsync, entornoLimpio, leerJson, quitarEnlace, rojoDeEstaOrden, sinMaterial, subcarpeta, type Salida, type Urls } from "./orden/servicios-galeria-01/_comun.ts";
import { caso, juezContraste, juezEncaje, juezGaleria, juezNombres, juezVerificar, leerSiluetas } from "./orden/servicios-galeria-01/_jueces.ts";

type Fila = Record<string, any>;
/** Un caso de A y uno de C (D-165). */
const CASOS = ["a-he-1366x657", "c-ar-375x812"];
const PL = CASOS.map((k) => k.split("-").slice(0, 2).join("-"));
const SEL_SERVICES = "#services-title, #services-title + p, #services button.min-h-11";
const SEL_GALERIA = "#gallery-title, #gallery-title + p, #gallery .gal-more";
const INSTRUMENTOS = resolve(ROOT, "tests", `${ORDEN}-instrumentos`);

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

/** Un instrumento de las copias editables contra las dos plantillas, con SG_CASOS, como proceso asíncrono. */
function instrumento(nombre: string, args: string[], u: Urls, minutos = 30): Promise<Salida> {
  const tmp = subcarpeta(base, `tmp-${nombre.replace(/\W+/g, "-")}-${Date.now().toString(36)}`);
  return correrNodeAsync([join(INSTRUMENTOS, nombre), ...args], { cwd: ROOT, minutos, env: entornoLimpio({ SG_A: u.a, SG_C: u.c, SG_RAIZ: ROOT, SG_CASOS: CASOS.join(","), TEMP: tmp, TMP: tmp, TMPDIR: tmp }) });
}
const memo = new Map<string, Promise<Salida>>();
function medir(clave: string, nombre: string, args: (dir: string) => string[], exigirMaterial = true): Promise<Salida> {
  if (!memo.has(clave)) {
    const dir = subcarpeta(base, clave);
    memo.set(clave, instrumento(nombre, args(dir), urls).then((s) => {
      assert.equal(s.status, 0, `${nombre}: exit ${s.status}\n${s.out.slice(-800)}`);
      if (exigirMaterial) assert.equal(sinMaterial(s), 0, `${nombre}: no falta material de Storage (${s.out.match(/SIN MATERIAL.*/)?.[0]})`);
      return s;
    }));
  }
  return memo.get(clave)!;
}
const json = (clave: string, archivo: string) => leerJson(join(base, clave, archivo));
const estilos = async () => { await medir("estilos", "estilos.mjs", (d) => [join(d, "estilos")]); return json("estilos", "estilos.json") as Fila[]; };
const verificar = async () => { await medir("vp", "verificar-proto.mjs", (d) => [d]); return json("vp", "verificacion.json") as Fila[]; };
const de = (filas: Fila[], k: string) => { const f = filas.find((x) => x.k === k); assert.ok(f, `sin medida para ${k}`); return f!; };
/** Los jueces de la orden fijan sus totales (32 casos): acá el total es el de CASOS, y se afirma aparte. */
const sinTotal = (problemas: string[]) => problemas.filter((p) => !/\(32\)$|sus 32 casos/.test(p));

const FIXTURES = { a: "peluqueria-paleta-a", c: "peluqueria-paleta-c" } as const;
const fixture = (p: "a" | "c") => JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures", `${FIXTURES[p]}.json`), "utf8"));
const conFrase = (p: string, lang: string) => {
  const fx = fixture(p as "a" | "c");
  if (lang === "he") return fx.services.some((s: Fila) => (s.description ?? "").trim());
  const capa = fx.translations?.[lang]?.services ?? {};
  return Object.values(capa).some((x: any) => (x?.description ?? "").trim());
};

test("F-C en < 1024: la frase de la tarjeta central se lee en `.svc-caption` debajo del carrusel (16 px bajo la tarjeta central, 24 px antes del título, centrada, 14/21 px, `--text`, máximo 352 px, fundido de 180 ms y sin fundido con reduced-motion), ninguna frase dentro de las tarjetas, reserva de alto estable tras pasar por 200 px (D16); sin frases en el catálogo (C) no se muestra; en oscuro con frases su peor píxel da ≥ 4,5; `verificar-proto` 0 fallas en móvil (un caso por plantilla)", async () => {
  const filas = await estilos();
  assert.deepEqual(filas.map((f) => f.k).sort(), [...PL].sort(), "estilos mide la plantilla y el idioma de cada caso");
  for (const f of filas) {
    const [p, lang] = f.k.split("-"); const l = f.leyenda;
    if (!conFrase(p, lang)) { assert.ok(!l?.visible, `${f.k}: sin frases en el catálogo la leyenda no se muestra`); continue; }
    assert.ok(l?.visible && l.debajo, `${f.k}: leyenda visible debajo del carrusel y antes del título (${JSON.stringify(l)})`);
    assert.ok(Math.abs(l.bajoTarjeta - 16) <= 2 && Math.abs(l.antesTitulo - 24) <= 2, `${f.k}: 16 px bajo la central y 24 px antes del título (${l.bajoTarjeta} / ${l.antesTitulo})`);
    assert.deepEqual([l.fuente, l.linea, l.esText, l.anchoMax, l.alineado], ["14px", "21px", true, "352px", "center"], `${f.k}: 14/21 px, --text, 352 px, centrada`);
    assert.match(l.transicion, /opacity[^,]*0\.18s/, `${f.k}: fundido de opacidad de 180 ms (${l.transicion})`);
    assert.ok(/none|\b0s|1e-05s|0\.01s/.test(f.leyendaReducida ?? ""), `${f.k}: con reduced-motion, sin fundido (${f.leyendaReducida})`);
    assert.equal(l.minH, `${l.alto}px`, `${f.k}: la leyenda reserva su alto (min-height ${l.minH}, alto ${l.alto})`);
    assert.deepEqual([l.d16?.alto, l.d16?.minH], [l.alto, l.minH], `${f.k}: D16, la reserva es la misma después de pasar por 200 px`);
  }
  const c = de(filas, PL.find((k) => k.startsWith("c"))!);
  assert.ok(c.oscuroConFrase?.visible && c.oscuroConFrase.dark, `${c.k}: en oscuro, con frases, la leyenda se ve (${JSON.stringify(c.oscuroConFrase)})`);
  assert.ok(c.oscuroContraste?.peor >= 4.5, `${c.k}: en oscuro, el peor píxel detrás de la leyenda da ≥ 4,5 (${JSON.stringify(c.oscuroContraste)})`);
  assert.deepEqual(juezVerificar(await verificar(), conFrase, "movil"), [], "verificar-proto: 0 fallas en los casos de móvil");
});

test("F-C y H-A en ≥ 1024 (1366 × 657): la tarjeta entera dentro de la pantalla, los nombres a la misma altura, la frase con un alto fijo y la leyenda de móvil oculta; `verificar-proto` 0 fallas en escritorio y `nombres` 0", async () => {
  for (const f of await estilos()) {
    const e = f.escritorio;
    assert.ok(e.tarjetaAbajo <= e.alto, `${f.k} 1366×657: tarjeta dentro de la pantalla (${e.tarjetaAbajo} > ${e.alto})`);
    assert.equal(e.nombresY[0], e.nombresY[1], `${f.k} 1366×657: nombres a la misma altura (${e.nombresY})`);
    assert.ok(e.frasesAlto.length <= 1, `${f.k} 1366×657: la frase tiene un alto fijo (${e.frasesAlto})`);
    assert.ok(e.leyendaOculta, `${f.k} 1366×657: la leyenda de móvil no se muestra en escritorio`);
  }
  assert.deepEqual(juezVerificar(await verificar(), conFrase, "escritorio"), [], "verificar-proto: 0 fallas en escritorio");
  const n = await medir("nombres", "nombres.mjs", () => []);
  assert.match(n.out, new RegExp(`^CASOS ${CASOS.filter((k) => /-(375x812|1366x657|1920x945)$/.test(k)).length}$`, "m"), "nombres corre los casos de CASOS");
  assert.deepEqual(juezNombres(n.out), [], "nombres: el nombre y la frase de todas las tarjetas entran (0)");
});

test("el título de services: kicker en `--text`, halo (`text-shadow`) en el h2, el kicker y «ver todos», y `contraste-sel` sobre los tres en 3 posiciones de scroll da 6 de 6 ≥ 4,5 (3 por caso)", async () => {
  for (const f of await estilos()) {
    assert.ok(f.titulo.kickerEsText, `${f.k}: kicker en --text (${f.titulo.kicker})`);
    assert.ok(f.titulo.sombras.every((n: number) => n >= 1), `${f.k}: halo en el h2, el kicker y «ver todos» (${f.titulo.sombras})`);
  }
  const c = await medir("cs-services", "contraste-sel.mjs", () => [SEL_SERVICES, "#services", "a,c", "he", "375"]);
  const j = juezContraste(c.out, 3 * CASOS.length);
  assert.deepEqual(j.problemas, [], `contraste-sel del título de services: ${3 * CASOS.length} ≥ 4,5 (OK ${j.ok}, peor ${j.peor})`);
});

test("`/servicios`: sin el fundido de FONDO-02 sobre la textura, «reservar» en contorno de `--accent-strong`, WhatsApp como enlace, la caja de 64 × 64 en el lugar de la foto (la fila sin foto en `--surface-alt`); `verificar-proto` 0 fallas en `/servicios` y `encaje` 0 problemas en services y `/servicios`", async () => {
  const pinta = (x: Fila) => !(x.display === "none" || x.content === "none" || x.alto === "0px");
  const filas = await estilos();
  for (const f of filas) {
    const v = f.servicios;
    assert.ok(!v.error, `${f.k}: ${v.error}`);
    assert.ok(!pinta(v.fundido), `${f.k}: sin fundido (${JSON.stringify(v.fundido)})`);
    assert.ok(v.reservarContorno, `${f.k}: «reservar» en contorno de --accent-strong (${v.acento}) sin relleno (${JSON.stringify(v.reservar)})`);
    assert.ok(v.waComoEnlace, `${f.k}: WhatsApp como enlace (${JSON.stringify(v.wa)})`);
    assert.ok(v.lugarFoto, `${f.k}: cada fila tiene su caja de 64 × 64`);
    for (const x of v.filasSinFoto) assert.equal(x.fondo, v.surfaceAlt, `${f.k}: la fila sin foto en --surface-alt (${x.fondo})`);
  }
  assert.ok(de(filas, PL.find((k) => k.startsWith("a"))!).servicios.filasSinFoto.length >= 1, "precondición: A tiene una fila sin foto (kids-cut)");
  const vp = await verificar();
  assert.ok(vp.some((f) => f.servicios), "verificar-proto midió /servicios en algún caso");
  assert.deepEqual(juezVerificar(vp, conFrase, "servicios"), [], "verificar-proto: 0 fallas en /servicios");
  const e = await medir("encaje", "encaje.mjs", (d) => [d]);
  assert.match(e.out, new RegExp(`TOTAL \\d+ en ${CASOS.length} casos`), "encaje corre los casos de CASOS");
  assert.deepEqual(sinTotal(juezEncaje(e.out)), [], "encaje: 0 problemas de texto en services y /servicios");
});

test("G1-a: en ≥ 1024 la galería v6 de A ocupa el 100 % del ancho de su contenido y mide de 782 a 851 px de alto, y C sigue en v7; `galeria.mjs` da 0 problemas en los casos de CASOS", async () => {
  for (const f of await estilos()) {
    assert.equal(f.galeria.variante, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: variante`);
    if (!f.k.startsWith("a")) continue;
    assert.ok(f.galeria.ocupado >= 99, `${f.k} 1366: las piezas ocupan el 100 % del ancho (${f.galeria.ocupado} %)`);
    assert.ok(f.galeria.alto >= 782 && f.galeria.alto <= 851, `${f.k} 1366×657: alto ${f.galeria.alto} (782–851)`);
  }
  await medir("galeria", "galeria.mjs", (d) => [d]);
  const filas = json("galeria", "galeria.json") as Fila[];
  assert.deepEqual(filas.map((f) => f.k).sort(), [...CASOS].sort(), "galeria.mjs corre los casos de CASOS");
  assert.ok(filas.some((f) => caso(f.k).p === "a" && caso(f.k).w >= 1024), "precondición: un caso de A en escritorio (el alto de la v6)");
  assert.deepEqual(sinTotal(juezGaleria(filas)), [], "galeria.mjs: 0 problemas");
});

test("G2-a: la sección sube en rampa hasta `--surface` antes de que entre la textura, la máscara de `.gal-wall` empieza en el 55 % de la franja (su primera parada transparente en 0,55 × --gal-fade), donde entra la textura (tramo 40–100 %) la foto del local ya no se ve —`siluetas` ≤ 1,0— y el instrumento la sigue viendo con la costura revertida (≥ 4)", async () => {
  for (const f of await estilos()) {
    const g = f.galeria;
    assert.ok(/gradient/.test(g.rampa), `${f.k}: el fondo de la galería sube en rampa hasta --surface (background-image: ${g.rampa})`);
    // la máscara de la pared: la primera parada (transparente) en el 55 % de --gal-fade, y la pared opaca recién en --gal-fade
    const paradas = [...String(g.mascara).matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
    assert.ok(g.galFade > 0 && paradas.length >= 2, `${f.k}: la máscara de .gal-wall con sus paradas en px (${g.mascara}; --gal-fade ${g.galFade})`);
    assert.ok(Math.abs(paradas[0] - 0.55 * g.galFade) <= 1, `${f.k}: la máscara de .gal-wall entra desde el 55 % de la franja (${paradas[0]} px; 0,55 × ${g.galFade} = ${(0.55 * g.galFade).toFixed(2)})`);
    assert.ok(Math.abs(paradas[1] - g.galFade) <= 1, `${f.k}: la pared es opaca desde --gal-fade (${paradas[1]} px; ${g.galFade})`);
  }
  const s = leerSiluetas((await medir("siluetas", "siluetas.mjs", () => [])).out);
  const vistas = CASOS.map((k) => { const { p, w } = caso(k); return `${p}-${w}`; });
  for (const k of vistas) {
    assert.ok(s.con[k] <= 1, `${k}: con G2-a, ≤ 1,0 (${s.con[k]})`);
    assert.ok(s.sin[k] >= 4, `${k}: el instrumento la ve con la costura revertida (mutación ${s.sin[k]})`);
  }
});

test("G3-a: el kicker del pie de la galería en `--text`, y `contraste-sel` sobre el título, el kicker y «ver toda la galería» en 3 posiciones de scroll da 6 de 6 ≥ 4,5 (3 por caso)", async () => {
  for (const f of await estilos()) assert.ok(f.galeria.kickerEsText, `${f.k}: kicker de la galería en --text (${f.galeria.kicker})`);
  const c = await medir("cs-galeria", "contraste-sel.mjs", () => [SEL_GALERIA, "#gallery", "a,c", "he", "375"]);
  const j = juezContraste(c.out, 3 * CASOS.length);
  assert.deepEqual(j.problemas, [], `contraste-sel del pie de la galería: ${3 * CASOS.length} ≥ 4,5 (OK ${j.ok}, peor ${j.peor})`);
});

test("el retiro del fundido de FONDO-02 alcanza sólo a peluquería: todo selector de `src/index.css` que une `[data-surface=\"textura\"]` con `::before` lleva `html[data-niche=\"peluqueria\"]` (y hay al menos uno); y en la home de los seis nichos de la flota a 375 el estilo computado de cada sección y de su `::before` y `::after` es el mismo en el árbol del commit rojo de SERVICIOS-GALERIA-01 que en HEAD", async () => {
  const css = readFileSync(resolve(ROOT, "src/index.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const selectores = [...css.matchAll(/([^{}]+)\{/g)].flatMap((m) => m[1].split(",")).map((x) => x.trim()).filter((x) => /data-surface="textura"/.test(x) && /::before/.test(x));
  assert.ok(selectores.length > 0, "src/index.css tiene al menos un selector que une [data-surface=\"textura\"] con ::before");
  for (const x of selectores) assert.ok(x.includes('html[data-niche="peluqueria"]'), `el selector «${x}» lleva html[data-niche="peluqueria"]`);
  const rojo = rojoDeEstaOrden();
  assert.ok(rojo, "el commit rojo de SERVICIOS-GALERIA-01 (el último que añade su HOJA.md)");
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
      assert.deepEqual(ahora, antes, `${nicho}: el estilo de cada sección y de su ::before/::after es el mismo en el rojo (${rojo.slice(0, 7)}) que en HEAD`);
    }
  } finally { quitarEnlace(clon); }
});
