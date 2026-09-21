// CONEXION-01 · E · registro en CLAUDE.md § Arquitectura mínima (dónde vive el material de un cliente) sin tocar el bloque
// CONTRATO-DECLARADO. Sesión A (2026-09-21): test rojo; lee disco y compara el bloque con el del commit aprobado de VERDAD-05
// (T 30b7daa / H 8239e2d) por git show. Un mismo archivo en T y en H (cmp → 0): lo que cada repo debe nombrar se elige por SOY.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOT, SOY, bloqueContrato, git, seccionDe } from "./_util.ts";

/** Commit aprobado de VERDAD-05 en este repo (Liam, 2026-09-21): el bloque CONTRATO-DECLARADO no debe moverse de ahí. */
const APROBADO = { T: "30b7daa", H: "8239e2d" }[SOY];
/** Lo que § Arquitectura mínima debe nombrar en cada repo. */
const NOMBRA = { H: ["clients/<id>/media/", "Storage", "token", "subirMaterial"], T: ["media-src", "firebasestorage"] }[SOY];

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado (misma regex que bloqueContrato, sobre otro texto). */
function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}

test("CLAUDE.md § Arquitectura mínima dice dónde vive el material de un cliente (`clients/<id>/media/<rol>/` en Storage, url con token, por `subirMaterial` en H) y, en T, que la CSP permite `media-src` desde firebasestorage; y el bloque CONTRATO-DECLARADO no cambia", () => {
  const seccion = seccionDe("Arquitectura mínima");
  for (const nombre of NOMBRA) assert.ok(seccion.includes(nombre), `§ Arquitectura mínima de ${SOY} debe nombrar «${nombre}»:\n${seccion}`);
  // El bloque CONTRATO-DECLARADO no cambia: byte a byte el del commit aprobado (fin de línea normalizado).
  const aprobado = bloqueDe(git(ROOT, "show", `${APROBADO}:CLAUDE.md`)).replace(/\r\n/g, "\n");
  assert.match(aprobado, /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/m, "precondición: el bloque aprobado declara el pre-push con rojo-verde");
  assert.equal(bloqueContrato().replace(/\r\n/g, "\n"), aprobado, `el bloque CONTRATO-DECLARADO debe ser el de ${APROBADO}`);
});
