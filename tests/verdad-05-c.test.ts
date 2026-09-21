// VERDAD-05 · C (T) · recrear.mjs: la prueba raíz de V5. C1 = funciones puras exportadas (hojas, sinContrato, huecoDe, diffPng con PNG
// que genera Playwright); C2 = PORT en server.ts. Sesión A (2026-09-21): tests rojos (hoy no existe recrear.mjs y server.ts fija
// `const PORT = 3000`).
// CONEXION-01 D2 (2026-09-21, D-19): copia editable promovida a npm test, recortada: C1 conserva sólo las funciones puras y C2 sólo la
// lectura de PORT en server.ts; el e2e de recrear (dos servidores, ≈ 2 min) no se levanta desde npm test: lo cubre la orden vigente en
// tests/orden/ (CONEXION-01 C3) y el original en tests/orden/verdad-05/ queda congelado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, conTemporal, nodeE, ultimoJson } from "./orden/verdad-05/_util.ts";

const RECREAR = "tools/verdad/recrear.mjs";
const URL_RECREAR = JSON.stringify(pathToFileURL(resolve(ROOT, RECREAR)).href);
type Brecha = { tipo: string; campo: string; hueco: string | null; detalle?: string };

test("node tools/verdad/recrear.mjs --paleta a|c [--out <dir>] [--sin-firestore] [--solo-diff] [--paginas home,servicios,galeria] [--vistas 375,1280] [--puerto <n>]: (a) valida el fixture con validateConfig, validateVariantContracts y validateReplanteoHuecos de H (cada error es una brecha «validador H rechaza» con su hueco por valor) y lista como brecha «sin contrato» cada campo del fixture (hojas hasta profundidad 3, infraestructura excluida) sin fila en contratos.json; (b) escribe el tenant test-b4-peluqueria-<paleta> con `H scripts/b4-tenant.ts create --id <id> --fixture <json>` salvo --sin-firestore, que lo declara; (c) levanta T con server.ts en el puerto pedido, primero con VITE_TENANT_FIXTURE y después sólo con VITE_CLIENT_ID, y captura página entera de las páginas y vistas pedidas con animaciones apagadas y vídeo oculto; (d) compara píxel a píxel cada par fixture/clientId: tamaño distinto o píxeles ≠ 0 es brecha «diff ≠ 0»; toda petición a /dev-fixtures/media/ y toda petición fallida con VITE_CLIENT_ID es brecha con su hueco; escribe recrear-<paleta>.json y las capturas en <out>; exit 2 con brechas, 0 sin brechas; nunca mata procesos ajenos: si el puerto está ocupado es brecha «puerto ocupado»", () => {
  // Funciones puras, en proceso aparte: hojas hasta profundidad 3; sinContrato con y sin fila; huecoDe por valor.
  const puras = nodeE(`import { hojas, sinContrato, huecoDe } from ${URL_RECREAR};
const obj = { a: { b: { c: { d: 1 } } }, e: 2, f: { g: 3 } };
const fx = { hero: { eyebrow: "x", video: { mp4: "/dev-fixtures/media/paleta-a/hero.mp4" } }, zzz: { campo: "y" } };
const contratos = { huecos: [{ id: "hero.eyebrow", ruta: "hero.eyebrow" }, { id: "hero.video", ruta: "hero.video.mp4" }] };
console.log(JSON.stringify({ hojas: hojas(obj), sin: sinContrato(fx, contratos), con: huecoDe(fx, contratos, "/dev-fixtures/media/paleta-a/hero.mp4"), nada: huecoDe(fx, contratos, "/no-esta.png") }));`);
  assert.equal(puras.status, 0, `hojas/sinContrato/huecoDe deben importarse de ${RECREAR} y correr (exit ${puras.status})\n${puras.out.slice(-2000)}`);
  const p = ultimoJson(puras) as { hojas: string[]; sin: Brecha[]; con: string | null; nada: string | null };
  assert.deepEqual(p.hojas, ["a.b.c", "e", "f.g"], "hojas(): rutas con puntos hasta profundidad 3");
  assert.deepEqual(p.sin, [{ tipo: "sin contrato", campo: "zzz.campo", hueco: null }], "sinContrato(): sólo el campo sin fila, como brecha «sin contrato»");
  assert.equal(p.con, "hero.video", "huecoDe(): el hueco cuyo valor en el fixture contiene la ruta de material");
  assert.equal(p.nada, null, "huecoDe(): null si ningún valor la contiene");
  // diffPng con PNG conocidos: dos iguales → 0 píxeles; dos de otro color → ≠ 0; tamaño distinto → no es 0.
  conTemporal((tmp) => {
    const png = (n: string) => JSON.stringify(join(tmp, `${n}.png`));
    const r = nodeE(`import { chromium } from "playwright";
import { diffPng } from ${URL_RECREAR};
const browser = await chromium.launch();
try {
  const p = await browser.newPage({ viewport: { width: 24, height: 24 } });
  await p.setContent('<body style="margin:0;background:#c00000"></body>');
  await p.screenshot({ path: ${png("a")} }); await p.screenshot({ path: ${png("b")} });
  await p.setContent('<body style="margin:0;background:#0000c0"></body>');
  await p.screenshot({ path: ${png("c")} });
  await p.setViewportSize({ width: 32, height: 24 }); await p.screenshot({ path: ${png("d")} });
  const ab = await diffPng(browser, ${png("a")}, ${png("b")}), ac = await diffPng(browser, ${png("a")}, ${png("c")}), ad = await diffPng(browser, ${png("a")}, ${png("d")});
  console.log(JSON.stringify({ ab, ac, ad }));
} finally { await browser.close(); }`);
    assert.equal(r.status, 0, `diffPng debe importarse de ${RECREAR} y correr (exit ${r.status})\n${r.out.slice(-2000)}`);
    const d = ultimoJson(r) as { ab: { pixels: number }; ac: { pixels: number }; ad: { pixels: number; size?: boolean } };
    assert.equal(d.ab.pixels, 0, `dos PNG iguales → 0 píxeles (${JSON.stringify(d.ab)})`);
    assert.ok(typeof d.ac.pixels === "number" && d.ac.pixels > 0, `dos PNG de otro color → píxeles ≠ 0 (${JSON.stringify(d.ac)})`);
    assert.ok(d.ad.size === true || d.ad.pixels !== 0, `tamaño distinto no puede dar 0 (${JSON.stringify(d.ad)})`);
  });
});

test("server.ts toma el puerto de la variable PORT (entero; sin ella, 3000), y una corrida de recrear.mjs con --puerto distinto de 3000 deja intacto un proceso que ya escucha en 3000", () => {
  // Sobre el fuente entero se afirma con assert.ok(re.test(…)) para no volcar server.ts (≈ 3900 líneas) en el mensaje de fallo.
  const src = readFileSync(resolve(ROOT, "server.ts"), "utf8");
  assert.ok(!/const PORT = 3000;/.test(src), "server.ts no fija «const PORT = 3000;»");
  assert.ok(/process\.env\.PORT/.test(src), "server.ts lee process.env.PORT");
  assert.ok(/process\.env\.PORT[^\n]*\b3000\b/.test(src), "PORT entero, con 3000 si falta (misma línea)");
});
