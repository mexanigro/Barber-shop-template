// MARCA-01 · R1 (T) · el retiro de SECCIONES-02: su copia promovida, con D1 reforzado (D-296). Sesión A (2026-10-07): test rojo —
// no existe `tests/secciones-02-a.test.ts`.
//
// La verificadora de SECCIONES-02 midió que con el `:where(html[data-niche="peluqueria"])` quitado su D1 sigue en verde: la flota no
// pinta `.ct6` ni `.team6`, así que la firma de los seis nichos no cambia. La copia cambia `data-niche` en vivo (en la plantilla A, con
// las reglas a la vista, pasar `<html>` a otro nicho tiene que sacarlas y volver a peluquería tiene que ponerlas). Este test lo
// comprueba corriendo el test del alcance de la copia en un clon de HEAD con esa mutación: tiene que caer. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, SECCIONES_02, clonDe, conTemporal, existe, fuente, git, quitarEnlace } from "./_comun.ts";

const COPIA = "tests/secciones-02-a.test.ts";
/** El principio de la frase de D1 de la hoja de SECCIONES-02 (su test del alcance). */
const D1 = "lo nuevo alcanza sólo a peluquería";

test("npm test corre la copia tests/secciones-02-a.test.ts en test:browser, que importa ./orden/secciones-02/_comun.ts y tiene sus siete tests, el del alcance con un nombre que empieza como D1 de la hoja de SECCIONES-02; ese test cambia data-niche en vivo y, corrido en un clon de HEAD con el :where(html[data-niche=\"peluqueria\"]) quitado de src/index.css, cae y su error nombra data-niche; y tests/orden/secciones-02/ no cambia desde su rojo (55cc9e8)", async () => {
  // (1) La copia y su lugar en npm test. Hoy no existe: aquí está el rojo.
  assert.ok(existe(COPIA), `falta ${COPIA} (D-296): SECCIONES-02 está aprobada y su copia no corre en npm test`);
  const pkg = JSON.parse(fuente("package.json")) as { scripts: Record<string, string> };
  assert.ok(pkg.scripts["test:browser"]?.split(/\s+/).includes(COPIA), `${COPIA} va en test:browser (abre Chromium, D-57)`);
  assert.ok(!pkg.scripts["test:unit"]?.split(/\s+/).includes(COPIA), `${COPIA} no va en test:unit`);
  const src = fuente(COPIA);
  assert.match(src, /from\s+["']\.\/orden\/secciones-02\/_comun\.ts["']/, `${COPIA} importa ./orden/secciones-02/_comun.ts`);
  const nombres = [...src.matchAll(/^test\(\s*"((?:[^"\\]|\\.)*)"/gm)].map((m) => m[1]);
  assert.equal(nombres.length, 7, `${COPIA} tiene sus siete tests (A1, A2, B1–B4 y D1); tiene ${nombres.length}`);
  assert.ok(nombres.some((n) => n.startsWith(D1)), `el test del alcance de la copia se llama como D1 de la hoja de SECCIONES-02 («${D1} …»)`);
  assert.match(src, /setAttribute\(\s*["']data-niche["']|dataset\.niche\s*=/, `el test del alcance de ${COPIA} cambia data-niche en vivo (setAttribute("data-niche", …) o dataset.niche = …)`);

  // (2) La carpeta congelada no cambió.
  const rojo = SECCIONES_02.rojo.T;
  const dif = spawnSync("git", ["diff", "--quiet", rojo, "HEAD", "--", "tests/orden/secciones-02/"], { cwd: ROOT, windowsHide: true });
  assert.equal(dif.status, 0, `tests/orden/secciones-02/ no cambia desde su rojo (${rojo})`);

  // (3) En las dos direcciones: con el :where quitado, el test del alcance de la copia cae nombrando data-niche.
  await conTemporal(async (base) => {
    const clon = clonDe(base, "clon", git(ROOT, "rev-parse", "HEAD"));
    try {
      const css = join(clon, "src", "index.css");
      const antes = readFileSync(css, "utf8");
      const despues = antes.split(':where(html[data-niche="peluqueria"]) ').join("").split(':where(html[data-niche="peluqueria"])').join("").split('html:where([data-niche="peluqueria"])').join("html");
      assert.notEqual(despues, antes, "precondición: src/index.css tiene las reglas de SECCIONES-02 limitadas con :where(html[data-niche=\"peluqueria\"])");
      writeFileSync(css, despues);
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "--test", "--test-reporter=tap", `--test-name-pattern=^${D1}`, COPIA], { cwd: clon, encoding: "utf8", timeout: 30 * 60 * 1000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
      const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
      assert.match(out, /^# pass \d+/m, `la copia corrió en el clon (salida: ${out.slice(-800)})`);
      assert.notEqual(r.status, 0, `con el :where quitado, el test del alcance de la copia tiene que caer y pasó (salida: ${out.slice(-800)})`);
      assert.match(out, /data-niche/, `y su error nombra data-niche (salida: ${out.slice(-1500)})`);
    } finally { quitarEnlace(clon); }
  });
});
