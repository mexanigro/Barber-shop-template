// VELOCIDAD-01 · P1, P2 (T+H, mismo archivo en los dos repos). Caja negra: la herramienta se carga con import() después de existsSync.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "../../..");
const HERRAMIENTA = resolve(ROOT, "tools/tests-del-commit.mjs");

async function herramienta() {
  assert.ok(existsSync(HERRAMIENTA), "falta tools/tests-del-commit.mjs (D-391): hoy el pre-commit corre la batería entera en cada commit");
  return import(pathToFileURL(HERRAMIENTA).href);
}

const T = {
  "test:unit": "tsx --test --test-concurrency=2 tests/u.test.ts",
  "test:browser": "tsx --test --test-concurrency=1 tests/b1.test.ts tests/b2.test.ts tests/b3.test.ts",
  "test:verdad": "tsx --test tests/verdad-02-a.test.ts",
};
const H = { test: "node --test \"tests/*.test.ts\"", "test:verdad": "node --test \"tests/verdad-0*.test.ts\"" };
const TEXTOS: Record<string, string> = {
  "tests/b1.test.ts": "import x from \"../src/components/landing/services/services-v6.tsx\";",
  "tests/b2.test.ts": "const m = await import(\"../src/lib/cobros\");",
  "tests/b3.test.ts": "// nada de src",
};
const contenido = (f: string) => TEXTOS[f] ?? "";
const ORDENES = [
  { id: "viva", aprobada: false, rojoEnHead: true, tests: ["tests/orden/viva/a.test.ts"], webs: ["frase webs"] },
  { id: "vieja", aprobada: true, rojoEnHead: true, tests: ["tests/orden/vieja/a.test.ts"], webs: [] },
  { id: "nueva", aprobada: false, rojoEnHead: false, tests: ["tests/orden/nueva/a.test.ts"], webs: [] },
  { id: "corrige", aprobada: false, rojoEnHead: true, tests: ["tests/orden/corrige/a.test.ts"], webs: [] },
];
const VIVA = { id: "viva", tests: ["tests/orden/viva/a.test.ts"], saltar: ["frase webs"] };

test("seleccion de tools/tests-del-commit.mjs elige test:unit, o npm test donde no hay test:unit; test:verdad sólo si el commit toca tools/ o .githooks/; de test:browser sólo los archivos que el commit cambia y los que nombran un archivo cambiado de src/; y los tests de cada orden viva con su HOJA.md en HEAD cuya carpeta el commit no toca, sin las afirmaciones «, webs»; nunca los de una orden aprobada ni los de la orden cuyo rojo se está escribiendo", async () => {
  const { seleccion } = await herramienta();
  assert.equal(typeof seleccion, "function", "tools/tests-del-commit.mjs debe exportar seleccion");
  const elegir = (cambiados: string[], scripts: Record<string, string> = T) => seleccion({ cambiados, scripts, ordenes: ORDENES, contenido });

  const a = elegir(["src/components/landing/services/services-v6.tsx", "tests/b3.test.ts", "tests/orden/corrige/a.test.ts", "tests/orden/nueva/HOJA.md"]);
  assert.equal(a.base, "test:unit");
  assert.equal(a.verdad, false, "sin tools/ ni .githooks/ no corre test:verdad");
  assert.deepEqual(a.navegador, ["tests/b1.test.ts", "tests/b3.test.ts"], "el que nombra services-v6.tsx y el test que cambió");
  assert.deepEqual(a.ordenes, [VIVA], "sólo la viva con su rojo en HEAD y sin tocar, sin la marcada «, webs»");

  const b = elegir(["src/lib/cobros.ts", "src/nadie-me-nombra.ts"]);
  assert.deepEqual(b.navegador, ["tests/b2.test.ts"], "«lib/cobros» nombra src/lib/cobros.ts; un archivo de src/ que nadie nombra no suma ninguno");
  assert.deepEqual(b.ordenes, [VIVA, { id: "corrige", tests: ["tests/orden/corrige/a.test.ts"], saltar: [] }], "un commit que no toca su carpeta corre las dos vivas");

  for (const f of ["tools/candado.mjs", "tools/verdad/rojo-verde.mjs", ".githooks/pre-push"]) {
    const c = elegir([f]);
    assert.equal(c.verdad, true, `${f}: el commit toca el mecanismo y corre test:verdad`);
    assert.deepEqual(c.navegador, [], `${f}: ningún test de navegador`);
  }
  assert.equal(elegir(["README.md", "src/tools/x.ts", "tests/tools.test.ts"]).verdad, false, "«tools» en otra ruta no es tools/");
  assert.deepEqual(elegir(["README.md"]).navegador, []);

  const h = elegir(["src/lib/cobros.ts", "tools/_git.mjs"], H);
  assert.equal(h.base, "test", "sin test:unit, la base es npm test");
  assert.equal(h.verdad, true);
  assert.deepEqual(h.navegador, [], "sin test:browser no hay tests de navegador que elegir");
});

test(".githooks/pre-commit corre el lint y después npm run test:commit, que es node tools/tests-del-commit.mjs, y ya no corre npm test; y con --plan la herramienta elige en el repo real sin correr nada, sólo órdenes vivas con su HOJA.md en HEAD", async () => {
  const lineas = readFileSync(resolve(ROOT, ".githooks/pre-commit"), "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const lint = lineas.findIndex((l) => /^(npm run lint|npx tsc --noEmit)\b/.test(l));
  const commit = lineas.findIndex((l) => /^npm run test:commit\b/.test(l));
  assert.ok(commit >= 0, `.githooks/pre-commit debe correr npm run test:commit (corre: ${lineas.join(" · ")})`);
  assert.ok(lint >= 0 && lint < commit, "el lint (npm run lint en T, npx tsc --noEmit en H) va antes de npm run test:commit");
  assert.deepEqual(lineas.filter((l) => /\bnpm (run )?test(\s|$)/.test(l)), [], ".githooks/pre-commit ya no corre npm test");
  const scripts = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts ?? {};
  assert.equal(scripts["test:commit"], "node tools/tests-del-commit.mjs");

  await herramienta();
  const env = { ...process.env };
  for (const k of ["GIT_INDEX_FILE", "GIT_DIR", "GIT_WORK_TREE", "GIT_PREFIX"]) delete env[k];
  const salida = execFileSync(process.execPath, [HERRAMIENTA, "--plan"], { cwd: ROOT, env, encoding: "utf8", windowsHide: true });
  const plan = JSON.parse(salida.trim().split(/\r?\n/).pop()!);
  assert.equal(plan.base, scripts["test:unit"] ? "test:unit" : "test");
  assert.equal(typeof plan.verdad, "boolean");
  assert.ok(Array.isArray(plan.navegador) && Array.isArray(plan.ordenes));
  const aprobadas = readFileSync(resolve(ROOT, "tests/orden/APROBADAS.md"), "utf8");
  for (const o of plan.ordenes) {
    assert.ok(!new RegExp(`^- ${o.id} · aprobada`, "m").test(aprobadas), `${o.id} está aprobada y no se corre`);
    assert.doesNotThrow(() => execFileSync("git", ["cat-file", "-e", `HEAD:tests/orden/${o.id}/HOJA.md`], { cwd: ROOT, env, windowsHide: true }), `${o.id}: su HOJA.md debe estar en HEAD`);
    assert.ok(o.tests.length && o.tests.every((f: string) => f.startsWith(`tests/orden/${o.id}/`) && f.endsWith(".test.ts")), `${o.id}: sus tests`);
  }
});
