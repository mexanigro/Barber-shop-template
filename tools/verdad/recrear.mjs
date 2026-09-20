#!/usr/bin/env node
/**
 * recrear.mjs — prueba raíz de V5 (VERDAD-01, R-V3.5): «la web se borra en una hora y se recrea en minutos, en el mismo lugar».
 * Para una paleta (a | c):
 *   (a) IMPORTA el fixture al hub: pasa los validadores de H (validateConfig + validateVariantContracts) → cada error es una
 *       brecha con su hueco; cada campo del fixture sin fila en verdad/contratos.json es una brecha «sin contrato»; escribe
 *       config/{id} + hub_clients + clients del tenant de prueba test-b4-peluqueria-<paleta> con H scripts/b4-tenant.ts
 *       (`--sin-firestore` lo salta y lo declara);
 *   (b) levanta el template SÓLO con VITE_CLIENT_ID=<id> (Firebase configurado, sin fixture: como producción) y, aparte,
 *       con el fixture (VITE_TENANT_FIXTURE, sin Firebase);
 *   (c) captura página entera de /, /servicios y /galeria en 375 y 1280 en los dos modos (vídeo oculto, sin animaciones);
 *   (d) diff de píxeles fixture vs clientId: debe ser 0. Todo material que producción no sirve (/dev-fixtures/media) y toda
 *       petición fallida se listan como brecha con su hueco.
 * Exit 2 si hay una brecha o un diff ≠ 0; no falla en silencio, no «asume». Escribe <out>/recrear-<paleta>.json y las capturas
 * recrear-<paleta>-<vista>-<pagina>.png (las que exige impacto.mjs) y fixture-<paleta>-<vista>-<pagina>.png.
 *
 *   node tools/verdad/recrear.mjs --paleta a|c [--out <dir>] [--sin-firestore] [--solo-diff]
 */
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ROOT, HERMANO, etiqueta } from "../_git.mjs";
import { arbol, leerEntrega } from "./veredicto.mjs";
import { leerContratos } from "./hueco.mjs";

export const T = etiqueta(ROOT) === "T" ? ROOT : HERMANO;
export const H = etiqueta(ROOT) === "H" ? ROOT : HERMANO;
const PAGINAS = { home: "/", servicios: "/servicios", galeria: "/galeria" };
const VISTAS = [375, 1280];
const win = process.platform === "win32";

/** Hojas del fixture (rutas con puntos) hasta profundidad 3, para buscarles fila en contratos.json. */
export function hojas(obj, prefijo = "", prof = 0, out = []) {
  if (prof > 2 || obj === null || typeof obj !== "object" || Array.isArray(obj) || !Object.keys(obj).length) { out.push(prefijo); return out; }
  for (const [k, v] of Object.entries(obj)) hojas(v, prefijo ? `${prefijo}.${k}` : k, prof + 1, out);
  return out;
}
const INFRA = new Set(["business", "status", "translations", "palette", "brand.name", "brand.tagline", "hero.variant", "sections.services.variant", "sections.services.title", "sections.services.subtitle", "sections.gallery.title", "sections.gallery.subtitle", "sections.team", "sections.testimonials", "sections.faq", "sections.instagram", "sections.contact", "gallery", "staff", "testimonials", "services", "excepciones", "branding.paletteMeta"]);
/** Brechas (a): campos del fixture sin fila en contratos.json. */
export function sinContrato(fx, contratos) {
  // cubre por `ruta`, por `rutas` (un hueco, varios campos: hero.titular = titlePrefix + titleHighlight + titleSuffix) y por `id`
  const rutas = contratos.huecos.flatMap((h) => [...rutasDe(h), h.id]);
  const cubre = (hoja) => rutas.some((r) => hoja === r || hoja.startsWith(r + ".") || r.startsWith(hoja + "."));
  return hojas(fx).filter((h) => !INFRA.has(h) && ![...INFRA].some((i) => h.startsWith(i + ".")) && !cubre(h)).map((campo) => ({ tipo: "sin contrato", campo, hueco: null }));
}
/** Todas las rutas de un hueco: `ruta` + `rutas` (sin los `[]`). */
export const rutasDe = (h) => [h.ruta, ...(h.rutas ?? [])].map((r) => r.replace(/\[\]/g, ""));
/** Hueco de contratos.json cuyo valor en el fixture coincide con una ruta de material. */
export function huecoDe(fx, contratos, valor) {
  const get = (o, ruta) => ruta.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  for (const h of contratos.huecos) for (const r of rutasDe(h)) { const v = JSON.stringify(get(fx, r) ?? ""); if (v.includes(valor)) return h.id; }
  return null;
}

function validarEnH(fx) {
  const url = pathToFileURL(path.join(H, "src/lib/config-validator.ts")).href;
  const code = `import { validateConfig, validateVariantContracts } from ${JSON.stringify(url)}; const cfg = JSON.parse(process.argv[1]); console.log(JSON.stringify([...validateConfig(cfg), ...validateVariantContracts(cfg)]));`;
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code, JSON.stringify(fx)], { cwd: H, encoding: "utf8", timeout: 60000 });
  if (r.status !== 0) throw new Error(`validadores de H: ${(r.stderr || "").slice(0, 400)}`);
  return JSON.parse(r.stdout.trim().split("\n").pop());
}

const kill3000 = () => { if (!win) return; const ns = spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout ?? ""; for (const l of ns.split("\n")) { const m = l.match(/:3000\s+\S+\s+LISTENING\s+(\d+)/); if (m) spawnSync("taskkill", ["/PID", m[1], "/F"]); } };
async function conServidor(env, fn) {
  kill3000();
  const srv = spawn(win ? "npx.cmd" : "npx", ["tsx", "server.ts"], { cwd: T, env: { ...process.env, VITE_ACTIVE_NICHE: "peluqueria", VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_HERO_CLIP: "", ...env }, stdio: "ignore", shell: win });
  let up = false; for (let i = 0; i < 60 && !up; i++) { try { up = (await fetch("http://localhost:3000/")).ok; } catch {} if (!up) await new Promise((r) => setTimeout(r, 1000)); }
  try { if (!up) throw new Error("el servidor no respondió en :3000"); return await fn("http://localhost:3000"); } finally { srv.kill(); kill3000(); }
}

/** Captura las tres páginas en las dos vistas; devuelve { archivos, fallidas, devFixtures, bootstrap }. */
async function capturar(browser, base, prefijo, out) {
  const archivos = [], fallidas = new Set(), devFixtures = new Set(); let bootstrap = null;
  for (const [pagina, ruta] of Object.entries(PAGINAS)) for (const vk of VISTAS) {
    const ctx = await browser.newContext(vk < 768 ? { viewport: { width: vk, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" } : { viewport: { width: vk, height: 800 }, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    p.on("response", (r) => { const u = r.url(); if (r.status() >= 400 && /\.(jpe?g|png|webp|avif|mp4|webm|svg)(\?|$)/i.test(u)) fallidas.add(u.replace(base, "")); });
    p.on("request", (r) => { const u = r.url().replace(base, ""); if (u.startsWith("/dev-fixtures/media/")) devFixtures.add(u); });
    p.on("console", (m) => { const t = m.text(); if (/\[Tenant\]/.test(t) && !bootstrap) bootstrap = t.slice(0, 160); });
    // `load` + esperas por condición: con vídeo en streaming la red nunca queda «idle» y el arranque frío de Vite pasa de 30 s
    await p.goto(base + ruta, { waitUntil: "load", timeout: 120000 });
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

/** Diff de píxeles entre dos PNG, decodificados en Chromium (sin dependencias). */
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

async function main(args) {
  const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
  const pal = opt("paleta"); if (!["a", "c"].includes(pal)) { console.error("uso: recrear.mjs --paleta a|c [--out <dir>] [--sin-firestore] [--solo-diff]"); return 2; }
  const id = `test-b4-peluqueria-${pal}`;
  const fx = JSON.parse(fs.readFileSync(path.join(T, "dev-fixtures", `peluqueria-paleta-${pal}.json`), "utf8"));
  const contratos = leerContratos();
  const le = leerEntrega(); const capturasRoot = le.entrega?.capturas ?? "C:/Users/liama/Desktop/Nichos/bloque-04/verdad/capturas";
  const out = path.resolve(opt("out", path.join(capturasRoot, arbol()))); fs.mkdirSync(out, { recursive: true });
  const brechas = [];
  const rep = { id, paleta: pal, fecha: new Date().toISOString(), out, brechas, diffs: [] };

  if (!args.includes("--solo-diff")) {
    // (a) validadores de H
    const issues = validarEnH(fx);
    for (const i of issues) if (i.severity === "error") brechas.push({ tipo: "validador H rechaza", campo: i.path, detalle: i.message, hueco: huecoDe(fx, contratos, i.path.split(/[.[]/)[0]) });
    rep.avisosH = issues.filter((i) => i.severity !== "error").length;
    brechas.push(...sinContrato(fx, contratos));
    // (a) escritura en Firestore por H scripts/b4-tenant.ts
    if (args.includes("--sin-firestore")) rep.firestore = "saltado (--sin-firestore): declarado";
    else {
      const tmp = path.join(out, `fixture-${pal}.json`); fs.writeFileSync(tmp, JSON.stringify(fx));
      const r = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/b4-tenant.ts", "create", "--id", id, "--fixture", tmp], { cwd: H, encoding: "utf8", timeout: 120000 });
      const lineas = (r.stdout + r.stderr).trim().split("\n");
      rep.firestore = lineas.find((l) => /^(recreado|creado)\b|Error/.test(l)) ?? lineas.pop();
      if (r.status !== 0) brechas.push({ tipo: "escritura en Firestore falló", campo: "config/{id}", detalle: rep.firestore, hueco: null });
    }
  }
  console.log(`(a) ${id} · validadores H: ${brechas.filter((b) => b.tipo.startsWith("validador")).length} error(es), ${rep.avisosH ?? "—"} aviso(s) · sin contrato: ${brechas.filter((b) => b.tipo === "sin contrato").length} · firestore: ${rep.firestore ?? "—"}`);
  // (b)(c) dos servidores, dos capturas. Un servidor o una captura que falla es brecha, no silencio.
  const browser = await chromium.launch();
  try {
    let conFixture, conId;
    try { conFixture = await conServidor({ VITE_CLIENT_ID: id, VITE_FIREBASE_API_KEY: "", VITE_TENANT_FIXTURE: `peluqueria-paleta-${pal}` }, (base) => capturar(browser, base, `fixture-${pal}`, out)); }
    catch (e) { brechas.push({ tipo: "captura con fixture falló", campo: "servidor", detalle: String(e.message).split("\n")[0], hueco: null }); }
    try { conId = await conServidor({ VITE_CLIENT_ID: id, VITE_TENANT_FIXTURE: "" }, (base) => capturar(browser, base, `recrear-${pal}`, out)); }
    catch (e) { brechas.push({ tipo: "captura con VITE_CLIENT_ID falló", campo: "servidor", detalle: String(e.message).split("\n")[0], hueco: null }); }
    if (conFixture && conId) {
    rep.bootstrap = { fixture: conFixture.bootstrap, clientId: conId.bootstrap };
    for (const u of new Set([...conFixture.devFixtures, ...conId.devFixtures])) brechas.push({ tipo: "material que producción no sirve", campo: u, hueco: huecoDe(fx, contratos, u) });
    for (const u of conId.fallidas) if (!u.startsWith("/dev-fixtures/")) brechas.push({ tipo: "petición fallida con VITE_CLIENT_ID", campo: u, hueco: huecoDe(fx, contratos, u) });
    // (d) diff
    for (const a of conFixture.archivos) {
      const b = conId.archivos.find((x) => x.pagina === a.pagina && x.vista === a.vista);
      const d = await diffPng(browser, a.file, b.file);
      rep.diffs.push({ pagina: a.pagina, vista: a.vista, ...d });
      if (d.size || d.pixels !== 0) brechas.push({ tipo: "diff ≠ 0", campo: `${a.pagina} ${a.vista}`, detalle: d.size ? `tamaño ${d.a} vs ${d.b}` : `${d.pixels} px de ${d.total}`, hueco: null });
    }
    }
  } finally { await browser.close(); }
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
