// VERDAD-03 · A · retiro de órdenes aprobadas (tests/orden/APROBADAS.md) y rojo pendiente de B (tools/verdad/rojo-verde.mjs).
// Sesión A (2026-09-20): tests rojos. Caja negra: `node tools/verdad/rojo-verde.mjs --todas|--orden --repo <tmp>` del repo real contra
// repos git temporales; A2 lee además HEAD del repo real. Toda carpeta temporal se borra en `finally` (conTemporal).
// VERDAD-04 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-03/ queda congelado).
// VERDAD-09 D-60 (2026-09-22): la llamada al candado va con HIGIENE_ROOT al repo temporal de este mismo test, no contra el repo real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, SOY, candado, conTemporal, git, hojaMinima, repoTemporal, rojoVerde, rojoVerdeTodas, testMinimo, type Repo } from "./orden/verdad-03/_util.ts";

const sha7 = (s: string) => s.slice(0, 7);
type Orden = { hoja?: [string, string, string][]; tests?: [string, string | null][]; verde?: boolean };

/** Orden <id> en el repo: commit rojo (HOJA.md + x.test.ts que pide verde-<id>.txt) y, si se pide, commit verde. */
function orden(repo: Repo, id: string, o: Orden = {}): { rojo: string; verde: string | null } {
  const rojo = repo.commit(`rojo ${id}`, {
    [`tests/orden/${id}/HOJA.md`]: hojaMinima(o.hoja ?? [["X1", "T+H", "frase uno"]]),
    [`tests/orden/${id}/x.test.ts`]: testMinimo(o.tests ?? [["frase uno", `verde-${id}.txt`]]),
  });
  const verde = o.verde ? repo.commit(`verde ${id}`, { [`verde-${id}.txt`]: "verde\n" }) : null;
  return { rojo, verde };
}

test("tests/orden/APROBADAS.md lista las órdenes aprobadas por Liam, una por línea «- <id> · aprobada <fecha> · T <sha7> · H <sha7>»; rojo-verde --todas no corre las listadas y por cada una imprime una sola línea «<id> · retirada (aprobada <fecha>)» en vez de su tabla; --orden <id> explícito las sigue verificando; y candado.mjs deja escribir APROBADAS.md sin la variable", () => {
  conTemporal((base) => {
    const repo = repoTemporal(SOY, base);
    const x = orden(repo, "x", { verde: true });
    orden(repo, "y", { verde: true });
    repo.commit("aprobadas", { "tests/orden/APROBADAS.md": `# Órdenes aprobadas\n\n- x · aprobada 2026-09-20 · T ${sha7(x.rojo)} · H ${sha7(x.rojo)}\n` });
    const todas = rojoVerdeTodas(repo.dir);
    assert.equal(todas.status, 0, `--todas con x aprobada e y verde debe salir 0 (salió ${todas.status})\n${todas.out}`);
    const lineas = todas.stdout.split(/\r?\n/);
    assert.equal(lineas.filter((l) => l === "x · retirada (aprobada 2026-09-20)").length, 1, `una sola línea «x · retirada (aprobada 2026-09-20)»\n${todas.stdout}`);
    assert.doesNotMatch(todas.stdout, /^orden x ·/m, `la aprobada no se corre en --todas: sin tabla de x\n${todas.stdout}`);
    assert.match(todas.stdout, /^orden y ·/m, `la no aprobada se sigue verificando en --todas\n${todas.stdout}`);
    assert.doesNotMatch(todas.stdout, /^y · retirada/m, "y no está aprobada");
    // --orden x explícito: sigue verificando la aprobada (tabla, sin «retirada»).
    const sola = rojoVerde("x", repo.dir);
    assert.equal(sola.status, 0, `--orden x explícito debe verificar y salir 0 (salió ${sola.status})\n${sola.out}`);
    assert.match(sola.stdout, /^orden x ·/m, `--orden x debe imprimir la tabla de x\n${sola.stdout}`);
    assert.doesNotMatch(sola.stdout, /retirada/, "--orden x explícito no la trata como retirada");
    // candado.mjs deja escribir tests/orden/APROBADAS.md sin permiso (no es la carpeta de una orden). VERDAD-09 D-60: sobre el repo
    // TEMPORAL (HIGIENE_ROOT), no contra el real, así que `.git/permitir-tests` abierto en T o en H no cambia el resultado.
    for (const tool of ["Edit", "Write", "MultiEdit"]) {
      const r = candado(tool, join(repo.dir, "tests/orden/APROBADAS.md"), { HIGIENE_ROOT: repo.dir });
      assert.equal(r.status, 0, `${tool} sobre tests/orden/APROBADAS.md debe pasar sin permiso (salió ${r.status})\n${r.out}`);
    }
  });
});

test("verdad-02 figura en APROBADAS.md con fecha 2026-09-20, T 0a13c2e y H 82e33f5, y la salida de rojo-verde --todas en HEAD contiene «verdad-02 · retirada» y no contiene «orden verdad-02 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const linea = aprobadas.split(/\r?\n/).find((l) => /^- verdad-02 · aprobada 2026-09-20 · T 0a13c2e · H 82e33f5\s*$/.test(l));
  assert.ok(linea, `HEAD:tests/orden/APROBADAS.md debe tener «- verdad-02 · aprobada 2026-09-20 · T 0a13c2e · H 82e33f5»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce en un repo temporal con
  // tests/orden/APROBADAS.md y tests/orden/verdad-02/ tal cual están en HEAD (git show), y sin tests/orden/verdad-03/.
  conTemporal((base) => {
    const repo = repoTemporal(SOY, base);
    const rutas = git(ROOT, "ls-tree", "-r", "--name-only", "HEAD", "tests/orden/APROBADAS.md", "tests/orden/verdad-02").split(/\r?\n/).filter(Boolean);
    assert.ok(rutas.includes("tests/orden/verdad-02/HOJA.md"), "HEAD debe tener tests/orden/verdad-02/HOJA.md");
    for (const ruta of rutas) {
      const abs = join(repo.dir, ruta);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, git(ROOT, "show", `HEAD:${ruta}`) + "\n");
    }
    repo.commit("HEAD de este repo: APROBADAS.md + tests/orden/verdad-02/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas con verdad-02 aprobada debe salir 0 (salió ${r.status})\n${r.out}`);
    assert.match(r.stdout, /verdad-02 · retirada/, `debe decir «verdad-02 · retirada»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden verdad-02 ·/, `no debe imprimir la tabla de verdad-02\n${r.stdout}`);
  });
});

test("Una orden cuyo commit rojo es HEAD está «rojo pendiente de B»: rojo-verde --todas la acepta con exit 0 e imprime «<id> · rojo pendiente de B» si todos sus tests fallan en HEAD y sus nombres coinciden con la hoja (A5 de VERDAD-02); si alguno pasa, exit 2 con «<nombre>: nunca estuvo en rojo»; una orden cuyo rojo no es HEAD se verifica entera como hasta ahora", () => {
  conTemporal((base) => {
    // Rojo = HEAD, todos fallan, nombres = hoja → 0 y «x · rojo pendiente de B», sin tabla.
    const pendiente = repoTemporal(SOY, join(base, "pendiente"));
    orden(pendiente, "x");
    const r1 = rojoVerdeTodas(pendiente.dir);
    assert.equal(r1.status, 0, `rojo en HEAD con todos los tests en rojo debe aceptarse (salió ${r1.status})\n${r1.out}`);
    assert.match(r1.stdout, /^x · rojo pendiente de B$/m, `debe imprimir «x · rojo pendiente de B»\n${r1.stdout}`);
    assert.doesNotMatch(r1.stdout, /^orden x ·/m, "sin tabla: aún no hay verde");
    // Rojo = HEAD pero «frase dos» pasa → 2 «frase dos: nunca estuvo en rojo» (y «frase uno» no).
    const pasa = repoTemporal(SOY, join(base, "pasa"));
    orden(pasa, "x", { hoja: [["X1", "T+H", "frase uno"], ["X2", "T+H", "frase dos"]], tests: [["frase uno", "verde-x.txt"], ["frase dos", null]] });
    const r2 = rojoVerdeTodas(pasa.dir);
    assert.equal(r2.status, 2, `un test que pasa en el commit rojo debe dar 2 (salió ${r2.status})\n${r2.out}`);
    assert.match(r2.out, /frase dos: nunca estuvo en rojo/, "debe nombrar al test que nunca estuvo en rojo");
    assert.doesNotMatch(r2.out, /frase uno: nunca estuvo en rojo/, "«frase uno» sí está en rojo");
    // Rojo = HEAD pero los nombres no coinciden con la hoja («frase tres» sin afirmación) → 2 (A5 sigue vigente en el rojo).
    const nombres = repoTemporal(SOY, join(base, "nombres"));
    orden(nombres, "x", { tests: [["frase tres", "verde-x.txt"]] });
    const r3 = rojoVerdeTodas(nombres.dir);
    assert.equal(r3.status, 2, `test sin afirmación en el rojo debe dar 2 (salió ${r3.status})\n${r3.out}`);
    assert.match(r3.out, /frase tres/, "debe listar el test sin afirmación");
    assert.doesNotMatch(r3.stdout, /rojo pendiente de B/, "con nombres que no coinciden no es «rojo pendiente de B»");
    // Rojo ≠ HEAD (hay commit verde) → se verifica entera, como hasta ahora: tabla con «verde en», sin «rojo pendiente».
    const verde = repoTemporal(SOY, join(base, "verde"));
    const { rojo } = orden(verde, "x", { verde: true });
    const r4 = rojoVerdeTodas(verde.dir);
    assert.equal(r4.status, 0, `rojo + verde debe salir 0 (salió ${r4.status})\n${r4.out}`);
    assert.match(r4.stdout, /^orden x ·/m, "se verifica entera: tabla");
    assert.ok(r4.stdout.includes(`rojo en ${sha7(rojo)}`) && /verde en [0-9a-f]{7}/.test(r4.stdout), `tabla con rojo y verde\n${r4.stdout}`);
    assert.doesNotMatch(r4.stdout, /rojo pendiente de B/, "con verde no es «rojo pendiente de B»");
    // Rojo ≠ HEAD y los tests siguen fallando en HEAD → 2, como hasta ahora (el «pendiente» es sólo cuando el rojo ES HEAD).
    const roto = repoTemporal(SOY, join(base, "roto"));
    orden(roto, "x");
    roto.commit("otro commit sin verde", { "otro.txt": "x\n" });
    const r5 = rojoVerdeTodas(roto.dir);
    assert.equal(r5.status, 2, `rojo que no es HEAD con tests en rojo debe dar 2 (salió ${r5.status})\n${r5.out}`);
    assert.doesNotMatch(r5.stdout, /rojo pendiente de B/, "un rojo que no es HEAD no es «pendiente»");
  });
});
