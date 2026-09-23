#!/usr/bin/env node
/**
 * logo-generico.mjs — wordmark genérico de una plantilla (CONEXION-08, D-79/D-81): el `brand.name` del fixture en dos PNG
 * transparentes de 600×160, `logo.png` con tinta oscura (superficie clara) y `logo-dark.png` con tinta clara (sobre el hero).
 * Es material de PLANTILLA: A y C no son clientes, y sin logo el navbar v6 pinta sólo el nombre.
 *
 *   node tools/material/logo-generico.mjs --paleta a|c [--fixture <ruta>] [--media <dir>]
 *
 * `--fixture` por defecto `T/dev-fixtures/peluqueria-paleta-<p>.json`; `--media` por defecto `T/dev-fixtures/media` (como
 * b4-material.ts). Escribe `<media>/paleta-<p>/logo.png` y `logo-dark.png`; de ahí los sube `H scripts/b4-material.ts` con rol
 * `branding`. Se rasteriza con Chromium (playwright), que es lo que T ya usa en tools/material/*.mjs: sin `sharp`, que T no tiene.
 * Determinista: dos corridas dan los mismos bytes, así que el token de Storage (sha256 del contenido) no cambia por volver a correrlo.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };

const paleta = arg("paleta");
if (!paleta) { console.error("uso: node tools/material/logo-generico.mjs --paleta a|c [--fixture <ruta>] [--media <dir>]"); process.exit(2); }
const FIXTURE = path.resolve(arg("fixture") ?? path.join(ROOT, "dev-fixtures", `peluqueria-paleta-${paleta}.json`));
const MEDIA = path.resolve(arg("media") ?? path.join(ROOT, "dev-fixtures", "media"));

if (!fs.existsSync(FIXTURE)) { console.error(`logo-generico: no existe el fixture ${FIXTURE}`); process.exit(2); }
const nombre = JSON.parse(fs.readFileSync(FIXTURE, "utf8")).brand?.name;
if (!nombre || !String(nombre).trim()) { console.error(`logo-generico: ${FIXTURE} no tiene brand.name`); process.exit(2); }

/** Lienzo del wordmark (D-81) y el margen que deja las cuatro esquinas transparentes. */
const ANCHO = 600, ALTO = 160, MARGEN = 40;
/** La tipografía del nombre en el navbar v6 (`font-serif` + `font-medium` + `tracking-wide` de peluquería, src/index.css:308).
 *  ponytail: tinta neutra fija, no derivada de la paleta — es material de plantilla y las dos versiones tienen que quedar legibles
 *  sobre cualquier superficie; cuando una plantilla quiera su propio color, se genera con el color en vez de con esta constante. */
const FUENTE = '"Frank Ruhl Libre", Georgia, serif';
const TINTAS = { "logo.png": "#141210", "logo-dark.png": "#f7f4f0" };

/** Página de 600×160 con el nombre centrado, encogido hasta caber entre los márgenes. */
const pagina = (texto, tinta) => `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:transparent}
  body{width:${ANCHO}px;height:${ALTO}px;display:flex;align-items:center;justify-content:center}
  #w{font-family:${FUENTE};font-weight:500;letter-spacing:.025em;white-space:nowrap;color:${tinta};font-size:72px;line-height:1}
</style><body><div id="w">${texto.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</div>`;

const salida = path.join(MEDIA, `paleta-${paleta}`);
fs.mkdirSync(salida, { recursive: true });

const navegador = await chromium.launch();
try {
  const page = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 1 });
  for (const [archivo, tinta] of Object.entries(TINTAS)) {
    await page.setContent(pagina(String(nombre), tinta));
    await page.evaluate(([ancho, margen]) => {
      const w = document.getElementById("w");
      const disponible = ancho - 2 * margen;
      const base = parseFloat(getComputedStyle(w).fontSize);
      if (w.scrollWidth > disponible) w.style.fontSize = `${Math.floor((base * disponible) / w.scrollWidth * 100) / 100}px`;
    }, [ANCHO, MARGEN]);
    const destino = path.join(salida, archivo);
    await page.screenshot({ path: destino, omitBackground: true, clip: { x: 0, y: 0, width: ANCHO, height: ALTO } });
    console.log(`${archivo} → ${destino} (${fs.statSync(destino).size} bytes)`);
  }
} finally { await navegador.close(); }
console.log(`logo genérico de «${nombre}» en ${salida}`);
