// VERDAD-09 · A · el permiso abierto no pone la suite en rojo (D-60): ninguna copia promovida lanza el candado contra el repo real,
// así que `.git/permitir-tests` = 1 no cambia el resultado de `npm test` y la sesión A vuelve a «abrir, escribir, commitear, pushear,
// cerrar». Sesión A (2026-09-22): tests rojos — hoy `tests/verdad-02-b.test.ts` llama al candado con rutas del repo real y sin raíz
// temporal, y con el permiso abierto la suite cae. A1 es lectura estática (no corre nada); A2 clona el repo (minutos), escribe el
// permiso EN EL CLON y corre allí las cuatro copias `b`. Nada se escribe en T ni en H. Un mismo archivo en T y en H (cmp → 0).
// CONEXION-05 D1/D2 (2026-09-23): copia editable promovida a npm test (VERDAD-09 está aprobada y retirada de rojo-verde --todas; el
// original en la carpeta congelada de la orden queda como estaba).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COPIAS_B, REPO, ROOT, VERDAD_02_ROJO, clonar, conTemporal, correr, correrTests, desenlazar, git, leer, testsDelRepo } from "./orden/verdad-09/_comun.ts";

/** Líneas que lanzan el candado (no comentarios): `candado(`, `candadoJson(` o el propio `tools/candado.mjs`. */
const LLAMADA = /\bcandado(?:Json|Crudo)?\(|["']tools\/candado\.mjs["']/;
const esComentario = (l: string) => /^\s*(\/\/|\*|\/\*)/.test(l);
/** Un repo temporal construido por el propio test (la raíz que el candado tiene que mirar). */
const TEMPORAL = /repoTemporal\(|repoConOrden|mkdtemp|conTemporal\(/;
/** Rutas del repo real pasadas como raíz de una llamada. */
const RAIZ_REAL = /\b(?:resolve|join)\(\s*ROOT\b/;

test("ninguna copia promovida de `tests/*.test.ts` lanza `tools/candado.mjs` contra el repo real: cada llamada (`candado(`, `candadoJson(`, o `spawnSync` con `candado.mjs`) va con `HIGIENE_ROOT` o `HIGIENE_ROOTS` en su entorno apuntando a un repo temporal; `tests/verdad-02-b.test.ts` reproduce en un temporal (`git init` + rojo con HOJA.md) los mismos cinco casos (Edit/Write/MultiEdit sobre `tests/orden/<id>/…` con HOJA en HEAD → veto; `HIGIENE_PERMITIR_TESTS=0` no abre; la variable no abre; el archivo del temporal abre; `APROBADAS.md` libre) y `tests/orden/verdad-02/` no cambia (`git diff` vacío desde su rojo)", () => {
  for (const archivo of testsDelRepo()) {
    // Sin los comentarios: un «sin HIGIENE_ROOT» en la cabecera no puede hacer pasar el test.
    const codigo = leer(archivo).split(/\r?\n/).filter((l) => !esComentario(l)).join("\n");
    const llamadas = codigo.split("\n").filter((l) => LLAMADA.test(l));
    if (llamadas.length === 0) continue;
    assert.match(codigo, /HIGIENE_ROOTS?\b/, `${archivo} lanza el candado (${llamadas.length} llamada(s)) y no pasa HIGIENE_ROOT/HIGIENE_ROOTS: lo corre contra el repo real, así que .git/permitir-tests abierto cambia su resultado`);
    assert.match(codigo, TEMPORAL, `${archivo} lanza el candado y no construye ningún repo temporal para apuntarlo`);
    for (const linea of llamadas) {
      assert.doesNotMatch(linea, RAIZ_REAL, `${archivo} pasa una ruta del repo real a una llamada del candado: «${linea.trim()}»`);
    }
  }
  // Los cinco casos siguen probados, ahora sobre el temporal (el enunciado de VERDAD-02 no se pierde al reescribir la copia).
  const b = leer("tests/verdad-02-b.test.ts");
  const casos: [string, RegExp][] = [
    ["Edit/Write/MultiEdit sobre tests/orden/<id>/…", /"Edit"[\s\S]*"Write"[\s\S]*"MultiEdit"/],
    ["HOJA.md en HEAD del temporal", /HOJA\.md/],
    ["HIGIENE_PERMITIR_TESTS=0 no abre", /HIGIENE_PERMITIR_TESTS["' :]+["']0["']/],
    ["la variable no abre", /HIGIENE_PERMITIR_TESTS["' :]+["']1["']/],
    ["el archivo del temporal abre", /permitir-tests/],
    ["APROBADAS.md libre", /APROBADAS\.md/],
  ];
  for (const [caso, re] of casos) assert.match(b, re, `tests/verdad-02-b.test.ts debe seguir probando «${caso}»`);
  // La carpeta congelada de VERDAD-02 no se toca: lo que se reescribe es la copia promovida.
  const rojo = VERDAD_02_ROJO[REPO];
  assert.equal(git(ROOT, "diff", "--name-only", rojo, "HEAD", "--", "tests/orden/verdad-02/"), "", `tests/orden/verdad-02/ sigue congelada desde su rojo (${rojo})`);
});

test("en un clon temporal del repo (prefijo «verdad-09-», `git clone` + junction a `node_modules`, `npm run prepare`) con `<clon>/.git/permitir-tests` = `1`, `node --experimental-strip-types --test tests/verdad-02-b.test.ts tests/verdad-03-b.test.ts tests/verdad-06-b.test.ts tests/verdad-07-b.test.ts` pasa entero (exit 0) y `tools/arranque.mjs` del clon imprime «PERMISO ABIERTO»; sin el archivo, pasa igual", () => {
  conTemporal((base) => {
    const clon = clonar(base);
    try {
      const permiso = join(clon, ".git", "permitir-tests");
      writeFileSync(permiso, "1\n");
      assert.ok(existsSync(permiso), "precondición: el permiso se escribe en el clon, nunca en T ni en H");
      const abierto = correrTests(clon, COPIAS_B);
      assert.equal(abierto.status, 0, `con .git/permitir-tests = 1 en el clon, las cuatro copias \`b\` pasan enteras (salió ${abierto.status})\n${abierto.out.slice(-4000)}`);
      const arranque = correr([join(clon, "tools", "arranque.mjs")], { cwd: clon });
      assert.match(arranque.out, /PERMISO ABIERTO/, `tools/arranque.mjs del clon avisa del permiso abierto\n${arranque.out.slice(-2000)}`);
      rmSync(permiso);
      const cerrado = correrTests(clon, COPIAS_B);
      assert.equal(cerrado.status, 0, `sin el archivo, las cuatro copias \`b\` pasan igual (salió ${cerrado.status})\n${cerrado.out.slice(-4000)}`);
    } finally {
      desenlazar(clon);
    }
  });
});
