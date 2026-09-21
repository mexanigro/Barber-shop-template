// VERDAD-05 · E · registro en CLAUDE.md § Puertas (párrafo VERDAD-05) sin tocar el bloque CONTRATO-DECLARADO. Sesión A (2026-09-21):
// test rojo; lee disco y compara el bloque con el del commit aprobado de VERDAD-04 (T f202481 / H 7d42172) por git show.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOT, SOY, bloqueContrato, git, seccionPuertas } from "./_util.ts";

/** Commit aprobado de VERDAD-04 en este repo (Liam, 2026-09-21): el bloque CONTRATO-DECLARADO no debe moverse de ahí. */
const APROBADO = { T: "f202481", H: "7d42172" }[SOY];

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado (misma regex que bloqueContrato, sobre otro texto). */
function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}

test("CLAUDE.md § Puertas tiene un párrafo VERDAD-05 que nombra «contratos.json», «hueco.mjs», «recrear.mjs», «brecha» y «línea base»; y el bloque CONTRATO-DECLARADO no cambia", () => {
  const parrafos = seccionPuertas().split(/\r?\n\s*\r?\n/);
  const p5 = parrafos.find((p) => /VERDAD-05/.test(p));
  assert.ok(p5, "§ Puertas debe tener un párrafo VERDAD-05");
  for (const nombre of ["contratos.json", "hueco.mjs", "recrear.mjs", "brecha", "línea base"]) {
    assert.ok(p5.includes(nombre), `el párrafo VERDAD-05 debe nombrar «${nombre}»:\n${p5}`);
  }
  // Los párrafos anteriores siguen ahí (el registro se añade, no se reescribe).
  for (const v of ["VERDAD-02", "VERDAD-03", "VERDAD-04"]) assert.ok(parrafos.some((p) => p.includes(v) && !/VERDAD-05/.test(p)), `§ Puertas sigue teniendo su párrafo ${v}`);
  // El bloque CONTRATO-DECLARADO no cambia: byte a byte el del commit aprobado (fin de línea normalizado).
  const aprobado = bloqueDe(git(ROOT, "show", `${APROBADO}:CLAUDE.md`)).replace(/\r\n/g, "\n");
  assert.match(aprobado, /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/m, "precondición: el bloque aprobado declara el pre-push con rojo-verde");
  assert.equal(bloqueContrato().replace(/\r\n/g, "\n"), aprobado, `el bloque CONTRATO-DECLARADO debe ser el de ${APROBADO}`);
});
