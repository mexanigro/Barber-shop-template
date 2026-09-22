// HOOK PreToolUse (Edit|Write|MultiEdit|Bash|PowerShell). Bloquea (exit 2) escrituras en:
//   .env* (salvo .env.example) · dumps *-config-*.json / live-hub-*.json / *serviceAccount*.json ·
//   capturas y media fuera de public/ (y src/app/ en Next) que no estén ya rastreadas ·
//   scripts sueltos nuevos en la raíz · y, si el repo los tiene, los archivos de los seis nichos
//   (presets barberia/estetica/tattoo/nails/cafeteria/remodelaciones y sus familias de componentes)
//   sin HIGIENE_PERMITIR_FLOTA=1, que Liam da por orden ·
//   y los tests de una orden (VERDAD-02): cualquier archivo bajo tests/orden/<id>/ (también nuevos) cuando
//   tests/orden/<id>/HOJA.md ya está en HEAD (commit rojo hecho), salvo permiso de la sesión A que escribe los
//   tests rojos. Antes del commit rojo se escribe libre.
//   VERDAD-07 (2026-09-21, D-30): el permiso es el ARCHIVO <raíz>/.git/permitir-tests con contenido exactamente «1»
//   (tras trim; «0» o vacío no abren), que Liam crea y borra; la variable HIGIENE_PERMITIR_TESTS ya no abre (entraba
//   por settings.local.json y sobrevivía en toda sesión abierta). El veto termina con «permiso: <raíz>/.git/permitir-tests
//   ausente» (o «con contenido distinto de 1»). Edit/Write/MultiEdit y shells, misma regla.
//   VERDAD-03: el candado mira la HISTORIA de main (`git log main --diff-filter=A -- tests/orden/<id>/HOJA.md`),
//   no sólo HEAD: una orden cuyo rojo fue revertido sigue bajo candado; una nunca commiteada sigue libre.
//   tests/orden/APROBADAS.md no es la carpeta de una orden: se escribe sin permiso.
//   HIGIENE_ROOT=<ruta> sustituye la raíz del repo sólo para probar el hook contra un repo temporal.
//   VERDAD-08 (2026-09-22, D-54): las órdenes se vigilan en LAS DOS raíces del par (`ROOTS` de tools/_git.mjs: propio + hermano por
//   ruta fija; HIGIENE_ROOTS=<a>;<b> las sustituye sólo para pruebas, como cierre.mjs). Una sesión abierta en un repo ya no puede
//   escribir `tests/orden/<id>/` del otro por ruta absoluta: el veto lleva «(hermano)» y el permiso es el `.git/permitir-tests` de la
//   raíz dueña de la orden. Del hermano sólo se vigilan las órdenes; las demás reglas (.env, dumps, media, scripts, flota) son del propio.
// Falla cerrado: si el hook revienta, bloquea. Fuera del repo no opina.
//   VERDAD-04 (2026-09-21): la entrada tiene que ser JSON con `tool_input.file_path` de tipo string; stdin vacío, que no es
//   JSON, sin `tool_input` o con `file_path` de otro tipo → exit 2 con «CANDADO ROTO» (antes «{}» dejaba pasar en silencio).
//   Un veto se explica como «CANDADO · …», nunca como «ROTO».
//   VERDAD-06 (2026-09-21, D-25): también Bash y PowerShell, SÓLO para tests/orden/<id>/ con rojo en la historia. Con esos
//   tool_name la entrada exige `tool_input.command` string (si no → «CANDADO ROTO»; vacío → 0). El comando se parte con
//   `segmentos()` de _transcript.mjs (VERDAD-08, D-55: una cadena entre comillas es UN token aunque lleve `|`, `;`, `&&` o comillas
//   escapadas, así que `grep -n -E "a|b" <orden>/HOJA.md` ya no se parte por dentro); se sigue el cwd (el `cwd` del JSON, después
//   cada `cd`). D-56: `cp` escribe sólo en su último argumento sin guion (el origen es lectura); `mv`, `rm`, `mkdir`, `touch` y `tee`,
//   en todos. Un segmento que nombra
//   tests/orden/<id>/ (ruta relativa al cwd o absoluta dentro de la raíz, también la del propio `cd`) con HOJA.md en la historia
//   de main → veto, salvo lectura reconocida (primer token cat|head|tail|grep|rg|wc|ls|diff|cmp|sha256sum; sed sólo con -n y sin
//   -i; git sólo diff|log|show|status|ls-files|blame|check-ignore; node/npx sólo con --test; y ninguna redirección > >> hacia la
//   orden) o el permiso .git/permitir-tests = 1. Fuera de tests/orden/ el candado no opina sobre shells (exit 0, aunque el comando
//   escriba: el cierre ya lo clasifica, VERDAD-02 C5); un comando que no se entiende y no nombra tests/orden/ → 0.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import { ROOTS as RAICES_FIJAS, git } from "./_git.mjs";
import { dentro, norm, ruta, segmentos } from "./_transcript.mjs";

/** Las raíces que el candado vigila (D-54): el par T/H de _git.mjs, o una sola con HIGIENE_ROOT (pruebas). La propia va primera. */
const RAICES = process.env.HIGIENE_ROOT ? [resolve(process.env.HIGIENE_ROOT)] : RAICES_FIJAS.map((r) => resolve(r));
const ROOT = RAICES[0];
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
const DISCO = /^(cp|mv|rm|mkdir|touch|tee)$/; // D-56: comandos que escriben; `cp`, sólo en su último argumento

function rastreado(rel) {
  try { return git(["ls-files", "--error-unmatch", rel], ROOT) !== ""; } catch { return false; }
}

/** ¿Algún commit de main (o de HEAD, sin main) de `raiz` añadió tests/orden/<id>/HOJA.md? (el commit rojo de esa orden existe o existió) */
const historia = new Map();
function hojaEnHistoria(id, raiz = ROOT) {
  const clave = `${raiz}::${id}`;
  if (historia.has(clave)) return historia.get(clave);
  let rama = "HEAD";
  try { git(["rev-parse", "--verify", "-q", "main"], raiz); rama = "main"; } catch {}
  let hay = false;
  try { hay = git(["log", "--format=%H", "--diff-filter=A", rama, "--", `tests/orden/${id}/HOJA.md`], raiz) !== ""; } catch {}
  historia.set(clave, hay);
  return hay;
}

/** Permiso de la sesión A (VERDAD-07 D-30): <raíz>/.git/permitir-tests con contenido exactamente «1» tras trim. "" si abre; si no, el
 *  motivo. D-54: es el de la raíz DUEÑA de la orden, no el del repo desde el que se escribe. */
function sinPermiso(raiz = ROOT) {
  const archivo = resolve(raiz, ".git", "permitir-tests");
  let texto;
  try { texto = readFileSync(archivo, "utf8"); } catch { return `permiso: ${archivo} ausente`; }
  return texto.trim() === "1" ? "" : `permiso: ${archivo} con contenido distinto de 1`;
}

/** Motivo por el que `rel` cae en la carpeta de una orden congelada de `raiz` ("" si no). */
function vetoOrden(rel, raiz, hoja = hojaEnHistoria, permiso = sinPermiso) {
  const orden = rel.match(/^tests\/orden\/([^/]+)\//);
  if (!orden || !hoja(orden[1], raiz)) return "";
  const falta = permiso(raiz);
  if (!falta) return "";
  return `orden «${orden[1]}»${raiz === ROOT ? "" : " (hermano)"} bajo candado: ${rel} en ${raiz} (HOJA.md en la historia de main: el rojo está comprometido). Sólo la sesión A con .git/permitir-tests = 1 · ${falta}`;
}

export function veto(rel, env = process.env, tracked = rastreado, hoja = hojaEnHistoria, permiso = sinPermiso, raiz = ROOT) {
  const base = rel.split("/").pop();
  const orden = vetoOrden(rel, raiz, hoja, permiso);
  if (orden) return orden;
  if (raiz !== ROOT) return ""; // del hermano sólo se vigilan las órdenes (D-54)
  if (/^\.env(\..+)?$/.test(base) && base !== ".env.example") return `${rel}: los .env no se escriben desde el agente (credenciales sólo por env, regla 3).`;
  if (/(-config-|^config-dump-).*\.json$/.test(base) || /^live-hub-.*\.json$/.test(base) || /serviceAccount.*\.json$/i.test(base)) return `${rel}: dumps de config y credenciales no entran al repo.`;
  if (MEDIA.test(base) && !rel.startsWith("public/") && !rel.startsWith("src/app/") && !tracked(rel)) return `${rel}: capturas y media sólo en public/ (las de QA van fuera del repo).`;
  if (SCRIPT_RAIZ.test(rel) && !tracked(rel)) return `${rel}: sin scripts sueltos en la raíz; van a tools/ o scripts/.`;
  if (FLOTA.some((re) => re.test(rel)) && existsSync(resolve(ROOT, "src/config/presets/barberia.he.ts")) && env.HIGIENE_PERMITIR_FLOTA !== "1") {
    return `${rel}: archivo de los seis nichos (flota en producción). Sólo con HIGIENE_PERMITIR_FLOTA=1, que Liam da por orden.`;
  }
  return "";
}

/** { id, raiz } si `p` (relativa al cwd o absoluta) cae bajo <raíz>/tests/orden/<id> en alguna de las raíces vigiladas; null si no. */
function ordenDe(p, cwd) {
  const abs = ruta(p, cwd);
  if (!abs) return null;
  for (const raiz of RAICES) {
    if (!dentro(abs, raiz)) continue;
    const m = abs.slice(norm(raiz).length + 1).match(ORDEN);
    if (m) return { id: m[1], raiz };
  }
  return null;
}

/** Tokens del segmento sin comillas y sin las palabras del shell ni las asignaciones de delante (HOJA-06 § Interfaz). */
function palabras(seg) {
  const t = seg.split(/\s+/).map((a) => a.replace(/^['"]+|['"]+$/g, "")).filter(Boolean);
  while (t.length && PREFIJO.test(t[0])) t.shift();
  return t;
}

/** Argumentos en los que un comando de disco ESCRIBE (D-56): `cp` sólo el último sin guion (el origen es lectura); `mv`, `rm`,
 *  `mkdir`, `touch` y `tee`, todos. null = no es un comando de disco y decide la regla general. */
function destinosDeDisco(t) {
  const cmd = t[0] ?? "";
  if (!DISCO.test(cmd)) return null;
  const rutas = t.slice(1).filter((a) => !a.startsWith("-"));
  return cmd === "cp" ? rutas.slice(-1) : rutas;
}

/** ¿El segmento es una lectura reconocida? Primer token tras palabras del shell y asignaciones (HOJA-06 § Interfaz). */
function lectura(seg) {
  const t = palabras(seg);
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

/** Primer segmento del comando que escribe en la carpeta de una orden con rojo (en cualquiera de las raíces) sin ser lectura:
 *  { id, raiz, seg, falta } o null. D-55: el reparto lo hace `segmentos()` (las comillas no parten); D-56: `cp` escribe en su destino. */
export function vetoShell(command, cwdSesion, env = process.env, hoja = hojaEnHistoria, permiso = sinPermiso) {
  let cwd = ruta(cwdSesion, "") || norm(ROOT);
  for (const seg of segmentos(command, env, { conTexto: true })) {
    const candidatos = [];
    const anotar = (p) => { const o = ordenDe(p, cwd); if (o) candidatos.push(o); };
    const destinos = destinosDeDisco(palabras(seg));
    if (destinos) {
      for (const p of destinos) anotar(p);
    } else if (!lectura(seg)) {
      for (const tok of seg.split(/[^\w.\/~:\\@+%-]+/)) if (norm(tok).includes("tests/orden/")) anotar(tok);
      anotar(cwd); // parado dentro de la carpeta de una orden: cualquier segmento que no lea es escritura posible
    }
    for (const m of seg.matchAll(REDIR)) anotar(m[1].replace(/^['"]+|['"]+$/g, ""));
    for (const c of candidatos) {
      if (!hoja(c.id, c.raiz)) continue;
      const falta = permiso(c.raiz);
      if (falta) return { ...c, seg, falta };
    }
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
    console.error(`CANDADO · orden «${v.id}»${v.raiz === ROOT ? "" : " (hermano)"} bajo candado: ${o.tool_name} nombra tests/orden/${v.id}/ de ${v.raiz} en «${v.seg.slice(0, 160)}» sin ser una lectura reconocida (HOJA.md en la historia de main: el rojo está comprometido). Sólo la sesión A con .git/permitir-tests = 1 · ${v.falta}`);
    return 2;
  }
  const crudo = o.tool_input.file_path.trim();
  if (!crudo) return 0;
  const abs = isAbsolute(crudo) ? crudo : resolve(ROOT, crudo);
  for (const raiz of RAICES) { // D-54: el propio y el hermano
    if (!dentro(abs, raiz)) continue;
    const motivo = veto(relative(raiz, abs).split("\\").join("/"), process.env, rastreado, hojaEnHistoria, sinPermiso, raiz);
    if (!motivo) return 0;
    console.error(`CANDADO · ${motivo}`);
    return 2;
  }
  return 0; // fuera de los dos repos: no es asunto del candado
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let code;
  try { code = main(); } catch (e) { console.error(`CANDADO ROTO (${e.message}): bloquea en vez de dejar pasar.`); code = 2; }
  process.exit(code);
}
