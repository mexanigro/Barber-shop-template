// Utilidades de la orden ARREGLOS-01 (sesión A, 2026-09-25). Se llama `_comun.ts` y no `_util.ts` (§ Interfaz de la HOJA y regla
// heredada de CONEXION-05/VERDAD-09): la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las
// órdenes de APROBADAS.md, y un `_util.ts` nuevo cae en el pre-commit del propio commit rojo. COPIADO de
// `tests/orden/e2e-01/_comun.ts` (no importado: esa carpeta queda congelada al aprobarse la orden), recortado a lo que esta orden
// usa —fuera `WEBS`, `vercel`, `traer`, `leerDoc`, `envDe`, las zonas y los fixtures de las dos webs— y ampliado con lo suyo:
// las rutas de los tres arreglos de D-106 y `canonico` (comparar por valor, no por orden de claves).
// El cargador de módulos viene tal cual: aquí lo usan B1 (que monta tres componentes `.tsx` de T con `renderToString`) y C1, C2 y
// D1 (que importan `.ts` de H con el alias `@/`).
// Reusa de ../verdad-02 y ../verdad-05 lo que no cambia (spawnSync, git, repos temporales, borrado, procesos largos).
// Caja negra: nada importa src/*, tools/* ni scripts/* salvo lo que la hoja fija como interfaz; los imports sólo con `import()`
// dinámico dentro del test. Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el otro repo se lee por
// ruta fija (`RUTA`, como hueco.mjs); la identidad del repo (`REPO`) sale de package.json para sobrevivir al clon neutro.
// Toda carpeta temporal lleva el prefijo «arreglos-01-» y se borra en `finally`, también si el test falla. NINGÚN test de esta
// orden sale a la red, ni escribe en Firestore, en Storage ni en Vercel: A1 levanta su propia página en 127.0.0.1 y C1 sube a un
// bucket en memoria.
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

/** Commit aprobado de E2E-01 en cada repo (Liam, 2026-09-25) y último rojo de su carpeta. */
export const E2E_01 = { aprobado: { T: "c4faa5d", H: "0c6d3e0" }, rojo: { T: "cb540c5", H: "4b6c373" } };

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
/** A · la herramienta de comparación de E2E-01, que esta orden vuelve estable. */
export const E2E = "tools/verdad/e2e.mjs";
/** B · los cuatro lectores de `sections.services.images` en T (D-109). Los tres primeros PINTAN; `site.ts` es quien produce el hueco. */
export const HERO_V4 = "src/components/landing/hero/estetica/hero-v4.tsx";
export const SERVICES_V6 = "src/components/landing/services/services-v6.tsx";
export const TARJETAS = "src/components/landing/services-treatment-card-grid.tsx";
export const SITE = "src/config/site.ts";
/** Los tres que pintan, con el nombre que exportan y las props con que la página los monta. */
export const PINTAN = [
  { archivo: HERO_V4, exporta: "EsteticaHeroV4" },
  { archivo: SERVICES_V6, exporta: "ServicesV6" },
  { archivo: TARJETAS, exporta: "ServicesTreatmentCardGrid" },
] as const;
/** La clave con el hueco y el aviso que React emite cuando le llega `src=""`. */
export const CLAVE_IMAGENES = "sections.services.images";
export const AVISO_REACT = 'An empty string ("") was passed to the src attribute';
/** C · la casilla de logo. */
export const MEDIA_UPLOAD = "src/lib/media-upload.ts";
export const RUTA_LOGO = "src/app/api/upload-logo/[clientId]/route.ts";
export const CONFIG_TAB = "src/components/client-config-tab.tsx";
export const B4_MATERIAL = "scripts/b4-material.ts";
/** Lo que la ruta del logo deja de usar (D-110). */
export const VIEJO_LOGO = ["randomUUID", "logo-light-bg.png", "logo-dark-bg.png"] as const;
/** D · la ficha por slug. */
export const HUB_CLIENTS = "src/lib/hub-clients.ts";
export const RUTA_FICHA = "src/app/api/clients/[clientId]/route.ts";
export const PAGINA_FICHA = "src/app/clients/[clientId]/page.tsx";
/** E · la copia promovida de E2E-01 que emite el diagnóstico de material (D-112). */
export const COPIA_B = "tests/e2e-01-b.test.ts";
export const ETIQUETA_LOGO = "LOGO-01";

/** Fuente de un archivo del repo propio. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
/** Valor anidado por ruta con puntos. */
export const get = (o: unknown, ruta: string): unknown => ruta.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
/** Copia con las claves de cada objeto ORDENADAS: comparar por valor y no por el orden en que vino (corrección (2) de A en E2E-01). */
export function canonico(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = canonico((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
/** Las etiquetas `<img …>` de un HTML. */
export const imagenes = (html: string) => [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
/** Una `<img>` con `src` útil: React descarta `src=""`, así que un hueco sale como una `<img>` SIN atributo `src`. */
export const conSrc = (tag: string) => / src="[^"]+"/.test(tag);

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
/** Las líneas de diagnóstico que un TAP lleva (`# <texto>`), sin las de resumen del runner (`# pass`, `# fail`, …). */
export const diagnosticosTap = (stdout: string) => stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^# /.test(l)).filter((l) => !/^# (?:Subtest|pass|fail|tests|suites|skipped|todo|cancelled|duration_ms|start of|Warning)/.test(l));

/** Carpeta temporal de esta orden: prefijo «arreglos-01-» en os.tmpdir() (rojo-verde mide los restos en el TEMP propio de la corrida). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "arreglos-01-"));
}
/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}
/** Igual, para un cuerpo asíncrono. */
export async function conTemporalAsync<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const base = carpetaTemporal();
  try { return await fn(base); } finally { borrar(base); }
}

/** Fuente del hook de carga para el repo `raiz` (COPIADA de ../e2e-01/_comun.ts, que la copió de ../preset-01): `resolve`
 *  (alias `@/` e imports sin extensión) + `load` (.tsx por typescript y .ts que nombre `import.meta.env`). */
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
 *  antes cada test. `raiz` es el repo que presta `typescript` y el alias `@/`. */
export async function importarAbsoluto(abs: string, raiz: string, dev = false): Promise<Record<string, unknown>> {
  const clave = `${raiz}|${dev}`;
  if (!registrado.has(clave)) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(raiz, dev)), { parentURL: pathToFileURL(raiz + "/").href }); registrado.add(clave); }
  return (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
}
/** Igual, para una ruta relativa al repo propio. */
export const importarModulo = (rel: string, dev = false) => importarAbsoluto(resolve(ROOT, rel), ROOT, dev);

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
