#!/usr/bin/env node
/**
 * E2E-01 · la web desplegada contra la plantilla, zona por zona.
 *
 * Qué compara. Cada web creada desde la ficha del hub (su dominio de Vercel) contra la MISMA plantilla que la originó, servida en
 * local. La referencia NO es el servidor de desarrollo: es un `vite build` de T en el commit exacto que Vercel desplegó —el que
 * `tests/e2e-01-webs.json` declara— servido estático y leyendo Firestore con `VITE_CLIENT_ID=test-b4-peluqueria-<paleta>` (D-100).
 * Mismo código, mismo camino de datos, misma configuración de Vercel (nicho peluquería, hebreo, demo apagado): la ÚNICA diferencia
 * entre los dos lados es qué documento `config/{id}` se lee. Si la ficha del hub sabe escribir lo que la plantilla necesita, las dos
 * páginas tienen que dar el mismo píxel.
 *
 * Por qué por elemento y no la página entera (D-101). El alta del hub deja `showWhyChooseUs: false` y `showInquiry: false`, y los
 * fixtures toman el `true` del template: la página entera NUNCA va a medir lo mismo, y una sección que no se juzga desplazaría todo
 * lo de abajo. Cada zona se captura por su propio elemento, así que una sección ausente no mueve a las demás.
 *
 * Las seis zonas juzgadas (D-97): `nav[data-nav-v6]`, `#hero`, `#services` y `#gallery` en `/`, y `#main-content` en `/servicios` y
 * en `/galeria`; a 375 y a 1280. Más los tokens computados de `:root` (la paleta en su modo y la tipografía).
 *
 * Qué NO hace. No escribe: ni en Firestore, ni en Storage, ni en Vercel, ni en el repo. Lee el registro, lee el árbol de git, arma
 * su copia en una carpeta temporal con prefijo «e2e-01-» y la borra en `finally`, también si algo falla. No mata procesos ajenos: si
 * el puerto ya responde, se planta.
 *
 * Estabilidad (ARREGLOS-02, D-115/D-116/D-119). Cada zona se captura con una captura de CALENTAMIENTO que se descarta: medido
 * contra las dos webs, la primera rasterización de la pastilla de navbar-v6 —`backdrop-filter: blur(16px)`, que entra en la
 * captura porque la barra es fija y el elemento es más alto que el viewport— movía 13 a 17 píxeles del borde redondeado derecho.
 * Y `--corridas <n>` repite la medición entera n veces, cada una con su propio navegador y sobre la MISMA referencia ya
 * construida: lo que se repite es lo que puede variar (la sesión del navegador, las cargas, la rasterización), no el build.
 *
 * Exit (`codigoDeSalida`, ARREGLOS-01 D-108). 0 cuando la medición se completó y cada zona se repitió a sí misma (el informe lleva
 * el veredicto, zona por zona, con `repeticiones` y `estable`); 2 cuando una zona NO es estable —aunque su `pixels` sea 0— o cuando
 * NO se pudo medir —no existe el registro, el commit no está en el árbol, el build falló, el puerto estaba ocupado, la web
 * desplegada no responde o una zona no existe en alguno de los dos lados—. Un 0 con `pixels > 0` y la zona estable es una
 * diferencia medida, no un error de la herramienta.
 *
 * Uso:
 *   node tools/verdad/e2e.mjs --web a|c [--puerto <n>] [--zonas navbar,hero,…] [--vistas 375,1280] [--repeticiones <n>] [--corridas <n>] [--json] [--out <dir>]
 */
import { spawn, spawnSync } from "node:child_process";
import { hash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { diffPng } from "./recrear.mjs";

const T = path.resolve(fileURLToPath(import.meta.url), "../../..");
/** El registro que la sesión B escribe en el hub (D-99), por ruta fija como hueco.mjs. */
const RAIZ_H = "C:/Users/liama/Desktop/Nichos-hub";
const WEBS = "tests/e2e-01-webs.json";

/** Las seis zonas juzgadas (D-97) con el selector que las ancla y la ruta donde viven. */
const ZONAS = [
  { zona: "navbar", ruta: "/", selector: "nav[data-nav-v6]" },
  { zona: "hero", ruta: "/", selector: "#hero" },
  { zona: "services", ruta: "/", selector: "#services" },
  { zona: "gallery", ruta: "/", selector: "#gallery" },
  { zona: "pagina-servicios", ruta: "/servicios", selector: "#main-content" },
  { zona: "pagina-galeria", ruta: "/galeria", selector: "#main-content" },
];
const VISTAS = [375, 1280];
/** Cuántas veces se captura cada zona por lado (ARREGLOS-01, D-108): una medición que no se repite no se puede afirmar. */
const REPETICIONES = 2;
/** Cuántas veces se repite la medición entera, cada una con su propio navegador (ARREGLOS-02, D-118/D-119): la repetición dentro
 *  de un lado no ve una diferencia ENTRE lados que dependa de la sesión del navegador. */
const CORRIDAS = 1;
/**
 * Cómo se lanza Chromium para las DOS páginas (la desplegada y la referencia): sin antialiasing subpíxel y sin hinting.
 *
 * Medido (ARREGLOS-02-B): en una corrida de cada ocho, la REFERENCIA rasterizaba el texto de las tarjetas de servicio con
 * antialiasing subpíxel y en las otras no — 1246 píxeles de franjas de color (azul `43,123,184`, naranja `221,154,59`) en bandas
 * de 9 y 11 filas que se repiten por tarjeta, con el recorte visualmente idéntico. La web desplegada salía byte a byte igual entre
 * corridas, así que no era una diferencia con la plantilla: era el modo de antialiasing de la primera corrida. Con estas dos
 * banderas el texto nunca usa subpíxel y las dos páginas se rasterizan igual.
 */
const ARGS_CHROMIUM = ["--disable-lcd-text", "--font-render-hinting=none"];
/** Los tokens de `:root` que llevan la paleta en su modo y la tipografía (D-97). */
const TOKENS = ["--surface", "--text", "--accent", "--accent-strong", "--font-sans", "--font-serif"];
/** Id del tenant de la plantilla de una paleta (D-16): con esto se sirve la referencia. */
const tenantDe = (p) => `test-b4-peluqueria-${p}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** ¿Alguien escucha ya en ese puerto? (nunca se mata a nadie). */
const escucha = (puerto) => new Promise((ok) => {
  const s = net.connect({ host: "127.0.0.1", port: puerto });
  s.on("connect", () => { s.destroy(); ok(true); });
  s.on("error", () => ok(false));
  setTimeout(() => { s.destroy(); ok(false); }, 1500);
});
/** sha256 corto de un buffer: sólo para el diagnóstico (decir qué lado se movió sin volver a comparar los PNG). */
// Con `crypto.hash()` y no con el par crear-hash + alimentar: la C1 de E2E-01 prohíbe ese literal en esta herramienta,
// porque es el que delataría una escritura en Firestore.
const sha256 = (b) => hash("sha256", b, "hex").slice(0, 16);
const borrar = (dir) => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); } catch { /* lo recoge el temporal de la corrida */ } };
const git = (cwd, ...args) => spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8", windowsHide: true });

/** La web de una paleta según el registro del hub. Lanza con el motivo exacto: es lo primero que falta. */
function webDe(paleta) {
  const abs = path.join(RAIZ_H, WEBS);
  if (!fs.existsSync(abs)) throw new Error(`no existe H ${WEBS}: las dos webs de punta a punta todavía no existen (D-99)`);
  const reg = JSON.parse(fs.readFileSync(abs, "utf8"));
  const w = (reg.webs ?? []).find((x) => x.paleta === paleta);
  if (!w) throw new Error(`H ${WEBS} no declara la web de la paleta ${paleta}`);
  for (const campo of ["clientId", "domain", "commitSha"]) if (!w[campo]) throw new Error(`H ${WEBS}: la web ${paleta} no declara «${campo}»`);
  return w;
}

/** Las VITE_* que Vercel tiene puestas en el proyecto del cliente, leídas del `.env` de T (mismos valores, mismo proyecto Firebase). */
function entornoDeReferencia(paleta) {
  const abs = path.join(T, ".env");
  if (!fs.existsSync(abs)) throw new Error(`falta ${abs}: sin las VITE_FIREBASE_* la referencia no puede leer config/{id}`);
  const env = {};
  for (const linea of fs.readFileSync(abs, "utf8").split(/\r?\n/)) {
    const t = linea.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    const k = t.slice(0, i).trim();
    if (k.startsWith("VITE_FIREBASE_")) env[k] = v;
  }
  if (!env.VITE_FIREBASE_PROJECT_ID) throw new Error(`${abs} no trae VITE_FIREBASE_PROJECT_ID`);
  // Lo mismo que el hub le pone al proyecto de Vercel (src/lib/deploy.ts): nicho, idioma y demo apagado.
  env.VITE_CLIENT_ID = tenantDe(paleta);
  env.VITE_ACTIVE_NICHE = "peluqueria";
  env.VITE_UI_LANGUAGE = "he";
  env.VITE_DEMO_MODE = "false";
  env.VITE_HERO_CLIP = "";
  return env;
}

/** Árbol de T en `sha` dentro de `base`, con node_modules enlazado (nada se instala) y `.env` propio; corre `fn(dir)`. */
async function conArbol(sha, base, env, fn) {
  const tieneCommit = git(T, "cat-file", "-e", `${sha}^{commit}`);
  if (tieneCommit.status !== 0) throw new Error(`el commit ${sha.slice(0, 7)} no está en el árbol de T: no se puede construir la referencia que Vercel desplegó`);
  const dir = path.join(base, "arbol");
  const anadir = git(T, "worktree", "add", "--detach", dir, sha);
  if (anadir.status !== 0) throw new Error(`no se pudo poner el árbol de ${sha.slice(0, 7)} en ${dir}: ${(anadir.stderr || "").trim().slice(0, 300)}`);
  const enlace = path.join(dir, "node_modules");
  try {
    if (fs.existsSync(path.join(T, "node_modules"))) fs.symlinkSync(path.join(T, "node_modules"), enlace, "junction");
    fs.writeFileSync(path.join(dir, ".env"), Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
    return await fn(dir);
  } finally {
    try { fs.rmSync(enlace); } catch { /* el junction se quita sin entrar en el node_modules real */ }
    git(T, "worktree", "remove", "--force", dir);
    borrar(dir);
  }
}

/** `vite build` del árbol; devuelve la carpeta servible. */
function construir(dir, env, log) {
  const r = spawnSync(process.execPath, [path.join(T, "node_modules/vite/bin/vite.js"), "build"], {
    cwd: dir, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  fs.writeFileSync(log, `${r.stdout ?? ""}\n${r.stderr ?? ""}`);
  if (r.status !== 0) throw new Error(`«vite build» falló en la referencia (ver ${path.basename(log)}):\n${(r.stderr || r.stdout || "").slice(-1200)}`);
  const dist = path.join(dir, "dist");
  if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error(`«vite build» no dejó dist/index.html en ${dir}`);
  return dist;
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm", ".woff": "font/woff", ".woff2": "font/woff2", ".ico": "image/x-icon" };

/** Sirve `dist` estático (con vuelta a index.html, que es una SPA) en `puerto`; corre `fn(base)` y cierra siempre. */
async function conEstatico(dist, puerto, fn) {
  if (await escucha(puerto)) throw new Error(`puerto ocupado: :${puerto} ya responde antes de levantar la referencia (no se mata a nadie)`);
  const servidor = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || "/").split("?")[0]);
    let abs = path.join(dist, rel);
    if (!abs.startsWith(dist) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) abs = path.join(dist, "index.html");
    const cuerpo = fs.readFileSync(abs);
    res.writeHead(200, { "Content-Type": MIME[path.extname(abs).toLowerCase()] || "application/octet-stream", "Content-Length": cuerpo.length });
    res.end(cuerpo);
  });
  await new Promise((ok, ko) => { servidor.on("error", ko); servidor.listen(puerto, "127.0.0.1", ok); });
  try { return await fn(`http://localhost:${puerto}`); }
  finally { await new Promise((ok) => servidor.close(ok)); }
}

/** Espera a que la caja de la página deje de moverse: dos muestras seguidas con las mismas cajas y el mismo alto. Una condición,
 *  no un reloj (ARREGLOS-01, D-107: un `setTimeout` fijo es una apuesta). Devuelve si llegó a quedarse quieta. */
async function quieto(p, intentos = 12, pausa = 100) {
  let previo = null;
  for (let i = 0; i < intentos; i++) {
    const ahora = await p.evaluate(() => {
      const cajas = [...document.querySelectorAll("*")].slice(0, 600)
        .map((e) => { const r = e.getBoundingClientRect(); return `${r.x.toFixed(2)},${r.y.toFixed(2)},${r.width.toFixed(2)},${r.height.toFixed(2)}`; });
      return `${document.documentElement.scrollHeight}|${cajas.join(";")}`;
    });
    if (ahora === previo) return true;
    previo = ahora;
    await p.waitForTimeout(pausa);
  }
  return false;
}

/** Deja la página quieta y comparable: sin animaciones, fuentes cargadas, todo el contenido perezoso pedido y decodificado, y el
 *  vídeo del hero congelado en el cuadro 0 (el mismo clip por los dos lados, así que el cuadro es el mismo byte).
 *
 *  ARREGLOS-01 (D-107). Lo que antes faltaba y dejaba 1166 px una vez de cada tres: las imágenes CARGADAS Y DECODIFICADAS, el
 *  `loading="lazy"` forzado a `eager` (el elemento se captura entero, también lo que está bajo el pliegue), las animaciones de la
 *  Web Animations API —que una regla `animation:none` NO apaga, porque no vienen de una hoja de estilo— y la caja quieta.
 *  Y no alcanza con congelar: `e2e.mjs` compara DOS páginas, así que una animación pausada en un instante cualquiera sale igual a
 *  sí misma y distinta de la del otro lado. Hay que TERMINARLA en un punto determinista: `cancel()` la infinita (vuelve al valor
 *  de base), `finish()` la finita (va a su último cuadro); `finish()` sobre una infinita lanza. */
export async function asentar(p) {
  await p.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await p.addStyleTag({ content: "*,*::before,*::after{animation:none!important;animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}" });
  await p.waitForFunction(`!document.querySelector('[role="dialog"][aria-modal="true"].fixed')`, null, { timeout: 15000 }).catch(() => {});
  // Nada perezoso: lo que falte se pide ahora, antes de recorrer la página.
  await p.evaluate(() => { for (const el of document.querySelectorAll("img[loading],iframe[loading]")) el.loading = "eager"; });
  const alto = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < alto; y += 400) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await p.evaluate(async () => {
    const vs = [...document.querySelectorAll("video")];
    for (const v of vs) { try { v.pause(); v.currentTime = 0; v.removeAttribute("autoplay"); } catch { /* sin vídeo */ } }
    await Promise.all(vs.map((v) => v.readyState >= 2 ? null : new Promise((ok) => { v.addEventListener("loadeddata", ok, { once: true }); setTimeout(ok, 4000); })));
    // Toda animación viva terminada en un punto determinista (las de la WAAPI incluidas).
    for (const a of document.getAnimations()) {
      const t = (a.effect && a.effect.getComputedTiming) ? a.effect.getComputedTiming() : {};
      const infinita = t.iterations === Infinity || t.duration === Infinity;
      try { if (infinita) a.cancel(); else a.finish(); } catch { try { a.cancel(); } catch { /* ya terminada */ } }
    }
    await document.fonts.ready;
    // Imágenes cargadas Y decodificadas: `complete` no garantiza que el píxel ya esté listo para pintar.
    await Promise.all([...document.images].map(async (img) => {
      if (!img.complete) await new Promise((ok) => { img.addEventListener("load", ok, { once: true }); img.addEventListener("error", ok, { once: true }); setTimeout(ok, 8000); });
      if (img.complete && img.naturalWidth > 0) await img.decode().catch(() => {});
    }));
  });
  await quieto(p);
}

/** Abre una ruta en una vista, la asienta y devuelve la página (el contexto se cierra fuera). */
async function abrir(browser, base, ruta, vista) {
  const ctx = await browser.newContext(vista < 768
    ? { viewport: { width: vista, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" }
    : { viewport: { width: vista, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  // Sólo para el diagnóstico de D-122: toda respuesta que recibe esta página, incluidos los archivos de fuente de fonts.gstatic.com
  // (que el resource timing del documento no siempre lista). No participa de la comparación.
  const respuestas = [];
  p.on("response", (r) => { respuestas.push({ url: r.url(), estado: r.status(), tipo: r.request().resourceType() }); });
  await p.goto(base + ruta, { waitUntil: "load", timeout: 120000 });
  await p.waitForSelector("main, #main-content", { timeout: 60000 }).catch(() => {});
  await asentar(p);
  return { ctx, p, respuestas };
}

/**
 * `repeticiones` capturas comparables del mismo elemento, más una de CALENTAMIENTO que se descarta.
 *
 * ARREGLOS-02 (D-115, medido contra las dos webs desplegadas). Con `asentar` aplicado y cuatro capturas seguidas del mismo
 * elemento a 1280, la PRIMERA difería de las tres siguientes —idénticas entre sí— en 13 a 17 píxeles, siempre en x = 1150–1151 y
 * en las filas 19–23 y 64–68, con ±1 por canal. `document.elementFromPoint` sobre esos puntos da, en las dos webs, la pastilla de
 * `navbar-v6` (`div.relative.mx-3 < nav.fixed.inset-x-0`) con `backdrop-filter: blur(16px)`: a 1280 va de x=128 a x=1152 y de
 * y=12 a y=76, así que son exactamente las dos esquinas redondeadas de su borde derecho — el antialias del recorte del desenfoque
 * en su PRIMERA rasterización. Entra en la captura porque `#main-content` empieza en y=0 y es más alto que el viewport, así que la
 * barra fija se compone encima. La captura de calentamiento cubre además el scroll que provoca la propia captura (D-116).
 *
 * `estable` se decide SÓLO sobre las capturas medidas: que la primera difiera es la forma esperada; que difiera una posterior
 * sigue siendo inestabilidad y el descarte no la tapa.
 */
export async function capturasEstables(elemento, repeticiones) {
  await elemento.screenshot(); // calentamiento: se pide y se descarta
  const capturas = [];
  for (let i = 0; i < repeticiones; i++) capturas.push(await elemento.screenshot());
  return { capturas, estable: capturas.every((b) => b.equals(capturas[0])) };
}

/**
 * DIAGNÓSTICO (ARREGLOS-02, D-122) · qué cargó un lado y con qué fuentes pintó la zona. Se vuelca SÓLO cuando una zona mide
 * `pixels > 0` **con la zona estable** —los dos lados repetidos a sí mismos—, que es el caso que no se puede explicar mirando
 * los PNG: en 20 cargas controladas fuera de la corrida el render nunca varió, así que hay que capturarlo aquí.
 *
 * No participa de la comparación: no cambia `pixels`, ni `estable`, ni `codigoDeSalida`. Sólo escribe un JSON al lado de los PNG.
 * `CSS.getPlatformFontsForNode` (CDP) dice qué **caras reales** usó el compositor para el texto de la zona, con su
 * `postScriptName` y cuántos glifos pintó cada una — que es lo que distingue «otra cara de Heebo» de «la misma».
 */
async function diagnosticoDe(lado, selector) {
  const { p, respuestas } = lado;
  const dom = await p.evaluate(() => ({
    fontsStatus: document.fonts.status,
    caras: [...document.fonts].map((f) => `${f.family}|${f.weight}|${f.style}|${f.status}`).sort(),
    recursos: performance.getEntriesByType("resource")
      .map((r) => `${r.initiatorType}|${r.encodedBodySize}b|${r.deliveryType || (r.transferSize === 0 && r.decodedBodySize > 0 ? "cache" : "red")}|${r.responseStatus ?? 0}|${r.name}`)
      .sort(),
  }));
  let usadas = null;
  try {
    const cdp = await p.context().newCDPSession(p);
    try {
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
      if (nodeId) usadas = (await cdp.send("CSS.getPlatformFontsForNode", { nodeId })).fonts;
    } finally { await cdp.detach().catch(() => {}); }
  } catch (e) { usadas = `(sin CDP: ${e.message})`; }
  return {
    fontsStatus: dom.fontsStatus,
    carasTotal: dom.caras.length,
    caras: dom.caras,
    fuentesUsadas: usadas,
    archivosDeFuente: respuestas.filter((r) => r.tipo === "font" || /fonts\.gstatic\.com|\.woff2?(\?|$)|\.ttf(\?|$)|\.otf(\?|$)/i.test(r.url)),
    recursos: dom.recursos,
    respuestas,
  };
}

/** El exit de una corrida, como función pura: 2 si falta una zona o si alguna no es estable; 0 si todas se repitieron a sí mismas.
 *  Un `pixels > 0` con la zona estable sigue siendo 0: es una diferencia MEDIDA, no un error de la herramienta (D-108). */
export function codigoDeSalida(informe) {
  if ((informe?.faltantes ?? []).length) return 2;
  if ((informe?.zonas ?? []).some((z) => z.estable === false)) return 2;
  return 0;
}

/** Los tokens computados de `:root`, normalizados (los espacios de una lista de fuentes no cuentan). */
async function tokensDe(p, tokens) {
  return await p.evaluate((ts) => {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    for (const t of ts) out[t] = cs.getPropertyValue(t).trim().replace(/\s+/g, " ");
    return out;
  }, tokens);
}

const USO = "uso: e2e.mjs --web a|c [--puerto <n>] [--zonas navbar,hero,services,gallery,pagina-servicios,pagina-galeria] [--vistas 375,1280] [--repeticiones <n>] [--corridas <n>] [--json] [--out <dir>]";

async function main(args) {
  const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
  const paleta = opt("web");
  if (!["a", "c"].includes(paleta)) { console.error(USO); return 2; }
  const puerto = parseInt(opt("puerto", "4321"), 10);
  const zonas = opt("zonas") ? ZONAS.filter((z) => opt("zonas").split(",").includes(z.zona)) : ZONAS;
  const vistas = opt("vistas") ? opt("vistas").split(",").map(Number) : VISTAS;
  const repeticiones = parseInt(opt("repeticiones", String(REPETICIONES)), 10);
  const corridas = parseInt(opt("corridas", String(CORRIDAS)), 10);
  if (!Number.isInteger(puerto) || puerto <= 0 || !zonas.length || vistas.some((v) => !Number.isInteger(v) || v <= 0)) { console.error(USO); return 2; }
  if (!Number.isInteger(repeticiones) || repeticiones < 1) { console.error(USO); return 2; }
  if (!Number.isInteger(corridas) || corridas < 1) { console.error(USO); return 2; }

  const w = webDe(paleta);
  const env = entornoDeReferencia(paleta);
  const desplegada = `https://${w.domain}`;
  const informe = { web: w.clientId, paleta, commitSha: w.commitSha, dominio: w.domain, referencia: tenantDe(paleta), fecha: new Date().toISOString(), corridas, zonas: [], tokens: [], faltantes: [] };

  const base = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-01-"));
  const out = path.resolve(opt("out", path.join(base, "capturas")));
  fs.mkdirSync(out, { recursive: true });
  try {
    await conArbol(w.commitSha, base, env, async (dir) => {
      const dist = construir(dir, env, path.join(out, `build-${paleta}.log`));
      await conEstatico(dist, puerto, async (local) => {
        // La referencia se construye UNA vez (el commit desplegado no cambia, D-119); lo que se repite es lo que puede variar:
        // la sesión del navegador, la carga de las páginas y la rasterización. Por eso cada corrida abre su PROPIO navegador.
        for (let corrida = 1; corrida <= corridas; corrida++) {
          const browser = await chromium.launch({ args: ARGS_CHROMIUM });
          const sufijo = corridas > 1 ? `-c${corrida}` : "";
          try {
            for (const vista of vistas) {
              // Una carga por lado y por vista: de ahí salen todas las zonas de esa ruta y los tokens.
              for (const ruta of [...new Set(zonas.map((z) => z.ruta))]) {
                const A = await abrir(browser, desplegada, ruta, vista);
                const B = await abrir(browser, local, ruta, vista);
                try {
                  if (ruta === "/") {
                    const [ta, tb] = [await tokensDe(A.p, TOKENS), await tokensDe(B.p, TOKENS)];
                    const distintos = TOKENS.filter((t) => ta[t] !== tb[t]).map((t) => `${t}: «${ta[t]}» vs «${tb[t]}»`);
                    informe.tokens.push({ corrida, vista, iguales: distintos.length === 0, ...(distintos.length ? { distintos } : {}) });
                  }
                  for (const z of zonas.filter((z) => z.ruta === ruta)) {
                    const ea = await A.p.$(z.selector), eb = await B.p.$(z.selector);
                    if (!ea || !eb) { informe.faltantes.push({ corrida, zona: z.zona, vista, donde: !ea && !eb ? "las dos" : !ea ? "la desplegada" : "la referencia", selector: z.selector }); continue; }
                    const fa = path.join(out, `desplegada-${paleta}-${vista}-${z.zona}${sufijo}.png`);
                    const fb = path.join(out, `plantilla-${paleta}-${vista}-${z.zona}${sufijo}.png`);
                    // Candidato B de D-116, y no el A: la zona se trae a la vista y se espera a que la página quede quieta ANTES
                    // del calentamiento. Medido (ARREGLOS-02-B): `#services` a 1280 arranca en y=800, bajo el pliegue, así que el
                    // scroll lo provoca la propia captura; con sólo la captura de calentamiento, la re-rasterización de la
                    // pastilla caía entre la 2 y la 3 (13 px en x=1150–1151) y la zona salía «NO ESTABLE» en 3 de 3 corridas.
                    for (const [el, pag] of [[ea, A.p], [eb, B.p]]) { await el.scrollIntoViewIfNeeded().catch(() => {}); await quieto(pag); }
                    // La misma zona, `repeticiones` veces por lado, con una captura de calentamiento descartada (D-115/D-116):
                    // si un lado no se repite a sí mismo DESPUÉS del calentamiento, lo medido no se puede afirmar.
                    const [ra, rb] = [await capturasEstables(ea, repeticiones), await capturasEstables(eb, repeticiones)];
                    const estable = ra.estable && rb.estable;
                    fs.writeFileSync(fa, ra.capturas[0]);
                    fs.writeFileSync(fb, rb.capturas[0]);
                    const d = await diffPng(browser, fa, fb);
                    informe.zonas.push({ corrida, zona: z.zona, vista, pixels: d.pixels, size: d.size, total: d.total, repeticiones, estable, ...(d.size ? { a: d.a, b: d.b } : {}) });
                    // D-122: una diferencia MEDIDA con los dos lados estables no se explica mirando los PNG. Se vuelca el
                    // diagnóstico de los dos lados junto a las capturas; nada de esto entra en la comparación.
                    if (d.pixels > 0 && !d.size && estable) {
                      const nombre = `diagnostico-${paleta}-${vista}-${z.zona}${sufijo}.json`;
                      const dg = {
                        zona: z.zona, vista, corrida, selector: z.selector, pixels: d.pixels, total: d.total,
                        sha: { desplegada: sha256(ra.capturas[0]), referencia: sha256(rb.capturas[0]) },
                        desplegada: await diagnosticoDe(A, z.selector),
                        referencia: await diagnosticoDe(B, z.selector),
                      };
                      fs.writeFileSync(path.join(out, nombre), JSON.stringify(dg, null, 1));
                      console.error(`DIAGNÓSTICO c${corrida} ${z.zona} ${vista}: ${d.pixels} px con la zona estable → ${nombre}`);
                    }
                  }
                } finally { await A.ctx.close(); await B.ctx.close(); }
              }
            }
          } finally { await browser.close(); }
        }
      });
    });
  } finally {
    if (!args.includes("--out")) borrar(base);
  }

  // Lo medido se imprime SIEMPRE, aunque falte una zona: una zona que no existe no puede tapar el resultado de las otras once.
  for (const z of informe.zonas) {
    const medida = z.size ? `TAMAÑO DISTINTO ${JSON.stringify(z.a)} vs ${JSON.stringify(z.b)}` : z.pixels === 0 ? "0 px" : `${z.pixels} px de ${z.total} (${((100 * z.pixels) / z.total).toFixed(2)} %)`;
    console.log(`${informe.corridas > 1 ? `c${z.corrida} ` : ""}${z.zona.padEnd(18)} ${String(z.vista).padStart(4)}: ${medida}${z.estable ? ` · ${z.repeticiones} capturas iguales` : ` · NO ESTABLE (${z.repeticiones} capturas distintas: la medición no se puede afirmar)`}`);
  }
  for (const t of informe.tokens) console.log(`${informe.corridas > 1 ? `c${t.corrida} ` : ""}:root ${String(t.vista).padStart(4)}: ${t.iguales ? "tokens iguales" : `DISTINTOS → ${t.distintos.join(" · ")}`}`);
  for (const f of informe.faltantes) console.error(`FALTA${f.corrida ? ` c${f.corrida}` : ""} ${f.zona} ${f.vista}: «${f.selector}» no existe en ${f.donde}`);
  const malas = informe.zonas.filter((z) => z.pixels !== 0 || z.size);
  const inestables = informe.zonas.filter((z) => !z.estable);
  console.log(`${informe.web} vs ${informe.referencia} @ ${informe.commitSha.slice(0, 7)} · zonas con diferencia: ${malas.length} de ${informe.zonas.length}${inestables.length ? ` · sin estabilidad: ${inestables.length}` : ""}${informe.faltantes.length ? ` · sin medir: ${informe.faltantes.length}` : ""}`);
  if (args.includes("--json")) console.log(JSON.stringify(informe));
  return codigoDeSalida(informe);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`e2e ROTO (${e.message}): exit 2`); process.exit(2); });
}
