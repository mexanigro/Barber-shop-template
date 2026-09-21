// Utilidades de la orden VERDAD-07 (sesión A, 2026-09-21). Reusa de ../verdad-06/_util.ts (y por ella de verdad-02/03/05) lo que no
// cambia: repos temporales con nombre real, spawnSync, candado por stdin, par T/H con PLAN, transcripts en línea, lectura de CLAUDE.md.
// Caja negra salvo C1, que importa `escrituraShell` de tools/_transcript.mjs porque la hoja lo pide así. Toda carpeta temporal se crea
// con `conTemporal()` (prefijo «verdad-07-») y se borra en `finally`, también si el test falla. Un mismo archivo en T y en H (cmp → 0):
// lo propio de cada repo va por `SOY`.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ROOT, SOY, borrar, git, hojaMinima, repoTemporal, type Repo, type Salida } from "../verdad-02/_util.ts";
import { correrLargo } from "../verdad-05/_util.ts";

export { NODE, NOMBRE, OTRO, ROOT, SOY, bloqueContrato, borrar, correr, git, hojaMinima, repoTemporal, seccionPuertas, transcriptEnLinea } from "../verdad-02/_util.ts";
export { cierre, par } from "../verdad-03/_util.ts";
export { candadoJson, correrLargo, gitCrudo, paresIni } from "../verdad-06/_util.ts";
export type { Repo, Salida } from "../verdad-02/_util.ts";

/** Commit aprobado de VERDAD-06 en cada repo (Liam, 2026-09-21) y último rojo de su carpeta (16c0f1f en T = A3; 088b32e en H). */
export const VERDAD_06 = { aprobado: { T: "0a9dc03", H: "7ef7a8a" }, rojo: { T: "16c0f1f", H: "088b32e" } };

/** Carpeta temporal de esta orden: prefijo «verdad-07-» en os.tmpdir() (rojo-verde mide los restos por ese prefijo, VERDAD-03 D1). */
export function carpetaTemporal(): string {
  return mkdtempSync(join(tmpdir(), "verdad-07-"));
}

/** Crea una carpeta temporal, corre `fn` y la borra SIEMPRE, también si `fn` lanza (el test falla y no deja restos). */
export function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** `node tools/verdad/rojo-verde.mjs --orden <id> --repo <repo>` del repo real; `env` añade variables al entorno del que llama (A3). Diez minutos: clona. */
export function rojoVerde(orden: string, repo: string, env: Record<string, string | undefined> = {}): Salida {
  return correrLargo(["tools/verdad/rojo-verde.mjs", "--orden", orden, "--repo", repo], { env });
}

/** `node tools/verdad/rojo-verde.mjs --todas --repo <repo>` del repo real sobre otro repo. */
export function rojoVerdeTodas(repo: string): Salida {
  return correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo]);
}

/** Forma comparable de una ruta (como `norm` de tools/_transcript.mjs): minúsculas, `/`, sin barra final. */
export const norm = (p: string) => String(p ?? "").replace(/\\/g, "/").toLowerCase().replace(/^\/([a-z])\//, "$1:/").replace(/\/+$/, "");

/** Lo que el test de un fixture anota en <base>/registro.jsonl en cada corrida (§ Interfaz). */
export type Registro = {
  raiz: string; cwd: string; env: Record<string, string | undefined>; gitEsCarpeta: boolean; worktrees: string; worktreesDir: boolean;
  configLocal: string; enlace: boolean; verde: boolean; marca: boolean;
};

/** Fuente del test de un fixture: anota el registro (siempre, antes de afirmar nada) y después corre `cuerpo` (aserciones con `assert`).
 *  `repoDir` es el repo temporal (para `git worktree list`) y `registro` la ruta absoluta del JSONL, las dos fijas en el fuente. */
export function fuenteFixture(frase: string, repoDir: string, registro: string, cuerpo: string): string {
  return `import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "../../..");
const REPO = ${JSON.stringify(repoDir)};
const REGISTRO = ${JSON.stringify(registro)};
const gitDe = (cwd, ...args) => { try { return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", windowsHide: true }).trim(); } catch (e) { return "ERROR " + String(e.message).split("\\n")[0]; } };
const existe = (p) => existsSync(resolve(RAIZ, p));
const esEnlace = (p) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };

test(${JSON.stringify(frase)}, () => {
  appendFileSync(REGISTRO, JSON.stringify({
    raiz: RAIZ, cwd: process.cwd(), env: process.env,
    gitEsCarpeta: (() => { try { return lstatSync(resolve(RAIZ, ".git")).isDirectory(); } catch { return false; } })(),
    worktrees: gitDe(REPO, "worktree", "list", "--porcelain"),
    worktreesDir: existsSync(resolve(REPO, ".git", "worktrees")),
    configLocal: gitDe(RAIZ, "config", "--local", "--list"),
    enlace: esEnlace(resolve(RAIZ, "node_modules")) && existe("node_modules/verdad-07-marca"),
    verde: existe("verde.txt"), marca: existe("marca.txt"),
  }) + "\\n");
${cuerpo}
});
`;
}

/** Entradas de un registro JSONL (vacío si no existe). */
export function leerRegistro(archivo: string): Registro[] {
  let texto = "";
  try { texto = readFileSync(archivo, "utf8"); } catch { return []; }
  return texto.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l) as Registro);
}

/** Repo temporal (nombre real de SOY) con la orden <id> en rojo: HOJA.md con la afirmación (T+H) + tests/orden/<id>/a.test.ts +
 *  package.json con un `prepare` que fijaría hooksPath y autocrlf + .gitignore de node_modules + node_modules/verdad-07-marca/ (sin
 *  rastrear). Devuelve el repo y el sha del commit rojo. */
export function repoConRojo(base: string, id: string, frase: string, fuente: string, extras: Record<string, string> = {}): { repo: Repo; rojo: string } {
  const repo = repoTemporal(SOY, base);
  const marca = join(repo.dir, "node_modules", "verdad-07-marca");
  mkdirSync(marca, { recursive: true });
  writeFileSync(join(marca, "index.js"), "module.exports = 'verdad-07';\n");
  const rojo = repo.commit(`rojo ${id}`, {
    [`tests/orden/${id}/HOJA.md`]: hojaMinima([["A1", "T+H", frase]]),
    [`tests/orden/${id}/a.test.ts`]: fuente,
    "package.json": JSON.stringify({ name: `verdad-07-${id}`, private: true, scripts: { prepare: "git config core.hooksPath .githooks && git config core.autocrlf false" } }, null, 2) + "\n",
    ".gitignore": "node_modules/\n",
    ...extras,
  });
  return { repo, rojo };
}

/** Reproducción de HEAD del repo real en un repo temporal: tests/orden/APROBADAS.md y tests/orden/<id>/ de todas las órdenes de HEAD menos
 *  las excluidas (verdad-07 se correría a sí misma sin fin), tal cual (git show), en un solo commit. Devuelve el repo y los ids copiados. */
export function reproducirHead(base: string, excluir: string[]): { repo: Repo; ids: string[] } {
  const repo = repoTemporal(SOY, base);
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

// Transcript real de esta sesión A (2026-09-21T21:18:15Z, línea 131 del JSONL de la sesión ef9b7444, D-4): un solo tool_use Bash
// `git config --show-origin core.autocrlf` con cwd en H. Se reubica a un par temporal con la misma técnica que verdad-02/03.
const LINEA_REAL = String.raw`{"parentUuid":"039104fa-d849-4cf0-9b75-c91d3088aaea","isSidechain":false,"message":{"model":"claude-opus-5","id":"msg_011CfHGrZgpJoUmbahWLFqYf","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_015nvZ51ozTgh2HguZZDy5BH","name":"Bash","input":{"command":"git config --show-origin core.autocrlf","description":"Origen de core.autocrlf en H"},"caller":{"type":"direct"}}],"container":null,"stop_reason":"tool_use","stop_sequence":null,"stop_details":null,"usage":{"input_tokens":2,"cache_creation_input_tokens":4956,"cache_read_input_tokens":185815,"output_tokens":25525,"output_tokens_details":{"thinking_tokens":25431},"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":4956,"ephemeral_5m_input_tokens":0},"inference_geo":"not_available","iterations":[{"input_tokens":2,"output_tokens":25525,"cache_read_input_tokens":185815,"cache_creation_input_tokens":4956,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":4956},"type":"message"}],"speed":"standard"},"input_transformations":[],"diagnostics":null,"context_management":null},"wireToolInputs":{"toolu_015nvZ51ozTgh2HguZZDy5BH":{"command":"git config --show-origin core.autocrlf","description":"Origen de core.autocrlf en H"}},"apiBlockIndex":1,"requestId":"req_011CfHGrYNvt5KUze88qtit5","type":"assistant","uuid":"e494450e-fd2f-442d-88b4-aa493757ee71","timestamp":"2026-09-21T21:18:15.420Z","advisorModel":"claude-opus-5","effort":"high","perTurnEffort":null,"userType":"external","entrypoint":"claude-desktop","cwd":"C:\\Users\\liama\\Desktop\\Nichos-hub","sessionId":"ef9b7444-c009-486a-89dc-f6d0c5995b29","version":"2.1.275","gitBranch":"main"}`;

/** Raíces reales en sus grafías (misma técnica que VERDAD-02/03): barra invertida escapada n veces, `C:/…` y `/c/…`. */
const REAL = {
  T: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos\1Barber-shop-template-main/gi, win: /C:\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos\/Barber-shop-template-main/gi },
  H: { esc: /C:((?:\\\\)+)Users\1liama\1Desktop\1Nichos-hub/gi, win: /C:\/Users\/liama\/Desktop\/Nichos-hub/gi, msys: /\/c\/Users\/liama\/Desktop\/Nichos-hub/gi },
};
const RESTO = [/desktop[\\/]+nichos-hub/i, /desktop[\\/]+nichos[\\/]+barber-shop-template-main/i];

/** El transcript real (una línea) con las raíces T/H reubicadas a los repos temporales; devuelve la ruta escrita. */
export function transcriptRealReubicado(archivo: string, tempT: string, tempH: string): string {
  let texto = LINEA_REAL + "\n";
  for (const [et, dir] of [["T", tempT], ["H", tempH]] as const) {
    const segmentos = dir.replace(/\//g, "\\").split("\\");
    const win = segmentos.join("/");
    const msys = win.replace(/^([A-Za-z]):\//, (_, l) => `/${l.toLowerCase()}/`);
    texto = texto.replace(REAL[et].esc, (_, sep) => segmentos.join(sep)).replace(REAL[et].win, win).replace(REAL[et].msys, msys);
  }
  const resto = RESTO.find((re) => re.test(texto));
  if (resto) throw new Error(`quedó una raíz real sin reubicar en el transcript real: ${resto}`);
  writeFileSync(archivo, texto);
  return archivo;
}
