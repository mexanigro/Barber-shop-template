// Utilidades de la orden CONEXION-05 (sesión A, 2026-09-22). Se llama `_comun.ts` y no `_util.ts` (ajuste de A, § Interfaz de la
// HOJA): la copia promovida `tests/verdad-08-a.test.ts` recorre todos los `tests/orden/*/_util.ts` y le exige a cada uno su commit
// rojo, así que un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. Mismo camino que el `_comun.ts` de VERDAD-09. Reusa de ../verdad-02 y ../verdad-05 lo que no cambia (spawnSync, git,
// repos temporales, borrado, sockets); NO importa ../conexion-04/ ni ../conexion-03/ (sus carpetas quedan congeladas y el D1 de esta
// orden reproduce HEAD sin depender de otra carpeta de orden): el cargador de .tsx, la identidad del repo, la reproducción de HEAD y
// `puertoLibreEn` están COPIADOS de allí. Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz
// (el editor de fondo de A1–A4 con extensión, el validador de B2 con extensión); los imports de `tools/` sólo con `import()` dinámico
// dentro del test. Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el otro repo se lee por ruta fija
// (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale de package.json para sobrevivir al clon neutro. Toda carpeta temporal
// lleva el prefijo «conexion-05-» y se borra en `finally`, también si el test falla. Ningún test escribe en Storage ni en Firestore
// (`b4-tenant.ts show` sólo lee; `recrear.mjs` corre con `--sin-firestore`).
//
// Cargador de .tsx: `node --experimental-strip-types` no carga archivos .tsx, así que los tests que importan un editor registran antes
// un hook de `module.register` (data: URL) que transpila SÓLO los .tsx con `typescript.transpileModule` (jsx react-jsx, ESNext) y
// resuelve `@/x` → `<raíz>/src/x` y los imports relativos sin extensión (.tsx, .ts, /index.tsx, /index.ts). Se adapta el arnés, no el
// código de producción. El `resolve` no fija `format`: los `.ts` siguen pasando por el type-stripping de Node.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY, borrar, git, repoTemporal, type Repo, type Salida } from "../verdad-02/_util.ts";
import { conecta, correrLargo, escuchar } from "../verdad-05/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, borrar, correr, git, repoTemporal } from "../verdad-02/_util.ts";
export { conecta, correrLargo, escuchar } from "../verdad-05/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de VERDAD-09 en cada repo (Liam, 2026-09-22) y último rojo de su carpeta. */
export const VERDAD_09 = { aprobado: { T: "49d5121", H: "b7952bf" }, rojo: { T: "753e027", H: "7482ad4" } };

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
export const COMPONENTE = "src/components/config-editors/fondo-editor.tsx";
export const TAB = "src/components/client-config-tab.tsx";
export const VALIDADOR = "src/lib/config-validator.ts";
export const CONTRATOS = "verdad/contratos.json";
export const HUECO = "tools/verdad/hueco.mjs";
export const RECREAR = "tools/verdad/recrear.mjs";
export const TENANT = "scripts/b4-tenant.ts";
export const ID_A = "test-b4-peluqueria-a";
export const FIXTURES = "dev-fixtures";

/** Las cuatro filas de fondo y branding sin casilla y la `ui` que B1 les declara (`campo` = la clave corta). */
export const FILAS = ["branding.mode", "branding.texture", "branding.localPhoto", "branding.localPhotoMobile"] as const;
export type Fila = (typeof FILAS)[number];
export const CAMPO_UI: Record<Fila, string> = {
  "branding.mode": "mode", "branding.texture": "texture",
  "branding.localPhoto": "localPhoto", "branding.localPhotoMobile": "localPhotoMobile",
};
export const UI = (id: Fila) => ({ ruta: "/clients/[clientId]", componente: COMPONENTE, campo: CAMPO_UI[id] });
/** Nota que la fila de CONTRATOS-HUECOS.md lleva cuando la casilla existe (como «casilla de galería (CONEXION-04)»). */
export const NOTA_UI = "casilla de fondo (CONEXION-05)";
/** D-64: `branding.heroToBackdrop` queda fuera de esta hoja (lo calcula transicion.mjs). */
export const DERIVADA = "branding.heroToBackdrop";
export const TIPO_DERIVADA = "derivado (transicion.mjs)";
/** Guard que B1 le declara a `branding.localPhotoMobile` (D-11: el archivo nombra la clave). */
export const GUARD_MOVIL = { archivo: "tests/hero-viewport.test.ts", clave: "localPhotoMobile" };
/** Guard que `contratos.json` ya le asigna a `branding.texture` (hoy en rojo: galeria-03 no nombra la clave). */
export const GUARD_TEXTURA = { archivo: "tests/galeria-03.test.ts", clave: "texture" };

/** Los tres campos de foto del fondo y el modo (el cuarto campo de la casilla, que no es una foto). */
export const CAMPOS_FOTO = ["texture", "localPhoto", "localPhotoMobile"] as const;
export type CampoFoto = (typeof CAMPOS_FOTO)[number];
export const MODOS = ["light", "dark"] as const;
/** D-66: nombre fijo del material de fondo por campo (`textura.<ext>`, `local.<ext>`, `local-v.<ext>`), rol `branding`. */
export const BASE_FONDO: Record<CampoFoto, string> = { texture: "textura", localPhoto: "local", localPhotoMobile: "local-v" };
export const ROL_FONDO = "branding";
export const fondoEsperado = (campo: CampoFoto, ext = "jpg") => `${BASE_FONDO[campo]}.${ext}`;

/** Fixture real de T (peluqueria-paleta-<p>.json), leído por ruta fija. */
export function fixture(p: "a" | "c"): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ_T, FIXTURES, `peluqueria-paleta-${p}.json`), "utf8"));
}
/** `branding` de un fixture, con tipos cómodos. */
export const branding = (f: Record<string, unknown>) => f.branding as Record<string, unknown>;
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
/** Escapado de `&` como lo emite renderToString, para buscar una url en el HTML. */
export const escapado = (url: string) => url.replace(/&/g, "&amp;");
/** `includes` tolerante al escapado de renderToString (las urls llevan `&`). */
export const contiene = (html: string, texto: string) => html.includes(texto) || html.includes(escapado(texto));
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

/** Primera celda de una fila de tabla markdown («| celda | … |» → «celda»); "" si la línea no es una fila. */
export const primeraCelda = (linea: string) => (linea.startsWith("|") ? (linea.split("|")[1] ?? "").trim() : "");
/** Filas de CONTRATOS-HUECOS.md cuya PRIMERA celda empieza por el campo entre acentos graves (con o sin **negrita**).
 *  Así `| \`sections.gallery.surface\` | … \`branding.texture\` …` (que sólo lo menciona) no cuenta, y `localPhotoMobile` no
 *  se cuela en `localPhoto` (el acento grave de cierre lo separa). */
export function filasDe(md: string[], campo: string): string[] {
  const re = new RegExp(`^\\*{0,2}\`${campo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\``);
  return md.filter((l) => re.test(primeraCelda(l)));
}

/** Carpeta temporal de esta orden: prefijo «conexion-05-» en os.tmpdir() (rojo-verde mide los restos en el TEMP propio de la corrida). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "conexion-05-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}
/** Igual que `conTemporal`, para un `fn` asíncrono (servidores, recrear). */
export async function conTemporalAsync<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = carpetaTemporal();
  try { return await fn(base); } finally { borrar(base); }
}
/** Puerto libre al azar dentro de [desde, hasta] (copiado de ../conexion-01): recrear levanta server.ts ahí y nunca mata a nadie. */
export async function puertoLibreEn(desde: number, hasta: number): Promise<number> {
  for (let i = 0; i < 50; i++) {
    const p = desde + Math.floor(Math.random() * (hasta - desde + 1));
    if (await conecta(p)) continue;
    try { const s = await escuchar(p); await s.cerrar(); return p; } catch { /* ocupado sin responder: se prueba otro */ }
  }
  throw new Error(`sin puerto libre en ${desde}–${hasta}`);
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

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
export function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
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
