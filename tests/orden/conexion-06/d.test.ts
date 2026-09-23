// CONEXION-06 · D · retiro de CONEXION-05 (D-74): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a
// npm test como copias editables (H: a, b, d, e = 8 tests que corren; T: b, d, e = 6), con su carpeta congelada desde el último rojo.
// La línea de APROBADAS.md la escribe la sesión B. Sesión A (2026-09-23): tests rojos — no está la línea ni están las copias.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin conexion-06/, y lectura de las
// copias (D2 NO las corre: la copia `d` de conexion-05 reproduce HEAD, que lleva esta orden viva). Un mismo archivo en T y en H
// (cmp → 0): las copias y el conteo se eligen por REPO.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CONEXION_05, REPO, ROOT, conTemporal, cuentaTests, cuentaTestsDe, git, ordenesVivas, reproducirHead, rojoVerdeTodas } from "./_comun.ts";

const LETRAS = { H: ["a", "b", "d", "e"], T: ["b", "d", "e"] };
/** Tests que CORREN en cada repo (las copias van enteras; los `test(` guardados por REPO no corren en el otro). */
const TOTAL = { H: 8, T: 6 };
const CARPETA = "tests/orden/conexion-05";
/** Las doce órdenes ya retiradas antes de esta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"], ["verdad-09", "2026-09-22"],
];

test("conexion-05 figura en tests/orden/APROBADAS.md con fecha 2026-09-23, T a41f93a y H 0c60811, y rojo-verde --todas en HEAD imprime «conexion-05 · retirada (aprobada 2026-09-23)» y no «orden conexion-05 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- conexion-05 · aprobada 2026-09-23 · T ${CONEXION_05.aprobado.T} · H ${CONEXION_05.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce sin conexion-06/.
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, ["conexion-06"]);
    assert.ok(ids.includes("conexion-05"), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("conexion-06"), "la reproducción no lleva tests/orden/conexion-06/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^conexion-05 · retirada \(aprobada 2026-09-23\)$/m, `debe decir «conexion-05 · retirada (aprobada 2026-09-23)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden conexion-05 ·/, `no debe imprimir la tabla de conexion-05\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /conexion-05 · rojo pendiente de B/, "conexion-05 ya no está pendiente de B");
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias tests/conexion-05-a.test.ts, -b, -d, -e en H (8 tests) y tests/conexion-05-b.test.ts, -d, -e en T (6 tests), que importan ./orden/conexion-05/_comun.ts, sin recorte y sin volver a correr copias anteriores; en T van a `test:unit`; tests/orden/conexion-05/ no cambia desde su último rojo (4941cd2 en T, 569f128 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const letras = LETRAS[REPO];
  const copias = letras.map((s) => `tests/conexion-05-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), /from "\.\/orden\/conexion-05\/_comun\.ts"/, `${c} debe importar ./orden/conexion-05/_comun.ts`);
  // Sin recorte: cada copia lleva tantos `test(` como su original en la carpeta congelada (los guardados por REPO no corren en el otro).
  for (const s of letras) {
    assert.equal(cuentaTests(leer(`tests/conexion-05-${s}.test.ts`)), cuentaTests(leer(`${CARPETA}/${s}.test.ts`)), `la copia ${s} lleva los mismos tests que ${CARPETA}/${s}.test.ts (entera)`);
  }
  assert.equal(letras.reduce((n, s) => n + cuentaTestsDe(leer(`tests/conexion-05-${s}.test.ts`), REPO), 0), TOTAL[REPO], `en ${REPO} las copias suman ${TOTAL[REPO]} tests que corren`);
  // Sin volver a correr copias anteriores: la copia que reproduce HEAD excluye TODA orden viva (si no, --todas correría esta misma).
  const vivas = [...new Set([...ordenesVivas(ROOT), "conexion-06"])];
  for (const c of copias) {
    const fuente = leer(c);
    const m = fuente.match(/reproducirHead\([^,]+,\s*\[([^\]]*)\]/);
    if (!m) continue;
    for (const id of vivas) assert.ok(m[1].includes(`"${id}"`), `${c} reproduce HEAD: debe excluir la orden viva «${id}» o volvería a correr sus tests (excluye ${m[1]})`);
  }
  // npm test las corre: los scripts de package.json las nombran (en T, `test:unit`, porque `test` encadena las fases, D-57) o las cubren con un glob (H).
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const c of copias) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO === "T") {
      assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
      assert.doesNotMatch(leer(c), /from "playwright"/, `${c} no importa playwright (por eso va en test:unit)`);
    }
  }
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(CONEXION_05.rojo[REPO]), `el último rojo de conexion-05 en ${REPO} es ${CONEXION_05.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
