// HIGIENE-03 (VERDAD-02, 2026-09-20): ¿la sesión ESCRIBIÓ en T/H o sólo leyó? Se decide por el transcript JSONL que Claude Code
// pasa al hook Stop (`transcript_path`), nunca por lo que el modelo diga. Cada `tool_use` se clasifica:
//   Edit/Write/MultiEdit/NotebookEdit con file_path (o notebook_path) dentro de una raíz → escribió;
//   Agent/Task/Workflow → escribió siempre (el subagente puede escribir y su transcript no está aquí);
//   Bash/PowerShell: se quitan las cadenas entre comillas, se parte por && ; || | y salto de línea, se sigue el cwd
//   (el de la sesión o el destino del último `cd`) y cuenta como escritura sólo lo listado en tests/orden/verdad-02/HOJA.md C5:
//   git que muta (commit|add|rm|mv|checkout|switch|restore|reset|stash|merge|rebase|cherry-pick|revert|apply|clean|push|pull|tag,
//   branch -d|-D|-m, config sin --get|--list|-l) con cwd en T/H; redirecciones >/>> con destino en T/H (nunca /dev/null, >&, 2>, =>);
//   tee|sed -i|rm|mv|cp|mkdir|touch <ruta>, npm install|i|ci|uninstall|update, Set-Content|Out-File|Add-Content|New-Item|
//   Remove-Item|Move-Item|Copy-Item|Rename-Item <ruta>, con ruta relativa al cwd (si está en T/H) o absoluta dentro de T/H.
// Todo lo demás es lectura. Sin transcript, ilegible o sin tool_use → `sin-transcript` (el que llama bloquea: fail closed).
// ponytail: una comilla simple suelta fuera de comillas (p. ej. dentro de un heredoc) desincroniza el quitado de cadenas
// hasta la siguiente; el `> ruta` del propio heredoc ya cuenta antes, así que el hueco es sólo heredocs que no escriben.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

export const EDITORES = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
export const SHELLS = new Set(["Bash", "PowerShell"]);
export const AGENTES = new Set(["Agent", "Task", "Workflow"]);

const GIT_MUTA = /^(commit|add|rm|mv|checkout|switch|restore|reset|stash|merge|rebase|cherry-pick|revert|apply|clean|push|pull|tag)$/;
const GIT = /(?:^|\s)git\s+((?:-[cC]\s+\S+\s+|--?[\w-]+(?:=\S*)?\s+)*)(\S+)(.*)$/;
const REDIR = /(?<![\d<>=|-])>{1,2}(?![&>])\s*([^\s;&|<>]+)/g;
const DISCO = /(?:^|\s)(tee|rm|mv|cp|mkdir|touch)\s+(.*)$/;
const SED_I = /(?:^|\s)sed\s+(?:-[^i\s]\S*\s+)*(?:-i\S*|--in-place\S*)\s+(.*)$/;
const NPM = /(?:^|\s)npm\s+(install|i|ci|uninstall|update)(?:\s|$)/;
const PS = /(?:^|\s)(Set-Content|Out-File|Add-Content|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item)(?:\s+(.*))?$/i;
const PATH_LIKE = /^[\w.\/~:\\@+% -]+$/;

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

/** Quita comillas (una cadena «de ruta» se conserva sin comillas; el resto se vuelve un token Q) y parte por && ; || | y \n. */
export function segmentos(cmd) {
  const plano = String(cmd).replace(/\\(.)|'([^']*)'|"((?:[^"\\]|\\.)*)"/gs, (_, esc, s1, s2) => {
    if (esc !== undefined) return esc;
    const c = s1 ?? s2;
    return PATH_LIKE.test(c) ? c : "Q";
  });
  return plano.split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean);
}

const args = (s) => String(s ?? "").split(/\s+/).filter((a) => a && !a.startsWith("-"));

/** Primer segmento del comando que escribe en alguna raíz (o ""). Sigue el cwd por los `cd` del mismo comando. */
export function escrituraShell(cmd, cwdSesion, roots) {
  let cwd = ruta(cwdSesion, "");
  const enRaiz = (p) => roots.some((r) => dentro(p, r));
  const alguna = (lista) => (lista.length ? lista.some((a) => enRaiz(ruta(a, cwd))) : enRaiz(cwd));
  for (const seg of segmentos(cmd)) {
    const cd = seg.match(/^cd(?:\s+(\S+))?$/);
    if (cd) { cwd = cd[1] ? ruta(cd[1], cwd) || cwd : norm(homedir()); continue; }
    const g = seg.match(GIT);
    if (g) {
      const [, opts, verbo, resto] = g;
      const C = opts.match(/-C\s+(\S+)/);
      const dir = C ? ruta(C[1], cwd) : cwd;
      const muta = GIT_MUTA.test(verbo)
        || (verbo === "branch" && /(^|\s)(-[dDmM]|--delete|--move)\b/.test(resto))
        || (verbo === "config" && !/(^|\s)(--get\S*|--list|-l)(\s|$)/.test(resto));
      if (muta && enRaiz(dir)) return seg;
    }
    for (const m of seg.matchAll(REDIR)) {
      const destino = m[1];
      if (/^(\/dev\/null|nul)$/i.test(destino)) continue;
      if (enRaiz(ruta(destino, cwd))) return seg;
    }
    const d = seg.match(DISCO);
    if (d && alguna(args(d[2]))) return seg;
    const si = seg.match(SED_I);
    if (si && alguna(args(si[1]))) return seg;
    if (NPM.test(seg) && enRaiz(cwd)) return seg;
    const p = seg.match(PS);
    if (p && alguna(args(p[2]))) return seg;
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
