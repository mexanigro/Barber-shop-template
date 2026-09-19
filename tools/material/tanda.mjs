#!/usr/bin/env node
/**
 * tanda.mjs — mide una carpeta de archivos sueltos (una tanda de fotos o de clips) contra la paleta de un fixture.
 *
 * Uso: node tools/material/tanda.mjs <carpeta> --paleta <a|b|fixture> --rol servicio|retrato|galeria|clip|local|textura [--foot <hex>] [--escena <local.jpg>]
 *   Toma los .jpg/.jpeg/.png/.avif/.webm de la carpeta en orden de nombre (los .mp4 no: Chromium de Playwright no decodifica
 *   h264, se mide el .webm hermano), los pasa por `medir()` de tools/gama.mjs con el rol dado (servicio y retrato: serie + fondo;
 *   galería: serie sin fondo; clip: ni serie ni fondo), imprime la tabla T/K/S/F y escribe <carpeta>/gama.json (lo lee hoja.mjs).
 *   Exit 1 si algún archivo no pasa. `medirTanda()` se exporta para tests/material.test.ts.
 */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { medir, imprimir, paletaDe } from "../gama.mjs";

export const ROLES = { servicio: { serie: "servicio", fondo: true }, retrato: { serie: "retrato", fondo: true }, galeria: { serie: "galería", fondo: false }, clip: { serie: undefined, fondo: false, v: true }, local: { serie: undefined, fondo: true }, textura: { serie: undefined, fondo: false, quietud: true } }; // local: foto del local (D5), T + K + F
export const archivosDe = (dir) => fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|avif|webm)$/i.test(f)).sort();

/** Mide la carpeta; devuelve { rows, acc, colors } de gama.mjs con un rol por fila. */
export async function medirTanda(dir, colors, rol, foot = null) {
  const r = ROLES[rol]; if (!r) throw new Error(`rol desconocido: ${rol} (servicio|retrato|galeria|clip|local)`);
  const files = archivosDe(dir).map((f, i) => ({ role: `${rol} ${i + 1}`, src: path.resolve(dir, f), kind: /\.webm$/i.test(f) ? "video" : "image", serie: r.serie, fondo: r.fondo, v: !!r.v, quietud: !!r.quietud, foot: foot || undefined })); // --foot <hex>: banda superior en el pie del clip (R20)
  if (!files.length) throw new Error(`sin archivos medibles en ${dir}`);
  return medir(files, colors);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
  const dir = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
  if (!dir || !opt("paleta") || !opt("rol")) { console.error("uso: node tools/material/tanda.mjs <carpeta> --paleta <a|b|fixture> --rol servicio|retrato|galeria|clip|local"); process.exit(2); }
  const res = await medirTanda(dir, paletaDe(opt("paleta")), opt("rol"), opt("foot"));
  const bad = imprimir(`${path.basename(path.resolve(dir))} · ${opt("rol")} · paleta ${opt("paleta")}`, res);
  // R24 (SERVICES-02 fase 2b/2c, hueco 6, medida provisional): `--escena <local.jpg>` — luz media (L) y tono dominante de cada foto
  // contra los de la foto del local de la paleta: |ΔL| ≤ 0,15 y ΔH ≤ 35° → pertenece a la escena. F (pared = surface) no aplica
  // bajo R24 (las esquinas muestran el salón a propósito): se imprime igual y se declara.
  if (opt("escena")) {
    const loc = (await medir([{ role: "local", src: path.resolve(opt("escena")), kind: "image", fondo: false }], paletaDe(opt("paleta")))).rows[0];
    const dH = (a, b) => (a === null || b === null ? null : Math.min(Math.abs(a - b), 360 - Math.abs(a - b)));
    console.log(`escena (R24) vs ${path.basename(opt("escena"))}: L ${loc.L.toFixed(3)} · Hdom ${loc.Hdom}°`);
    for (const r of res.rows) { const dl = Math.abs(r.L - loc.L), dh = dH(r.Hdom, loc.Hdom); r.escena = dl <= 0.15 && (dh === null || dh <= 35); r.dLesc = +dl.toFixed(3); r.dHesc = dh; console.log(`  ${path.basename(r.src).padEnd(28)} ΔL ${dl.toFixed(3)} · ΔH ${dh === null ? "—" : dh + "°"} → escena ${r.escena ? "sí" : "NO"}`); }
  }
  fs.writeFileSync(path.join(dir, "gama.json"), JSON.stringify({ rol: opt("rol"), paleta: opt("paleta"), colors: res.colors, rows: res.rows.map((r) => ({ ...r, src: path.basename(r.src), esquinas: undefined })) }, null, 1));
  process.exit(bad ? 1 : 0);
}
