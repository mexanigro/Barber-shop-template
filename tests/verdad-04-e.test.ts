// VERDAD-04 · E · registro en CLAUDE.md § Puertas (párrafo VERDAD-04) sin tocar el bloque CONTRATO-DECLARADO. Sesión A (2026-09-21):
// test rojo; lee disco y compara el bloque con el del commit aprobado (H c852e89 / T 0d8c51f) por git show.
// VERDAD-05 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-04/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOT, SOY, bloqueContrato, git, seccionPuertas } from "./orden/verdad-04/_util.ts";

/** Commit aprobado de VERDAD-03 en este repo (Liam, 2026-09-21): el bloque CONTRATO-DECLARADO no debe moverse de ahí. */
const APROBADO = { T: "0d8c51f", H: "c852e89" }[SOY];

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado (misma regex que bloqueContrato, sobre otro texto). */
function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}

test("CLAUDE.md § Puertas tiene un párrafo VERDAD-04 que nombra «>=», «stash», «CANDADO ROTO», «carpetas temporales» y «todas las fallas»; y el bloque CONTRATO-DECLARADO no cambia", () => {
  const parrafos = seccionPuertas().split(/\r?\n\s*\r?\n/);
  const p4 = parrafos.find((p) => /VERDAD-04/.test(p));
  assert.ok(p4, "§ Puertas debe tener un párrafo VERDAD-04");
  for (const nombre of [">=", "stash", "CANDADO ROTO", "carpetas temporales", "todas las fallas"]) {
    assert.ok(p4.includes(nombre), `el párrafo VERDAD-04 debe nombrar «${nombre}»:\n${p4}`);
  }
  // Los párrafos anteriores siguen ahí (el registro se añade, no se reescribe).
  for (const v of ["VERDAD-02", "VERDAD-03"]) assert.ok(parrafos.some((p) => p.includes(v) && !/VERDAD-04/.test(p)), `§ Puertas sigue teniendo su párrafo ${v}`);
  // El bloque CONTRATO-DECLARADO no cambia: byte a byte el del commit aprobado (fin de línea normalizado).
  const aprobado = bloqueDe(git(ROOT, "show", `${APROBADO}:CLAUDE.md`)).replace(/\r\n/g, "\n");
  assert.match(aprobado, /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/m, "precondición: el bloque aprobado declara el pre-push con rojo-verde");
  assert.equal(bloqueContrato().replace(/\r\n/g, "\n"), aprobado, `el bloque CONTRATO-DECLARADO debe ser el de ${APROBADO}`);
});
