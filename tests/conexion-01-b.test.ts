// CONEXION-01 · B (T) · la plantilla sirve el material desde Storage: CSP con media-src (B1, fuentes + server.ts levantado con PORT libre),
// applyHeroClip con urls de Storage (B2, el mismo import por texto que tests/material.test.ts) y gama.mjs resolviendo urls a su archivo
// local (B3, `medir` en proceso aparte sobre dos PNG). Sesión A (2026-09-21): tests rojos (hoy la CSP no lleva media-src, la regex de
// applyHeroClip exige `/hero…"` y `local()` de gama devuelve null para una url). B1 levanta server.ts en un puerto de 30000–39999 (C3 usa
// 40000–49151: los dos archivos corren en paralelo y no se pisan) y lo mata por PID. Ningún test toca Storage ni Firestore.
// VERDAD-06 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/conexion-01/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { png } from "./helpers/png.ts";
import { BUCKET, ROOT, conServidor, conTemporalAsync, conecta, nodeE, puertoLibreEn, ultimoJson, urlStorage } from "./orden/conexion-01/_util.ts";

const DIRECTIVA = "media-src 'self' https://firebasestorage.googleapis.com blob:";
const TOKEN = "0123456789abcdef0123456789abcdef";

test("La CSP de server.ts, api/index.ts y vercel.json lleva `media-src 'self' https://firebasestorage.googleapis.com blob:`, y una respuesta de server.ts levantado con PORT libre trae esa directiva en el encabezado Content-Security-Policy", async () => {
  // Los tres fuentes, con la directiva exacta (D-21). Sobre fuentes enteros se afirma con assert.ok para no volcarlos en el mensaje de fallo.
  for (const f of ["server.ts", "api/index.ts", "vercel.json"]) assert.ok(readFileSync(resolve(ROOT, f), "utf8").includes(DIRECTIVA), `${f} debe llevar «${DIRECTIVA}»`);
  // server.ts levantado como recrear (fixture A, sin Firebase) en un puerto libre: la respuesta de / trae la directiva; el hijo muere por PID.
  const puerto = await puertoLibreEn(30000, 39999);
  const csp = await conTemporalAsync((tmp) => conServidor(ROOT, { VITE_CLIENT_ID: "test-b4-peluqueria-a", VITE_FIREBASE_API_KEY: "", VITE_TENANT_FIXTURE: "peluqueria-paleta-a" }, puerto, join(tmp, "servidor.log"), async (base) => {
    const r = await fetch(base + "/");
    assert.ok(r.ok, `GET / debe responder ok (status ${r.status})`);
    return r.headers.get("content-security-policy");
  }));
  assert.ok(csp, "la respuesta de / trae el encabezado Content-Security-Policy");
  const directivas = csp.split(/;\s*/).map((d) => d.trim());
  assert.ok(directivas.includes(DIRECTIVA), `la CSP servida lleva «${DIRECTIVA}» como directiva entera:\n${csp}`);
  assert.ok(directivas.includes("default-src 'self'"), "control: default-src 'self' sigue en la CSP servida");
  assert.equal(await conecta(puerto), false, `el servidor hijo (PID) ya no escucha en :${puerto}`);
});

/** applyHeroClip aislada por su texto (importa firebase e import.meta.env), exactamente como tests/material.test.ts. */
function applyHeroClipDeTenant(): (json: string, clip: string) => string {
  const src = readFileSync(join(ROOT, "src/services/tenant.ts"), "utf8");
  const m = src.match(/export function applyHeroClip[\s\S]*?\n}\n/);
  assert.ok(m, "applyHeroClip no está en src/services/tenant.ts (o no es una función entera hasta «\\n}\\n», como la lee tests/material.test.ts)");
  const js = ts.transpileModule(m[0].replace("export ", ""), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return runInNewContext(`${js}; applyHeroClip`, {}) as (json: string, clip: string) => string;
}

test("applyHeroClip (VITE_HERO_CLIP) sigue funcionando con fixtures que apuntan a Storage: con VITE_HERO_CLIP=<c> el hero pasa a `/dev-fixtures/media/paleta-<p>/hero-<c>{,-1280,-poster,-v,-v-poster}.{mp4,webm,avif}` (local, sólo dev) aunque el fixture tenga urls de Storage; sin la variable no cambia nada; los casos de tests/material.test.ts:26–33 siguen iguales", () => {
  const applyHeroClip = applyHeroClipDeTenant();
  // Los casos de tests/material.test.ts:26–33 (rutas locales del fixture A real) siguen iguales.
  const fixtureA = readFileSync(join(ROOT, "dev-fixtures/peluqueria-paleta-a.json"), "utf8");
  const local = JSON.parse(applyHeroClip(fixtureA, "stock")).hero.video;
  assert.equal(local.mp4, "/dev-fixtures/media/paleta-a/hero-stock.mp4");
  assert.equal(local.webm, "/dev-fixtures/media/paleta-a/hero-stock.webm");
  assert.equal(local.poster, "/dev-fixtures/media/paleta-a/hero-stock-poster.avif");
  assert.equal(local.medium.mp4, "/dev-fixtures/media/paleta-a/hero-stock-1280.mp4");
  assert.equal(local.medium.webm, "/dev-fixtures/media/paleta-a/hero-stock-1280.webm");
  assert.equal(local.portrait.mp4, "/dev-fixtures/media/paleta-a/hero-stock-v.mp4");
  assert.equal(local.portrait.webm, "/dev-fixtures/media/paleta-a/hero-stock-v.webm");
  assert.equal(local.portrait.poster, "/dev-fixtures/media/paleta-a/hero-stock-v-poster.avif");
  assert.equal(applyHeroClip(fixtureA, ""), fixtureA, "sin clip, idéntico");
  // El mismo fixture con el hero (y una foto de galería) en urls de Storage de paleta-a: el clip vuelve a local; lo demás no se toca.
  const fx = JSON.parse(fixtureA);
  const u = (rol: string, n: string) => urlStorage(BUCKET, `clients/test-b4-peluqueria-a/media/${rol}/${n}`, TOKEN);
  fx.hero.video = { mp4: u("hero", "hero.mp4"), webm: u("hero", "hero.webm"), poster: u("hero", "hero-poster.avif"), medium: { mp4: u("hero", "hero-1280.mp4"), webm: u("hero", "hero-1280.webm") }, portrait: { mp4: u("hero", "hero-v.mp4"), webm: u("hero", "hero-v.webm"), poster: u("hero", "hero-v-poster.avif") } };
  fx.gallery = [u("gallery", "galeria-1.jpg")];
  const texto = JSON.stringify(fx, null, 2);
  const out = JSON.parse(applyHeroClip(texto, "c64d4"));
  assert.equal(out.hero.video.mp4, "/dev-fixtures/media/paleta-a/hero-c64d4.mp4", "16:9 mp4 desde url de Storage");
  assert.equal(out.hero.video.webm, "/dev-fixtures/media/paleta-a/hero-c64d4.webm");
  assert.equal(out.hero.video.poster, "/dev-fixtures/media/paleta-a/hero-c64d4-poster.avif");
  assert.equal(out.hero.video.medium.mp4, "/dev-fixtures/media/paleta-a/hero-c64d4-1280.mp4", "el paisaje 1280 también");
  assert.equal(out.hero.video.medium.webm, "/dev-fixtures/media/paleta-a/hero-c64d4-1280.webm");
  assert.equal(out.hero.video.portrait.mp4, "/dev-fixtures/media/paleta-a/hero-c64d4-v.mp4", "el 9:16 también");
  assert.equal(out.hero.video.portrait.webm, "/dev-fixtures/media/paleta-a/hero-c64d4-v.webm");
  assert.equal(out.hero.video.portrait.poster, "/dev-fixtures/media/paleta-a/hero-c64d4-v-poster.avif");
  const sinHero = (o: { hero: { video?: unknown } }) => { const c = structuredClone(o); delete c.hero.video; return c; };
  assert.deepEqual(sinHero(out), sinHero(fx), "fuera de hero.video no cambia nada (la galería en Storage sigue en Storage)");
  assert.equal(applyHeroClip(texto, ""), texto, "sin clip, idéntico también con urls de Storage");
  assert.equal(applyHeroClip(texto, "  "), texto, "clip en blanco, idéntico");
});

test("gama.mjs mide un fixture cuyas rutas son urls de Storage resolviendo cada url a su archivo local `dev-fixtures/media/paleta-<p>/<nombre>` por el nombre del final del path, y da para A y C exactamente lo mismo que con las rutas locales (misma tabla, mismo total)", async () => {
  // Dos PNG en la carpeta que gama lee (ROOT/dev-fixtures/media/paleta-zz/, ignorada por git: .gitignore:50), creada y borrada aquí.
  const carpeta = join(ROOT, "dev-fixtures", "media", "paleta-zz");
  assert.ok(!existsSync(carpeta), `precondición: ${carpeta} no existe (no se pisa nada)`);
  mkdirSync(carpeta, { recursive: true });
  try {
    writeFileSync(join(carpeta, "uno.png"), png("#f6f7f2", "#5d7a57", 0.06));
    writeFileSync(join(carpeta, "dos.png"), png("#f6f7f2", "#5d7a57", 0.1));
    const url = JSON.stringify(pathToFileURL(resolve(ROOT, "tools/gama.mjs")).href);
    const locales = ["/dev-fixtures/media/paleta-zz/uno.png", "/dev-fixtures/media/paleta-zz/dos.png"];
    const urls = ["uno.png", "dos.png"].map((n) => urlStorage("falso", `clients/test-b4-peluqueria-zz/media/services/${n}`, TOKEN));
    const r = nodeE(`import { medir, archivosDeFixture, imprimir, paletaDe } from ${url};
const colors = paletaDe("a");
const fx = (srcs) => ({ branding: { colors }, sections: { services: { images: srcs } } });
const capturar = (fn) => { const lineas = []; const orig = console.log; console.log = (...a) => lineas.push(a.join(" ")); try { return { bad: fn(), lineas }; } finally { console.log = orig; } };
const rl = await medir(archivosDeFixture(fx(${JSON.stringify(locales)})), colors); const tl = capturar(() => imprimir("prueba", rl));
const ru = await medir(archivosDeFixture(fx(${JSON.stringify(urls)})), colors); const tu = capturar(() => imprimir("prueba", ru));
console.log(JSON.stringify({ local: { rows: rl.rows, tabla: tl.lineas, bad: tl.bad }, url: { rows: ru.rows, tabla: tu.lineas, bad: tu.bad } }));`);
    assert.equal(r.status, 0, `medir/archivosDeFixture/imprimir/paletaDe deben importarse de tools/gama.mjs y correr (exit ${r.status})\n${r.out.slice(-2000)}`);
    type Fila = { src: string; error?: string; [k: string]: unknown };
    const o = ultimoJson(r) as { local: { rows: Fila[]; tabla: string[]; bad: number }; url: { rows: Fila[]; tabla: string[]; bad: number } };
    assert.equal(o.local.rows.length, 2, "precondición: gama mide los dos PNG en local");
    assert.ok(o.local.rows.every((f) => !f.error), `precondición: los PNG locales se decodifican: ${JSON.stringify(o.local.rows.map((f) => f.error))}`);
    assert.equal(o.url.rows.length, 2);
    assert.ok(o.url.rows.every((f) => !f.error), `con urls de Storage cada archivo se resuelve a dev-fixtures/media/paleta-zz/<nombre> y se mide: ${JSON.stringify(o.url.rows.map((f) => f.error))}`);
    const sinSrc = (rows: Fila[]) => rows.map(({ src, ...resto }) => resto);
    assert.deepEqual(sinSrc(o.url.rows), sinSrc(o.local.rows), "las mismas medidas (todo menos src)");
    assert.deepEqual(o.url.tabla, o.local.tabla, "la misma tabla impresa, línea a línea");
    assert.equal(o.url.bad, o.local.bad, "el mismo total");
    assert.match(o.url.tabla[o.url.tabla.length - 1] ?? "", /^\d\/2 en gama$/, "la tabla termina con «N/2 en gama»");
  } finally { rmSync(carpeta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
});
