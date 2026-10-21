// CRM-04 (sesión A, 2026-10-20) · copia editable del doble de CRM-03 (`../../crm-03/_firebase/firestore.ts`, congelado) con dos cosas
// más: `__CRM03.demora` (ruta → ms, o "nunca") demora las lecturas sueltas de ese documento (getDoc, getDocFromServer: la primera
// carga de R4) y `__CRM03.fallar` (expresiones regulares sobre la ruta) hace fallar las escrituras de esos documentos (G2).
// Lo que sigue es lo de CRM-03 · doble de `firebase/firestore` para el CRM montado en el navegador por `_crm.ts` (alias de Vite).
// Un Firestore en memoria: el test lo siembra con `window.__CRM03.datos` (ruta del documento → campos) antes de cargar la página,
// y lee lo escrito en `window.__CRM03.escrituras`. Como Firestore, rechaza un `undefined` en lo que se escribe (CRM-02: «descontar
// sin motivo» fallaba por eso). Sólo la superficie que usa src/: collection, doc, query, where, orderBy, limit, getDoc,
// getDocFromServer, getDocs, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, Timestamp, getFirestore.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Campos = Record<string, any>;
type Escritura = { op: string; ruta: string; datos?: Campos; merge?: boolean; tx?: boolean };
type Estado = { datos: Record<string, Campos>; escrituras: Escritura[]; oyentes: Set<() => void>; secuencia: number; demora?: Record<string, number | "nunca">; fallar?: string[] };

/** CRM-04: la demora de una lectura suelta de `ruta` (R4). «nunca»: la lectura no responde. */
async function demorar(ruta: string): Promise<void> {
  const d = estado().demora?.[ruta];
  if (d === undefined) return;
  (estado() as any).inicioLectura ??= performance.now(); // R4: desde cuándo se espera la primera lectura
  if (d === "nunca") await new Promise<never>(() => {});
  await new Promise((ok) => setTimeout(ok, d as number));
}
/** CRM-04: una escritura en una ruta de `fallar` se rechaza como lo haría una regla (G2). */
function rechazar(op: string, ruta: string): void {
  if ((estado().fallar ?? []).some((re) => new RegExp(re).test(ruta))) throw Object.assign(new Error(`Missing or insufficient permissions. (${op} ${ruta})`), { code: "permission-denied" });
}

function estado(): Estado {
  const w = globalThis as any;
  w.__CRM03 ??= {};
  w.__CRM03.datos ??= {};
  w.__CRM03.escrituras ??= [];
  w.__CRM03.oyentes ??= new Set();
  w.__CRM03.secuencia ??= 0;
  return w.__CRM03 as Estado;
}

export class Timestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  static now(): Timestamp { return Timestamp.fromMillis(Date.now()); }
  static fromDate(d: Date): Timestamp { return Timestamp.fromMillis(d.getTime()); }
  static fromMillis(ms: number): Timestamp { return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
  toDate(): Date { return new Date(this.toMillis()); }
  toMillis(): number { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
  isEqual(o: Timestamp): boolean { return o.toMillis() === this.toMillis(); }
  valueOf(): string { return String(this.toMillis()).padStart(16, "0"); }
}

const SERVIDOR = { __serverTimestamp: true };
export function serverTimestamp(): any { return SERVIDOR; }

/** Los campos con forma `{ __ts: <ms> }` del siembra pasan a Timestamp (JSON no lleva clases). */
function revivir(v: any): any {
  if (Array.isArray(v)) return v.map(revivir);
  if (v && typeof v === "object") {
    if (typeof v.__ts === "number" && Object.keys(v).length === 1) return Timestamp.fromMillis(v.__ts);
    if (v instanceof Timestamp) return v;
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revivir(x)]));
  }
  return v;
}
function preparar(op: string, datos: Campos, camino = ""): Campos {
  const out: Campos = {};
  for (const [k, v] of Object.entries(datos)) {
    if (v === undefined) throw new Error(`Function ${op}() called with invalid data. Unsupported field value: undefined (found in field ${camino}${k})`);
    if (v === SERVIDOR) out[k] = Timestamp.now();
    else if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Timestamp) && !(v instanceof Date)) out[k] = preparar(op, v, `${camino}${k}.`);
    else if (Array.isArray(v)) {
      v.forEach((x, i) => { if (x === undefined) throw new Error(`Function ${op}() called with invalid data. Unsupported field value: undefined (found in field ${camino}${k}.${i})`); });
      out[k] = v;
    } else out[k] = v;
  }
  return out;
}
function fundir(base: Campos, extra: Campos): Campos {
  const out: Campos = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Timestamp) && !(v instanceof Date) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) out[k] = fundir(out[k], v);
    else out[k] = v;
  }
  return out;
}
function avisar() { for (const f of [...estado().oyentes]) queueMicrotask(f); }
let enTx = 0;
function registrar(e: Escritura) { if (enTx > 0) e.tx = true; estado().escrituras.push(JSON.parse(JSON.stringify(e, (_k, v) => (v instanceof Timestamp ? { __ts: v.toMillis() } : v)))); }

type Ref = { type: "document"; path: string; id: string; parent: { path: string; id: string } };
type Col = { type: "collection"; path: string; id: string };
type Restriccion = { tipo: "where"; campo: string; op: string; valor: any } | { tipo: "orderBy"; campo: string; dir: string } | { tipo: "limit"; n: number };
type Consulta = { type: "query"; path: string; restricciones: Restriccion[] };

const unir = (partes: string[]) => partes.filter(Boolean).join("/");
export function getFirestore(..._a: any[]): any {
  return { toJSON: () => ({ databaseId: { projectId: "crm03-prueba", database: "default" } }), type: "firestore" };
}
export function collection(base: any, ...partes: string[]): Col {
  const path = unir([base?.type === "document" ? base.path : base?.type === "collection" ? base.path : "", ...partes]);
  return { type: "collection", path, id: path.split("/").pop()! };
}
let autoId = 0;
export function doc(base: any, ...partes: string[]): Ref {
  let path: string;
  if (base?.type === "collection") path = unir([base.path, ...(partes.length ? partes : [`auto-${++autoId}`])]);
  else path = unir([base?.type === "document" ? base.path : "", ...partes]);
  const seg = path.split("/");
  return { type: "document", path, id: seg[seg.length - 1], parent: { path: seg.slice(0, -1).join("/"), id: seg[seg.length - 2] } };
}
export function where(campo: string, op: string, valor: any): Restriccion { return { tipo: "where", campo, op, valor }; }
export function orderBy(campo: string, dir = "asc"): Restriccion { return { tipo: "orderBy", campo, dir }; }
export function limit(n: number): Restriccion { return { tipo: "limit", n }; }
export function query(base: Col | Consulta, ...rs: Restriccion[]): Consulta {
  const previas = base.type === "query" ? base.restricciones : [];
  return { type: "query", path: base.path, restricciones: [...previas, ...rs] };
}

const valorDe = (d: Campos, campo: string) => campo.split(".").reduce((o: any, k) => (o == null ? undefined : o[k]), d);
const comparable = (v: any) => (v instanceof Timestamp ? v.toMillis() : v instanceof Date ? v.getTime() : v);
function cumple(d: Campos, r: Restriccion): boolean {
  if (r.tipo !== "where") return true;
  const a = comparable(valorDe(d, r.campo)), b = comparable(r.valor);
  switch (r.op) {
    case "==": return a === b;
    case "!=": return a !== b && a !== undefined;
    case "<": return a < b; case "<=": return a <= b; case ">": return a > b; case ">=": return a >= b;
    case "in": return Array.isArray(b) && b.includes(a);
    case "not-in": return Array.isArray(b) && !b.includes(a);
    case "array-contains": return Array.isArray(a) && a.includes(b);
    case "array-contains-any": return Array.isArray(a) && Array.isArray(b) && b.some((x) => a.includes(x));
    default: return false;
  }
}
function instantaneaDoc(path: string) {
  const d = estado().datos[path];
  const id = path.split("/").pop()!;
  return { id, ref: doc({ type: "firestore" }, path), exists: () => d !== undefined, data: () => (d === undefined ? undefined : revivir(d)), get: (c: string) => (d === undefined ? undefined : valorDe(revivir(d), c)) };
}
function ejecutar(q: Col | Consulta) {
  const pref = q.path + "/";
  const nivel = q.path.split("/").length + 1;
  let filas = Object.keys(estado().datos).filter((p) => p.startsWith(pref) && p.split("/").length === nivel).map(instantaneaDoc);
  const rs = q.type === "query" ? q.restricciones : [];
  for (const r of rs) if (r.tipo === "where") filas = filas.filter((s) => cumple(s.data()!, r));
  for (const r of rs) if (r.tipo === "orderBy") filas.sort((x, y) => { const a = comparable(valorDe(x.data()!, r.campo)), b = comparable(valorDe(y.data()!, r.campo)); return (a > b ? 1 : a < b ? -1 : 0) * (r.dir === "desc" ? -1 : 1); });
  const lim = rs.find((r) => r.tipo === "limit") as { n: number } | undefined;
  if (lim) filas = filas.slice(0, lim.n);
  return { docs: filas, empty: filas.length === 0, size: filas.length, forEach: (f: (s: any) => void) => filas.forEach(f), docChanges: () => filas.map((d) => ({ type: "added", doc: d })) };
}

export async function getDoc(ref: Ref) { await demorar(ref.path); return instantaneaDoc(ref.path); }
export async function getDocFromServer(ref: Ref) { await demorar(ref.path); return instantaneaDoc(ref.path); }
export async function getDocs(q: Col | Consulta) { return ejecutar(q); }
export function onSnapshot(objetivo: any, ...args: any[]): () => void {
  const opciones = typeof args[0] === "object" && args[0] !== null && typeof args[0] !== "function" && !("next" in args[0]) ? args.shift() : undefined;
  void opciones;
  const obs = typeof args[0] === "object" && args[0] !== null ? args[0] : { next: args[0], error: args[1] };
  const emitir = () => { try { obs.next?.(objetivo.type === "document" ? instantaneaDoc(objetivo.path) : ejecutar(objetivo)); } catch (e) { obs.error?.(e); } };
  const s = estado();
  s.oyentes.add(emitir);
  queueMicrotask(emitir);
  return () => { s.oyentes.delete(emitir); };
}
export async function setDoc(ref: Ref, datos: Campos, opciones?: { merge?: boolean }) {
  rechazar("setDoc", ref.path);
  const limpio = preparar("setDoc", datos);
  const s = estado();
  s.datos[ref.path] = opciones?.merge && s.datos[ref.path] ? fundir(revivir(s.datos[ref.path]), limpio) : limpio;
  registrar({ op: "set", ruta: ref.path, datos: limpio, merge: !!opciones?.merge });
  avisar();
}
export async function addDoc(col: Col, datos: Campos) {
  const ref = doc(col);
  rechazar("addDoc", ref.path);
  const limpio = preparar("addDoc", datos);
  estado().datos[ref.path] = limpio;
  registrar({ op: "add", ruta: ref.path, datos: limpio });
  avisar();
  return ref;
}
function conPuntos(base: Campos, datos: Campos): Campos {
  const out = JSON.parse(JSON.stringify(base ?? {}, (_k, v) => (v instanceof Timestamp ? { __ts: v.toMillis() } : v)));
  for (const [k, v] of Object.entries(datos)) {
    const partes = k.split(".");
    let o = out;
    for (const p of partes.slice(0, -1)) o = o[p] ??= {};
    o[partes[partes.length - 1]] = v;
  }
  return revivir(out);
}
export async function updateDoc(ref: Ref, datos: Campos) {
  rechazar("updateDoc", ref.path);
  const s = estado();
  if (!s.datos[ref.path]) throw new Error(`No document to update: ${ref.path}`);
  const limpio = preparar("updateDoc", datos);
  s.datos[ref.path] = conPuntos(revivir(s.datos[ref.path]), limpio);
  registrar({ op: "update", ruta: ref.path, datos: limpio });
  avisar();
}
export async function deleteDoc(ref: Ref) {
  rechazar("deleteDoc", ref.path);
  delete estado().datos[ref.path];
  registrar({ op: "delete", ruta: ref.path });
  avisar();
}
export async function runTransaction(_db: any, fn: (tx: any) => Promise<any>) {
  const pendientes: (() => Promise<void>)[] = [];
  const tx = {
    get: async (ref: Ref) => instantaneaDoc(ref.path),
    set(ref: Ref, d: Campos, o?: { merge?: boolean }) { preparar("Transaction.set", d); pendientes.push(() => setDoc(ref, d, o)); return tx; },
    update(ref: Ref, d: Campos) { preparar("Transaction.update", d); pendientes.push(() => updateDoc(ref, d)); return tx; },
    delete(ref: Ref) { pendientes.push(() => deleteDoc(ref)); return tx; },
  };
  const r = await fn(tx);
  enTx++;
  try { for (const p of pendientes) await p(); } finally { enTx--; }
  return r;
}
export function increment(n: number): any { return n; }
export function arrayUnion(...x: any[]): any { return x; }
export function arrayRemove(..._x: any[]): any { return []; }
export function deleteField(): any { return null; }
export function writeBatch(_db: any) {
  const ops: (() => Promise<void>)[] = [];
  const b = {
    set(ref: Ref, d: Campos, o?: { merge?: boolean }) { ops.push(() => setDoc(ref, d, o)); return b; },
    update(ref: Ref, d: Campos) { ops.push(() => updateDoc(ref, d)); return b; },
    delete(ref: Ref) { ops.push(() => deleteDoc(ref)); return b; },
    async commit() { for (const o of ops) await o(); },
  };
  return b;
}
export type Firestore = any;
export type DocumentData = Campos;
