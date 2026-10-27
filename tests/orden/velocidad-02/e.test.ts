// VELOCIDAD-02 · E1 (T+H, mismo archivo en los dos repos). El repo se etiqueta por sufijo de ruta, como tools/_git.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const ES_H = /nichos-hub$/i.test(ROOT.replace(/\\/g, "/"));
const BASE = ES_H ? "6f77557" : "e6512d5";
const BLOQUE = /<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/;
const bloque = (texto: string) => (texto.match(BLOQUE)?.[1] ?? "").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);

test("CLAUDE.md § Puertas automáticas tiene un párrafo VELOCIDAD-02 que nombra «commit de corrección», «## Correcciones», «árbol rojo» y «D-394», y el bloque CONTRATO-DECLARADO es idéntico al de T e6512d5 · H 6f77557", () => {
  const claude = readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8");
  const desde = claude.indexOf("## Puertas automáticas");
  const puertas = claude.slice(desde, claude.indexOf("\n## ", desde + 5));
  const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*VELOCIDAD-02 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
  assert.ok(parrafo, `§ Puertas automáticas de ${ES_H ? "H" : "T"} debe tener un párrafo «**VELOCIDAD-02 (AAAA-MM-DD):**»`);
  for (const p of ["commit de corrección", "## Correcciones", "árbol rojo", "D-394"]) assert.ok(parrafo.includes(p), `el párrafo VELOCIDAD-02 nombra «${p}»`);
  const antes = execFileSync("git", ["show", `${BASE}:CLAUDE.md`], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  assert.ok(bloque(antes).length, `${BASE} tiene bloque CONTRATO-DECLARADO`);
  assert.deepEqual(bloque(claude), bloque(antes), `el bloque CONTRATO-DECLARADO es idéntico al de ${BASE} (D-398)`);
});
