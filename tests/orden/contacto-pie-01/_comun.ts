// Utilidades de la orden CONTACTO-PIE-01 (sesión A, 2026-10-03). Se llama `_comun.ts` y no `_util.ts` (regla heredada de
// CONEXION-05 y VERDAD-09: la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las aprobadas).
// COPIADO de `tests/orden/instagram-faq-01/_comun.ts` (no importado: esa carpeta queda congelada al aprobarse la orden), con lo propio
// de esta orden: su id, el prefijo de sus carpetas temporales y el commit aprobado de INSTAGRAM-FAQ-01. Lo demás no cambia: el arnés de
// páginas de T —dos Vite en este proceso, uno por plantilla (A y C), con su fixture y sin Firebase—, los instrumentos de aceptación
// (`./instrumentos/*.mjs`, sólo en T) como procesos asíncronos contra esas dos url, el cargador de .ts/.tsx para importar módulos de H
// (o de T) con `import()` dinámico, y lo que se reusa de ../verdad-02 y ../verdad-05.
// Caja negra: nada importa src/*, tools/* ni scripts/* de forma estática. Un mismo archivo en T y en H (cmp → 0): lo propio de cada
// repo va por `REPO`; el otro repo se lee por ruta fija (`RUTA`); la identidad del repo sale de package.json para sobrevivir al clon
// neutro. Toda carpeta temporal lleva el prefijo «contacto-pie-01-» y se borra en `finally`. Ningún test sale a las webs desplegadas,
// a Firestore, a Storage ni a Vercel: las plantillas corren con `VITE_FIREBASE_API_KEY` vacía (fixture, sin Firebase) y los
// instrumentos responden el material de Storage desde `dev-fixtures/media/` (instrumentos/_nav.mjs).
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

/** Commit aprobado de INSTAGRAM-FAQ-01 en cada repo (Liam, 2026-10-03) y último rojo de su carpeta. */
export const INSTAGRAM_FAQ_01 = { aprobado: { T: "392acff", H: "75ede45" }, rojo: { T: "423a4a7", H: "46640fb" } };
/** Esta orden. */
export const ORDEN = "contacto-pie-01";

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

/** Carpeta temporal de esta orden: prefijo «contacto-pie-01-» en os.tmpdir(). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "contacto-pie-01-"));
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

/** `node <args>` con un reloj largo. */
export function correrNode(args: string[], o: { cwd: string; env: NodeJS.ProcessEnv; minutos?: number }): Salida {
  const r = spawnSync(NODE, args, { cwd: o.cwd, env: o.env, input: "", encoding: "utf8", timeout: (o.minutos ?? 20) * 60000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}
/** `node <args>` ASÍNCRONO: el test sigue atendiendo sus propios servidores mientras el hijo corre (los instrumentos). */
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

// ─── El cargador de .ts/.tsx (E2 y C en H), copiado de ../instagram-faq-01/_comun.ts (que lo copió de ../team-resenas-01) ──────────────────────────────────────────────────
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

// ─── El arnés de páginas de T (sólo lo usa T; en H no se llama) ─────────────────────────────────────────────────────────────
/** Las dos plantillas de peluquería y su fixture (INFORME § 1). */
export const PLANTILLAS = { a: "peluqueria-paleta-a", c: "peluqueria-paleta-c" } as const;
export type Urls = { a: string; c: string };
/** Levanta un Vite por plantilla en ESTE proceso (puerto libre, 127.0.0.1), con las variables de `diseno/ver-a.ps1` / `ver-c.ps1`
 *  —peluquería, hebreo, sin demo, sin Firebase (el fixture manda), sin clip local— y su caché de dependencias dentro de `base`
 *  (no se pisa con la de un `npm run dev` abierto); corre `fn(urls)` y cierra los dos SIEMPRE. El especificador de Vite va en una
 *  variable: H no tiene Vite y su `tsc` no tiene que resolverlo. */
export async function conPlantillas<T>(base: string, fn: (urls: Urls) => Promise<T>): Promise<T> {
  const VITE = "vite";
  const { createServer } = (await import(VITE)) as { createServer: (o: Record<string, unknown>) => Promise<any> };
  const abiertos: any[] = [];
  const antes = { ...process.env };
  try {
    const urls: Record<string, string> = {};
    for (const [p, fixture] of Object.entries(PLANTILLAS)) {
      Object.assign(process.env, { VITE_ACTIVE_NICHE: "peluqueria", VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_FIREBASE_API_KEY: "", VITE_TENANT_FIXTURE: fixture, VITE_HERO_CLIP: "" });
      const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, cacheDir: join(base, `vite-${p}`), logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
      abiertos.push(vite);
      await vite.listen();
      urls[p] = vite.resolvedUrls.local[0];
    }
    return await fn(urls as Urls);
  } finally {
    for (const v of abiertos) await v.close().catch(() => {});
    for (const k of Object.keys(process.env)) if (!(k in antes)) delete process.env[k];
    Object.assign(process.env, antes);
  }
}
/** Un instrumento de `./instrumentos/` (sólo en T) contra las dos plantillas, como proceso ASÍNCRONO (este proceso sirve las
 *  páginas), con el TEMP dentro de `base`, sin las variables del `.env` y con SG_A / SG_C / SG_RAIZ. */
export function instrumento(nombre: string, args: string[], urls: Urls, base: string, minutos = 30): Promise<Salida> {
  const tmp = subcarpeta(base, `tmp-${nombre.replace(/\W+/g, "-")}-${Date.now().toString(36)}`);
  const archivo = resolve(ROOT, "tests", "orden", ORDEN, "instrumentos", nombre);
  return correrNodeAsync([archivo, ...args], { cwd: ROOT, minutos, env: entornoLimpio({ SG_A: urls.a, SG_C: urls.c, SG_RAIZ: ROOT, TEMP: tmp, TMP: tmp, TMPDIR: tmp }) });
}
/** Los seis nichos de la flota que mide `scripts/qa-regresion-seis.mjs`. */
export const SEIS = ["barberia", "estetica", "tattoo", "nails", "cafeteria", "remodelaciones"] as const;
/** Un Vite de UN nicho de la flota sobre el árbol `raiz` (preset, sin fixture, sin Firebase, hebreo), en este proceso; corre `fn(url)`
 *  y lo cierra SIEMPRE. Para D1 (la firma de los seis en el árbol rojo y en HEAD). */
export async function conNicho<T>(raiz: string, nicho: string, base: string, fn: (url: string) => Promise<T>): Promise<T> {
  const VITE = "vite";
  const { createServer } = (await import(VITE)) as { createServer: (o: Record<string, unknown>) => Promise<any> };
  const antes = { ...process.env };
  Object.assign(process.env, { VITE_ACTIVE_NICHE: nicho, VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_FIREBASE_API_KEY: "", VITE_FIREBASE_PROJECT_ID: "", VITE_CLIENT_ID: "qa-regresion", VITE_TENANT_FIXTURE: "", VITE_HERO_CLIP: "" });
  let vite: any;
  try {
    vite = await createServer({ configFile: resolve(raiz, "vite.config.ts"), root: raiz, cacheDir: join(base, `vite-seis-${raiz === ROOT ? "head" : "rojo"}`), logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
    await vite.listen();
    return await fn(vite.resolvedUrls.local[0]);
  } finally {
    if (vite) await vite.close().catch(() => {});
    for (const k of Object.keys(process.env)) if (!(k in antes)) delete process.env[k];
    Object.assign(process.env, antes);
  }
}
/** Clon del commit `sha` del repo propio en `<base>/<nombre>`, con `node_modules` enlazado por junction al del repo. */
export function clonDe(base: string, nombre: string, sha: string): string {
  const dir = join(base, nombre);
  const clon = spawnSync("git", ["clone", "-q", "--no-checkout", ROOT, dir], { encoding: "utf8", windowsHide: true });
  if (clon.status !== 0) throw new Error(`git clone ${ROOT} → exit ${clon.status}\n${clon.stderr}`);
  git(dir, "checkout", "-q", "--detach", sha);
  const nm = resolve(ROOT, "node_modules");
  if (existsSync(nm)) symlinkSync(nm, join(dir, "node_modules"), "junction");
  return dir;
}
/** El commit rojo de esta orden: el último que añade su HOJA.md. */
export const rojoDeEstaOrden = () => git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "HEAD", "--", `tests/orden/${ORDEN}/HOJA.md`);
/** La línea «SIN MATERIAL n …» que imprime cada instrumento (n = urls de Storage sin archivo local). */
export const sinMaterial = (s: Salida) => Number(s.out.match(/SIN MATERIAL (\d+)/)?.[1] ?? NaN);
/** Lee un JSON que dejó un instrumento. */
export const leerJson = (ruta: string) => JSON.parse(readFileSync(ruta, "utf8"));
