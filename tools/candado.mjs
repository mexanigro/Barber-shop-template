// HOOK PreToolUse (Edit|Write|MultiEdit). Bloquea (exit 2) escrituras en:
//   .env* (salvo .env.example) · dumps *-config-*.json / live-hub-*.json / *serviceAccount*.json ·
//   capturas y media fuera de public/ (y src/app/ en Next) que no estén ya rastreadas ·
//   scripts sueltos nuevos en la raíz · y, si el repo los tiene, los archivos de los seis nichos
//   (presets barberia/estetica/tattoo/nails/cafeteria/remodelaciones y sus familias de componentes)
//   sin HIGIENE_PERMITIR_FLOTA=1, que Liam da por orden.
// Falla cerrado: si el hook revienta, bloquea. Fuera del repo no opina.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";
import { ROOT, git } from "./_git.mjs";

const SEIS = "(barberia|estetica|tattoo|nails|cafeteria|remodelaciones)";
const FLOTA = [
  new RegExp(`^src/config/presets/${SEIS}\.(en|he|ru|ar)\.ts$`),
  /^src\/components\/landing\/[^/]+\/(estetica|aura)\//,
];
const MEDIA = /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)$/i;
const SCRIPT_RAIZ = /^[^/]+\.(mjs|cjs|js|ts|tsx|ps1|py|sh|bat|cmd)$/;

function rastreado(rel) {
  try { return git(["ls-files", "--error-unmatch", rel]) !== ""; } catch { return false; }
}

export function veto(rel, env = process.env, tracked = rastreado) {
  const base = rel.split("/").pop();
  if (/^\.env(\..+)?$/.test(base) && base !== ".env.example") return `${rel}: los .env no se escriben desde el agente (credenciales sólo por env, regla 3).`;
  if (/(-config-|^config-dump-).*\.json$/.test(base) || /^live-hub-.*\.json$/.test(base) || /serviceAccount.*\.json$/i.test(base)) return `${rel}: dumps de config y credenciales no entran al repo.`;
  if (MEDIA.test(base) && !rel.startsWith("public/") && !rel.startsWith("src/app/") && !tracked(rel)) return `${rel}: capturas y media sólo en public/ (las de QA van fuera del repo).`;
  if (SCRIPT_RAIZ.test(rel) && !tracked(rel)) return `${rel}: sin scripts sueltos en la raíz; van a tools/ o scripts/.`;
  if (FLOTA.some((re) => re.test(rel)) && existsSync(resolve(ROOT, "src/config/presets/barberia.he.ts")) && env.HIGIENE_PERMITIR_FLOTA !== "1") {
    return `${rel}: archivo de los seis nichos (flota en producción). Sólo con HIGIENE_PERMITIR_FLOTA=1, que Liam da por orden.`;
  }
  return "";
}

function main() {
  let entrada = {};
  try { entrada = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
  const crudo = String(entrada.tool_input?.file_path ?? "").trim();
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
