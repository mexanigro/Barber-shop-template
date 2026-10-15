// Utilidades de la orden CRM-03 (sesión A, 2026-10-15). Igual byte a byte en T y en H (`cmp`). Se llama `_comun.ts` y no `_util.ts`
// (regla heredada de CONEXION-05 y VERDAD-09: la copia promovida `tests/verdad-08-a.test.ts` recorre los `tests/orden/*/_util.ts`).
// COPIADO (no importado: esas carpetas quedan congeladas al aprobarse su orden) y RECORTADO de `../marca-01/_comun.ts`: la lectura de
// CLAUDE.md, el cargador de .ts/.tsx de H, `envDe`, la fusión de Firestore (`fusionar`) y `dbFalsa` (la forma `DbMinima` de D-255).
// Lo propio: las constantes de esta orden (la demo de prueba, MARCA-01, el registro de W1) y `vercel`/`dbReal` para W1 y W2 («, webs»).
// Caja negra: nada importa src/*, api/*, tools/* ni scripts/* de forma estática; cada test importa lo suyo con `import()` dinámico.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, SOY } from "../verdad-02/_util.ts";

export { ROOT, borrar, correr, git } from "../verdad-02/_util.ts";

/** Esta orden. */
export const ORDEN = "crm-03";
/** MARCA-01: aprobada por Liam (2026-10-08, D-299) y su último rojo en cada repo (T dd289e7, el corregido; H 70cd7c1). */
export const MARCA_01 = { aprobado: { T: "96bceb2", H: "17fd18b" }, rojo: { T: "dd289e7", H: "70cd7c1" } };
/** Rutas fijas de los dos repos y del registro (fuera de git). */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub", NICHOS: "C:/Users/liama/Desktop/Nichos" };
/** Repo propio: el `name` de package.json (`nichos-hub` / `react-example`), que sobrevive al clon neutro de rojo-verde; si no, la ruta. */
function repoPropio(): "T" | "H" {
  try {
    const nombre = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).name;
    if (nombre === "nichos-hub") return "H";
    if (nombre === "react-example") return "T";
  } catch { /* sin package.json */ }
  return SOY;
}
export const REPO = repoPropio();
/** La demo de prueba (VIDEOS-01, CRM-02): su clientId y su proyecto de Vercel (`videos/ESTUDIO-CRM.md`). Sus datos `seed: "videos-01"`
 *  no se tocan; lo que escriben W1 y W2 lleva `seed: "crm-03"` y se deshace (D-310). */
export const DEMO = { clientId: "demo-demo-plantilla-a-f87b89e8", proyecto: "prj_5NZhSANod9vANczJ1codvYFpAarz", url: "https://demo-demo-plantilla-a-f87b89e8.arzac.studio" };
/** El email de prueba de Liam (D-310). */
export const EMAIL_PRUEBA = "liam.arzac+crm03@gmail.com";
export const SEMILLA = "crm-03";

export const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
export const existe = (rel: string) => existsSync(resolve(ROOT, rel));
export type Cfg = Record<string, any>;
export const porJson = <T>(c: T): T => JSON.parse(JSON.stringify(c));

// ─── CLAUDE.md ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Sección «## <titulo>» de un texto markdown (hasta el siguiente «## »). */
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
/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
export function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}

// ─── El cargador de .ts/.tsx (copiado de ../marca-01/_comun.ts; lo usa H) ─────────────────────────────────────────────────────────
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

// ─── Firestore en memoria (la forma `DbMinima` de D-255; de ../marca-01/_comun.ts) ──────────────────────────────────────────────
const esMapa = (v: unknown): v is Cfg => !!v && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
function clonar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(clonar);
  if (v && typeof v === "object") {
    if (!esMapa(v)) return Object.getPrototypeOf(v)?.constructor?.name === "Timestamp" || "methodName" in (v as Cfg) ? `centinela:${String((v as Cfg).methodName ?? "")}` : structuredClone(v);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clonar(x)]));
  }
  return v;
}
/** `set(data, { merge: true })` de Firestore sobre `doc`: los mapas se funden, los arrays se REEMPLAZAN enteros; `esBorrar` reconoce
 *  `FieldValue.delete()`. */
export function fusionar(doc: Cfg, data: Cfg, esBorrar: (v: unknown) => boolean): Cfg {
  const out = structuredClone(doc);
  for (const [k, v] of Object.entries(data)) {
    if (esBorrar(v)) delete out[k];
    else if (esMapa(v) && Object.keys(v).length) out[k] = fusionar(esMapa(out[k]) ? out[k] : {}, v, esBorrar);
    else out[k] = clonar(v);
  }
  return out;
}
type Escritura = { coleccion: string; id: string; data: Cfg; opts?: Cfg };
/** Firestore en memoria con la forma de `DbMinima` (H `src/lib/guardar-config.ts`): `get`, `set` con `merge` y `where(...).limit().get()`. */
export async function dbFalsa(inicial: Record<string, Cfg>) {
  const ESPEC = "firebase-admin/firestore";
  const { FieldValue } = (await import(ESPEC)) as { FieldValue: { delete: () => unknown } };
  const borrarCampo = FieldValue.delete() as { isEqual: (o: unknown) => boolean };
  const esBorrar = (v: unknown) => !!v && typeof v === "object" && typeof (v as Cfg).isEqual === "function" && borrarCampo.isEqual(v);
  const docs = new Map<string, Cfg>(Object.entries(porJson(inicial)));
  const escrituras: Escritura[] = [];
  const snap = (coleccion: string, id: string) => {
    const d = docs.get(`${coleccion}/${id}`);
    return { exists: d !== undefined, id, data: () => (d === undefined ? undefined : structuredClone(d)) };
  };
  const coleccion = (nombre: string) => ({
    doc(id: string) {
      return {
        id,
        async get() { return snap(nombre, id); },
        async set(data: Cfg, opts?: Cfg) {
          escrituras.push({ coleccion: nombre, id, data: clonar(data) as Cfg, opts });
          const previo = docs.get(`${nombre}/${id}`) ?? {};
          docs.set(`${nombre}/${id}`, opts?.merge ? fusionar(previo, data, esBorrar) : (clonar(data) as Cfg));
        },
        collection(_sub: string) { return { async add(_data: Cfg) { return { id: "auto" }; } }; },
      };
    },
    where(campo: string, _op: string, valor: unknown) {
      return {
        limit(n: number) {
          return {
            async get() {
              const hits = [...docs.entries()].filter(([k, d]) => k.startsWith(`${nombre}/`) && k.split("/").length === 2 && d?.[campo] === valor).slice(0, n);
              const ds = hits.map(([k, d]) => ({ id: k.split("/")[1], data: () => structuredClone(d) }));
              return { empty: ds.length === 0, size: ds.length, docs: ds };
            },
          };
        },
      };
    },
  });
  return { db: { collection: coleccion }, docs, escrituras, doc: (c: string, id: string) => docs.get(`${c}/${id}`) };
}

// ─── Lo remoto (W1, W2, «, webs») ──────────────────────────────────────────────────────────────────────────────────────────────
/** Las variables de `.env.local` de H (sin imprimirlas), por su ruta fija. */
export function envDeH(): Record<string, string> {
  const abs = join(RUTA.H, ".env.local");
  if (!existsSync(abs)) throw new Error(`falta ${abs}: sin él no se puede leer Firestore, Resend ni la API de Vercel`);
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
/** GET a la API de Vercel (SÓLO lectura), con el team del `.env.local` de H. */
export async function vercel(ruta: string): Promise<{ status: number; json: Cfg }> {
  const env = envDeH();
  if (!env.VERCEL_TOKEN) throw new Error("falta VERCEL_TOKEN en el .env.local de H");
  const url = new URL(ruta, "https://api.vercel.com");
  if (env.VERCEL_TEAM_ID) url.searchParams.set("teamId", env.VERCEL_TEAM_ID);
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` }, signal: AbortSignal.timeout(20000) });
  const texto = await r.text();
  let json: Cfg = {};
  try { json = JSON.parse(texto) as Cfg; } catch { json = { _texto: texto.slice(0, 400) }; }
  return { status: r.status, json };
}
/** El Firestore real por el Admin SDK, con las credenciales del `.env.local` de H (W1 y W2 escriben con `seed: "crm-03"` y deshacen). */
export async function firestoreReal(): Promise<any> {
  const env = envDeH();
  const require = (await import("node:module")).createRequire(join(RUTA.H, "package.json"));
  const { initializeApp, cert, getApps } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  const key = String(env.FIREBASE_PRIVATE_KEY ?? "").trim().replace(/^["'`]|["'`]$/g, "").replace(/\\n/g, "\n");
  const app = getApps().find((a: any) => a.name === "crm03") ?? initializeApp({ credential: cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: key }) }, "crm03");
  return env.FIREBASE_DATABASE_ID ? getFirestore(app, env.FIREBASE_DATABASE_ID) : getFirestore(app);
}
