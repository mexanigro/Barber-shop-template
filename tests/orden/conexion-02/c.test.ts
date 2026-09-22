// CONEXION-02 · C (T) · punta a punta: recrear real (--sin-firestore, home 375, puerto libre de 40000–49151) para A y C sin brechas de
// validador ni de material y dentro de la línea base (A ≤ 1, C ≤ 2), y `b4-tenant.ts show --id test-b4-peluqueria-a` desde H (sólo lee;
// con Firestore, necesita H .env.local: si falta, falla nombrándolo) con `hero.video` igual al que A1 construye con `aplicarHeroVideo`
// (en proceso aparte con cwd = H y el cargador de .tsx). Sesión A (2026-09-22): test rojo (hoy no existe el componente: cae en el
// `existsSync` tras recrear, antes de `show`). Carpetas temporales con prefijo «conexion-02-», borradas en `finally`; ≤ 10 min por corrida (correrLargo).
// Sólo en T (C1); en H el archivo no define tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CAMPOS, codigoAplicarHeroVideo, COMPONENTE, conTemporalAsync, correrLargo, fixture, get, nodeE, puertoLibreEn, RAIZ_H, REPO } from "./_util.ts";

const RECREAR = "tools/verdad/recrear.mjs";
const TENANT = "scripts/b4-tenant.ts";
const ID = "test-b4-peluqueria-a";
type Brecha = { tipo: string; campo: string; hueco: string | null; detalle?: string };
type Informe = { firestore?: string; brechas: Brecha[]; diffs: { pagina: string; vista: number; pixels: number; size?: boolean }[] };

/** Bloque «## config (existe)» de la salida de `show`, como JSON; si `show` lo recorta, falla nombrándolo. */
function configDeShow(stdout: string): Record<string, unknown> {
  const i = stdout.indexOf("## config (existe)");
  assert.ok(i >= 0, `show imprime «## config (existe)» para ${ID}:\n${stdout.slice(-1500)}`);
  const resto = stdout.slice(i + "## config (existe)".length);
  const j = resto.search(/^## /m);
  const texto = (j < 0 ? resto : resto.slice(0, j)).trim();
  try { return JSON.parse(texto) as Record<string, unknown>; } catch (e) { assert.fail(`show imprime el documento config entero como JSON (hoy lo recorta a 1600 caracteres): ${(e as Error).message}\n…${texto.slice(-300)}`); }
}

if (REPO === "T") test("`recrear.mjs --paleta a --sin-firestore --paginas home --vistas 375 --puerto <libre>` y `--paleta c` no producen ninguna brecha «validador H rechaza» ni «material que producción no sirve», y las brechas totales no superan la línea base (A ≤ 1 en home 375, C ≤ 2); `b4-tenant.ts show --id test-b4-peluqueria-a` (con Firestore) devuelve en `hero.video` el mismo objeto que A1 construye desde el fixture", async (t) => {
  for (const [p, tope] of [["a", 1], ["c", 2]] as const) {
    const puerto = await puertoLibreEn(40000, 49151);
    await conTemporalAsync(async (tmp) => {
      const out = join(tmp, "out");
      const r = correrLargo([RECREAR, "--paleta", p, "--sin-firestore", "--paginas", "home", "--vistas", "375", "--puerto", String(puerto), "--out", out]);
      assert.ok(r.status === 0 || r.status === 2, `recrear --paleta ${p} sale 0 o 2 (salió ${r.status})\n${r.out.slice(-4000)}`);
      const ruta = join(out, `recrear-${p}.json`);
      assert.ok(existsSync(ruta), `recrear-${p}.json escrito en --out\n${r.out.slice(-3000)}`);
      const informe = JSON.parse(readFileSync(ruta, "utf8")) as Informe;
      assert.equal(informe.firestore, "saltado (--sin-firestore): declarado");
      assert.ok(informe.diffs.some((d) => d.pagina === "home" && d.vista === 375 && typeof d.pixels === "number"), `diff home 375 calculado (paleta ${p}): ${JSON.stringify(informe.diffs)}`);
      const tipos = (tipo: string) => informe.brechas.filter((b) => b.tipo === tipo);
      assert.deepEqual(tipos("puerto ocupado"), [], `paleta ${p}: ninguna brecha de puerto`);
      assert.deepEqual(tipos("validador H rechaza"), [], `paleta ${p}: ninguna brecha «validador H rechaza»: ${JSON.stringify(tipos("validador H rechaza").slice(0, 10))}`);
      assert.deepEqual(tipos("material que producción no sirve"), [], `paleta ${p}: ninguna brecha «material que producción no sirve»: ${JSON.stringify(tipos("material que producción no sirve").slice(0, 10))}`);
      assert.ok(informe.brechas.length <= tope, `paleta ${p}: brechas totales ≤ ${tope} (línea base; hay ${informe.brechas.length}): ${JSON.stringify(informe.brechas.map((b) => `${b.tipo} · ${b.campo}`))}`);
      t.diagnostic(`recrear ${p} home 375: ${informe.brechas.length} brechas (${informe.brechas.map((b) => b.tipo).join(", ") || "ninguna"})`);
    });
  }
  // Lo que A1 construye desde el fixture con aplicarHeroVideo (en H, proceso aparte).
  assert.ok(existsSync(resolve(RAIZ_H, COMPONENTE)), `no existe H ${COMPONENTE}`);
  const video = (fixture("a").hero as Record<string, unknown>).video as Record<string, unknown>;
  for (const campo of CAMPOS) assert.equal(typeof get(video, campo), "string", `precondición: el fixture A tiene hero.video.${campo}`);
  const r = nodeE(codigoAplicarHeroVideo(RAIZ_H, video), { cwd: RAIZ_H });
  assert.equal(r.status, 0, `aplicarHeroVideo sobre las ocho urls de A (en H) sale 0\n${r.out.slice(-3000)}`);
  const construido = JSON.parse(r.stdout.trim().split(/\r?\n/).pop() ?? "null") as unknown;
  assert.deepEqual(construido, video, "precondición (A1): lo construido es hero.video del fixture A");
  // show (sólo lectura; con Firestore): hero.video del tenant A.
  assert.ok(existsSync(join(RAIZ_H, ".env.local")), `falta ${RAIZ_H}/.env.local: b4-tenant.ts show no puede leer Firestore (el test no se salta)`);
  const show = correrLargo(["--experimental-strip-types", TENANT, "show", "--id", ID], { cwd: RAIZ_H });
  assert.equal(show.status, 0, `b4-tenant.ts show --id ${ID} sale 0 (salió ${show.status})\n${show.out.slice(-3000)}`);
  const tenant = get(configDeShow(show.stdout), "hero.video");
  assert.ok(tenant && typeof tenant === "object", `el tenant ${ID} tiene hero.video`);
  assert.deepEqual(tenant, construido, `hero.video del tenant ${ID} (Firestore) = lo que A1 construye desde el fixture`);
});
