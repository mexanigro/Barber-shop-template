// VERDAD-08 · D2 (2026-09-22, D-57): guard de las dos fases de `npm test`. La suite corre `test:unit` (`--test-concurrency=2`) y después
// `test:browser` (`--test-concurrency=1`, los archivos que levantan Playwright): diez archivos de navegador en paralelo daban cuatro
// reintentos de pre-commit en dos días, cada vez por un timeout distinto. Lo que una instrucción puede saltear, un guard no: si alguien
// mete un archivo con navegador en la fase concurrente (o saca uno de la de navegador), este test lo dice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const scripts = (): Record<string, string> => JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts ?? {};
/** Archivos `.test.ts` que nombra un script. */
const archivosDe = (script: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).filter((t) => t.endsWith(".test.ts"));
/** El literal se arma en dos trozos a propósito: este archivo corre en `test:unit` y también pasa por su propio guard. */
const IMPORTA = `from ${JSON.stringify("play" + "wright")}`;
const conNavegador = (archivo: string) => readFileSync(resolve(ROOT, archivo), "utf8").includes(IMPORTA);

test("ningún archivo de `test:unit` importa playwright y todo tests/*.test.ts que lo importa está en `test:browser`", () => {
  const s = scripts();
  const unit = archivosDe(s["test:unit"]), browser = archivosDe(s["test:browser"]);
  assert.ok(unit.length && browser.length, `package.json debe tener las dos fases (unit ${unit.length}, browser ${browser.length})`);
  assert.deepEqual(unit.filter(conNavegador), [], "estos archivos de test:unit importan playwright y van a test:browser");
  const todos = readdirSync(resolve(ROOT, "tests")).filter((f) => f.endsWith(".test.ts")).map((f) => `tests/${f}`);
  const fuera = todos.filter((f) => conNavegador(f) && !browser.includes(f));
  assert.deepEqual(fuera, [], "estos tests importan playwright y no están en test:browser");
  const repetidos = [...unit, ...browser].filter((f, i, a) => a.indexOf(f) !== i);
  assert.deepEqual(repetidos, [], "ningún archivo corre en las dos fases");
});
