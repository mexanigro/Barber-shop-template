// Helpers compartidos por los hooks de higiene (arranque, candado, cierre, higiene).
// Sin dependencias: sólo child_process y fs. ROOT = el repo donde vive este archivo.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PLAN = "C:/Users/liama/Desktop/Nichos/PLAN.md";
export const BLOQUE_DIR = "C:/Users/liama/Desktop/Nichos/bloque-04";
export const ROJO = (s) => `\x1b[31m${s}\x1b[0m`;

export function git(args, cwd = ROOT, timeout = 20000) {
  return execFileSync("git", args, { cwd, encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function estado(cwd = ROOT) {
  const rama = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  const head = git(["rev-parse", "HEAD"], cwd);
  const sucios = git(["status", "--porcelain"], cwd).split("\n").filter(Boolean);
  let sinPush = [];
  try { sinPush = git(["log", "--format=%h %s", "@{u}..HEAD"], cwd).split("\n").filter(Boolean); }
  catch { sinPush = ["(sin upstream: no se puede saber qué falta pushear)"]; }
  let detras = "?";
  try { detras = git(["rev-list", "--count", "HEAD..@{u}"], cwd); } catch {}
  return { rama, head, sucios, sinPush, detras };
}

// Primera fila de la tabla § Estado de PLAN.md cuyo estado no empieza por "cerrado".
export function filaAbierta() {
  const texto = readFileSync(PLAN, "utf8");
  const seccion = texto.split(/^## Estado\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  for (const linea of seccion.split("\n")) {
    const celdas = linea.split("|").map((c) => c.trim());
    if (celdas.length < 4 || celdas[1] === "Bloque" || /^-+$/.test(celdas[1])) continue;
    if (!/^cerrado/i.test(celdas[2])) return { bloque: celdas[1], estado: celdas[2], pantalla: celdas[3] };
  }
  return null;
}

// ¿La fila abierta cita este commit? Acepta cualquier prefijo hex de ≥7 chars del SHA.
export function filaCita(fila, sha) {
  if (!fila) return false;
  const texto = `${fila.estado} ${fila.pantalla}`;
  return (texto.match(/\b[0-9a-f]{7,40}\b/g) ?? []).some((h) => sha.startsWith(h));
}

export function ultimasDecisiones(n = 3) {
  if (!existsSync(BLOQUE_DIR)) return [];
  return readdirSync(BLOQUE_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ f, t: statSync(`${BLOQUE_DIR}/${f}`).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .slice(0, n)
    .map(({ f, t }) => {
      const primera = readFileSync(`${BLOQUE_DIR}/${f}`, "utf8").split("\n").find((l) => l.trim()) ?? "";
      return `${new Date(t).toISOString().slice(0, 16).replace("T", " ")}  ${f}  ${primera.slice(0, 90)}`;
    });
}
