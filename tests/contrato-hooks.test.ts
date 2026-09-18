// El CLAUDE.md declara EXACTAMENTE los hooks que existen en .claude/settings.json y .githooks/.
// Una negación no se puede expresar en prosa para una máquina: se declara en el bloque
// CONTRATO-DECLARADO y este guard lo compara contra el disco en las dos direcciones.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BLOQUE = /<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\n([\s\S]*?)```/;

function declarado(): Record<string, string> {
  const m = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8").match(BLOQUE);
  assert.ok(m, "CLAUDE.md no tiene su bloque CONTRATO-DECLARADO: sin él este guard quedaría verde sin mirar");
  const pares: Record<string, string> = {};
  for (const linea of m[1].split("\n")) {
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
  pares["githooks"] = readdirSync(resolve(ROOT, ".githooks")).sort().join(" ");
  const prepare = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.prepare ?? "";
  pares["git.hooksPath"] = /core\.hooksPath \.githooks/.test(prepare) ? ".githooks (npm prepare)" : "(ninguno)";
  return pares;
}

test("CLAUDE.md declara exactamente los hooks presentes en .claude/settings.json, .githooks/ y npm prepare", () => {
  assert.deepEqual(declarado(), real());
});
