// HIGIENE-03 (VERDAD-01, 2026-09-20): ¿la sesión ESCRIBIÓ en T/H o sólo leyó? Se decide por el transcript JSONL que Claude Code
// pasa al hook Stop por stdin (`transcript_path`), nunca por lo que el modelo diga. Cada `tool_use` se clasifica:
//   Edit/Write/MultiEdit/NotebookEdit con file_path dentro de una raíz → escribió;
//   Bash/PowerShell cuyo comando muta git o disco (lista abierta: falla hacia «escribió») y toca una raíz (por cwd o por ruta
//   en el comando) → escribió; Agent/Task/Workflow → escribió (un subagente puede escribir y su transcript no está aquí).
// Todo lo demás es lectura. Sin transcript, ilegible o vacío → `sin-transcript` (el que llama bloquea: fail closed).
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const EDITORES = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
export const SHELLS = new Set(["Bash", "PowerShell"]);
export const AGENTES = new Set(["Agent", "Task", "Workflow"]);
export const SHELL_ESCRIBE = /\bgit\s+(commit|add|rm|mv|checkout|switch|restore|reset|stash|merge|rebase|cherry-pick|revert|apply|clean|push|pull|tag|branch\s+-[dDmM]|config|init|worktree)\b|(^|[^<>&|\d])>{1,2}(?!&)|\bsed\s+-i|\btee\b|\brm\b|\bmv\b|\bcp\b|\bmkdir\b|\btouch\b|\bnpm\s+(install|i|ci|uninstall|update|pkg)\b|Set-Content|Out-File|Add-Content|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item/i;

/** Normaliza rutas de Windows y Git Bash a una forma comparable: minúsculas, `/`, `c:/x` y `/c/x` → `/c/x`. */
export const norm = (p) => String(p ?? "").replace(/\\/g, "/").toLowerCase().replace(/^([a-z]):\//, "/$1/").replace(/\/+$/, "");

export function dentro(p, root) {
  if (!p) return false;
  const a = norm(p), r = norm(root);
  return a === r || a.startsWith(r + "/");
}

/** Extrae los tool_use de un transcript JSONL. Devuelve null si no hay archivo o no se puede leer. */
export function leerTranscript(path) {
  if (!path || !existsSync(path)) return null;
  let texto; try { texto = readFileSync(path, "utf8"); } catch { return null; }
  const usos = [];
  for (const linea of texto.split("\n")) {
    if (!linea.trim()) continue;
    let o; try { o = JSON.parse(linea); } catch { continue; }
    if (o.type !== "assistant" || !Array.isArray(o.message?.content)) continue;
    for (const c of o.message.content) if (c.type === "tool_use") usos.push({ name: c.name, input: c.input ?? {}, cwd: o.cwd ?? "" });
  }
  return usos;
}

/** Clasifica los tool_use contra las raíces. `escribio` lista cada escritura con su motivo. */
export function clasificar(usos, roots) {
  const escribio = [];
  const enRaiz = (p) => roots.find((r) => dentro(p, r));
  for (const u of usos) {
    if (EDITORES.has(u.name)) {
      const fp = u.input.file_path ?? u.input.notebook_path ?? "";
      const abs = fp && !isAbsolute(fp) ? resolve(u.cwd || ".", fp) : fp;
      const r = enRaiz(abs); if (r) escribio.push({ tool: u.name, que: abs, repo: r });
      continue;
    }
    if (SHELLS.has(u.name)) {
      const cmd = String(u.input.command ?? "");
      if (!SHELL_ESCRIBE.test(cmd)) continue;
      const c = norm(cmd); // la raíz puede aparecer como /c/users/… (Git Bash) o c:/users/… (Windows) en medio del comando
      const r = enRaiz(u.cwd) ?? roots.find((root) => { const n = norm(root); return c.includes(n) || c.includes(n.replace(/^\/([a-z])\//, "$1:/")); });
      if (r) escribio.push({ tool: u.name, que: cmd.slice(0, 120), repo: r });
      continue;
    }
    if (AGENTES.has(u.name)) escribio.push({ tool: u.name, que: "subagente: puede escribir y su transcript no está aquí (fail closed)", repo: roots[0] });
  }
  return { escribio, herramientas: usos.length };
}

/** Veredicto para el hook Stop: `escribio` | `solo-lectura` | `sin-transcript`, con detalle. */
export function escribioEn(transcriptPath, roots) {
  const usos = leerTranscript(transcriptPath);
  if (!usos) return { estado: "sin-transcript", detalle: transcriptPath ? `transcript ilegible o inexistente: ${transcriptPath}` : "el hook no recibió transcript_path", escribio: [] };
  // Un transcript sin ningún tool_use no acredita nada (líneas ilegibles, sesión vacía): falla cerrado.
  if (!usos.length) return { estado: "sin-transcript", detalle: `transcript sin tool_use legibles: ${transcriptPath}`, escribio: [] };
  const { escribio, herramientas } = clasificar(usos, roots);
  return { estado: escribio.length ? "escribio" : "solo-lectura", detalle: `${herramientas} tool_use, ${escribio.length} escritura(s)`, escribio };
}
