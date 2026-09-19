#!/usr/bin/env node
/**
 * captura.mjs — captura hero → primera sección de un fixture con el material instalado, para la hoja y el STOP.
 *
 * Uso: node tools/material/captura.mjs <fixture> [--clip <sufijo>] [--vistas 375,1280,1920] [--out <carpeta>] [--tag <prefijo>]
 *   Arranca el dev server de T (`tsx server.ts`, puerto 3000) con VITE_TENANT_FIXTURE=<fixture> (y VITE_HERO_CLIP=<sufijo> si se da),
 *   espera el puerto, abre cada vista (375 con UA móvil y DPR 2; el resto escritorio), hace scroll para disparar los revelados, vuelve
 *   arriba y captura desde el top hasta 520 px dentro de la primera sección. Escribe <out>/<tag>-<vista>-hero-servicios.png y
 *   <out>/<tag>-verificacion.json (qué archivo resolvió el <video>: currentSrc, tamaño, si reproduce; y qué pidió por red).
 *   Mata el servidor al terminar (y cualquier proceso previo en :3000). No juzga nada: sólo evidencia.
 */
import { chromium } from "playwright"; import { spawn, spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2); const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const fixture = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!fixture) { console.error("uso: node tools/material/captura.mjs <fixture> [--clip <sufijo>] [--vistas 375,1280,1920] [--out <carpeta>] [--tag <prefijo>]"); process.exit(2); }
const vistas = opt("vistas", "375,1280").split(",").map(Number); const out = path.resolve(opt("out", path.join(ROOT, "capturas-material"))); const tag = opt("tag", opt("clip", "default"));
fs.mkdirSync(out, { recursive: true });
const kill3000 = () => { if (process.platform !== "win32") return; const ns = spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout; for (const l of ns.split("\n")) { const m = l.match(/:3000\s+\S+\s+LISTENING\s+(\d+)/); if (m) spawnSync("taskkill", ["/PID", m[1], "/F"]); } };
kill3000();
const env = { ...process.env, VITE_ACTIVE_NICHE: "peluqueria", VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_FIREBASE_API_KEY: "", VITE_TENANT_FIXTURE: fixture, VITE_HERO_CLIP: opt("clip", "") };
const srv = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "server.ts"], { cwd: ROOT, env, stdio: "ignore", shell: process.platform === "win32" });
const up = async () => { for (let i = 0; i < 60; i++) { try { const r = await fetch("http://localhost:3000/"); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 1000)); } return false; };
if (!(await up())) { console.error("el servidor no respondió en :3000"); kill3000(); process.exit(1); }
const b = await chromium.launch(); const rep = {};
try {
  for (const vk of vistas) {
    const movil = vk < 768;
    const ctx = await b.newContext(movil ? { viewport: { width: vk, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: vk, height: 800 } });
    const p = await ctx.newPage(); const media = [];
    p.on("request", (r) => { const u = r.url(); if (/\.(mp4|webm|avif)(\?|$)/i.test(u)) media.push(u.replace("http://localhost:3000", "")); });
    await p.goto("http://localhost:3000/", { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 500) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(80); }
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1200);
    const video = await p.evaluate(() => { const v = document.querySelector("section video"); return v ? { currentSrc: v.currentSrc.replace(location.origin, ""), poster: (v.poster || "").replace(location.origin, ""), w: v.videoWidth, h: v.videoHeight, playing: !v.paused && !v.ended && v.readyState > 2, t: +v.currentTime.toFixed(2) } : null; });
    const first = await p.evaluate(() => { const s = document.querySelectorAll("main > section")[1]; const r = s.getBoundingClientRect(); return { id: s.id, top: Math.round(r.top + scrollY) }; });
    const file = `${out}/${tag}-${vk}-hero-servicios.png`;
    await p.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width: vk, height: first.top + 520 } });
    rep[vk] = { video, first, red: [...new Set(media)] };
    console.log(`${tag} ${vk} · video ${JSON.stringify(video)} · red ${JSON.stringify(rep[vk].red)} · ${path.basename(file)}`);
    await ctx.close();
  }
} finally { await b.close(); srv.kill(); kill3000(); }
fs.writeFileSync(`${out}/${tag}-verificacion.json`, JSON.stringify(rep, null, 1));
