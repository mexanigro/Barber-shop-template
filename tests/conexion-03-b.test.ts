// CONEXION-03 · B · contrato, validador, guard y material de las cinco filas de servicios. B1 (T): verdad/contratos.json declara `ui` en
// las cinco, el `guard` de priceMax y los `tipo` de surface (D-42) y featured (D-41), y CONTRATOS-HUECOS.md lleva la nota en la fila de
// cada campo; las otras 31 filas iguales a las del commit aprobado de CONEXION-02. B2 (H): `featured` deja de avisar «exactamente 2» y
// una `images[i]` local es error, no aviso. B3 (T): los fixtures ganan `featured` (D-44) y hueco.mjs da «10/36». Sesión A (2026-09-22):
// tests rojos (hoy `ui: null` en las cinco, el validador avisa por ≠ 2 y no mira las images, hueco 5/36). Un mismo archivo en T y en H
// (cmp → 0): B1 y B3 sólo corren en T, B2 sólo en H (por REPO).
// CONEXION-04 D1 (2026-09-22): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BLOQUE, CAMPO_UI, CONEXION_02, CONTRATOS, FILAS, GUARD_PRICEMAX, HUECO, NOTA_UI, REPO, ROOT,
  TIPO_FEATURED, TIPO_SURFACE, UI, VALIDADOR, clon, correr, fixture, git, seccion, servicios, ultimaLinea,
} from "./orden/conexion-03/_util.ts";

const FIXTURES = ["dev-fixtures/peluqueria-paleta-a.json", "dev-fixtures/peluqueria-paleta-c.json"];
type Fila = { id: string; tipo?: string; ui: unknown; contrato?: { campo?: string }; guard?: unknown; [k: string]: unknown };
type Contratos = { huecos: Fila[] };
type Check = { ok: boolean; detalle: string };
type Resultado = { id: string; checks: Record<"contrato" | "validador" | "ui" | "material" | "guard", Check>; hecho: boolean };
type Issue = { path: string; message: string; severity: "error" | "warning" };
/** Los dos primeros ids del catálogo de un fixture (D-44). */
const dosPrimeros = (p: "a" | "c") => servicios(fixture(p)).slice(0, 2).map((s) => String(s.id));

/** CONEXION-07 (2026-09-23) declaró el `guard` de estas seis filas (20/36 → 26/36): para esta copia son «las otras», y cambian. */
const CONEXION_07 = ["hero.titular", "hero.subtitle", "hero.cta", "testimonials.rating", "staff.photoUrl", "navbar.variant"];
/** CONEXION-08 (2026-09-23) dio material genérico y guard a estas tres (26/36 → 29/36), y cambió el `tipo` de `features.themeToggle`
 *  (D-82: sale de la secuencia de conexión y va a DISEÑO-01, sin hacerse): también son «las otras», y también cambian. */
const CONEXION_08 = ["contact.phone", "brand.logo", "brand.logoDark"];
const TOGGLE_08 = "features.themeToggle";

if (REPO === "T") test("verdad/contratos.json y CH: `ui` en `services.priceMax`, `services.mode`, `services.images`, `services.featured`, `services.surface` = `{ ruta: \"/clients/[clientId]\", componente: \"src/components/config-editors/services-editor.tsx\", campo: \"priceMax\" | \"mode\" | \"images\" | \"featured\" | \"surface\" }`; `guard` de `services.priceMax` = `{ archivo: \"tests/services-v6.test.ts\", clave: \"priceMax\" }`; `tipo` de `services.surface` = «enum base|alt|velo|liso|textura» (D-42) y de `services.featured` = «orden (lista de ids, fase 2b)» (D-41); en bloque-04/CONTRATOS-HUECOS.md, la fila que empieza por el `contrato.campo` de cada una de las cinco lleva la nota «casilla de servicios (CONEXION-03)» (como las tres del hero llevan «casilla del hero (CONEXION-02)»); las otras 31 filas del .json byte a byte como en 3c154f6", () => {
  const actual = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as Contratos;
  for (const id of FILAS) {
    const fila = actual.huecos.find((h) => h.id === id);
    assert.ok(fila, `fila ${id} en ${CONTRATOS}`);
    assert.deepEqual(fila.ui, UI(id), `${id}.ui = ${JSON.stringify(UI(id))} (hay ${JSON.stringify(fila.ui)})`);
  }
  assert.deepEqual(actual.huecos.find((h) => h.id === "services.priceMax")?.guard, GUARD_PRICEMAX, `services.priceMax.guard = ${JSON.stringify(GUARD_PRICEMAX)}`);
  assert.equal(actual.huecos.find((h) => h.id === "services.surface")?.tipo, TIPO_SURFACE, `services.surface.tipo = «${TIPO_SURFACE}» (D-42)`);
  assert.equal(actual.huecos.find((h) => h.id === "services.featured")?.tipo, TIPO_FEATURED, `services.featured.tipo = «${TIPO_FEATURED}» (D-41)`);
  // Las otras 31 filas: iguales, campo a campo, a las del commit aprobado de CONEXION-02 (la línea base de esta orden).
  const base = JSON.parse(git(ROOT, "show", `${CONEXION_02.aprobado.T}:${CONTRATOS}`)) as Contratos;
  assert.equal(base.huecos.length, 36, "precondición: 36 filas en la línea base");
  assert.equal(actual.huecos.length, 36, "siguen siendo 36 filas");
  assert.deepEqual(actual.huecos.map((h) => h.id), base.huecos.map((h) => h.id), "mismos ids en el mismo orden");
  const cinco = FILAS as readonly string[];
  const otras = base.huecos.filter((h) => !cinco.includes(h.id));
  assert.equal(otras.length, 31, `31 filas fuera de las cinco (hay ${otras.length})`);
  // CONEXION-04 (2026-09-22) movió cuatro filas más (las de galería): siguen siendo «las otras», pero su línea base es la suya, no la de CONEXION-02.
  const GALERIA = ["gallery.items", "gallery.items.alt", "gallery.selection", "gallery.surface"];
  // CONEXION-05 (2026-09-23) movió las cinco de fondo y branding (las cuatro con casilla nueva y el `tipo` del derivado): idem.
  const FONDO = ["branding.mode", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile", "branding.heroToBackdrop"];
  // CONEXION-06 (2026-09-23) movió las dos filas que hizo (`ui` + `validador` en paleta, `ui` + `guard` en hero.eyebrow): idem.
  const CONEXION_06 = ["paleta", "hero.eyebrow"];
  for (const fila of otras) if (![...GALERIA, ...FONDO, ...CONEXION_06, ...CONEXION_07, ...CONEXION_08, TOGGLE_08].includes(fila.id)) assert.deepEqual(actual.huecos.find((h) => h.id === fila.id), fila, `la fila ${fila.id} no cambia`);
  // El .md lleva la nota en la fila que empieza por el `contrato.campo` de cada una de las cinco.
  const md = readFileSync(join(BLOQUE, "CONTRATOS-HUECOS.md"), "utf8").split(/\r?\n/);
  for (const id of FILAS) {
    const campo = actual.huecos.find((h) => h.id === id)?.contrato?.campo ?? "";
    const filas = md.filter((l) => l.startsWith(`| ${campo}`) || l.startsWith(`| **${campo}**`));
    assert.ok(filas.length > 0, `CONTRATOS-HUECOS.md tiene alguna fila que empieza por «${campo}» (${id})`);
    assert.ok(filas.some((l) => l.includes(NOTA_UI)), `alguna fila de ${id} («${campo}») en CONTRATOS-HUECOS.md dice «${NOTA_UI}»:\n${filas.join("\n").slice(0, 1200)}`);
  }
  // Y el campo corto de la `ui` es el que CAMPO_UI declara (la casilla nombra la clave; hueco.mjs lo comprueba en el componente).
  for (const id of FILAS) assert.equal((actual.huecos.find((h) => h.id === id)?.ui as { campo?: string } | null)?.campo, CAMPO_UI[id], `${id}.ui.campo = ${CAMPO_UI[id]}`);
});

if (REPO === "H") test("`validateReplanteoHuecos` acepta `sections.services.featured` de cualquier longitud ≥ 1 con ids existentes y sin repetir, sin el aviso «exactamente 2» (D-41), y sigue dando error por id inexistente o repetido y por lista que no es de strings; `validateVariantContracts` da **error** (no aviso) por cada `sections.services.images[i]` no vacío que no empiece por `https://` (como `hero.video.*` en CONEXION-02); los fixtures A y C (con D-44) pasan sin errores; un config con `images[0] = \"/dev-fixtures/media/paleta-a/servicio-1.jpg\"` es rechazado con path `sections.services.images[0]`", async () => {
  const m = (await import(pathToFileURL(resolve(ROOT, VALIDADOR)).href)) as {
    validateReplanteoHuecos: (c: unknown) => Issue[];
    validateVariantContracts: (c: unknown) => Issue[];
  };
  assert.equal(typeof m.validateReplanteoHuecos, "function", "exporta validateReplanteoHuecos");
  assert.equal(typeof m.validateVariantContracts, "function", "exporta validateVariantContracts");
  const huecos = m.validateReplanteoHuecos, variantes = m.validateVariantContracts;
  const catalogo = ["uno", "dos", "tres", "cuatro"];
  const conFeatured = (featured: unknown) => ({ services: catalogo.map((id) => ({ id, name: id, price: 10 })), sections: { services: { variant: "v6", featured } } });
  // Cualquier longitud ≥ 1 de ids existentes sin repetir: ni error ni el aviso «exactamente 2».
  for (const n of [1, 2, 3, 4]) {
    const issues = huecos(conFeatured(catalogo.slice(0, n)));
    const suyos = issues.filter((i) => i.path === "sections.services.featured");
    assert.deepEqual(suyos, [], `featured con ${n} ids existentes no produce ningún issue (hay ${JSON.stringify(suyos)})`);
    assert.ok(!issues.some((i) => i.message.includes("exactamente 2")), `ningún aviso «exactamente 2» con ${n} ids (D-41)`);
  }
  // Y sigue dando error donde el template no puede resolverlo.
  const errorEn = (c: unknown) => huecos(c).filter((i) => i.severity === "error" && i.path === "sections.services.featured");
  assert.ok(errorEn(conFeatured(["uno", "fantasma"])).length > 0, "un id inexistente sigue siendo error");
  assert.ok(errorEn(conFeatured(["uno", "uno"])).length > 0, "un id repetido sigue siendo error");
  assert.ok(errorEn(conFeatured([1, 2])).length > 0, "una lista que no es de strings sigue siendo error");
  assert.ok(errorEn(conFeatured("uno")).length > 0, "featured que no es lista sigue siendo error");

  // images: una ruta local es error (no aviso), con el path de esa posición.
  const conD44 = (p: "a" | "c") => { const f = clon(fixture(p)); (seccion(f) as Record<string, unknown>).featured = dosPrimeros(p); return f; };
  const A = conD44("a"), C = conD44("c");
  assert.equal(seccion(A).variant, "v6", "precondición: el fixture A es services v6");
  assert.deepEqual(variantes(A).filter((i) => i.severity === "error"), [], "el fixture A (con D-44) no da errores");
  assert.deepEqual(variantes(C).filter((i) => i.severity === "error"), [], "el fixture C (con D-44) no da errores");
  const malo = clon(A);
  (seccion(malo).images as string[])[0] = "/dev-fixtures/media/paleta-a/servicio-1.jpg";
  const errores = variantes(malo).filter((i) => i.severity === "error");
  assert.ok(errores.some((i) => i.path === "sections.services.images[0]"), `images[0] local da un error con path sections.services.images[0] (errores: ${JSON.stringify(errores)}; avisos: ${JSON.stringify(variantes(malo).filter((i) => i.severity === "warning").map((i) => i.path))})`);
  assert.ok(errores.filter((i) => i.path === "sections.services.images[0]").some((i) => i.message.includes("producción no sirve rutas locales")), `el error dice «producción no sirve rutas locales»: ${JSON.stringify(errores)}`);
  // Cada posición no vacía: presente y sin https:// → error con esa posición; la vacía del fixture A no es error.
  const imagenes = seccion(A).images as string[];
  imagenes.forEach((url, i) => {
    if (!url) return;
    const c = clon(A);
    (seccion(c).images as string[])[i] = `/dev-fixtures/media/paleta-a/servicio-${i + 1}.jpg`;
    assert.ok(variantes(c).some((x) => x.severity === "error" && x.path === `sections.services.images[${i}]`), `images[${i}] local → error con path sections.services.images[${i}]`);
  });
  assert.equal(imagenes[10], "", "precondición: images[10] del fixture A está vacía");
  assert.ok(!variantes(A).some((i) => i.severity === "error" && i.path === "sections.services.images[10]"), "una posición vacía no es error (sólo el aviso de foto que falta)");
});

if (REPO === "T") test("dev-fixtures/peluqueria-paleta-a.json y -c.json tienen `sections.services.featured` = los dos primeros ids de su catálogo (A: los dos primeros de `services[]`; C ídem), y nada más cambia en ellos (`git diff 3c154f6 HEAD -- dev-fixtures/` = esas dos líneas); `hueco.mjs --json` da las cinco casillas en «sí» y `hecho: true` en las cinco filas de servicios, y el total es «10/36 huecos hechos»; `pagina.servicios` sigue sin hacer (D-45)", () => {
  for (const p of ["a", "c"] as const) {
    const f = fixture(p);
    assert.deepEqual(seccion(f).featured, dosPrimeros(p), `el fixture ${p.toUpperCase()} tiene featured = los dos primeros ids de su catálogo`);
  }
  // Nada más cambia: sólo los dos fixtures, y sólo por esa clave.
  const tocados = git(ROOT, "diff", "--name-only", CONEXION_02.aprobado.T, "HEAD", "--", "dev-fixtures/").split(/\r?\n/).filter(Boolean).sort();
  assert.deepEqual(tocados, [...FIXTURES].sort(), `sólo cambian los dos fixtures desde ${CONEXION_02.aprobado.T} (cambiaron ${JSON.stringify(tocados)})`);
  for (const [p, archivo] of [["a", FIXTURES[0]], ["c", FIXTURES[1]]] as const) {
    const antes = JSON.parse(git(ROOT, "show", `${CONEXION_02.aprobado.T}:${archivo}`)) as Record<string, unknown>;
    const ahora = clon(fixture(p));
    delete (seccion(ahora) as Record<string, unknown>).featured;
    // CONEXION-05 (D-65) le añadió `branding.mode` al fixture A: se quita también antes de comparar con la línea base de CONEXION-02.
    if (p === "a") delete (ahora.branding as Record<string, unknown>).mode;
    // CONEXION-08 (D-79..D-81) les añadió a los dos el teléfono y los logos genéricos de plantilla: se quitan igual.
    delete (ahora.brand as Record<string, unknown>).logo;
    delete (ahora.brand as Record<string, unknown>).logoDark;
    delete (ahora as Record<string, unknown>).contact;
    assert.deepEqual(ahora, antes, `${archivo} sólo gana sections.services.featured (D-44), branding.mode (D-65) y el material genérico de CONEXION-08 (D-79..D-81)`);
  }
  // hueco.mjs: las cinco filas con los cinco «sí» y hechas; el total 10/36; pagina.servicios sigue sin hacer.
  const j = correr([HUECO, "--json"]);
  assert.ok(j.status === 0 || j.status === 2, `hueco.mjs --json sale 0 o 2 (salió ${j.status})\n${j.out.slice(-2000)}`);
  const filas = JSON.parse(j.stdout) as Resultado[];
  assert.equal(filas.length, 36);
  for (const id of FILAS) {
    const f = filas.find((x) => x.id === id);
    assert.ok(f, `fila ${id}`);
    for (const k of ["contrato", "validador", "ui", "material", "guard"] as const) assert.equal(f.checks[k].ok, true, `${id} · ${k}: «sí» (${f.checks[k].detalle})`);
    assert.equal(f.hecho, true, `${id}: hecho`);
  }
  const hechos = filas.filter((f) => f.hecho).map((f) => f.id).sort();
  assert.deepEqual(hechos, ["gallery.items", "gallery.items.alt", "gallery.selection", "gallery.surface", "gallery.variant", "hero.video", "hero.video.portrait", "hero.video.poster", "services.catalogo", "branding.mode", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile", "paleta", "hero.eyebrow", ...FILAS, ...CONEXION_07, ...CONEXION_08].sort(), "hechos = los cinco de la línea base + las cinco de servicios + las cuatro de galería (CONEXION-04) + las cuatro de fondo y branding (CONEXION-05) + «paleta» y «hero.eyebrow» (CONEXION-06) + las seis de CONEXION-07 + las tres de CONEXION-08");
  assert.equal(filas.find((f) => f.id === "pagina.servicios")?.hecho, false, "pagina.servicios sigue sin hacer (D-45)");
  const r = correr([HUECO]);
  assert.equal(ultimaLinea(r.stdout), "29/36 huecos hechos", `el texto termina con «29/36 huecos hechos» (CONEXION-06 sumó «paleta» y «hero.eyebrow»; CONEXION-07, sus seis guards; CONEXION-08, sus tres filas; última línea: «${ultimaLinea(r.stdout)}»)`);
});
