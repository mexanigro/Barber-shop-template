// CRM-05 (sesión A, 2026-10-25) · copia editable de `../crm-04/_reglas.ts` (CRM-04 queda congelada al aprobarse), sin cambios.
// CRM-04 (sesión A, 2026-10-20) · `firestore.rules` de T leídas y EVALUADAS sin emulador (Q1, G5; § Interfaz de la hoja).
// No hay emulador en esta máquina: en vez de buscar palabras en la fuente, se interpreta el lenguaje de reglas (el subconjunto que
// usa T y el habitual): `match` con comodines (`{x}`, `{x=**}`), `function` con `let` y `return`, `allow <ops>: if <expr>;`, y en las
// expresiones `&& || ! == != < <= > >= in is + - * / % ?:`, literales (texto, número, bool, null, listas, mapas), rutas
// `/databases/$(database)/documents/...` con `exists()` y `get()`, y los métodos de mapas, listas y textos (keys, values, size, hasAll,
// hasAny, hasOnly, get(k, d), diff(...).affectedKeys/addedKeys/removedKeys/changedKeys/unchangedKeys, toSet, matches, lower, upper,
// trim, split). Una pregunta es `permitido(op, ruta, { auth, datos, guardado, docs })`: `op` = create | update | delete | get | list;
// `datos` = request.resource.data (en update, lo guardado con los cambios); `guardado` = resource.data; `docs` = otros documentos
// (para exists/get). Lo que el intérprete no entiende LANZA con su nombre («reglas: no entiendo …»): el test lo registra como falla.
/* eslint-disable @typescript-eslint/no-explicit-any */

type Tok = { t: "id" | "num" | "str" | "op" | "ruta"; v: string };
type Fn = { params: string[]; lets: [string, Nodo][]; ret: Nodo };
type Nodo = any;
type Bloque = { patron: string[]; funciones: Map<string, Fn>; allows: { ops: string[]; cond: Nodo | null }[]; hijos: Bloque[] };

function tokens(src: string): Tok[] {
  const s = src.replace(/\/\/[^\n]*/g, "");
  const out: Tok[] = [];
  let i = 0;
  const OPS = ["&&", "||", "==", "!=", "<=", ">=", "=", "<", ">", "!", "+", "-", "*", "%", "?", ":", ";", ",", ".", "(", ")", "[", "]", "{", "}"];
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1, v = "";
      while (j < s.length && s[j] !== c) { if (s[j] === "\\") { v += s[j + 1] === "n" ? "\n" : s[j + 1]; j += 2; } else v += s[j++]; }
      out.push({ t: "str", v }); i = j + 1; continue;
    }
    if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; out.push({ t: "num", v: s.slice(i, j) }); i = j; continue; }
    if (/[A-Za-z_$]/.test(c)) { let j = i; while (j < s.length && /[A-Za-z0-9_$]/.test(s[j])) j++; out.push({ t: "id", v: s.slice(i, j) }); i = j; continue; }
    if (c === "/") {
      // Una ruta: `/seg/{var}/$(expr)/…` (en un `match` o como argumento de exists/get); `/` suelto es dividir.
      const prev = out[out.length - 1];
      const esRuta = !prev || (prev.t === "op" && ["(", ",", "=", "==", "!=", "&&", "||", "!", "?", ":"].includes(prev.v)) || (prev.t === "id" && prev.v === "match");
      if (esRuta) {
        let j = i, v = "";
        while (j < s.length && !/[\s,;]/.test(s[j]) && !(s[j] === ")" && !v.includes("$(")) && !(s[j] === "{" && s[j + 1] !== undefined && /\s/.test(s[j + 1]))) {
          if (s[j] === "$" && s[j + 1] === "(") { let d = 0, k = j + 1; do { if (s[k] === "(") d++; if (s[k] === ")") d--; k++; } while (d > 0 && k < s.length); v += s.slice(j, k); j = k; continue; }
          if (s[j] === ")") break;
          v += s[j++];
        }
        out.push({ t: "ruta", v }); i = j; continue;
      }
      out.push({ t: "op", v: "/" }); i++; continue;
    }
    const op = OPS.find((o) => s.startsWith(o, i));
    if (!op) throw new Error(`reglas: no entiendo «${s.slice(i, i + 20)}»`);
    out.push({ t: "op", v: op }); i += op.length;
  }
  return out;
}

class Lector {
  i = 0;
  ts: Tok[];
  constructor(ts: Tok[]) { this.ts = ts; }
  ver(k = 0) { return this.ts[this.i + k]; }
  es(v: string, k = 0) { const x = this.ver(k); return !!x && (x.t === "op" || x.t === "id") && x.v === v; }
  tomar(v?: string): Tok { const x = this.ts[this.i++]; if (!x) throw new Error("reglas: fin inesperado"); if (v !== undefined && x.v !== v) throw new Error(`reglas: esperaba «${v}» y hay «${x.v}»`); return x; }
}

// ─── Expresiones (precedencia: ?: < || < && < == != < < <= > >= in is < + - < * / % < ! - < miembro/llamada/índice) ─────────────
function expr(L: Lector): Nodo { return ternario(L); }
function ternario(L: Lector): Nodo { const c = o(L); if (L.es("?")) { L.tomar("?"); const a = expr(L); L.tomar(":"); const b = expr(L); return { k: "?:", c, a, b }; } return c; }
function o(L: Lector): Nodo { let a = y(L); while (L.es("||")) { L.tomar(); a = { k: "||", a, b: y(L) }; } return a; }
function y(L: Lector): Nodo { let a = igual(L); while (L.es("&&")) { L.tomar(); a = { k: "&&", a, b: igual(L) }; } return a; }
function igual(L: Lector): Nodo {
  let a = rel(L);
  while (L.es("==") || L.es("!=")) { const op = L.tomar().v; a = { k: op, a, b: rel(L) }; }
  return a;
}
function rel(L: Lector): Nodo {
  let a = suma(L);
  for (;;) {
    if (L.es("<") || L.es("<=") || L.es(">") || L.es(">=")) { const op = L.tomar().v; a = { k: op, a, b: suma(L) }; continue; }
    if (L.es("in")) { L.tomar(); a = { k: "in", a, b: suma(L) }; continue; }
    if (L.es("is")) { L.tomar(); a = { k: "is", a, tipo: L.tomar().v }; continue; }
    return a;
  }
}
function suma(L: Lector): Nodo { let a = prod(L); while (L.es("+") || L.es("-")) { const op = L.tomar().v; a = { k: op, a, b: prod(L) }; } return a; }
function prod(L: Lector): Nodo { let a = unario(L); while (L.es("*") || L.es("/") || L.es("%")) { const op = L.tomar().v; a = { k: op, a, b: unario(L) }; } return a; }
function unario(L: Lector): Nodo { if (L.es("!")) { L.tomar(); return { k: "!", a: unario(L) }; } if (L.es("-")) { L.tomar(); return { k: "neg", a: unario(L) }; } return postfijo(L); }
function postfijo(L: Lector): Nodo {
  let a = primario(L);
  for (;;) {
    if (L.es(".")) { L.tomar(); const n = L.tomar().v; if (L.es("(")) a = { k: "metodo", obj: a, n, args: argumentos(L) }; else a = { k: ".", obj: a, n }; continue; }
    if (L.es("[")) { L.tomar("["); const idx = expr(L); L.tomar("]"); a = { k: "idx", obj: a, idx }; continue; }
    return a;
  }
}
function argumentos(L: Lector): Nodo[] { L.tomar("("); const xs: Nodo[] = []; while (!L.es(")")) { xs.push(expr(L)); if (L.es(",")) L.tomar(","); } L.tomar(")"); return xs; }
function primario(L: Lector): Nodo {
  const x = L.tomar();
  if (x.t === "num") return { k: "lit", v: Number(x.v) };
  if (x.t === "str") return { k: "lit", v: x.v };
  if (x.t === "ruta") return { k: "ruta", partes: partesDeRuta(x.v) };
  if (x.t === "op" && x.v === "(") { const e = expr(L); L.tomar(")"); return e; }
  if (x.t === "op" && x.v === "[") { const xs: Nodo[] = []; while (!L.es("]")) { xs.push(expr(L)); if (L.es(",")) L.tomar(","); } L.tomar("]"); return { k: "lista", xs }; }
  if (x.t === "op" && x.v === "{") { const ps: [Nodo, Nodo][] = []; while (!L.es("}")) { const kk = L.tomar(); const key = { k: "lit", v: kk.v }; L.tomar(":"); ps.push([key, expr(L)]); if (L.es(",")) L.tomar(","); } L.tomar("}"); return { k: "mapa", ps }; }
  if (x.t === "id") {
    if (x.v === "true") return { k: "lit", v: true };
    if (x.v === "false") return { k: "lit", v: false };
    if (x.v === "null") return { k: "lit", v: null };
    if (L.es("(")) return { k: "llamada", n: x.v, args: argumentos(L) };
    return { k: "var", n: x.v };
  }
  throw new Error(`reglas: no entiendo «${x.v}» en una expresión`);
}
/** `/databases/$(database)/documents/clients/$(id)` → partes: texto o expresión. */
function partesDeRuta(v: string): Nodo[] {
  const out: Nodo[] = [];
  for (const seg of v.split("/").filter(Boolean)) {
    const m = seg.match(/^\$\((.*)\)$/s);
    out.push(m ? { k: "expr", e: expr(new Lector(tokens(m[1]))) } : { k: "texto", v: seg });
  }
  return out;
}

// ─── Estructura: service / match / function / allow ─────────────────────────────────────────────────────────────────────────
function bloque(L: Lector, patron: string[]): Bloque {
  const b: Bloque = { patron, funciones: new Map(), allows: [], hijos: [] };
  L.tomar("{");
  while (!L.es("}")) {
    const x = L.ver();
    if (x.v === "match") {
      L.tomar("match");
      const r = L.tomar();
      b.hijos.push(bloque(L, r.v.split("/").filter(Boolean)));
    } else if (x.v === "function") {
      L.tomar("function");
      const nombre = L.tomar().v;
      L.tomar("(");
      const params: string[] = [];
      while (!L.es(")")) { params.push(L.tomar().v); if (L.es(",")) L.tomar(","); }
      L.tomar(")"); L.tomar("{");
      const lets: [string, Nodo][] = [];
      while (L.es("let")) { L.tomar("let"); const n = L.tomar().v; L.tomar("="); lets.push([n, expr(L)]); L.tomar(";"); }
      L.tomar("return");
      const ret = expr(L);
      if (L.es(";")) L.tomar(";");
      L.tomar("}");
      b.funciones.set(nombre, { params, lets, ret });
    } else if (x.v === "allow") {
      L.tomar("allow");
      const ops: string[] = [];
      while (!L.es(":") && !L.es(";")) { const t = L.tomar(); if (t.v !== ",") ops.push(t.v); }
      let cond: Nodo | null = null;
      if (L.es(":")) { L.tomar(":"); L.tomar("if"); cond = expr(L); }
      L.tomar(";");
      b.allows.push({ ops, cond });
    } else throw new Error(`reglas: no entiendo «${x.v}» en un bloque`);
  }
  L.tomar("}");
  return b;
}
export function leerReglas(src: string): Bloque {
  const L = new Lector(tokens(src));
  // rules_version = '2'; service cloud.firestore { … }
  while (!L.es("service")) L.tomar();
  L.tomar("service");
  while (!L.es("{")) L.tomar();
  return bloque(L, []);
}

// ─── Evaluación ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
type Ctx = { vars: Map<string, any>; funciones: Map<string, Fn>[]; docs: Record<string, any> };
const igualdad = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const esMapa = (v: any) => !!v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Set) && !v.__ruta;
const comoLista = (v: any): any[] => (v instanceof Set ? [...v] : Array.isArray(v) ? v : (() => { throw new Error("reglas: se esperaba una lista"); })());
const conjunto = (xs: any[]) => new Set(xs.map((x) => JSON.stringify(x)));

function metodo(obj: any, n: string, args: any[]): any {
  if (obj instanceof Set || Array.isArray(obj)) {
    const xs = comoLista(obj), c = conjunto(xs), a0 = args[0] !== undefined ? conjunto(comoLista(args[0])) : new Set<string>();
    switch (n) {
      case "size": return xs.length;
      case "hasAll": return [...a0].every((x) => c.has(x));
      case "hasAny": return [...a0].some((x) => c.has(x));
      case "hasOnly": return [...c].every((x) => a0.has(x));
      case "toSet": return new Set(xs);
      case "join": return xs.join(args[0] ?? "");
    }
  }
  if (esMapa(obj)) {
    switch (n) {
      case "keys": return Object.keys(obj);
      case "values": return Object.values(obj);
      case "size": return Object.keys(obj).length;
      case "get": { const ks = Array.isArray(args[0]) ? args[0] : [args[0]]; let v: any = obj; for (const k of ks) { if (!esMapa(v) || !(k in v)) return args[1]; v = v[k]; } return v; }
      case "diff": {
        const otro = args[0] ?? {};
        const ks = new Set([...Object.keys(obj), ...Object.keys(otro)]);
        const added = [...ks].filter((k) => k in obj && !(k in otro)), removed = [...ks].filter((k) => !(k in obj) && k in otro);
        const changed = [...ks].filter((k) => k in obj && k in otro && !igualdad(obj[k], otro[k])), unchanged = [...ks].filter((k) => k in obj && k in otro && igualdad(obj[k], otro[k]));
        return { __diff: true, added, removed, changed, unchanged };
      }
    }
  }
  if (obj && obj.__diff) {
    switch (n) {
      case "affectedKeys": return new Set([...obj.added, ...obj.removed, ...obj.changed]);
      case "addedKeys": return new Set(obj.added);
      case "removedKeys": return new Set(obj.removed);
      case "changedKeys": return new Set(obj.changed);
      case "unchangedKeys": return new Set(obj.unchanged);
    }
  }
  if (typeof obj === "string") {
    switch (n) {
      case "size": return obj.length;
      case "matches": return new RegExp(`^(?:${args[0]})$`).test(obj);
      case "lower": return obj.toLowerCase();
      case "upper": return obj.toUpperCase();
      case "trim": return obj.trim();
      case "split": return obj.split(new RegExp(args[0]));
    }
  }
  throw new Error(`reglas: no entiendo el método «${n}» sobre ${obj === null ? "null" : typeof obj}`);
}

function evaluar(n: Nodo, ctx: Ctx): any {
  switch (n.k) {
    case "lit": return n.v;
    case "lista": return n.xs.map((x: Nodo) => evaluar(x, ctx));
    case "mapa": return Object.fromEntries(n.ps.map(([k, v]: [Nodo, Nodo]) => [k.v, evaluar(v, ctx)]));
    case "var": {
      if (ctx.vars.has(n.n)) return ctx.vars.get(n.n);
      throw new Error(`reglas: no conozco «${n.n}»`);
    }
    case ".": {
      const o = evaluar(n.obj, ctx);
      if (o === null || o === undefined) throw new Error(`reglas: «.${n.n}» sobre null`);
      if (!(n.n in o)) throw new Error(`reglas: la propiedad «${n.n}» no existe`);
      return o[n.n];
    }
    case "idx": { const o = evaluar(n.obj, ctx), i = evaluar(n.idx, ctx); return Array.isArray(o) ? o[i] : o?.[i]; }
    case "metodo": return metodo(evaluar(n.obj, ctx), n.n, n.args.map((a: Nodo) => evaluar(a, ctx)));
    case "ruta": return { __ruta: n.partes.map((p: Nodo) => (p.k === "texto" ? p.v : String(evaluar(p.e, ctx)))).join("/") };
    case "llamada": {
      const args = n.args.map((a: Nodo) => evaluar(a, ctx));
      if (n.n === "exists" || n.n === "get") {
        const ruta = String(args[0]?.__ruta ?? "").replace(/^databases\/[^/]+\/documents\//, "");
        const d = ctx.docs[ruta];
        if (n.n === "exists") return d !== undefined;
        if (d === undefined) throw new Error(`reglas: get() de un documento que no existe (${ruta})`);
        return { data: d, id: ruta.split("/").pop() };
      }
      if (n.n === "int") return Math.trunc(Number(args[0]));
      if (n.n === "float") return Number(args[0]);
      if (n.n === "string") return String(args[0]);
      for (const fs of ctx.funciones) {
        const f = fs.get(n.n);
        if (!f) continue;
        const vars = new Map(ctx.vars);
        f.params.forEach((p, i) => vars.set(p, args[i]));
        const sub = { ...ctx, vars };
        for (const [k, e] of f.lets) vars.set(k, evaluar(e, sub));
        return evaluar(f.ret, sub);
      }
      throw new Error(`reglas: no conozco la función «${n.n}»`);
    }
    case "&&": return !!evaluar(n.a, ctx) && !!evaluar(n.b, ctx);
    case "||": return !!evaluar(n.a, ctx) || !!evaluar(n.b, ctx);
    case "!": return !evaluar(n.a, ctx);
    case "neg": return -evaluar(n.a, ctx);
    case "?:": return evaluar(n.c, ctx) ? evaluar(n.a, ctx) : evaluar(n.b, ctx);
    case "==": return igualdad(evaluar(n.a, ctx), evaluar(n.b, ctx));
    case "!=": return !igualdad(evaluar(n.a, ctx), evaluar(n.b, ctx));
    case "<": return evaluar(n.a, ctx) < evaluar(n.b, ctx);
    case "<=": return evaluar(n.a, ctx) <= evaluar(n.b, ctx);
    case ">": return evaluar(n.a, ctx) > evaluar(n.b, ctx);
    case ">=": return evaluar(n.a, ctx) >= evaluar(n.b, ctx);
    case "+": return evaluar(n.a, ctx) + evaluar(n.b, ctx);
    case "-": return evaluar(n.a, ctx) - evaluar(n.b, ctx);
    case "*": return evaluar(n.a, ctx) * evaluar(n.b, ctx);
    case "/": return evaluar(n.a, ctx) / evaluar(n.b, ctx);
    case "%": return evaluar(n.a, ctx) % evaluar(n.b, ctx);
    case "in": {
      const a = evaluar(n.a, ctx), b = evaluar(n.b, ctx);
      if (esMapa(b)) return Object.prototype.hasOwnProperty.call(b, a);
      return conjunto(comoLista(b)).has(JSON.stringify(a));
    }
    case "is": {
      const v = evaluar(n.a, ctx);
      switch (n.tipo) {
        case "string": return typeof v === "string";
        case "number": return typeof v === "number";
        case "int": return Number.isInteger(v);
        case "float": return typeof v === "number";
        case "bool": return typeof v === "boolean";
        case "list": return Array.isArray(v);
        case "map": return esMapa(v);
        case "timestamp": return !!v && typeof v === "object" && "__ts" in v;
        case "null": return v === null;
        default: throw new Error(`reglas: no conozco el tipo «${n.tipo}»`);
      }
    }
  }
  throw new Error(`reglas: nodo desconocido «${n.k}»`);
}

/** ¿Las reglas permiten esa operación? Recorre los `match` que calzan con la ruta (debajo de `/databases/{database}/documents`). */
export function permitido(reglas: Bloque, op: "create" | "update" | "delete" | "get" | "list", ruta: string, o: { auth?: { uid: string; token: Record<string, any> } | null; datos?: any; guardado?: any; docs?: Record<string, any> } = {}): boolean {
  const segs = ["databases", "default", "documents", ...ruta.split("/")];
  const grupos: Record<string, string[]> = { read: ["get", "list"], write: ["create", "update", "delete"] };
  const cubre = (ops: string[]) => ops.some((x) => x === op || grupos[x]?.includes(op));
  const base = {
    request: { auth: o.auth ?? null, resource: o.datos === undefined ? null : { data: o.datos }, time: { __ts: Date.now() }, method: op },
    resource: o.guardado === undefined ? null : { data: o.guardado, id: ruta.split("/").pop() },
  };
  let ok = false;
  const recorrer = (b: Bloque, resto: string[], vars: Map<string, any>, funciones: Map<string, Fn>[]) => {
    const fs = [b.funciones, ...funciones];
    if (resto.length === 0) {
      for (const a of b.allows) {
        if (!cubre(a.ops)) continue;
        const ctx: Ctx = { vars: new Map([...vars, ["request", base.request], ["resource", base.resource]]), funciones: fs, docs: o.docs ?? {} };
        try { if (a.cond === null || evaluar(a.cond, ctx)) ok = true; } catch (e) { if (String((e as Error).message).startsWith("reglas: no")) throw e; /* un error de evaluación niega, como en Firestore */ }
      }
    }
    for (const h of b.hijos) {
      const v2 = new Map(vars);
      let i = 0, calza = true, todo = false;
      for (const p of h.patron) {
        const m = p.match(/^\{(\w+)(=\*\*)?\}$/);
        if (m && m[2]) { v2.set(m[1], resto.slice(i).join("/")); i = resto.length; todo = true; break; }
        if (i >= resto.length) { calza = false; break; }
        if (m) v2.set(m[1], resto[i]); else if (p !== resto[i]) { calza = false; break; }
        i++;
      }
      if (calza) recorrer(h, todo ? [] : resto.slice(i), v2, fs);
    }
  };
  recorrer(reglas, segs, new Map(), []);
  return ok;
}
