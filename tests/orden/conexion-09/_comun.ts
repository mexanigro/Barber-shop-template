// Utilidades de la orden CONEXION-09 (sesión A, 2026-09-24). Se llama `_comun.ts` y no `_util.ts` (§ Interfaz de la HOJA y regla
// heredada de CONEXION-05/VERDAD-09): la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las
// órdenes de APROBADAS.md, y un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. COPIADO de
// `tests/orden/preset-01/_comun.ts` (no importado: esa carpeta queda congelada al aprobarse la orden), recortado a lo que esta orden
// usa —fuera `presetsDeT`, `emailsDe`, `titulos`, `IDENTIDAD` y las constantes del preset genérico— y ampliado con lo que le falta:
// `relacionDeTransicion` (localiza el módulo puro de B por el import de `transicion.mjs`, § Interfaz) y `brechasDe`.
// El cargador de módulos viene de preset-01 tal cual: B elige la extensión del módulo puro, y si escribe un `.ts` con un import sin
// extensión, `--experimental-strip-types` no lo resuelve solo.
// Reusa de ../verdad-02 y ../verdad-05 lo que no cambia (spawnSync, git, repos temporales, borrado, procesos largos).
// Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz (`relacionHeroFondo` en A1,
// `config-validator.ts` en V1); los imports sólo con `import()` dinámico dentro del test. Un mismo archivo en T y en H (cmp → 0): lo
// propio de cada repo va por `REPO`; el otro repo se lee por ruta fija (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale
// de package.json para sobrevivir al clon neutro. Toda carpeta temporal lleva el prefijo «conexion-09-» y se borra en `finally`,
// también si el test falla. Ningún test escribe en Storage ni en Firestore: V2 usa `b4-tenant.ts show`, que sólo lee, y A2 corre
// `transicion.mjs` SIN `--escribir`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY, borrar, git, repoTemporal, type Repo, type Salida } from "../verdad-02/_util.ts";
import { correrLargo } from "../verdad-05/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, borrar, correr, git, repoTemporal } from "../verdad-02/_util.ts";
export { correrLargo, nodeE } from "../verdad-05/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de PRESET-01 en cada repo (Liam, 2026-09-24) y último rojo de su carpeta. */
export const PRESET_01 = { aprobado: { T: "1b0ccd6", H: "22845be" }, rojo: { T: "416e6d4", H: "2faac7b" } };

/** Raíces reales por ruta fija (como hueco.mjs): el repo propio es ROOT; el otro se lee de aquí. */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub" };
/** Repo propio, en este orden: (1) el `name` de package.json (`nichos-hub` / `react-example`), que sobrevive al clon neutro de
 *  rojo-verde; (2) sin package.json, la URL de `origin`; (3) la ruta, como verdad-02. */
function repoPropio(): "T" | "H" {
  try {
    const nombre = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).name;
    if (nombre === "nichos-hub") return "H";
    if (nombre === "react-example") return "T";
  } catch { /* sin package.json */ }
  const r = spawnSync("git", ["-C", ROOT, "remote", "get-url", "origin"], { encoding: "utf8", windowsHide: true });
  if (r.status === 0 && r.stdout.trim()) return /nichos-hub(\.git)?\/?$/i.test(r.stdout.trim().replace(/\\/g, "/")) ? "H" : "T";
  return SOY;
}
export const REPO = repoPropio();
export const RAIZ_T = REPO === "T" ? ROOT : RUTA.T;
export const RAIZ_H = REPO === "H" ? ROOT : RUTA.H;
/** Carpeta del bloque (CONTRATOS-HUECOS.md), como BLOQUE_DIR de tools/_git.mjs. */
export const BLOQUE = "C:/Users/liama/Desktop/Nichos/bloque-04";

/** Archivos de la interfaz (§ Interfaz de la HOJA). */
export const GUARD_TRANSICION = "tests/transicion.test.ts";
export const GUARD_INSTAGRAM = "tests/instagram-sin-cuenta.test.ts";
export const TRANSICION = "tools/material/transicion.mjs";
export const CONTRATOS = "verdad/contratos.json";
export const HUECO = "tools/verdad/hueco.mjs";
export const VALIDADOR = "src/lib/config-validator.ts";
export const TENANT = "scripts/b4-tenant.ts";
export const FIXTURES = "dev-fixtures";
export const NICHO = "peluqueria";
/** Las tres copias promovidas que hoy comparan `informe.brechas.length <= tope` (D-94 b). */
export const COPIAS_BRECHAS = ["tests/conexion-02-c.test.ts", "tests/conexion-03-c.test.ts", "tests/conexion-05-b.test.ts"];
/** Lo que ninguna de esas tres puede volver a contener. */
export const TOPE = "brechas.length <=";
/** El tipo de brecha que la corrida de esas tres deja de verdad (la línea base desde CONEXION-04): la lista escrita lo nombra. */
export const TIPO_DIFF = "diff ≠ 0";
/** La fila del contrato que esta orden cierra, su clave y el guard que B2 le declara. */
export const DERIVADA = "branding.heroToBackdrop";
export const CLAVE = "heroToBackdrop";
export const GUARD_FILA = { archivo: GUARD_TRANSICION, clave: CLAVE };
/** Lo que el `tipo` de esa fila tiene que decir (D-90) y la nota que CH gana en la línea de su contrato. */
export const TIPO_SIN_CASILLA = "sin casilla (D-90)";
export const NOTA = "sin casilla (CONEXION-09)";
/** El total de `hueco.mjs` no se mueve: esta orden cierra un derivado, no un hueco del constructor. */
export const TOTAL_HUECO = "29/36 huecos hechos";

/** Ids de los tenants de prueba por paleta (D-16). */
export const tenantDe = (p: string) => `test-b4-peluqueria-${p}`;
/** Nombre del fixture de una paleta, como lo toma `transicion.mjs`. */
export const nombreFixture = (p: string) => `${NICHO}-paleta-${p}`;
/** Las claves que `branding.heroToBackdrop` guarda y que `--json` tiene que imprimir (A2). */
export const CLAVES_RELACION = ["relation", "mechanism", "dH", "dL", "foot", "footPortrait"] as const;
/** Lo medido por el revisor (D-93): lo que A y C tienen que dar. */
export const D93 = {
  a: { relation: "same-hue", mechanism: "veil-from-first-pixel", dH: 0, dL: 0.079, neutro: true, footPortraitHex: "#908b8a" },
  c: { relation: "same-hue-different-light", mechanism: "scrim-dies-into-photo", dH: 6, dL: 0.118, neutro: false },
} as const;

/** Fixture real de T (peluqueria-paleta-<p>.json), leído por ruta fija. */
export function fixture(p: "a" | "c"): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ_T, FIXTURES, `${nombreFixture(p)}.json`), "utf8"));
}
/** Valor anidado por ruta con puntos. */
export const get = (o: unknown, ruta: string): unknown => ruta.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
/** Fuente de un archivo del repo propio. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/** Todos los strings de un objeto, con su ruta. */
export function cadenas(o: unknown, ruta = "", acc: [string, string][] = []): [string, string][] {
  if (typeof o === "string") { acc.push([ruta, o]); return acc; }
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Record<string, unknown>)) cadenas(v, ruta ? `${ruta}.${k}` : k, acc);
  return acc;
}
/** Hojas de un objeto como mapa `ruta con puntos` → valor (para comparar dos versiones sin depender del orden). */
export function hojas(o: unknown, prefijo = "", acc: Map<string, unknown> = new Map()): Map<string, unknown> {
  if (o === null || typeof o !== "object") { acc.set(prefijo, o); return acc; }
  if (Array.isArray(o)) { o.forEach((v, i) => hojas(v, `${prefijo}.${i}`, acc)); if (!o.length) acc.set(prefijo, "[]"); return acc; }
  const e = Object.entries(o as Record<string, unknown>);
  if (!e.length) acc.set(prefijo, "{}");
  for (const [k, v] of e) hojas(v, prefijo ? `${prefijo}.${k}` : k, acc);
  return acc;
}
/** Rutas cuyo valor cambia (o aparece o desaparece) entre dos objetos. */
export function cambios(antes: unknown, ahora: unknown): string[] {
  const a = hojas(antes), b = hojas(ahora);
  const rutas = new Set([...a.keys(), ...b.keys()]);
  return [...rutas].filter((r) => JSON.stringify(a.get(r)) !== JSON.stringify(b.get(r))).sort();
}

/** Tokens de un script de package.json (los archivos que corre, sin comillas). */
export function tokensDeScript(nombre: string): string[] {
  const scripts = JSON.parse(fuente("package.json")).scripts ?? {};
  return String(scripts[nombre] ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
}
/** Sección «## <titulo>» de un CLAUDE.md dado (hasta el siguiente «## »). */
export function seccionDeTexto(texto: string, titulo: string): string {
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
  if (i < 0) throw new Error(`CLAUDE.md sin sección «## ${titulo}»`);
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}
/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
export function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}
/** Cuenta los `test(` que CORREN en `repo`: los sueltos más los guardados con `if (REPO === "<repo>")`. */
export function cuentaTestsDe(src: string, repo: "T" | "H"): number {
  const lineas = src.split(/\r?\n/);
  const sueltos = lineas.filter((l) => /^test\(/.test(l)).length;
  const guardados = lineas.filter((l) => new RegExp(`^if \\(REPO === "${repo}"\\) test\\(`).test(l)).length;
  return sueltos + guardados;
}
/** Última línea no vacía de un stdout. */
export const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";
/** Líneas de CONTRATOS-HUECOS.md que contienen un texto literal (fila de tabla o párrafo). */
export const lineasCon = (md: string[], texto: string) => md.filter((l) => l.includes(texto));
/** Nombres de los tests que el TAP de una corrida declara (`ok N - <nombre>` / `not ok N - <nombre>`), sin los subtests. */
export const nombresTap = (stdout: string) => stdout.split(/\r?\n/).map((l) => l.match(/^(?:not )?ok \d+ - (.+?)\s*$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => m[1]);
/** La última línea de un stdout que es un JSON de objeto (lo que `transicion.mjs --json` imprime al final). */
export function jsonFinal(stdout: string): Record<string, unknown> {
  const linea = stdout.split(/\r?\n/).reverse().find((l) => l.trim().startsWith("{") && l.trim().endsWith("}"));
  if (!linea) throw new Error(`no hay una línea JSON en la salida:\n${stdout.slice(-1500)}`);
  return JSON.parse(linea.trim()) as Record<string, unknown>;
}

/** Carpeta temporal de esta orden: prefijo «conexion-09-» en os.tmpdir() (rojo-verde mide los restos en el TEMP propio de la corrida). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "conexion-09-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Fuente del hook de carga para el repo `raiz` (COPIADA de ../preset-01/_comun.ts, que la copió de ../conexion-07): `resolve`
 *  (alias `@/` e imports sin extensión) + `load` (.tsx por typescript y .ts que nombre `import.meta.env`). B elige la extensión del
 *  módulo puro de D-92; con el hook, cualquiera de las dos carga. */
export function fuenteCargadorTsx(raiz: string, dev = false): string {
  const ts = resolve(raiz, "node_modules/typescript/lib/typescript.js");
  if (!existsSync(ts)) throw new Error(`no existe ${ts}: el cargador de .tsx necesita typescript en node_modules`);
  return `import ts from ${JSON.stringify(pathToFileURL(ts).href)};
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as res, dirname } from "node:path";
const RAIZ = ${JSON.stringify(raiz.replace(/\\/g, "/"))};
const EXT = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];
const VITE = 'import.meta.env ??= { DEV: ${dev ? "true" : "false"}, PROD: ${dev ? "false" : "true"}, SSR: false, MODE: "test" };\\n';
function probar(base) {
  for (const e of EXT) { try { if (statSync(base + e).isFile()) return base + e; } catch {} }
  return null;
}
export async function resolve(spec, context, next) {
  if (spec.startsWith("@/")) { const p = probar(res(RAIZ, "src", spec.slice(2))); if (p) return { url: pathToFileURL(p).href, shortCircuit: true }; }
  if (spec.startsWith(".") && context.parentURL && context.parentURL.startsWith("file:")) {
    const p = probar(res(dirname(fileURLToPath(context.parentURL)), spec));
    if (p) return { url: pathToFileURL(p).href, shortCircuit: true };
  }
  return next(spec, context);
}
export async function load(url, context, next) {
  const tsx = /\\.tsx$/i.test(url);
  if (!tsx && !/\\.ts$/i.test(url)) return next(url, context);
  const source = await readFile(new URL(url), "utf8");
  if (!tsx && !source.includes("import.meta.env")) return next(url, context);
  const { outputText } = ts.transpileModule(tsx ? source : VITE + source, { fileName: url, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: tsx } });
  return { format: "module", source: outputText, shortCircuit: true };
}
`;
}
const registrado = new Set<string>();
/** Registra el hook una vez por raíz en este proceso y devuelve el módulo de `abs` (ruta absoluta). El `existsSync` lo afirma
 *  antes cada test. `raiz` es el repo que presta `typescript` y el alias `@/`. */
export async function importarAbsoluto(abs: string, raiz: string, dev = false): Promise<Record<string, unknown>> {
  const clave = `${raiz}|${dev}`;
  if (!registrado.has(clave)) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(raiz, dev)), { parentURL: pathToFileURL(raiz + "/").href }); registrado.add(clave); }
  return (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
}
/** Igual, para una ruta relativa al repo propio. */
export const importarModulo = (rel: string, dev = false) => importarAbsoluto(resolve(ROOT, rel), ROOT, dev);

/** El CLI de `tsx` del repo propio (`node_modules/tsx/dist/cli.mjs`, lo que `npm run test:unit` y `test:browser` ejecutan). */
export const TSX = "node_modules/tsx/dist/cli.mjs";
/** Corre un guard con el MISMO runner que su fase en la suite de T (`tsx --test`), no con `node` a secas (§ Interfaz, lección de
 *  PRESET-01-A). `NODE_TEST_CONTEXT` borrado: heredarlo hace que el runner anidado avise «skipping running files» y salga 0 sin
 *  cargar nada (CONEXION-06-A2). */
export function correrGuardTsx(archivo: string, o: { cwd?: string } = {}): Salida {
  const cli = resolve(o.cwd ?? ROOT, TSX);
  if (!existsSync(cli)) throw new Error(`no existe ${TSX}: la suite de T corre sus fases con tsx`);
  return correrLargo([cli, "--test", archivo], { ...o, env: { NODE_TEST_CONTEXT: undefined } });
}

/** Medida OKLCH de una superficie, tal como `transicion.mjs` la calcula hoy (pie del clip y foto del local). */
export type Lch = { L: number; C: number; H: number };
/** Lo que devuelve `relacionHeroFondo` (§ Interfaz fijada por A, D-92 (2)). */
export type Relacion = { dH: number; dL: number; neutro: boolean; relation: string | null; mechanism: string; foot: { hex: string } & Lch };
/** Localiza el módulo puro de D-92 por el import de `transicion.mjs` (B elige el nombre del archivo; lo que la hoja fija es que
 *  `transicion.mjs` lo importe) y devuelve su ruta absoluta, su fuente y `relacionHeroFondo` ya cargada. */
export async function relacionDeTransicion(): Promise<{ archivo: string; fuente: string; relacionHeroFondo: (pie: Lch, foto: Lch) => Relacion }> {
  const src = fuente(TRANSICION);
  const m = src.match(/import\s*\{[^}]*\brelacionHeroFondo\b[^}]*\}\s*from\s*["']([^"']+)["']/);
  if (!m) throw new Error(`${TRANSICION} debe importar relacionHeroFondo de su módulo puro (D-92): no hay ningún import que lo nombre`);
  const abs = resolve(ROOT, "tools", "material", m[1].replace(/^\.\//, ""));
  if (!existsSync(abs)) throw new Error(`${TRANSICION} importa relacionHeroFondo de «${m[1]}», que no existe (${abs})`);
  const mod = await importarAbsoluto(abs, ROOT);
  const fn = mod.relacionHeroFondo;
  if (typeof fn !== "function") throw new Error(`${m[1]} no exporta la función relacionHeroFondo`);
  return { archivo: abs, fuente: readFileSync(abs, "utf8"), relacionHeroFondo: fn as (pie: Lch, foto: Lch) => Relacion };
}

/** `rojo-verde --todas` sobre un repo dado (el temporal de D1). */
export function rojoVerdeTodas(repo: string): Salida {
  return correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo]);
}
/** Reproduce HEAD (APROBADAS.md + tests/orden/<id>/ salvo los excluidos) en un repo temporal, para correr `--todas` sin recursión. */
export function reproducirHead(base: string, excluir: string[]): { repo: Repo; ids: string[] } {
  const repo = repoTemporal(REPO, base);
  const ids = git(ROOT, "ls-tree", "--name-only", "-d", "HEAD:tests/orden/").split(/\r?\n/).filter(Boolean).filter((id) => !excluir.includes(id));
  const rutas = git(ROOT, "ls-tree", "-r", "--name-only", "HEAD", "tests/orden/APROBADAS.md", ...ids.map((id) => `tests/orden/${id}`)).split(/\r?\n/).filter(Boolean);
  for (const ruta of rutas) {
    const abs = join(repo.dir, ruta);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, git(ROOT, "show", `HEAD:${ruta}`) + "\n");
  }
  repo.commit(`HEAD de este repo: APROBADAS.md + ${ids.join(", ")}`);
  return { repo, ids };
}
/** La orden propia más toda orden que HEAD lleva VIVA (carpeta en `tests/orden/` sin su línea «- <id> · aprobada» en
 *  `HEAD:tests/orden/APROBADAS.md`): `--todas` correría entera cualquiera que quedara dentro de la reproducción, incluida la que
 *  está escribiendo esta misma suite. Se calcula en el momento (CONEXION-07, pieza 5): una lista de ids escrita a mano se rompe con
 *  cada orden nueva. */
export function excluidas(propia: string): string[] {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const vivas = git(ROOT, "ls-tree", "--name-only", "-d", "HEAD:tests/orden/")
    .split(/\r?\n/).map((s) => s.trim().replace(/\/$/, "")).filter(Boolean)
    .filter((id) => !new RegExp(`^- ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · aprobada`, "m").test(aprobadas));
  return [...new Set([propia, ...vivas])];
}
/** Órdenes vivas de una raíz en disco (mismo criterio, sobre el árbol de trabajo). */
export function ordenesVivas(raiz: string): string[] {
  const dir = resolve(raiz, "tests", "orden");
  let aprobadas = "";
  try { aprobadas = readFileSync(join(dir, "APROBADAS.md"), "utf8"); } catch { /* sin APROBADAS.md: ninguna retirada */ }
  let entradas: string[] = [];
  try { entradas = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
  return entradas
    .filter((id) => existsSync(join(dir, id, "HOJA.md")))
    .filter((id) => !new RegExp(`^- ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · aprobada`, "m").test(aprobadas));
}
