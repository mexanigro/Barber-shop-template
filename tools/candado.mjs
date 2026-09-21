// HOOK PreToolUse (Edit|Write|MultiEdit|Bash|PowerShell). Bloquea (exit 2) escrituras en:
//   .env* (salvo .env.example) · dumps *-config-*.json / live-hub-*.json / *serviceAccount*.json ·
//   capturas y media fuera de public/ (y src/app/ en Next) que no estén ya rastreadas ·
//   scripts sueltos nuevos en la raíz · y, si el repo los tiene, los archivos de los seis nichos
//   (presets barberia/estetica/tattoo/nails/cafeteria/remodelaciones y sus familias de componentes)
//   sin HIGIENE_PERMITIR_FLOTA=1, que Liam da por orden ·
//   y los tests de una orden (VERDAD-02): cualquier archivo bajo tests/orden/<id>/ (también nuevos) cuando
//   tests/orden/<id>/HOJA.md ya está en HEAD (commit rojo hecho), salvo HIGIENE_PERMITIR_TESTS=1 exacto
//   (la sesión A que escribe los tests rojos; «0» no abre). Antes del commit rojo se escribe libre.
//   VERDAD-03: el candado mira la HISTORIA de main (`git log main --diff-filter=A -- tests/orden/<id>/HOJA.md`),
//   no sólo HEAD: una orden cuyo rojo fue revertido sigue bajo candado; una nunca commiteada sigue libre.
//   tests/orden/APROBADAS.md no es la carpeta de una orden: se escribe sin la variable.
//   HIGIENE_ROOT=<ruta> sustituye la raíz del repo sólo para probar el hook contra un repo temporal.
// Falla cerrado: si el hook revienta, bloquea. Fuera del repo no opina.
//   VERDAD-04 (2026-09-21): la entrada tiene que ser JSON con `tool_input.file_path` de tipo string; stdin vacío, que no es
//   JSON, sin `tool_input` o con `file_path` de otro tipo → exit 2 con «CANDADO ROTO» (antes «{}» dejaba pasar en silencio).
//   Un veto se explica como «CANDADO · …», nunca como «ROTO».
//   VERDAD-06 (2026-09-21, D-25): también Bash y PowerShell, SÓLO para tests/orden/<id>/ con rojo en la historia. Con esos
//   tool_name la entrada exige `tool_input.command` string (si no → «CANDADO ROTO»; vacío → 0). El comando se expande (D-9) y se
//   parte por && ; || | y salto de línea; se sigue el cwd (el `cwd` del JSON, después cada `cd`). Un segmento que nombra
//   tests/orden/<id>/ (ruta relativa al cwd o absoluta dentro de la raíz, también la del propio `cd`) con HOJA.md en la historia
//   de main → veto, salvo lectura reconocida (primer token cat|head|tail|grep|rg|wc|ls|diff|cmp|sha256sum; sed sólo con -n y sin
//   -i; git sólo diff|log|show|status|ls-files|blame|check-ignore; node/npx sólo con --test; y ninguna redirección > >> hacia la
//   orden) o HIGIENE_PERMITIR_TESTS=1 exacto. Fuera de tests/orden/ el candado no opina sobre shells (exit 0, aunque el comando
//   escriba: el cierre ya lo clasifica, VERDAD-02 C5); un comando que no se entiende y no nombra tests/orden/ → 0.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import { ROOT as RAIZ_FIJA, git } from "./_git.mjs";
import { dentro, expandir, norm, ruta } from "./_transcript.mjs";

const ROOT = process.env.HIGIENE_ROOT ? resolve(process.env.HIGIENE_ROOT) : RAIZ_FIJA;
const SHELLS = new Set(["Bash", "PowerShell"]);
const SEIS = "(barberia|estetica|tattoo|nails|cafeteria|remodelaciones)";
const FLOTA = [
  new RegExp(`^src/config/presets/${SEIS}\.(en|he|ru|ar)\.ts$`),
  /^src\/components\/landing\/[^/]+\/(estetica|aura)\//,
];
const MEDIA = /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)$/i;
const SCRIPT_RAIZ = /^[^/]+\.(mjs|cjs|js|ts|tsx|ps1|py|sh|bat|cmd)$/;
// Lecturas reconocidas por su primer token (HOJA-06 B2); palabras del shell y asignaciones «X=1» delante no cambian el comando.
const LEE = new Set(["cat", "head", "tail", "grep", "rg", "wc", "ls", "diff", "cmp", "sha256sum"]);
const GIT_LEE = /^(diff|log|show|status|ls-files|blame|check-ignore)$/;
const PREFIJO = /^(do|then|else|elif|if|while|until|time|!|\{|\(|[A-Za-z_]\w*=\S*)$/;
const REDIR = /(?<![<>=&])>{1,2}(?![&>=])\s*([^\s;&|<>]+)/g;
const ORDEN = /^tests\/orden\/([^/]+)(?:\/|$)/;

function rastreado(rel) {
  try { return git(["ls-files", "--error-unmatch", rel], ROOT) !== ""; } catch { return false; }
}

/** ¿Algún commit de main (o de HEAD, sin main) añadió tests/orden/<id>/HOJA.md? (el commit rojo de esa orden existe o existió) */
const historia = new Map();
function hojaEnHistoria(id) {
  if (historia.has(id)) return historia.get(id);
  let rama = "HEAD";
  try { git(["rev-parse", "--verify", "-q", "main"], ROOT); rama = "main"; } catch {}
  let hay = false;
  try { hay = git(["log", "--format=%H", "--diff-filter=A", rama, "--", `tests/orden/${id}/HOJA.md`], ROOT) !== ""; } catch {}
  historia.set(id, hay);
  return hay;
}

export function veto(rel, env = process.env, tracked = rastreado, hoja = hojaEnHistoria) {
  const base = rel.split("/").pop();
  const orden = rel.match(/^tests\/orden\/([^/]+)\//);
  if (orden && hoja(orden[1]) && env.HIGIENE_PERMITIR_TESTS !== "1") {
    return `${rel}: tests de la orden «${orden[1]}» bajo candado (HOJA.md en la historia de main: el rojo está comprometido). Sólo la sesión A con HIGIENE_PERMITIR_TESTS=1.`;
  }
  if (/^\.env(\..+)?$/.test(base) && base !== ".env.example") return `${rel}: los .env no se escriben desde el agente (credenciales sólo por env, regla 3).`;
  if (/(-config-|^config-dump-).*\.json$/.test(base) || /^live-hub-.*\.json$/.test(base) || /serviceAccount.*\.json$/i.test(base)) return `${rel}: dumps de config y credenciales no entran al repo.`;
  if (MEDIA.test(base) && !rel.startsWith("public/") && !rel.startsWith("src/app/") && !tracked(rel)) return `${rel}: capturas y media sólo en public/ (las de QA van fuera del repo).`;
  if (SCRIPT_RAIZ.test(rel) && !tracked(rel)) return `${rel}: sin scripts sueltos en la raíz; van a tools/ o scripts/.`;
  if (FLOTA.some((re) => re.test(rel)) && existsSync(resolve(ROOT, "src/config/presets/barberia.he.ts")) && env.HIGIENE_PERMITIR_FLOTA !== "1") {
    return `${rel}: archivo de los seis nichos (flota en producción). Sólo con HIGIENE_PERMITIR_FLOTA=1, que Liam da por orden.`;
  }
  return "";
}

/** id de la orden si `p` (relativa al cwd o absoluta) cae bajo <raíz>/tests/orden/<id>; "" si no. */
function ordenDe(p, cwd) {
  const abs = ruta(p, cwd);
  if (!abs || !dentro(abs, ROOT)) return "";
  const rel = abs.slice(norm(ROOT).length + 1);
  const m = rel.match(ORDEN);
  return m ? m[1] : "";
}

/** ¿El segmento es una lectura reconocida? Primer token tras palabras del shell y asignaciones (HOJA-06 § Interfaz). */
function lectura(seg) {
  const t = seg.split(/\s+/).map((a) => a.replace(/^['"]+|['"]+$/g, "")).filter(Boolean);
  while (t.length && PREFIJO.test(t[0])) t.shift();
  const cmd = t[0] ?? "";
  if (LEE.has(cmd)) return true;
  if (cmd === "sed") return t.some((a) => /^-[a-zA-Z]*n[a-zA-Z]*$/.test(a)) && !t.some((a) => /^-[a-zA-Z]*i|^--in-place/.test(a));
  if (cmd === "node" || cmd === "npx") return t.includes("--test");
  if (cmd === "git") {
    for (let i = 1; i < t.length; i++) {
      if (t[i] === "-c" || t[i] === "-C") { i++; continue; }
      if (t[i].startsWith("-")) continue;
      return GIT_LEE.test(t[i]);
    }
  }
  return false;
}

/** Primer segmento del comando que nombra tests/orden/<id>/ con rojo en la historia sin ser lectura: { id, seg } o null. */
export function vetoShell(command, cwdSesion, env = process.env, hoja = hojaEnHistoria) {
  if (env.HIGIENE_PERMITIR_TESTS === "1") return null;
  let cwd = ruta(cwdSesion, "") || norm(ROOT);
  for (const seg of expandir(command, env).split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean)) {
    const ids = new Set();
    for (const tok of seg.split(/[^\w.\/~:\\@+%-]+/)) {
      if (norm(tok).includes("tests/orden/")) { const id = ordenDe(tok, cwd); if (id) ids.add(id); }
    }
    const aqui = ordenDe(cwd, ""); // parado dentro de la carpeta de una orden: cualquier segmento que no lea es escritura posible
    if (aqui) ids.add(aqui);
    const redirigidas = [...seg.matchAll(REDIR)].map((m) => ordenDe(m[1].replace(/^['"]+|['"]+$/g, ""), cwd)).filter(Boolean);
    const conRojo = [...ids].filter((id) => hoja(id));
    if (conRojo.length && !lectura(seg)) return { id: conRojo[0], seg };
    const redirRojo = redirigidas.find((id) => hoja(id));
    if (redirRojo) return { id: redirRojo, seg };
    const cd = seg.match(/^cd(?:\s+(\S+))?$/);
    if (cd) cwd = cd[1] ? ruta(cd[1].replace(/^['"]+|['"]+$/g, ""), cwd) || cwd : norm(homedir());
  }
  return null;
}

/** stdin → { tool_name, tool_input, cwd }; cualquier otra forma lanza (VERDAD-04 B1: el que llama responde CANDADO ROTO). */
function entrada() {
  let o;
  try { o = JSON.parse(readFileSync(0, "utf8")); } catch { throw new Error("stdin vacío o que no es JSON"); }
  if (!o || typeof o !== "object" || !o.tool_input || typeof o.tool_input !== "object") throw new Error("JSON sin tool_input");
  if (SHELLS.has(o.tool_name)) {
    if (typeof o.tool_input.command !== "string") throw new Error("tool_input.command no es string");
  } else if (typeof o.tool_input.file_path !== "string") throw new Error("tool_input.file_path no es string");
  return o;
}

function main() {
  const o = entrada();
  if (SHELLS.has(o.tool_name)) {
    const command = o.tool_input.command;
    if (!command.trim()) return 0;
    const v = vetoShell(command, typeof o.cwd === "string" ? o.cwd : ROOT);
    if (!v) return 0;
    console.error(`CANDADO · orden «${v.id}» bajo candado: ${o.tool_name} nombra tests/orden/${v.id}/ en «${v.seg.slice(0, 160)}» sin ser una lectura reconocida (HOJA.md en la historia de main: el rojo está comprometido). Sólo la sesión A con HIGIENE_PERMITIR_TESTS=1.`);
    return 2;
  }
  const crudo = o.tool_input.file_path.trim();
  if (!crudo) return 0;
  const abs = isAbsolute(crudo) ? crudo : resolve(ROOT, crudo);
  const rel = relative(ROOT, abs).split("\\").join("/");
  if (rel.startsWith("..") || isAbsolute(rel)) return 0; // fuera del repo: no es asunto del candado
  const motivo = veto(rel);
  if (!motivo) return 0;
  console.error(`CANDADO · ${motivo}`);
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let code;
  try { code = main(); } catch (e) { console.error(`CANDADO ROTO (${e.message}): bloquea en vez de dejar pasar.`); code = 2; }
  process.exit(code);
}
