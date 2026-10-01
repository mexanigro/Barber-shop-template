// SERVICIOS-GALERIA-01 · lo común de los instrumentos de aceptación (copias de diseno/services/verificacion y
// diseno/galeria/verificacion). Tres cambios respecto de los originales, todos aquí y ninguno en lo que miden:
// (1) la página sale de SG_A / SG_C (url base de cada plantilla), no de los puertos fijos 4101/4103 del prototipo;
// (2) playwright se toma del node_modules del árbol medido (SG_RAIZ, si no el cwd), no de una ruta fija;
// (3) el material de Storage NO se pide a la red: `contexto()` responde cada url de firebasestorage con su archivo local
//     `dev-fixtures/media/paleta-<p>/<nombre>` (los mismos bytes: el token de la url es el sha256 del contenido, CONEXION-01) y
//     corta la petición si el archivo no está. Nada más sale a Storage, a Firestore ni a Vercel.
// SG_PROTOTIPO=1 sólo para medir el prototipo local (proxy-prototipo.mjs) con el mismo instrumento: copia la clase del prototipo
// `proto-svc-caption` a `svc-caption`, el nombre que tiene la leyenda en T. Sin esa variable no hace nada.
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";

export const RAIZ = process.env.SG_RAIZ || process.cwd();
const require = createRequire(join(RAIZ, "package.json"));
export const { chromium } = require("playwright");
export const URLS = { a: process.env.SG_A, c: process.env.SG_C };
if (!URLS.a || !URLS.c) throw new Error("faltan SG_A y SG_C (url base de cada plantilla)");
export const url = (p, ruta = "") => URLS[p].replace(/\/$/, "") + "/" + ruta.replace(/^\//, "");

const TIPOS = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm" };
/** Archivo local de una url de Storage de las plantillas (la misma regla que `deStorage` de tools/gama.mjs). */
export function deStorage(u) {
  const m = /clients%2Ftest-b4-peluqueria-([a-z0-9]+)%2Fmedia%2F[^%?]+%2F([^%?]+)\?/.exec(u);
  return m ? join(RAIZ, "dev-fixtures", "media", `paleta-${m[1]}`, decodeURIComponent(m[2])) : null;
}
export const sinMaterial = new Set();
/** browser.newContext(opciones) con el material de Storage servido desde disco. */
export async function contexto(b, opciones = {}) {
  const ctx = await b.newContext(opciones);
  await ctx.route(/^https:\/\/firebasestorage\.googleapis\.com\//, (r) => {
    const f = deStorage(r.request().url());
    if (f && existsSync(f)) {
      // El vídeo se pide por rangos: sin una respuesta 206 Chromium deja la petición colgada ~15 s y la carga no llega a networkidle.
      const todo = readFileSync(f), tipo = TIPOS[extname(f).toLowerCase()] || "application/octet-stream";
      const cab = { "cache-control": "max-age=31536000", "access-control-allow-origin": "*", "accept-ranges": "bytes" };
      const rango = /^bytes=(\d*)-(\d*)$/.exec(r.request().headers()["range"] ?? "");
      if (!rango) return r.fulfill({ status: 200, body: todo, contentType: tipo, headers: cab });
      const ini = rango[1] ? Number(rango[1]) : Math.max(0, todo.length - Number(rango[2]));
      const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), todo.length - 1) : todo.length - 1;
      return r.fulfill({ status: 206, body: todo.subarray(ini, fin + 1), contentType: tipo, headers: { ...cab, "content-range": `bytes ${ini}-${fin}/${todo.length}` } });
    }
    sinMaterial.add(r.request().url().slice(0, 140));
    return r.abort();
  });
  if (process.env.SG_PROTOTIPO === "1") await ctx.addInitScript(() => {
    new MutationObserver(() => { for (const e of document.querySelectorAll(".proto-svc-caption:not(.svc-caption)")) e.classList.add("svc-caption"); }).observe(document, { childList: true, subtree: true });
  });
  return ctx;
}
