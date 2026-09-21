// Utilidades de la orden VERDAD-06 (sesión A, 2026-09-21). Reusa de ../verdad-02/_util.ts y ../verdad-05/_util.ts lo que no cambia
// (repos temporales con nombre real, spawnSync, lectura de CLAUDE.md). Caja negra: nada importa tools/*; el candado se lanza por stdin
// en proceso aparte. Toda carpeta temporal se crea con `conTemporal()` (prefijo «verdad-06-») y se borra en `finally`, también si el
// test falla. Un mismo archivo en T y en H (cmp → 0): lo que sólo usa un repo (npmEn con tsx en T) es inofensivo en el otro.
// `git` de verdad-02 antepone `-c core.autocrlf=false` (repos temporales); C1, C2 y C3 miden la configuración REAL de la máquina y
// usan `gitCrudo` (sin ningún -c): con `git` el `--get core.autocrlf` daría «false» hoy y el test pasaría por el motivo equivocado.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { NODE, ROOT, borrar, type Salida } from "../verdad-02/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, bloqueContrato, borrar, correr, git, repoTemporal, seccionPuertas } from "../verdad-02/_util.ts";
export { correrLargo } from "../verdad-05/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de CONEXION-01 en cada repo (Liam, 2026-09-21) y último rojo de su carpeta (ed14731 en T = A2; 30b61ab en H). */
export const CONEXION_01 = { aprobado: { T: "fdf0ca2", H: "3132b22" }, rojo: { T: "ed14731", H: "30b61ab" } };

/** Carpeta temporal de esta orden: prefijo «verdad-06-» en os.tmpdir() (rojo-verde mide los restos por ese prefijo, VERDAD-03 D1). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "verdad-06-"));
}

/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** git tal cual está configurado en la máquina (sin `-c`, sin identidad): lo que ve Liam. Falla → lanza con stderr. */
export function gitCrudo(cwd: string, ...args: string[]): string {
  const env = { ...process.env };
  for (const k of ["GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE", "GIT_PREFIX"]) delete env[k]; // heredadas de un hook, desvían el git
  const r = spawnSync("git", args, { cwd, env, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} en ${cwd} → exit ${r.status}\n${r.stderr}`);
  return r.stdout.replace(/\r?\n$/, "");
}

/** `npm <args>` / `npx <args>` en `cwd` (shell: en Windows son .cmd). Devuelve exit code y salidas; no lanza. */
export function npmEn(cwd: string, bin: "npm" | "npx", args: string[], timeout = 600000): Salida {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // un runner anidado heredaría la marca de hijo y se saltaría los archivos
  const r = spawnSync(bin, args, { cwd, env, encoding: "utf8", shell: true, timeout, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** Clon limpio del repo real en <base>/clon con la configuración de git de la máquina (sin -c) y `npm run prepare` (lo que haría
 *  `npm install`); con `enlazar`, un junction (fs.symlinkSync tipo "junction" = `mklink /J`) a node_modules del repo real: nada se
 *  instala y `borrar(base)` quita el enlace sin entrar en él (probado: rmSync no sigue junctions). */
export function clonar(base: string, enlazar = false): string {
  const clon = join(base, "clon");
  gitCrudo(base, "clone", "-q", ROOT, clon);
  if (enlazar) symlinkSync(resolve(ROOT, "node_modules"), join(clon, "node_modules"), "junction");
  const p = npmEn(clon, "npm", ["run", "prepare", "--silent"], 120000);
  if (p.status !== 0) throw new Error(`npm run prepare en el clon → exit ${p.status}\n${p.out}`);
  return clon;
}

/** Quita el junction a node_modules (si existe) antes de borrar el clon: nunca se entra en el node_modules real. */
export function desenlazar(clon: string): void {
  try { rmSync(join(clon, "node_modules")); } catch { /* no había enlace */ }
}

/** sha256 hex de un archivo. */
export const sha256 = (archivo: string) => createHash("sha256").update(readFileSync(archivo)).digest("hex");

/** tools/candado.mjs del repo real con el JSON que le manda Claude Code (tool_name, tool_input, cwd), tal cual; `env` añade variables
 *  del entorno del hook (HIGIENE_ROOT, HIGIENE_PERMITIR_TESTS). No escribe nada: el candado sólo inspecciona. */
export function candadoJson(entrada: Record<string, unknown>, env: Record<string, string | undefined> = {}): Salida {
  const e: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ["HIGIENE_ROOT", "HIGIENE_ROOTS", "HIGIENE_PLAN", "HIGIENE_TRANSCRIPT", "HIGIENE_PERMITIR_TESTS", "HIGIENE_PERMITIR_FLOTA"]) delete e[k];
  for (const [k, v] of Object.entries(env)) { if (v === undefined) delete e[k]; else e[k] = v; }
  const r = spawnSync(NODE, ["tools/candado.mjs"], { cwd: ROOT, env: e, input: JSON.stringify(entrada), encoding: "utf8", timeout: 60000, windowsHide: true });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** Líneas no vacías ni comentario de un bloque ini como Map clave → valor (misma lectura que tests/contrato-hooks.test.ts). */
export function paresIni(bloque: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const linea of bloque.split(/\r?\n/)) {
    if (!linea.trim() || linea.trim().startsWith("#")) continue;
    const [k, ...v] = linea.split("=");
    m.set(k.trim(), v.join("=").trim());
  }
  return m;
}
