// VERDAD-02 · B · candado sobre los tests de una orden (tools/candado.mjs + el permiso de la sesión A, decisión D-1).
// Sesión A (2026-09-20): tests rojos. Caja negra: se lanza `node tools/candado.mjs` del repo real con el stdin JSON de Claude Code.
// VERDAD-07 D-30 (2026-09-21): el permiso es el archivo <raíz>/.git/permitir-tests = 1 (lo crea y borra Liam); la variable
// HIGIENE_PERMITIR_TESTS ya no abre.
// VERDAD-09 D-60 (2026-09-22): los cinco casos corren sobre un REPO TEMPORAL (`repoTemporal` + `HIGIENE_ROOT`), no contra el repo real.
// Antes el candado miraba T o H de verdad: con `.git/permitir-tests` abierto (la sesión A escribiendo sus tests rojos) esta copia
// esperaba veto y recibía 0, y el pre-commit caía 214/216. El permiso que abre aquí es el del temporal; el del repo real no entra.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, SOY, borrar, candado, carpetaTemporal, hojaMinima, repoTemporal, seccionPuertas, testMinimo, type Repo } from "./orden/verdad-02/_util.ts";

/** El hook, en una constante: ninguna llamada al candado puede llevar una raíz del repo real (VERDAD-09 A1). */
const CANDADO = "tools/candado.mjs";
const ORDEN = "tests/orden/x";           // orden con rojo en el repo temporal
const SIN = "tests/orden/zz-sin-commit"; // orden que no está en la historia del repo temporal

function conTemporal<T>(fn: (base: string) => T): T {
  const base = carpetaTemporal();
  try { return fn(base); } finally { borrar(base); }
}

/** Repo temporal con la orden `x` en rojo (HOJA.md en la historia de main) y su tests/orden/APROBADAS.md. */
function conRojo(base: string): Repo {
  const repo = repoTemporal(SOY, base);
  repo.commit("rojo x", {
    "tests/orden/APROBADAS.md": "# Órdenes aprobadas por Liam\n",
    [`${ORDEN}/HOJA.md`]: hojaMinima([["X1", "T+H", "frase uno"]]),
    [`${ORDEN}/a.test.ts`]: testMinimo([["frase uno", "verde.txt"]]),
  });
  return repo;
}

test("candado.mjs corta con exit 2 un Edit, Write o MultiEdit sobre tests/orden/<id>/… cuando tests/orden/<id>/HOJA.md ya existe en HEAD, salvo HIGIENE_PERMITIR_TESTS=1 en el entorno", () => {
  conTemporal((base) => {
    const repo = conRojo(base);
    const env = { HIGIENE_ROOT: repo.dir };
    const archivo = join(repo.dir, `${ORDEN}/a.test.ts`);
    for (const tool of ["Edit", "Write", "MultiEdit"]) {
      const sin = candado(tool, archivo, env);
      assert.equal(sin.status, 2, `${tool} sobre ${ORDEN}/ con HOJA.md en HEAD debe dar 2 (salió ${sin.status})\n${sin.out}`);
      assert.match(sin.stderr, /CANDADO/, "debe explicarlo como CANDADO");
      const cero = candado(tool, archivo, { ...env, HIGIENE_PERMITIR_TESTS: "0" });
      assert.equal(cero.status, 2, `${tool}: HIGIENE_PERMITIR_TESTS=0 no abre el candado (salió ${cero.status})`);
      const con = candado(tool, archivo, { ...env, HIGIENE_PERMITIR_TESTS: "1" });
      assert.equal(con.status, 2, `${tool}: HIGIENE_PERMITIR_TESTS=1 ya no abre sin .git/permitir-tests (VERDAD-07 D-30; salió ${con.status})\n${con.out}`);
      assert.match(con.stderr, /permiso: .*[\\/]\.git[\\/]permitir-tests ausente/, "el veto nombra el permiso que falta");
    }
    // También sobre archivos nuevos dentro de la carpeta de la orden (no sólo los ya rastreados).
    const nuevo = candado("Write", join(repo.dir, `${ORDEN}/fixtures/nuevo.jsonl`), env);
    assert.equal(nuevo.status, 2, `Write de un archivo nuevo dentro de ${ORDEN}/ debe dar 2 (salió ${nuevo.status})`);
    // Lo que abre es el permiso de la raíz vigilada, que aquí es el temporal (VERDAD-09 D-60: nunca el del repo real).
    const permiso = join(repo.dir, ".git", "permitir-tests");
    writeFileSync(permiso, "1\n");
    let abierto;
    try { abierto = candado("Edit", archivo, env); } finally { rmSync(permiso, { force: true }); }
    assert.equal(abierto.status, 0, `con <temporal>/.git/permitir-tests = 1 el candado abre (salió ${abierto.status})\n${abierto.out}`);
    // Precondición del enunciado, verificada al final para que la falla de hoy sea la del candado y no la de la precondición.
    assert.equal(repo.git("ls-tree", "--name-only", "HEAD", `${ORDEN}/HOJA.md`), `${ORDEN}/HOJA.md`, "HOJA.md de la orden debe estar en HEAD del temporal");
  });
});

test("Antes del commit rojo (la carpeta no está en HEAD) la sesión A escribe libre en tests/orden/<id>/, y un Edit fuera de tests/orden/ no cambia de comportamiento con o sin la variable", () => {
  conTemporal((base) => {
    const repo = conRojo(base);
    const env = { HIGIENE_ROOT: repo.dir };
    assert.equal(repo.git("ls-tree", "--name-only", "HEAD", SIN), "", `precondición: ${SIN} no está en HEAD del temporal`);
    const variantes: Record<string, string | undefined>[] = [{}, { HIGIENE_PERMITIR_TESTS: "1" }];
    for (const extra of variantes) {
      // Antes del rojo, la carpeta de la orden es libre; tests/orden/APROBADAS.md no es la carpeta de ninguna orden y también lo es.
      for (const rel of [`${SIN}/HOJA.md`, `${SIN}/z.test.ts`, "tests/orden/APROBADAS.md"]) {
        for (const tool of ["Edit", "Write"]) {
          const r = candado(tool, join(repo.dir, rel), { ...env, ...extra });
          assert.equal(r.status, 0, `${tool} ${rel} debe pasar (env ${JSON.stringify(extra)}, salió ${r.status})\n${r.out}`);
        }
      }
      // Fuera de tests/orden/: lo permitido sigue permitido y lo vetado sigue vetado, con o sin la variable.
      const permitido = candado("Edit", join(repo.dir, "package.json"), { ...env, ...extra });
      assert.equal(permitido.status, 0, `package.json debe pasar (env ${JSON.stringify(extra)}, salió ${permitido.status})\n${permitido.out}`);
      const vetado = candado("Edit", join(repo.dir, ".env.local"), { ...env, ...extra });
      assert.equal(vetado.status, 2, `.env.local debe seguir vetado (env ${JSON.stringify(extra)}, salió ${vetado.status})`);
    }
    // Dirección positiva: la carpeta de la orden ya está en HEAD → sin permiso, 2.
    const r = candado("Edit", join(repo.dir, `${ORDEN}/a.test.ts`), env);
    assert.equal(r.status, 2, `Edit sobre ${ORDEN}/ ya en HEAD debe dar 2 sin el permiso (salió ${r.status})\n${r.out}`);
  });
});

test("CLAUDE.md § Puertas nombra tests/orden/ y HIGIENE_PERMITIR_TESTS, y la cabecera de candado.mjs describe la regla", () => {
  const puertas = seccionPuertas();
  assert.match(puertas, /tests\/orden\//, "§ Puertas debe nombrar tests/orden/");
  assert.match(puertas, /HIGIENE_PERMITIR_TESTS/, "§ Puertas debe nombrar HIGIENE_PERMITIR_TESTS");
  const lineas = readFileSync(resolve(ROOT, CANDADO), "utf8").split(/\r?\n/);
  const cabecera: string[] = [];
  for (const l of lineas) { if (!l.startsWith("//")) break; cabecera.push(l); }
  const texto = cabecera.join("\n");
  assert.match(texto, /tests\/orden/, `la cabecera de ${CANDADO} debe describir la regla sobre tests/orden/:\n${texto}`);
  assert.match(texto, /HIGIENE_PERMITIR_TESTS/, `la cabecera de ${CANDADO} debe nombrar HIGIENE_PERMITIR_TESTS:\n${texto}`);
});
