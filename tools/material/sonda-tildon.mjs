// sonda-tildon.mjs — GALERIA-03 A3 (D4): ¿qué bloquea al volver a subir al hero? CPU ×4, 375; envuelve play()/pause()/load()/src y registra long tasks y frames > 33 ms alrededor. Uso: node tools/material/sonda-tildon.mjs (servidor en :3000)
import { chromium } from "playwright";
const [fx = "peluqueria-paleta-c", url = "http://localhost:3000/"] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.addInitScript(() => {
  window.__ev = []; const t0 = performance.now();
  for (const m of ["play", "pause", "load"]) { const o = HTMLMediaElement.prototype[m]; HTMLMediaElement.prototype[m] = function (...a) { window.__ev.push({ t: performance.now(), e: m, paused: this.paused, rs: this.readyState, src: (this.currentSrc || "").split("/").pop() }); return o.apply(this, a); }; }
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src"); Object.defineProperty(HTMLMediaElement.prototype, "src", { set(v) { window.__ev.push({ t: performance.now(), e: "src=", v: String(v).slice(-30) }); d.set.call(this, v); }, get() { return d.get.call(this); } });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ev.push({ t: e.startTime, e: "longtask", ms: Math.round(e.duration) }); }).observe({ type: "longtask", buffered: true }); } catch {}
  window.__frames = []; let last = performance.now(); const f = (t) => { if (t - last > 33) window.__frames.push({ t: Math.round(t), gap: Math.round(t - last) }); last = t; requestAnimationFrame(f); }; requestAnimationFrame(f);
});
await p.goto(url, { waitUntil: "networkidle" }); await p.waitForSelector("#hero video"); await p.waitForFunction(`document.querySelector("#hero video").readyState >= 3`); await p.waitForTimeout(3500);
const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await p.evaluate(() => { window.__ev.push({ t: performance.now(), e: "MARK bajar" }); });
await p.evaluate(async () => { for (let y = 0; y <= 2400; y += 120) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } }); await p.waitForTimeout(800);
await p.evaluate(() => { window.__ev.push({ t: performance.now(), e: "MARK subir" }); });
await p.evaluate(async () => { for (let y = 2400; y >= 0; y -= 120) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } }); await p.waitForTimeout(1500);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
const ev = await p.evaluate(() => ({ ev: window.__ev, frames: window.__frames, v: (() => { const v = document.querySelector("#hero video"); return { paused: v.paused, rs: v.readyState, preload: v.preload, t: v.currentTime }; })() }));
const marks = ev.ev.filter((e) => e.e.startsWith("MARK")); const tSubir = marks[1]?.t ?? 0;
console.log("eventos (t ms · desde 'subir'):"); for (const e of ev.ev.filter((e) => e.e !== "longtask")) console.log(`  ${Math.round(e.t)}  ${e.e} ${e.paused !== undefined ? "paused=" + e.paused + " rs=" + e.rs : ""} ${e.v || ""}`);
const lt = ev.ev.filter((e) => e.e === "longtask"); console.log(`long tasks: ${lt.length} · ${lt.map((e) => `${Math.round(e.t - tSubir)}ms:${e.ms}ms`).join(" ")}`);
const fr = ev.frames.filter((f) => f.t > tSubir - 100); console.log(`frames > 33 ms desde 'subir': ${fr.length} · ${fr.map((f) => `${f.t - Math.round(tSubir)}:${f.gap}`).slice(0, 12).join(" ")}`);
console.log("vídeo al final", JSON.stringify(ev.v)); await b.close();
