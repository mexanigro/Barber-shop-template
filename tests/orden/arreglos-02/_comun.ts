// Utilidades de la orden ARREGLOS-02 (sesión A, 2026-09-25). Se llama `_comun.ts` y no `_util.ts` (§ Interfaz de la HOJA y regla
// heredada de CONEXION-05/VERDAD-09): la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las
// órdenes de APROBADAS.md, y un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. COPIADO de
// `tests/orden/arreglos-01/_comun.ts` (no importado: esa carpeta queda congelada al aprobarse la orden), recortado a lo que esta
// orden usa —fuera los lectores de `sections.services.images`, las rutas de la casilla de logo y de la ficha, `imagenes`/`conSrc`—
// y ampliado con lo suyo: la herramienta de comparación, las zonas y vistas que cuenta A1, y `rojoVerdeOrden`.
// El cargador de módulos viene tal cual: aquí lo usan A1, A2 y B1 para importar `tools/verdad/e2e.mjs` sin traerlo al test.
// Reusa de ../verdad-02 y ../verdad-05 lo que no cambia (spawnSync, git, repos temporales, borrado, procesos largos).
// Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz; los imports sólo con `import()`
// dinámico dentro del test. Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el otro repo se lee por
// ruta fija (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale de package.json para sobrevivir al clon neutro.
// Toda carpeta temporal lleva el prefijo «arreglos-02-» y se borra en `finally`, también si el test falla. Ningún test escribe en
// Firestore, en Storage ni en Vercel: a la red se sale SÓLO a leer (los GET que `e2e.mjs` hace contra los dos dominios).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY, borrar, git, repoTemporal, type Repo, type Salida } from "../verdad-02/_util.ts";
import { correrLargo } from "../verdad-05/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, borrar, correr, git, repoTemporal } from "../verdad-02/_util.ts";
export { correrLargo, nodeE, puertoLibre } from "../verdad-05/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de ARREGLOS-01 en cada repo (Liam, 2026-09-25) y último rojo de su carpeta. */
export const ARREGLOS_01 = { aprobado: { T: "d026b0f", H: "951932c" }, rojo: { T: "ae2d5ac", H: "2df3e8f" } };

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

/** Archivos de la interfaz (§ Interfaz de la HOJA). */
/** La herramienta de comparación punta a punta (E2E-01, estabilizada por ARREGLOS-01 y ARREGLOS-02). */
export const E2E = "tools/verdad/e2e.mjs";
/** La orden congelada que tiene que volver a pasar (B1). */
export const ORDEN_E2E = "e2e-01";
/** Las dos plantillas: una web por paleta. */
export const PALETAS = ["a", "c"] as const;
/** Las seis zonas juzgadas (D-97) y las dos vistas (h): 12 entradas por web y por corrida. */
export const ZONAS = ["navbar", "hero", "services", "gallery", "pagina-servicios", "pagina-galeria"] as const;
export const VISTAS = [375, 1280] as const;
/** Las corridas que A1 exige (D-118): la inestabilidad de `pagina-galeria 375` no salió en todas. */
export const CORRIDAS = 3;
/** La bandera y la función que B escribe (D-116, D-119). Son la precondición barata de A1, A2 y B1. */
export const BANDERA_CORRIDAS = "--corridas";
export const CAPTURAS_ESTABLES = "capturasEstables";

/** Fuente de un archivo del repo propio. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
/** Copia con las claves de cada objeto ORDENADAS: comparar por valor y no por el orden en que vino. */
export function canonico(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = canonico((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
/** La última línea de un stdout que es un JSON de objeto (lo que `e2e.mjs --json` imprime al final). */
export function jsonFinal(stdout: string): Record<string, unknown> {
  const linea = stdout.split(/\r?\n/).reverse().find((l) => l.trim().startsWith("{") && l.trim().endsWith("}"));
  if (!linea) throw new Error(`no hay una línea JSON en la salida:\n${stdout.slice(-1500)}`);
  return JSON.parse(linea.trim()) as Record<string, unknown>;
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
/** Nombres de los tests que el TAP de una corrida declara (`ok N - <nombre>` / `not ok N - <nombre>`), sin los subtests. */
export const nombresTap = (stdout: string) => stdout.split(/\r?\n/).map((l) => l.match(/^(?:not )?ok \d+ - (.+?)\s*$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => m[1]);

/** Carpeta temporal de esta orden: prefijo «arreglos-02-» en os.tmpdir() (rojo-verde mide los restos en el TEMP propio de la corrida). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "arreglos-02-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Fuente del hook de carga para el repo `raiz` (COPIADA de ../arreglos-01/_comun.ts): `resolve` (alias `@/` e imports sin
 *  extensión) + `load` (.tsx por typescript y .ts que nombre `import.meta.env`). */
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
/** Registra el hook una vez por raíz en este proceso y devuelve el módulo de `abs` (ruta absoluta). */
export async function importarAbsoluto(abs: string, raiz: string, dev = false): Promise<Record<string, unknown>> {
  const clave = `${raiz}|${dev}`;
  if (!registrado.has(clave)) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(raiz, dev)), { parentURL: pathToFileURL(raiz + "/").href }); registrado.add(clave); }
  return (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
}
/** Igual, para una ruta relativa al repo propio. */
export const importarModulo = (rel: string, dev = false) => importarAbsoluto(resolve(ROOT, rel), ROOT, dev);

/** Como `correrLargo`, pero con el reloj que necesita una corrida real de `e2e.mjs`: dos `vite build` y 72 cargas de página no
 *  entran en los 10 minutos de `correrLargo` (§ Interfaz: A1 tarda ~30 minutos). Mismo saneo de entorno que `correrLargo`. */
export function correrE2E(args: string[], minutos = 45): Salida {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ["HIGIENE_ROOTS", "HIGIENE_PLAN", "HIGIENE_TRANSCRIPT", "HIGIENE_PERMITIR_TESTS", "HIGIENE_PERMITIR_FLOTA", "HIGIENE_BLOQUE"]) delete env[k];
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, args, { cwd: ROOT, env, input: "", encoding: "utf8", timeout: minutos * 60000, windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** `rojo-verde --todas` sobre un repo dado. */
export function rojoVerdeTodas(repo: string): Salida {
  return correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo]);
}
/** `rojo-verde --orden <id>` sobre el repo propio (B1: la orden congelada vuelve a pasar). Lleva el reloj de `correrE2E` porque
 *  en T arrastra la C2 de E2E-01, que corre `e2e.mjs` contra las dos webs. */
export function rojoVerdeOrden(id: string): Salida {
  return correrE2E(["tools/verdad/rojo-verde.mjs", "--orden", id]);
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
 *  `HEAD:tests/orden/APROBADAS.md`). Se calcula en el momento (CONEXION-07, pieza 5): una lista escrita a mano se rompe con cada
 *  orden nueva. */
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
