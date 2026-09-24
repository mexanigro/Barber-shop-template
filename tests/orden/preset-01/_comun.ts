// Utilidades de la orden PRESET-01 (sesión A, 2026-09-23). Se llama `_comun.ts` y no `_util.ts` (§ Interfaz de la HOJA y regla
// heredada de CONEXION-05/VERDAD-09): la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las
// órdenes de APROBADAS.md, y un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. COPIADO de
// `tests/orden/conexion-08/_comun.ts` (no importado: esa carpeta queda congelada al aprobarse la orden), recortado a lo que esta
// orden usa —fuera `medirPng`, `SIN_FIREBASE`, `urlStorage`, `tokenDe`, `rutaStorage` y `conTemporalAsync`: aquí ningún test abre
// Chromium ni toca Storage— y ampliado con lo que le falta: el cargador de módulos de `../conexion-07/_comun.ts`
// (`fuenteCargadorTsx` + `importarModulo` + `importarAbsoluto`), porque A1 y B1 tienen que CARGAR los presets de T, no leerlos como
// texto, y `peluqueria.<lang>.ts` importa `./themes` sin extensión, que `--experimental-strip-types` no resuelve solo.
// Reusa de ../verdad-02 y ../verdad-05 lo que no cambia (spawnSync, git, repos temporales, borrado, procesos largos).
// Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz (los presets en A1 y B1,
// `provisioning.ts` en B1); los imports de `src/` sólo con `import()` dinámico dentro del test. Un mismo archivo en T y en H
// (cmp → 0): lo propio de cada repo va por `REPO`; el otro repo se lee por ruta fija (`RUTA`, como hueco.mjs); la identidad del repo
// (`REPO`) sale de package.json para sobrevivir al clon neutro. Toda carpeta temporal lleva el prefijo «preset-01-» y se borra en
// `finally`, también si el test falla. Ningún test escribe en Storage ni en Firestore: B3 usa `b4-tenant.ts show`, que sólo lee.
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

/** Commit aprobado de CONEXION-08 en cada repo (Liam, 2026-09-23) y último rojo de su carpeta. */
export const CONEXION_08 = { aprobado: { T: "621bfe5", H: "73d0070" }, rojo: { T: "8e913a5", H: "6bcad35" } };

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
export const GUARD_PRESET = "tests/preset-generico.test.ts";
export const PRESETS = "src/config/presets";
export const NICHO_PRESETS = "src/lib/client-config/niche-presets.he.json";
export const PROVISIONING = "src/lib/provisioning.ts";
export const TENANT = "scripts/b4-tenant.ts";
export const FIXTURES = "dev-fixtures";
export const NICHO = "peluqueria";
export const ID_A = "test-b4-peluqueria-a";
/** Los cuatro presets de peluquería y el nombre que exporta cada uno. */
export const IDIOMAS = [["he", "peluqueriaPresetHe"], ["en", "peluqueriaPresetEn"], ["ru", "peluqueriaPresetRu"], ["ar", "peluqueriaPresetAr"]] as const;
export const rutaPreset = (lang: string) => `${PRESETS}/${NICHO}.${lang}.ts`;

/** Los valores genéricos de D-86. */
export const TELEFONO = "+972 3-000-0000";
export const DOMINIO_EMAIL = "@example.com";
/** Claves que `tests/preset-generico.test.ts` tiene que nombrar literalmente (A1). */
export const CLAVES = ["phone", "email", "instagram", "Google"] as const;
/** «reseña de Google» en los cuatro idiomas del preset (D-85: la atribución que nadie escribió en Google). */
export const GOOGLE = ["גוגל", "Google", "Гугл", "غوغل"] as const;
/** Lo que identifica al negocio concreto y no puede quedar en el preset (D-85, D-86): razón social y marca, código postal, calle y
 *  ciudad en los cuatro idiomas. El barrio y la ciudad de A y de C sí se conservan: son su diseño, no el del preset. */
export const IDENTIDAD = [
  "Studio Noa", "studionoa", "נועה לשיער", "نوعا للشعر",
  "5245204", "ביאליק", "Bialik", "Бялик", "بياليك",
  "רמת גן", "Ramat Gan", "Рамат-Ган", "رمات غان",
] as const;
/** Ciudad o barrio que cada plantilla conserva en su `contact.address` (D-85: A y C conservan nombre y ciudad). */
export const CIUDAD = { a: "הרצליה פיתוח", c: "פלורנטין" } as const;
/** Marca de una url de Instagram en cualquier string. */
export const INSTAGRAM = "instagram.com/";

/** Fixture real de T (peluqueria-paleta-<p>.json), leído por ruta fija. */
export function fixture(p: "a" | "c"): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ_T, FIXTURES, `${NICHO}-paleta-${p}.json`), "utf8"));
}
/** Valor anidado por ruta con puntos. */
export const get = (o: unknown, ruta: string): unknown => ruta.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
/** Fuente de un archivo del repo propio. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

/** Todos los strings de un objeto, con su ruta: `[["contact.phone", "03-…"], ["staff.0.social.instagram", "https://…"], …]`.
 *  Es el recorrido que piden A1 y A2: nada se prueba por grep de una línea suelta. */
export function cadenas(o: unknown, ruta = "", acc: [string, string][] = []): [string, string][] {
  if (typeof o === "string") { acc.push([ruta, o]); return acc; }
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Record<string, unknown>)) cadenas(v, ruta ? `${ruta}.${k}` : k, acc);
  return acc;
}
/** Todos los `testimonials[].title` de un objeto, con su ruta: los de la raíz y los de cada `translations.<lang>`. */
export function titulos(o: unknown): [string, string][] {
  return cadenas(o).filter(([r]) => /(^|\.)testimonials\.\d+\.title$/.test(r));
}
/** Emails que aparecen en un string (lo bastante estricto para no confundir una url con un correo). */
export const emailsDe = (s: string) => s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];

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
/** Cuenta los `test(` de un archivo, incluidos los guardados por repo (`if (REPO === "H") test(`). */
export const cuentaTests = (src: string) => (src.match(/^(?:if \([^)]*\) )?test\(/gm) ?? []).length;
/** Cuenta los `test(` que CORREN en `repo`: los sueltos más los guardados con `if (REPO === "<repo>")`. */
export function cuentaTestsDe(src: string, repo: "T" | "H"): number {
  const lineas = src.split(/\r?\n/);
  const sueltos = lineas.filter((l) => /^test\(/.test(l)).length;
  const guardados = lineas.filter((l) => new RegExp(`^if \\(REPO === "${repo}"\\) test\\(`).test(l)).length;
  return sueltos + guardados;
}
/** Última línea no vacía de un stdout. */
export const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";
/** Nombres de los tests que el TAP de una corrida declara (`ok N - <nombre>` / `not ok N - <nombre>`), sin los subtests. */
export const nombresTap = (stdout: string) => stdout.split(/\r?\n/).map((l) => l.match(/^(?:not )?ok \d+ - (.+?)\s*$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => m[1]);

/** Carpeta temporal de esta orden: prefijo «preset-01-» en os.tmpdir() (rojo-verde mide los restos en el TEMP propio de la corrida). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "preset-01-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Fuente del hook de carga para el repo `raiz` (COPIADA de ../conexion-07/_comun.ts): `resolve` (alias `@/` e imports sin extensión)
 *  + `load` (.tsx por typescript y .ts que nombre `import.meta.env` con el `define` de Vite antepuesto). Sin él,
 *  `peluqueria.<lang>.ts` no carga: importa `./themes` sin extensión y `--experimental-strip-types` no resuelve extensiones. */
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
 *  antes cada test. `raiz` es el repo que presta `typescript` y el alias `@/`: para los presets de T es siempre T. */
export async function importarAbsoluto(abs: string, raiz: string, dev = false): Promise<Record<string, unknown>> {
  const clave = `${raiz}|${dev}`;
  if (!registrado.has(clave)) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(raiz, dev)), { parentURL: pathToFileURL(raiz + "/").href }); registrado.add(clave); }
  return (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
}
/** Igual, para una ruta relativa al repo propio. */
export const importarModulo = (rel: string, dev = false) => importarAbsoluto(resolve(ROOT, rel), ROOT, dev);
/** Los cuatro presets de peluquería de T, cargados (no leídos como texto): `[["he", objeto], …]`. */
export async function presetsDeT(): Promise<[string, Record<string, unknown>][]> {
  const salida: [string, Record<string, unknown>][] = [];
  for (const [lang, nombre] of IDIOMAS) {
    const mod = await importarAbsoluto(join(RAIZ_T, rutaPreset(lang)), RAIZ_T);
    const preset = mod[nombre];
    if (!preset || typeof preset !== "object") throw new Error(`${rutaPreset(lang)} no exporta ${nombre}`);
    salida.push([lang, preset as Record<string, unknown>]);
  }
  return salida;
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
