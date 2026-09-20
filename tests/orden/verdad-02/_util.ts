// Utilidades compartidas por los tests de la orden VERDAD-02 (sesión A, 2026-09-20).
// Caja negra: aquí no se importa nada de tools/*; todo se lanza con spawnSync y se afirma sobre exit code y salida.
// Repos temporales con nombre real (Barber-shop-template-main / Nichos-hub) para que la etiqueta T/H por sufijo de ruta
// funcione igual que en tools/_git.mjs. Cada test crea y borra los suyos.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../../..");
export const SOY: "T" | "H" = /nichos-hub$/i.test(ROOT.replace(/\\/g, "/")) ? "H" : "T";
export const OTRO: "T" | "H" = SOY === "H" ? "T" : "H";
export const NOMBRE = { T: "Barber-shop-template-main", H: "Nichos-hub" };
export const FIXTURES = resolve(import.meta.dirname, "fixtures");
export const NODE = process.execPath;
/** Sólo pisa fs y console; nada de PLAN/roots/transcript/candado por la sesión que corre los tests. */
const ENV_PROPIO = ["HIGIENE_ROOTS", "HIGIENE_PLAN", "HIGIENE_TRANSCRIPT", "HIGIENE_PERMITIR_TESTS", "HIGIENE_PERMITIR_FLOTA"];

export type Salida = { status: number | null; stdout: string; stderr: string; out: string };

function entorno(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ENV_PROPIO) delete env[k];
  for (const [k, v] of Object.entries(extra)) { if (v === undefined) delete env[k]; else env[k] = v; }
  return env;
}

/** Lanza `node <args>` y devuelve exit code + salidas (stdout, stderr y las dos juntas). */
export function correr(args: string[], o: { cwd?: string; env?: Record<string, string | undefined>; input?: string } = {}): Salida {
  const r = spawnSync(NODE, args, { cwd: o.cwd ?? ROOT, env: entorno(o.env), input: o.input ?? "", encoding: "utf8", timeout: 180000, windowsHide: true });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** git en un directorio dado; identidad fija y sin firma para los repos temporales. Falla → lanza (no se traga). */
export function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=verdad", "-c", "user.email=verdad@prueba", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], { cwd, encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} en ${cwd} → exit ${r.status}\n${r.stderr}`);
  return r.stdout.trim();
}

export type Repo = {
  dir: string;
  git: (...args: string[]) => string;
  /** Escribe archivos (rutas relativas) sin commitear. */
  escribir: (archivos: Record<string, string>) => void;
  /** Escribe + `git add -A` + commit; devuelve el SHA completo. */
  commit: (mensaje: string, archivos?: Record<string, string>) => string;
  push: () => void;
  head: () => string;
};

/** Repo temporal en <base>/<nombre real de T o H>, rama main, un commit base y upstream en un bare vecino (sin él, cierre.mjs vería «sin upstream»). */
export function repoTemporal(etiqueta: "T" | "H", base: string): Repo {
  const dir = join(base, NOMBRE[etiqueta]);
  mkdirSync(dir, { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "core.autocrlf", "false");
  git(dir, "config", "commit.gpgsign", "false");
  git(dir, "config", "user.name", "verdad");
  git(dir, "config", "user.email", "verdad@prueba");
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
    push: () => { git(dir, "push", "-q", "-u", "origin", "main"); },
    head: () => git(dir, "rev-parse", "HEAD"),
  };
  repo.commit("base", { "README.md": `repo temporal ${etiqueta}\n` });
  const bare = `${dir}.git`;
  mkdirSync(bare, { recursive: true });
  git(bare, "init", "-q", "--bare", "-b", "main");
  git(dir, "remote", "add", "origin", bare);
  repo.push();
  return repo;
}

export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "verdad-02-"));
}

export function borrar(dir: string): void {
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

/** PLAN.md temporal cuya fila abierta de § Estado cita los SHAs dados (7 chars), con el formato que lee tools/_git.mjs. */
export function planTemporal(base: string, citas: string[]): string {
  const p = join(base, "PLAN.md");
  const cortas = citas.map((s) => s.slice(0, 7)).join(", ");
  writeFileSync(p, `# PLAN temporal\n\n## Estado\n\n| Bloque | Estado | Pantalla |\n|---|---|---|\n| 0 cerrado | cerrado 2026-09-01 | — |\n| 1 prueba | en curso (${cortas}) | — |\n\n## Otra sección\n\nnada\n`);
  return p;
}

/** Lanza tools/cierre.mjs del repo real con roots, PLAN y transcript sustituidos por entorno (interfaz de la hoja). */
export function cierre(o: { roots: [string, string]; plan: string; transcript?: string; stdin?: Record<string, unknown> }): Salida {
  return correr(["tools/cierre.mjs"], {
    env: { HIGIENE_ROOTS: `${o.roots[0]};${o.roots[1]}`, HIGIENE_PLAN: o.plan, HIGIENE_TRANSCRIPT: o.transcript },
    input: JSON.stringify(o.stdin ?? { hook_event_name: "Stop" }),
  });
}

/** Lanza tools/candado.mjs del repo real con el stdin JSON que le pasa Claude Code. */
export function candado(tool_name: string, file_path: string, env: Record<string, string | undefined> = {}): Salida {
  return correr(["tools/candado.mjs"], { env, input: JSON.stringify({ tool_name, tool_input: { file_path } }) });
}

/** Lanza tools/verdad/rojo-verde.mjs del repo real sobre otro repo (`--repo`). */
export function rojoVerde(orden: string, repo?: string, extra: string[] = []): Salida {
  const args = ["tools/verdad/rojo-verde.mjs", "--orden", orden];
  if (repo) args.push("--repo", repo);
  return correr([...args, ...extra]);
}

export type Uso = { name: string; input: Record<string, unknown> };

/** Transcript JSONL mínimo con la forma que lee el hook Stop: una línea `assistant` por tool_use, con `cwd` de la sesión. */
export function transcriptEnLinea(archivo: string, usos: Uso[], cwd: string): string {
  const lineas = usos.map((u, i) => JSON.stringify({
    parentUuid: null, isSidechain: false, userType: "external", cwd, sessionId: "prueba", version: "0", gitBranch: "main", type: "assistant",
    uuid: `u${i}`, timestamp: "2026-09-20T00:00:00.000Z",
    message: { role: "assistant", type: "message", content: [{ type: "tool_use", id: `toolu_${i}`, name: u.name, input: u.input }] },
  }));
  writeFileSync(archivo, lineas.join("\n") + "\n");
  return archivo;
}

/** Raíces reales en sus grafías: barra invertida escapada n veces (JSON, y JSON dentro de comandos), `C:/…` y `/c/…`. */
const REAL = {
  T: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos\1Barber-shop-template-main/gi, win: /C:\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi },
  H: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos-hub/gi, win: /C:\/Users\/liama\/Desktop\/Nichos-hub/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos-hub/gi },
};
const RESTO = [/desktop[\\/]+nichos-hub/i, /desktop[\\/]+nichos[\\/]+barber-shop-template-main/i];

/** Copia de un fixture real con las raíces T/H reales reubicadas a los repos temporales, en todas sus grafías.
 *  Las líneas del fixture no se tocan en el repo; sólo cambia la raíz para que «en T o H» sea el par temporal que ve cierre.mjs por HIGIENE_ROOTS. */
export function transcriptReubicado(fixture: "lectura" | "escritura", archivo: string, tempT: string, tempH: string): string {
  let texto = readFileSync(join(FIXTURES, `transcript-${fixture}.jsonl`), "utf8");
  for (const [et, dir] of [["T", tempT], ["H", tempH]] as const) {
    const segmentos = dir.replace(/\//g, "\\").split("\\");
    const win = segmentos.join("/");
    const msys = win.replace(/^([A-Za-z]):\//, (_, l) => `/${l.toLowerCase()}/`);
    texto = texto.replace(REAL[et].esc, (_, sep) => segmentos.join(sep)).replace(REAL[et].win, win).replace(REAL[et].msys, msys);
  }
  const resto = RESTO.find((re) => re.test(texto));
  if (resto) throw new Error(`quedó una raíz real sin reubicar en el fixture ${fixture}: ${resto}`);
  writeFileSync(archivo, texto);
  return archivo;
}

/** Cuenta los tool_use de un transcript por nombre (para citar en los tests lo que el fixture contiene de verdad). */
export function usosDe(archivo: string): Uso[] {
  const usos: Uso[] = [];
  for (const linea of readFileSync(archivo, "utf8").split("\n")) {
    if (!linea.trim()) continue;
    const o = JSON.parse(linea);
    if (o.type !== "assistant") continue;
    for (const c of o.message.content) if (c.type === "tool_use") usos.push({ name: c.name, input: c.input ?? {} });
  }
  return usos;
}

/** HOJA.md mínima con el formato real: `- [ID] (repo) frase · fuente: …`. */
export function hojaMinima(afirmaciones: [string, string, string][]): string {
  return `# HOJA · prueba · 2026-09-20\n\nFormato: cada afirmación es una línea \`- [ID] (repo) frase · fuente: …\`.\n\n## A · Prueba\n\n${afirmaciones.map(([id, repo, frase]) => `- [${id}] (${repo}) ${frase} · fuente: prueba.`).join("\n")}\n`;
}

/** Archivo de test para el repo temporal: cada test pasa sólo si existe <raíz del repo>/<archivo>; `null` = pasa siempre. */
export function testMinimo(tests: [string, string | null][]): string {
  const cuerpo = tests.map(([nombre, archivo]) => archivo === null
    ? `test(${JSON.stringify(nombre)}, () => { assert.ok(true); });`
    : `test(${JSON.stringify(nombre)}, () => { assert.ok(existsSync(resolve(import.meta.dirname, "../../..", ${JSON.stringify(archivo)})), "falta ${archivo}"); });`).join("\n");
  return `import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { existsSync } from "node:fs";\nimport { resolve } from "node:path";\n\n${cuerpo}\n`;
}

/** Sección «## Puertas automáticas…» de CLAUDE.md del repo real (hasta el siguiente «## »). */
export function seccionPuertas(): string {
  const texto = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8");
  const i = texto.search(/^## Puertas automáticas/m);
  if (i < 0) throw new Error("CLAUDE.md sin sección «## Puertas automáticas»");
  const resto = texto.slice(i + 3);
  const j = resto.search(/^## /m);
  return j < 0 ? resto : resto.slice(0, j);
}

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en CLAUDE.md del repo real. */
export function bloqueContrato(): string {
  const m = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8").match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}
