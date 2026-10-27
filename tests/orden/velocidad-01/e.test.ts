// VELOCIDAD-01 · E1 (T+H, mismo archivo en los dos repos). El repo se etiqueta por sufijo de ruta, como tools/_git.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const ES_H = /nichos-hub$/i.test(ROOT.replace(/\\/g, "/"));
const CRM_05_B = ES_H ? "e12c64f" : "baeee1a";
const BLOQUE = /<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/;
const bloque = (texto: string) => (texto.match(BLOQUE)?.[1] ?? "").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);

test("CLAUDE.md § Puertas tiene un párrafo VELOCIDAD-01 que nombra «test:commit», «tests-del-commit.mjs», «test:verdad», «batería entera», «riesgo», «una sola sesión» y «commit de corrección»; y el bloque CONTRATO-DECLARADO es idéntico al del commit de CRM-05 B (T baeee1a · H e12c64f)", () => {
  const claude = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8");
  const puertas = claude.slice(claude.indexOf("## Puertas automáticas"), claude.indexOf("\n## ", claude.indexOf("## Puertas automáticas") + 5));
  const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*VELOCIDAD-01 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
  assert.ok(parrafo, `§ Puertas automáticas de ${ES_H ? "H" : "T"} debe tener un párrafo «**VELOCIDAD-01 (AAAA-MM-DD):**»`);
  for (const p of ["test:commit", "tests-del-commit.mjs", "test:verdad", "batería entera", "riesgo", "una sola sesión", "commit de corrección"]) {
    assert.ok(parrafo.includes(p), `el párrafo VELOCIDAD-01 nombra «${p}»`);
  }
  const antes = execFileSync("git", ["show", `${CRM_05_B}:CLAUDE.md`], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.ok(bloque(antes).length, `${CRM_05_B} tiene bloque CONTRATO-DECLARADO`);
  assert.deepEqual(bloque(claude), bloque(antes), `el bloque CONTRATO-DECLARADO es idéntico al de ${CRM_05_B} (D-392)`);
});
