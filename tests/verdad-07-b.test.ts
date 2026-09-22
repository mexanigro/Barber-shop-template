// VERDAD-07 · B · permiso de A apagable de verdad (D-30): B1 el candado abre tests/orden/<id>/ sólo con <raíz>/.git/permitir-tests = «1»
// (la variable HIGIENE_PERMITIR_TESTS ya no abre); B2 arranque y cierre avisan «PERMISO ABIERTO» por cada repo donde exista el archivo;
// B3 CLAUDE.md lo dice y APROBADAS.md sigue libre. Sesión A (2026-09-21): tests rojos (hoy abre la variable y nadie mira el archivo).
// Caja negra: candado por stdin con HIGIENE_ROOT sobre un repo temporal (vieja-01 con rojo en main, nueva-99 sin rojo); arranque y cierre
// con HIGIENE_ROOTS/HIGIENE_PLAN sobre un par temporal limpio. Nada se escribe en T ni en H. Un mismo archivo en T y en H (cmp → 0).
// CONEXION-02 D2 (2026-09-22): copia editable promovida a npm test (VERDAD-07 está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-07/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { candadoJson, cierre, conTemporal, correr, par, repoTemporal, seccionPuertas, transcriptEnLinea, type Salida } from "./orden/verdad-07/_util.ts";

/** Repo temporal con la orden vieja-01 (HOJA.md añadida en main: rojo en la historia) y sin nueva-99. */
function repoConOrden(base: string): string {
  const repo = repoTemporal("H", base);
  repo.commit("rojo vieja-01", { "tests/orden/vieja-01/HOJA.md": "# HOJA · vieja-01\n\n- [A1] (T+H) frase · fuente: prueba.\n", "tests/orden/vieja-01/c.test.ts": "// test\n", "tests/orden/APROBADAS.md": "# aprobadas\n" });
  return repo.dir;
}
const permiso = (dir: string) => join(dir, ".git", "permitir-tests");
const veto = (r: Salida, que: string) => {
  assert.equal(r.status, 2, `${que} → veto (exit 2), salió ${r.status}\n${r.out}`);
  assert.match(r.stderr, /^CANDADO · /m, `${que} → el veto se explica como «CANDADO · …»\n${r.out}`);
  assert.doesNotMatch(r.stderr, /CANDADO ROTO/, `${que} → un veto no es un candado roto\n${r.out}`);
};
const pasa = (r: Salida, que: string) => {
  assert.equal(r.status, 0, `${que} → debe pasar (exit 0), salió ${r.status}\n${r.out}`);
  assert.doesNotMatch(r.stderr, /CANDADO/, `${que} → sin veto ni roto\n${r.out}`);
};

test("candado.mjs abre `tests/orden/<id>/` (Edit/Write/MultiEdit y shells) sólo si existe `<raíz>/.git/permitir-tests` con contenido exactamente `1` (tras `trim`); con `HIGIENE_PERMITIR_TESTS=1` en el entorno y sin el archivo → veto; con el archivo y sin la variable → pasa; el archivo con `0` o vacío → veto; el veto dice «permiso: <raíz>/.git/permitir-tests ausente»", () => {
  conTemporal((base) => {
    const dir = repoConOrden(base), env = { HIGIENE_ROOT: dir };
    const write = (extra: Record<string, string | undefined> = {}) => candadoJson({ tool_name: "Write", tool_input: { file_path: resolve(dir, "tests/orden/vieja-01/d.test.ts") }, cwd: dir }, { ...env, ...extra });
    const bash = (extra: Record<string, string | undefined> = {}) => candadoJson({ tool_name: "Bash", tool_input: { command: "echo x > tests/orden/vieja-01/HOJA.md" }, cwd: dir }, { ...env, ...extra });
    const conArchivo = (contenido: string, fn: () => void) => { writeFileSync(permiso(dir), contenido); try { fn(); } finally { rmSync(permiso(dir), { force: true }); } };
    // La variable sola ya no abre (hallazgo 2: sobrevive en sesiones abiertas).
    veto(write({ HIGIENE_PERMITIR_TESTS: "1" }), "Write con HIGIENE_PERMITIR_TESTS=1 y sin .git/permitir-tests");
    veto(bash({ HIGIENE_PERMITIR_TESTS: "1" }), "Bash con HIGIENE_PERMITIR_TESTS=1 y sin .git/permitir-tests");
    // El archivo con «1» abre, sin variable; Edit/Write/MultiEdit y shells.
    conArchivo("1\n", () => {
      pasa(write(), "Write con .git/permitir-tests = 1");
      pasa(bash(), "Bash con .git/permitir-tests = 1");
      pasa(candadoJson({ tool_name: "Edit", tool_input: { file_path: resolve(dir, "tests/orden/vieja-01/c.test.ts") }, cwd: dir }, env), "Edit con .git/permitir-tests = 1");
      pasa(candadoJson({ tool_name: "PowerShell", tool_input: { command: "Set-Content -Path tests/orden/vieja-01/c.test.ts -Value x" }, cwd: dir }, env), "PowerShell con .git/permitir-tests = 1");
    });
    conArchivo("1", () => pasa(write(), "Write con .git/permitir-tests = «1» sin salto"));
    // «0» o vacío no abren, ni con la variable.
    conArchivo("0\n", () => { veto(write(), "archivo con 0"); veto(bash({ HIGIENE_PERMITIR_TESTS: "1" }), "archivo con 0 + variable"); });
    conArchivo("", () => { veto(write(), "archivo vacío"); veto(bash(), "archivo vacío (Bash)"); });
    // Sin archivo: el veto nombra el permiso que falta, con la raíz.
    for (const [que, r] of [["Write", write()], ["Bash", bash()]] as const) {
      veto(r, `${que} sin archivo ni variable`);
      assert.match(r.stderr, /permiso: .*[\\/]\.git[\\/]permitir-tests ausente/, `${que} → el veto dice «permiso: <raíz>/.git/permitir-tests ausente»\n${r.stderr}`);
      assert.ok(r.stderr.replace(/\\/g, "/").toLowerCase().includes(dir.replace(/\\/g, "/").toLowerCase()), `${que} → el veto nombra la raíz ${dir}\n${r.stderr}`);
    }
    // nueva-99 (sin rojo) sigue libre sin archivo ni variable.
    pasa(candadoJson({ tool_name: "Write", tool_input: { file_path: resolve(dir, "tests/orden/nueva-99/HOJA.md") }, cwd: dir }, env), "Write bajo nueva-99 sin permiso");
  });
});

const ABIERTO = /^PERMISO ABIERTO · (.+): \.git\/permitir-tests existe \(sólo la sesión A\)$/m;

test("`tools/arranque.mjs` imprime «PERMISO ABIERTO · <repo>: .git/permitir-tests existe (sólo la sesión A)» por cada repo donde exista, y nada si no existe; `tools/cierre.mjs` lo imprime como aviso (no bloquea por esto)", () => {
  conTemporal((base) => {
    const { T, H, plan, roots } = par(base);
    const arranque = () => correr(["tools/arranque.mjs"], { env: { HIGIENE_ROOTS: roots.join(";"), HIGIENE_PLAN: plan } });
    const transcript = transcriptEnLinea(join(base, "transcript.jsonl"), [{ name: "Read", input: { file_path: join(T.dir, "README.md") } }], T.dir);
    const nombra = (linea: string | undefined, etiqueta: "T" | "H", dir: string) => !!linea && (linea.includes(dir) || linea.includes(dir.replace(/\\/g, "/")) || new RegExp(`PERMISO ABIERTO · ${etiqueta}(\\s|:)`).test(linea));
    // Con el archivo en T: una línea por T, ninguna por H.
    writeFileSync(permiso(T.dir), "1\n");
    let r = arranque();
    let lineas = r.stdout.split(/\r?\n/).filter((l) => ABIERTO.test(l));
    assert.equal(lineas.length, 1, `arranque con el archivo en T imprime UNA línea «PERMISO ABIERTO · <repo>: .git/permitir-tests existe (sólo la sesión A)» (exit ${r.status}):\n${r.out}`);
    assert.ok(nombra(lineas[0], "T", T.dir), `la línea nombra a T (etiqueta o ruta): ${lineas[0]}`);
    assert.ok(!nombra(lineas[0], "H", H.dir), `la línea no es de H: ${lineas[0]}`);
    // Con el archivo en los dos: dos líneas.
    writeFileSync(permiso(H.dir), "1\n");
    r = arranque();
    lineas = r.stdout.split(/\r?\n/).filter((l) => ABIERTO.test(l));
    assert.equal(lineas.length, 2, `con el archivo en T y en H, dos líneas:\n${r.out}`);
    assert.ok(lineas.some((l) => nombra(l, "T", T.dir)) && lineas.some((l) => nombra(l, "H", H.dir)), `una por repo:\n${lineas.join("\n")}`);
    // cierre: par limpio, PLAN al día → sale 0 y avisa en stderr (no bloquea por esto).
    const c = cierre({ roots, plan, transcript });
    assert.equal(c.status, 0, `cierre con el permiso abierto no bloquea por eso (salió ${c.status})\n${c.out}`);
    assert.match(c.stderr, ABIERTO, `cierre avisa «PERMISO ABIERTO · <repo>: .git/permitir-tests existe (sólo la sesión A)»:\n${c.out}`);
    // Sin archivo: nada.
    rmSync(permiso(T.dir)); rmSync(permiso(H.dir));
    r = arranque();
    assert.doesNotMatch(r.stdout, /PERMISO ABIERTO/, `sin archivo, arranque no dice nada del permiso:\n${r.out}`);
    const c2 = cierre({ roots, plan, transcript });
    assert.equal(c2.status, 0, `cierre limpio sale 0 (salió ${c2.status})\n${c2.out}`);
    assert.doesNotMatch(c2.out, /PERMISO ABIERTO/, `sin archivo, cierre no dice nada del permiso:\n${c2.out}`);
  });
});

test("CLAUDE.md § Puertas dice que el permiso es el archivo y que la variable ya no abre; y `tests/orden/APROBADAS.md` sigue libre sin permiso", () => {
  const puertas = seccionPuertas();
  assert.ok(puertas.includes(".git/permitir-tests"), `§ Puertas automáticas debe nombrar «.git/permitir-tests»:\n${puertas}`);
  const linea = puertas.split(/\r?\n/).find((l) => l.includes("HIGIENE_PERMITIR_TESTS") && /no abre/.test(l));
  assert.ok(linea, `§ Puertas debe decir, en una misma línea, que HIGIENE_PERMITIR_TESTS «no abre» (ya no abre):\n${puertas}`);
  // APROBADAS.md: sin archivo ni variable, Write y sed -i pasan (sobre un repo temporal con vieja-01 en rojo, como B1).
  conTemporal((base) => {
    const dir = repoConOrden(base), env = { HIGIENE_ROOT: dir };
    pasa(candadoJson({ tool_name: "Write", tool_input: { file_path: resolve(dir, "tests/orden/APROBADAS.md") }, cwd: dir }, env), "Write de APROBADAS.md sin permiso");
    pasa(candadoJson({ tool_name: "Bash", tool_input: { command: "sed -i s/a/b/ tests/orden/APROBADAS.md" }, cwd: dir }, env), "sed -i APROBADAS.md sin permiso");
  });
});
