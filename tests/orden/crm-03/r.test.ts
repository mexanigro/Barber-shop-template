// CRM-03 · R1 (T+H) · el retiro de MARCA-01: sus copias promovidas en npm test (D-312). Sesión A (2026-10-15): test rojo.
// Igual byte a byte en T y en H; cada repo afirma sus propias copias (inciso n). Los nombres de los tests de cada copia son las
// frases de la hoja de MARCA-01 (`tests/orden/marca-01/HOJA.md`, congelada), leídas del árbol.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MARCA_01, REPO, ROOT, existe, fuente, git } from "./_comun.ts";

/** La frase de cada afirmación de una hoja: lo que va entre «(repo) » o «(repo, webs) » y « · fuente:». */
function frases(hoja: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of hoja.split(/\r?\n/)) {
    const m = l.match(/^- \[([A-Z]\d+)\] \((?:T|H|T\+H)(?:, webs)?\) (.*?) · fuente:/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
/** Los nombres de los tests (la llamada de node:test con su frase) de un archivo. */
function nombres(texto: string): string[] {
  return [...texto.matchAll(/\btest\(\s*("(?:[^"\\]|\\.)*")/g)].map((m) => JSON.parse(m[1]) as string);
}

const COPIAS: Record<string, string[]> = REPO === "T"
  ? { "tests/marca-01-a.test.ts": ["A1", "A2"], "tests/marca-01-b.test.ts": ["B1"] }
  : { "tests/marca-01-c.test.ts": ["C1"], "tests/marca-01-d.test.ts": ["D1", "D2"], "tests/marca-01-f.test.ts": ["F1"], "tests/marca-01-i.test.ts": ["I1"], "tests/marca-01-p.test.ts": ["P1"], "tests/marca-01-s.test.ts": ["S1"], "tests/marca-01-u.test.ts": ["U1"], "tests/marca-01-w.test.ts": ["W1"] };

test("npm test corre las copias de MARCA-01: en T tests/marca-01-a.test.ts entera y tests/marca-01-b.test.ts sólo con B1, en test:browser y test:unit; en H tests/marca-01-c, d, f, i, p y s enteras, u sin la huella de la guía y w sólo con el registro; cada copia importa ./orden/marca-01/_comun.ts y sus tests tienen los nombres de la hoja de MARCA-01; y tests/orden/marca-01/ no cambia desde su rojo", () => {
  const hoja = frases(fuente("tests/orden/marca-01/HOJA.md"));
  const fallas: string[] = [];
  for (const [copia, ids] of Object.entries(COPIAS)) {
    if (!existe(copia)) { fallas.push(`falta ${copia} (D-312)`); continue; }
    const t = fuente(copia);
    if (!/from "\.\/orden\/marca-01\/_comun\.ts"/.test(t)) fallas.push(`${copia} importa ./orden/marca-01/_comun.ts`);
    const n = nombres(t);
    const esperados = ids.map((id) => hoja[id]);
    // Las copias recortadas (u sin la huella, w sólo con el registro) llevan un nombre propio, como VENTA-01 G1 y PLANTILLA-01 W1.
    const recortada = /-(u|w)\.test\.ts$/.test(copia);
    if (recortada ? n.length !== 1 : JSON.stringify(n) !== JSON.stringify(esperados)) fallas.push(`${copia}: sus tests son ${ids.join(", ")} de la hoja de MARCA-01 (hoy ${n.length}: ${n.map((x) => x.slice(0, 40)).join(" | ")})`);
    if (copia.endsWith("-u.test.ts") && /sha256/.test(t)) fallas.push(`${copia}: sin la huella de la guía (no compara sha256)`);
    if (copia.endsWith("-w.test.ts") && /\b(vercel|dbReal|fetch)\(/.test(t)) fallas.push(`${copia}: sólo con el registro (sin Vercel, Firestore ni fetch)`);
  }
  if (REPO === "T") {
    const pkg = JSON.parse(fuente("package.json"));
    if (!String(pkg.scripts?.["test:browser"] ?? "").includes("tests/marca-01-a.test.ts")) fallas.push("package.json test:browser corre tests/marca-01-a.test.ts");
    if (!String(pkg.scripts?.["test:unit"] ?? "").includes("tests/marca-01-b.test.ts")) fallas.push("package.json test:unit corre tests/marca-01-b.test.ts");
  }
  const cambios = git(ROOT, "diff", "--name-only", MARCA_01.rojo[REPO], "HEAD", "--", "tests/orden/marca-01").trim();
  if (cambios) fallas.push(`tests/orden/marca-01/ cambió desde su rojo (${MARCA_01.rojo[REPO]}): ${cambios}`);
  assert.deepEqual(fallas, [], `el retiro de MARCA-01 en ${REPO}:\n${fallas.join("\n")}`);
});
