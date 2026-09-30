/**
 * Regresión visual de los seis nichos existentes (BLOQUE-04).
 * Captura hero + services en móvil 375 px (he) por nicho y, si se pasa
 * --baseline <dir>, compara pixel a pixel contra esa captura de partida.
 *
 * Uso: node scripts/qa-regresion-seis.mjs --out <dir> [--baseline <dir>]
 * Salida: <dir>/<nicho>-{hero,services}.png + <dir>/report.txt
 * Corre sin Firebase (VITE_FIREBASE_* vacías → bypass dev con preset): la captura no depende de Firestore.
 *
 * ARREGLOS-03 (2026-09-30, D-155): corre en un clon limpio, sin `.env`. (1) El server recibe un id de cliente explícito
 * (`VITE_CLIENT_ID=qa-regresion`): sin él `registerExpressRoutes` lanza «Missing tenant id», el `catch` de `startServer` se lo traga
 * y `/` responde 503 (antes el id lo ponía el `.env` por dotenv, sin decirlo). (2) El hero se captura cuando la página está
 * quieta —`asentar` de `tools/verdad/e2e.mjs`: esperas por condición, D-107—, no a los 7 s de reloj: con la espera fija la rejilla
 * de cifras del hero (`backdrop-filter: blur(12px)`) alternaba entre dos estados según la carga. (3) El puerto 3000 es fijo: si ya
 * responde antes de levantar el server (p. ej. un `npm run dev` abierto), sale 3 y lo dice, sin capturar el servidor de otro.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import net from "node:net";
import { ARGS_CHROMIUM, asentar } from "../tools/verdad/e2e.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const OUT = resolve(arg("out", "qa-regresion"));
const BASELINE = arg("baseline", null) ? resolve(arg("baseline")) : null;
const NICHES = (arg("niches", "barberia,estetica,tattoo,nails,cafeteria,remodelaciones")).split(",");
const PORT = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ¿Alguien escucha en PORT, por IPv4 o por IPv6? (nunca se mata a nadie). */
const escuchaEn = (host) => new Promise((ok) => {
  const s = net.connect({ host, port: PORT });
  s.on("connect", () => { s.destroy(); ok(true); });
  s.on("error", () => ok(false));
  setTimeout(() => { s.destroy(); ok(false); }, 1500);
});
const ocupado = async () => (await escuchaEn("127.0.0.1")) || (await escuchaEn("::1"));
/** Espera hasta `ms` a que el puerto quede libre (el server del nicho anterior tarda en soltarlo); si no, sale 3 diciéndolo. */
async function exigirPuertoLibre(ms, cuando) {
  const hasta = Date.now() + ms;
  while (await ocupado()) {
    if (Date.now() >= hasta) {
      console.error(`qa-regresion-seis: el puerto ${PORT} está ocupado ${cuando} (¿un «npm run dev» abierto?). No se captura el servidor de otro: cerralo y volvé a correr.`);
      process.exit(3);
    }
    await sleep(500);
  }
}

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
  await exigirPuertoLibre(15000, `antes de levantar el server de ${niche}`);
  const server = spawn("npx", ["cross-env", `VITE_ACTIVE_NICHE=${niche}`, "VITE_UI_LANGUAGE=he", "VITE_DEMO_MODE=false", "VITE_FIREBASE_API_KEY=", "VITE_FIREBASE_PROJECT_ID=", "VITE_CLIENT_ID=qa-regresion", "tsx", "server.ts"], {
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
    await asentar(page); // splash + entrada, por condición y no por reloj (D-155)
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

await exigirPuertoLibre(0, "al empezar");
mkdirSync(OUT, { recursive: true });
// D-158: sin antialiasing subpíxel ni hinting, las mismas banderas que e2e.mjs (ARREGLOS-02, causa 2: bordes de texto intermitentes).
const browser = await chromium.launch({ args: ARGS_CHROMIUM });
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
