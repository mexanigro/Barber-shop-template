// CONEXION-05 · B · contrato, validador, guard y material de las cuatro filas de fondo y branding. B1 (T): verdad/contratos.json declara
// `ui` en las cuatro, el `guard` de `localPhotoMobile`, y deja `heroToBackdrop` sin `ui` y con `tipo` «derivado (transicion.mjs)» (D-64);
// CONTRATOS-HUECOS.md lleva la nota en la fila de cada campo; las otras 31 filas iguales a las del commit aprobado de VERDAD-09.
// B2 (H): una url de fondo local es **error**, no aviso. B3 (T): los dos guards nombran su clave y hueco.mjs da «18/36». B4 (T): D-65 en
// el fixture A y recrear real sin brechas nuevas. Sesión A (2026-09-22): tests rojos (hoy `ui: null` en las cinco, el validador acepta
// rutas locales, galeria-03 no nombra «texture», hero-viewport no nombra «localPhotoMobile», hueco 14/36 y el fixture A no tiene `mode`).
// Un mismo archivo en T y en H (cmp → 0): B1, B3 y B4 sólo corren en T, B2 sólo en H (por REPO).
// CONEXION-06 D2 (2026-09-23): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BLOQUE, CAMPOS_FOTO, CAMPO_UI, CONTRATOS, DERIVADA, FILAS, FIXTURES, GUARD_MOVIL, GUARD_TEXTURA, HUECO, NOTA_UI,
  RECREAR, REPO, ROOT, TIPO_DERIVADA, UI, VALIDADOR, VERDAD_09,
  branding, clon, conTemporalAsync, correr, correrLargo, filasDe, fixture, git, puertoLibreEn, ultimaLinea, type CampoFoto,
} from "./orden/conexion-05/_comun.ts";

type FilaJson = { id: string; tipo?: string; ui: unknown; contrato?: { campo?: string }; guard?: unknown; [k: string]: unknown };
type Contratos = { huecos: FilaJson[] };
type Check = { ok: boolean; detalle: string };
type Resultado = { id: string; checks: Record<"contrato" | "validador" | "ui" | "material" | "guard", Check>; hecho: boolean };
type Issue = { path: string; message: string; severity: "error" | "warning" };
type Brecha = { tipo: string; campo: string; hueco: string | null; detalle?: string };
type Informe = { firestore?: string; brechas: Brecha[]; diffs: { pagina: string; vista: number; pixels: number; size?: boolean }[] };
/** Los catorce huecos ya hechos al cerrar CONEXION-04 (línea base de esta orden). */
const BASE_HECHOS = [
  "hero.video", "hero.video.portrait", "hero.video.poster",
  "services.catalogo", "services.priceMax", "services.mode", "services.images", "services.featured", "services.surface",
  "gallery.variant", "gallery.items", "gallery.items.alt", "gallery.selection", "gallery.surface",
];
/** El campo de CONTRATOS-HUECOS.md por el que empieza la fila de cada hueco (la primera celda de la tabla). */
const CAMPO_MD: Record<string, string> = {
  "branding.mode": "palette.mode", "branding.texture": "branding.texture",
  "branding.localPhoto": "branding.localPhoto", "branding.localPhotoMobile": "branding.localPhotoMobile",
};

/** CONEXION-07 (2026-09-23) declaró el `guard` de estas seis filas (20/36 → 26/36): para esta copia son «las otras», y cambian. */
const CONEXION_07 = ["hero.titular", "hero.subtitle", "hero.cta", "testimonials.rating", "staff.photoUrl", "navbar.variant"];

if (REPO === "T") test("verdad/contratos.json y CH: `ui` en `branding.mode`, `branding.texture`, `branding.localPhoto` y `branding.localPhotoMobile` = `{ ruta: \"/clients/[clientId]\", componente: \"src/components/config-editors/fondo-editor.tsx\", campo: \"mode\" | \"texture\" | \"localPhoto\" | \"localPhotoMobile\" }`; `guard` de `branding.localPhotoMobile` = `{ archivo: \"tests/hero-viewport.test.ts\", clave: \"localPhotoMobile\" }`; `branding.heroToBackdrop` sin `ui` (D-64) y con `tipo` «derivado (transicion.mjs)»; en CH las filas de `branding.texture` (:100 y :156), `branding.localPhoto` (:147), `branding.localPhotoMobile` (:148) y `palette.mode → branding.mode` (:157) ganan la nota «casilla de fondo (CONEXION-05)»; las otras 31 filas del .json byte a byte como en 49d5121", () => {
  const actual = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as Contratos;
  for (const id of FILAS) {
    const fila = actual.huecos.find((h) => h.id === id);
    assert.ok(fila, `fila ${id} en ${CONTRATOS}`);
    assert.deepEqual(fila.ui, UI(id), `${id}.ui = ${JSON.stringify(UI(id))} (hay ${JSON.stringify(fila.ui)})`);
    assert.equal((fila.ui as { campo?: string } | null)?.campo, CAMPO_UI[id], `${id}.ui.campo = ${CAMPO_UI[id]} (la casilla nombra la clave; hueco.mjs lo comprueba en el componente)`);
  }
  // El guard que le falta a la foto vertical (D-11: el archivo nombra la clave).
  const movil = actual.huecos.find((h) => h.id === "branding.localPhotoMobile");
  assert.deepEqual(movil?.guard, GUARD_MOVIL, `branding.localPhotoMobile.guard = ${JSON.stringify(GUARD_MOVIL)} (hay ${JSON.stringify(movil?.guard)})`);
  // D-64: la relación hero → fondo es un derivado; ni casilla ni cambio de estado.
  const derivada = actual.huecos.find((h) => h.id === DERIVADA);
  assert.ok(derivada, `fila ${DERIVADA} en ${CONTRATOS}`);
  assert.equal(derivada.ui, null, `${DERIVADA}.ui sigue en null (D-64: lo calcula transicion.mjs)`);
  assert.equal(derivada.tipo, TIPO_DERIVADA, `${DERIVADA}.tipo = «${TIPO_DERIVADA}» (hay «${String(derivada.tipo)}»)`);
  // Las otras 31 filas: iguales, campo a campo, a las del commit aprobado de VERDAD-09 (la línea base de esta orden).
  const base = JSON.parse(git(ROOT, "show", `${VERDAD_09.aprobado.T}:${CONTRATOS}`)) as Contratos;
  assert.equal(base.huecos.length, 36, "precondición: 36 filas en la línea base");
  assert.equal(actual.huecos.length, 36, "siguen siendo 36 filas");
  assert.deepEqual(actual.huecos.map((h) => h.id), base.huecos.map((h) => h.id), "mismos ids en el mismo orden");
  const tocadas = [...FILAS, DERIVADA] as readonly string[];
  const otras = base.huecos.filter((h) => !tocadas.includes(h.id));
  assert.equal(otras.length, 31, `31 filas fuera de las cuatro y de ${DERIVADA} (hay ${otras.length})`);
  // CONEXION-06 (2026-09-23) movió las dos filas que hizo (`ui` + `validador` en paleta, `ui` + `guard` en hero.eyebrow): idem.
  const CONEXION_06 = ["paleta", "hero.eyebrow"];
  for (const fila of otras) if (![...CONEXION_06, ...CONEXION_07].includes(fila.id)) assert.deepEqual(actual.huecos.find((h) => h.id === fila.id), fila, `la fila ${fila.id} no cambia`);
  // El .md lleva la nota en cada fila cuya primera celda empieza por el campo (texture tiene dos: la del fondo y la de la textura).
  const md = readFileSync(join(BLOQUE, "CONTRATOS-HUECOS.md"), "utf8").split(/\r?\n/);
  for (const id of FILAS) {
    const campo = CAMPO_MD[id];
    const filas = filasDe(md, campo);
    assert.ok(filas.length > 0, `CONTRATOS-HUECOS.md tiene alguna fila que empieza por «${campo}» (${id})`);
    for (const fila of filas) assert.ok(fila.includes(NOTA_UI), `la fila de ${id} («${campo}») en CONTRATOS-HUECOS.md dice «${NOTA_UI}»:\n${fila.slice(0, 400)}`);
  }
});

if (REPO === "H") test("`validateReplanteoHuecos` da **error** (no aviso) por cada `branding.texture`, `branding.localPhoto` o `branding.localPhotoMobile` presente que no empiece por `https://` («producción no sirve rutas locales», nombra la clave), además de sus reglas actuales (par local/localMobile, mode light|dark, heroToBackdrop cuando hay vídeo y foto); los fixtures A (con D-65) y C pasan sin errores; un config con `branding.localPhoto = \"/dev-fixtures/media/paleta-a/local.jpg\"` es rechazado con path `branding.localPhoto`", async () => {
  const m = (await import(pathToFileURL(resolve(ROOT, VALIDADOR)).href)) as { validateReplanteoHuecos: (c: unknown) => Issue[] };
  assert.equal(typeof m.validateReplanteoHuecos, "function", "exporta validateReplanteoHuecos");
  const huecos = m.validateReplanteoHuecos;
  const errores = (c: unknown) => huecos(c).filter((i) => i.severity === "error");
  const A = clon(fixture("a"));
  branding(A).mode ??= "light"; // D-65 mientras el campo no esté en disco (B4 lo exige allí).
  // Una ruta local en branding.localPhoto es error (no aviso), con el path de esa clave.
  const malo = clon(A);
  branding(malo).localPhoto = "/dev-fixtures/media/paleta-a/local.jpg";
  const eLocal = errores(malo);
  assert.ok(eLocal.some((i) => i.path === "branding.localPhoto"), `branding.localPhoto local da un error con path branding.localPhoto (errores: ${JSON.stringify(eLocal)}; avisos: ${JSON.stringify(huecos(malo).filter((i) => i.severity === "warning").map((i) => i.path))})`);
  assert.ok(eLocal.filter((i) => i.path === "branding.localPhoto").some((i) => i.message.includes("producción no sirve rutas locales")), `el error dice «producción no sirve rutas locales»: ${JSON.stringify(eLocal)}`);
  // Los tres campos, cada uno con su path; y con la url real vuelven a pasar.
  for (const campo of CAMPOS_FOTO as readonly CampoFoto[]) {
    const c = clon(A);
    branding(c)[campo] = `/dev-fixtures/media/paleta-a/${campo}.jpg`;
    assert.ok(errores(c).some((i) => i.path === `branding.${campo}`), `branding.${campo} local → error con path branding.${campo}`);
    const http = clon(A);
    branding(http)[campo] = "http://inseguro/x.jpg";
    assert.ok(errores(http).some((i) => i.path === `branding.${campo}`), `branding.${campo} con http:// tampoco pasa (producción sirve https://)`);
  }
  // Las reglas actuales siguen: mode fuera del enum, par local/localMobile y heroToBackdrop con vídeo y foto.
  const modo = clon(A);
  branding(modo).mode = "sepia";
  assert.ok(errores(modo).some((i) => i.path === "branding.mode"), "branding.mode fuera de light|dark sigue siendo error");
  const sinMovil = clon(A);
  delete branding(sinMovil).localPhotoMobile;
  assert.ok(huecos(sinMovil).some((i) => i.severity === "warning" && i.path === "branding.localPhotoMobile"), "sigue el aviso del par local/localMobile (D5)");
  const sinRel = clon(A);
  delete branding(sinRel).heroToBackdrop;
  assert.ok(huecos(sinRel).some((i) => i.severity === "warning" && i.path === "branding.heroToBackdrop"), "sigue el aviso de heroToBackdrop cuando hay vídeo del hero y foto del local");
  // Y los fixtures reales pasan sin errores: las tres urls de A y de C son https:// de Storage.
  for (const p of ["a", "c"] as const) {
    const f = clon(fixture(p));
    branding(f).mode ??= "light";
    for (const campo of CAMPOS_FOTO) assert.match(String(branding(f)[campo]), /^https:\/\//, `precondición: el fixture ${p.toUpperCase()} tiene branding.${campo} en https://`);
    assert.deepEqual(errores(f), [], `el fixture ${p.toUpperCase()} no da errores`);
  }
});

if (REPO === "T") test("tests/galeria-03.test.ts nombra literalmente «texture» y tests/hero-viewport.test.ts nombra literalmente «localPhotoMobile» (en el caso de 375, donde la capa fija monta la foto vertical) sin cambiar lo que afirman; `hueco.mjs --json` da las cinco casillas en «sí» y `hecho: true` en `branding.mode`, `branding.texture`, `branding.localPhoto` y `branding.localPhotoMobile`, y el total es «18/36 huecos hechos»; `branding.heroToBackdrop` sigue sin hacer (D-64)", () => {
  for (const g of [GUARD_TEXTURA, GUARD_MOVIL]) {
    const texto = readFileSync(resolve(ROOT, g.archivo), "utf8");
    assert.ok(texto.includes(g.clave), `${g.archivo} debe nombrar «${g.clave}»`);
  }
  // La foto vertical se monta en 375: el guard la nombra donde ya mide esa vista.
  assert.match(readFileSync(resolve(ROOT, GUARD_MOVIL.archivo), "utf8"), /375[\s\S]{0,4000}localPhotoMobile|localPhotoMobile[\s\S]{0,4000}375/, `${GUARD_MOVIL.archivo} nombra «${GUARD_MOVIL.clave}» junto al caso de 375`);
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
  assert.deepEqual(hechos, [...BASE_HECHOS, ...FILAS, "paleta", "hero.eyebrow", ...CONEXION_07].sort(), "hechos = los catorce de la línea base + las cuatro filas de fondo + `paleta` y `hero.eyebrow` (CONEXION-06) + las seis de CONEXION-07; los otros 10 no cambian de estado");
  assert.equal(filas.find((f) => f.id === DERIVADA)?.hecho, false, `${DERIVADA} sigue sin hacer (D-64)`);
  const r = correr([HUECO]);
  assert.equal(ultimaLinea(r.stdout), "26/36 huecos hechos", `el texto termina con «26/36 huecos hechos» (CONEXION-06 sumó «paleta» y «hero.eyebrow»; CONEXION-07, sus seis guards; última línea: «${ultimaLinea(r.stdout)}»)`);
});

if (REPO === "T") test("dev-fixtures/peluqueria-paleta-a.json tiene `branding.mode` = `\"light\"` y nada más cambia en los fixtures (`git diff 49d5121 HEAD --stat -- dev-fixtures/` = una línea en A); `recrear.mjs --paleta a --sin-firestore --paginas home --vistas 375 --puerto <libre>` y `--paleta c` no producen ninguna brecha «validador H rechaza» ni «material que producción no sirve», y las brechas totales no superan la línea base (A ≤ 1, C ≤ 2): D-65 no cambia la página", async (t) => {
  // D-65 primero: sin `mode` en el fixture A, la afirmación («D-65 no cambia la página») no tiene sujeto.
  assert.equal(branding(fixture("a")).mode, "light", "precondición D-65: el fixture A tiene branding.mode = \"light\" en disco");
  assert.equal(branding(fixture("c")).mode, "dark", "el fixture C ya tenía branding.mode = \"dark\"");
  const stat = git(ROOT, "diff", VERDAD_09.aprobado.T, "HEAD", "--stat", "--", FIXTURES).split(/\r?\n/).filter((l) => l.includes("|"));
  assert.equal(stat.length, 1, `sólo un fixture cambia desde ${VERDAD_09.aprobado.T}:\n${stat.join("\n")}`);
  assert.match(stat[0], /peluqueria-paleta-a\.json/, `el fixture que cambia es el A: «${stat[0].trim()}»`);
  for (const [p, tope] of [["a", 1], ["c", 2]] as const) {
    const puerto = await puertoLibreEn(40000, 49151);
    await conTemporalAsync(async (tmp) => {
      const out = join(tmp, "out");
      const r = correrLargo([RECREAR, "--paleta", p, "--sin-firestore", "--paginas", "home", "--vistas", "375", "--puerto", String(puerto), "--out", out]);
      assert.ok(r.status === 0 || r.status === 2, `recrear --paleta ${p} sale 0 o 2 (salió ${r.status})\n${r.out.slice(-4000)}`);
      const ruta = join(out, `recrear-${p}.json`);
      assert.ok(existsSync(ruta), `recrear-${p}.json escrito en --out\n${r.out.slice(-3000)}`);
      const informe = JSON.parse(readFileSync(ruta, "utf8")) as Informe;
      assert.equal(informe.firestore, "saltado (--sin-firestore): declarado");
      assert.ok(informe.diffs.some((d) => d.pagina === "home" && d.vista === 375 && typeof d.pixels === "number"), `diff home 375 calculado (paleta ${p}): ${JSON.stringify(informe.diffs)}`);
      const tipos = (tipo: string) => informe.brechas.filter((b) => b.tipo === tipo);
      assert.deepEqual(tipos("puerto ocupado"), [], `paleta ${p}: ninguna brecha de puerto`);
      assert.deepEqual(tipos("validador H rechaza"), [], `paleta ${p}: ninguna brecha «validador H rechaza»: ${JSON.stringify(tipos("validador H rechaza").slice(0, 10))}`);
      assert.deepEqual(tipos("material que producción no sirve"), [], `paleta ${p}: ninguna brecha «material que producción no sirve»: ${JSON.stringify(tipos("material que producción no sirve").slice(0, 10))}`);
      assert.ok(informe.brechas.length <= tope, `paleta ${p}: brechas totales ≤ ${tope} (línea base de CONEXION-04; hay ${informe.brechas.length}): ${JSON.stringify(informe.brechas.map((b) => `${b.tipo} · ${b.campo}`))}`);
      t.diagnostic(`recrear ${p} home 375: ${informe.brechas.length} brechas (${informe.brechas.map((b) => b.tipo).join(", ") || "ninguna"})`);
    });
  }
});
