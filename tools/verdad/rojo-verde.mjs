// VERDAD-02 (2026-09-20) · rojo antes que verde, comprobable por git. Byte a byte igual en T y H.
// Uso: node tools/verdad/rojo-verde.mjs --orden <id> [--repo <ruta>] | --todas [--repo <ruta>]
// Por orden <id> (carpeta tests/orden/<id>/):
//   A1 rojo = el PRIMER commit de main que añade tests/orden/<id>/HOJA.md (si se quita y se repone, sigue siendo el primero);
//      sin él → exit 2 «sin commit rojo».
//   A4 git diff <rojo> HEAD -- tests/orden/<id>/ debe estar vacío; si no → exit 2 con la lista de archivos tocados.
//   A5 cada test (nombre en TAP) = una afirmación literal de HOJA.md para este repo (`- [ID] (T+H|T|H) frase · fuente: …`)
//      y viceversa; las del otro repo no se exigen → exit 2 con las listas.
//   A3 en HEAD todos los tests pasan (node --experimental-strip-types --test --test-reporter=tap) → exit 2 con el nombre que falla.
//   A2 en el árbol del commit rojo (git worktree temporal) ninguno pasa; «falla» = no aparece como ok → exit 2 «<nombre>: nunca estuvo en rojo».
//   A6 exit 0 con una tabla por test: id · frase · rojo en <sha7> · verde en <sha7>; sin horas ni texto libre (stdout determinista).
//      «verde» = el último commit (desde HEAD hacia atrás) que toca algo fuera de tests/orden/<id>/: es HEAD salvo que HEAD sólo
//      quite y reponga los tests (A1 exige que ese commit no se cite; A6, que se cite el commit que puso verde).
// --todas: cada <id> con carpeta en tests/orden/ de HEAD; exit 2 si alguna falla. El repo se etiqueta por sufijo de ruta como tools/_git.mjs.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const REPO = resolve(opt("--repo") ?? resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
const ETIQUETA = /nichos-hub$/i.test(REPO.replace(/\\/g, "/")) ? "H" : "T";
const RUNNER = ["--experimental-strip-types", "--test", "--test-reporter=tap"];

function git(args, cwd = REPO) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }).trim();
}
const rama = () => { try { git(["rev-parse", "--verify", "-q", "main"]); return "main"; } catch { return "HEAD"; } };

/** Afirmaciones de HOJA.md (en HEAD) que aplican a este repo: [{ id, frase }]. */
function afirmaciones(id) {
  const hoja = git(["show", `HEAD:tests/orden/${id}/HOJA.md`]);
  const lista = [];
  for (const l of hoja.split(/\r?\n/)) {
    const m = l.match(/^- \[([^\]]+)\] \((T\+H|T|H)\) (.+?) · fuente:/);
    if (m && (m[2] === "T+H" || m[2] === ETIQUETA)) lista.push({ id: m[1], frase: m[3] });
  }
  return lista;
}

const desescapar = (s) => s.replace(/\\#/g, "#").replace(/\\\\/g, "\\");

/** Corre los tests de tests/orden/<id>/ en un árbol y devuelve { ok: Set, mal: Set, archivos: Set (archivos que no cargan) }. */
function correr(arbol, id) {
  const carpeta = join(arbol, "tests", "orden", id);
  const archivos = existsSync(carpeta) ? readdirSync(carpeta).filter((f) => f.endsWith(".test.ts")).sort().map((f) => join("tests", "orden", id, f)) : [];
  const ok = new Set(), mal = new Set(), rotos = new Set();
  if (!archivos.length) return { ok, mal, rotos };
  // Sin NODE_TEST_CONTEXT: si rojo-verde corre dentro de otro `node --test` (los tests de orden lo prueban), el runner anidado heredaría
  // la marca de hijo y se saltaría los archivos («run() is being called recursively»).
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, [...RUNNER, ...archivos], { cwd: arbol, env, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  for (const l of String(r.stdout ?? "").split(/\r?\n/)) {
    const m = l.match(/^(ok|not ok) \d+ - (.*?)(?: # (?:SKIP|TODO).*)?$/);
    if (!m) continue;
    const nombre = desescapar(m[2]);
    if (/\.test\.ts$/.test(nombre)) { if (m[1] === "not ok") rotos.add(nombre); continue; }
    (m[1] === "ok" ? ok : mal).add(nombre);
  }
  return { ok, mal, rotos };
}

/** Árbol del commit rojo en una copia temporal (git worktree); se borra al terminar. */
function conArbolRojo(rojo, fn) {
  const dir = mkdtempSync(join(tmpdir(), "rojo-"));
  try {
    git(["worktree", "add", "--detach", "-q", dir, rojo]);
    return fn(dir);
  } finally {
    try { git(["worktree", "remove", "--force", dir]); } catch {}
    try { git(["worktree", "prune"]); } catch {}
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

/** Devuelve { fallas: string[], tabla: string } para una orden. */
function verificar(id) {
  const hoja = `tests/orden/${id}/HOJA.md`;
  const rojo = git(["log", "--reverse", "--format=%H", "--diff-filter=A", rama(), "--", hoja]).split("\n").filter(Boolean)[0];
  if (!rojo) return { fallas: [`${id}: sin commit rojo (ningún commit de ${rama()} añade ${hoja})`] };
  const head = git(["rev-parse", "HEAD"]);
  const tocados = git(["diff", "--name-only", rojo, head, "--", `tests/orden/${id}/`]).split("\n").filter(Boolean);
  if (tocados.length) return { fallas: [`${id}: tests/orden/${id}/ cambió entre el rojo ${rojo.slice(0, 7)} y HEAD ${head.slice(0, 7)}:\n  ${tocados.join("\n  ")}`] };
  const esperadas = afirmaciones(id);
  const enHead = correr(REPO, id);
  const nombres = new Set([...enHead.ok, ...enHead.mal]);
  const sinTest = esperadas.filter((a) => !nombres.has(a.frase));
  const sinAfirmacion = [...nombres].filter((n) => !esperadas.some((a) => a.frase === n));
  if (sinTest.length || sinAfirmacion.length || enHead.rotos.size) {
    const f = [];
    if (enHead.rotos.size) f.push(`${id}: archivos de test que no cargan en HEAD:\n  ${[...enHead.rotos].join("\n  ")}`);
    if (sinTest.length) f.push(`${id}: afirmaciones de HOJA.md (${ETIQUETA}) sin test:\n  ${sinTest.map((a) => `[${a.id}] ${a.frase}`).join("\n  ")}`);
    if (sinAfirmacion.length) f.push(`${id}: tests sin afirmación en HOJA.md:\n  ${sinAfirmacion.join("\n  ")}`);
    return { fallas: f };
  }
  if (enHead.mal.size) return { fallas: [`${id}: tests que fallan en HEAD ${head.slice(0, 7)}:\n  ${[...enHead.mal].join("\n  ")}`] };
  const enRojo = conArbolRojo(rojo, (dir) => correr(dir, id));
  const nuncaRojo = esperadas.filter((a) => enRojo.ok.has(a.frase));
  if (nuncaRojo.length) return { fallas: nuncaRojo.map((a) => `${id}: ${a.frase}: nunca estuvo en rojo (pasa en el árbol de ${rojo.slice(0, 7)})`) };
  const verde = git(["log", "-1", "--format=%H", head, "--", ".", `:(exclude)tests/orden/${id}`]) || head;
  const tabla = esperadas.map((a) => `[${a.id}] ${a.frase} · rojo en ${rojo.slice(0, 7)} · verde en ${verde.slice(0, 7)}`).join("\n");
  return { fallas: [], tabla: `orden ${id} · ${ETIQUETA} · ${esperadas.length} tests\n${tabla}\n` };
}

function main() {
  let ids;
  if (argv.includes("--todas")) {
    try { ids = git(["ls-tree", "--name-only", "-d", "HEAD:tests/orden/"]).split("\n").filter(Boolean); } catch { ids = []; } // sin tests/orden/ en HEAD: nada que verificar
  } else {
    const id = opt("--orden");
    if (!id) { console.error("uso: rojo-verde.mjs --orden <id> [--repo <ruta>] | --todas"); return 2; }
    ids = [id];
  }
  let salida = "", fallas = [];
  for (const id of ids) {
    const r = verificar(id);
    if (r.fallas.length) fallas.push(...r.fallas); else salida += r.tabla;
  }
  if (fallas.length) { console.error(`ROJO-VERDE · ${ETIQUETA} · ${REPO}\n- ${fallas.join("\n- ")}`); return 2; }
  process.stdout.write(salida);
  return 0;
}

let code;
try { code = main(); } catch (e) { console.error(`ROJO-VERDE ROTO (${String(e.message).split("\n")[0]}): bloquea.`); code = 2; }
process.exit(code);
