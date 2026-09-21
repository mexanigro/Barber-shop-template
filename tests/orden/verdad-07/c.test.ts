// VERDAD-07 · C · clasificador (tools/_transcript.mjs, D-31): `git config` sin valor ni subopción de escritura es lectura (--show-origin,
// --get, --list, -l, o sólo la clave); con valor, --unset, --add, --replace-all, --edit, --remove-section, --rename-section es escritura.
// Y el cierre, con el transcript real de esta sesión (un solo Bash `git config --show-origin core.autocrlf`, D-4), clasifica «sólo lectura».
// Sesión A (2026-09-21): test rojo (hoy _transcript.mjs:126 sólo exceptúa --get*, --list y -l: el revisor fue bloqueado por una lectura).
// `escrituraShell` se importa directo (la hoja lo pide así); el cierre se lanza como proceso con HIGIENE_ROOTS/PLAN/TRANSCRIPT sobre un
// par temporal con un archivo sucio en T. Nada se escribe en T ni en H. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { escrituraShell } from "../../../tools/_transcript.mjs";
import { ROOT, cierre, conTemporal, par, transcriptRealReubicado } from "./_util.ts";

const ROOTS = [ROOT, resolve(ROOT, "../verdad-07-hermana-inexistente")];
const LECTURAS = ["git config --show-origin core.autocrlf", "git config core.autocrlf", "git config --get x", "git config --show-origin --get x", "git config --list", "git config -l"];
const ESCRITURAS = ["git config core.autocrlf false", "git config --unset x", "git config --add x y", "git config --replace-all x y", "git config --edit", "git config --remove-section x", "git config --rename-section a b"];

test("`escrituraShell` de tools/_transcript.mjs trata como lectura `git config --show-origin core.autocrlf`, `git config core.autocrlf`, `git config --get x`, `git config --show-origin --get x`, `git config --list`, `git config -l`; y como escritura `git config core.autocrlf false`, `git config --unset x`, `git config --add x y`, `git config --replace-all x y`, `git config --edit`, `git config --remove-section x`, `git config --rename-section a b`; y `tools/cierre.mjs` con un transcript real que sólo tiene `git config --show-origin core.autocrlf` clasifica «sólo lectura»", () => {
  for (const cmd of LECTURAS) assert.equal(escrituraShell(cmd, ROOT, ROOTS), "", `«${cmd}» con cwd en el repo es lectura`);
  for (const cmd of ESCRITURAS) assert.equal(escrituraShell(cmd, ROOT, ROOTS), cmd, `«${cmd}» con cwd en el repo es escritura (el segmento entero)`);
  // Las mismas, en un comando compuesto: lectura && escritura → la escritura; lecturas encadenadas → nada.
  assert.equal(escrituraShell(`${LECTURAS[0]} && ${ESCRITURAS[0]}`, ROOT, ROOTS), ESCRITURAS[0], "lectura && escritura → cita la escritura");
  assert.equal(escrituraShell(LECTURAS.join(" && "), ROOT, ROOTS), "", "sólo lecturas encadenadas → nada");
  assert.equal(escrituraShell(`git -C ${ROOT} config --show-origin core.autocrlf`, "C:/", ROOTS), "", "-C <repo> con lectura → nada");
  assert.equal(escrituraShell(`git -C ${ROOT} config core.autocrlf false`, "C:/", ROOTS), `git -C ${ROOT} config core.autocrlf false`, "-C <repo> con valor → escritura");
  // El cierre con el transcript real (D-4): un par temporal con un archivo sucio en T (faltas) y el transcript reubicado → «sólo leyó», exit 0.
  conTemporal((base) => {
    const { T, plan, roots } = par(base);
    writeFileSync(join(T.dir, "sucio.txt"), "sin commit\n");
    const transcript = transcriptRealReubicado(join(base, "transcript-real.jsonl"), T.dir, resolve(base, "Nichos-hub"));
    const r = cierre({ roots, plan, transcript });
    assert.equal(r.status, 0, `cierre con el transcript real (sólo git config --show-origin core.autocrlf) debe avisar y salir 0 (salió ${r.status})\n${r.out}`);
    assert.match(r.stderr, /CIERRE AVISO/, `debe ser «CIERRE AVISO»:\n${r.out}`);
    assert.match(r.stderr, /sólo leyó/, `debe decir que la sesión sólo leyó:\n${r.out}`);
    assert.doesNotMatch(r.stderr, /CIERRE BLOQUEADO/, `no bloquea por una lectura:\n${r.out}`);
    assert.match(r.stderr, /sucio\.txt/, `control: la falta (sucio.txt) sí se lista, aunque no sea suya:\n${r.out}`);
  });
});
