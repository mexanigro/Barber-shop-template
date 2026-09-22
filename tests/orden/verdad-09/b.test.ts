// VERDAD-09 · B · la paridad de `tools/` entre T y H es un invariante de REPOSO (D-61): mientras alguno de los dos repos tenga una
// orden viva (HOJA.md sin línea en APROBADAS.md), el guard promovido `tests/verdad-02-c.test.ts` difiere la exigencia con un
// diagnóstico y pasa; con todo retirado vuelve a exigir bytes iguales. Sin eso, un circuito que avanza repo por repo (el verde de B
// en H antes que el rojo de A en T) deja a T sin poder commitear: fue el `--no-verify` de D-59. Sesión A (2026-09-22): tests rojos —
// hoy el guard compara por la ruta fija de tools/_git.mjs y no mira HIGIENE_ROOTS ni las órdenes vivas.
// Caja negra: el guard real del repo propio corrido con `--test-name-pattern` sobre dos repos temporales; rojo-verde sobre repos
// temporales. Nada se escribe en T ni en H. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { REPO, aprobadasMinima, conTemporal, copiarTools, hojaMinima, leer, paridad, repoConOrdenViva, repoTemporal, rojoVerdeTodas, ultimaLinea } from "./_comun.ts";

const FRASE_VIVA = "la orden viva de prueba todavía no está aprobada";
const DIFERIDA = /# paridad de tools\/ diferida: orden viva viva-01/;

test("el guard promovido de paridad (`tests/verdad-02-c.test.ts`, test «tools/_transcript.mjs y tools/cierre.mjs son idénticos byte a byte en T y en H …») pasa con un diagnóstico «paridad de tools/ diferida: orden viva <id>» cuando el repo propio o el hermano tienen alguna carpeta `tests/orden/<id>/` con HOJA.md y sin línea «- <id> · aprobada» en su `tests/orden/APROBADAS.md`; y sigue fallando cuando no hay órdenes vivas y los bytes difieren; probado con `HIGIENE_ROOTS` sobre dos repos temporales: (a) sin órdenes vivas y `tools/cierre.mjs` distinto → falla nombrando el archivo; (b) igual pero con `tests/orden/viva-01/HOJA.md` sin aprobar en el hermano → pasa con el diagnóstico; (c) sin órdenes vivas y bytes iguales → pasa sin diagnóstico", () => {
  conTemporal((base) => {
    const propio = repoTemporal("T", join(base, "propio")), hermano = repoTemporal("H", join(base, "hermano"));
    for (const repo of [propio, hermano]) {
      copiarTools(repo);
      repo.commit("tools + APROBADAS.md", { "tests/orden/APROBADAS.md": aprobadasMinima() });
    }
    const roots: [string, string] = [propio.dir, hermano.dir];
    // (a) sin órdenes vivas y `tools/cierre.mjs` distinto → falla nombrando el archivo.
    hermano.commit("cierre.mjs distinto", { "tools/cierre.mjs": `${leer("tools/cierre.mjs")}\n// byte de más\n` });
    const a = paridad(roots);
    assert.notEqual(a.status, 0, `(a) sin órdenes vivas y con tools/cierre.mjs distinto, el guard debe fallar (salió ${a.status})\n${a.out.slice(-3000)}`);
    assert.match(a.out, /tools\/cierre\.mjs/, `(a) la falla debe nombrar el archivo que difiere\n${a.out.slice(-3000)}`);
    assert.doesNotMatch(a.out, DIFERIDA, `(a) sin órdenes vivas no hay nada que diferir\n${a.out.slice(-3000)}`);
    // (b) los mismos bytes distintos, pero con una orden viva en el hermano → pasa con el diagnóstico.
    hermano.commit("orden viva sin aprobar", { "tests/orden/viva-01/HOJA.md": hojaMinima(FRASE_VIVA) });
    const b = paridad(roots);
    assert.equal(b.status, 0, `(b) con tests/orden/viva-01/ sin aprobar en el hermano, el guard pasa (salió ${b.status})\n${b.out.slice(-3000)}`);
    assert.match(b.out, DIFERIDA, `(b) debe decir «paridad de tools/ diferida: orden viva viva-01»\n${b.out.slice(-3000)}`);
    // (c) sin órdenes vivas y con los mismos bytes → pasa sin diagnóstico.
    hermano.git("rm", "-r", "-q", "tests/orden/viva-01");
    copiarTools(hermano);
    hermano.commit("orden retirada y tools iguales");
    const c = paridad(roots);
    assert.equal(c.status, 0, `(c) sin órdenes vivas y con los bytes iguales, el guard pasa (salió ${c.status})\n${c.out.slice(-3000)}`);
    assert.doesNotMatch(c.out, DIFERIDA, `(c) con todo retirado no hay diagnóstico: la paridad se exige de verdad\n${c.out.slice(-3000)}`);
  });
});

test("`tools/verdad/rojo-verde.mjs --todas` imprime al final «paridad de tools/: <igual | difiere: …> · órdenes vivas: <lista | ninguna>», sin cambiar su exit por eso (informativo: el revisor lo lee en el pre-push de cada entrega)", () => {
  conTemporal((base) => {
    const viva = repoConOrdenViva(join(base, "viva"), "viva-01", FRASE_VIVA);
    const conViva = rojoVerdeTodas(viva.dir);
    const ultima = ultimaLinea(conViva.stdout);
    assert.match(ultima, /^paridad de tools\/: /, `la última línea de --todas debe empezar por «paridad de tools/: » (fue «${ultima}»)\n${conViva.out.slice(-3000)}`);
    assert.match(ultima, /órdenes vivas: [^\n]*viva-01/, `con una orden viva, la línea la nombra (fue «${ultima}»)`);
    assert.equal(conViva.status, 0, `--todas con la orden viva en «rojo pendiente de B» sigue saliendo 0 (salió ${conViva.status})\n${conViva.out.slice(-3000)}`);
    const limpio = repoTemporal(REPO, join(base, "limpio"));
    limpio.commit("APROBADAS.md sin órdenes en el árbol", { "tests/orden/APROBADAS.md": aprobadasMinima() });
    const sinVivas = rojoVerdeTodas(limpio.dir);
    const ultimaLimpia = ultimaLinea(sinVivas.stdout);
    assert.match(ultimaLimpia, /^paridad de tools\/: /, `también sin órdenes vivas (fue «${ultimaLimpia}»)\n${sinVivas.out.slice(-3000)}`);
    assert.match(ultimaLimpia, /órdenes vivas: ninguna/, `sin órdenes vivas la línea dice «ninguna» (fue «${ultimaLimpia}»)`);
    assert.equal(sinVivas.status, 0, `--todas sin nada que verificar sale 0 (salió ${sinVivas.status})\n${sinVivas.out.slice(-3000)}`);
  });
});
