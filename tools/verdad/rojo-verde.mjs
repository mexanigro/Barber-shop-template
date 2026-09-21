// VERDAD-02 (2026-09-20) · rojo antes que verde, comprobable por git. Byte a byte igual en T y H.
// Uso: node tools/verdad/rojo-verde.mjs --orden <id> [--repo <ruta>] | --todas [--repo <ruta>]
// Por orden <id> (carpeta tests/orden/<id>/):
//   A1/B1 rojo = el ÚLTIMO commit de main que añade tests/orden/<id>/HOJA.md (VERDAD-03: la corrección de A tras el rojo es un revert
//      + un nuevo commit rojo; los anteriores se citan al final de la tabla como «rojos anteriores: <sha7> …»); sin ninguno → exit 2
//      «sin commit rojo».
//   A3 (VERDAD-03) rojo == HEAD → «<id> · rojo pendiente de B»: los tests corren una vez, en el repo; ninguno debe pasar y los nombres
//      deben coincidir con la hoja (A5); si alguno pasa → exit 2 «<nombre>: nunca estuvo en rojo». Rojo ≠ HEAD → verificación entera:
//   A4 git diff <rojo> HEAD -- tests/orden/<id>/ debe estar vacío; si no → exit 2 con la lista de archivos tocados.
//   A5 cada test (nombre en TAP) = una afirmación literal de HOJA.md para este repo (`- [ID] (T+H|T|H) frase · fuente: …`)
//      y viceversa; las del otro repo no se exigen → exit 2 con las listas.
//   A3 en HEAD todos los tests pasan (node --experimental-strip-types --test --test-reporter=tap) → exit 2 con el nombre que falla.
//   D1 (VERDAD-03) la corrida en HEAD no deja carpetas nuevas «<id>-…» en os.tmpdir() → exit 2 «<id>: carpetas temporales sin borrar: …».
//   A2 en el árbol del commit rojo (git worktree temporal) ninguno pasa; «falla» = no aparece como ok → exit 2 «<nombre>: nunca estuvo en rojo».
//   A6 exit 0 con una tabla por test: id · frase · rojo en <sha7> · verde en <sha7>; sin horas ni texto libre (stdout determinista).
//      «verde» = el último commit (desde HEAD hacia atrás) que toca algo fuera de tests/orden/<id>/: es HEAD salvo que HEAD sólo
//      quite y reponga los tests (A6 exige que se cite el commit que puso verde).
//   C2 (VERDAD-04) en una orden se corre todo y se acumulan todas las fallas (tests tocados desde el rojo, nombres sin afirmación o sin
//      test, archivos que no cargan, tests que fallan en HEAD, tests que nunca estuvieron en rojo, carpetas temporales sin borrar) en
//      stderr, una línea «- <id>: …» por falla, sin parar en la primera: el árbol rojo se corre aunque HEAD falle. Las carpetas
//      «<id>-…» que dejó cualquiera de las dos corridas se borran tras listarlas y se declara en stderr «<id> · carpetas temporales
//      borradas: …» (sólo las de la corrida en HEAD son falla, D1). Sin commit rojo no hay nada más que verificar.
// --todas: cada <id> con carpeta en tests/orden/ de HEAD; exit 2 si alguna falla. Las órdenes listadas en HEAD:tests/orden/APROBADAS.md
//   («- <id> · aprobada AAAA-MM-DD · T <sha7> · H <sha7>», VERDAD-03 A1) no se corren: una línea «<id> · retirada (aprobada <fecha>)»;
//   --orden <id> explícito las verifica igual. El repo se etiqueta por sufijo de ruta como tools/_git.mjs.
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
// Sin las variables que git exporta a sus hooks (pre-commit: GIT_INDEX_FILE=.git/index relativo, GIT_PREFIX…): heredadas, rompen
// `git worktree add` y desvían los git de los repos temporales de los tests promovidos (VERDAD-03 D2 bajo pre-commit). rojo-verde
// trabaja siempre sobre un repo explícito (REPO) y sus worktrees.
const ENV = { ...process.env };
for (const k of ["GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE", "GIT_PREFIX"]) delete ENV[k];

function git(args, cwd = REPO) {
  return execFileSync("git", args, { cwd, env: ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }).trim();
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

/** Órdenes aprobadas en HEAD:tests/orden/APROBADAS.md → Map<id, fecha>. */
function aprobadas() {
  let texto = "";
  try { texto = git(["show", "HEAD:tests/orden/APROBADAS.md"]); } catch { return new Map(); }
  const m = new Map();
  for (const l of texto.split(/\r?\n/)) {
    const x = l.match(/^- (\S+) · aprobada (\d{4}-\d{2}-\d{2}) · T [0-9a-f]{7} · H [0-9a-f]{7}\s*$/);
    if (x) m.set(x[1], x[2]);
  }
  return m;
}

const desescapar = (s) => s.replace(/\\#/g, "#").replace(/\\\\/g, "\\");

/** Corre los tests de tests/orden/<id>/ en un árbol y devuelve { ok, mal, rotos (archivos que no cargan), restos (carpetas «<id>-…» nuevas en tmpdir) }. */
function correr(arbol, id) {
  const carpeta = join(arbol, "tests", "orden", id);
  const archivos = existsSync(carpeta) ? readdirSync(carpeta).filter((f) => f.endsWith(".test.ts")).sort().map((f) => join("tests", "orden", id, f)) : [];
  const ok = new Set(), mal = new Set(), rotos = new Set(), restos = [];
  if (!archivos.length) return { ok, mal, rotos, restos };
  // Sin NODE_TEST_CONTEXT: si rojo-verde corre dentro de otro `node --test` (los tests de orden lo prueban), el runner anidado heredaría
  // la marca de hijo y se saltaría los archivos («run() is being called recursively»).
  const env = { ...ENV }; delete env.NODE_TEST_CONTEXT;
  const antes = new Set(readdirSync(tmpdir()));
  const r = spawnSync(process.execPath, [...RUNNER, ...archivos], { cwd: arbol, env, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  for (const d of readdirSync(tmpdir())) if (d.startsWith(`${id}-`) && !antes.has(d)) restos.push(d);
  for (const l of String(r.stdout ?? "").split(/\r?\n/)) {
    const m = l.match(/^(ok|not ok) \d+ - (.*?)(?: # (?:SKIP|TODO).*)?$/);
    if (!m) continue;
    const nombre = desescapar(m[2]);
    if (/\.test\.ts$/.test(nombre)) { if (m[1] === "not ok") rotos.add(nombre); continue; }
    (m[1] === "ok" ? ok : mal).add(nombre);
  }
  return { ok, mal, rotos, restos };
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

/** A5 + archivos rotos: fallas de nombres entre la corrida y la hoja (o []). */
function fallasDeNombres(id, esperadas, corrida) {
  const nombres = new Set([...corrida.ok, ...corrida.mal]);
  const sinTest = esperadas.filter((a) => !nombres.has(a.frase));
  const sinAfirmacion = [...nombres].filter((n) => !esperadas.some((a) => a.frase === n));
  const f = [];
  if (corrida.rotos.size) f.push(`${id}: archivos de test que no cargan en HEAD:\n  ${[...corrida.rotos].join("\n  ")}`);
  if (sinTest.length) f.push(`${id}: afirmaciones de HOJA.md (${ETIQUETA}) sin test:\n  ${sinTest.map((a) => `[${a.id}] ${a.frase}`).join("\n  ")}`);
  if (sinAfirmacion.length) f.push(`${id}: tests sin afirmación en HOJA.md:\n  ${sinAfirmacion.join("\n  ")}`);
  if (corrida.restos.length) f.push(`${id}: carpetas temporales sin borrar: ${corrida.restos.join(" ")}`);
  return f;
}

/** Borra las carpetas «<id>-…» que dejaron las corridas (ya listadas en las fallas si eran de HEAD) y lo declara en stderr. */
function borrarRestos(id, restos) {
  const nombres = [...new Set(restos)].filter((d) => existsSync(join(tmpdir(), d)));
  if (!nombres.length) return;
  for (const d of nombres) rmSync(join(tmpdir(), d), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.error(`${id} · carpetas temporales borradas: ${nombres.join(" ")}`);
}

/** Devuelve { fallas: string[], tabla: string } para una orden. C2 (VERDAD-04): todas las fallas, no sólo la primera. */
function verificar(id) {
  const hoja = `tests/orden/${id}/HOJA.md`;
  const rojos = git(["log", "--format=%H", "--diff-filter=A", rama(), "--", hoja]).split("\n").filter(Boolean);
  const rojo = rojos[0];
  if (!rojo) return { fallas: [`${id}: sin commit rojo (ningún commit de ${rama()} añade ${hoja})`] };
  const head = git(["rev-parse", "HEAD"]);
  const esperadas = afirmaciones(id);
  const nuncaEnRojo = (corrida) => esperadas.filter((a) => corrida.ok.has(a.frase)).map((a) => `${id}: ${a.frase}: nunca estuvo en rojo (pasa en el árbol de ${rojo.slice(0, 7)})`);
  if (rojo === head) {
    // A3 (VERDAD-03): el rojo es HEAD → «rojo pendiente de B»: una sola corrida, en el repo; nadie pasa y los nombres coinciden.
    const enRojo = correr(REPO, id);
    const fallas = [...fallasDeNombres(id, esperadas, enRojo), ...nuncaEnRojo(enRojo)];
    borrarRestos(id, enRojo.restos);
    return fallas.length ? { fallas } : { fallas: [], tabla: `${id} · rojo pendiente de B\n` };
  }
  const fallas = [];
  const tocados = git(["diff", "--name-only", rojo, head, "--", `tests/orden/${id}/`]).split("\n").filter(Boolean);
  if (tocados.length) fallas.push(`${id}: tests/orden/${id}/ cambió entre el rojo ${rojo.slice(0, 7)} y HEAD ${head.slice(0, 7)}:\n  ${tocados.join("\n  ")}`);
  const enHead = correr(REPO, id);
  fallas.push(...fallasDeNombres(id, esperadas, enHead));
  if (enHead.mal.size) fallas.push(`${id}: tests que fallan en HEAD ${head.slice(0, 7)}:\n  ${[...enHead.mal].join("\n  ")}`);
  const enRojo = conArbolRojo(rojo, (dir) => correr(dir, id)); // se corre aunque HEAD falle
  fallas.push(...nuncaEnRojo(enRojo));
  borrarRestos(id, [...enHead.restos, ...enRojo.restos]);
  if (fallas.length) return { fallas };
  const verde = git(["log", "-1", "--format=%H", head, "--", ".", `:(exclude)tests/orden/${id}`]) || head;
  const tabla = esperadas.map((a) => `[${a.id}] ${a.frase} · rojo en ${rojo.slice(0, 7)} · verde en ${verde.slice(0, 7)}`).join("\n");
  const anteriores = rojos.length > 1 ? `rojos anteriores: ${rojos.slice(1).map((s) => s.slice(0, 7)).join(" ")}\n` : "";
  return { fallas: [], tabla: `orden ${id} · ${ETIQUETA} · ${esperadas.length} tests\n${tabla}\n${anteriores}` };
}

function main() {
  let ids, retiradas = new Map();
  if (argv.includes("--todas")) {
    try { ids = git(["ls-tree", "--name-only", "-d", "HEAD:tests/orden/"]).split("\n").filter(Boolean); } catch { ids = []; } // sin tests/orden/ en HEAD: nada que verificar
    retiradas = aprobadas();
  } else {
    const id = opt("--orden");
    if (!id) { console.error("uso: rojo-verde.mjs --orden <id> [--repo <ruta>] | --todas"); return 2; }
    ids = [id];
  }
  let salida = "", fallas = [];
  for (const id of ids) {
    if (retiradas.has(id)) { salida += `${id} · retirada (aprobada ${retiradas.get(id)})\n`; continue; }
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
