// Utilidades de la orden CONEXION-07 (sesión A, 2026-09-23). Se llama `_comun.ts` y no `_util.ts` (§ Interfaz de la HOJA y regla
// heredada de CONEXION-05/VERDAD-09): la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las
// órdenes de APROBADAS.md, y un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. Reusa de ../verdad-02 y ../verdad-05 lo
// que no cambia (spawnSync, git, repos temporales, borrado, procesos largos); NO importa ../conexion-06/ ni ../conexion-05/ (sus
// carpetas quedan congeladas y el D1 de esta orden reproduce HEAD sin depender de otra carpeta de orden): el cargador de .tsx/.ts, la
// identidad del repo, la reproducción de HEAD y las órdenes vivas están COPIADOS de allí. Caja negra: nada importa src/*, tools/* ni
// scripts/* salvo lo que la hoja fija como interfaz (`clampWords` y `warnWords` de A1, `resolveVariant`/`pickVariantModule` de B1);
// los imports de `tools/` y de `src/` sólo con `import()` dinámico dentro del test. Un mismo archivo en T y en H (cmp → 0): lo propio
// de cada repo va por `REPO`; el otro repo se lee por ruta fija (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale de
// package.json para sobrevivir al clon neutro. Toda carpeta temporal lleva el prefijo «conexion-07-» y se borra en `finally`, también
// si el test falla. Ningún test escribe en Storage ni en Firestore (aquí no se llama a `recrear.mjs` ni a `b4-tenant.ts`).
//
// Cargador de .tsx/.ts: `node --experimental-strip-types` no carga archivos .tsx, así que los tests que importan un componente
// registran antes un hook de `module.register` (data: URL) que transpila SÓLO los .tsx con `typescript.transpileModule` (jsx
// react-jsx, ESNext) y resuelve `@/x` → `<raíz>/src/x` y los imports relativos sin extensión (.tsx, .ts, /index.tsx, /index.ts).
//
// Inyección de `import.meta.env` (copiada de CONEXION-06 y ampliada con `DEV`): `src/lib/words.ts` de T lee `import.meta.env?.DEV`
// para avisar, que lo define Vite y no Node ni tsx; sin la marca, `warnWords` NUNCA avisa y A1 no podría medir el aviso. El mismo hook
// transpila los `.ts` cuyo texto nombra `import.meta.env` anteponiendo `import.meta.env ??= { … }`, que es lo que Vite define, con el
// `DEV` que pida el test: se adapta el arnés, no el código de producción.
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

/** Commit aprobado de CONEXION-06 en cada repo (Liam, 2026-09-23) y último rojo de su carpeta. */
export const CONEXION_06 = { aprobado: { T: "b5b78f7", H: "07739a1" }, rojo: { T: "014523d", H: "6ad11a4" } };

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
export const GUARD_HERO = "tests/hero-textos.test.ts";
export const GUARD_SECCIONES = "tests/secciones-datos.test.ts";
export const WORDS = "src/lib/words.ts";
export const HERO_V6 = "src/components/landing/hero/hero-v6.tsx";
export const TEAM = "src/components/landing/Team.tsx";
export const TESTIMONIALS = "src/components/landing/Testimonials.tsx";
export const NAVBAR = "src/components/layout/Navbar.tsx";
export const VARIANTES = "src/lib/section-variants.ts";
export const CONTRATOS = "verdad/contratos.json";
export const HUECO = "tools/verdad/hueco.mjs";
export const FIXTURES = "dev-fixtures";
export const NICHO = "peluqueria";

/** Las seis filas que esta orden hace (20/36 → 26/36) y el `guard` que B1 les declara (D-75, D-77). */
export const FILAS = ["hero.titular", "hero.subtitle", "hero.cta", "testimonials.rating", "staff.photoUrl", "navbar.variant"] as const;
export const GUARDS: Record<string, { archivo: string; clave: string }> = {
  "hero.titular": { archivo: GUARD_HERO, clave: "titleHighlight" },
  "hero.subtitle": { archivo: GUARD_HERO, clave: "subtitle" },
  "hero.cta": { archivo: GUARD_HERO, clave: "ctaPrimary" },
  "testimonials.rating": { archivo: GUARD_SECCIONES, clave: "rating" },
  "staff.photoUrl": { archivo: GUARD_SECCIONES, clave: "photoUrl" },
  "navbar.variant": { archivo: GUARD_SECCIONES, clave: "navbar" },
};
/** Claves que cada guard tiene que nombrar literalmente (la `clave` de su fila en contratos.json). */
export const CLAVES_HERO = ["titleHighlight", "subtitle", "ctaPrimary"] as const;
export const CLAVES_SECCIONES = ["photoUrl", "rating", "navbar"] as const;
/** Nota que CONTRATOS-HUECOS.md gana en la línea del contrato de cada una de las seis. */
export const NOTA = "guard (CONEXION-07)";
/** Los veinte huecos ya hechos al cerrar CONEXION-06 (línea base de esta orden, medida con `hueco.mjs --json` en HEAD). */
export const BASE_HECHOS = [
  "paleta", "branding.mode", "hero.video", "hero.video.portrait", "hero.video.poster", "hero.eyebrow",
  "services.catalogo", "services.priceMax", "services.mode", "services.images", "services.featured", "services.surface",
  "gallery.items", "gallery.items.alt", "gallery.selection", "gallery.variant", "gallery.surface",
  "branding.texture", "branding.localPhoto", "branding.localPhotoMobile",
];

/** Límites del contrato del hero v6 (CONTRATOS-HUECOS § hero v6; T:hero-v6.tsx:32, :179, :182–184). */
export const LIMITE_SUBTITULO = 12;
export const RANGO_TITULAR = [2, 6] as const;
export const RANGO_CTA = [1, 2] as const;

/** Fixture real de T (peluqueria-paleta-<p>.json), leído por ruta fija. */
export function fixture(p: "a" | "c"): Record<string, unknown> {
  return JSON.parse(readFileSync(join(RAIZ_T, FIXTURES, `peluqueria-paleta-${p}.json`), "utf8"));
}
/** Valor anidado por ruta con puntos. */
export const get = (o: unknown, ruta: string): unknown => ruta.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
/** Fuente de un archivo del repo propio. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
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
/** Líneas de CONTRATOS-HUECOS.md que contienen un texto literal (fila de tabla o párrafo: el contrato de `staff[].photoUrl`
 *  vive en el párrafo de § Gama de color, no en una fila — ajuste de A, 2026-09-23). */
export const lineasCon = (md: string[], texto: string) => md.filter((l) => l.includes(texto));

/** Carpeta temporal de esta orden: prefijo «conexion-07-» en os.tmpdir() (rojo-verde mide los restos en el TEMP propio de la corrida). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "conexion-07-"));
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

/** Espía de `console.warn` alrededor de `fn`: devuelve los mensajes emitidos y restaura la consola SIEMPRE. */
export function espiarWarn(fn: () => void): string[] {
  const original = console.warn;
  const mensajes: string[] = [];
  console.warn = (...args: unknown[]) => { mensajes.push(args.map(String).join(" ")); };
  try { fn(); } finally { console.warn = original; }
  return mensajes;
}

/** Fuente del hook de carga para el repo `raiz`: `resolve` (alias `@/` e imports sin extensión) + `load` (.tsx por typescript y
 *  .ts que nombre `import.meta.env` con el `define` de Vite antepuesto, con el `DEV` que pida el test). */
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
let registrado = false;
/** Registra el hook una vez en este proceso (con la marca DEV pedida) y devuelve el módulo de `ruta` (relativa a ROOT).
 *  El `existsSync` lo afirma antes cada test. */
export async function importarModulo(ruta: string, dev = false): Promise<Record<string, unknown>> {
  if (!registrado) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(ROOT, dev)), { parentURL: pathToFileURL(ROOT + "/").href }); registrado = true; }
  return (await import(pathToFileURL(resolve(ROOT, ruta)).href)) as Record<string, unknown>;
}
