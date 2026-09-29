// Utilidades de la orden IDIOMAS-01 (sesión A, 2026-09-29). Se llama `_comun.ts` y no `_util.ts` (§ Interfaz de la HOJA y regla
// heredada de CONEXION-05/VERDAD-09): la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las
// órdenes de APROBADAS.md, y un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. COPIADO de
// `tests/orden/arreglos-02/_comun.ts` (no importado: esa carpeta queda congelada al aprobarse la orden), recortado a lo que esta
// orden usa —fuera las zonas, las corridas y `capturasEstables` como precondición— y ampliado con lo suyo: el ARNÉS DE VITE
// (`sitio()`: el `src/config/site.ts` real cargado con `vite.ssrLoadModule`, como `tests/language-roundtrip.test.ts`), los fixtures
// de T y del diseño, y la huella de `diseno/capturas/03-igualdad-idiomas/igualdad.mjs`.
// Reusa de ../verdad-02 y ../verdad-05 lo que no cambia (spawnSync, git, repos temporales, borrado, procesos largos).
// Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz; los imports sólo con `import()`
// dinámico dentro del test. `vite` y `react-dom/server` se importan por VARIABLE: este archivo es idéntico en H, que no tiene Vite,
// y `tsc` no tiene que resolverlos. Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el otro repo se
// lee por ruta fija (`RUTA`, como hueco.mjs); la identidad del repo sale de package.json para sobrevivir al clon neutro.
// Toda carpeta temporal lleva el prefijo «idiomas-01-» y se borra en `finally`. Ningún test escribe en Firestore, en Storage ni en
// Vercel: a la red se sale SÓLO a leer (D2, los GET que `e2e.mjs` hace contra los dos dominios).
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

/** Commit aprobado de ARREGLOS-02 en cada repo (Liam, 2026-09-27) y último rojo de su carpeta. */
export const ARREGLOS_02 = { aprobado: { T: "19ba544", H: "3bc8aa5" }, rojo: { T: "f6389a2", H: "c8834a1" } };
/** Esta orden: su carpeta, para encontrar su commit rojo por git (D2) y excluirse de las reproducciones de HEAD. */
export const ORDEN = "idiomas-01";

/** Raíces reales por ruta fija (como hueco.mjs): el repo propio es ROOT; el otro se lee de aquí. */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub" };
/** El registro del bloque y la especificación de diseño (sin git): se leen, nunca se escriben. */
export const NICHOS = "C:/Users/liama/Desktop/Nichos";
export const BLOQUE = `${NICHOS}/bloque-04`;
export const DISENO = `${NICHOS}/diseno`;
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

/** Los tres idiomas que no son el base (hebreo) y las tres secciones cuyo dato es del cliente (D11). */
export const OTROS = ["en", "ru", "ar"] as const;
export const SECCIONES = ["services", "staff", "testimonials"] as const;
export const PALETAS = ["a", "c"] as const;

/** Fuente de un archivo del repo propio. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
/** Un JSON por ruta absoluta. */
export const json = (abs: string) => JSON.parse(readFileSync(abs, "utf8")) as Record<string, any>;
/** El fixture de una plantilla, en T (por ruta fija: también lo leen los tests de H). */
export const fixture = (p: string) => json(`${RAIZ_T}/dev-fixtures/peluqueria-paleta-${p}.json`);
/** La capa de idiomas del diseño (la especificación de D1). */
export const capaDiseno = (p: string) => json(`${DISENO}/services/prototipo/idiomas-${p}.json`);
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
/** Igualdad por valor, sin depender del orden de las claves. */
export const iguales = (a: unknown, b: unknown) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

/** La huella de `diseno/capturas/03-igualdad-idiomas/igualdad.mjs:8–19`, COPIADA campo por campo: todo lo que NO es texto. */
export function huella(c: Record<string, any>) {
  return {
    servicios: (c.services || []).map((s: any) => `${s.id}:${s.price}${s.priceMax ? "-" + s.priceMax : ""}/${s.duration}/${s.mode || "reserva"}`),
    fotosServicios: (c.sections?.services?.images || []).length,
    destacados: JSON.stringify(c.sections?.services?.featured || null),
    equipo: (c.staff || []).map((s: any) => `${s.id}:${(s.photoUrl || "").split("%2F").pop()?.split("?")[0]}`),
    reseñas: (c.testimonials || []).map((t: any) => `${t.id}:${t.rating}`),
    galeria: (c.sections?.gallery?.items || []).length,
    faq: (c.sections?.faq?.items || []).length,
    instagram: (c.sections?.instagram?.images || []).length,
    horario: JSON.stringify(c.hours || null),
    telefono: c.contact?.phone,
  };
}
/** Las claves de la huella que difieren entre dos idiomas (lo que `igualdad.mjs` imprime como «N diferencias»). */
export function diferencias(base: ReturnType<typeof huella>, otra: ReturnType<typeof huella>): string[] {
  return (Object.keys(base) as (keyof typeof base)[]).filter((k) => JSON.stringify(otra[k]) !== JSON.stringify(base[k]))
    .map((k) => `${k}: he=${JSON.stringify(base[k]).slice(0, 80)} ≠ ${JSON.stringify(otra[k]).slice(0, 80)}`);
}

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
/** Nombres de los tests que el TAP de una corrida declara, sin los subtests. */
export const nombresTap = (stdout: string) => stdout.split(/\r?\n/).map((l) => l.match(/^(?:not )?ok \d+ - (.+?)\s*$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => m[1]);
/** La última línea de un stdout que es un JSON de objeto (lo que `e2e.mjs --json` imprime al final). */
export function jsonFinal(stdout: string): Record<string, unknown> {
  const linea = stdout.split(/\r?\n/).reverse().find((l) => l.trim().startsWith("{") && l.trim().endsWith("}"));
  if (!linea) throw new Error(`no hay una línea JSON en la salida:\n${stdout.slice(-1500)}`);
  return JSON.parse(linea.trim()) as Record<string, unknown>;
}
/** Última línea no vacía de un stdout. */
export const ultimaLinea = (stdout: string) => stdout.split(/\r?\n/).filter((l) => l.trim()).pop() ?? "";

/** Carpeta temporal de esta orden: prefijo «idiomas-01-» en os.tmpdir(). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "idiomas-01-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza. */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

// ─── El arnés de Vite (A1–A4, B1) ────────────────────────────────────────────────────────────────────────────────────────────
/** Lo que `src/config/site.ts` exporta y el arnés usa (la misma forma que `tests/language-roundtrip.test.ts`). */
export type Site = {
  siteConfig: Record<string, any>;
  applyTenantConfigOverride: (o: Record<string, unknown>) => void;
  switchSiteLanguage: (l: string) => void;
  switchSiteToNiche: (n: string, l?: string) => void;
};
type Vite = { ssrLoadModule: (u: string) => Promise<Record<string, unknown>>; close: () => Promise<void> };
let _vite: Vite | null = null;
let _site: Site | null = null;
/** El `site.ts` real cargado con Vite, una vez por proceso. Nicho peluquería e idioma base hebreo, como la web de las plantillas;
 *  el cliente se aplica con `aplicar()`. `vite` va por variable (ver la cabecera). */
export async function sitio(): Promise<Site> {
  if (_site) return _site;
  process.env.VITE_ACTIVE_NICHE = "peluqueria";
  process.env.VITE_UI_LANGUAGE = "he";
  process.env.VITE_CLIENT_ID = "test-idiomas-01";
  const VITE = "vite";
  const { createServer } = (await import(VITE)) as { createServer: (o: Record<string, unknown>) => Promise<Vite> };
  _vite = await createServer({
    configFile: false, root: ROOT, logLevel: "silent", appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  _site = (await _vite.ssrLoadModule("/src/config/site.ts")) as unknown as Site;
  return _site;
}
/** Un módulo de T cargado por el mismo servidor de Vite (B1: el componente real de reseñas). */
export async function modulo(rel: string): Promise<Record<string, unknown>> {
  await sitio();
  return (_vite as Vite).ssrLoadModule(rel);
}
/** Cierra el servidor de Vite (en `after`). */
export async function cerrarSitio(): Promise<void> {
  const v = _vite; _vite = null; _site = null;
  if (v) await v.close();
}
/** Deja el sitio en el preset hebreo, aplica el cliente (en `primerIdioma`, como hace main.tsx con `preferred_language`) y
 *  devuelve una copia de `siteConfig` en cada idioma pedido. Nunca muta el objeto que recibe. */
export async function enIdiomas(cliente: Record<string, unknown>, idiomas: readonly string[] = ["he", ...OTROS]): Promise<Record<string, Record<string, any>>> {
  const site = await sitio();
  site.switchSiteToNiche("peluqueria", "he");
  site.applyTenantConfigOverride(structuredClone(cliente));
  const out: Record<string, Record<string, any>> = {};
  for (const l of idiomas) {
    site.switchSiteLanguage(l);
    out[l] = structuredClone(site.siteConfig);
  }
  site.switchSiteLanguage("he");
  return out;
}
/** `react-dom/server` por variable (T no trae @types/react-dom y este archivo es idéntico en H). */
export async function renderToString(elemento: unknown): Promise<string> {
  const SERVIDOR = "react-dom/server";
  const m = (await import(SERVIDOR)) as { renderToString: (n: unknown) => string };
  return m.renderToString(elemento);
}

// ─── El cargador de .ts/.tsx de H (C1, C2), copiado de ../arreglos-02/_comun.ts ────────────────────────────────────────────
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
/** Registra el hook una vez por raíz en este proceso y devuelve el módulo de `abs` (ruta absoluta). */
export async function importarAbsoluto(abs: string, raiz: string, dev = false): Promise<Record<string, unknown>> {
  const clave = `${raiz}|${dev}`;
  if (!registrado.has(clave)) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(raiz, dev)), { parentURL: pathToFileURL(raiz + "/").href }); registrado.add(clave); }
  return (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
}
/** Igual, para una ruta relativa al repo propio. */
export const importarModulo = (rel: string, dev = false) => importarAbsoluto(resolve(ROOT, rel), ROOT, dev);

// ─── Procesos largos y rojo-verde ────────────────────────────────────────────────────────────────────────────────────────────
/** Como `correrLargo`, con el reloj de una corrida real de `e2e.mjs` (D2: dos `vite build` y 72 cargas de página). */
export function correrE2E(args: string[], minutos = 45): Salida {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ["HIGIENE_ROOTS", "HIGIENE_PLAN", "HIGIENE_TRANSCRIPT", "HIGIENE_PERMITIR_TESTS", "HIGIENE_PERMITIR_FLOTA", "HIGIENE_BLOQUE"]) delete env[k];
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, args, { cwd: ROOT, env, input: "", encoding: "utf8", timeout: minutos * 60000, windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}
/** El último commit de main que AÑADE `tests/orden/<id>/HOJA.md` en `raiz` (el rojo de esa orden), o "". */
export const rojoDe = (raiz: string, id: string) => git(raiz, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `tests/orden/${id}/HOJA.md`);
/** `rojo-verde --todas` sobre un repo dado. */
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
/** La orden propia más toda orden que HEAD lleva VIVA. Se calcula en el momento (CONEXION-07, pieza 5). */
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
