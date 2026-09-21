// VERDAD-06 · A (T) · reproducible desde un clon (D-27): tests/helpers/png.ts rastreado y excluido del `tests/*` de .gitignore, y un
// clon limpio de T (git clone con la configuración de la máquina + junction a node_modules de T + npm run prepare) pasa `npm run lint`
// y `npx tsx --test tests/gama.test.ts tests/material.test.ts`. Sesión A (2026-09-21): test rojo (hoy .gitignore:38 `tests/*` tapa
// tests/helpers/png.ts: el clon no lo tiene, lint sale 2 y los dos tests no cargan). El clon vive bajo «verdad-06-» y se borra en finally;
// el junction se quita antes (nunca se entra en el node_modules real). Nada se escribe en T.
// VERDAD-07 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-06/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, clonar, conTemporal, desenlazar, gitCrudo, npmEn } from "./orden/verdad-06/_util.ts";

test("tests/helpers/png.ts está rastreado (`git ls-files tests/helpers/png.ts` lo lista) y .gitignore excluye `tests/helpers/` del `tests/*` (línea `!tests/helpers/`); un clon limpio de T (`git clone <T> <tmp>` con enlace a node_modules de T) pasa `npm run lint` y `npx tsx --test tests/gama.test.ts tests/material.test.ts` con exit 0", () => {
  assert.equal(gitCrudo(ROOT, "ls-files", "tests/helpers/png.ts"), "tests/helpers/png.ts", "git ls-files debe listar tests/helpers/png.ts (hoy lo tapa .gitignore:38 tests/*)");
  const ignore = readFileSync(resolve(ROOT, ".gitignore"), "utf8").split(/\r?\n/).map((l) => l.trim());
  assert.ok(ignore.includes("!tests/helpers/"), `.gitignore debe llevar la línea «!tests/helpers/» después de «tests/*»:\n${ignore.filter((l) => l.startsWith("tests/") || l.startsWith("!tests/")).join("\n")}`);
  assert.ok(ignore.indexOf("!tests/helpers/") > ignore.indexOf("tests/*"), "«!tests/helpers/» va después de «tests/*» (si no, no lo desmarca)");
  // Un clon limpio con junction a node_modules de T y npm run prepare: lint y los dos tests que importan ./helpers/png.ts.
  conTemporal((base) => {
    const clon = clonar(base, true);
    try {
      assert.ok(existsSync(join(clon, "tests/helpers/png.ts")), "el clon debe traer tests/helpers/png.ts");
      const lint = npmEn(clon, "npm", ["run", "lint", "--silent"]);
      assert.equal(lint.status, 0, `npm run lint en el clon debe salir 0 (salió ${lint.status})\n${lint.out.slice(-2500)}`);
      const tests = npmEn(clon, "npx", ["tsx", "--test", "tests/gama.test.ts", "tests/material.test.ts"]);
      assert.equal(tests.status, 0, `npx tsx --test tests/gama.test.ts tests/material.test.ts en el clon debe salir 0 (salió ${tests.status})\n${tests.out.slice(-2500)}`);
      assert.doesNotMatch(tests.out, /Cannot find module/, "sin «Cannot find module» en el clon");
      assert.match(tests.stdout, /^# fail 0$/m, `# fail 0 en el clon\n${tests.stdout.slice(-600)}`);
    } finally {
      desenlazar(clon);
    }
  });
});
