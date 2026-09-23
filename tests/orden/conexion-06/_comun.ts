// Utilidades de la orden CONEXION-06 (sesión A, 2026-09-23). Se llama `_comun.ts` y no `_util.ts` (§ Interfaz de la HOJA y regla
// heredada de CONEXION-05/VERDAD-09): la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las órdenes
// de APROBADAS.md, y un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. Reusa de ../verdad-02 y ../verdad-05 lo que no
// cambia (spawnSync, git, repos temporales, borrado, procesos largos); NO importa ../conexion-05/ ni ../conexion-04/ (sus carpetas
// quedan congeladas y el D1 de esta orden reproduce HEAD sin depender de otra carpeta de orden): el cargador de .tsx, la identidad del
// repo, la reproducción de HEAD y las órdenes vivas están COPIADOS de allí. Caja negra: nada importa src/*, tools/* ni scripts/* salvo
// lo que la hoja fija como interfaz (la casilla de A1–A2 y A6 con extensión, el validador de A4, `clampWords` de B2); los imports de
// `tools/` sólo con `import()` dinámico dentro del test. Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`;
// el otro repo se lee por ruta fija (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale de package.json para sobrevivir al
// clon neutro. Toda carpeta temporal lleva el prefijo «conexion-06-» y se borra en `finally`, también si el test falla. Ningún test
// escribe en Storage ni en Firestore (`b4-tenant.ts show` sólo lee; aquí no se llama a `recrear.mjs`).
//
// Cargador de .tsx: `node --experimental-strip-types` no carga archivos .tsx, así que los tests que importan un editor registran antes
// un hook de `module.register` (data: URL) que transpila SÓLO los .tsx con `typescript.transpileModule` (jsx react-jsx, ESNext) y
// resuelve `@/x` → `<raíz>/src/x` y los imports relativos sin extensión (.tsx, .ts, /index.tsx, /index.ts).
//
// Ajuste del arnés (CONEXION-06): `src/lib/words.ts` de T lee `import.meta.env.DEV` al recortar, que lo define Vite y no Node ni tsx
// (medido: `clampWords("… seis palabras", 4)` lanza «Cannot read properties of undefined (reading 'DEV')» con los dos). El mismo hook
// transpila los `.ts` cuyo texto nombra `import.meta.env` anteponiendo `import.meta.env ??= { … }`, que es lo que Vite define: se adapta
// el arnés, no el código de producción (§ Interfaz: B2 importa `clampWords` con extensión y con `import()` dinámico).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY, borrar, git, repoTemporal, type Repo, type Salida } from "../verdad-02/_util.ts";
import { correrLargo } from "../verdad-05/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, borrar, correr, git, repoTemporal } from "../verdad-02/_util.ts";
export { correrLargo } from "../verdad-05/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de CONEXION-05 en cada repo (Liam, 2026-09-23) y último rojo de su carpeta. */
export const CONEXION_05 = { aprobado: { T: "a41f93a", H: "0c60811" }, rojo: { T: "4941cd2", H: "569f128" } };

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
export const COMPONENTE = "src/components/config-editors/paleta-editor.tsx";
export const TAB = "src/components/client-config-tab.tsx";
export const CONTENIDO = "src/components/client-content-tab.tsx";
export const VALIDADOR = "src/lib/config-validator.ts";
/** D-69: las dos copias byte a byte de T en H y el guard de paridad en reposo. */
export const PALETTE = "src/lib/palette.ts";
export const OKLAB = "src/lib/oklab.ts";
export const COPIAS = [PALETTE, OKLAB] as const;
export const GUARD_PARIDAD = "tests/paleta-paridad.test.ts";
/** Diagnóstico del guard cuando hay una orden viva (patrón D-61 de tools/). */
export const DIFERIDA = "paridad de palette/ diferida: orden viva";
export const CONTRATOS = "verdad/contratos.json";
export const HUECO = "tools/verdad/hueco.mjs";
export const TENANT = "scripts/b4-tenant.ts";
export const WORDS = "src/lib/words.ts";
export const HERO_V6 = "src/components/landing/hero/hero-v6.tsx";
export const ID_A = "test-b4-peluqueria-a";
export const FIXTURES = "dev-fixtures";
export const NICHO = "peluqueria";

/** Los cinco `PaletteOrigin` de T:src/lib/palette.ts:19. */
export const ORIGENES = ["logo", "local", "instagram", "eleccion", "material"] as const;
/** Las dos filas que esta orden hace (18/36 → 20/36) y lo que B1 les declara. */
export const FILAS = ["paleta", "hero.eyebrow"] as const;
export const UI_PALETA = { ruta: "/clients/[clientId]", componente: COMPONENTE, campo: "colors" };
export const VALIDADOR_PALETA = { archivo: VALIDADOR, funcion: "validatePalette" };
export const UI_EYEBROW = { ruta: "/clients/[clientId]", componente: CONTENIDO, campo: "hero.eyebrow" };
export const GUARD_EYEBROW = { archivo: "tests/hero-textos.test.ts", clave: "eyebrow" };
/** Notas que CONTRATOS-HUECOS.md gana en el párrafo de la paleta (:11) y en la fila de `hero.eyebrow` (:36). */
export const NOTA_PALETA = "casilla de paleta (CONEXION-06)";
export const NOTA_EYEBROW = "campo de Contenido (CONEXION-06)";
/** Los dieciocho huecos ya hechos al cerrar CONEXION-05 (línea base de esta orden, medida con `hueco.mjs --json` en HEAD). */
export const BASE_HECHOS = [
  "branding.mode", "hero.video", "hero.video.portrait", "hero.video.poster",
  "services.catalogo", "services.priceMax", "services.mode", "services.images", "services.featured", "services.surface",
  "gallery.items", "gallery.items.alt", "gallery.selection", "gallery.variant", "gallery.surface",
  "branding.texture", "branding.localPhoto", "branding.localPhotoMobile",
];

/** Fixture real de T (peluqueria-paleta-<p>.json), leído por ruta fija. */
export function fixture(p: "a" | "c"): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ_T, FIXTURES, `peluqueria-paleta-${p}.json`), "utf8"));
}
/** `branding` de un fixture, con tipos cómodos. */
export const branding = (f: Record<string, unknown>) => f.branding as Record<string, unknown>;
/** `branding.paletteMeta` de un fixture. */
export const meta = (f: Record<string, unknown>) => branding(f).paletteMeta as Record<string, unknown>;
/** Valor anidado por ruta con puntos. */
export const get = (o: unknown, ruta: string): unknown => ruta.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
/** Copia profunda por JSON (los fixtures son JSON). */
export const clon = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
/** Escapado de `&` como lo emite renderToString, para buscar un texto con entidades en el HTML. */
export const escapado = (texto: string) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** `includes` tolerante al escapado de renderToString. */
export const contiene = (html: string, texto: string) => html.includes(texto) || html.includes(escapado(texto));
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
/** Cuenta los `test(` de un archivo, incluidos los guardados por repo (`if (REPO === "H") test(`). */
export const cuentaTests = (fuente: string) => (fuente.match(/^(?:if \([^)]*\) )?test\(/gm) ?? []).length;
/** Cuenta los `test(` que CORREN en `repo`: los sueltos más los guardados con `if (REPO === "<repo>")`. */
export function cuentaTestsDe(fuente: string, repo: "T" | "H"): number {
  const lineas = fuente.split(/\r?\n/);
  const sueltos = lineas.filter((l) => /^test\(/.test(l)).length;
  const guardados = lineas.filter((l) => new RegExp(`^if \\(REPO === "${repo}"\\) test\\(`).test(l)).length;
  return sueltos + guardados;
}
/** Última línea no vacía de un stdout. */
export const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";
/** Primera celda de una fila de tabla markdown («| celda | … |» → «celda»); "" si la línea no es una fila. */
export const primeraCelda = (linea: string) => (linea.startsWith("|") ? (linea.split("|")[1] ?? "").trim() : "");
/** Filas de CONTRATOS-HUECOS.md cuya PRIMERA celda empieza por el campo entre acentos graves (con o sin **negrita**). */
export function filasDe(md: string[], campo: string): string[] {
  const re = new RegExp(`^\\*{0,2}\`${campo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``);
  return md.filter((l) => re.test(primeraCelda(l)));
}

/** Carpeta temporal de esta orden: prefijo «conexion-06-» en os.tmpdir() (rojo-verde mide los restos en el TEMP propio de la corrida). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "conexion-06-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
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
/** Órdenes vivas de una raíz: carpetas `tests/orden/<id>/` con HOJA.md y sin línea «- <id> · aprobada» en su APROBADAS.md
 *  (copiado de H tests/verdad-02-c.test.ts, VERDAD-09 D-61: el mismo criterio que difiere la paridad). */
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

/** Fuente del hook de carga para el repo `raiz`: `resolve` (alias `@/` e imports sin extensión) + `load` (.tsx por typescript y
 *  .ts que nombre `import.meta.env` con el `define` de Vite antepuesto). */
export function fuenteCargadorTsx(raiz: string): string {
  const ts = resolve(raiz, "node_modules/typescript/lib/typescript.js");
  if (!existsSync(ts)) throw new Error(`no existe ${ts}: el cargador de .tsx necesita typescript en node_modules`);
  return `import ts from ${JSON.stringify(pathToFileURL(ts).href)};
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as res, dirname } from "node:path";
const RAIZ = ${JSON.stringify(raiz.replace(/\\/g, "/"))};
const EXT = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];
const VITE = 'import.meta.env ??= { DEV: false, PROD: true, SSR: false, MODE: "test" };\\n';
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
let registrado = false;
/** Registra el hook una vez en este proceso y devuelve el módulo de `ruta` (relativa a ROOT). El `existsSync` lo afirma antes cada test. */
export async function importarModulo(ruta: string): Promise<Record<string, unknown>> {
  if (!registrado) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(ROOT)), { parentURL: pathToFileURL(ROOT + "/").href }); registrado = true; }
  return (await import(pathToFileURL(resolve(ROOT, ruta)).href)) as Record<string, unknown>;
}
