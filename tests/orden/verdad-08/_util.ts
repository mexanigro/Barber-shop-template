// Utilidades de la orden VERDAD-08 (sesión A, 2026-09-22). COPIADAS, no importadas: esta carpeta no depende de ninguna otra
// `tests/orden/<id>/` (todas están congeladas y A2 afirma que su `_util.ts` no cambia; importarlas ataría esta orden a lo que
// aquella declare). El patrón es el de verdad-07: repos temporales con el nombre real de T/H, spawnSync, candado por stdin,
// cierre con raíces y PLAN por entorno, reproducción de HEAD en un repo temporal, toda carpeta temporal con prefijo
// «verdad-08-» y borrada en `finally`, también si el test falla.
// Caja negra salvo lo que la HOJA § Interfaz fija: B1 importa `segmentos` de tools/_transcript.mjs y `vetoShell` de
// tools/candado.mjs; C1 importa `escrituraShell` de tools/_transcript.mjs. Nada más de tools/*, src/* ni scripts/*.
// Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo va por `REPO`; el otro repo se lee por ruta fija (`RUTA`).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../../..");
export const NODE = process.execPath;
export const NOMBRE = { T: "Barber-shop-template-main", H: "Nichos-hub" };
/** Raíces reales por ruta fija (como hueco.mjs): el repo propio es ROOT; el otro se lee de aquí. */
export const RUTA = { T: "C:/Users/liama/Desktop/Nichos/Barber-shop-template-main", H: "C:/Users/liama/Desktop/Nichos-hub" };
const SOY: "T" | "H" = /nichos-hub$/i.test(ROOT.replace(/\\/g, "/")) ? "H" : "T";

/** Repo propio: el `name` de package.json (sobrevive al clon neutro de rojo-verde), si no la ruta. */
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

/** Commit aprobado de CONEXION-04 en cada repo (Liam, 2026-09-22) y último rojo de su carpeta. */
export const CONEXION_04 = { aprobado: { T: "4a22d7b", H: "f8bd9bb" }, rojo: { T: "47490a2", H: "00b4fe0" } };
/** Lista de `npm test` de T congelada en el commit que abre esta orden (D1 la lee por `git show`). */
export const T_BASE = "1398730";

export type Salida = { status: number | null; stdout: string; stderr: string; out: string };

/** Sólo pisa lo que el test fija: ni las HIGIENE_ ni las GIT_ de la sesión que corre los tests (ni las de un hook de git). */
const ENV_PROPIO = ["HIGIENE_ROOT", "HIGIENE_ROOTS", "HIGIENE_PLAN", "HIGIENE_TRANSCRIPT", "HIGIENE_PERMITIR_TESTS", "HIGIENE_PERMITIR_FLOTA", "GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE", "GIT_PREFIX"];

function entorno(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ENV_PROPIO) delete env[k];
  for (const [k, v] of Object.entries(extra)) { if (v === undefined) delete env[k]; else env[k] = v; }
  return env;
}

/** `node <args>`: exit code y salidas. `input` es el stdin (los hooks lo leen). */
export function correr(args: string[], o: { cwd?: string; env?: Record<string, string | undefined>; input?: string; timeout?: number } = {}): Salida {
  const r = spawnSync(NODE, args, { cwd: o.cwd ?? ROOT, env: entorno(o.env), input: o.input ?? "", encoding: "utf8", timeout: o.timeout ?? 180000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const stdout = r.stdout ?? "", stderr = r.stderr ?? "";
  return { status: r.status, stdout, stderr, out: `${stdout}\n${stderr}` };
}

/** Diez minutos: rojo-verde clona. */
export const correrLargo = (args: string[], o: { cwd?: string; env?: Record<string, string | undefined> } = {}): Salida => correr(args, { ...o, timeout: 600000 });

/** git en un directorio dado; identidad fija y sin firma para los repos temporales. Falla → lanza. */
export function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", ["-c", "user.name=verdad", "-c", "user.email=verdad@prueba", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], { cwd, env: entorno(), encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} en ${cwd} → exit ${r.status}\n${r.stderr}`);
  return r.stdout.replace(/\r?\n$/, "");
}

export type Repo = {
  dir: string;
  git: (...args: string[]) => string;
  escribir: (archivos: Record<string, string>) => void;
  commit: (mensaje: string, archivos?: Record<string, string>) => string;
  head: () => string;
};

/** Repo temporal en <base>/<nombre real de T o H>, rama main, un commit base y upstream en un bare vecino (sin él, cierre.mjs vería «sin upstream»). */
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

/** Forma comparable de una ruta (como `norm` de tools/_transcript.mjs). */
export const norm = (p: string) => String(p ?? "").replace(/\\/g, "/").toLowerCase().replace(/^\/([a-z])\//, "$1:/").replace(/\/+$/, "");

export const borrar = (dir: string): void => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

/** Carpeta temporal de esta orden: prefijo «verdad-08-» en os.tmpdir(). */
export const carpetaTemporal = (): string => mkdtempSync(join(tmpdir(), "verdad-08-"));

/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** HOJA.md mínima con el formato real: `- [ID] (repo) frase · fuente: …`. */
export function hojaMinima(afirmaciones: [string, string, string][]): string {
  return `# HOJA · prueba · 2026-09-22\n\nFormato: cada afirmación es una línea \`- [ID] (repo) frase · fuente: …\`.\n\n## A · Prueba\n\n${afirmaciones.map(([id, repo, frase]) => `- [${id}] (${repo}) ${frase} · fuente: prueba.`).join("\n")}\n`;
}

/** PLAN.md temporal cuya fila abierta de § Estado cita los SHAs dados (7 chars), con el formato que lee tools/_git.mjs. */
export function planTemporal(base: string, citas: string[]): string {
  const p = join(base, "PLAN.md");
  const cortas = citas.map((s) => s.slice(0, 7)).join(", ");
  writeFileSync(p, `# PLAN temporal\n\n## Estado\n\n| Bloque | Estado | Pantalla |\n|---|---|---|\n| 0 cerrado | cerrado 2026-09-01 | — |\n| 1 prueba | en curso (${cortas}) | — |\n\n## Otra sección\n\nnada\n`);
  return p;
}

/** Par temporal T/H limpio, con upstream y PLAN que cita los dos HEAD. */
export function par(base: string): { T: Repo; H: Repo; plan: string; roots: [string, string] } {
  const T = repoTemporal("T", base), H = repoTemporal("H", base);
  return { T, H, plan: planTemporal(base, [T.head(), H.head()]), roots: [T.dir, H.dir] };
}

/** tools/candado.mjs del repo real con el stdin JSON que le pasa Claude Code. */
export const candadoJson = (entrada: Record<string, unknown>, env: Record<string, string | undefined> = {}): Salida =>
  correr(["tools/candado.mjs"], { env, input: JSON.stringify(entrada), timeout: 60000 });

/** tools/cierre.mjs del repo real con raíces, PLAN y transcript sustituidos por entorno. */
export const cierre = (o: { roots: [string, string]; plan: string; transcript?: string; stdin?: Record<string, unknown> }): Salida =>
  correr(["tools/cierre.mjs"], {
    env: { HIGIENE_ROOTS: `${o.roots[0]};${o.roots[1]}`, HIGIENE_PLAN: o.plan, HIGIENE_TRANSCRIPT: o.transcript },
    input: JSON.stringify(o.stdin ?? { hook_event_name: "Stop" }),
  });

/** `node tools/verdad/rojo-verde.mjs --orden <id> --repo <repo>` del repo real sobre otro repo. */
export const rojoVerde = (orden: string, repo: string): Salida => correrLargo(["tools/verdad/rojo-verde.mjs", "--orden", orden, "--repo", repo]);
/** `node tools/verdad/rojo-verde.mjs --todas --repo <repo>` del repo real sobre otro repo. */
export const rojoVerdeTodas = (repo: string): Salida => correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo]);

/** Fuente del test de la orden del fixture (A1/A2): anota el entorno temporal de la corrida y, con `ajenas`, deja el resto propio
 *  `<os.tmpdir()>/resto-01-marca-…` y las dos carpetas `resto-01-ajena-N` del «otro proceso» en el `<tmpdir>` REAL (ruta absoluta en
 *  el fuente: el clon neutro tiene que escribirlas en el mismo sitio). Pasa sólo en el árbol verde (verde.txt). */
export function fuenteFixture(frase: string, registro: string, ajenas: string | null): string {
  return `import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "../../..");
const REGISTRO = ${JSON.stringify(registro)};
const AJENAS = ${JSON.stringify(ajenas)};

test(${JSON.stringify(frase)}, () => {
  appendFileSync(REGISTRO, JSON.stringify({
    tmpdir: tmpdir(), TEMP: process.env.TEMP ?? null, TMP: process.env.TMP ?? null, TMPDIR: process.env.TMPDIR ?? null,
    verde: existsSync(resolve(RAIZ, "verde.txt")),
  }) + "\\n");
  if (AJENAS) {
    mkdtempSync(join(tmpdir(), "resto-01-marca-"));
    for (const n of [1, 2]) mkdirSync(join(AJENAS, "resto-01-ajena-" + n), { recursive: true });
  }
  assert.ok(existsSync(resolve(RAIZ, "verde.txt")), "verde.txt sólo existe en el árbol verde");
});
`;
}

/** Lo que el fixture anota en cada corrida. */
export type Registro = { tmpdir: string; TEMP: string | null; TMP: string | null; TMPDIR: string | null; verde: boolean };

/** Entradas del registro JSONL (vacío si no existe). */
export function leerRegistro(archivo: string): Registro[] {
  let texto = "";
  try { texto = readFileSync(archivo, "utf8"); } catch { return []; }
  return texto.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l) as Registro);
}

/** Repo temporal con la orden `<id>` en rojo (HOJA.md + a.test.ts) y un commit verde que añade verde.txt; `node_modules/verdad-08-marca/`
 *  propio (rojo-verde lo enlaza por junction en el clon neutro) y .gitignore para no rastrearlo. */
export function repoConOrden(base: string, id: string, frase: string, fuente: string): { repo: Repo; rojo: string } {
  const repo = repoTemporal(REPO, base);
  const marca = join(repo.dir, "node_modules", "verdad-08-marca");
  mkdirSync(marca, { recursive: true });
  writeFileSync(join(marca, "index.js"), "module.exports = 'verdad-08';\n");
  const rojo = repo.commit(`rojo ${id}`, {
    [`tests/orden/${id}/HOJA.md`]: hojaMinima([["A1", "T+H", frase]]),
    [`tests/orden/${id}/a.test.ts`]: fuente,
    ".gitignore": "node_modules/\nregistro.jsonl\n",
  });
  repo.commit(`verde ${id}`, { "verde.txt": "verde\n" });
  return { repo, rojo };
}

/** Reproducción de HEAD del repo real en un repo temporal: tests/orden/APROBADAS.md y tests/orden/<id>/ de todas las órdenes de HEAD
 *  menos las excluidas (verdad-08 se correría a sí misma sin fin), tal cual (git show), en un solo commit. */
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

// Transcript de una línea con las claves de un JSONL real de Claude Code (D-4; la HOJA § Interfaz lo permite: «se reproduce con las
// mismas claves»), un solo tool_use Bash con el `cp` que bloqueó al revisor y `cwd` FUERA de los dos repos (C:\x): el destino
// relativo cae fuera de toda raíz y sólo el origen está dentro.
const LINEA_CP = String.raw`{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"C:\\x","sessionId":"verdad-08","version":"2.1.275","gitBranch":"main","type":"assistant","uuid":"u0","timestamp":"2026-09-22T00:00:00.000Z","message":{"model":"claude-opus-5","id":"msg_verdad08","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_verdad08","name":"Bash","input":{"command":"cp C:/Users/liama/Desktop/Nichos/Barber-shop-template-main/tests/helpers/png.ts tests/helpers/","description":"Copiar el helper de PNG fuera del repo"},"caller":{"type":"direct"}}],"stop_reason":"tool_use","stop_sequence":null}}`;

/** Raíces reales en sus grafías: barra invertida escapada n veces (JSON), `C:/…` y `/c/…`. */
const REAL = {
  T: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos\1Barber-shop-template-main/gi, win: /C:\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi },
  H: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos-hub/gi, win: /C:\/Users\/liama\/Desktop\/Nichos-hub/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos-hub/gi },
};
const RESTO = [/desktop[\\/]+nichos-hub/i, /desktop[\\/]+nichos[\\/]+barber-shop-template-main/i];

/** El transcript del `cp` con las raíces T/H reubicadas a los repos temporales; devuelve la ruta escrita. */
export function transcriptCpReubicado(archivo: string, tempT: string, tempH: string): string {
  let texto = LINEA_CP + "\n";
  for (const [et, dir] of [["T", tempT], ["H", tempH]] as const) {
    const segs = dir.replace(/\//g, "\\").split("\\");
    const win = segs.join("/");
    const msys = win.replace(/^([A-Za-z]):\//, (_, l) => `/${l.toLowerCase()}/`);
    texto = texto.replace(REAL[et].esc, (_, sep) => segs.join(sep)).replace(REAL[et].win, win).replace(REAL[et].msys, msys);
  }
  const resto = RESTO.find((re) => re.test(texto));
  if (resto) throw new Error(`quedó una raíz real sin reubicar en el transcript: ${resto}`);
  writeFileSync(archivo, texto);
  return archivo;
}
