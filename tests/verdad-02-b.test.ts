// VERDAD-02 · B · candado sobre los tests de una orden (tools/candado.mjs + HIGIENE_PERMITIR_TESTS, decisión D-1).
// Sesión A (2026-09-20): tests rojos. Caja negra: se lanza `node tools/candado.mjs` del repo real con el stdin JSON de Claude Code.
// VERDAD-04 C1 (2026-09-21): este archivo no crea ninguna carpeta temporal (el candado sólo lee rutas del repo real y no escribe);
// no hay nada que borrar en un `finally`, y por eso no tiene uno.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, candado, git, seccionPuertas } from "./orden/verdad-02/_util.ts";

const ORDEN = "tests/orden/verdad-02";
const SIN = "tests/orden/zz-sin-commit"; // carpeta de una orden que no está en HEAD

test("candado.mjs corta con exit 2 un Edit, Write o MultiEdit sobre tests/orden/<id>/… cuando tests/orden/<id>/HOJA.md ya existe en HEAD, salvo HIGIENE_PERMITIR_TESTS=1 en el entorno", () => {
  const archivo = resolve(ROOT, `${ORDEN}/a.test.ts`);
  for (const tool of ["Edit", "Write", "MultiEdit"]) {
    const sin = candado(tool, archivo);
    assert.equal(sin.status, 2, `${tool} sobre ${ORDEN}/ con HOJA.md en HEAD debe dar 2 (salió ${sin.status})\n${sin.out}`);
    assert.match(sin.stderr, /CANDADO/, "debe explicarlo como CANDADO");
    const cero = candado(tool, archivo, { HIGIENE_PERMITIR_TESTS: "0" });
    assert.equal(cero.status, 2, `${tool}: HIGIENE_PERMITIR_TESTS=0 no abre el candado (salió ${cero.status})`);
    const con = candado(tool, archivo, { HIGIENE_PERMITIR_TESTS: "1" });
    assert.equal(con.status, 0, `${tool}: con HIGIENE_PERMITIR_TESTS=1 debe pasar (salió ${con.status})\n${con.out}`);
  }
  // También sobre archivos nuevos dentro de la carpeta de la orden (no sólo los ya rastreados).
  const nuevo = candado("Write", resolve(ROOT, `${ORDEN}/fixtures/nuevo.jsonl`));
  assert.equal(nuevo.status, 2, `Write de un archivo nuevo dentro de ${ORDEN}/ debe dar 2 (salió ${nuevo.status})`);
  // Precondición del enunciado, verificada al final para que la falla de hoy sea la del candado y no la de la precondición.
  assert.equal(git(ROOT, "ls-tree", "--name-only", "HEAD", `${ORDEN}/HOJA.md`), `${ORDEN}/HOJA.md`, "HOJA.md de esta orden debe estar en HEAD");
});

test("Antes del commit rojo (la carpeta no está en HEAD) la sesión A escribe libre en tests/orden/<id>/, y un Edit fuera de tests/orden/ no cambia de comportamiento con o sin la variable", () => {
  assert.equal(git(ROOT, "ls-tree", "--name-only", "HEAD", SIN), "", `precondición: ${SIN} no está en HEAD`);
  const variantes: Record<string, string | undefined>[] = [{}, { HIGIENE_PERMITIR_TESTS: "1" }];
  for (const env of variantes) {
    for (const rel of [`${SIN}/HOJA.md`, `${SIN}/z.test.ts`]) {
      for (const tool of ["Edit", "Write"]) {
        const r = candado(tool, resolve(ROOT, rel), env);
        assert.equal(r.status, 0, `${tool} ${rel} antes del commit rojo debe pasar (env ${JSON.stringify(env)}, salió ${r.status})\n${r.out}`);
      }
    }
    // Fuera de tests/orden/: lo permitido sigue permitido y lo vetado sigue vetado, con o sin la variable.
    const permitido = candado("Edit", resolve(ROOT, "package.json"), env);
    assert.equal(permitido.status, 0, `package.json debe pasar (env ${JSON.stringify(env)}, salió ${permitido.status})\n${permitido.out}`);
    const vetado = candado("Edit", resolve(ROOT, ".env.local"), env);
    assert.equal(vetado.status, 2, `.env.local debe seguir vetado (env ${JSON.stringify(env)}, salió ${vetado.status})`);
  }
  // Dirección positiva (falla hoy): la carpeta de esta orden ya está en HEAD → sin variable, 2.
  const r = candado("Edit", resolve(ROOT, `${ORDEN}/b.test.ts`));
  assert.equal(r.status, 2, `Edit sobre ${ORDEN}/ ya en HEAD debe dar 2 sin la variable (salió ${r.status})\n${r.out}`);
});

test("CLAUDE.md § Puertas nombra tests/orden/ y HIGIENE_PERMITIR_TESTS, y la cabecera de candado.mjs describe la regla", () => {
  const puertas = seccionPuertas();
  assert.match(puertas, /tests\/orden\//, "§ Puertas debe nombrar tests/orden/");
  assert.match(puertas, /HIGIENE_PERMITIR_TESTS/, "§ Puertas debe nombrar HIGIENE_PERMITIR_TESTS");
  const lineas = readFileSync(resolve(ROOT, "tools/candado.mjs"), "utf8").split(/\r?\n/);
  const cabecera: string[] = [];
  for (const l of lineas) { if (!l.startsWith("//")) break; cabecera.push(l); }
  const texto = cabecera.join("\n");
  assert.match(texto, /tests\/orden/, `la cabecera de candado.mjs debe describir la regla sobre tests/orden/:\n${texto}`);
  assert.match(texto, /HIGIENE_PERMITIR_TESTS/, `la cabecera de candado.mjs debe nombrar HIGIENE_PERMITIR_TESTS:\n${texto}`);
});
