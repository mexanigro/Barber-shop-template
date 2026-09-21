#!/usr/bin/env node
/**
 * recrear.mjs — prueba raíz de V5 (VERDAD-05, base 2016255 de VERDAD-01): «la web se borra en una hora y se recrea en minutos, en el
 * mismo lugar». Para una paleta (a | c):
 *   (a) valida el fixture con los validadores de H (validateConfig + validateVariantContracts + validateReplanteoHuecos): cada error es
 *       una brecha «validador H rechaza» con su hueco por valor; cada campo del fixture (hojas hasta profundidad 3, infraestructura
 *       excluida) sin fila en verdad/contratos.json es una brecha «sin contrato»;
 *   (b) escribe el tenant test-b4-peluqueria-<paleta> (config/{id} + hub_clients + clients) con `H scripts/b4-tenant.ts create --id <id>
 *       --fixture <json>` (D-16); `--sin-firestore` lo salta y lo declara;
 *   (c) levanta T con server.ts en el puerto pedido (`--puerto`, PORT del hijo; 3000 por defecto), primero con VITE_TENANT_FIXTURE y
 *       después SÓLO con VITE_CLIENT_ID (Firebase configurado, sin fixture: como producción), y captura página entera de las páginas y
 *       vistas pedidas con animaciones apagadas y vídeo oculto;
 *   (d) compara píxel a píxel cada par fixture/clientId: tamaño distinto o píxeles ≠ 0 es brecha «diff ≠ 0»; toda petición a
 *       /dev-fixtures/media/ es brecha «material que producción no sirve» y toda petición fallida con VITE_CLIENT_ID es brecha
 *       «petición fallida con VITE_CLIENT_ID», cada una con su hueco.
 * Exit 2 con brechas, 0 sin brechas; no falla en silencio, no «asume». Nunca mata procesos ajenos: si el puerto ya responde es brecha
 * «puerto ocupado» (exit 2) y no se levanta nada; los servidores hijos se matan por su PID al terminar (nunca por puerto).
 * Escribe <out>/recrear-<paleta>.json (firestore, bootstrap, brechas, diffs) y las capturas fixture-<p>-<vista>-<pagina>.png y
 * recrear-<p>-<vista>-<pagina>.png. <out> por defecto: bloque-04/verdad/capturas/<sha del árbol de HEAD>/.
 *
 *   node tools/verdad/recrear.mjs --paleta a|c [--out <dir>] [--sin-firestore] [--solo-diff] [--paginas home,servicios,galeria]
 *                                 [--vistas 375,1280] [--puerto <n>]
 */
import { chromium } from "playwright";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOTS, etiqueta } from "../_git.mjs";
import { leerContratos } from "./hueco.mjs";

export const T = ROOTS.find((r) => etiqueta(r) === "T");
export const H = ROOTS.find((r) => etiqueta(r) === "H");
const PAGINAS = { home: "/", servicios: "/servicios", galeria: "/galeria" };
const VISTAS = [375, 1280];
const CAPTURAS = "C:/Users/liama/Desktop/Nichos/bloque-04/verdad/capturas";
const win = process.platform === "win32";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arbol = () => execFileSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: T, encoding: "utf8", windowsHide: true }).trim();

/** Hojas del fixture (rutas con puntos) hasta profundidad 3, para buscarles fila en contratos.json. */
export function hojas(obj, prefijo = "", prof = 0, out = []) {
  if (prof > 2 || obj === null || typeof obj !== "object" || Array.isArray(obj) || !Object.keys(obj).length) { out.push(prefijo); return out; }
  for (const [k, v] of Object.entries(obj)) hojas(v, prefijo ? `${prefijo}.${k}` : k, prof + 1, out);
  return out;
}
/** Infraestructura del fixture: no son huecos de contenido (business, status, translations, títulos de sección, listas enteras…). */
const INFRA = new Set(["business", "status", "translations", "palette", "brand.name", "brand.tagline", "hero.variant", "sections.services.variant", "sections.services.title", "sections.services.subtitle", "sections.gallery.title", "sections.gallery.subtitle", "sections.team", "sections.testimonials", "sections.faq", "sections.instagram", "sections.contact", "gallery", "staff", "testimonials", "services", "excepciones", "branding.paletteMeta"]);
/** Todas las rutas de un hueco: `ruta` + `rutas` (sin los `[]`). */
export const rutasDe = (h) => [h.ruta, ...(h.rutas ?? [])].map((r) => r.replace(/\[\]/g, ""));
/** Brechas (a): campos del fixture sin fila en contratos.json (cubre por `ruta`, por `rutas` y por `id`). */
export function sinContrato(fx, contratos) {
  const rutas = contratos.huecos.flatMap((h) => [...rutasDe(h), h.id]);
  const cubre = (hoja) => rutas.some((r) => hoja === r || hoja.startsWith(r + ".") || r.startsWith(hoja + "."));
  return hojas(fx).filter((h) => !INFRA.has(h) && ![...INFRA].some((i) => h.startsWith(i + ".")) && !cubre(h)).map((campo) => ({ tipo: "sin contrato", campo, hueco: null }));
}
/** Hueco de contratos.json cuyo valor en el fixture contiene `valor` (una ruta de material, un campo); null si ninguno. */
export function huecoDe(fx, contratos, valor) {
  const get = (o, ruta) => ruta.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  for (const h of contratos.huecos) for (const r of rutasDe(h)) { const v = JSON.stringify(get(fx, r) ?? ""); if (v.includes(valor)) return h.id; }
  return null;
}

/** (a) los tres validadores de H, en proceso aparte (strip-types sobre src/lib/config-validator.ts). */
function validarEnH(fx) {
  const url = pathToFileURL(path.join(H, "src/lib/config-validator.ts")).href;
  const code = `import { validateConfig, validateVariantContracts, validateReplanteoHuecos } from ${JSON.stringify(url)}; const cfg = JSON.parse(process.argv[1]); console.log(JSON.stringify([...validateConfig(cfg), ...validateVariantContracts(cfg), ...validateReplanteoHuecos(cfg)]));`;
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code, JSON.stringify(fx)], { cwd: H, encoding: "utf8", timeout: 60000, windowsHide: true });
  if (r.status !== 0) throw new Error(`validadores de H: ${(r.stderr || "").slice(0, 400)}`);
  return JSON.parse(r.stdout.trim().split("\n").pop());
}

/** ¿Hay algo que acepte una conexión TCP en 127.0.0.1:<puerto>? (no se mata a nadie: sólo se mira). */
const escucha = (puerto) => new Promise((ok) => {
  const s = net.connect({ port: puerto, host: "127.0.0.1" });
  const fin = (v) => { s.destroy(); ok(v); };
  s.once("connect", () => fin(true)); s.once("error", () => fin(false)); s.setTimeout(2000, () => fin(false));
});
/** Mata al hijo por su PID (árbol entero en Windows) y espera a que el puerto deje de responder. */
async function matar(srv, puerto) {
  if (srv.exitCode === null) { if (win) spawnSync("taskkill", ["/PID", String(srv.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }); else srv.kill("SIGKILL"); }
  for (let i = 0; i < 40 && (await escucha(puerto)); i++) await sleep(250);
}
/** Levanta T (server.ts con PORT=<puerto>) con `env`, corre `fn(base)` y lo mata por PID. Puerto ya ocupado → lanza «puerto ocupado». */
async function conServidor(env, puerto, log, fn) {
  if (await escucha(puerto)) throw new Error(`puerto ocupado: :${puerto} ya responde antes de levantar el servidor (no se mata a nadie)`);
  const fd = fs.openSync(log, "w");
  const srv = spawn(process.execPath, ["--import", "tsx", "server.ts"], { cwd: T, env: { ...process.env, PORT: String(puerto), VITE_ACTIVE_NICHE: "peluqueria", VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_HERO_CLIP: "", ...env }, stdio: ["ignore", fd, fd], windowsHide: true });
  const base = `http://localhost:${puerto}`;
  let up = false;
  for (let i = 0; i < 90 && !up && srv.exitCode === null; i++) { try { up = (await fetch(base + "/")).ok; } catch {} if (!up) await sleep(1000); }
  try { if (!up) throw new Error(`el servidor no respondió en :${puerto} (ver ${path.basename(log)})`); return await fn(base); }
  finally { await matar(srv, puerto); fs.closeSync(fd); }
}

/** Captura las páginas y vistas pedidas; devuelve { archivos, fallidas, devFixtures, bootstrap }. */
async function capturar(browser, base, prefijo, out, paginas, vistas) {
  const archivos = [], fallidas = new Set(), devFixtures = new Set(); let bootstrap = null;
  for (const pagina of paginas) for (const vk of vistas) {
    const ctx = await browser.newContext(vk < 768 ? { viewport: { width: vk, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" } : { viewport: { width: vk, height: 800 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    p.on("response", (r) => { const u = r.url(); if (r.status() >= 400 && /\.(jpe?g|png|webp|avif|mp4|webm|svg)(\?|$)/i.test(u)) fallidas.add(u.replace(base, "")); });
    p.on("request", (r) => { const u = r.url().replace(base, ""); if (u.startsWith("/dev-fixtures/media/")) devFixtures.add(u); });
    p.on("console", (m) => { const t = m.text(); if (/\[Tenant\]/.test(t) && !bootstrap) bootstrap = t.slice(0, 160); });
    // `load` + esperas por condición: con vídeo en streaming la red nunca queda «idle» y el arranque frío de Vite pasa de 30 s
    await p.goto(base + PAGINAS[pagina], { waitUntil: "load", timeout: 120000 });
    await p.waitForSelector("main section, main", { timeout: 60000 }).catch(() => {});
    await p.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await p.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} video{opacity:0!important}" });
    await p.waitForFunction(`!document.querySelector('[role="dialog"][aria-modal="true"].fixed')`, null, { timeout: 15000 }).catch(() => {});
    const Hh = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < Hh; y += 400) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelectorAll("video").forEach((v) => { try { v.pause(); v.currentTime = 0; } catch {} }));
    const file = path.join(out, `${prefijo}-${vk}-${pagina}.png`);
    await p.screenshot({ path: file, fullPage: true });
    archivos.push({ pagina, vista: vk, file });
    await ctx.close();
  }
  return { archivos, fallidas: [...fallidas], devFixtures: [...devFixtures], bootstrap };
}

/** Diff de píxeles entre dos PNG, decodificados en Chromium (sin dependencias): { size, pixels, total } (size=true → pixels -1). */
export async function diffPng(browser, a, b) {
  const p = await browser.newPage();
  try {
    const [da, db] = [a, b].map((f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64"));
    return await p.evaluate(async ([da, db]) => {
      const load = (s) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = s; });
      const [ia, ib] = await Promise.all([load(da), load(db)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: true, a: [ia.width, ia.height], b: [ib.width, ib.height], pixels: -1, total: 0 };
      const cv = (i) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d"); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
      const A = cv(ia), B = cv(ib); let n = 0; for (let i = 0; i < A.length; i += 4) if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) n++;
      return { size: false, pixels: n, total: A.length / 4 };
    }, [da, db]);
  } finally { await p.close(); }
}

const USO = "uso: recrear.mjs --paleta a|c [--out <dir>] [--sin-firestore] [--solo-diff] [--paginas home,servicios,galeria] [--vistas 375,1280] [--puerto <n>]";
async function main(args) {
  const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
  const pal = opt("paleta"); if (!["a", "c"].includes(pal)) { console.error(USO); return 2; }
  const puerto = parseInt(opt("puerto", "3000"), 10);
  const paginas = opt("paginas") ? opt("paginas").split(",") : Object.keys(PAGINAS);
  const vistas = opt("vistas") ? opt("vistas").split(",").map(Number) : VISTAS;
  if (!Number.isInteger(puerto) || puerto <= 0 || paginas.some((p) => !(p in PAGINAS)) || vistas.some((v) => !Number.isInteger(v) || v <= 0)) { console.error(USO); return 2; }
  const id = `test-b4-peluqueria-${pal}`;
  const fx = JSON.parse(fs.readFileSync(path.join(T, "dev-fixtures", `peluqueria-paleta-${pal}.json`), "utf8"));
  const contratos = leerContratos();
  const out = path.resolve(opt("out", path.join(CAPTURAS, arbol()))); fs.mkdirSync(out, { recursive: true });
  const brechas = [];
  const rep = { id, paleta: pal, fecha: new Date().toISOString(), out, puerto, paginas, vistas, brechas, diffs: [] };

  if (!args.includes("--solo-diff")) {
    // (a) validadores de H + campos sin contrato
    const issues = validarEnH(fx);
    for (const i of issues) if (i.severity === "error") brechas.push({ tipo: "validador H rechaza", campo: i.path, detalle: i.message, hueco: huecoDe(fx, contratos, i.path.split(/[.[]/)[0]) });
    rep.avisosH = issues.filter((i) => i.severity !== "error").length;
    brechas.push(...sinContrato(fx, contratos));
    // (b) escritura en Firestore por H scripts/b4-tenant.ts (D-16: sólo test-b4-peluqueria-a y -c)
    if (args.includes("--sin-firestore")) rep.firestore = "saltado (--sin-firestore): declarado";
    else {
      const tmp = path.join(out, `fixture-${pal}.json`); fs.writeFileSync(tmp, JSON.stringify(fx));
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/b4-tenant.ts", "create", "--id", id, "--fixture", tmp], { cwd: H, encoding: "utf8", timeout: 120000, windowsHide: true });
      const lineas = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split(/\r?\n/);
      rep.firestore = lineas.find((l) => /^(recreado|creado)\b|Error/.test(l)) ?? lineas.pop();
      if (r.status !== 0) brechas.push({ tipo: "escritura en Firestore falló", campo: "config/{id}", detalle: rep.firestore, hueco: null });
    }
  }
  console.log(`(a) ${id} · validadores H: ${brechas.filter((b) => b.tipo.startsWith("validador")).length} error(es), ${rep.avisosH ?? "—"} aviso(s) · sin contrato: ${brechas.filter((b) => b.tipo === "sin contrato").length} · firestore: ${rep.firestore ?? "—"}`);
  // (c)(d) dos servidores en secuencia (nunca en paralelo), dos capturas. Un servidor o una captura que falla es brecha, no silencio.
  if (await escucha(puerto)) brechas.push({ tipo: "puerto ocupado", campo: `:${puerto}`, detalle: "ya responde antes de levantar el servidor; no se mata a nadie (elegí otro --puerto)", hueco: null });
  else {
    const browser = await chromium.launch();
    try {
      let conFixture, conId;
      const brechaServidor = (tipo, e) => brechas.push(/^puerto ocupado/.test(e.message) ? { tipo: "puerto ocupado", campo: `:${puerto}`, detalle: e.message, hueco: null } : { tipo, campo: "servidor", detalle: String(e.message).split("\n")[0], hueco: null });
      try { conFixture = await conServidor({ VITE_CLIENT_ID: id, VITE_FIREBASE_API_KEY: "", VITE_TENANT_FIXTURE: `peluqueria-paleta-${pal}` }, puerto, path.join(out, `servidor-fixture-${pal}.log`), (base) => capturar(browser, base, `fixture-${pal}`, out, paginas, vistas)); }
      catch (e) { brechaServidor("captura con fixture falló", e); }
      try { conId = await conServidor({ VITE_CLIENT_ID: id, VITE_TENANT_FIXTURE: "" }, puerto, path.join(out, `servidor-recrear-${pal}.log`), (base) => capturar(browser, base, `recrear-${pal}`, out, paginas, vistas)); }
      catch (e) { brechaServidor("captura con VITE_CLIENT_ID falló", e); }
      if (conFixture && conId) {
        rep.bootstrap = { fixture: conFixture.bootstrap ?? "sin mensaje [Tenant] en consola", clientId: conId.bootstrap ?? "sin mensaje [Tenant] en consola (config/{id} de Firestore o preset)" };
        for (const u of new Set([...conFixture.devFixtures, ...conId.devFixtures])) brechas.push({ tipo: "material que producción no sirve", campo: u, hueco: huecoDe(fx, contratos, u) });
        for (const u of conId.fallidas) if (!u.startsWith("/dev-fixtures/")) brechas.push({ tipo: "petición fallida con VITE_CLIENT_ID", campo: u, hueco: huecoDe(fx, contratos, u) });
        // (d) diff píxel a píxel por par
        for (const a of conFixture.archivos) {
          const b = conId.archivos.find((x) => x.pagina === a.pagina && x.vista === a.vista);
          const d = await diffPng(browser, a.file, b.file);
          rep.diffs.push({ pagina: a.pagina, vista: a.vista, ...d });
          if (d.size || d.pixels !== 0) brechas.push({ tipo: "diff ≠ 0", campo: `${a.pagina} ${a.vista}`, detalle: d.size ? `tamaño ${d.a} vs ${d.b}` : `${d.pixels} px de ${d.total}`, hueco: null });
        }
      }
    } finally { await browser.close(); }
  }
  fs.writeFileSync(path.join(out, `recrear-${pal}.json`), JSON.stringify(rep, null, 1));
  console.log(`recrear · ${id} · ${out}`);
  console.log(`firestore: ${rep.firestore ?? "—"} · bootstrap fixture: ${rep.bootstrap?.fixture ?? "—"} · clientId: ${rep.bootstrap?.clientId ?? "—"}`);
  for (const d of rep.diffs) console.log(`diff ${d.pagina.padEnd(9)} ${String(d.vista).padStart(4)}: ${d.size ? "TAMAÑO DISTINTO" : d.pixels === 0 ? "0 px" : `${d.pixels} px de ${d.total} (${((100 * d.pixels) / d.total).toFixed(2)} %)`}`);
  console.log(`brechas: ${brechas.length}`);
  const porTipo = {}; for (const b of brechas) (porTipo[b.tipo] ??= []).push(b);
  for (const [tipo, bs] of Object.entries(porTipo)) { console.log(`  ${tipo} (${bs.length}):`); for (const b of bs.slice(0, 40)) console.log(`    ${b.campo}${b.detalle ? " · " + b.detalle : ""} → hueco ${b.hueco ?? "null"}`); if (bs.length > 40) console.log(`    … ${bs.length - 40} más en recrear-${pal}.json`); }
  return brechas.length ? 2 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`recrear ROTO (${e.message}): exit 2`); process.exit(2); });
}
