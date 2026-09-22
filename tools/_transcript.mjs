// HIGIENE-03 (VERDAD-02, 2026-09-20): ¿la sesión ESCRIBIÓ en T/H o sólo leyó? Se decide por el transcript JSONL que Claude Code
// pasa al hook Stop (`transcript_path`), nunca por lo que el modelo diga. Cada `tool_use` se clasifica:
//   Edit/Write/MultiEdit/NotebookEdit con file_path (o notebook_path) dentro de una raíz → escribió;
//   Agent/Task/Workflow → escribió siempre (el subagente puede escribir y su transcript no está aquí);
//   Bash/PowerShell: se quitan las cadenas entre comillas, se parte por && ; || | y salto de línea, se sigue el cwd
//   (el de la sesión o el destino del último `cd`) y cuenta como escritura sólo lo listado en tests/orden/verdad-02/HOJA.md C5:
//   git que muta (commit|add|rm|mv|checkout|switch|restore|reset|merge|rebase|cherry-pick|revert|apply|clean|push|pull|tag,
//   branch -d|-D|-m, config con valor o subopción de escritura (VERDAD-07), stash salvo list|show) con cwd en T/H; redirecciones >/>> con destino en T/H
//   (nunca /dev/null, >&, 2>, =>, ni >= que es comparación);
//   tee|sed -i|rm|mv|mkdir|touch <ruta> (todos sus argumentos) y cp <destino> (VERDAD-08, D-56: `cp` escribe SÓLO en su último
//   argumento sin guion; sacar un archivo del repo es lectura), npm install|i|ci|uninstall|update, Set-Content|Out-File|Add-Content|New-Item|
//   Remove-Item|Move-Item|Copy-Item|Rename-Item <ruta>, con ruta relativa al cwd (si está en T/H) o absoluta dentro de T/H.
// VERDAD-03 (2026-09-20, D-9): las variables $X, ${X} y %X% se resuelven como en bash: primero con las asignaciones «X=valor» del
//   mismo comando (también tras && y en una línea anterior), después con el entorno del hook (process.env), y si no existen valen
//   vacío; una ruta vacía no es ruta (mkdir -p "$NOEXISTE" es lectura). Dentro de comillas simples no se expande.
//   Una comilla simple entre dos caracteres de palabra es un apóstrofo (don't, it's), no abre cadena; quitadas las cadenas
//   balanceadas, una comilla suelta se descarta y el resto se analiza como fuera de comillas.
//   PowerShell: el valor de un parámetro con nombre (-ItemType Directory, -Value x) no es ruta; cuentan -Path/-FilePath/
//   -LiteralPath/-Destination y el primer posicional (y el segundo en Move-Item/Copy-Item).
// VERDAD-04 (2026-09-21): un «>» seguido de «=» no abre destino (`i>=0` es comparación); «>» seguido de espacio o de ruta sigue
//   siendo redirección. `git stash` cuenta como escritura sin subcomando o con push|pop|apply|drop|clear|branch (y save|create|
//   store); `git stash list` y `git stash show` (con o sin opciones) son lectura.
// VERDAD-07 (2026-09-21, D-31): `git config` es lectura cuando lleva --get*, --list, -l, --show-origin o --show-scope sin subopción
//   de escritura, o cuando su único argumento sin guion es la clave (`git config core.autocrlf`); es escritura con valor (`clave
//   valor`), --unset*, --add, --replace-all, --edit, --remove-section o --rename-section (el revisor fue bloqueado por
//   `git config --show-origin core.autocrlf`, que sólo lee). -f/--file/--blob/--type/--default consumen su valor.
// Todo lo demás es lectura. Sin transcript, ilegible o sin tool_use → `sin-transcript` (el que llama bloquea: fail closed).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

export const EDITORES = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
export const SHELLS = new Set(["Bash", "PowerShell"]);
export const AGENTES = new Set(["Agent", "Task", "Workflow"]);

const GIT_MUTA = /^(commit|add|rm|mv|checkout|switch|restore|reset|merge|rebase|cherry-pick|revert|apply|clean|push|pull|tag)$/;
const STASH_LEE = /^\s*(list|show)(\s|$)/; // VERDAD-04 A2: los únicos subcomandos de stash que no mutan
const CONFIG_ESCRIBE = /^(--unset(-all)?|--add|--replace-all|--edit|-e|--remove-section|--rename-section)$/; // VERDAD-07 C1
const CONFIG_CON_VALOR = /^(-f|--file|--blob|--type|--default)$/;
const GIT = /(?:^|\s)git\s+((?:-[cC]\s+\S+\s+|--?[\w-]+(?:=\S*)?\s+)*)(\S+)(.*)$/;
const REDIR = /(?<![\d<>=|-])>{1,2}(?![&>=])\s*([^\s;&|<>]+)/g; // VERDAD-04 A1: `>=` es comparación, no redirección
const DISCO = /(?:^|\s)(tee|rm|mv|mkdir|touch)\s+(.*)$/; // VERDAD-08 D-56: escriben en TODOS sus argumentos
const COPIA = /(?:^|\s)cp\s+(.*)$/; // VERDAD-08 D-56: `cp` escribe sólo en el último; el origen es lectura
const SED_I = /(?:^|\s)sed\s+(?:-[^i\s]\S*\s+)*(?:-i\S*|--in-place\S*)\s+(.*)$/;
const NPM = /(?:^|\s)npm\s+(install|i|ci|uninstall|update)(?:\s|$)/;
const PS = /(?:^|\s)(Set-Content|Out-File|Add-Content|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item)(?:\s+(.*))?$/i;
const PS_RUTA = /^-(Path|FilePath|LiteralPath|Destination|Target)$/i;
const PS_CON_VALOR = /^-(ItemType|Value|Encoding|Filter|Include|Exclude|Name|NewName|Type|Stream|ErrorAction|WarningAction|Depth|Width|InputObject)$/i;
const PATH_LIKE = /^[\w.\/~:\\@+% -]+$/;
const APOSTROFO = /(?<=\w)'(?=\w)/g;
const REF = /\$\{(\w+)\}|\$(\w+)|%(\w+)%/g;
// Escapes y cadenas simples se saltan; una asignación «X=valor» al principio o tras ; & | \n se registra; el resto de $X/${X}/%X% se expande.
const EXPANSION = /\\.|'[^']*'|(^|[;&|\n]\s*)([A-Za-z_]\w*)=("(?:[^"\\]|\\.)*"|'[^']*'|[^\s;&|]*)|\$\{(\w+)\}|\$(\w+)|%(\w+)%/g;

/** Forma comparable: minúsculas, `/`, `/c/x` → `c:/x`, sin barra final. */
export const norm = (p) => String(p ?? "").replace(/\\/g, "/").toLowerCase().replace(/^\/([a-z])\//, "$1:/").replace(/\/+$/, "");

/** Ruta absoluta normalizada; relativa se resuelve contra cwd (sin cwd → ""); `~` = home. */
export function ruta(p, cwd) {
  let s = String(p ?? "");
  if (s === "~" || s.startsWith("~/")) s = homedir() + s.slice(1);
  s = s.replace(/^\/([a-zA-Z])\//, "$1:/");
  if (!s) return "";
  if (!isAbsolute(s)) { if (!cwd) return ""; s = resolve(cwd, s); }
  return norm(s);
}

export function dentro(p, root) {
  const a = norm(p), r = norm(root);
  return !!a && !!r && (a === r || a.startsWith(r + "/"));
}

/** Expande $X, ${X} y %X% (D-9): asignaciones del mismo comando, después `env`, si no vacío. */
export function expandir(cmd, env = process.env) {
  const vars = new Map();
  const valor = (n) => (vars.has(n) ? vars.get(n) : env[n] ?? "");
  const refs = (s) => s.replace(REF, (_, a, b, c) => valor(a ?? b ?? c));
  return String(cmd).replace(EXPANSION, (m, sep, nombre, v, a, b, c) => {
    if (nombre !== undefined) {
      const simple = v.startsWith("'"), doble = v.startsWith('"');
      const crudo = simple ? v.slice(1, -1) : refs(doble ? v.slice(1, -1) : v);
      vars.set(nombre, crudo);
      return `${sep}${nombre}=${doble ? `"${crudo}"` : simple ? `'${crudo}'` : crudo}`;
    }
    if (a ?? b ?? c) return valor(a ?? b ?? c);
    return m;
  });
}

/** Quita comillas (una cadena «de ruta» se conserva sin comillas; vacía desaparece; el resto se vuelve un token Q) y parte por && ; || | y \n. */
/** `conTexto` (VERDAD-08, el candado): la cadena conserva su contenido, sólo sin los separadores del shell, para que la ruta que lleve
 *  dentro siga viéndose (`node -e "…writeFileSync('tests/orden/<id>/c.test.ts')…"`); sigue siendo UN token y el reparto no cambia. */
export function segmentos(cmd, env = process.env, { conTexto = false } = {}) {
  const texto = expandir(String(cmd).replace(APOSTROFO, ""), env);
  const plano = texto.replace(/\\(.)|'([^']*)'|"((?:[^"\\]|\\.)*)"/gs, (_, esc, s1, s2) => {
    if (esc !== undefined) return /\w/.test(esc) ? `\\${esc}` : esc; // VERDAD-07 C1: `C:\Users\…` es ruta, no escapes de bash
    const c = s1 ?? s2;
    if (conTexto) return c.replace(/[\s;|&\n]+/g, "");
    return c === "" ? "" : PATH_LIKE.test(c) ? c.replace(/\s/g, "") : "Q"; // una cadena sigue siendo UN token (espacios → )
  }).replace(/['"]/g, ""); // comilla suelta: se descarta y el resto queda fuera de comillas
  return plano.split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean);
}

const args = (s) => String(s ?? "").split(/\s+/).filter((a) => a && !a.startsWith("-"));

/** ¿`git config <resto>` escribe? (VERDAD-07 C1, D-31): subopción de escritura, o clave + valor (dos argumentos sin guion). */
function configMuta(resto) {
  const t = String(resto ?? "").split(/\s+/).filter(Boolean), claves = [];
  for (let i = 0; i < t.length; i++) {
    if (CONFIG_ESCRIBE.test(t[i])) return true;
    if (CONFIG_CON_VALOR.test(t[i])) { i++; continue; }
    if (!t[i].startsWith("-")) claves.push(t[i]);
  }
  return claves.length >= 2;
}

/** Rutas candidatas de un cmdlet: valores de -Path/-FilePath/-LiteralPath/-Destination y el primer posicional (segundo en Move/Copy-Item). */
function rutasPS(verbo, resto) {
  const t = String(resto ?? "").split(/\s+/).filter(Boolean);
  const rutas = [], pos = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i].startsWith("-")) {
      if (PS_RUTA.test(t[i]) && t[i + 1] !== undefined) rutas.push(t[++i]);
      else if (PS_CON_VALOR.test(t[i]) && t[i + 1] !== undefined && !t[i + 1].startsWith("-")) i++;
      continue;
    }
    pos.push(t[i]);
  }
  const n = /^(Move-Item|Copy-Item)$/i.test(verbo) ? 2 : 1;
  return [...rutas, ...pos.slice(0, n)];
}

/** Primer segmento del comando que escribe en alguna raíz (o ""). Sigue el cwd por los `cd` del mismo comando. */
export function escrituraShell(cmd, cwdSesion, roots, env = process.env) {
  let cwd = ruta(cwdSesion, "");
  const enRaiz = (p) => roots.some((r) => dentro(p, r));
  const alguna = (lista) => lista.some((a) => enRaiz(ruta(a, cwd)));
  for (const seg of segmentos(cmd, env)) {
    const cd = seg.match(/^cd(?:\s+(\S+))?$/);
    if (cd) { cwd = cd[1] ? ruta(cd[1], cwd) || cwd : norm(homedir()); continue; }
    const g = seg.match(GIT);
    if (g) {
      const [, opts, verbo, resto] = g;
      const C = opts.match(/-C\s+(\S+)/);
      const dir = C ? ruta(C[1], cwd) : cwd;
      const muta = GIT_MUTA.test(verbo)
        || (verbo === "stash" && !STASH_LEE.test(resto))
        || (verbo === "branch" && /(^|\s)(-[dDmM]|--delete|--move)\b/.test(resto))
        || (verbo === "config" && configMuta(resto));
      if (muta && enRaiz(dir)) return seg;
    }
    for (const m of seg.matchAll(REDIR)) {
      const destino = m[1];
      if (/^(\/dev\/null|nul)$/i.test(destino)) continue;
      if (enRaiz(ruta(destino, cwd))) return seg;
    }
    const d = seg.match(DISCO);
    if (d && alguna(args(d[2]))) return seg;
    const c = seg.match(COPIA);
    if (c && alguna(args(c[1]).slice(-1))) return seg;
    const si = seg.match(SED_I);
    if (si && alguna(args(si[1]))) return seg;
    if (NPM.test(seg) && enRaiz(cwd)) return seg;
    const p = seg.match(PS);
    if (p && alguna(rutasPS(p[1], p[2]))) return seg;
  }
  return "";
}

/** Extrae los tool_use de un transcript JSONL. null si no hay archivo o no se puede leer. */
export function leerTranscript(path) {
  if (!path || !existsSync(path)) return null;
  let texto; try { texto = readFileSync(path, "utf8"); } catch { return null; }
  const usos = [];
  for (const linea of texto.split("\n")) {
    if (!linea.trim()) continue;
    let o; try { o = JSON.parse(linea); } catch { continue; }
    if (o?.type !== "assistant" || !Array.isArray(o.message?.content)) continue;
    for (const c of o.message.content) if (c.type === "tool_use") usos.push({ name: c.name, input: c.input ?? {}, cwd: o.cwd ?? "" });
  }
  return usos;
}

/** Escrituras en orden de aparición: { tool, que, repo }. */
export function clasificar(usos, roots) {
  const escribio = [];
  const enRaiz = (p) => roots.find((r) => dentro(p, r));
  for (const u of usos) {
    if (EDITORES.has(u.name)) {
      const fp = String(u.input.file_path ?? u.input.notebook_path ?? "");
      const r = fp && enRaiz(ruta(fp, u.cwd));
      if (r) escribio.push({ tool: u.name, que: fp, repo: r });
    } else if (SHELLS.has(u.name)) {
      const seg = escrituraShell(String(u.input.command ?? ""), u.cwd, roots);
      if (seg) escribio.push({ tool: u.name, que: seg.slice(0, 120), repo: enRaiz(u.cwd) ?? roots[0] });
    } else if (AGENTES.has(u.name)) {
      escribio.push({ tool: u.name, que: "subagente: puede escribir y su transcript no está aquí (fail closed)", repo: roots[0] });
    }
  }
  return escribio;
}

/** Veredicto para el hook Stop: `escribio` | `solo-lectura` | `sin-transcript`, con detalle. */
export function escribioEn(transcriptPath, roots) {
  const usos = leerTranscript(transcriptPath);
  if (!usos) return { estado: "sin-transcript", detalle: transcriptPath ? `transcript ilegible o inexistente: ${transcriptPath}` : "el hook no recibió transcript_path", escribio: [] };
  if (!usos.length) return { estado: "sin-transcript", detalle: `transcript sin tool_use legibles: ${transcriptPath}`, escribio: [] };
  const escribio = clasificar(usos, roots);
  return { estado: escribio.length ? "escribio" : "solo-lectura", detalle: `${usos.length} tool_use, ${escribio.length} escritura(s)`, escribio };
}
