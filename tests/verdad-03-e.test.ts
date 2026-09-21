// VERDAD-03 · E · contrato-hooks compara lo que ejecutan los hooks de git: claves «githook.<hook>» del bloque CONTRATO-DECLARADO
// contra .githooks/ en las dos direcciones. Sesión A (2026-09-20): test rojo. Caja negra: lee CLAUDE.md y corre
// tests/contrato-hooks.test.ts en el repo real y en una copia mutada (pre-push sin la línea de rojo-verde).
// VERDAD-04 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-03/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { NOMBRE, ROOT, SOY, bloqueContrato, conTemporal, correr } from "./orden/verdad-03/_util.ts";

const GUARD = ["--experimental-strip-types", "--test", "tests/contrato-hooks.test.ts"];

test("El bloque CONTRATO-DECLARADO tiene las claves «githook.pre-commit» y «githook.pre-push» con los scripts node que cada hook ejecuta, en orden y con sus argumentos (pre-push: «destino-no-despliega.mjs rojo-verde.mjs --todas»); tests/contrato-hooks.test.ts las compara contra .githooks/ en las dos direcciones; la línea de comentario «# pre-push :: …» de VERDAD-02 desaparece; y en una copia del repo donde pre-push pierde la línea de rojo-verde, contrato-hooks sale rojo", () => {
  const lineas = bloqueContrato().split(/\r?\n/);
  const clave = (k: string) => lineas.find((l) => new RegExp(`^${k.replace(".", "\\.")}\\s*=`).test(l));
  assert.ok(clave("githook.pre-commit"), `falta la clave githook.pre-commit en CONTRATO-DECLARADO:\n${lineas.join("\n")}`);
  const push = clave("githook.pre-push");
  assert.ok(push, `falta la clave githook.pre-push en CONTRATO-DECLARADO:\n${lineas.join("\n")}`);
  assert.match(push, /=\s*destino-no-despliega\.mjs rojo-verde\.mjs --todas\s*$/, `githook.pre-push debe valer «destino-no-despliega.mjs rojo-verde.mjs --todas»: ${push}`);
  assert.ok(!lineas.some((l) => l.trim().startsWith("#") && /pre-push/.test(l)), `la línea de comentario «# pre-push :: …» de VERDAD-02 desaparece:\n${lineas.join("\n")}`);
  // Dirección positiva: contrato-hooks en el repo real corre y sale verde (sin NODE_TEST_CONTEXT, que haría saltar los archivos al runner anidado).
  const verde = correr(GUARD, { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(verde.status, 0, `tests/contrato-hooks.test.ts debe seguir verde en el repo real\n${verde.out}`);
  assert.match(verde.stdout, /^# fail 0$/m);
  assert.doesNotMatch(verde.stdout, /^# pass 0$/m, "el guard tiene que haber corrido algo");
  // Dirección contraria: copia del repo (lo que el guard lee + lo que importa) con pre-push sin la línea de rojo-verde → rojo.
  conTemporal((base) => {
    const copia = join(base, NOMBRE[SOY]);
    const copiar = (rel: string) => { const abs = join(copia, rel); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, readFileSync(resolve(ROOT, rel))); };
    for (const f of ["CLAUDE.md", ".claude/settings.json", "package.json", "tests/contrato-hooks.test.ts", "tools/_git.mjs"]) copiar(f);
    for (const f of readdirSync(resolve(ROOT, ".githooks"))) copiar(`.githooks/${f}`);
    const prePush = join(copia, ".githooks/pre-push");
    const texto = readFileSync(prePush, "utf8");
    assert.match(texto, /rojo-verde\.mjs/, "precondición: el pre-push real corre rojo-verde.mjs");
    writeFileSync(prePush, texto.split(/\r?\n/).filter((l) => !/rojo-verde\.mjs/.test(l)).join("\n") + "\n");
    const rojo = correr(GUARD, { cwd: copia, env: { NODE_TEST_CONTEXT: undefined } });
    assert.notEqual(rojo.status, 0, `sin la línea de rojo-verde en pre-push, contrato-hooks debe salir rojo\n${rojo.out}`);
    assert.doesNotMatch(rojo.stdout, /^# fail 0$/m, "debe haber al menos un test en rojo en la copia");
  });
});
