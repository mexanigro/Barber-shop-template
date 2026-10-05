// AUDITORIA-01 · E1 (T+H) · el registro en CLAUDE.md y los worktrees viejos de T. Sesión A (2026-10-04): test rojo.
// Cada orden deja su párrafo en § Puertas automáticas de T y de H; el de esta nombra además `esperarImagenes` (CIERRE-TRAMO-01-B2),
// que ningún CLAUDE.md nombraba. El bloque CONTRATO-DECLARADO no cambia: esta orden no toca hooks.
// Los worktrees (Liam, 2026-10-04, D-233): `git worktree list` de T mostraba, además de la raíz, `C:/t/tmp/e2e-01-AHRWyO/arbol` y
// `…/Temp/e2e-01-ybv7Uv/arbol` (2f2cd4a) y uno `prunable` (e00a816), de corridas de `e2e.mjs` que no llegaron a su `finally`. Los
// quita B; cada uno tiene dentro un junction a `node_modules` de T, así que B quita PRIMERO el enlace (rmdir) y después la carpeta: un
// borrado que siguiera el enlace se llevaría el `node_modules` real. Por eso la afirmación pide también el `node_modules` de T entero.
// Es estado de la máquina (inciso l): su condición del árbol es el párrafo, que en el rojo no existe; T se lee por ruta fija.
// Caja negra: lectura de los dos CLAUDE.md (el del otro repo por ruta fija), `git show` del commit aprobado de CIERRE-TRAMO-01 y
// `git worktree list` de T. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CIERRE_TRAMO_01, RAIZ_H, RAIZ_T, RUTA, bloqueDe, git, parrafoDe } from "./_comun.ts";

const NOMBRA = ["services-v6", "Card", "modo-paleta", "networkidle", "suite-fases", "import(", "e2e.mjs", "sinCargarEnPagina", "esperarImagenes", "git worktree", "CIERRE-TRAMO-01"];
const RAICES = { T: RAIZ_T, H: RAIZ_H } as const;
const lineas = (s: string) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
/** Lo mínimo para decir que `node_modules` de T sigue entero después de quitar los worktrees. */
const ENTERO = ["vite/package.json", "playwright/package.json", "react/package.json", "typescript/lib/typescript.js", "tsx/package.json"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo AUDITORIA-01 que nombra «services-v6», «Card», «modo-paleta», «networkidle», «suite-fases», «import(», «e2e.mjs», «sinCargarEnPagina», «esperarImagenes», «git worktree» y «CIERRE-TRAMO-01»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CIERRE-TRAMO-01 (T 6503410 / H 7e41eae); y `git worktree list` de T muestra sólo su raíz, con su `node_modules` entero", () => {
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const texto = readFileSync(resolve(raiz, "CLAUDE.md"), "utf8");
    // (1) El párrafo de esta orden. Hoy no está: aquí está el rojo.
    const p = parrafoDe(texto, "AUDITORIA-01");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**AUDITORIA-01 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo AUDITORIA-01 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
  }
  // (2) El bloque CONTRATO-DECLARADO, igual que en el commit aprobado de CIERRE-TRAMO-01.
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CIERRE_TRAMO_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/.test(l)), `precondición: el bloque aprobado de CIERRE-TRAMO-01 en ${repo} fija el pre-push`);
    assert.deepEqual(lineas(bloqueDe(readFileSync(resolve(raiz, "CLAUDE.md"), "utf8"))), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CIERRE_TRAMO_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
  // (3) Los worktrees de T (el repo real, por ruta fija): sólo la raíz; y su node_modules entero.
  const lista = git(RUTA.T, "worktree", "list", "--porcelain").split(/\r?\n/).filter((l) => l.startsWith("worktree ")).map((l) => l.slice(9).replace(/\\/g, "/"));
  assert.deepEqual(lista, [RUTA.T], `git worktree list de T muestra sólo su raíz (hoy: ${lista.join(" · ")})`);
  for (const f of ENTERO) assert.ok(existsSync(resolve(RUTA.T, "node_modules", f)), `node_modules de T sigue entero: falta node_modules/${f}`);
});
