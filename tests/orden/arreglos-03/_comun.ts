// Utilidades de la orden ARREGLOS-03 (sesión A, 2026-09-30). Se llama `_comun.ts` y no `_util.ts` (regla heredada de CONEXION-05
// y VERDAD-09: la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las órdenes aprobadas).
// COPIADO de `tests/orden/idiomas-01/_comun.ts` (no importado: esa carpeta queda congelada al aprobarse la orden), recortado a lo
// que esta orden usa —fuera el arnés de Vite, los fixtures y la huella— y ampliado con lo suyo: el clon limpio de E1, el entorno
// sin las variables del `.env` y el proceso asíncrono de C1 (sirve sus páginas en su propio proceso: un `spawnSync` lo bloquearía).
// Reusa de ../verdad-02 y ../verdad-05 lo que no cambia (git, repos temporales, la hoja mínima, borrado, procesos largos).
// Caja negra: nada importa src/*, tools/* ni scripts/*; las herramientas corren como procesos y los módulos de H (D1) se importan
// con `import()` dinámico dentro del test, con el cargador copiado de idiomas-01. Un mismo archivo en T y en H (cmp → 0): lo propio
// de cada repo va por `REPO`; el otro repo se lee por ruta fija (`RUTA`); la identidad del repo sale de package.json para
// sobrevivir al clon neutro. Toda carpeta temporal lleva el prefijo «arreglos-03-» y se borra en `finally`. Ningún test sale a las
// webs desplegadas, a Firestore, a Storage ni a Vercel.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { NODE, ROOT, SOY, borrar, git, type Salida } from "../verdad-02/_util.ts";

export { NODE, ROOT, SOY, borrar, git, hojaMinima, repoTemporal } from "../verdad-02/_util.ts";
export { correrLargo } from "../verdad-05/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de IDIOMAS-01 en cada repo (Liam, 2026-09-30) y último rojo de su carpeta. */
export const IDIOMAS_01 = { aprobado: { T: "26ddb48", H: "2c5119a" }, rojo: { T: "3a4d4be", H: "cc25f94" } };
/** Esta orden. */
export const ORDEN = "arreglos-03";

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

/** Fuente de un archivo del repo propio. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/** Sección «## <titulo>» de un CLAUDE.md dado (hasta el siguiente «## »). */
export function seccionDeTexto(texto: string, titulo: string): string {
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
  if (i < 0) throw new Error(`CLAUDE.md sin sección «## ${titulo}»`);
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}
/** El párrafo «**<ID> (AAAA-MM-DD):** …» de § Puertas automáticas, o undefined. */
export function parrafoDe(texto: string, id: string): string | undefined {
  const puertas = seccionDeTexto(texto, "Puertas automáticas");
  return puertas.split(/\r?\n/).find((l) => new RegExp(`^\\*\\*${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(\\d{4}-\\d{2}-\\d{2}\\):\\*\\*`).test(l));
}
/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
export function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}

/** Carpeta temporal de esta orden: prefijo «arreglos-03-» en os.tmpdir(). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "arreglos-03-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza. */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}
/** Igual, para una función asíncrona. */
export async function conTemporalAsync<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = carpetaTemporal();
  try { return await fn(base); } finally { borrar(base); }
}
/** Una subcarpeta nueva (vacía) de `base`. */
export function subcarpeta(base: string, nombre: string): string {
  const d = join(base, nombre);
  mkdirSync(d, { recursive: true });
  return d;
}
/** Entradas de una carpeta (vacío si no existe). */
export const entradas = (dir: string) => (existsSync(dir) ? readdirSync(dir) : []);

/** El entorno del que llama SIN lo que un `.env` de T pondría (VITE_*, NEXT_PUBLIC_*, FIREBASE_*, CLIENT_ID), sin HIGIENE_* y sin la
 *  marca del runner (un `node --test` anidado se saltaría los archivos); `extra` pisa o borra (undefined). */
export function entornoLimpio(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of Object.keys(env)) {
    if (/^(VITE_|NEXT_PUBLIC_|FIREBASE_|HIGIENE_)/i.test(k) || /^CLIENT_ID$/i.test(k) || k === "NODE_TEST_CONTEXT") delete env[k];
  }
  for (const [k, v] of Object.entries(extra)) { if (v === undefined) delete env[k]; else env[k] = v; }
  return env;
}

/** Clon limpio del HEAD del repo propio en `<base>/clon` (sólo lo rastreado: sin `.env`), con `node_modules` enlazado por junction
 *  al del repo (nada se instala). Devuelve la ruta; `quitarEnlace` lo desenlaza antes de borrar. */
export function clonLimpio(base: string): string {
  const dir = join(base, "clon");
  const head = git(ROOT, "rev-parse", "HEAD");
  const clon = spawnSync("git", ["clone", "-q", "--no-checkout", ROOT, dir], { encoding: "utf8", windowsHide: true });
  if (clon.status !== 0) throw new Error(`git clone ${ROOT} → exit ${clon.status}\n${clon.stderr}`);
  git(dir, "checkout", "-q", "--detach", head);
  const nm = resolve(ROOT, "node_modules");
  if (existsSync(nm)) symlinkSync(nm, join(dir, "node_modules"), "junction");
  return dir;
}
/** Quita el junction de `node_modules` de un clon sin entrar en el real. */
export function quitarEnlace(clon: string): void {
  try { rmSync(join(clon, "node_modules")); } catch { /* sin enlace, o ya quitado */ }
}

/** `node <args>` con un reloj largo (E1: dos corridas de los seis nichos). */
export function correrNode(args: string[], o: { cwd: string; env: NodeJS.ProcessEnv; minutos?: number }): Salida {
  const r = spawnSync(NODE, args, { cwd: o.cwd, env: o.env, input: "", encoding: "utf8", timeout: (o.minutos ?? 20) * 60000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}
/** `node <args>` ASÍNCRONO: el test sigue atendiendo sus propios servidores mientras el hijo corre (C1). */
export function correrNodeAsync(args: string[], o: { cwd?: string; env: NodeJS.ProcessEnv; minutos?: number }): Promise<Salida> {
  return new Promise((ok) => {
    const hijo = spawn(NODE, args, { cwd: o.cwd ?? ROOT, env: o.env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    hijo.stdout.on("data", (d) => (stdout += d));
    hijo.stderr.on("data", (d) => (stderr += d));
    const reloj = setTimeout(() => hijo.kill(), (o.minutos ?? 5) * 60000);
    hijo.on("close", (status) => { clearTimeout(reloj); ok({ status, stdout, stderr, out: `${stdout}\n${stderr}` }); });
  });
}

/** Órdenes vivas de una raíz en disco: carpeta con HOJA.md y sin línea en su APROBADAS.md. */
export function ordenesVivas(raiz: string): string[] {
  const dir = resolve(raiz, "tests", "orden");
  let aprobadas = "";
  try { aprobadas = readFileSync(join(dir, "APROBADAS.md"), "utf8"); } catch { /* sin APROBADAS.md: ninguna retirada */ }
  let ids: string[] = [];
  try { ids = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
  return ids
    .filter((id) => existsSync(join(dir, id, "HOJA.md")))
    .filter((id) => !new RegExp(`^- ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · aprobada`, "m").test(aprobadas));
}

// ─── El cargador de .ts/.tsx de H (D1), copiado de ../idiomas-01/_comun.ts ──────────────────────────────────────────────────
/** Fuente del hook de carga para el repo `raiz`: `resolve` (alias `@/` e imports sin extensión) + `load` (.tsx por typescript y
 *  .ts que nombre `import.meta.env`). */
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
/** Registra el hook una vez por raíz en este proceso y devuelve el módulo de `rel` (relativo al repo propio). */
export async function importarModulo(rel: string, dev = false): Promise<Record<string, unknown>> {
  const clave = `${ROOT}|${dev}`;
  if (!registrado.has(clave)) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(ROOT, dev)), { parentURL: pathToFileURL(ROOT + "/").href }); registrado.add(clave); }
  return (await import(pathToFileURL(resolve(ROOT, rel)).href)) as Record<string, unknown>;
}
