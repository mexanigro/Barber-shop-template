// CONEXION-04 · B · contrato, validador y guard de las cuatro filas de galería. B1 (T): verdad/contratos.json declara `ui` en las cuatro
// y CONTRATOS-HUECOS.md lleva la nota en la fila de cada campo; las otras 32 filas iguales a las del commit aprobado de CONEXION-03.
// B2 (H): una `items[i].src` local es **error** y el respaldo `gallery[i]` desincronizado también (D-49). B3 (T): el guard de
// `gallery.surface` nombra «textura» y hueco.mjs da «14/36». Sesión A (2026-09-22): tests rojos (hoy `ui: null` en las cuatro, el
// validador no mira ni el `https://` ni el respaldo, galeria-03 no nombra «textura», hueco 10/36). Un mismo archivo en T y en H
// (cmp → 0): B1 y B3 sólo corren en T, B2 sólo en H (por REPO).
// VERDAD-08 E2 (2026-09-22): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BLOQUE, CAMPO_UI, CONEXION_03, CONTRATOS, FILAS, GUARD_SURFACE, HUECO, NOTA_UI, REPO, ROOT, UI, VALIDADOR,
  clon, correr, fixture, galeria, git, piezas, ultimaLinea,
} from "./orden/conexion-04/_util.ts";

type FilaJson = { id: string; tipo?: string; ui: unknown; contrato?: { campo?: string }; guard?: unknown; [k: string]: unknown };
type Contratos = { huecos: FilaJson[] };
type Check = { ok: boolean; detalle: string };
type Resultado = { id: string; checks: Record<"contrato" | "validador" | "ui" | "material" | "guard", Check>; hecho: boolean };
type Issue = { path: string; message: string; severity: "error" | "warning" };
/** Los diez huecos ya hechos al cerrar CONEXION-03 (línea base de esta orden). */
const BASE_HECHOS = [
  "hero.video", "hero.video.portrait", "hero.video.poster",
  "services.catalogo", "services.priceMax", "services.mode", "services.images", "services.featured", "services.surface",
  "gallery.variant",
];

/** CONEXION-07 (2026-09-23) declaró el `guard` de estas seis filas (20/36 → 26/36): para esta copia son «las otras», y cambian. */
const CONEXION_07 = ["hero.titular", "hero.subtitle", "hero.cta", "testimonials.rating", "staff.photoUrl", "navbar.variant"];
/** CONEXION-08 (2026-09-23) dio material genérico y guard a estas tres (26/36 → 29/36), y cambió el `tipo` de `features.themeToggle`
 *  (D-82: sale de la secuencia de conexión y va a DISEÑO-01, sin hacerse): también son «las otras», y también cambian. */
const CONEXION_08 = ["contact.phone", "brand.logo", "brand.logoDark"];
const TOGGLE_08 = "features.themeToggle";

if (REPO === "T") test("verdad/contratos.json y CH: `ui` en `gallery.items`, `gallery.items.alt`, `gallery.selection` y `gallery.surface` = `{ ruta: \"/clients/[clientId]\", componente: \"src/components/config-editors/gallery-editor.tsx\", campo: \"items\" | \"alt\" | \"selection\" | \"surface\" }`; en CH las filas de `sections.gallery.items[]`, `items[].alt`, `gallery.selection` y `sections.gallery.surface` ganan la nota «casilla de galería (CONEXION-04)»; las otras 32 filas del .json byte a byte como en 4c44c0c", () => {
  const actual = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as Contratos;
  for (const id of FILAS) {
    const fila = actual.huecos.find((h) => h.id === id);
    assert.ok(fila, `fila ${id} en ${CONTRATOS}`);
    assert.deepEqual(fila.ui, UI(id), `${id}.ui = ${JSON.stringify(UI(id))} (hay ${JSON.stringify(fila.ui)})`);
    assert.equal((fila.ui as { campo?: string } | null)?.campo, CAMPO_UI[id], `${id}.ui.campo = ${CAMPO_UI[id]} (la casilla nombra la clave; hueco.mjs lo comprueba en el componente)`);
  }
  // Las otras 32 filas: iguales, campo a campo, a las del commit aprobado de CONEXION-03 (la línea base de esta orden).
  const base = JSON.parse(git(ROOT, "show", `${CONEXION_03.aprobado.T}:${CONTRATOS}`)) as Contratos;
  assert.equal(base.huecos.length, 36, "precondición: 36 filas en la línea base");
  assert.equal(actual.huecos.length, 36, "siguen siendo 36 filas");
  assert.deepEqual(actual.huecos.map((h) => h.id), base.huecos.map((h) => h.id), "mismos ids en el mismo orden");
  const cuatro = FILAS as readonly string[];
  const otras = base.huecos.filter((h) => !cuatro.includes(h.id));
  assert.equal(otras.length, 32, `32 filas fuera de las cuatro (hay ${otras.length})`);
  // CONEXION-05 (2026-09-23) movió las cinco de fondo y branding (las cuatro con casilla nueva y el `tipo` del derivado): idem.
  const FONDO = ["branding.mode", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile", "branding.heroToBackdrop"];
  // CONEXION-06 (2026-09-23) movió las dos filas que hizo (`ui` + `validador` en paleta, `ui` + `guard` en hero.eyebrow): idem.
  const CONEXION_06 = ["paleta", "hero.eyebrow"];
  for (const fila of otras) if (![...FONDO, ...CONEXION_06, ...CONEXION_07, ...CONEXION_08, TOGGLE_08].includes(fila.id)) assert.deepEqual(actual.huecos.find((h) => h.id === fila.id), fila, `la fila ${fila.id} no cambia`);
  // El .md lleva la nota en la fila que empieza por el `contrato.campo` de cada una de las cuatro.
  const md = readFileSync(join(BLOQUE, "CONTRATOS-HUECOS.md"), "utf8").split(/\r?\n/);
  for (const id of FILAS) {
    const campo = actual.huecos.find((h) => h.id === id)?.contrato?.campo ?? "";
    const filas = md.filter((l) => l.startsWith(`| ${campo}`) || l.startsWith(`| **${campo}**`));
    assert.ok(filas.length > 0, `CONTRATOS-HUECOS.md tiene alguna fila que empieza por «${campo}» (${id})`);
    assert.ok(filas.some((l) => l.includes(NOTA_UI)), `alguna fila de ${id} («${campo}») en CONTRATOS-HUECOS.md dice «${NOTA_UI}»:\n${filas.join("\n").slice(0, 1200)}`);
  }
});

if (REPO === "H") test("`validateReplanteoHuecos` da **error** (no aviso) por cada `sections.gallery.items[i].src` no vacío que no empiece por `https://` (path `sections.gallery.items[i].src`, «producción no sirve rutas locales»), y por cada `gallery[i]` de la raíz distinto de `sections.gallery.items[i].src` cuando existen los dos (path `gallery[i]`, «respaldo desincronizado», D-49); los fixtures A y C pasan sin errores; un config con `items[0].src` local es rechazado; un config con `gallery[0]` distinto de `items[0].src` es rechazado", async () => {
  const m = (await import(pathToFileURL(resolve(ROOT, VALIDADOR)).href)) as { validateReplanteoHuecos: (c: unknown) => Issue[] };
  assert.equal(typeof m.validateReplanteoHuecos, "function", "exporta validateReplanteoHuecos");
  const huecos = m.validateReplanteoHuecos;
  const local = (i: number) => `/dev-fixtures/media/paleta-a/galeria-${i + 1}.jpg`;
  // Una ruta local en items[0].src es error (no aviso), con el path de esa posición. El respaldo se mueve con ella (D-49) para que el
  // único error sea el del `https://`.
  const A = fixture("a");
  const malo = clon(A);
  (piezas(malo)[0] as Record<string, unknown>).src = local(0);
  (malo.gallery as string[])[0] = local(0);
  const errores = huecos(malo).filter((i) => i.severity === "error");
  assert.ok(errores.some((i) => i.path === "sections.gallery.items[0].src"), `items[0].src local da un error con path sections.gallery.items[0].src (errores: ${JSON.stringify(errores)}; avisos: ${JSON.stringify(huecos(malo).filter((i) => i.severity === "warning").map((i) => i.path))})`);
  assert.ok(errores.filter((i) => i.path === "sections.gallery.items[0].src").some((i) => i.message.includes("producción no sirve rutas locales")), `el error dice «producción no sirve rutas locales»: ${JSON.stringify(errores)}`);
  // Cada posición: presente y sin https:// → error con esa posición.
  piezas(A).forEach((_, i) => {
    const c = clon(A);
    (piezas(c)[i] as Record<string, unknown>).src = local(i);
    (c.gallery as string[])[i] = local(i);
    assert.ok(huecos(c).some((x) => x.severity === "error" && x.path === `sections.gallery.items[${i}].src`), `items[${i}].src local → error con path sections.gallery.items[${i}].src`);
  });
  // El respaldo desincronizado (D-49): gallery[0] ≠ items[0].src con los dos presentes.
  const desync = clon(A);
  (desync.gallery as string[])[0] = "https://otra/galeria-9.jpg";
  const eDesync = huecos(desync).filter((i) => i.severity === "error");
  assert.ok(eDesync.some((i) => i.path === "gallery[0]"), `gallery[0] distinto de items[0].src da un error con path gallery[0] (errores: ${JSON.stringify(eDesync)})`);
  assert.ok(eDesync.filter((i) => i.path === "gallery[0]").some((i) => i.message.includes("respaldo desincronizado")), `el error dice «respaldo desincronizado»: ${JSON.stringify(eDesync)}`);
  // Y los fixtures reales pasan sin errores (el respaldo de A y C ya está en sincronía y las seis src son https://).
  for (const p of ["a", "c"] as const) {
    const f = fixture(p);
    assert.equal(galeria(f).surface, "textura", `precondición: el fixture ${p.toUpperCase()} tiene sections.gallery.surface = textura`);
    assert.deepEqual(huecos(f).filter((i) => i.severity === "error"), [], `el fixture ${p.toUpperCase()} no da errores`);
  }
});

if (REPO === "T") test("tests/galeria-03.test.ts nombra literalmente «textura» (el guard de `gallery.surface`, con la clave que `contratos.json` le asigna) sin cambiar lo que afirma; `hueco.mjs --json` da las cinco casillas en «sí» y `hecho: true` en `gallery.items`, `gallery.items.alt`, `gallery.selection` y `gallery.surface`, y el total es «14/36 huecos hechos»; `gallery.presion` y `pagina.galeria` siguen sin hacer (D-48)", () => {
  const guard = readFileSync(resolve(ROOT, GUARD_SURFACE.archivo), "utf8");
  assert.ok(guard.includes(GUARD_SURFACE.clave), `${GUARD_SURFACE.archivo} debe nombrar «${GUARD_SURFACE.clave}»`);
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
  assert.deepEqual(hechos, [...BASE_HECHOS, ...FILAS, "branding.mode", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile", "paleta", "hero.eyebrow", ...CONEXION_07, ...CONEXION_08].sort(), "hechos = los diez de la línea base + las cuatro filas de galería + las cuatro de fondo y branding (CONEXION-05) + «paleta» y «hero.eyebrow» (CONEXION-06) + las seis de CONEXION-07 + las tres de CONEXION-08; los otros 7 no cambian de estado");
  for (const id of ["gallery.presion", "pagina.galeria"]) assert.equal(filas.find((f) => f.id === id)?.hecho, false, `${id} sigue sin hacer (D-48)`);
  const r = correr([HUECO]);
  assert.equal(ultimaLinea(r.stdout), "29/36 huecos hechos", `el texto termina con «29/36 huecos hechos» (CONEXION-06 sumó «paleta» y «hero.eyebrow»; CONEXION-07, sus seis guards; CONEXION-08, sus tres filas; última línea: «${ultimaLinea(r.stdout)}»)`);
});
