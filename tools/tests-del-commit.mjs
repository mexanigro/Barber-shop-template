// VELOCIDAD-01 (2026-10-27, D-387, D-389, D-391) · lo que corre el pre-commit: `npm run test:commit`. Byte a byte igual en T y H.
// Mira los archivos del commit (`git diff --cached`) y corre, en orden, cortando en la primera caída:
//   1. `test:unit` (T) o `npm test` (H, sin test:unit): sin las copias del mecanismo, que viven en `test:verdad`;
//   2. `test:verdad`, sólo si el commit toca `tools/` o `.githooks/`;
//   3. de `test:browser` (T), los archivos que el commit cambia y los que NOMBRAN un archivo cambiado de `src/` (su nombre con
//      extensión, o su carpeta y su nombre sin extensión: `services/services-v6`);
//   4. los tests de cada orden viva (sin línea en APROBADAS.md) cuyo HOJA.md ya está en HEAD y cuya carpeta el commit no toca, sin las
//      afirmaciones «, webs», como `rojo-verde --todas`: el commit que escribe o corrige un rojo no los corre (tienen que fallar; lo
//      comprueba el pre-push).
// La batería entera (`npm test` + `npm run test:verdad`) la corren la sesión que cierra la orden y la verificadora (inciso af).
// ponytail: «nombrar» es una búsqueda de texto. Techo: un test de navegador que monta la página entera sin nombrar el archivo cambiado
// no corre aquí; lo corre la batería entera del cierre. Si eso deja pasar algo, el arreglo es un mapa de imports, no más texto.
// `--plan`: imprime la elección en JSON (una línea) y sale 0 sin correr nada.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const archivosDe = (s) => String(s ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).filter((t) => t.endsWith(".test.ts"));
const literal = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Lo que nombra un test para referirse a un archivo de src/: «services-v6.tsx» y «services/services-v6». */
function nombres(f) {
  const stem = basename(f, extname(f));
  return [basename(f), `${basename(dirname(f))}/${stem}`];
}

/** La elección, pura. ordenes: [{ id, aprobada, rojoEnHead, tests, webs }]; contenido(archivo) → texto de un test de navegador. */
export function seleccion({ cambiados, scripts, ordenes, contenido }) {
  const verdad = cambiados.some((f) => f.startsWith("tools/") || f.startsWith(".githooks/"));
  const src = cambiados.filter((f) => f.startsWith("src/")).flatMap(nombres);
  const navegador = archivosDe(scripts["test:browser"]).filter((f) => cambiados.includes(f) || src.some((n) => contenido(f).includes(n)));
  const vivas = ordenes
    .filter((o) => !o.aprobada && o.rojoEnHead && o.tests.length && !cambiados.some((f) => f.startsWith(`tests/orden/${o.id}/`)))
    .map((o) => ({ id: o.id, tests: o.tests, saltar: o.webs }));
  return { base: scripts["test:unit"] ? "test:unit" : "test", verdad, navegador, ordenes: vivas };
}

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
const enHead = (ruta) => {
  try { execFileSync("git", ["cat-file", "-e", `HEAD:${ruta}`], { cwd: ROOT, stdio: "ignore", windowsHide: true }); return true; } catch { return false; }
};

function ordenesDelDisco() {
  const dir = join(ROOT, "tests/orden");
  if (!existsSync(dir)) return [];
  const aprobadas = existsSync(join(dir, "APROBADAS.md")) ? readFileSync(join(dir, "APROBADAS.md"), "utf8") : "";
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map(({ name: id }) => {
    const hoja = existsSync(join(dir, id, "HOJA.md")) ? readFileSync(join(dir, id, "HOJA.md"), "utf8") : "";
    const webs = [...hoja.matchAll(/^- \[[^\]]+\] \((?:T\+H|T|H), webs\) (.+?) · fuente:/gm)].map((m) => m[1]);
    return {
      id, webs,
      aprobada: new RegExp(`^- ${literal(id)} · aprobada \\d{4}-\\d{2}-\\d{2}`, "m").test(aprobadas),
      rojoEnHead: enHead(`tests/orden/${id}/HOJA.md`),
      tests: readdirSync(join(dir, id)).filter((f) => f.endsWith(".test.ts")).sort().map((f) => `tests/orden/${id}/${f}`),
    };
  });
}

function main() {
  const cambiados = git(["diff", "--cached", "--name-only", "-z"]).split("\0").filter(Boolean);
  const scripts = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts ?? {};
  const plan = seleccion({ cambiados, scripts, ordenes: ordenesDelDisco(), contenido: (f) => readFileSync(join(ROOT, f), "utf8") });
  if (process.argv.includes("--plan")) { console.log(JSON.stringify(plan)); return 0; }

  // Los hijos no heredan el índice del hook: los tests que arman repos temporales usan su propio git (VERDAD-03 D2).
  const env = { ...process.env };
  for (const k of ["GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE", "GIT_PREFIX"]) delete env[k];
  const pasos = [[`npm run ${plan.base}`, "npm", ["run", plan.base, "--silent"], true]];
  if (plan.verdad) pasos.push(["npm run test:verdad", "npm", ["run", "test:verdad", "--silent"], true]);
  if (plan.navegador.length) {
    const prefijo = String(scripts["test:browser"]).split(/\s+/).filter((t) => t && !t.endsWith(".test.ts"));
    pasos.push([`test:browser · ${plan.navegador.join(" ")}`, "npx", [...prefijo, ...plan.navegador], true]);
  }
  for (const o of plan.ordenes) {
    const saltos = o.saltar.map((f) => `--test-skip-pattern=^${literal(f)}$`);
    pasos.push([`orden viva ${o.id}${o.saltar.length ? ` (sin ${o.saltar.length} «, webs»)` : ""}`, process.execPath, ["--experimental-strip-types", "--test", ...saltos, ...o.tests], false]);
  }
  const inicio = Date.now();
  for (const [titulo, cmd, args, shell] of pasos) {
    const t0 = Date.now();
    console.log(`[test:commit] ${titulo}`);
    // shell en npm/npx: en Windows son .cmd. Los argumentos con espacios (los saltos) van sin shell.
    const r = spawnSync(cmd, args, { cwd: ROOT, env, stdio: "inherit", shell, windowsHide: true });
    console.log(`[test:commit] ${titulo} · exit ${r.status} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    if (r.status !== 0) return r.status || 1;
  }
  console.log(`[test:commit] verde · ${pasos.length} pasos · ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) process.exitCode = main();
