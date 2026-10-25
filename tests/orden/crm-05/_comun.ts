// Utilidades de la orden CRM-05 (sesión A, 2026-10-25). Igual byte a byte en T y en H (`cmp`). Se llama `_comun.ts` y no `_util.ts`
// (regla heredada de CONEXION-05 y VERDAD-09). COPIADO (no importado: esas carpetas quedan congeladas al aprobarse su orden) de
// `../crm-04/_comun.ts`: la lectura de CLAUDE.md, el cargador de .ts/.tsx de H, `dbMemoria` (un Firestore de Admin en memoria con
// transacciones OPTIMISTAS, como Firestore: si un documento leído en la transacción cambió antes del commit, la transacción se vuelve a
// correr) y lo remoto. Lo propio de CRM-05: `tokenDeGoogle` (W2: la lista de índices por la API de administración de Firestore, sólo
// lectura) y `firestoreRest` (W1: REST SIN credenciales). Caja negra: nada importa src/*, api/*, tools/* ni scripts/* de forma estática.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY } from "../verdad-02/_util.ts";

export { ROOT, borrar, correr, git } from "../verdad-02/_util.ts";

/** Esta orden. */
export const ORDEN = "crm-05";
/** Rutas fijas de los dos repos y del registro (fuera de git). */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub", NICHOS: "C:/Users/liama/Desktop/Nichos" };
function repoPropio(): "T" | "H" {
  try {
    const nombre = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).name;
    if (nombre === "nichos-hub") return "H";
    if (nombre === "react-example") return "T";
  } catch { /* sin package.json */ }
  return SOY;
}
export const REPO = repoPropio();
/** La demo de prueba (VIDEOS-01, CRM-02, CRM-03): su clientId. Sus datos no se tocan. */
export const DEMO = { clientId: "demo-demo-plantilla-a-f87b89e8" };
/** El proyecto de Firestore de las webs y sus dos bases (memoria `project_firestore_admin_instrumentos`: la base se llama `default`). */
export const FIRESTORE = { proyecto: "barbertemplate-madre", bases: ["default", "nichos-us-prod"] as const };
/** Las cuatro versiones del CRM que corren las webs de Ashkelon (D-362, § Notas de la hoja). La demo (47b53a6) queda fuera de S10. */
export const ASHKELON = ["b3a97e9", "ae3c7ec", "a99b725", "43177c8"] as const;

export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
export const existe = (rel: string) => existsSync(resolve(ROOT, rel));
export type Cfg = Record<string, any>;
export const porJson = <T>(c: T): T => JSON.parse(JSON.stringify(c));

// ─── CLAUDE.md ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function seccionDeTexto(texto: string, titulo: string): string | undefined {
  const i = texto.search(new RegExp(`^## ${titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m"));
  if (i < 0) return undefined;
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}
/** El párrafo «**<ID> (AAAA-MM-DD):** …» de § Puertas automáticas de un CLAUDE.md, o undefined. */
export function parrafoDe(texto: string, id: string): string | undefined {
  const puertas = seccionDeTexto(texto, "Puertas automáticas (HIGIENE-01, 2026-09-18)") ?? "";
  return puertas.split(/\r?\n/).find((l) => new RegExp(`^\\*\\*${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(\\d{4}-\\d{2}-\\d{2}\\):\\*\\*`).test(l));
}

// ─── El cargador de .ts/.tsx (copiado de ../crm-04/_comun.ts; lo usa H) ─────────────────────────────────────────────────────────
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
/** El módulo de `rel` (relativo al repo propio), con el cargador de .ts/.tsx; undefined si el archivo no existe. */
export async function importarModulo(rel: string): Promise<Record<string, any> | undefined> {
  if (!existe(rel)) return undefined;
  if (!registrado) { register("data:text/javascript," + encodeURIComponent(fuenteCargadorTsx(ROOT)), { parentURL: pathToFileURL(ROOT + "/").href }); registrado = true; }
  return (await import(pathToFileURL(resolve(ROOT, rel)).href)) as Record<string, any>;
}

// ─── Firestore de Admin en memoria (copiado de ../crm-04/_comun.ts) ─────────────────────────────────────────────────────────────
const esMapa = (v: unknown): v is Cfg => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
/** `FieldValue.delete()` y `serverTimestamp()` de firebase-admin (si está instalado en el repo que corre), reconocidos sin importarlo. */
const esBorrar = (v: any) => !!v && typeof v === "object" && (v.methodName === "FieldValue.delete" || v.constructor?.name === "DeleteTransform" || (typeof v.isEqual === "function" && String(v.constructor?.name ?? "").includes("Delete")));
const esCentinela = (v: any) => !!v && typeof v === "object" && !esMapa(v) && !Array.isArray(v) && !(v instanceof Date) && (typeof v.methodName === "string" || /Transform|FieldValue|Sentinel/.test(String(v.constructor?.name ?? "")));
function valor(v: any): any {
  if (esCentinela(v)) return /server|timestamp/i.test(String(v.methodName ?? v.constructor?.name ?? "")) ? new Date(0) : `centinela:${String(v.methodName ?? v.constructor?.name)}`;
  if (Array.isArray(v)) return v.map(valor);
  if (v instanceof Date) return new Date(v.getTime());
  if (esMapa(v)) return Object.fromEntries(Object.entries(v).filter(([, x]) => !esBorrar(x)).map(([k, x]) => [k, valor(x)]));
  return v;
}
/** `set(data, { merge: true })`: los mapas se funden, los arrays se REEMPLAZAN enteros; `FieldValue.delete()` borra la clave. */
export function fusionar(doc: Cfg, data: Cfg): Cfg {
  const out: Cfg = { ...doc };
  for (const [k, v] of Object.entries(data)) {
    if (esBorrar(v)) delete out[k];
    else if (esMapa(v) && Object.keys(v).length) out[k] = fusionar(esMapa(out[k]) ? out[k] : {}, v);
    else out[k] = valor(v);
  }
  return out;
}
function conPuntos(doc: Cfg, data: Cfg): Cfg {
  const out: Cfg = structuredClone(doc);
  for (const [k, v] of Object.entries(data)) {
    const partes = k.split(".");
    let o = out;
    for (const p of partes.slice(0, -1)) o = esMapa(o[p]) ? o[p] : (o[p] = {});
    if (esBorrar(v)) delete o[partes[partes.length - 1]]; else o[partes[partes.length - 1]] = valor(v);
  }
  return out;
}
export type Escrita = { op: "set" | "update" | "create" | "delete" | "add"; ruta: string; datos?: Cfg; merge?: boolean; tx: boolean };
/** Un Firestore de Admin en memoria. `alLeer(ruta, n)` corre después de la n-ésima lectura (suelta o de transacción) de `ruta`. */
export function dbMemoria(inicial: Record<string, Cfg>, o: { alLeer?: (ruta: string, n: number, db: any) => void | Promise<void> } = {}) {
  const docs = new Map<string, Cfg>(Object.entries(structuredClone(inicial)));
  const version = new Map<string, number>();
  const lecturas = new Map<string, number>();
  const escritas: Escrita[] = [];
  let auto = 0, intentosTx = 0;
  const escribir = (e: Escrita) => {
    escritas.push(e);
    version.set(e.ruta, (version.get(e.ruta) ?? 0) + 1);
    if (e.op === "delete") docs.delete(e.ruta);
    else if (e.op === "update") docs.set(e.ruta, conPuntos(docs.get(e.ruta)!, e.datos!));
    else if (e.op === "set" && e.merge) docs.set(e.ruta, fusionar(docs.get(e.ruta) ?? {}, e.datos!));
    else docs.set(e.ruta, valor(e.datos!));
  };
  const snap = (ruta: string) => { const d = docs.get(ruta); return { exists: d !== undefined, id: ruta.split("/").pop()!, ref: ref(ruta), data: () => (d === undefined ? undefined : structuredClone(d)), get: (c: string) => c.split(".").reduce((x: any, k) => x?.[k], d) }; };
  const leido = async (ruta: string) => { const n = (lecturas.get(ruta) ?? 0) + 1; lecturas.set(ruta, n); await new Promise((r) => setImmediate(r)); await o.alLeer?.(ruta, n, db); };
  const ref = (ruta: string): any => ({
    id: ruta.split("/").pop(), path: ruta,
    async get() { const s = snap(ruta); await leido(ruta); return s; },
    async set(d: Cfg, op?: Cfg) { await new Promise((r) => setImmediate(r)); escribir({ op: "set", ruta, datos: d, merge: !!op?.merge, tx: false }); },
    async update(d: Cfg) { await new Promise((r) => setImmediate(r)); if (!docs.has(ruta)) throw Object.assign(new Error(`5 NOT_FOUND: ${ruta}`), { code: 5 }); escribir({ op: "update", ruta, datos: d, tx: false }); },
    async create(d: Cfg) { await new Promise((r) => setImmediate(r)); if (docs.has(ruta)) throw Object.assign(new Error(`6 ALREADY_EXISTS: ${ruta}`), { code: 6 }); escribir({ op: "create", ruta, datos: d, tx: false }); },
    async delete() { escribir({ op: "delete", ruta, tx: false }); },
    collection: (sub: string) => coleccion(`${ruta}/${sub}`),
  });
  const consulta = (nombre: string, filtros: [string, string, any][], lim: number): any => ({
    where: (c: string, op: string, v: any) => consulta(nombre, [...filtros, [c, op, v]], lim),
    orderBy: () => consulta(nombre, filtros, lim),
    limit: (n: number) => consulta(nombre, filtros, n),
    async get() {
      const nivel = nombre.split("/").length + 1;
      const cumple = (d: Cfg, [c, op, v]: [string, string, any]) => {
        const x = c.split(".").reduce((y: any, k) => y?.[k], d);
        switch (op) { case "==": return x === v; case "!=": return x !== v && x !== undefined; case "in": return Array.isArray(v) && v.includes(x); case "array-contains": return Array.isArray(x) && x.includes(v); case "<": return x < v; case "<=": return x <= v; case ">": return x > v; case ">=": return x >= v; default: return false; }
      };
      const filas = [...docs.keys()].filter((k) => k.startsWith(`${nombre}/`) && k.split("/").length === nivel && filtros.every((f) => cumple(docs.get(k)!, f))).slice(0, lim).map(snap);
      await new Promise((r) => setImmediate(r));
      return { empty: filas.length === 0, size: filas.length, docs: filas, forEach: (f: (s: any) => void) => filas.forEach(f) };
    },
  });
  const coleccion = (nombre: string): any => ({
    ...consulta(nombre, [], 1e9),
    doc: (id?: string) => ref(`${nombre}/${id ?? `auto${++auto}`}`),
    async add(d: Cfg) { const r = ref(`${nombre}/auto${++auto}`); escribir({ op: "add", ruta: r.path, datos: d, tx: false }); return r; },
  });
  const db: any = {
    collection: coleccion,
    doc: (ruta: string) => ref(ruta),
    async runTransaction(fn: (tx: any) => Promise<any>) {
      for (let intento = 0; intento < 5; intento++) {
        intentosTx++;
        const vistos = new Map<string, number>();
        const pendientes: Escrita[] = [];
        const tx: any = {
          async get(r: any) { if (r?.where && !r.path) return r.get(); vistos.set(r.path, version.get(r.path) ?? 0); const s = snap(r.path); await leido(r.path); return s; },
          set(r: any, d: Cfg, op?: Cfg) { pendientes.push({ op: "set", ruta: r.path, datos: d, merge: !!op?.merge, tx: true }); return tx; },
          update(r: any, d: Cfg) { pendientes.push({ op: "update", ruta: r.path, datos: d, tx: true }); return tx; },
          create(r: any, d: Cfg) { pendientes.push({ op: "create", ruta: r.path, datos: d, tx: true }); return tx; },
          delete(r: any) { pendientes.push({ op: "delete", ruta: r.path, tx: true }); return tx; },
        };
        const out = await fn(tx);
        await new Promise((r) => setImmediate(r));
        if ([...vistos].some(([ruta, v]) => (version.get(ruta) ?? 0) !== v)) continue; // otro escribió: Firestore reintenta
        for (const p of pendientes) {
          if (p.op === "create" && docs.has(p.ruta)) throw Object.assign(new Error(`6 ALREADY_EXISTS: ${p.ruta}`), { code: 6 });
          if (p.op === "update" && !docs.has(p.ruta)) throw Object.assign(new Error(`5 NOT_FOUND: ${p.ruta}`), { code: 5 });
        }
        for (const p of pendientes) escribir(p);
        return out;
      }
      throw new Error("10 ABORTED: demasiados reintentos de la transacción");
    },
  };
  return { db, docs, escritas, doc: (ruta: string) => docs.get(ruta), intentos: () => intentosTx };
}

// ─── Lo remoto (W1, W2, «, webs») ──────────────────────────────────────────────────────────────────────────────────────────────
/** Las variables de `.env.local` de H (sin imprimirlas), por su ruta fija. */
export function envDeH(): Record<string, string> {
  const abs = join(RUTA.H, ".env.local");
  if (!existsSync(abs)) throw new Error(`falta ${abs}: sin él no se puede leer la lista de índices de Firestore`);
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
/** Un token de acceso de Google de la cuenta de servicio del `.env.local` de H (W2: SÓLO para leer la lista de índices). */
export async function tokenDeGoogle(): Promise<string> {
  const env = envDeH();
  const require = (await import("node:module")).createRequire(join(RUTA.H, "package.json"));
  const { cert } = require("firebase-admin/app");
  const key = String(env.FIREBASE_PRIVATE_KEY ?? "").trim().replace(/^["'`]|["'`]$/g, "").replace(/\\n/g, "\n");
  const { access_token } = await cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: key }).getAccessToken();
  if (!access_token) throw new Error("la cuenta de servicio de H no dio un token de acceso");
  return access_token;
}
/** Una petición a la API REST de Firestore (`https://firestore.googleapis.com/v1/projects/<proyecto>/databases/<base>/<ruta>`); sin
 *  `token`, SIN credenciales (W1). Devuelve el status y el cuerpo (JSON o, si no lo es, el texto). */
export async function firestoreRest(base: string, ruta: string, o: { metodo?: "GET" | "POST"; cuerpo?: unknown; token?: string } = {}): Promise<{ status: number; json: any }> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE.proyecto}/databases/${base}/${ruta}`;
  const r = await fetch(url, {
    method: o.metodo ?? "GET",
    headers: { ...(o.cuerpo === undefined ? {} : { "Content-Type": "application/json" }), ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) },
    ...(o.cuerpo === undefined ? {} : { body: JSON.stringify(o.cuerpo) }),
    signal: AbortSignal.timeout(20000),
  });
  const texto = await r.text();
  let json: any;
  try { json = JSON.parse(texto); } catch { json = { _texto: texto.slice(0, 400) }; }
  return { status: r.status, json };
}
