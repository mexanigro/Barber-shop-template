// CONTACTO-PIE-01 · A1–A3, B1–B3, C1, C2, D1, E1 (T) · contacto y el cierre y el pie como en local, la tipografía, la flota y la cita de
// reseñas con «transiciones lentas». Sesión A (2026-10-03): tests rojos.
//
// Mandato (INFORME §§ 6.9 y 6.10, CERRADOS): «T tiene que quedar exactamente como está en local». La aceptación son los instrumentos de la
// sesión de diseño (`diseno/contacto/verificacion` y `diseno/pie/verificacion`), COPIADOS a `./instrumentos/` con cambios que no tocan lo
// que miden (`_nav.mjs`: la url de cada plantilla, playwright del árbol medido, el material de Storage y el mapa de Google respondidos
// sin salir a la red y cada espera como una condición; las clases `proto-ct…`, `proto-ubi…`, `proto-form…`, `proto-pie…` y
// `proto-cierre…` se llaman `ct6…`, `ubi6…`, `form6…`, `pie6…` y `cierre6…` en T, D-202), más `estilos.mjs`, que mide lo que el paquete fija
// y ningún instrumento medía, `cita.mjs` (la cita de reseñas v6 con «transiciones lentas», E1) y `seis.mjs` (la flota). Los jueces
// (`_jueces.ts`) dan 0 sobre las salidas del prototipo local salvo lo que la HOJA declara por encima de local (D-204). Las páginas: un
// Vite por plantilla en este proceso (`conPlantillas`), con su fixture y sin Firebase; los instrumentos corren como procesos asíncronos.
// Todos los tests de navegador de la orden viven en este archivo: `node --test` corre en serie los tests de un archivo y en paralelo los
// archivos, y medir contraste por píxel con otro Chromium al lado es lo que no hay que hacer. Cada instrumento corre UNA vez por corrida
// (memo). La primera aserción de casi todos los tests sale de la SONDA (`estilos.mjs` sólo en móvil, A, hebreo y árabe, ~15 s, sin
// exigir el material): en el árbol rojo cae ahí, sin correr los instrumentos largos.
// Sólo en T (inciso n). Nada sale a las webs desplegadas, a Firestore, a Storage ni a Vercel. No escribe fuera de su carpeta temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, SEIS, borrar, carpetaTemporal, clonDe, conNicho, conPlantillas, instrumento, leerJson, quitarEnlace, rojoDeEstaOrden, sinMaterial, subcarpeta, type Salida, type Urls } from "./_comun.ts";
import { juezCita, juezContacto, juezContenido, juezContraste, juezPesos, juezPie, juezResumen } from "./_jueces.ts";

type Fila = Record<string, any>;
const LANGS = "he,en,ru,ar";
/** Los selectores de contraste de la sesión de diseño (INFORME §§ 6.9 y 6.10), con los nombres de T (D-202). */
const SEL = {
  contacto: [".ct6-foot h2, .ct6-foot > div > p, .ct6-more, .ubi6-eyebrow, .ubi6-dir, .ubi6-dia, .ubi6-hoy, .ubi6-rango, .form6-desc, .form6-campo label, .form6-enviar", "#contact"],
  pie: [".pie6-linea, .pie6-h, .pie6-lista a, .pie6-copy, .pie6-legal a, .pie6-legal button", "footer"],
  cierre: [".cierre6-eyebrow, .cierre6-titulo, .cierre6-accion", "footer"],
} as const;
/** Cuántos textos mide cada uno (medido en local el 2026-10-03; ver HOJA). */
const N = { contacto: 464, pie: 288, cierre: 48 };

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
  const [sel, seccion] = SEL[clave] as readonly string[];
  return juezContraste((await medir(`cs-${clave}`, "contraste-sel.mjs", () => [sel, seccion, "a,c", LANGS, "375,1280"])).out, N[clave]);
};
const ct = async () => juezResumen((await medir("ct", "ct.mjs", () => [])).out, "ct.mjs", 34);
const ctSinForm = async () => juezResumen((await medir("ct-sinform", "ct.mjs", () => ["--sin-formulario"])).out, "ct.mjs --sin-formulario", 16);
const pie = async () => juezResumen((await medir("pie", "pie.mjs", () => [])).out, "pie.mjs", 34);

test("contacto de peluquería es una variante propia (`sections.contact.variant` v6), con la dinámica de la galería —`data-dinamica` v6 en A y v7 en C—: dentro de `#contact`, «ubicación y horarios» y «contacto», cada uno un `<section>` con su h2; el mapa es una tarjeta que es un solo enlace a Google Maps con la dirección simulada de cada plantilla, calle sin número, escrita en cada idioma; los horarios en la tarjeta que flota sobre el mapa; el formulario sólo con `features.showInquiry`; la descripción de contacto de C es la de su catálogo; y `ct.mjs` da 34 de 34 sin problemas y 16 de 16 con el formulario apagado", async () => {
  // (1) La sonda. Hoy contacto es ContactHub v1: aquí está el rojo.
  const s = de(await sonda(), "a-he").ct;
  assert.ok(s?.existe, `a-he: #contact pinta la variante de peluquería (.ct6) (hoy: ${JSON.stringify(s)})`);
  for (const f of await estilos()) {
    assert.equal(f.ct.dinamica, f.k.startsWith("a") ? "v6" : "v7", `${f.k}: la dinámica sale de la galería`);
    assert.deepEqual(juezContenido(f), [], `${f.k}: la dirección simulada en su idioma y la descripción de C`);
  }
  // (2) ct.mjs, con y sin formulario.
  assert.deepEqual(await ct(), [], "ct.mjs: 34 de 34 sin problemas");
  assert.deepEqual(await ctSinForm(), [], "ct.mjs --sin-formulario: 16 de 16 sin problemas");
});

test("contacto como en local: la sección en el velo de contacto con la rampa de entrada desde `--surface` y media rampa de salida, delante del velo; el mapa en `--radius-ui` con relieve (borde de acento en oscuro), el iframe sin toque, fuera del foco y del lector, en gris con el tinte de `--accent-strong` (en oscuro invertido) y pedido recién a una pantalla de distancia; la tarjeta de horarios en `--card` con relieve, «שעות פעילות» 12/500, la dirección, filas de 14 px (15 en escritorio), «hoy» en una pastilla de `--accent-strong` al lado del día, el cerrado en `--text-muted` y cada rango en `<bdi dir=\"ltr\">` sin partirse; en móvil el mapa al 88 % y la tarjeta al 84 % (tope 26 rem) y en escritorio el mapa de `min(62vh, 30rem)` con la tarjeta de 20 rem al costado, en A en sentidos opuestos con el scroll y en C quietos; el formulario en una tarjeta con etiquetas de 13/500, campos de 16 px con `required` y `autocomplete`, enviar en contorno de acento (en oscuro el texto en `--highlight`) y el estado en `role=status`, en dos columnas en escritorio; los dos pies (h2 16/500, kicker 12 px, la acción 15/500 de 44 px —«פתיחה במפות» al mapa y WhatsApp a `wa.me/<teléfono>`; sin teléfono, sin WhatsApp—) con halo y en oscuro fondo radial; nada se mueve con reduced-motion; y en ruso ninguna palabra de una letra con espacio común", async () => {
  // (1) La sonda.
  assert.deepEqual(juezContacto(de(await sonda(), "a-he")), [], "a-he: contacto como en local (sonda)");
  // (2) Los cuatro idiomas, A y C.
  assert.deepEqual((await estilos()).flatMap(juezContacto), [], "contacto como en local en A y C, cuatro idiomas");
});

test("el contraste de contacto en el peor píxel detrás de las letras, en 3 posiciones de scroll, A y C, cuatro idiomas, 375 y 1280: los pies, la tarjeta de horarios (eyebrow, dirección, días, «hoy» y rangos) y el formulario (descripción, etiquetas y enviar) dan 464 de 464 ≥ 4,5", async () => {
  // (1) La sonda.
  assert.ok(de(await sonda(), "a-he").ct?.existe, "a-he: #contact pinta la variante de peluquería (sonda)");
  // (2) contraste-sel.
  const c = await contraste("contacto");
  assert.deepEqual(c.problemas, [], `contacto: ${N.contacto} de ${N.contacto} ≥ 4,5 (OK ${c.ok}, peor ${c.peor})`);
});

test("el pie de peluquería es una variante propia (`footer.variant` v6), la misma en A y C: el cierre (sólo con `features.showBooking`), una tarjeta con la escena que abre la web —el póster del hero, y en móvil el vertical— con reservar, que abre el mismo asistente; y el pie, con la marca, los mismos enlaces que el navbar —texto, orden y ancla—, cada uno a su sección y ninguno a «¿por qué elegirnos?», el contacto y la barra legal con los 3 legales y «ניהול», que navegan como en la v1; y `pie.mjs` da 34 de 34 sin problemas", async () => {
  // (1) La sonda. Hoy el pie es Footer v1: aquí está el rojo.
  const s = de(await sonda(), "a-he").pie;
  assert.ok(s?.existe, `a-he: el footer pinta el cierre y el pie de peluquería (.pie6) (hoy: ${JSON.stringify(s)})`);
  // (2) pie.mjs.
  assert.deepEqual(await pie(), [], "pie.mjs: 34 de 34 sin problemas");
});

test("el cierre y el pie como en local: el footer en `--surface` sin `::before` ni `::after` y la pared de textura en una capa propia con la máscara de la galería, el cierre y el pie sobre la misma pared; el cierre en un `<section>` con su h2, una tarjeta 4:5 (tope 34 rem) —21:9 y tope 30 rem en escritorio— con `--radius-ui`, relieve y borde de acento en oscuro, la foto decorativa que se mueve con el scroll (quieta con reduced-motion), el scrim, eyebrow 12/500 y título en la serif 300 de 32 px (52 en escritorio), reservar en contorno de 46 px; sin reservas, sin cierre; la marca, el logo de la tinta del modo (`brand.logo` en claro, `brand.logoDark` en oscuro) que vuelve arriba, y `brand.tagline` de 14 px; la navegación en un `<nav>` con su h2, en 2 columnas en móvil; títulos de columna de 12/500; enlaces de 44 px en `--text`; la barra legal «© año <bdi>marca</bdi>. …» de 13 px con 144 px abajo en móvil; y en escritorio 3 columnas y la barra legal en una línea", async () => {
  // (1) La sonda.
  assert.deepEqual(juezPie(de(await sonda(), "a-he")), [], "a-he: el cierre y el pie como en local (sonda)");
  // (2) Los cuatro idiomas, A y C.
  assert.deepEqual((await estilos()).flatMap(juezPie), [], "el cierre y el pie como en local en A y C, cuatro idiomas");
});

test("el contraste del cierre y del pie en el peor píxel detrás de las letras, en 3 posiciones de scroll, A y C, cuatro idiomas, 375 y 1280: el pie —sus 18 textos por página: la línea de la marca, los dos títulos de columna, los enlaces de navegación y de contacto, la línea «©», los tres legales y «ניהול»— da 288 de 288 ≥ 4,5 y el cierre 48 de 48", async () => {
  // (1) La sonda.
  assert.ok(de(await sonda(), "a-he").pie?.existe, "a-he: el footer pinta el cierre y el pie de peluquería (sonda)");
  // (2) contraste-sel.
  const p = await contraste("pie");
  assert.deepEqual(p.problemas, [], `pie: ${N.pie} de ${N.pie} ≥ 4,5 (OK ${p.ok}, peor ${p.peor})`);
  const c = await contraste("cierre");
  assert.deepEqual(c.problemas, [], `cierre: ${N.cierre} de ${N.cierre} ≥ 4,5 (OK ${c.ok}, peor ${c.peor})`);
});

test("los instrumentos de aceptación de diseno/contacto/verificacion y diseno/pie/verificacion, corridos sobre T, dan lo mismo que en local —`ct.mjs` 34 de 34 y 16 de 16 con el formulario apagado, `pie.mjs` 34 de 34, el contraste de contacto 464 de 464, el del pie 288 de 288 y el del cierre 48 de 48, en 3 posiciones de scroll—", async () => {
  // (1) La sonda.
  const s = de(await sonda(), "a-he");
  assert.ok(s.ct?.existe && s.pie?.existe, "a-he: contacto y el cierre y el pie de peluquería (sonda)");
  // (2) Los totales, como los da local.
  assert.deepEqual(await ct(), [], "ct.mjs: 34 de 34");
  assert.deepEqual(await ctSinForm(), [], "ct.mjs --sin-formulario: 16 de 16");
  assert.deepEqual(await pie(), [], "pie.mjs: 34 de 34");
  for (const k of ["contacto", "pie", "cierre"] as const) assert.equal((await contraste(k)).ok, N[k], `contraste de ${k}: ${N[k]} de ${N[k]}`);
});

test("en `#contact` y en el footer de peluquería Frank Ruhl Libre se usa sólo en 300 y 500 (pendiente c de ARREGLOS-02, la última parte: contacto y pie)", async () => {
  // (1) La sonda (hebreo, 375). Hoy el h2 de contacto va en 900 y el del cierre en 700: aquí está el rojo.
  assert.deepEqual(juezPesos(de(await sonda(), "a-he")), [], "a-he: Frank Ruhl Libre sólo en 300 y 500 en #contact y en el footer");
  // (2) Las dos plantillas.
  assert.deepEqual((await estilos()).filter((f) => f.k.endsWith("-he")).flatMap(juezPesos), [], "A y C: Frank Ruhl Libre sólo en 300 y 500 en #contact y en el footer");
});

test("lo nuevo alcanza sólo a peluquería: contacto «ubicación y horarios» + «contacto» y el cierre y el pie se pintan en las plantillas de peluquería; en la home de los seis nichos de la flota a 375 ninguna sección pinta `.ct6` ni `.pie6`, y el estilo computado de cada sección y del footer, y de su `::before` y `::after`, es el mismo en el árbol del commit rojo que en HEAD", async () => {
  // (1) La sonda.
  const s = de(await sonda(), "a-he");
  assert.ok(s.ct?.existe && s.pie?.existe, "a-he: contacto y el pie de peluquería (sonda)");
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
