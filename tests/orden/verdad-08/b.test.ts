// VERDAD-08 · B · el candado sin falsos positivos y sobre el hermano. B1 (D-55): `vetoShell` parte el comando con `segmentos()`, que
// ya trata bien las comillas, en vez de partirlo crudo — hoy `grep -n -E "a|b" <orden>/HOJA.md` se parte por el `|` de adentro de la
// cadena y el trozo «b" …» no parece lectura, así que el revisor no pudo leer una orden congelada. B2 (D-56): el origen de `cp` es
// lectura y el destino no. B3 (D-54): el candado vigila `tests/orden/<id>/` del repo propio Y del hermano (`ROOTS` de _git.mjs), con
// el permiso `.git/permitir-tests` de la raíz que corresponde.
// Sesión A (2026-09-22): tests rojos — hoy candado.mjs:37 mira una sola raíz, :154 parte crudo y `cp` no está entre las lecturas.
// B1 importa `segmentos` (tools/_transcript.mjs) y `vetoShell` (tools/candado.mjs) con extensión, con `hoja` y `permiso` sustituidos
// (la orden `vieja-01` no existe en el repo); B2 y B3 por stdin, en proceso aparte. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, candadoJson, conTemporal, hojaMinima, repoTemporal } from "./_util.ts";

/** La interfaz se importa DENTRO del test, con `import()` y con extensión: la reproducción de HEAD que arma el D1 de las
 *  órdenes anteriores copia sólo `tests/orden/`, sin `tools/`, y un import estático arriba dejaría este archivo como «archivo de
 *  test que no carga» — falla de rojo-verde que tumba la verificación de esa otra orden (HOJA § Interfaz). */
const interfaz = async () => ({
  segmentos: (await import("../../../tools/_transcript.mjs")).segmentos,
  vetoShell: (await import("../../../tools/candado.mjs")).vetoShell,
});

const RAIZ = ROOT.replace(/\\/g, "/");
/** Entorno vacío: ninguna variable se expande en los comandos de prueba. */
const VACIO = {} as NodeJS.ProcessEnv;
/** Esta orden no existe en el repo: el rojo y el permiso se sustituyen para probar sólo el reparto en segmentos. */
const CON_ROJO = () => true;
const SIN_PERMISO = () => "permiso: .git/permitir-tests ausente";

test("`vetoShell` de tools/candado.mjs parte el comando con `segmentos()` de tools/_transcript.mjs y no crudo, así que una cadena entre comillas dobles o simples es un solo token aunque contenga `|`, `;`, `&&`, `||` o comillas escapadas (`\\\"`): con `vieja-01` en rojo, ni `grep -n -E \"a|b\" tests/orden/vieja-01/HOJA.md` ni `grep -n -E \"existsSync|niche=\\\"barberia\\\"|rol\" \"<raíz>/tests/orden/vieja-01/a.test.ts\"` dan veto, `cat tests/orden/vieja-01/HOJA.md | grep b` y `echo \"a;b\"; ls tests/orden/vieja-01` tampoco, y `segmentos()` los parte en 1, 1, 2 y 2 segmentos", async () => {
  const { segmentos, vetoShell } = await interfaz();
  const casos: [string, number][] = [
    [`grep -n -E "a|b" tests/orden/vieja-01/HOJA.md`, 1],
    [`grep -n -E "existsSync|niche=\\"barberia\\"|rol" "${RAIZ}/tests/orden/vieja-01/a.test.ts"`, 1],
    [`cat tests/orden/vieja-01/HOJA.md | grep b`, 2],
    [`echo "a;b"; ls tests/orden/vieja-01`, 2],
  ];
  for (const [cmd, _n] of casos) {
    const v = vetoShell(cmd, ROOT, VACIO, CON_ROJO, SIN_PERMISO);
    assert.equal(v, null, `el candado no debe vetar una lectura: ${cmd}\nvetó el segmento «${v?.seg}»`);
  }
  for (const [cmd, n] of casos) {
    assert.equal(segmentos(cmd, VACIO).length, n, `segmentos(${cmd}) → ${JSON.stringify(segmentos(cmd, VACIO))}`);
  }
  // La otra dirección: lo que escribe sigue vetado aunque lleve comillas con `|` adentro.
  const escribe = `grep -n -E "a|b" x.md > tests/orden/vieja-01/HOJA.md`;
  assert.notEqual(vetoShell(escribe, ROOT, VACIO, CON_ROJO, SIN_PERMISO), null, `una redirección hacia la orden sigue siendo veto: ${escribe}`);
});

test("el candado sobre shells deja pasar `grep -n -E \"a|b\" tests/orden/<id>/HOJA.md`, `grep -n -E \"x|y\" \"<raíz>/tests/orden/<id>/a.test.ts\"` y `cp tests/orden/<id>/HOJA.md C:/tmp/x` (el origen de `cp` es lectura, D-56), y sigue vetando `cp C:/tmp/x tests/orden/<id>/HOJA.md`, `mv tests/orden/<id>/HOJA.md C:/tmp/x`, `echo x >> tests/orden/<id>/HOJA.md`, `sed -i s/a/b/ tests/orden/<id>/c.test.ts` y `node -e \"…writeFileSync('tests/orden/<id>/c.test.ts',…)\"`", () => {
  conTemporal((base) => {
    const repo = repoTemporal("H", base);
    repo.commit("rojo vieja-01", {
      "tests/orden/vieja-01/HOJA.md": hojaMinima([["A1", "T+H", "una afirmación de prueba"]]),
      "tests/orden/vieja-01/c.test.ts": "// prueba\n",
      "tests/orden/nueva-99/c.test.ts": "// sin rojo\n",
    });
    const raiz = repo.dir.replace(/\\/g, "/");
    const env = { HIGIENE_ROOT: repo.dir, HIGIENE_ROOTS: repo.dir };
    const bash = (command: string) => candadoJson({ tool_name: "Bash", tool_input: { command }, cwd: repo.dir }, env);
    const pasan = [
      `grep -n -E "a|b" tests/orden/vieja-01/HOJA.md`,
      `grep -n -E "x|y" "${raiz}/tests/orden/vieja-01/a.test.ts"`,
      `cp tests/orden/vieja-01/HOJA.md C:/tmp/x`,
    ];
    for (const cmd of pasan) {
      const r = bash(cmd);
      assert.equal(r.status, 0, `el candado debe dejar pasar una lectura: ${cmd}\n${r.out.slice(-1500)}`);
    }
    const vetan = [
      `cp C:/tmp/x tests/orden/vieja-01/HOJA.md`,
      `mv tests/orden/vieja-01/HOJA.md C:/tmp/x`,
      `echo x >> tests/orden/vieja-01/HOJA.md`,
      `sed -i s/a/b/ tests/orden/vieja-01/c.test.ts`,
      `node -e "require('fs').writeFileSync('tests/orden/vieja-01/c.test.ts','')"`,
    ];
    for (const cmd of vetan) {
      const r = bash(cmd);
      assert.equal(r.status, 2, `el candado debe vetar una escritura: ${cmd}\n${r.out.slice(-1500)}`);
      assert.match(r.stderr, /^CANDADO · orden «vieja-01» bajo candado/m, `el veto se explica como «CANDADO · …»: ${cmd}\n${r.stderr.slice(-1500)}`);
    }
    // Control: una orden sin rojo se escribe libre.
    assert.equal(bash(`echo x >> tests/orden/nueva-99/c.test.ts`).status, 0, "nueva-99 no tiene rojo: se escribe libre");
  });
});

test("el candado vigila `tests/orden/<id>/` del repo propio y del hermano (`ROOTS` de tools/_git.mjs, con «hermano no encontrado» → sólo el propio): desde un repo temporal H' con un hermano temporal T' (rutas inyectadas con `HIGIENE_ROOTS=<H'>;<T'>`), un Write o un Bash que nombre `<T'>/tests/orden/vieja-01/HOJA.md` (rojo en la historia de T') → veto «CANDADO · orden «vieja-01» (hermano) …»; `<T'>/tests/orden/nueva-99/` (sin rojo) → pasa; `.git/permitir-tests` del hermano abre el hermano y el del propio no", () => {
  conTemporal((base) => {
    const propio = repoTemporal("H", base), hermano = repoTemporal("T", base);
    hermano.commit("rojo vieja-01", {
      "tests/orden/vieja-01/HOJA.md": hojaMinima([["A1", "T+H", "una afirmación de prueba"]]),
      "tests/orden/nueva-99/c.test.ts": "// sin rojo\n",
    });
    const env = { HIGIENE_ROOTS: `${propio.dir};${hermano.dir}` };
    const enHermano = (rel: string) => `${hermano.dir.replace(/\\/g, "/")}/${rel}`;
    const write = (ruta: string, extra: Record<string, string> = {}) => candadoJson({ tool_name: "Write", tool_input: { file_path: ruta }, cwd: propio.dir }, { ...env, ...extra });
    const bash = (command: string, extra: Record<string, string> = {}) => candadoJson({ tool_name: "Bash", tool_input: { command }, cwd: propio.dir }, { ...env, ...extra });
    const permiso = (repo: string) => writeFileSync(join(repo, ".git", "permitir-tests"), "1");
    const quitar = (repo: string) => writeFileSync(join(repo, ".git", "permitir-tests"), "0");

    const w = write(enHermano("tests/orden/vieja-01/HOJA.md"));
    assert.equal(w.status, 2, `un Write sobre la orden congelada del hermano es veto\n${w.out.slice(-1500)}`);
    assert.match(w.stderr, /CANDADO · orden «vieja-01» \(hermano\)/, `el veto dice de qué repo es la orden\n${w.stderr.slice(-1500)}`);
    const b = bash(`echo x >> ${enHermano("tests/orden/vieja-01/HOJA.md")}`);
    assert.equal(b.status, 2, `un Bash que escribe en la orden congelada del hermano es veto\n${b.out.slice(-1500)}`);
    assert.match(b.stderr, /CANDADO · orden «vieja-01» \(hermano\)/, `el veto dice de qué repo es la orden\n${b.stderr.slice(-1500)}`);
    // La otra dirección: sin rojo en el hermano se escribe libre.
    assert.equal(write(enHermano("tests/orden/nueva-99/c.test.ts")).status, 0, "nueva-99 del hermano no tiene rojo: se escribe libre");
    // El permiso es el de la raíz dueña de la orden: el del hermano abre, el del propio no.
    permiso(hermano.dir);
    assert.equal(write(enHermano("tests/orden/vieja-01/HOJA.md")).status, 0, "el .git/permitir-tests del hermano abre su propia orden");
    quitar(hermano.dir);
    permiso(propio.dir);
    const v = write(enHermano("tests/orden/vieja-01/HOJA.md"));
    assert.equal(v.status, 2, `el .git/permitir-tests del repo propio no abre la orden del hermano\n${v.out.slice(-1500)}`);
    // Y lo propio sigue como estaba: sin rojo aquí, se escribe libre aunque no haya permiso.
    quitar(propio.dir);
    assert.equal(write(resolve(propio.dir, "tests/orden/vieja-01/HOJA.md")).status, 0, "en el repo propio vieja-01 no tiene rojo");
  });
});
