/**
 * Regresión visual de los seis nichos existentes (BLOQUE-04).
 * Captura hero + services en móvil 375 px (he) por nicho y, si se pasa
 * --baseline <dir>, compara pixel a pixel contra esa captura de partida.
 *
 * Uso: node scripts/qa-regresion-seis.mjs --out <dir> [--baseline <dir>]
 * Salida: <dir>/<nicho>-{hero,services}.png + <dir>/report.txt
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const OUT = resolve(arg("out", "qa-regresion"));
const BASELINE = arg("baseline", null) ? resolve(arg("baseline")) : null;
const NICHES = (arg("niches", "barberia,estetica,tattoo,nails,cafeteria,remodelaciones")).split(",");
const PORT = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitForServer(timeoutMs = 90000) {
  const start = Date.now();
  return new Promise((res, rej) => {
    (function check() {
      const req = http.get(`http://localhost:${PORT}/`, (r) => { r.resume(); res(); });
      req.on("error", () => Date.now() - start > timeoutMs ? rej(new Error("server timeout")) : setTimeout(check, 700));
      req.setTimeout(2000, () => { req.destroy(); });
    })();
  });
}

async function capture(browser, niche) {
  const server = spawn("npx", ["cross-env", `VITE_ACTIVE_NICHE=${niche}`, "VITE_UI_LANGUAGE=he", "VITE_DEMO_MODE=false", "tsx", "server.ts"], {
    cwd: ROOT, shell: true, stdio: "pipe", env: { ...process.env },
  });
  server.stderr.on("data", () => {});
  server.stdout.on("data", () => {});
  try {
    await waitForServer();
    await sleep(1500);
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce", locale: "he-IL" });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("#hero", { timeout: 60000 });
    await sleep(7000); // splash + entrada
    await page.screenshot({ path: `${OUT}/${niche}-hero.png`, animations: "disabled" });
    await page.evaluate(() => document.querySelector("#services, #menu")?.scrollIntoView({ behavior: "instant", block: "start" }));
    await sleep(2000);
    await page.screenshot({ path: `${OUT}/${niche}-services.png`, animations: "disabled" });
    await ctx.close();
  } finally {
    // shell:true en Windows → matar el árbol
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true });
    else server.kill("SIGTERM");
    await sleep(2500);
  }
}

/** Diff de píxeles vía canvas (sin dependencias). */
async function diff(browser, a, b) {
  if (readFileSync(a).equals(readFileSync(b))) return { pixels: 0, total: 0, identical: true };
  const page = await browser.newPage();
  const toUrl = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;
  const r = await page.evaluate(async ([ua, ub]) => {
    const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
    const [ia, ib] = await Promise.all([load(ua), load(ub)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { pixels: -1, total: 0, size: true };
    const c = (img) => { const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height; const x = cv.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
    const da = c(ia), db = c(ib); let n = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) n++;
    return { pixels: n, total: da.length / 4 };
  }, [toUrl(a), toUrl(b)]);
  await page.close();
  return { ...r, identical: false };
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const lines = [`regresión seis · ${new Date().toISOString()} · out=${OUT} baseline=${BASELINE ?? "-"}`];
for (const niche of NICHES) {
  process.stdout.write(`${niche}… `);
  await capture(browser, niche);
  for (const shot of ["hero", "services"]) {
    const f = `${OUT}/${niche}-${shot}.png`;
    let line = `${niche}-${shot}: capturado`;
    if (BASELINE) {
      const base = `${BASELINE}/${niche}-${shot}.png`;
      if (!existsSync(base)) line += " · sin baseline";
      else { const d = await diff(browser, base, f); line += d.identical ? " · IDÉNTICO (bytes)" : d.size ? " · TAMAÑO DISTINTO" : ` · ${d.pixels} px distintos de ${d.total} (${(100 * d.pixels / d.total).toFixed(3)} %)`; }
    }
    lines.push(line);
  }
  console.log("ok");
}
await browser.close();
writeFileSync(`${OUT}/report.txt`, lines.join("\n") + "\n");
console.log(lines.join("\n"));
