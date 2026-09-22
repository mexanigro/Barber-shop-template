// Utilidades de la orden CONEXION-03 (sesión A, 2026-09-22). Reusa de ../verdad-02, ../verdad-05 y ../conexion-01 lo que no cambia
// (spawnSync, nodeE, puertos, borrado de temporales); NO importa ../conexion-02/ (su carpeta queda congelada y el D1 de esta orden
// reproduce HEAD sin depender de otra carpeta de orden): el cargador de .tsx y la identidad del repo están copiados de allí.
// Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz (el editor de A1–A4 y el de hero de A4
// con extensión, el validador de B2 con extensión). Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el
// otro repo se lee por ruta fija (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale de package.json para sobrevivir al clon
// neutro. Toda carpeta temporal lleva el prefijo «conexion-03-» y se borra en `finally`, también si el test falla. Ningún test escribe
// en Storage ni en Firestore (recrear con --sin-firestore; `b4-tenant.ts show` sólo lee).
//
// Cargador de .tsx: `node --experimental-strip-types` no carga archivos .tsx, así que los tests que importan un editor registran antes
// un hook de `module.register` (data: URL) que transpila SÓLO los .tsx con `typescript.transpileModule` (jsx react-jsx, ESNext).
// Ajuste de esta orden (§ Interfaz de la HOJA): `services-editor.tsx` YA EXISTE y sus imports son `@/lib/…` y relativos sin extensión,
// así que el hook añade un `resolve` que traduce `@/x` → `<raíz>/src/x` y prueba `.tsx`, `.ts`, `/index.tsx`, `/index.ts` en los
// relativos. Se adapta el arnés, no el código de producción. El `resolve` no fija `format`: los `.ts` siguen pasando por el
// type-stripping de Node y sólo los `.tsx` van por el `load`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY, borrar } from "../verdad-02/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, borrar, correr, git, repoTemporal } from "../verdad-02/_util.ts";
export { correrLargo, nodeE } from "../verdad-05/_util.ts";
export { puertoLibreEn } from "../conexion-01/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de CONEXION-02 en cada repo (Liam, 2026-09-22) y último rojo de su carpeta (D-37). */
export const CONEXION_02 = { aprobado: { T: "6410316", H: "5bf6762" }, rojo: { T: "25d5be7", H: "f1e25f1" } };

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
export const COMPONENTE = "src/components/config-editors/services-editor.tsx";
export const HERO = "src/components/config-editors/hero-video-editor.tsx";
export const TAB = "src/components/client-config-tab.tsx";
export const VALIDADOR = "src/lib/config-validator.ts";
export const CONTRATOS = "verdad/contratos.json";
export const HUECO = "tools/verdad/hueco.mjs";
export const RECREAR = "tools/verdad/recrear.mjs";
export const TENANT = "scripts/b4-tenant.ts";
export const ID_A = "test-b4-peluqueria-a";

/** Las cinco filas de servicios sin casilla y la `ui` que B1 les declara (`campo` = la clave corta). */
export const FILAS = ["services.priceMax", "services.mode", "services.images", "services.featured", "services.surface"] as const;
export type Fila = (typeof FILAS)[number];
export const CAMPO_UI: Record<Fila, string> = {
  "services.priceMax": "priceMax", "services.mode": "mode", "services.images": "images",
  "services.featured": "featured", "services.surface": "surface",
};
export const UI = (id: Fila) => ({ ruta: "/clients/[clientId]", componente: COMPONENTE, campo: CAMPO_UI[id] });
/** Nota que la fila de CONTRATOS-HUECOS.md lleva cuando la casilla existe (como «casilla del hero (CONEXION-02)»). */
export const NOTA_UI = "casilla de servicios (CONEXION-03)";
/** D-42: el enum que T y el validador ya aceptan en `sections.<id>.surface`. */
export const SURFACES = ["base", "alt", "velo", "liso", "textura"] as const;
/** D-41: `featured` es orden; el tipo que `contratos.json` declara. */
export const TIPO_FEATURED = "orden (lista de ids, fase 2b)";
export const TIPO_SURFACE = "enum base|alt|velo|liso|textura";
/** Guard de `services.priceMax` (tests/services-v6.test.ts ya nombra la clave). */
export const GUARD_PRICEMAX = { archivo: "tests/services-v6.test.ts", clave: "priceMax" };
/** Los ocho campos del hero (CONEXION-02 D-36), que A4 reconstruye con `aplicarHeroVideo`. */
export const CAMPOS_HERO = ["mp4", "webm", "poster", "medium.mp4", "medium.webm", "portrait.mp4", "portrait.webm", "portrait.poster"] as const;

/** Fixture real de T (peluqueria-paleta-<p>.json), leído por ruta fija. */
export function fixture(p: "a" | "c"): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ_T, "dev-fixtures", `peluqueria-paleta-${p}.json`), "utf8"));
}
/** `services` y `sections.services` de un fixture, con tipos cómodos. */
export const servicios = (f: Record<string, unknown>) => f.services as Record<string, unknown>[];
export const seccion = (f: Record<string, unknown>) => (f.sections as Record<string, unknown>).services as Record<string, unknown>;
/** Valor anidado por ruta con puntos. */
export const get = (o: unknown, ruta: string): unknown => ruta.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
/** Path de Storage decodificado de una url `…/o/<path codificado>?alt=media&token=…`. */
export function pathDeUrl(url: string): string {
  const i = url.indexOf("/o/"), j = url.indexOf("?", i);
  if (i < 0 || j < 0) throw new Error(`url sin /o/<path>?: ${url}`);
  return decodeURIComponent(url.slice(i + 3, j));
}
/** Copia profunda por JSON (los fixtures son JSON). */
export const clon = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
/** D-43: nombre fijo de la foto del servicio `i` con la extensión `ext`. */
export const fotoEsperada = (i: number, ext = "jpg") => `servicio-${i + 1}.${ext}`;
/** Escapado de `&` como lo emite renderToString, para buscar una url en el HTML. */
export const escapado = (url: string) => url.replace(/&/g, "&amp;");
/** Sección «## <titulo>» de un CLAUDE.md dado (hasta el siguiente «## »). */
export function seccionDeTexto(texto: string, titulo: string): string {
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
  if (i < 0) throw new Error(`CLAUDE.md sin sección «## ${titulo}»`);
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}
/** Cuenta los `test(` de un archivo, incluidos los guardados por repo (`if (REPO === "H") test(`). */
export const cuentaTests = (fuente: string) => (fuente.match(/^(?:if \([^)]*\) )?test\(/gm) ?? []).length;
/** Última línea no vacía de un stdout. */
export const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";

/** Carpeta temporal de esta orden: prefijo «conexion-03-» en os.tmpdir() (rojo-verde mide los restos por ese prefijo). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "conexion-03-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}
export async function conTemporalAsync<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = carpetaTemporal();
  try { return await fn(base); } finally { borrar(base); }
}

/** Fuente del hook de carga para el repo `raiz`: `resolve` (alias `@/` e imports sin extensión) + `load` (.tsx por typescript). */
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
  if (!/\\.tsx$/i.test(url)) return next(url, context);
  const source = await readFile(new URL(url), "utf8");
  const { outputText } = ts.transpileModule(source, { fileName: url, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: true } });
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
