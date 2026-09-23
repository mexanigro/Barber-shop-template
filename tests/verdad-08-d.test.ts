// VERDAD-08 · D · el navegador en serie (D-57). Los diez archivos que importan `playwright` corren hoy con `--test-concurrency=2`
// junto a los otros 55: cuatro reintentos de pre-commit en dos días, por timeouts distintos cada vez (galeria-05, services-v6,
// ajustes-01, hero-viewport, lang-01, modo-paleta). D1 parte `npm test` en dos fases encadenadas y deja el navegador de a uno, con
// un guard que impide que un archivo con navegador vuelva a la fase concurrente. D2 pone ese guard en su propio archivo y deja el
// hook de git como está.
// Sesión A (2026-09-22): tests rojos — hoy `test` es un solo `tsx --test --test-concurrency=2 …` con 65 archivos y no existe
// tests/suite-fases.test.ts. Sólo en T (H no tiene navegador). Caja negra: package.json, el hook y los archivos en disco.
// VERDAD-09 D-63 (2026-09-22): copia editable promovida a npm test (VERDAD-08 está aprobada y retirada de rojo-verde --todas; el original
// en la carpeta congelada de la orden queda como estaba).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, T_BASE, correrLargo, git } from "./orden/verdad-08/_util.ts";

const pkg = () => JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts ?? {};
/** Archivos `.test.ts` que nombra un script. */
const archivosDe = (script: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).filter((t) => t.endsWith(".test.ts"));

test("package.json `test` corre dos fases encadenadas con `&&`: `test:unit` (`tsx --test --test-concurrency=2 …` con los archivos que no importan `playwright`) y `test:browser` (`tsx --test --test-concurrency=1 …` con los diez que sí: tests/ajustes-01, galeria-03, galeria-04, galeria-05, hero-viewport, lang-01, modo-paleta, services-v6, verdad-05-c, webkit-ios); la unión de las dos listas no repite ningún archivo y contiene los 65 que `npm test` nombra en 1398730 (ninguno se pierde); y ningún archivo de `test:unit` contiene `from \"playwright\"` (guard: se comprueba leyendo cada archivo)", () => {
  const s = pkg();
  assert.match(String(s.test ?? ""), /^npm run test:unit && npm run test:browser$/, `«test» encadena las dos fases (dio «${s.test}»)`);
  assert.match(String(s["test:unit"] ?? ""), /--test-concurrency=2(\s|$)/, `«test:unit» corre con --test-concurrency=2 (dio «${s["test:unit"]}»)`);
  assert.match(String(s["test:browser"] ?? ""), /--test-concurrency=1(\s|$)/, `«test:browser» corre de a uno (dio «${s["test:browser"]}»)`);
  const unit = archivosDe(s["test:unit"]), browser = archivosDe(s["test:browser"]);
  const NAVEGADOR = [
    "tests/ajustes-01.test.ts", "tests/galeria-03.test.ts", "tests/galeria-04.test.ts", "tests/galeria-05.test.ts",
    "tests/hero-viewport.test.ts", "tests/lang-01.test.ts", "tests/modo-paleta.test.ts", "tests/services-v6.test.ts",
    "tests/verdad-05-c.test.ts", "tests/webkit-ios.test.ts",
    // CONEXION-08 (2026-09-23, D-81): el guard del wordmark genérico decodifica el PNG en Chromium, así que también va aquí.
    "tests/logo-generico.test.ts",
  ];
  assert.deepEqual([...browser].sort(), [...NAVEGADOR].sort(), "la fase de navegador son exactamente los archivos que importan playwright");
  // Ni se pierde ni se repite ninguno: los 65 de `npm test` en 1398730 siguen estando.
  const union = [...unit, ...browser];
  assert.equal(new Set(union).size, union.length, `ningún archivo repetido entre las dos fases:\n${union.join("\n")}`);
  const base = archivosDe(JSON.parse(git(ROOT, "show", `${T_BASE}:package.json`)).scripts.test);
  assert.equal(base.length, 65, `precondición: en ${T_BASE} «npm test» nombra 65 archivos (dio ${base.length})`);
  const perdidos = base.filter((f) => !union.includes(f));
  assert.deepEqual(perdidos, [], `las dos fases tienen que cubrir los 65 de ${T_BASE}; faltan:\n${perdidos.join("\n")}`);
  // El guard: ningún archivo de la fase concurrente importa playwright.
  // VERDAD-09 D-63: el literal se arma en dos trozos, como en tests/suite-fases.test.ts. Esta copia corre en `test:unit` y pasa por
  // su propio guard: escrito entero se delataría a sí misma.
  const IMPORTA = `from ${JSON.stringify("play" + "wright")}`;
  const conNavegador = unit.filter((f) => existsSync(resolve(ROOT, f)) && readFileSync(resolve(ROOT, f), "utf8").includes(IMPORTA));
  assert.deepEqual(conNavegador, [], `estos archivos de test:unit importan playwright y van a test:browser:\n${conNavegador.join("\n")}`);
});

test("el guard de fases vive en `tests/suite-fases.test.ts` y lo corre `test:unit`, mientras `.githooks/pre-commit` sigue corriendo `npm test` (sin nombrar fases) y `tests/contrato-hooks.test.ts` pasa sin cambios", () => {
  const s = pkg();
  const guard = "tests/suite-fases.test.ts";
  assert.ok(existsSync(resolve(ROOT, guard)), `el guard de fases vive en ${guard}`);
  assert.ok(archivosDe(s["test:unit"]).includes(guard), `«test:unit» corre ${guard} (dio «${s["test:unit"]}»)`);
  const hook = readFileSync(resolve(ROOT, ".githooks/pre-commit"), "utf8");
  assert.match(hook, /^\s*npm test\b/m, `.githooks/pre-commit sigue corriendo «npm test»:\n${hook}`);
  assert.doesNotMatch(hook, /test:(unit|browser)/, `.githooks/pre-commit no nombra las fases:\n${hook}`);
  const r = correrLargo(["--experimental-strip-types", "--test", "tests/contrato-hooks.test.ts"], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `tests/contrato-hooks.test.ts pasa sin cambios (salió ${r.status})\n${r.out.slice(-3000)}`);
});
