// VELOCIDAD-01 · V1 (T). Las copias del mecanismo (D-389): tests/verdad-0N-*, tests/contrato-hooks.test.ts y las que corren rojo-verde
// adentro (llaman a una función rojoVerde…( o pasan "rojo-verde.mjs" a un proceso hijo), leídas del disco y no de una lista escrita.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const LINEA_BASE = "baeee1a";
const archivosDe = (s: unknown) => String(s ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).filter((t) => t.endsWith(".test.ts"));
const delMecanismo = (f: string) =>
  /^tests\/verdad-0\d-[a-z]\.test\.ts$/.test(f) || f === "tests/contrato-hooks.test.ts" ||
  /rojoVerde[A-Za-z]*\(|rojo-verde\.mjs"/.test(readFileSync(resolve(ROOT, f), "utf8"));

test("en package.json de T, test:verdad corre las copias del mecanismo —tests/verdad-0N-*, tests/contrato-hooks.test.ts y las que corren rojo-verde adentro— y test:unit y test:browser ninguna; ningún archivo está en dos listas y juntas son los archivos que npm test corría en baeee1a", () => {
  const s = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts ?? {};
  assert.ok(s["test:verdad"], "package.json de T no tiene test:verdad (D-389): las copias del mecanismo corren en cada npm test");
  assert.equal(s.test, "npm run test:unit && npm run test:browser", "npm test sigue siendo las dos fases del producto");
  const verdad = Object.keys(s).filter((k) => k.startsWith("test:verdad")).flatMap((k) => archivosDe(s[k]));
  const unit = archivosDe(s["test:unit"]), browser = archivosDe(s["test:browser"]);
  const todos = [...unit, ...browser, ...verdad];
  assert.deepEqual(todos.filter((f, i) => todos.indexOf(f) !== i), [], "ningún archivo está en dos listas");

  const mecanismo = readdirSync(resolve(ROOT, "tests")).filter((f) => f.endsWith(".test.ts")).map((f) => `tests/${f}`).filter(delMecanismo).sort();
  assert.ok(mecanismo.length >= 16, `copias del mecanismo leídas del disco: ${mecanismo.length}`);
  assert.deepEqual([...verdad].sort(), mecanismo, "test:verdad corre exactamente las copias del mecanismo");
  assert.deepEqual([...unit, ...browser].filter(delMecanismo), [], "test:unit y test:browser no corren ninguna copia del mecanismo");

  const antes = JSON.parse(execFileSync("git", ["show", `${LINEA_BASE}:package.json`], { cwd: ROOT, encoding: "utf8", windowsHide: true })).scripts;
  assert.deepEqual([...todos].sort(), [...archivosDe(antes["test:unit"]), ...archivosDe(antes["test:browser"])].sort(), `juntas son los archivos de npm test en ${LINEA_BASE}`);
});
