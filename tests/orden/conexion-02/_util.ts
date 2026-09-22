// Utilidades de la orden CONEXION-02 (sesión A, 2026-09-22). Reusa de ../verdad-02, ../verdad-05 y ../conexion-01 lo que no cambia (repos
// temporales con nombre real, spawnSync, nodeE, puertos, lectura de CLAUDE.md); NO importa ../verdad-07/ (el D1 congelado de verdad-07
// reproduce HEAD sin esa carpeta y esta orden, pendiente de B, tiene que cargar ahí).
// Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz (el componente de A1–A3 con extensión, el
// validador de B2 con extensión). Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el otro repo se lee por
// ruta fija (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale de package.json para sobrevivir al clon neutro. Toda carpeta temporal lleva el prefijo «conexion-02-» y se borra en `finally`, también si el test
// falla. Ningún test escribe en Storage ni en Firestore (recrear con --sin-firestore; `b4-tenant.ts show` sólo lee).
//
// Cargador de .tsx: `node --experimental-strip-types` no carga archivos .tsx («Unknown file extension ".tsx"», comprobado en Node 22.22 con
// y sin --experimental-transform-types), así que los tests que importan el componente registran antes un hook de `module.register`
// (data: URL) que transpila SÓLO los .tsx con `typescript.transpileModule` (jsx react-jsx, ESNext); el resto sigue por el cargador de Node.
// El componente puede usar JSX, `"use client"` y hooks; sus imports relativos llevan extensión y nada de `next/*` (§ Interfaz).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY, borrar } from "../verdad-02/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, bloqueContrato, borrar, correr, git, repoTemporal, seccionPuertas } from "../verdad-02/_util.ts";
export { correrLargo, nodeE } from "../verdad-05/_util.ts";
export { cuenta, puertoLibreEn } from "../conexion-01/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de VERDAD-07 en cada repo (Liam, 2026-09-22) y último rojo de su carpeta (D-37). */
export const VERDAD_07 = { aprobado: { T: "5d81390", H: "da83814" }, rojo: { T: "b051c89", H: "296a755" } };

/** Raíces reales por ruta fija (como hueco.mjs): el repo propio es ROOT; el otro se lee de aquí. */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub" };
/** Repo propio, en este orden: (1) el `name` de package.json (`nichos-hub` / `react-example`), que sobrevive al clon neutro de rojo-verde
 *  (su ruta no termina en nichos-hub y el `SOY` por ruta de verdad-02 daría «T»); (2) sin package.json (clon neutro de una reproducción
 *  de HEAD), la URL de `origin` (el repo clonado: `…/Nichos-hub` o `…/nichos-hub.git`); (3) la ruta, como verdad-02. */
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

/** La casilla (A1) y sus ocho campos con el nombre fijo de cada uno (D-36) en el rol `hero`. */
export const COMPONENTE = "src/components/config-editors/hero-video-editor.tsx";
export const CAMPOS = ["mp4", "webm", "poster", "medium.mp4", "medium.webm", "portrait.mp4", "portrait.webm", "portrait.poster"] as const;
export type Campo = (typeof CAMPOS)[number];
export const NOMBRES: Record<Campo, string> = {
  mp4: "hero.mp4", webm: "hero.webm", poster: "hero-poster.avif", "medium.mp4": "hero-1280.mp4", "medium.webm": "hero-1280.webm",
  "portrait.mp4": "hero-v.mp4", "portrait.webm": "hero-v.webm", "portrait.poster": "hero-v-poster.avif",
};
export const VIDEO: Campo[] = ["mp4", "webm", "medium.mp4", "medium.webm", "portrait.mp4", "portrait.webm"];
export const POSTER: Campo[] = ["poster", "portrait.poster"];
/** Etiquetas de grupo que la casilla muestra (A2): Horizontal mp4/webm, Medio 1280 mp4/webm, Retrato mp4/webm/póster, Póster. */
export const ETIQUETAS = ["Horizontal", "Medio 1280", "Retrato", "Póster"];
/** Las tres filas del hero en verdad/contratos.json y la `ui` que B1 les declara. */
export const FILAS_HERO = ["hero.video", "hero.video.portrait", "hero.video.poster"] as const;
export const UI_HERO = (id: (typeof FILAS_HERO)[number]) => ({ ruta: "/clients/[clientId]", componente: COMPONENTE, campo: id === "hero.video" ? "hero.video" : id.split(".").pop() });

/** Fixture real de T (peluqueria-paleta-<p>.json), leído por ruta fija. */
export function fixture(p: "a" | "c"): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ_T, "dev-fixtures", `peluqueria-paleta-${p}.json`), "utf8"));
}
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
/** Sección «## <titulo>» de un CLAUDE.md dado (hasta el siguiente «## »). */
export function seccionDeTexto(texto: string, titulo: string): string {
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
  if (i < 0) throw new Error(`CLAUDE.md sin sección «## ${titulo}»`);
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}

/** Carpeta temporal de esta orden: prefijo «conexion-02-» en os.tmpdir() (rojo-verde mide los restos por ese prefijo, VERDAD-03 D1). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "conexion-02-"));
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

/** Fuente del hook de carga de .tsx para el repo `raiz` (typescript por ruta absoluta: el hook vive en un data: URL y no resuelve paquetes). */
export function fuenteCargadorTsx(raiz: string): string {
  const ts = resolve(raiz, "node_modules/typescript/lib/typescript.js");
  if (!existsSync(ts)) throw new Error(`no existe ${ts}: el cargador de .tsx necesita typescript en node_modules`);
  return `import ts from ${JSON.stringify(pathToFileURL(ts).href)};
import { readFile } from "node:fs/promises";
export async function load(url, context, next) {
  if (!/\\.tsx$/i.test(url)) return next(url, context);
  const source = await readFile(new URL(url), "utf8");
  const { outputText } = ts.transpileModule(source, { fileName: url, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: true } });
  return { format: "module", source: outputText, shortCircuit: true };
}
`;
}
/** Línea que registra el hook (vale en proceso y en `nodeE`): `import { register } from "node:module"` + register(data:…). */
export function codigoRegistrarTsx(raiz: string): string {
  return `register(${JSON.stringify("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(raiz)))}, { parentURL: ${JSON.stringify(pathToFileURL(raiz + "/").href)} });`;
}
let registrado = false;
/** Registra el hook una vez en este proceso y devuelve el módulo del componente (A1–A3). El `existsSync` lo afirma antes cada test. */
export async function importarComponente(): Promise<Record<string, unknown>> {
  if (!registrado) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(ROOT)), { parentURL: pathToFileURL(ROOT + "/").href }); registrado = true; }
  return (await import(pathToFileURL(resolve(ROOT, COMPONENTE)).href)) as Record<string, unknown>;
}
/** Código para `nodeE` (cwd = H): aplica las ocho urls de `video` sobre `{}` con `aplicarHeroVideo` e imprime `hero.video` en JSON (C1). */
export function codigoAplicarHeroVideo(raizH: string, video: Record<string, unknown>): string {
  return `import { register } from "node:module";
${codigoRegistrarTsx(raizH)}
const m = await import(${JSON.stringify(pathToFileURL(resolve(raizH, COMPONENTE)).href)});
const video = ${JSON.stringify(video)};
const get = (o, ruta) => ruta.split(".").reduce((a, k) => (a != null && typeof a === "object" ? a[k] : undefined), o);
let config = {};
for (const campo of ${JSON.stringify(CAMPOS)}) config = m.aplicarHeroVideo(config, campo, get(video, campo));
console.log(JSON.stringify(get(config, "hero.video")));
`;
}
