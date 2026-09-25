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
 * Exit. 0 cuando la medición se completó (el informe lleva el veredicto, zona por zona); 2 cuando NO se pudo medir —no existe el
 * registro, el commit no está en el árbol, el build falló, el puerto estaba ocupado, la web desplegada no responde o una zona no
 * existe en alguno de los dos lados—. Un 0 con `pixels > 0` es una diferencia medida, no un error de la herramienta.
 *
 * Uso:
 *   node tools/verdad/e2e.mjs --web a|c [--puerto <n>] [--zonas navbar,hero,…] [--vistas 375,1280] [--json] [--out <dir>]
 */
import { spawn, spawnSync } from "node:child_process";
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

/** Deja la página quieta y comparable: sin animaciones, fuentes cargadas, todo el contenido perezoso pedido y el vídeo del hero
 *  congelado en el cuadro 0 (el mismo clip por los dos lados, así que el cuadro es el mismo byte). */
async function asentar(p) {
  await p.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await p.addStyleTag({ content: "*,*::before,*::after{animation:none!important;animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}" });
  await p.waitForFunction(`!document.querySelector('[role="dialog"][aria-modal="true"].fixed')`, null, { timeout: 15000 }).catch(() => {});
  const alto = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < alto; y += 400) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await p.evaluate(async () => {
    const vs = [...document.querySelectorAll("video")];
    for (const v of vs) { try { v.pause(); v.currentTime = 0; v.removeAttribute("autoplay"); } catch { /* sin vídeo */ } }
    await Promise.all(vs.map((v) => v.readyState >= 2 ? null : new Promise((ok) => { v.addEventListener("loadeddata", ok, { once: true }); setTimeout(ok, 4000); })));
    await document.fonts.ready;
  });
  await p.waitForTimeout(700);
}

/** Abre una ruta en una vista, la asienta y devuelve la página (el contexto se cierra fuera). */
async function abrir(browser, base, ruta, vista) {
  const ctx = await browser.newContext(vista < 768
    ? { viewport: { width: vista, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" }
    : { viewport: { width: vista, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(base + ruta, { waitUntil: "load", timeout: 120000 });
  await p.waitForSelector("main, #main-content", { timeout: 60000 }).catch(() => {});
  await asentar(p);
  return { ctx, p };
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

const USO = "uso: e2e.mjs --web a|c [--puerto <n>] [--zonas navbar,hero,services,gallery,pagina-servicios,pagina-galeria] [--vistas 375,1280] [--json] [--out <dir>]";

async function main(args) {
  const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
  const paleta = opt("web");
  if (!["a", "c"].includes(paleta)) { console.error(USO); return 2; }
  const puerto = parseInt(opt("puerto", "4321"), 10);
  const zonas = opt("zonas") ? ZONAS.filter((z) => opt("zonas").split(",").includes(z.zona)) : ZONAS;
  const vistas = opt("vistas") ? opt("vistas").split(",").map(Number) : VISTAS;
  if (!Number.isInteger(puerto) || puerto <= 0 || !zonas.length || vistas.some((v) => !Number.isInteger(v) || v <= 0)) { console.error(USO); return 2; }

  const w = webDe(paleta);
  const env = entornoDeReferencia(paleta);
  const desplegada = `https://${w.domain}`;
  const informe = { web: w.clientId, paleta, commitSha: w.commitSha, dominio: w.domain, referencia: tenantDe(paleta), fecha: new Date().toISOString(), zonas: [], tokens: [], faltantes: [] };

  const base = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-01-"));
  const out = path.resolve(opt("out", path.join(base, "capturas")));
  fs.mkdirSync(out, { recursive: true });
  try {
    await conArbol(w.commitSha, base, env, async (dir) => {
      const dist = construir(dir, env, path.join(out, `build-${paleta}.log`));
      await conEstatico(dist, puerto, async (local) => {
        const browser = await chromium.launch();
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
                  informe.tokens.push({ vista, iguales: distintos.length === 0, ...(distintos.length ? { distintos } : {}) });
                }
                for (const z of zonas.filter((z) => z.ruta === ruta)) {
                  const ea = await A.p.$(z.selector), eb = await B.p.$(z.selector);
                  if (!ea || !eb) { informe.faltantes.push({ zona: z.zona, vista, donde: !ea && !eb ? "las dos" : !ea ? "la desplegada" : "la referencia", selector: z.selector }); continue; }
                  const fa = path.join(out, `desplegada-${paleta}-${vista}-${z.zona}.png`);
                  const fb = path.join(out, `plantilla-${paleta}-${vista}-${z.zona}.png`);
                  await ea.screenshot({ path: fa });
                  await eb.screenshot({ path: fb });
                  const d = await diffPng(browser, fa, fb);
                  informe.zonas.push({ zona: z.zona, vista, pixels: d.pixels, size: d.size, total: d.total, ...(d.size ? { a: d.a, b: d.b } : {}) });
                }
              } finally { await A.ctx.close(); await B.ctx.close(); }
            }
          }
        } finally { await browser.close(); }
      });
    });
  } finally {
    if (!args.includes("--out")) borrar(base);
  }

  // Lo medido se imprime SIEMPRE, aunque falte una zona: una zona que no existe no puede tapar el resultado de las otras once.
  for (const z of informe.zonas) {
    console.log(`${z.zona.padEnd(18)} ${String(z.vista).padStart(4)}: ${z.size ? `TAMAÑO DISTINTO ${JSON.stringify(z.a)} vs ${JSON.stringify(z.b)}` : z.pixels === 0 ? "0 px" : `${z.pixels} px de ${z.total} (${((100 * z.pixels) / z.total).toFixed(2)} %)`}`);
  }
  for (const t of informe.tokens) console.log(`:root ${String(t.vista).padStart(4)}: ${t.iguales ? "tokens iguales" : `DISTINTOS → ${t.distintos.join(" · ")}`}`);
  for (const f of informe.faltantes) console.error(`FALTA ${f.zona} ${f.vista}: «${f.selector}» no existe en ${f.donde}`);
  const malas = informe.zonas.filter((z) => z.pixels !== 0 || z.size);
  console.log(`${informe.web} vs ${informe.referencia} @ ${informe.commitSha.slice(0, 7)} · zonas con diferencia: ${malas.length} de ${informe.zonas.length}${informe.faltantes.length ? ` · sin medir: ${informe.faltantes.length}` : ""}`);
  if (args.includes("--json")) console.log(JSON.stringify(informe));
  return informe.faltantes.length ? 2 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`e2e ROTO (${e.message}): exit 2`); process.exit(2); });
}
