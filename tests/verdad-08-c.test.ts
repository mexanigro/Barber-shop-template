// VERDAD-08 · C · el clasificador del cierre y `cp` (D-56). `cp` escribe SÓLO en su último argumento: sacar un archivo del repo es
// lectura. Hoy `DISCO` mete `cp` en la misma bolsa que `rm`, `mv`, `mkdir`, `touch` y `tee` y mira TODOS sus argumentos
// (_transcript.mjs:41 + :152–153), así que `cp <archivo de T> <carpeta fuera>` quedó clasificado «escritura» y el cierre bloqueó al
// revisor dos días seguidos con el turno limpio de su parte.
// Sesión A (2026-09-22): test rojo. C1 importa `escrituraShell` con extensión (la HOJA lo fija así) y además corre `tools/cierre.mjs`
// entero sobre un par temporal sucio con un transcript JSONL de una sola línea (D-4: las claves de un transcript real de Claude Code,
// con las raíces reubicadas al par temporal y `cwd` fuera de los dos repos). Un mismo archivo en T y en H (cmp → 0).
// VERDAD-09 D-63 (2026-09-22): copia editable promovida a npm test (VERDAD-08 está aprobada y retirada de rojo-verde --todas; el original
// en la carpeta congelada de la orden queda como estaba).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cierre, conTemporal, par, transcriptCpReubicado } from "./orden/verdad-08/_util.ts";

/** La interfaz se importa DENTRO del test, con `import()` y con extensión: la reproducción de HEAD que arma el D1 de las
 *  órdenes anteriores copia sólo `tests/orden/`, sin `tools/`, y un import estático arriba dejaría este archivo como «archivo de
 *  test que no carga» — falla de rojo-verde que tumba la verificación de esa otra orden (HOJA § Interfaz). */

test("`escrituraShell` de tools/_transcript.mjs trata como lectura `cp <archivo de la raíz> <fuera>`, `cp -r <carpeta de la raíz> <fuera>` y `cp <fuera> <fuera>`, y como escritura `cp <fuera> <archivo de la raíz>`, `mv <archivo de la raíz> <fuera>`, `mv <fuera> <archivo de la raíz>`, `rm <archivo de la raíz>`, `touch <archivo de la raíz>` y `tee <archivo de la raíz>`; y `tools/cierre.mjs` con un transcript real que sólo tiene `cp C:/Users/liama/Desktop/Nichos/Barber-shop-template-main/tests/helpers/png.ts tests/helpers/` (cwd fuera de los repos) clasifica «sólo lectura»", async () => {
  const { escrituraShell } = await import("../tools/_transcript.mjs");
  conTemporal((base) => {
    const raiz = join(base, "raiz").replace(/\\/g, "/");
    const fuera = join(base, "fuera").replace(/\\/g, "/");
    for (const d of [raiz, fuera, `${raiz}/dir`]) mkdirSync(d, { recursive: true });
    const clasifica = (cmd: string) => escrituraShell(cmd, fuera, [raiz], {} as NodeJS.ProcessEnv);

    const lecturas = [
      `cp ${raiz}/png.ts ${fuera}/`,
      `cp -r ${raiz}/dir ${fuera}/`,
      `cp ${fuera}/a.ts ${fuera}/b.ts`,
    ];
    for (const cmd of lecturas) assert.equal(clasifica(cmd), "", `sacar del repo es lectura: ${cmd}`);
    const escrituras = [
      `cp ${fuera}/a.ts ${raiz}/b.ts`,
      `mv ${raiz}/a.ts ${fuera}/`,
      `mv ${fuera}/a.ts ${raiz}/b.ts`,
      `rm ${raiz}/a.ts`,
      `touch ${raiz}/a.ts`,
      `tee ${raiz}/a.ts`,
    ];
    for (const cmd of escrituras) assert.equal(clasifica(cmd), cmd, `sigue siendo escritura: ${cmd}`);

    // Y el hook entero: par sucio + transcript con sólo ese `cp` → avisa y deja cerrar, no bloquea.
    const { T, H, plan, roots } = par(base);
    writeFileSync(join(T.dir, "sucio.txt"), "suciedad que no es de la sesión\n");
    const transcript = transcriptCpReubicado(join(base, "transcript.jsonl"), T.dir, H.dir);
    const r = cierre({ roots, plan, transcript });
    assert.equal(r.status, 0, `una sesión que sólo copió un archivo hacia afuera no bloquea el cierre (salió ${r.status})\n${r.out.slice(-2500)}`);
    assert.match(r.stderr, /CIERRE AVISO · HIGIENE-03: la sesión sólo leyó/, `debe avisar, no bloquear\n${r.stderr.slice(-2500)}`);
    assert.doesNotMatch(r.stderr, /CIERRE BLOQUEADO/, `no bloquea\n${r.stderr.slice(-2500)}`);
  });
});
