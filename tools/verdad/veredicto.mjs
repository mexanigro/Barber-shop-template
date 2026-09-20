#!/usr/bin/env node
/**
 * veredicto.mjs — afirmación = prueba (VERDAD-01, R-V1). Lee la entrega.json de la orden (verdad/entregas/<orden>.json) y,
 * por cada afirmación: corre la prueba citada (exige que corra ≥ 1 test y 0 fallos), aplica la mutación de
 * tests/mutaciones/<base>.mjs (debe poner la prueba ROJA, se revierte y debe volver VERDE; queda con hora), exige las capturas
 * de todas las vistas × paletas declaradas en <capturas>/<árbol>/<id>-<paleta>-<vista>.png y la evidencia extra, y calcula
 * el SHA-256 de cada archivo. Escribe verdad/VERDAD-<sha>.md (tabla, sin texto libre). Exit 2 si alguna fila no es VERIFICADO.
 *
 *   node tools/verdad/veredicto.mjs --cierre [--entrega <ruta>]     todo; escribe el informe; retención de capturas
 *   node tools/verdad/veredicto.mjs --commit [--entrega <ruta>]     sólo lo impactado por lo staged (pre-commit); no escribe informe
 *   node tools/verdad/veredicto.mjs --stop                          barato: existe verdad/VERDAD-<HEAD>.md verde con el árbol de HEAD
 *                                                                    (o del padre si HEAD sólo toca verdad/) y cita el HEAD de H; sin correr pruebas
 *
 * Veredictos: VERIFICADO (prueba verde + rojo→verde + evidencia completa) · NO VERIFICADO (falta prueba, mutación o evidencia) ·
 * FALSO (la prueba falla, o la mutación no la pone roja: la prueba no prueba nada, o la mutación no cambia el archivo).
 * Las suites heredadas sin mutación se listan al pie del informe; no se ocultan.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, HERMANO, etiqueta, git } from "../_git.mjs";
import { impactoStaged, staged } from "./impacto.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const T = etiqueta(ROOT) === "T" ? ROOT : HERMANO;
export const H = etiqueta(ROOT) === "H" ? ROOT : HERMANO;
const ENTREGAS = path.join(T, "verdad", "entregas");
const INFORMES = path.join(T, "verdad");
const hora = () => new Date().toISOString().slice(11, 19);
export const sha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

// ── esquema (subconjunto propio de JSON Schema) ──────────────────────────────────────────────────────────────────────
export function validar(valor, esquema, ruta = "$") {
  const errs = [];
  const tipos = [].concat(esquema.type ?? []);
  const tipo = valor === null ? "null" : Array.isArray(valor) ? "array" : typeof valor;
  if (tipos.length && !tipos.includes(tipo)) return [`${ruta}: es ${tipo}, se espera ${tipos.join("|")}`];
  if (esquema.enum && !esquema.enum.includes(valor)) errs.push(`${ruta}: ${JSON.stringify(valor)} no está en ${JSON.stringify(esquema.enum)}`);
  if (tipo === "string") {
    if (esquema.minLength && valor.length < esquema.minLength) errs.push(`${ruta}: menos de ${esquema.minLength} caracteres`);
    if (esquema.pattern && !new RegExp(esquema.pattern).test(valor)) errs.push(`${ruta}: "${valor}" no cumple /${esquema.pattern}/`);
  }
  if (tipo === "array") {
    if (esquema.minItems && valor.length < esquema.minItems) errs.push(`${ruta}: menos de ${esquema.minItems} elementos`);
    if (esquema.items) valor.forEach((v, i) => errs.push(...validar(v, esquema.items, `${ruta}[${i}]`)));
  }
  if (tipo === "object") {
    for (const k of esquema.required ?? []) if (!(k in valor)) errs.push(`${ruta}.${k}: falta`);
    for (const [k, sub] of Object.entries(esquema.properties ?? {})) if (k in valor) errs.push(...validar(valor[k], sub, `${ruta}.${k}`));
  }
  return errs;
}
export const esquema = () => JSON.parse(fs.readFileSync(path.join(AQUI, "esquema.json"), "utf8"));

export function leerEntrega(ruta) {
  let file = ruta;
  if (!file) {
    if (!fs.existsSync(ENTREGAS)) return { error: `sin ${ENTREGAS}` };
    const cands = fs.readdirSync(ENTREGAS).filter((f) => f.endsWith(".json")).map((f) => ({ f, t: fs.statSync(path.join(ENTREGAS, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    if (!cands.length) return { error: `sin entregas en ${ENTREGAS}` };
    file = path.join(ENTREGAS, cands[0].f);
  }
  let json; try { json = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return { error: `${file}: ${e.message}` }; }
  const errs = validar(json, esquema());
  return errs.length ? { error: `${file} no cumple el esquema:\n  ${errs.join("\n  ")}`, file } : { entrega: json, file };
}

// ── prueba y mutación ─────────────────────────────────────────────────────────────────────────────────────────────────
const raizDe = (repo) => (repo === "H" ? H : T);
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Corre un test por nombre. Devuelve { exit, tests, pass, fail, salida }. tests = 0 → la prueba no existe con ese nombre. */
export function correrPrueba(repo, archivo, nombre) {
  const cwd = raizDe(repo);
  const patron = `--test-name-pattern=^${escapar(nombre)}$`;
  // sin shell: en Windows cmd.exe rompe `^`/`$`/espacios del patrón; tsx se invoca por su cli.mjs con el node actual
  const comunes = ["--test", "--test-reporter=tap", "--test-reporter-destination=stdout", patron, archivo];
  const args = repo === "H" ? ["--experimental-strip-types", ...comunes] : [path.join(T, "node_modules", "tsx", "dist", "cli.mjs"), ...comunes];
  // Sin NODE_TEST_CONTEXT/NODE_OPTIONS heredados: si veredicto corre dentro de otra suite (tests/verdad.test.ts), node:test del hijo
  // detectaba «run() recursivo» y saltaba el archivo (0 tests), y el loader de tsx del padre se colaba en el hijo.
  const env = { ...process.env, FORCE_COLOR: "0" }; delete env.NODE_TEST_CONTEXT; delete env.NODE_OPTIONS;
  const r = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout: 600000, env });
  const salida = (r.stdout ?? "") + (r.stderr ?? "");
  // Se cuentan las líneas TAP del test con ESE nombre (con un patrón que no casa, node cuenta el archivo como 1 test que pasa).
  const n = (prefijo) => (salida.match(new RegExp(`^\\s*${prefijo} \\d+ - ${escapar(nombre)}\\s*$`, "gm")) ?? []).length;
  const pass = n("ok"), fail = n("not ok") || (r.status && !n("ok") ? 1 : 0); // sin línea del test y exit ≠ 0: el archivo reventó = 1 fallo
  return { exit: r.status, tests: pass + fail, pass, fail, salida };
}
export const base = (archivo) => path.basename(archivo).replace(/\.test\.ts$/, "");
export const rutaMutacion = (repo, archivo) => path.join(raizDe(repo), "tests", "mutaciones", `${base(archivo)}.mjs`);

/** Mutaciones declaradas para una prueba: [{ prueba, archivo, descripcion, aplicar }]. null si no hay archivo. */
export async function mutacionesDe(repo, archivo, nombre) {
  const file = rutaMutacion(repo, archivo);
  if (!fs.existsSync(file)) return null;
  const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  const lista = [].concat(mod.default ?? []);
  return lista.filter((m) => m.prueba === nombre || (Array.isArray(m.pruebas) && m.pruebas.includes(nombre)));
}

/** Aplica una mutación, exige rojo, revierte, exige verde. Devuelve { ok, rojo, verde, detalle }. Siempre restaura. */
export function mutar(repo, m, prueba) {
  const abs = path.join(raizDe(repo), m.archivo);
  if (!fs.existsSync(abs)) return { ok: false, detalle: `mutación: no existe ${m.archivo}` };
  const original = fs.readFileSync(abs, "utf8");
  const mutado = m.aplicar(original);
  if (mutado === original) return { ok: false, falso: true, detalle: `mutación "${m.descripcion}" no cambia ${m.archivo}` };
  let rojo, verde;
  try {
    fs.writeFileSync(abs, mutado);
    const r = correrPrueba(repo, prueba.archivo, prueba.nombre); rojo = { hora: hora(), ...r };
  } finally { fs.writeFileSync(abs, original); }
  const v = correrPrueba(repo, prueba.archivo, prueba.nombre); verde = { hora: hora(), ...v };
  const fueRojo = rojo.exit !== 0 || rojo.fail > 0;
  const volvioVerde = verde.exit === 0 && verde.fail === 0 && verde.pass >= 1;
  if (!fueRojo) return { ok: false, falso: true, rojo, verde, detalle: `mutación "${m.descripcion}" (${m.archivo}) NO puso roja la prueba: no prueba nada` };
  if (!volvioVerde) return { ok: false, rojo, verde, detalle: `tras revertir "${m.descripcion}" la prueba no volvió a verde` };
  return { ok: true, rojo, verde, detalle: `${m.descripcion} (${m.archivo}) ${rojo.hora} rojo → ${verde.hora} verde` };
}

// ── evidencia ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const arbol = (cwd = T) => git(["write-tree"], cwd);
export function capturasExigidas(af) {
  const vistas = af.vistas ?? [], paletas = af.paletas ?? [];
  const out = [];
  if (paletas.length) { for (const p of paletas) for (const v of vistas) out.push(`${af.id}-${p}-${v}.png`); } else for (const v of vistas) out.push(`${af.id}-${v}.png`);
  return out;
}
export function evidenciaDe(af, dir) {
  const filas = [];
  for (const nombre of [...capturasExigidas(af), ...(af.evidencia ?? [])]) {
    const abs = path.isAbsolute(nombre) ? nombre : path.join(dir, nombre);
    filas.push(fs.existsSync(abs) ? { nombre, hash: sha256(abs) } : { nombre, falta: true });
  }
  return filas;
}

// ── evaluación ────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function evaluar(af, dir, { log = console.error } = {}) {
  const fila = { id: af.id, texto: af.texto, repo: af.repo, prueba: `${af.prueba.archivo} · ${af.prueba.nombre}`, exit: "—", mutacion: "—", vistas: capturasExigidas(af).length ? [...af.vistas].join("/") : "—", evidencia: [], veredicto: "NO VERIFICADO", motivo: [] };
  log(`· ${af.id}: prueba`);
  const p = correrPrueba(af.repo, af.prueba.archivo, af.prueba.nombre);
  fila.exit = `${p.exit} (${p.pass}/${p.tests})`;
  if (p.tests === 0) fila.motivo.push("la prueba no existe con ese nombre");
  else if (p.exit !== 0 || p.fail > 0) { fila.veredicto = "FALSO"; fila.motivo.push(`la prueba falla (${p.fail} fallo/s)`); }
  const ms = await mutacionesDe(af.repo, af.prueba.archivo, af.prueba.nombre);
  if (ms === null) fila.motivo.push(`sin ${path.relative(raizDe(af.repo), rutaMutacion(af.repo, af.prueba.archivo)).replace(/\\/g, "/")}`);
  else if (!ms.length) fila.motivo.push("la mutación no declara esta prueba");
  else if (fila.veredicto !== "FALSO") {
    const res = [];
    for (const m of ms) { log(`· ${af.id}: mutación «${m.descripcion}»`); const r = mutar(af.repo, m, af.prueba); res.push(r); if (!r.ok) { fila.motivo.push(r.detalle); if (r.falso) fila.veredicto = "FALSO"; } }
    fila.mutacion = res.map((r) => (r.ok ? r.detalle : `✗ ${r.detalle}`)).join("; ");
  }
  fila.evidencia = evidenciaDe(af, dir);
  for (const e of fila.evidencia) if (e.falta) fila.motivo.push(`falta ${e.nombre}`);
  if (fila.veredicto !== "FALSO" && !fila.motivo.length) fila.veredicto = "VERIFICADO";
  return fila;
}

export function suitesSinMutacion() {
  const out = [];
  const pkgT = JSON.parse(fs.readFileSync(path.join(T, "package.json"), "utf8")).scripts.test;
  for (const f of pkgT.split(/\s+/).filter((s) => s.endsWith(".test.ts"))) if (!fs.existsSync(rutaMutacion("T", f))) out.push(`T ${f}`);
  const dirsH = ["src/lib", "src/lib/client-config", "tests"].map((d) => path.join(H, d)).filter(fs.existsSync);
  for (const d of dirsH) for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".test.ts"))) { const rel = path.relative(H, path.join(d, f)).replace(/\\/g, "/"); if (!fs.existsSync(rutaMutacion("H", rel))) out.push(`H ${rel}`); }
  return out;
}

export function informe({ entrega, modo, shaT, shaH, tree, filas, capturasDir, heredadas, retencion }) {
  const md = [];
  md.push(`# VERDAD · ${entrega.orden} · T ${shaT.slice(0, 7)} · H ${shaH.slice(0, 7)} · árbol ${tree} · ${new Date().toISOString()} · ${modo}`);
  md.push("");
  md.push(`Capturas: \`${capturasDir}\``);
  md.push("");
  md.push("| afirmación | prueba | exit | rojo→verde | vistas | evidencia · sha256 | veredicto |");
  md.push("|---|---|---|---|---|---|---|");
  for (const f of filas) {
    const ev = f.evidencia.length ? f.evidencia.map((e) => (e.falta ? `${e.nombre} FALTA` : `${e.nombre} ${e.hash.slice(0, 12)}`)).join("<br>") : "—";
    const ver = f.veredicto + (f.motivo.length ? ` — ${f.motivo.join("; ")}` : "");
    md.push(`| \`${f.id}\` ${f.texto.replace(/\|/g, "\\|")} | ${f.repo} \`${f.prueba.replace(/\|/g, "\\|")}\` | ${f.exit} | ${f.mutacion.replace(/\|/g, "\\|")} | ${f.vistas} | ${ev} | **${ver}** |`);
  }
  md.push("");
  const n = (v) => filas.filter((f) => f.veredicto === v).length;
  md.push(`Resumen: VERIFICADO ${n("VERIFICADO")} · NO VERIFICADO ${n("NO VERIFICADO")} · FALSO ${n("FALSO")} · total ${filas.length}`);
  md.push("");
  md.push("## Suites heredadas sin mutación (listadas, no ocultas)");
  md.push("");
  for (const s of heredadas) md.push(`- ${s}`);
  if (retencion) { md.push(""); md.push("## Retención de capturas"); md.push(""); md.push(retencion); }
  md.push("");
  return md.join("\n");
}

/** Conserva las capturas de los últimos 5 informes + las citadas en verdad/aprobados.txt; borra el resto y lo declara. */
export function retener(capturasRoot) {
  if (!fs.existsSync(capturasRoot)) return "sin carpeta de capturas";
  const informes = fs.readdirSync(INFORMES).filter((f) => /^VERDAD-[0-9a-f]{7,40}\.md$/.test(f)).map((f) => ({ f, t: fs.statSync(path.join(INFORMES, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  const citados = new Set();
  for (const { f } of informes.slice(0, 5)) { const m = fs.readFileSync(path.join(INFORMES, f), "utf8").match(/árbol ([0-9a-f]{40})/); if (m) citados.add(m[1]); }
  const aprobados = path.join(INFORMES, "aprobados.txt");
  if (fs.existsSync(aprobados)) for (const l of fs.readFileSync(aprobados, "utf8").split("\n")) { const m = l.match(/\b[0-9a-f]{40}\b/); if (m) citados.add(m[0]); }
  const borrados = [];
  for (const d of fs.readdirSync(capturasRoot)) { if (/^[0-9a-f]{40}$/.test(d) && !citados.has(d)) { fs.rmSync(path.join(capturasRoot, d), { recursive: true, force: true }); borrados.push(d); } }
  return `conservadas ${citados.size} (últimos ${Math.min(5, informes.length)} informes + aprobados.txt); borradas ${borrados.length}${borrados.length ? ": " + borrados.map((s) => s.slice(0, 7)).join(", ") : ""}`;
}

// ── --stop ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function stop() {
  const headT = git(["rev-parse", "HEAD"], T);
  const headH = fs.existsSync(path.join(H, ".git")) ? git(["rev-parse", "HEAD"], H) : null;
  const cands = [headT];
  try {
    const cambiados = git(["diff", "--name-only", "HEAD~1", "HEAD"], T).split("\n").filter(Boolean);
    if (cambiados.length && cambiados.every((f) => f.startsWith("verdad/"))) cands.push(git(["rev-parse", "HEAD~1"], T));
  } catch {}
  for (const sha of cands) {
    const file = path.join(INFORMES, `VERDAD-${sha}.md`);
    if (!fs.existsSync(file)) continue;
    const md = fs.readFileSync(file, "utf8");
    const tree = md.match(/árbol ([0-9a-f]{40})/)?.[1];
    const treeReal = git(["rev-parse", `${sha}^{tree}`], T);
    if (tree !== treeReal) return { ok: false, motivo: `${path.basename(file)} cita el árbol ${tree?.slice(0, 7)} y el de ${sha.slice(0, 7)} es ${treeReal.slice(0, 7)}` };
    const hH = md.match(/· H ([0-9a-f]{7,40}) ·/)?.[1];
    if (headH && !(hH && headH.startsWith(hH))) return { ok: false, motivo: `${path.basename(file)} cita H ${hH} y el HEAD de H es ${headH.slice(0, 7)}: falta veredicto --cierre tras el commit de H` };
    const filas = md.split("\n").filter((l) => /^\| `/.test(l));
    const malas = filas.filter((l) => !/\*\*VERIFICADO\*\*/.test(l));
    if (!filas.length) return { ok: false, motivo: `${path.basename(file)} sin filas` };
    if (malas.length) return { ok: false, motivo: `${path.basename(file)}: ${malas.length} fila(s) no VERIFICADO` };
    return { ok: true, motivo: `${path.basename(file)} verde (${filas.length} filas), árbol ${tree.slice(0, 7)}, H ${hH}` };
  }
  return { ok: false, motivo: `sin verdad/VERDAD-${headT.slice(0, 7)}.md (ni del padre con HEAD sólo en verdad/): correr veredicto --cierre` };
}

/** Impacto en H (sin grafo de secciones): lo staged y los tests de H que nombran alguno de esos archivos. */
export function impactoH() {
  const tocados = staged(H);
  const tests = [];
  for (const d of ["src/lib", "src/lib/client-config", "tests"].map((x) => path.join(H, x)).filter(fs.existsSync)) for (const f of fs.readdirSync(d)) if (f.endsWith(".test.ts")) tests.push(path.relative(H, path.join(d, f)).replace(/\\/g, "/"));
  const pruebas = tests.filter((t) => tocados.includes(t) || tocados.some((f) => { const s = fs.readFileSync(path.join(H, t), "utf8"); const sinExt = f.replace(/\.tsx?$/, ""); return s.includes(f) || s.includes(sinExt) || s.includes(path.basename(sinExt)); }));
  for (const f of tocados) { const m = f.match(/^tests\/mutaciones\/(.+)\.mjs$/); const t = m && tests.find((x) => base(x) === m[1]); if (t && !pruebas.includes(t)) pruebas.push(t); } // una mutación tocada re-prueba su suite
  return { tocados, pruebas, capturas: [], nichos: [], secciones: [], paginas: [] };
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function main(args) {
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
  const modo = args.includes("--stop") ? "stop" : args.includes("--commit") ? "commit" : args.includes("--cierre") ? "cierre" : null;
  if (!modo) { console.error("uso: veredicto.mjs --cierre|--commit|--stop [--entrega <ruta>]"); return 2; }
  if (modo === "stop") { const r = stop(); console.error(`veredicto --stop · ${r.ok ? "OK" : "BLOQUEADO"} · ${r.motivo}`); return r.ok ? 0 : 2; }

  const tree = arbol();
  const actor = opt("repo") ?? etiqueta(ROOT); // desde H el delegador pasa --repo H: lo staged y las afirmaciones son las de H
  const le = leerEntrega(opt("entrega"));
  const imp = modo === "commit" ? (actor === "T" ? impactoStaged(T) : impactoH()) : null;
  if (le.error) {
    if (modo === "commit" && imp && !imp.tocados.length) { console.error("veredicto --commit · nada staged"); return 0; }
    console.error(`veredicto · ${le.error}`); return 2;
  }
  const { entrega } = le;
  const capturasDir = path.join(entrega.capturas, tree);
  let afs = entrega.afirmaciones;
  const faltasCommit = [];
  if (modo === "commit") {
    const pruebas = new Set(imp.pruebas);
    afs = afs.filter((a) => a.repo === actor && (pruebas.has(a.prueba.archivo) || imp.tocados.includes(a.prueba.archivo)));
    for (const c of imp.capturas) if (!fs.existsSync(path.join(capturasDir, c))) faltasCommit.push(`falta captura obligatoria ${c} en ${capturasDir}`);
    if (imp.nichos.includes("seis")) { const rep = path.join(capturasDir, "regresion-seis", "report.txt"); if (!fs.existsSync(rep)) faltasCommit.push(`falta regresión seis: ${rep}`); }
    console.error(`veredicto --commit · tocados ${imp.tocados.length} · secciones [${imp.secciones}] páginas [${imp.paginas}] nichos [${imp.nichos}] · afirmaciones impactadas ${afs.length}`);
  }
  const filas = [];
  for (const af of afs) filas.push(await evaluar(af, capturasDir));
  const shaT = git(["rev-parse", "HEAD"], T), shaH = fs.existsSync(path.join(H, ".git")) ? git(["rev-parse", "HEAD"], H) : "0000000";
  const heredadas = suitesSinMutacion();
  const retencion = modo === "cierre" ? retener(entrega.capturas) : null;
  const md = informe({ entrega, modo, shaT, shaH, tree, filas, capturasDir, heredadas, retencion });
  if (modo === "cierre") { fs.mkdirSync(INFORMES, { recursive: true }); const out = path.join(INFORMES, `VERDAD-${shaT}.md`); fs.writeFileSync(out, md); console.error(`escrito ${path.relative(T, out)}`); }
  console.log(md);
  const malas = filas.filter((f) => f.veredicto !== "VERIFICADO");
  for (const f of faltasCommit) console.error(`✗ ${f}`);
  return malas.length || faltasCommit.length ? 2 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`veredicto ROTO (${e.message}): exit 2`); process.exit(2); });
}
