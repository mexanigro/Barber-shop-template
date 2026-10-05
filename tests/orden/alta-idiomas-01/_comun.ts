// Utilidades de la orden ALTA-IDIOMAS-01 (sesión A, 2026-10-05). Se llama `_comun.ts` y no `_util.ts` (regla heredada de CONEXION-05
// y VERDAD-09: la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts` de las aprobadas).
// COPIADO (no importado: esas carpetas quedan congeladas al aprobarse su orden) y RECORTADO de `tests/orden/auditoria-01/_comun.ts`
// (el id, la identidad del repo, la lectura de CLAUDE.md), `tests/orden/arreglos-03/_comun.ts` (el cargador de .ts/.tsx de H) y
// `tests/orden/cierre-tramo-01/_comun.ts` (`envDe`, `leerDoc`: sólo `.get()` de Firestore, para W1, la única «, webs»); y ampliado
// con lo suyo: el fixture A copiado a esta carpeta, el cliente de Anthropic FALSO que se inyecta (ningún test de esta orden sale a la
// API: punto 8), la fusión `merge: true` de Firestore modelada (de tests/casillas-sin-huecos.test.ts) y el recorrido de un componente
// sin estado llamado como función (de tests/contacto-pie-casillas.test.ts).
// Caja negra: nada importa src/*, tools/* ni scripts/* de forma estática; los módulos de H se importan con `import()` dinámico dentro
// del test. Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el otro se lee por ruta fija (`RUTA`); la
// identidad del repo sale de package.json para sobrevivir al clon neutro. Los especificadores que sólo existen en H (firebase-admin)
// van en una variable, para que el `tsc` de T no los resuelva.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY, git } from "../verdad-02/_util.ts";

export { ROOT, SOY, git } from "../verdad-02/_util.ts";

/** Commit aprobado de AUDITORIA-01 en cada repo (Liam, 2026-10-05) y su último rojo. */
export const AUDITORIA_01 = { aprobado: { T: "907f5dc", H: "76b1535" }, rojo: { T: "9045107", H: "a7d2e0d" } };
/** Esta orden. */
export const ORDEN = "alta-idiomas-01";
/** El modelo que eligió Liam (D-239). */
export const MODELO = "claude-opus-5-5";
/** Los cuatro idiomas de una web (inciso r). */
export const IDIOMAS = ["he", "en", "ru", "ar"] as const;

/** Raíces reales por ruta fija (como hueco.mjs): el repo propio es ROOT; el otro se lee de aquí. */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub" };
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

/** Fuente de un archivo del repo propio, y si existe. */
export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
export const existe = (rel: string) => existsSync(resolve(ROOT, rel));

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

// ─── El cargador de .ts/.tsx de H, copiado de ../arreglos-03/_comun.ts ─────────────────────────────────────────────────────
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
export async function importarModulo(rel: string, dev = false): Promise<Record<string, any>> {
  const clave = `${ROOT}|${dev}`;
  if (!registrado.has(clave)) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(ROOT, dev)), { parentURL: pathToFileURL(ROOT + "/").href }); registrado.add(clave); }
  return (await import(pathToFileURL(resolve(ROOT, rel)).href)) as Record<string, any>;
}

// ─── Lo que se lee y se escribe: el fixture, la fusión de Firestore y su validador ──────────────────────────────────────────────
export type Cfg = Record<string, any>;
export type Issue = { path: string; message: string; severity: "error" | "warning" };
/** El fixture A de peluquería, copiado byte a byte de `T dev-fixtures/peluqueria-paleta-a.json` (T 907f5dc) a esta carpeta, para que
 *  el rojo se reconstruya desde el árbol (inciso l, como D-144). */
export const fixtureA = (): Cfg => JSON.parse(readFileSync(resolve(ROOT, "tests", "orden", ORDEN, "peluqueria-paleta-a.json"), "utf8"));
/** El fixture A sin ninguna capa `translations`: lo que tiene una clienta que dio todo en hebreo y nada en los otros idiomas. */
export const sinCapas = (c: Cfg): Cfg => { const { translations: _t, ...resto } = structuredClone(c); return resto; };
export const porJson = (c: Cfg): Cfg => JSON.parse(JSON.stringify(c));

const esMapa = (v: unknown): v is Cfg => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
/** `set(data, { merge: true })` de Firestore sobre `doc` (copiado de tests/casillas-sin-huecos.test.ts); `esBorrar` reconoce el
 *  `FieldValue.delete()` que pone `paraFirestore`. */
export function fusionar(doc: Cfg, data: Cfg, esBorrar: (v: unknown) => boolean): Cfg {
  const out = structuredClone(doc);
  for (const [k, v] of Object.entries(data)) {
    if (esBorrar(v)) delete out[k];
    else if (esMapa(v) && Object.keys(v).length) out[k] = fusionar(esMapa(out[k]) ? out[k] : {}, v, esBorrar);
    else out[k] = structuredClone(v);
  }
  return out;
}
/** Lo que pasa con un cuerpo de guardado de la ficha: `PUT /api/config` → `paraFirestore` → `set(…, { merge: true })`. Sólo en H. */
export async function guardarEnFirestore(doc: Cfg, cuerpo: Cfg): Promise<Cfg> {
  if (!Object.keys(cuerpo).length) return doc;
  const ESPEC = "firebase-admin/firestore";
  const { FieldValue } = (await import(ESPEC)) as { FieldValue: { delete: () => unknown } };
  const borrar = FieldValue.delete() as { isEqual: (o: unknown) => boolean };
  const { paraFirestore } = await importarModulo("src/lib/config-firestore.ts");
  const esBorrar = (v: unknown) => !!v && typeof v === "object" && typeof (v as any).isEqual === "function" && borrar.isEqual(v);
  return fusionar(doc, paraFirestore(porJson(cuerpo)), esBorrar);
}

/** Palabras de un texto (la regla de `config-validator.ts`). */
export const palabras = (s: unknown) => (typeof s === "string" ? s.trim().split(/\s+/).filter(Boolean).length : 0);

// ─── El cliente de Anthropic falso (punto 8: ningún test sale a la red) ─────────────────────────────────────────────────────────
/** Lo que el falso guarda de cada llamada: el texto del `system`, el del mensaje del usuario, los parámetros sin `messages` y las
 *  rutas que pide (las `properties` del esquema de `output_config.format`, D-242). */
export type Pedido = { system: string; user: string; params: Cfg; rutas: string[] };
const textoDe = (v: unknown): string => (typeof v === "string" ? v : Array.isArray(v) ? v.map((b) => (typeof b === "string" ? b : String((b as Cfg)?.text ?? ""))).join("\n") : "");
/** Un cliente con la forma del SDK (`messages.create`) que responde con `responder(rutas, n)` (n = número de llamada, desde 1) como
 *  JSON en un bloque de texto, y guarda cada pedido en `pedidos`. */
export function clienteFalso(responder: (rutas: string[], n: number, pedido: Pedido) => Record<string, string>) {
  const pedidos: Pedido[] = [];
  const cliente = {
    messages: {
      async create(params: Cfg) {
        const { messages, ...resto } = params;
        const props = params?.output_config?.format?.schema?.properties;
        const rutas = props && typeof props === "object" ? Object.keys(props) : [];
        const pedido: Pedido = { system: textoDe(params.system), user: (Array.isArray(messages) ? messages : []).map((m: Cfg) => textoDe(m?.content)).join("\n"), params: porJson(resto), rutas };
        pedidos.push(pedido);
        const json = responder(rutas, pedidos.length, pedido);
        return { id: `msg_falso_${pedidos.length}`, type: "message", role: "assistant", model: params.model, stop_reason: "end_turn", stop_details: null as unknown, content: [{ type: "text", text: JSON.stringify(json) }], usage: { input_tokens: 1000, output_tokens: 500 } };
      },
    },
  };
  return { cliente, pedidos };
}
/** Un texto que cumple los límites de la ruta (D-243): la frase de un servicio de 6 a 12 palabras; lo demás, dos. Sin dígitos. */
export function textoValido(marca: string, ruta: string): string {
  return /\.description$/.test(ruta) && ruta.startsWith("services.") ? `${marca} uno dos tres cuatro cinco seis` : `${marca} texto`;
}
/** El responder de un modelo que cumple: cada ruta pedida, con la marca de su llamada («k<n>w»). */
export const cumplidor = (rutas: string[], n: number) => Object.fromEntries(rutas.map((r) => [r, textoValido(`k${n}w`, r)]));

// ─── Un componente sin estado, llamado como función ────────────────────────────────────────────────────────────────────────────
/** Recorre el árbol de elementos de React que devuelve un componente sin hooks: llama los componentes función que encuentra y junta
 *  los elementos de host (`type` string) y los textos. */
export function recorrer(nodo: unknown, out: { elementos: Cfg[]; textos: string[] } = { elementos: [], textos: [] }) {
  if (nodo == null || typeof nodo === "boolean") return out;
  if (typeof nodo === "string" || typeof nodo === "number") { out.textos.push(String(nodo)); return out; }
  if (Array.isArray(nodo)) { for (const n of nodo) recorrer(n, out); return out; }
  const el = nodo as Cfg;
  if (typeof el.type === "function") return recorrer(el.type(el.props ?? {}), out);
  if (typeof el.type === "string") out.elementos.push(el);
  recorrer(el.props?.children, out);
  return out;
}

// ─── Firestore, sólo lectura (W1, «, webs») ─────────────────────────────────────────────────────────────────────────────────────
/** Las variables de `.env.local` de una raíz (sin imprimirlas). */
export function envDe(raiz: string): Record<string, string> {
  const abs = join(raiz, ".env.local");
  if (!existsSync(abs)) throw new Error(`falta ${abs}: sin él no se puede leer Firestore`);
  const out: Record<string, string> = {};
  for (const linea of readFileSync(abs, "utf8").split(/\r?\n/)) {
    const t = linea.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}
/** Un documento de Firestore por el Admin SDK de H: sólo `.get()`. */
export async function leerDoc(coleccion: string, id: string): Promise<Cfg | undefined> {
  const env = envDe(RAIZ_H);
  for (const [k, v] of Object.entries(env)) if (k.startsWith("FIREBASE_") || k.startsWith("NEXT_PUBLIC_FIREBASE_")) process.env[k] ??= v;
  const { db } = await importarModulo("src/lib/firebase-admin.ts");
  const snap = await db.collection(coleccion).doc(id).get();
  return snap.exists ? (snap.data() as Cfg) : undefined;
}

/** El último commit de main que AÑADE `tests/orden/<id>/HOJA.md` en `raiz` (el rojo de esa orden), o "". */
export const rojoDe = (raiz: string, id: string) => git(raiz, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `tests/orden/${id}/HOJA.md`);
