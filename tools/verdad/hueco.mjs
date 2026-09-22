#!/usr/bin/env node
/**
 * hueco.mjs — «aprobado = hueco real en el hub» (VERDAD-05, base 2016255 de VERDAD-01, R-V3). Lee verdad/contratos.json (una fila por
 * hueco de bloque-04/CONTRATOS-HUECOS.md) y comprueba que los CINCO lugares existan DE VERDAD, no por nombre:
 *   (1) contrato: `contrato.campo` está literal en CONTRATOS-HUECOS.md;
 *   (2) validador H: el archivo existe, exporta la función (`export function|const <nombre>`) y su texto nombra la clave;
 *   (3) UI del hub: H/src/app/<ui.ruta>/page.tsx existe y H/<ui.componente> existe y nombra `ui.campo` o la clave;
 *   (4) material: el valor de `ruta` está en el fixture A y, según `material.vive`: config|locale presente, storage = URL https,
 *       public = archivo bajo T/public/. Cualquier valor bajo /dev-fixtures/ es «producción no sirve dev-fixtures/media» (D-18);
 *   (5) guard T: el archivo existe, está en el script `test` de package.json y nombra `guard.clave` o la clave.
 * Una fila está HECHA sólo con los cinco. Exit 0 si todas las filas pedidas están hechas, 2 si no (un detalle por cada «no» que
 * nombra el lugar). Lo que hoy no cumple no se inventa: queda con sus «no» (línea base, no objetivo).
 * Raíces T/H por tools/_git.mjs (`HIGIENE_ROOTS=<T>;<H>` las sustituye sólo para pruebas); CONTRATOS-HUECOS.md en BLOQUE_DIR
 * (`HIGIENE_BLOQUE=<dir>` lo sustituye sólo para pruebas).
 *
 *   node tools/verdad/hueco.mjs [--id <id>] [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOTS, etiqueta, BLOQUE_DIR } from "../_git.mjs";

export const T = ROOTS.find((r) => etiqueta(r) === "T");
export const H = ROOTS.find((r) => etiqueta(r) === "H");
export const BLOQUE = process.env.HIGIENE_BLOQUE || BLOQUE_DIR;
export const CONTRATOS = path.join(T, "verdad", "contratos.json");
const leer = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
const get = (o, ruta) => ruta.replace(/\[\]/g, ".0").replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean).reduce((a, k) => (a == null ? undefined : a[k]), o);

/** Comprueba una fila. Devuelve { id, seccion, checks: {contrato, validador, ui, material, guard}, hecho }. Cada check = { ok, detalle }. */
export function comprobarFila(row, ctx = contexto()) {
  const clave = row.clave ?? row.ruta.split(".").pop();
  const c = {};
  // (1) contrato
  if (ctx.contratosMd == null) c.contrato = { ok: false, detalle: "sin CONTRATOS-HUECOS.md" };
  else if (row.contrato?.campo && ctx.contratosMd.includes(row.contrato.campo)) c.contrato = { ok: true, detalle: row.contrato.campo };
  else c.contrato = { ok: false, detalle: `«${row.contrato?.campo}» no está en CONTRATOS-HUECOS.md` };
  // (2) validador H
  if (!row.validador) c.validador = { ok: false, detalle: "sin validador declarado" };
  else {
    const src = leer(path.join(H, row.validador.archivo));
    if (src == null) c.validador = { ok: false, detalle: `no existe H ${row.validador.archivo}` };
    else if (!new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${row.validador.funcion}\\b`).test(src)) c.validador = { ok: false, detalle: `${row.validador.archivo} no exporta ${row.validador.funcion}` };
    else if (!src.includes(clave)) c.validador = { ok: false, detalle: `${row.validador.archivo} no nombra «${clave}»` };
    else c.validador = { ok: true, detalle: `${row.validador.archivo} · ${row.validador.funcion}` };
  }
  // (3) UI del hub
  if (!row.ui) c.ui = { ok: false, detalle: "sin UI en el hub (CONEXION-01)" };
  else {
    const page = path.join(H, "src", "app", row.ui.ruta.replace(/^\//, ""), "page.tsx");
    const comp = leer(path.join(H, row.ui.componente));
    if (!fs.existsSync(page)) c.ui = { ok: false, detalle: `ruta ${row.ui.ruta} sin page.tsx en H` };
    else if (comp == null) c.ui = { ok: false, detalle: `no existe H ${row.ui.componente}` };
    else if (!comp.includes(row.ui.campo ?? clave)) c.ui = { ok: false, detalle: `${row.ui.componente} no nombra «${row.ui.campo ?? clave}»` };
    else c.ui = { ok: true, detalle: `${row.ui.ruta} · ${row.ui.componente}` };
  }
  // (4) material
  const valor = ctx.fixtureA ? get(ctx.fixtureA, row.ruta) : undefined;
  const vive = row.material?.vive;
  const texto = JSON.stringify(valor ?? "");
  const dev = texto.match(/\/dev-fixtures\/[^"]*/);
  if (!vive) c.material = { ok: false, detalle: "sin `material.vive`" };
  else if (valor === undefined) c.material = { ok: false, detalle: `${row.ruta} no está en el fixture A` };
  else if (dev) c.material = { ok: false, detalle: `${dev[0]}: producción no sirve dev-fixtures/media` };
  else if (vive === "config" || vive === "locale") c.material = { ok: true, detalle: `${vive}: ${texto.slice(0, 40)}` };
  else {
    const primero = Array.isArray(valor) ? valor[0] : valor;
    const v = String(primero && typeof primero === "object" ? primero.src ?? primero.mp4 ?? Object.values(primero)[0] ?? "" : primero);
    if (vive === "storage") c.material = /^https:\/\//.test(v) ? { ok: true, detalle: v.slice(0, 50) } : { ok: false, detalle: `${v} no es URL https (storage)` };
    else if (vive === "public") c.material = fs.existsSync(path.join(T, "public", v.replace(/^\//, ""))) ? { ok: true, detalle: `public${v}` } : { ok: false, detalle: `${v} no está en T public/` };
    else c.material = { ok: false, detalle: `vive=${vive} desconocido` };
  }
  // (5) guard T
  if (!row.guard) c.guard = { ok: false, detalle: "sin guard" };
  else {
    const src = leer(path.join(T, row.guard.archivo));
    if (src == null) c.guard = { ok: false, detalle: `no existe T ${row.guard.archivo}` };
    else if (!ctx.npmTest.includes(row.guard.archivo)) c.guard = { ok: false, detalle: `${row.guard.archivo} no está en npm test` };
    else if (!src.includes(row.guard.clave ?? clave)) c.guard = { ok: false, detalle: `${row.guard.archivo} no nombra «${row.guard.clave ?? clave}»` };
    else c.guard = { ok: true, detalle: row.guard.archivo };
  }
  return { id: row.id, seccion: row.seccion, checks: c, hecho: Object.values(c).every((x) => x.ok) };
}

/** Lo que las filas comparten: CONTRATOS-HUECOS.md, el fixture A y los tokens de lo que corre `npm test` en T.
 *  VERDAD-08 (D-57): `test` encadena dos fases, así que la lista de archivos vive en `test:unit` y `test:browser`. */
export function contexto() {
  const fxA = leer(path.join(T, "dev-fixtures", "peluqueria-paleta-a.json"));
  const s = JSON.parse(fs.readFileSync(path.join(T, "package.json"), "utf8")).scripts ?? {};
  const npmTest = [s.test, s["test:unit"], s["test:browser"]].filter(Boolean).join(" ").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  return { contratosMd: leer(path.join(BLOQUE, "CONTRATOS-HUECOS.md")), fixtureA: fxA ? JSON.parse(fxA) : null, npmTest };
}
export const leerContratos = () => JSON.parse(fs.readFileSync(CONTRATOS, "utf8"));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const i = args.indexOf("--id");
  const filas = leerContratos().huecos.filter((r) => i < 0 || r.id === args[i + 1]);
  if (!filas.length) { console.error("hueco: sin filas (¿--id inexistente?)"); process.exit(2); }
  const ctx = contexto(); const res = filas.map((r) => comprobarFila(r, ctx));
  if (args.includes("--json")) console.log(JSON.stringify(res, null, 1));
  else {
    const f = (x) => (x.ok ? "sí" : "NO");
    console.log("hueco                                  | contrato | validador H | UI hub | material | guard T | hecho");
    for (const r of res) console.log(`${r.id.padEnd(38)} | ${f(r.checks.contrato).padEnd(8)} | ${f(r.checks.validador).padEnd(11)} | ${f(r.checks.ui).padEnd(6)} | ${f(r.checks.material).padEnd(8)} | ${f(r.checks.guard).padEnd(7)} | ${r.hecho ? "HECHO" : "en construcción"}`);
    for (const r of res) for (const [k, v] of Object.entries(r.checks)) if (!v.ok) console.log(`  ${r.id} · ${k}: ${v.detalle}`);
    console.log(`${res.filter((r) => r.hecho).length}/${res.length} huecos hechos`);
  }
  process.exit(res.every((r) => r.hecho) ? 0 : 2);
}
