// SERVICIOS-GALERIA-01 · copia promovida (TEAM-RESENAS-01, 2026-10-01, D-174) de tests/orden/servicios-galeria-01/instrumentos/_nav.mjs.
// Lo mismo que el original —la url de cada plantilla (SG_A / SG_C), playwright del árbol medido (SG_RAIZ) y el material de Storage
// respondido desde dev-fixtures/media/ (nada sale a la red)— más DOS cosas de esta copia:
// (1) NINGUNA ESPERA DE TIEMPO FIJO (la verificadora de SERVICIOS-GALERIA-01 midió 6 de 9 con carga en la máquina): cada espera es una
//     condición —`listo()` después de cargar, `quieta()` después de mover el scroll o la pantalla—, sondeada cuadro a cuadro por
//     `waitForFunction`, con un tope largo sólo para no colgarse;
// (2) `SG_CASOS` (coma): los casos «<plantilla>-<idioma>-<ancho>x<alto>» que corre cada instrumento (un caso por plantilla, D-165);
//     sin la variable, todos.
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";

export const RAIZ = process.env.SG_RAIZ || process.cwd();
const require = createRequire(join(RAIZ, "package.json"));
export const { chromium } = require("playwright");
export const URLS = { a: process.env.SG_A, c: process.env.SG_C };
if (!URLS.a || !URLS.c) throw new Error("faltan SG_A y SG_C (url base de cada plantilla)");
export const url = (p, ruta = "") => URLS[p].replace(/\/$/, "") + "/" + ruta.replace(/^\//, "");
/** Los casos que corre esta copia (SG_CASOS); sin la variable, todos. */
export const CASOS = process.env.SG_CASOS ? process.env.SG_CASOS.split(",").map((x) => x.trim()).filter(Boolean) : null;
export const toma = (p, lang, w, h) => !CASOS || CASOS.includes(`${p}-${lang}-${w}x${h}`);
/** Plantilla e idioma que pide algún caso (para los instrumentos que miden por plantilla e idioma, no por pantalla). */
export const tomaPL = (p, lang) => !CASOS || CASOS.some((k) => k.startsWith(`${p}-${lang}-`));

/** Después de cargar: fuentes listas, el splash ido, sin nada pendiente en la red, las imágenes que no son diferidas (`loading="lazy"` fuera de
 *  pantalla no carga nunca) cargadas y decodificadas, y la página quieta. Si Vite recarga la página a mitad (optimiza una dependencia
 *  que descubrió un import diferido: «Execution context was destroyed»), vuelve a empezar desde la carga nueva. */
export async function listo(pg, sel = "body") {
  for (let intento = 0; ; intento++) {
    try {
      await pg.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
      await pg.waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 30000 });
      // el splash (`[role="dialog"]`, ~3,4 s) tapa la página y al salir la vuelve a scrollY 0 (App.tsx, handleSplashExitComplete)
      await pg.waitForFunction(() => !document.querySelector('[role="dialog"]') && document.body.style.overflow !== "hidden", null, { timeout: 30000 });
      await pg.waitForSelector(sel, { state: "attached", timeout: 30000 });
      await pg.waitForFunction(() => [...document.images].every((i) => i.complete || i.loading === "lazy"), null, { timeout: 30000 });
      await pg.evaluate(() => Promise.all([...document.images].filter((i) => i.complete && i.naturalWidth).map((i) => i.decode().catch(() => {}))));
      await quieta(pg, sel);
      return;
    } catch (e) {
      if (intento >= 3 || !/context was destroyed|navigat/i.test(String(e?.message))) throw e;
      await pg.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
    }
  }
}
/** La caja de `sel` (y el scroll) sin moverse durante `cuadros` cuadros seguidos, sin transiciones ni animaciones vivas en ella y
 *  con las imágenes que quedaron en pantalla ya cargadas (al mover el scroll entran las diferidas). */
export async function quieta(pg, sel = "body", cuadros = 6) {
  await pg.waitForFunction(([s, n]) => {
    const e = document.querySelector(s); if (!e) return false;
    const r = e.getBoundingClientRect();
    const firma = `${r.x},${r.y},${r.width},${r.height},${scrollX},${scrollY}`;
    const enPantalla = (i) => { const q = i.getBoundingClientRect(); return q.width > 0 && q.bottom > 0 && q.top < innerHeight && q.right > 0 && q.left < innerWidth; };
    const vivas = [...document.images].some((i) => !i.complete && enPantalla(i)) || e.getAnimations({ subtree: true }).some((a) => a.playState === "running" && a.effect?.getComputedTiming?.().iterations !== Infinity);
    const w = (window.__quieta ??= {});
    const prev = w[s];
    w[s] = { firma, n: !vivas && prev && prev.firma === firma ? prev.n + 1 : 0 };
    return w[s].n >= n;
  }, [sel, cuadros], { polling: "raf", timeout: 30000 });
}
/** La leyenda de services (F-C) ya cambió a la frase de la tarjeta central y terminó su fundido (si se muestra y hay frase). */
export async function leyendaLista(pg) {
  await pg.waitForFunction(() => {
    const cap = document.querySelector("#services .svc-caption");
    if (!cap || getComputedStyle(cap).display === "none") return true;
    const central = document.querySelector('#services .svc-slide[data-centrada="1"] .svc-phrase:not(:empty)');
    if (!central) return true;
    return cap.textContent.trim() === central.textContent.trim() && getComputedStyle(cap).opacity === "1";
  }, null, { polling: "raf", timeout: 30000 });
  await quieta(pg, "#services");
}
/** Hasta que la página en `pg` haya cambiado de ruta a `ruta` y esté quieta. */
export async function enRuta(pg, ruta, sel = "body") {
  await pg.waitForFunction((r) => location.pathname === r, ruta, { timeout: 30000 });
  await listo(pg, sel);
}

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
      // El vídeo se pide por rangos: sin una respuesta 206 Chromium deja la petición colgada y la carga no llega a networkidle.
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
  return ctx;
}
