// CONEXION-02 · B · contrato, validador y guard de las tres filas del hero. B1 (T): verdad/contratos.json declara `ui` en hero.video,
// hero.video.portrait y hero.video.poster y CONTRATOS-HUECOS.md lo dice en sus tres filas; las otras 33 filas iguales a las del commit
// aprobado de VERDAD-07. B2 (H): validateVariantContracts da error (no aviso) ante un valor de hero.video.* que no empieza por https://.
// B3 (T): ajustes-01 nombra «hero.video» y «poster» sin cambiar lo que afirma; hueco.mjs --json da las tres filas hechas y «5/36 huecos
// hechos». Sesión A (2026-09-22): tests rojos (hoy `ui: null` en las tres, el validador sólo avisa, hueco 2/36). Un mismo archivo en T y
// en H (cmp → 0): B1 y B3 sólo corren en T, B2 sólo en H (por REPO).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BLOQUE, CAMPOS, clon, correr, FILAS_HERO, fixture, git, REPO, ROOT, UI_HERO, VERDAD_07 } from "./_util.ts";

const CONTRATOS = "verdad/contratos.json";
const GUARD = "tests/ajustes-01.test.ts";
const HUECO = "tools/verdad/hueco.mjs";
const VALIDADOR = "src/lib/config-validator.ts";
type Fila = { id: string; ui: unknown; contrato?: { campo?: string }; [k: string]: unknown };
type Contratos = { huecos: Fila[] };
type Check = { ok: boolean; detalle: string };
type Resultado = { id: string; checks: Record<"contrato" | "validador" | "ui" | "material" | "guard", Check>; hecho: boolean };
type Issue = { path: string; message: string; severity: "error" | "warning" };
const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";
/** Nombres de los tests de un archivo (primer argumento de cada `test(`), para comparar lo que afirma sin comparar el cuerpo. */
const nombresDeTests = (fuente: string) => [...fuente.matchAll(/^test\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/gm)].map((m) => m[1].slice(1, -1));

if (REPO === "T") test("verdad/contratos.json declara `ui` en `hero.video`, `hero.video.portrait` y `hero.video.poster`: `{ ruta: \"/clients/[clientId]\", componente: \"src/components/config-editors/hero-video-editor.tsx\", campo: \"hero.video\" | \"portrait\" | \"poster\" }`, y bloque-04/CONTRATOS-HUECOS.md dice lo mismo en las tres filas (columna UI: «casilla del hero (CONEXION-02)»); las otras 33 filas no cambian", () => {
  const actual = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as Contratos;
  for (const id of FILAS_HERO) {
    const fila = actual.huecos.find((h) => h.id === id);
    assert.ok(fila, `fila ${id} en ${CONTRATOS}`);
    assert.deepEqual(fila.ui, UI_HERO(id), `${id}.ui = ${JSON.stringify(UI_HERO(id))} (hay ${JSON.stringify(fila.ui)})`);
  }
  // Las otras 33 filas: iguales, campo a campo, a las del commit aprobado de VERDAD-07 (la línea base de esta orden).
  const base = JSON.parse(git(ROOT, "show", `${VERDAD_07.aprobado.T}:${CONTRATOS}`)) as Contratos;
  assert.equal(base.huecos.length, 36, "precondición: 36 filas en la línea base");
  assert.equal(actual.huecos.length, 36, "siguen siendo 36 filas");
  assert.deepEqual(actual.huecos.map((h) => h.id), base.huecos.map((h) => h.id), "mismos ids en el mismo orden");
  for (const fila of base.huecos) if (!(FILAS_HERO as readonly string[]).includes(fila.id)) assert.deepEqual(actual.huecos.find((h) => h.id === fila.id), fila, `la fila ${fila.id} no cambia`);
  // El .md dice lo mismo en las tres filas: la línea de tabla que empieza por su `contrato.campo` lleva «casilla del hero (CONEXION-02)».
  const md = readFileSync(join(BLOQUE, "CONTRATOS-HUECOS.md"), "utf8").split(/\r?\n/);
  for (const id of FILAS_HERO) {
    const campo = actual.huecos.find((h) => h.id === id)?.contrato?.campo ?? "";
    const linea = md.find((l) => l.startsWith(`| ${campo} |`));
    assert.ok(linea, `CONTRATOS-HUECOS.md tiene la fila «| ${campo} |»`);
    assert.ok(linea.includes("casilla del hero (CONEXION-02)"), `la fila de ${id} en CONTRATOS-HUECOS.md dice «casilla del hero (CONEXION-02)»:\n${linea}`);
  }
});

if (REPO === "H") test("`validateVariantContracts` de src/lib/config-validator.ts, además de sus avisos actuales, da **error** (no aviso) cuando un valor de `hero.video.*` está presente y no empieza por `https://` («producción no sirve rutas locales», nombra la clave); el fixture A y el C pasan sin errores; un config con `hero.video.mp4 = \"/dev-fixtures/media/paleta-a/hero.mp4\"` es rechazado", async () => {
  const m = (await import(pathToFileURL(resolve(ROOT, VALIDADOR)).href)) as { validateVariantContracts: (c: unknown) => Issue[] };
  assert.equal(typeof m.validateVariantContracts, "function", "exporta validateVariantContracts");
  const validar = m.validateVariantContracts;
  const A = fixture("a"), C = fixture("c");
  assert.equal((A.hero as Record<string, unknown>).variant, "v6", "precondición: el fixture A es hero v6 (validateVariantContracts mira hero.*)");
  // Rechazado: hero.video.mp4 con ruta local → error que nombra la clave.
  const malo = clon(A);
  ((malo.hero as Record<string, unknown>).video as Record<string, unknown>).mp4 = "/dev-fixtures/media/paleta-a/hero.mp4";
  const errores = validar(malo).filter((i) => i.severity === "error");
  assert.ok(errores.some((i) => i.path === "hero.video.mp4"), `hero.video.mp4 = /dev-fixtures/media/paleta-a/hero.mp4 da un error con path hero.video.mp4 (errores: ${JSON.stringify(errores)}; avisos: ${JSON.stringify(validar(malo).filter((i) => i.severity === "warning").map((i) => i.path))})`);
  assert.ok(errores.filter((i) => i.path === "hero.video.mp4").some((i) => i.message.includes("producción no sirve rutas locales")), `el error dice «producción no sirve rutas locales»: ${JSON.stringify(errores)}`);
  // Cada una de las ocho claves: presente y sin https:// → error con esa clave.
  for (const campo of CAMPOS) {
    const c = clon(A);
    const partes = campo.split("."), ultimo = partes.pop() as string;
    let o = (c.hero as Record<string, unknown>).video as Record<string, unknown>;
    for (const p of partes) o = o[p] as Record<string, unknown>;
    o[ultimo] = `/dev-fixtures/media/paleta-a/${ultimo}`;
    assert.ok(validar(c).some((i) => i.severity === "error" && i.path === `hero.video.${campo}`), `hero.video.${campo} con ruta local → error con path hero.video.${campo}`);
  }
  // Los fixtures A y C pasan sin errores (todo hero.video.* es https://).
  assert.deepEqual(validar(A).filter((i) => i.severity === "error"), [], "el fixture A no da errores");
  assert.deepEqual(validar(C).filter((i) => i.severity === "error"), [], "el fixture C no da errores");
  // Además de sus avisos actuales: vídeo sin poster sigue siendo aviso en hero.video.poster; ausente (no presente) no es error.
  const sinPoster = clon(A);
  delete ((sinPoster.hero as Record<string, unknown>).video as Record<string, unknown>).poster;
  const avisos = validar(sinPoster);
  assert.ok(avisos.some((i) => i.severity === "warning" && i.path === "hero.video.poster"), "vídeo sin poster sigue avisando en hero.video.poster");
  assert.deepEqual(avisos.filter((i) => i.severity === "error"), [], "una clave ausente no es error");
});

if (REPO === "T") test("tests/ajustes-01.test.ts nombra literalmente «hero.video» y «poster» (los guards de las filas 1 y 3, con la clave que `contratos.json` les asigna) sin cambiar lo que afirman; `hueco.mjs --json` da las cinco casillas en «sí» y `hecho: true` en `hero.video`, `hero.video.portrait` y `hero.video.poster`, y el total es «5/36 huecos hechos» (los otros 33 no cambian de estado)", () => {
  const guard = readFileSync(resolve(ROOT, GUARD), "utf8");
  assert.ok(guard.includes("hero.video"), `${GUARD} nombra literalmente «hero.video»`);
  assert.ok(guard.includes("poster"), `${GUARD} nombra literalmente «poster»`);
  const contratos = JSON.parse(readFileSync(resolve(ROOT, CONTRATOS), "utf8")) as { huecos: { id: string; guard?: { archivo: string; clave: string } }[] };
  for (const [id, clave] of [["hero.video", "hero.video"], ["hero.video.poster", "poster"]]) {
    const g = contratos.huecos.find((h) => h.id === id)?.guard;
    assert.deepEqual(g, { archivo: GUARD, clave }, `precondición: ${id}.guard = ${GUARD} · ${clave}`);
  }
  // Sin cambiar lo que afirman: los nombres de los tests de ajustes-01 son los del commit aprobado de VERDAD-07.
  const antes = nombresDeTests(git(ROOT, "show", `${VERDAD_07.aprobado.T}:${GUARD}`));
  assert.ok(antes.length >= 2, `precondición: ajustes-01 tiene tests en ${VERDAD_07.aprobado.T} (hay ${antes.length})`);
  assert.deepEqual(nombresDeTests(guard), antes, "ajustes-01 afirma lo mismo que en la línea base (mismos nombres de test)");
  // hueco.mjs --json: las tres filas del hero con los cinco «sí» y hecho; el total 5/36; los otros 33 en el mismo estado que la línea base.
  const j = correr([HUECO, "--json"]);
  assert.ok(j.status === 0 || j.status === 2, `hueco.mjs --json sale 0 o 2 (salió ${j.status})\n${j.out.slice(-2000)}`);
  const filas = JSON.parse(j.stdout) as Resultado[];
  assert.equal(filas.length, 36);
  for (const id of FILAS_HERO) {
    const f = filas.find((x) => x.id === id);
    assert.ok(f, `fila ${id}`);
    for (const k of ["contrato", "validador", "ui", "material", "guard"] as const) assert.equal(f.checks[k].ok, true, `${id} · ${k}: «sí» (${f.checks[k].detalle})`);
    assert.equal(f.hecho, true, `${id}: hecho`);
  }
  const hechos = filas.filter((f) => f.hecho).map((f) => f.id).sort();
  assert.deepEqual(hechos, ["gallery.variant", "hero.video", "hero.video.portrait", "hero.video.poster", "services.catalogo"], "hechos = los dos de la línea base (services.catalogo, gallery.variant) + las tres filas del hero; los otros 33 no cambian de estado");
  const r = correr([HUECO]);
  assert.equal(ultimaLinea(r.stdout), "5/36 huecos hechos", `el texto termina con «5/36 huecos hechos» (última línea: «${ultimaLinea(r.stdout)}»)`);
  const uno = correr([HUECO, "--id", "hero.video"]);
  assert.equal(uno.status, 0, `hueco.mjs --id hero.video sale 0\n${uno.out}`);
});
