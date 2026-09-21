// VERDAD-05 · C (T) · recrear.mjs: la prueba raíz de V5. C1 = funciones puras exportadas (hojas, sinContrato, huecoDe, diffPng con PNG
// que genera Playwright) + UN e2e contra la T real (`--paleta a --sin-firestore --paginas home --vistas 375 --puerto <libre>`); C2 = PORT en
// server.ts y un proceso propio que ya escucha en :3000 y sigue vivo tras el e2e. El e2e corre UNA vez y guarda el resultado para los dos
// tests (inciso j: los tests que levantan servidores no corren en paralelo). Sesión A (2026-09-21): tests rojos (hoy no existe recrear.mjs
// y server.ts fija `const PORT = 3000`). Ningún test escribe en Firestore: --sin-firestore siempre.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, conTemporal, conTemporalAsync, conecta, correrLargo, escuchar, nodeE, puertoLibre, ultimoJson } from "./_util.ts";

const RECREAR = "tools/verdad/recrear.mjs";
const URL_RECREAR = JSON.stringify(pathToFileURL(resolve(ROOT, RECREAR)).href);
type Brecha = { tipo: string; campo: string; hueco: string | null; detalle?: string };
type Informe = { firestore?: string; brechas: Brecha[]; diffs: { pagina: string; vista: number; pixels: number; size?: boolean }[]; bootstrap?: unknown };
type E2E = { status: number | null; out: string; puerto: number; informe: Informe | null; capturas: string[]; vivo3000: boolean };

/** Corrida única del e2e (C1 y C2 la comparten): socket propio en :3000 antes, recrear con --puerto libre, ¿sigue vivo :3000? después. */
let e2ePromesa: Promise<E2E> | null = null;
const e2e = () => (e2ePromesa ??= correrE2E());
async function correrE2E(): Promise<E2E> {
  // C2: un proceso que YA escucha en :3000 (este mismo). Si el puerto está ocupado por otro, la precondición falla: no se mata a nadie.
  const propio = await escuchar(3000);
  try {
    const puerto = await puertoLibre();
    assert.notEqual(puerto, 3000, "precondición: el puerto libre no es el 3000");
    return await conTemporalAsync(async (tmp) => {
      const out = join(tmp, "out");
      const r = correrLargo([RECREAR, "--paleta", "a", "--sin-firestore", "--paginas", "home", "--vistas", "375", "--puerto", String(puerto), "--out", out]);
      const vivo3000 = propio.server.listening && (await conecta(3000));
      const informeRuta = join(out, "recrear-a.json");
      const informe = existsSync(informeRuta) ? (JSON.parse(readFileSync(informeRuta, "utf8")) as Informe) : null;
      const capturas = ["fixture-a-375-home.png", "recrear-a-375-home.png"].filter((f) => existsSync(join(out, f)) && statSync(join(out, f)).size > 0);
      return { status: r.status, out: r.out, puerto, informe, capturas, vivo3000 };
    });
  } finally { await propio.cerrar(); }
}

test("node tools/verdad/recrear.mjs --paleta a|c [--out <dir>] [--sin-firestore] [--solo-diff] [--paginas home,servicios,galeria] [--vistas 375,1280] [--puerto <n>]: (a) valida el fixture con validateConfig, validateVariantContracts y validateReplanteoHuecos de H (cada error es una brecha «validador H rechaza» con su hueco por valor) y lista como brecha «sin contrato» cada campo del fixture (hojas hasta profundidad 3, infraestructura excluida) sin fila en contratos.json; (b) escribe el tenant test-b4-peluqueria-<paleta> con `H scripts/b4-tenant.ts create --id <id> --fixture <json>` salvo --sin-firestore, que lo declara; (c) levanta T con server.ts en el puerto pedido, primero con VITE_TENANT_FIXTURE y después sólo con VITE_CLIENT_ID, y captura página entera de las páginas y vistas pedidas con animaciones apagadas y vídeo oculto; (d) compara píxel a píxel cada par fixture/clientId: tamaño distinto o píxeles ≠ 0 es brecha «diff ≠ 0»; toda petición a /dev-fixtures/media/ y toda petición fallida con VITE_CLIENT_ID es brecha con su hueco; escribe recrear-<paleta>.json y las capturas en <out>; exit 2 con brechas, 0 sin brechas; nunca mata procesos ajenos: si el puerto está ocupado es brecha «puerto ocupado»", async () => {
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
  // e2e contra la T real: hoy y después, exit 2 (el material de A vive en dev-fixtures), informe escrito, diff calculado, capturas.
  const e = await e2e();
  assert.equal(e.status, 2, `recrear --paleta a --sin-firestore --paginas home --vistas 375 --puerto ${e.puerto} debe salir 2 con brechas (salió ${e.status})\n${e.out.slice(-4000)}`);
  assert.ok(e.informe, "recrear-a.json escrito en --out");
  assert.equal(e.informe.firestore, "saltado (--sin-firestore): declarado", "(b) con --sin-firestore lo declara");
  assert.ok(Array.isArray(e.informe.brechas) && e.informe.brechas.length >= 1, "brechas[] con al menos una");
  for (const b of e.informe.brechas) { assert.equal(typeof b.tipo, "string", `brecha sin tipo: ${JSON.stringify(b)}`); assert.equal(typeof b.campo, "string", `brecha sin campo: ${JSON.stringify(b)}`); assert.ok("hueco" in b, `brecha sin hueco: ${JSON.stringify(b)}`); }
  const material = e.informe.brechas.filter((b) => b.tipo === "material que producción no sirve");
  assert.ok(material.length >= 1, `debe haber brechas «material que producción no sirve» (tipos: ${[...new Set(e.informe.brechas.map((b) => b.tipo))].join(", ")})`);
  assert.ok(material.every((b) => b.campo.includes("/dev-fixtures/media/")), `cada una con campo bajo /dev-fixtures/media/: ${material.map((b) => b.campo).join(", ")}`);
  assert.ok(material.some((b) => typeof b.hueco === "string" && b.hueco.length > 0), `alguna con su hueco (no nulo): ${JSON.stringify(material.slice(0, 5))}`);
  const diff = e.informe.diffs.find((d) => d.pagina === "home" && d.vista === 375);
  assert.ok(diff, `diffs[] con {pagina: "home", vista: 375}: ${JSON.stringify(e.informe.diffs)}`);
  assert.equal(typeof diff.pixels, "number", "diff home 375 con pixels numérico");
  assert.deepEqual(e.capturas, ["fixture-a-375-home.png", "recrear-a-375-home.png"], "las dos capturas escritas y no vacías");
  assert.match(e.out, /diff home\s+375/, "la salida imprime «diff home 375»");
});

test("server.ts toma el puerto de la variable PORT (entero; sin ella, 3000), y una corrida de recrear.mjs con --puerto distinto de 3000 deja intacto un proceso que ya escucha en 3000", async () => {
  // Sobre el fuente entero se afirma con assert.ok(re.test(…)) para no volcar server.ts (≈ 3900 líneas) en el mensaje de fallo.
  const src = readFileSync(resolve(ROOT, "server.ts"), "utf8");
  assert.ok(!/const PORT = 3000;/.test(src), "server.ts no fija «const PORT = 3000;»");
  assert.ok(/process\.env\.PORT/.test(src), "server.ts lee process.env.PORT");
  assert.ok(/process\.env\.PORT[^\n]*\b3000\b/.test(src), "PORT entero, con 3000 si falta (misma línea)");
  const e = await e2e();
  assert.ok(e.vivo3000, `el proceso que ya escuchaba en :3000 debe seguir vivo tras recrear --puerto ${e.puerto} (exit ${e.status})\n${e.out.slice(-2000)}`);
  assert.doesNotMatch(e.out, /puerto ocupado/, "con un puerto libre no hay brecha «puerto ocupado»");
});
