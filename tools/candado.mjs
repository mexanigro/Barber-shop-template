// HOOK PreToolUse (Edit|Write|MultiEdit). Bloquea (exit 2) escrituras en:
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
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import { ROOT as RAIZ_FIJA, git } from "./_git.mjs";

const ROOT = process.env.HIGIENE_ROOT ? resolve(process.env.HIGIENE_ROOT) : RAIZ_FIJA;
const SEIS = "(barberia|estetica|tattoo|nails|cafeteria|remodelaciones)";
const FLOTA = [
  new RegExp(`^src/config/presets/${SEIS}\.(en|he|ru|ar)\.ts$`),
  /^src\/components\/landing\/[^/]+\/(estetica|aura)\//,
];
const MEDIA = /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)$/i;
const SCRIPT_RAIZ = /^[^/]+\.(mjs|cjs|js|ts|tsx|ps1|py|sh|bat|cmd)$/;

function rastreado(rel) {
  try { return git(["ls-files", "--error-unmatch", rel], ROOT) !== ""; } catch { return false; }
}

/** ¿Algún commit de main (o de HEAD, sin main) añadió tests/orden/<id>/HOJA.md? (el commit rojo de esa orden existe o existió) */
function hojaEnHistoria(id) {
  let rama = "HEAD";
  try { git(["rev-parse", "--verify", "-q", "main"], ROOT); rama = "main"; } catch {}
  try { return git(["log", "--format=%H", "--diff-filter=A", rama, "--", `tests/orden/${id}/HOJA.md`], ROOT) !== ""; } catch { return false; }
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

/** stdin → { tool_name, tool_input: { file_path } }; cualquier otra forma lanza (VERDAD-04 B1: el que llama responde CANDADO ROTO). */
function entrada() {
  let o;
  try { o = JSON.parse(readFileSync(0, "utf8")); } catch { throw new Error("stdin vacío o que no es JSON"); }
  if (!o || typeof o !== "object" || !o.tool_input || typeof o.tool_input !== "object") throw new Error("JSON sin tool_input");
  if (typeof o.tool_input.file_path !== "string") throw new Error("tool_input.file_path no es string");
  return o;
}

function main() {
  const crudo = entrada().tool_input.file_path.trim();
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
