// VERDAD-06 · C · EOL sin sorpresas (D-26): C1 core.autocrlf=false efectivo y fijado por `npm prepare`, .gitattributes conservado; C2
// disco = blob byte a byte para cada archivo rastreado (hoy T 159 / H 124 difieren); C3 stash push -u / pop sobre un clon temporal
// devuelve un modificado LF y un nuevo CRLF byte a byte, y el clon lee `\n}\n` en src/services/tenant.ts (T) / src/lib/auth.ts (H).
// Sesión A (2026-09-21): tests rojos. C1–C3 miden con el git de la máquina, sin `-c` (gitCrudo): el `git` de verdad-02 antepone
// core.autocrlf=false y ocultaría el problema. Ningún test escribe en el repo real: C3 trabaja en un clon bajo «verdad-06-» con finally.
// Un mismo archivo en T y en H (cmp → 0): lo propio de cada repo se elige por SOY.
// VERDAD-07 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-06/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ROOT, SOY, clonar, conTemporal, gitCrudo, sha256 } from "./orden/verdad-06/_util.ts";

test("`git config --get core.autocrlf` en cada repo devuelve `false`, y package.json `prepare` lo fija (`git config core.autocrlf false`) junto al `hooksPath`; .gitattributes conserva `.githooks/* text eol=lf` y `tools/*.mjs text eol=lf`", () => {
  // --get con el git de la máquina (sin -c): el valor efectivo en este repo (local > global > sistema).
  const r = spawnSync("git", ["config", "--get", "core.autocrlf"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  const valor = (r.stdout ?? "").trim();
  assert.equal(valor, "false", `core.autocrlf efectivo en ${SOY} debe ser «false» (es «${valor || "(sin valor)"}»; origen: ${spawnSync("git", ["config", "--show-origin", "core.autocrlf"], { cwd: ROOT, encoding: "utf8", windowsHide: true }).stdout?.trim()})`);
  const prepare = String(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.prepare ?? "");
  assert.ok(prepare.includes("git config core.autocrlf false"), `package.json prepare debe fijar «git config core.autocrlf false»: ${prepare}`);
  assert.ok(prepare.includes("git config core.hooksPath .githooks"), `package.json prepare conserva el hooksPath: ${prepare}`);
  const attrs = readFileSync(resolve(ROOT, ".gitattributes"), "utf8").split(/\r?\n/).map((l) => l.trim());
  assert.ok(attrs.includes(".githooks/* text eol=lf"), `.gitattributes conserva «.githooks/* text eol=lf»:\n${attrs.join("\n")}`);
  assert.ok(attrs.includes("tools/*.mjs text eol=lf"), `.gitattributes conserva «tools/*.mjs text eol=lf»:\n${attrs.join("\n")}`);
});

test("para cada archivo rastreado, `git hash-object --no-filters <archivo>` es igual al sha del índice (`git ls-files -s`): cero diferencias (disco = blob byte a byte); el test lista los que difieran; y .gitattributes empieza por la línea `* -text` (la que hace que un clon y un stash salgan byte a byte en cualquier máquina)", () => {
  // `git ls-files -s -z`: «<modo> <sha> <stage>\t<ruta>» separados por NUL; sólo blobs regulares (100644/100755).
  const entradas = gitCrudo(ROOT, "ls-files", "-s", "-z").split("\0").filter(Boolean).map((e) => {
    const m = e.match(/^(\d{6}) ([0-9a-f]{40}) \d\t([\s\S]+)$/);
    if (!m) throw new Error(`entrada de ls-files -s que no se entiende: ${JSON.stringify(e)}`);
    return { modo: m[1], sha: m[2], ruta: m[3] };
  }).filter((e) => e.modo === "100644" || e.modo === "100755");
  assert.ok(entradas.length > 100, `precondición: hay archivos rastreados (${entradas.length})`);
  // Una sola llamada: hash-object --no-filters --stdin-paths (el contenido del disco tal cual, sin autocrlf ni atributos).
  const r = spawnSync("git", ["hash-object", "--no-filters", "--stdin-paths"], { cwd: ROOT, input: entradas.map((e) => e.ruta).join("\n") + "\n", encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, `git hash-object --no-filters --stdin-paths → exit ${r.status}\n${r.stderr}`);
  const discos = r.stdout.split(/\r?\n/).filter(Boolean);
  assert.equal(discos.length, entradas.length, "un sha por ruta");
  const distintos = entradas.filter((e, i) => discos[i] !== e.sha).map((e) => e.ruta);
  assert.equal(distintos.length, 0, `${distintos.length}/${entradas.length} archivos rastreados de ${SOY} tienen en disco bytes distintos a su blob (disco ≠ blob):\n  ${distintos.slice(0, 40).join("\n  ")}${distintos.length > 40 ? `\n  … y ${distintos.length - 40} más` : ""}`);
  assert.equal(readFileSync(resolve(ROOT, ".gitattributes"), "utf8").split(/\r?\n/)[0], "* -text", ".gitattributes debe empezar por «* -text» (A3: el rojo de C2 tiene que ser del árbol, no de la máquina)");
});

/** Archivo LF en el índice de los dos repos para modificar (tests/orden/verdad-02/HOJA.md) y el que lee `\n}\n` en cada repo. */
const MODIFICADO = "tests/orden/verdad-02/HOJA.md";
const FUNCION = { T: { archivo: "src/services/tenant.ts", regex: /export function applyHeroClip[\s\S]*?\n}\n/ }, H: { archivo: "src/lib/auth.ts", regex: /\n}\n/ } }[SOY];

test("un `git stash push -u` seguido de `git stash pop` sobre una copia temporal del repo (`git clone` a tmp con un archivo modificado LF y uno nuevo CRLF) devuelve los dos archivos byte a byte (sha256 antes = después), y `tests/material.test.ts` en esa copia sigue encontrando `\\n}\\n` en src/services/tenant.ts", () => {
  conTemporal((base) => {
    const clon = clonar(base); // git clone con la configuración de la máquina + npm run prepare (lo que haría npm install)
    // Un archivo rastreado (LF en el índice) reescrito entero con LF y una línea más; un archivo nuevo con CRLF.
    const modificado = join(clon, MODIFICADO), nuevo = join(clon, "verdad-06-nuevo.txt");
    writeFileSync(modificado, gitCrudo(clon, "show", `HEAD:${MODIFICADO}`).replace(/\r\n/g, "\n") + "\nlínea añadida por verdad-06 C3\n");
    writeFileSync(nuevo, "primera\r\nsegunda\r\n");
    const antes = { modificado: sha256(modificado), nuevo: sha256(nuevo) };
    assert.ok(!readFileSync(modificado, "utf8").includes("\r\n"), "precondición: el modificado está en LF");
    gitCrudo(clon, "stash", "push", "-q", "-u");
    assert.ok(!gitCrudo(clon, "status", "--porcelain"), "tras stash push -u el clon queda limpio");
    gitCrudo(clon, "stash", "pop", "-q");
    const despues = { modificado: sha256(modificado), nuevo: sha256(nuevo) };
    assert.deepEqual(despues, antes, `stash push -u / pop debe devolver los dos archivos byte a byte (modificado LF: ${readFileSync(modificado, "utf8").includes("\r\n") ? "vuelve CRLF" : "LF"}; nuevo CRLF: ${readFileSync(nuevo, "utf8").includes("\r\n") ? "CRLF" : "vuelve LF"})`);
    // El clon lee la función entera: la regex de tests/material.test.ts (`applyHeroClip[\s\S]*?\n}\n`) sobre src/services/tenant.ts en T; en H, `\n}\n` sobre src/lib/auth.ts.
    const texto = readFileSync(join(clon, FUNCION.archivo), "utf8");
    assert.match(texto, FUNCION.regex, `${FUNCION.archivo} del clon debe contener «\\n}\\n» (${texto.includes("\r\n") ? "está en CRLF: el checkout lo reescribió" : "sin CRLF"})`);
  });
});
