// Utilidades de la orden VERDAD-09 (sesión A, 2026-09-22). COPIADAS, no importadas: esta carpeta no depende de ninguna otra
// `tests/orden/<id>/` (todas están congeladas y esta orden afirma que la de verdad-02 y la de verdad-08 no cambian; importarlas
// ataría esta orden a lo que aquéllas declaren). El patrón es el de verdad-08 (repos temporales con el nombre real de T/H,
// spawnSync, reproducción de HEAD en un repo temporal, toda carpeta temporal con prefijo «verdad-09-» y borrada en `finally`,
// también si el test falla) más el clon de verdad-06 A1 (junction a node_modules, `npm run prepare`, sin instalar nada).
// Caja negra: nada de tools/* se importa; los hooks y rojo-verde se lanzan en proceso aparte (y si alguna vez hiciera falta, con
// `import()` dinámico DENTRO del test: la reproducción de HEAD de las órdenes anteriores copia sólo `tests/orden/`).
// Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el otro repo se lee por ruta fija (`RUTA`).
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../../..");
export const NODE = process.execPath;
export const NOMBRE = { T: "Barber-shop-template-main", H: "Nichos-hub" };
/** Raíces reales por ruta fija (como hueco.mjs): el repo propio es ROOT; el otro se lee de aquí. */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub" };
const SOY: "T" | "H" = /nichos-hub$/i.test(ROOT.replace(/\\/g, "/")) ? "H" : "T";

/** Repo propio: el `name` de package.json (sobrevive al clon de rojo-verde), si no la ruta. */
function repoPropio(): "T" | "H" {
  try {
    const nombre = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).name;
    if (nombre === "nichos-hub") return "H";
    if (nombre === "react-example") return "T";
  } catch { /* sin package.json */ }
  return SOY;
}
export const REPO = repoPropio();
export const RAIZ_T = REPO === "T" ? ROOT : RUTA.T;
export const RAIZ_H = REPO === "H" ? ROOT : RUTA.H;

/** Commit aprobado de VERDAD-08 en cada repo (Liam, 2026-09-22) y último rojo de su carpeta (A2 en T). */
export const VERDAD_08 = { aprobado: { T: "139a2f8", H: "5737d30" }, rojo: { T: "519a892", H: "bd6e61f" } };
/** Commit rojo de VERDAD-02 en cada repo: desde ahí su carpeta está congelada. */
export const VERDAD_02_ROJO = { T: "396aeed", H: "047972c" };
/** Copias promovidas que corren el candado y que A2 corre con el permiso abierto. */
export const COPIAS_B = ["tests/verdad-02-b.test.ts", "tests/verdad-03-b.test.ts", "tests/verdad-06-b.test.ts", "tests/verdad-07-b.test.ts"];
/** Nombre del test de paridad de `tools/` en la copia promovida `tests/verdad-02-c.test.ts` (B1 lo selecciona por patrón). */
export const PATRON_PARIDAD = "son idénticos byte a byte en T y en H";

export type Salida = { status: number | null; stdout: string; stderr: string; out: string };

/** Sólo pisa lo que el test fija: ni las HIGIENE_ ni las GIT_ de la sesión que corre los tests (ni las de un hook de git). */
const ENV_PROPIO = ["HIGIENE_ROOT", "HIGIENE_ROOTS", "HIGIENE_PLAN", "HIGIENE_TRANSCRIPT", "HIGIENE_PERMITIR_TESTS", "HIGIENE_PERMITIR_FLOTA", "GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE", "GIT_PREFIX"];

function entorno(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ENV_PROPIO) delete env[k];
  delete env.NODE_TEST_CONTEXT; // un runner anidado heredaría la marca de hijo y se saltaría los archivos
  // npm llama a module.enableCompileCache() y deja `<TEMP>/node-compile-cache`: con el TEMP propio de cada corrida (D-53) eso es
  // un resto y rojo-verde lo cuenta como falla. Ningún hijo de estos tests escribe caché de compilación.
  env.NODE_DISABLE_COMPILE_CACHE = "1";
  for (const [k, v] of Object.entries(extra)) { if (v === undefined) delete env[k]; else env[k] = v; }
  return env;
}

/** `node <args>`: exit code y salidas. */
export function correr(args: string[], o: { cwd?: string; env?: Record<string, string | undefined>; input?: string; timeout?: number } = {}): Salida {
  const r = spawnSync(NODE, args, { cwd: o.cwd ?? ROOT, env: entorno(o.env), input: o.input ?? "", encoding: "utf8", timeout: o.timeout ?? 180000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** Diez minutos: rojo-verde clona y las copias `b` levantan repos temporales. */
export const correrLargo = (args: string[], o: { cwd?: string; env?: Record<string, string | undefined> } = {}): Salida => correr(args, { ...o, timeout: 600000 });

/** `node --experimental-strip-types --test <archivos>` dentro de `cwd` (el runner del circuito). */
export const correrTests = (cwd: string, archivos: string[], env: Record<string, string | undefined> = {}): Salida =>
  correrLargo(["--experimental-strip-types", "--test", ...archivos], { cwd, env });

/** `npm <args>` / `npx <args>` en `cwd` (en Windows son .cmd: shell). No lanza. */
export function npmEn(cwd: string, bin: "npm" | "npx", args: string[], timeout = 600000): Salida {
  const r = spawnSync(bin, args, { cwd, env: entorno(), encoding: "utf8", shell: true, timeout, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** git en un directorio dado; identidad fija y sin firma para los repos temporales. Falla → lanza. */
export function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=verdad", "-c", "user.email=verdad@prueba", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], { cwd, env: entorno(), encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} en ${cwd} → exit ${r.status}\n${r.stderr}`);
  return r.stdout.replace(/\r?\n$/, "");
}

/** git tal cual está configurado en la máquina (sin `-c`): lo que ve Liam; el clon se hace así (verdad-06 A1). */
export function gitCrudo(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", args, { cwd, env: entorno(), encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} en ${cwd} → exit ${r.status}\n${r.stderr}`);
  return r.stdout.replace(/\r?\n$/, "");
}

export const borrar = (dir: string): void => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

/** Carpeta temporal de esta orden: prefijo «verdad-09-» en os.tmpdir(). */
export const carpetaTemporal = (): string => mkdtempSync(join(tmpdir(), "verdad-09-"));

/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Clon del repo real en <base>/clon con la configuración de git de la máquina y `npm run prepare` (lo que haría `npm install`);
 *  `node_modules` por junction al del repo real (nada se instala) y `desenlazar()` lo quita antes de borrar. */
export function clonar(base: string): string {
  const clon = join(base, "clon");
  gitCrudo(base, "clone", "-q", ROOT, clon);
  symlinkSync(resolve(ROOT, "node_modules"), join(clon, "node_modules"), "junction");
  const p = npmEn(clon, "npm", ["run", "prepare", "--silent"], 180000);
  if (p.status !== 0) throw new Error(`npm run prepare en el clon → exit ${p.status}\n${p.out}`);
  return clon;
}

/** Quita el junction a node_modules (si existe) antes de borrar el clon: nunca se entra en el node_modules real. */
export function desenlazar(clon: string): void {
  try { rmSync(join(clon, "node_modules")); } catch { /* no había enlace */ }
}

export type Repo = {
  dir: string;
  git: (...args: string[]) => string;
  escribir: (archivos: Record<string, string>) => void;
  commit: (mensaje: string, archivos?: Record<string, string>) => string;
  head: () => string;
};

/** Repo temporal en <base>/<nombre real de T o H>, rama main, un commit base y upstream en un bare vecino. */
export function repoTemporal(etiqueta: "T" | "H", base: string): Repo {
  const dir = join(base, NOMBRE[etiqueta]);
  mkdirSync(dir, { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "core.autocrlf", "false");
  git(dir, "config", "commit.gpgsign", "false");
  const repo: Repo = {
    dir,
    git: (...args) => git(dir, ...args),
    escribir: (archivos) => {
      for (const [rel, contenido] of Object.entries(archivos)) {
        const abs = join(dir, rel);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, contenido);
      }
    },
    commit: (mensaje, archivos = {}) => {
      repo.escribir(archivos);
      git(dir, "add", "-A");
      git(dir, "commit", "-q", "-m", mensaje);
      return git(dir, "rev-parse", "HEAD");
    },
    head: () => git(dir, "rev-parse", "HEAD"),
  };
  repo.commit("base", { "README.md": `repo temporal ${etiqueta}\n` });
  const bare = `${dir}.git`;
  mkdirSync(bare, { recursive: true });
  git(bare, "init", "-q", "--bare", "-b", "main");
  git(dir, "remote", "add", "origin", bare);
  git(dir, "push", "-q", "-u", "origin", "main");
  return repo;
}

/** Copia `tools/_transcript.mjs` y `tools/cierre.mjs` del repo real al repo temporal (lo que compara el guard de paridad). */
export function copiarTools(repo: Repo): void {
  mkdirSync(join(repo.dir, "tools"), { recursive: true });
  for (const f of ["tools/_transcript.mjs", "tools/cierre.mjs"]) copyFileSync(resolve(ROOT, f), join(repo.dir, f));
}

/** APROBADAS.md con el formato real (una línea por orden retirada). */
export const aprobadasMinima = (ids: string[] = ["vieja-01"]): string =>
  `# Órdenes aprobadas por Liam\n\n${ids.map((id) => `- ${id} · aprobada 2026-09-20 · T 0000000 · H 0000000`).join("\n")}\n`;

/** HOJA.md mínima con el formato real: `- [ID] (repo) frase · fuente: …`. */
export const hojaMinima = (frase: string): string =>
  `# HOJA · prueba · 2026-09-22\n\nFormato: cada afirmación es una línea \`- [ID] (repo) frase · fuente: …\`.\n\n## A · Prueba\n\n- [A1] (T+H) ${frase} · fuente: prueba.\n`;

/** Test de una orden temporal: pasa sólo si existe `verde.txt` en la raíz (rojo mientras no lo haya). */
export const testMinimo = (frase: string): string => `import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

test(${JSON.stringify(frase)}, () => {
  assert.ok(existsSync(resolve(import.meta.dirname, "../../..", "verde.txt")), "verde.txt sólo existe en el árbol verde");
});
`;

/** Repo temporal con la orden `<id>` viva (HOJA.md + a.test.ts en el último commit: «rojo pendiente de B»), APROBADAS.md y
 *  `node_modules/verdad-09-marca/` propio (rojo-verde lo enlaza por junction en el clon neutro). */
export function repoConOrdenViva(base: string, id: string, frase: string): Repo {
  const repo = repoTemporal(REPO, base);
  const marca = join(repo.dir, "node_modules", "verdad-09-marca");
  mkdirSync(marca, { recursive: true });
  writeFileSync(join(marca, "index.js"), "module.exports = 'verdad-09';\n");
  repo.commit(`rojo ${id}`, {
    ".gitignore": "node_modules/\n",
    "tests/orden/APROBADAS.md": aprobadasMinima(),
    [`tests/orden/${id}/HOJA.md`]: hojaMinima(frase),
    [`tests/orden/${id}/a.test.ts`]: testMinimo(frase),
  });
  return repo;
}

/** Reproducción de HEAD del repo real en un repo temporal: tests/orden/APROBADAS.md y tests/orden/<id>/ de todas las órdenes de
 *  HEAD menos las excluidas (verdad-09 se correría a sí misma sin fin), tal cual (git show), en un solo commit. */
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

/** `node tools/verdad/rojo-verde.mjs --todas --repo <repo>` del repo real sobre otro repo. */
export const rojoVerdeTodas = (repo: string): Salida => correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo]);

/** El guard de paridad de `tests/verdad-02-c.test.ts` del repo real, con las dos raíces sustituidas por repos temporales. */
export const paridad = (roots: [string, string]): Salida =>
  correrLargo(["--experimental-strip-types", "--test", "--test-name-pattern", PATRON_PARIDAD, "tests/verdad-02-c.test.ts"], { env: { HIGIENE_ROOTS: `${roots[0]};${roots[1]}` } });

/** Archivos `tests/*.test.ts` del repo propio (las copias promovidas y los guards), en orden. */
export const testsDelRepo = (): string[] => readdirSync(resolve(ROOT, "tests")).filter((f) => f.endsWith(".test.ts")).sort().map((f) => `tests/${f}`);

export const leer = (rel: string): string => readFileSync(resolve(ROOT, rel), "utf8");

/** Última línea no vacía de un texto. */
export const ultimaLinea = (texto: string): string => texto.split(/\r?\n/).filter((l) => l.trim() !== "").at(-1) ?? "";

/** Cuenta los `test(` de un archivo, incluidos los guardados por repo (`if (REPO === "H") test(`). */
export const cuentaTests = (fuente: string) => (fuente.match(/^(?:if \([^)]*\) )?test\(/gm) ?? []).length;

/** Sección «## <título>» de un CLAUDE.md (hasta el siguiente «## »). */
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
