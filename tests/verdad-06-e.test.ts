// VERDAD-06 · E · registro en CLAUDE.md § Puertas automáticas (párrafo VERDAD-06) y el bloque CONTRATO-DECLARADO que cambia sólo en
// hook.PreToolUse (B1). Sesión A (2026-09-21): test rojo; lee disco y compara el bloque, línea a línea, con el del commit aprobado de
// CONEXION-01 (T fdf0ca2 / H 3132b22) por git show. Un mismo archivo en T y en H (cmp → 0).
// VERDAD-07 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-06/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CONEXION_01, ROOT, SOY, bloqueContrato, git, paresIni, seccionPuertas } from "./orden/verdad-06/_util.ts";

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado (misma regex que bloqueContrato, sobre otro texto). */
function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}

test("CLAUDE.md § Puertas tiene un párrafo VERDAD-06 que nombra «clon», «tests/helpers», «Bash», «autocrlf» y «disco = blob», y el bloque CONTRATO-DECLARADO cambia sólo en `hook.PreToolUse`", () => {
  const parrafo = seccionPuertas().split(/\r?\n/).find((l) => /^\*\*VERDAD-06 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
  assert.ok(parrafo, `§ Puertas automáticas de ${SOY} debe tener un párrafo «**VERDAD-06 (AAAA-MM-DD):**»:\n${seccionPuertas()}`);
  for (const nombre of ["clon", "tests/helpers", "Bash", "autocrlf", "disco = blob"]) assert.ok(parrafo.includes(nombre), `el párrafo VERDAD-06 debe nombrar «${nombre}»:\n${parrafo}`);
  // El bloque: línea a línea igual al del commit aprobado de CONEXION-01, salvo hook.PreToolUse, que pasa a Edit|Write|MultiEdit|Bash|PowerShell.
  const aprobado = paresIni(bloqueDe(git(ROOT, "show", `${CONEXION_01.aprobado[SOY]}:CLAUDE.md`)));
  assert.equal(aprobado.get("hook.PreToolUse"), "Edit|Write|MultiEdit :: candado.mjs", "precondición: el bloque aprobado declara el candado sólo para Edit|Write|MultiEdit");
  const actual = paresIni(bloqueContrato());
  assert.equal(actual.get("hook.PreToolUse"), "Edit|Write|MultiEdit|Bash|PowerShell :: candado.mjs", `hook.PreToolUse debe ser «Edit|Write|MultiEdit|Bash|PowerShell :: candado.mjs» (es «${actual.get("hook.PreToolUse")}»)`);
  assert.deepEqual([...actual.keys()], [...aprobado.keys()], "las mismas claves, en el mismo orden");
  for (const [k, v] of aprobado) if (k !== "hook.PreToolUse") assert.equal(actual.get(k), v, `«${k}» no cambia respecto a ${CONEXION_01.aprobado[SOY]}`);
});
