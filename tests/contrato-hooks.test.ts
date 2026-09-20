// El CLAUDE.md declara EXACTAMENTE los hooks que existen en .claude/settings.json y .githooks/ (y los scripts node que cada hook de git ejecuta).
// Una negación no se puede expresar en prosa para una máquina: se declara en el bloque
// CONTRATO-DECLARADO y este guard lo compara contra el disco en las dos direcciones.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BLOQUE = /<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/; // \r?\n: con autocrlf el working copy puede ser CRLF (HIGIENE-02)

function declarado(): Record<string, string> {
  const m = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8").match(BLOQUE);
  assert.ok(m, "CLAUDE.md no tiene su bloque CONTRATO-DECLARADO: sin él este guard quedaría verde sin mirar");
  const pares: Record<string, string> = {};
  for (const linea of m[1].split(/\r?\n/)) {
    if (!linea.trim() || linea.trim().startsWith("#")) continue;
    const [k, ...v] = linea.split("=");
    pares[k.trim()] = v.join("=").trim();
  }
  return pares;
}

function real(): Record<string, string> {
  const cfg = JSON.parse(readFileSync(resolve(ROOT, ".claude/settings.json"), "utf8")).hooks ?? {};
  const pares: Record<string, string> = {};
  for (const [evento, entradas] of Object.entries<any>(cfg)) {
    pares[`hook.${evento}`] = entradas
      .map((e: any) => `${e.matcher ?? "*"} :: ${e.hooks.map((h: any) => basename(String(h.command).split(" ").pop()!)).join(" ")}`)
      .join(" | ");
  }
  const githooks = readdirSync(resolve(ROOT, ".githooks")).sort();
  pares["githooks"] = githooks.join(" ");
  // VERDAD-03 E1: lo que cada hook de git EJECUTA: los `node tools/…mjs` de sus líneas (sin comentarios), basenames en orden con sus
  // argumentos; un hook sin scripts node vale «(ninguno)».
  for (const hook of githooks) {
    const scripts: string[] = [];
    for (const linea of readFileSync(resolve(ROOT, ".githooks", hook), "utf8").split(/\r?\n/)) {
      if (linea.trim().startsWith("#")) continue;
      for (const m of linea.matchAll(/\bnode\s+(tools\/\S+\.mjs)((?:\s+-[\w-]+)*)/g)) scripts.push(`${basename(m[1])}${m[2]}`);
    }
    pares[`githook.${hook}`] = scripts.join(" ") || "(ninguno)";
  }
  const prepare = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.prepare ?? "";
  pares["git.hooksPath"] = /core\.hooksPath \.githooks/.test(prepare) ? ".githooks (npm prepare)" : "(ninguno)";
  return pares;
}

test("CLAUDE.md declara exactamente los hooks presentes en .claude/settings.json, .githooks/ y npm prepare", () => {
  assert.deepEqual(declarado(), real());
});

// HIGIENE-02 (2026-09-19): las puertas revisan los dos repos. _git.mjs exporta ROOTS con dos entradas (propio + hermano por ruta fija).
test("HIGIENE-02: tools/_git.mjs exporta ROOTS con dos entradas, el propio primero", async () => {
  const g = await import("../tools/_git.mjs");
  assert.ok(Array.isArray(g.ROOTS) && g.ROOTS.length === 2, `ROOTS debe tener dos entradas: ${JSON.stringify(g.ROOTS)}`);
  assert.equal(g.ROOTS[0], g.ROOT, "la primera entrada es el repo propio");
  assert.notEqual(g.ROOTS[1], g.ROOT, "la segunda entrada es el hermano");
  assert.ok(/Nichos-hub$|Barber-shop-template-main$/.test(String(g.ROOTS[1]).replace(/\\/g, "/")), "el hermano es T o H por ruta fija");
});
