// AUDITORIA-01 · C1 y C2 (T) · lo que el arnés de navegador no ve. Sesión A (2026-10-04): tests rojos.
//
// C1 (D-121, ARREGLOS-02): `tests/suite-fases.test.ts:15` decide la fase por el literal `from "playwright"`. Un test que abre Chromium
// con `await import("playwright")` —hoy lo hacen `ajustes-01`, `arreglos-01-f` y `galeria-04`— puede quedarse en la fase concurrente
// (`test:unit`, `--test-concurrency=2`) sin que el guard lo diga, y la concurrencia es justo lo que hace caer el navegador (D-57). Se
// prueba por lo que hace, en un clon de HEAD (nunca en el repo): un archivo nuevo con sólo el import dinámico en `test:unit`, otro con
// comillas simples fuera de las dos fases, y la otra dirección —uno que sólo NOMBRA playwright en un comentario y en un texto—.
// C2 (pendiente del revisor de CIERRE-TRAMO-01-B2): `tools/verdad/e2e.mjs` llama `asentar(p)` al abrir cada página (`e2e.mjs:408`) y
// descarta lo que devuelve —`{ imagenesSinCargar }`—: una imagen de la página que no cargó en el tope no queda en ningún lado. Lo que
// cae sobre una zona ya lo cubre el paso de captura (deja la zona no estable); esto es diagnóstico de PÁGINA y no cambia el exit
// (recomendación del revisor; D-231). Se prueba con `--desplegada/--referencia` contra páginas servidas aquí en 127.0.0.1.
// Sólo en T (inciso n). No escribe en el repo; no sale a la red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, clonDe, conTemporal, conTemporalAsync, correrNode, correrNodeAsync, cuenta, entornoLimpio, git, quitarEnlace, subcarpeta } from "./_comun.ts";

const GUARD = "tests/suite-fases.test.ts";
const NUEVO = "tests/auditoria-01-sonda.test.ts";
/** El especificador se arma en dos trozos: este archivo no tiene que parecer un test con navegador a ningún guard. */
const PW = "play" + "wright";

test("`tests/suite-fases.test.ts` ve el `import()` dinámico de playwright: en un clon de HEAD, un test que abre Chromium sólo con `await import(\"playwright\")` puesto en `test:unit` lo hace caer, y uno con `import('playwright')` fuera de las dos fases también; uno que sólo nombra playwright en un comentario y en un texto, puesto en `test:unit`, no lo hace caer; y sin cambios pasa", () => {
  conTemporal((base) => {
    const clon = clonDe(base, "clon", git(ROOT, "rev-parse", "HEAD"));
    try {
      const pkg = join(clon, "package.json");
      const original = readFileSync(pkg, "utf8");
      const correr = () => cuenta(correrNode(["--import", "tsx", "--test", "--test-reporter=tap", GUARD], { cwd: clon, env: entornoLimpio(), minutos: 5 }));
      /** Escribe el archivo de prueba y, si `fase`, lo agrega al final de ese script; corre el guard y deja el clon como estaba. */
      const con = (cuerpo: string, fase: string | null) => {
        writeFileSync(join(clon, NUEVO), cuerpo);
        if (fase) { const j = JSON.parse(original); j.scripts[fase] = `${j.scripts[fase]} ${NUEVO}`; writeFileSync(pkg, JSON.stringify(j, null, 2) + "\n"); }
        try { return correr(); } finally { rmSync(join(clon, NUEVO), { force: true }); writeFileSync(pkg, original); }
      };
      const sinCambios = correr();
      assert.ok(sinCambios.pass >= 1 && sinCambios.fail === 0, `control: ${GUARD} pasa en HEAD sin cambios (pass ${sinCambios.pass}, fail ${sinCambios.fail})`);

      const dinamico = con(`import { test } from "node:test";\ntest("sonda", async () => { const { chromium } = await import("${PW}"); const b = await chromium.launch(); await b.close(); });\n`, "test:unit");
      assert.equal(dinamico.fail, 1, `${GUARD} cae con un test que abre Chromium sólo con await import("${PW}") puesto en test:unit (fail ${dinamico.fail})`);

      const simples = con(`import { test } from "node:test";\ntest("sonda", async () => { const m = await import('${PW}'); await (await m.chromium.launch()).close(); });\n`, null);
      assert.equal(simples.fail, 1, `${GUARD} cae con un test que abre Chromium con import('${PW}') y no está en ninguna fase (fail ${simples.fail})`);

      const nombra = con(`import { test } from "node:test";\n// este test no abre ${PW}: sólo lo nombra\ntest("sonda", () => { const texto = "${PW} es una librería"; if (!texto) throw new Error(); });\n`, "test:unit");
      assert.equal(nombra.fail, 0, `${GUARD} no cae con un test que sólo nombra ${PW} en un comentario y en un texto (fail ${nombra.fail})`);
    } finally { quitarEnlace(clon); }
  });
});

/** PNG de 1×1 válido. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
/** `#hero` sin imágenes y, FUERA de él, una imagen que la página monta DESPUÉS del `load` (una que no contesta en el HTML inicial
 *  retendría el `load` y `e2e.mjs` no abriría la página): `/img/ok.png` (contesta) o `/img/nunca.png` (no contesta nunca). */
const pagina = (img: string) => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>auditoria-01</title><style>
:root { --surface: #ffffff; --text: #111111; --accent: #aa3300; --accent-strong: #882200; --font-sans: sans-serif; --font-serif: serif; }
body { margin: 0; background: #ffffff; }
#hero { width: 340px; height: 300px; background: #eeeeee; }
#fuera { margin-top: 40px; width: 300px; height: 40px; }
#fuera img { display: block; width: 300px; height: 40px; }
</style></head><body><main id="main-content"><section id="hero"></section><div id="fuera"></div></main>
<script>addEventListener("load", function () { document.getElementById("fuera").innerHTML = '<img alt="" src="${img}">'; });</script></body></html>`;
const PAGINAS: Record<string, string> = { limpia: pagina("/img/ok.png"), nunca: pagina("/img/nunca.png") };

test("`e2e.mjs` anota en el informe las imágenes que una página no cargó al abrirse, sin cambiar el exit: con `--desplegada` una página cuya imagen fuera de toda zona nunca contesta y `--referencia` una que la carga, el informe lleva en `sinCargarEnPagina` la desplegada con el `src` de esa imagen, la zona mide 0 px y estable y sale 0; con las dos páginas que cargan, `sinCargarEnPagina` está vacío", async () => {
  const servidor = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/img/nunca.png") return; // no contesta: retiene la conexión hasta que se cierra el servidor
    if (url.pathname === "/img/ok.png") { res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" }); res.end(PNG); return; }
    const nombre = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!PAGINAS[nombre] || !url.pathname.endsWith("/")) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(PAGINAS[nombre]);
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const u = (n: string) => `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/${n}`;
  try {
    await conTemporalAsync(async (base) => {
      const medir = async (desplegada: string, referencia: string, nombre: string) => {
        const tmp = subcarpeta(base, `tmp-${nombre}`);
        const r = await correrNodeAsync(["tools/verdad/e2e.mjs", "--desplegada", desplegada, "--referencia", referencia, "--zonas", "hero", "--vistas", "375", "--json", "--out", join(tmp, "capturas")], { cwd: ROOT, minutos: 10, env: entornoLimpio({ TEMP: tmp, TMP: tmp, TMPDIR: tmp, E2E_CONSERVAR: join(tmp, "conservar") }) });
        const linea = r.stdout.split(/\r?\n/).reverse().find((l) => l.trim().startsWith("{") && l.trim().endsWith("}"));
        assert.ok(linea, `${nombre}: e2e.mjs imprime su informe (--json)\n${r.out.slice(-1500)}`);
        return { r, inf: JSON.parse(linea!) as Record<string, any> };
      };

      // (1) Una imagen de la página sin cargar, fuera de toda zona: queda en el informe. Hoy: el informe no la nombra.
      const { r, inf } = await medir(u("nunca"), u("limpia"), "nunca");
      const z = (inf.zonas ?? []).find((x: any) => x.zona === "hero");
      assert.ok(z, `precondición: el informe trae la zona hero\n${r.out.slice(-1500)}`);
      const pag = inf.sinCargarEnPagina;
      assert.ok(Array.isArray(pag), `el informe lleva sinCargarEnPagina (hoy: ${JSON.stringify(pag)}; claves: ${Object.keys(inf).join(", ")})`);
      const desplegada = pag.filter((e: any) => e.lado === "desplegada");
      assert.match(JSON.stringify(desplegada), /\/img\/nunca\.png/, `sinCargarEnPagina nombra, de la desplegada, el src de la imagen que no cargó: ${JSON.stringify(pag)}`);
      assert.ok(desplegada.every((e: any) => e.ruta === "/" && e.vista === 375 && e.corrida === 1 && Array.isArray(e.imagenes)), `cada entrada dice ruta, vista, corrida e imagenes: ${JSON.stringify(desplegada)}`);
      assert.deepEqual(pag.filter((e: any) => e.lado === "referencia"), [], "la referencia, que cargó su imagen, no aparece");
      assert.ok(z.pixels === 0 && z.estable === true, `una imagen fuera de toda zona no toca la medición: hero ${JSON.stringify(z)}`);
      assert.equal(r.status, 0, `el exit no cambia: sale 0 (salió ${r.status})\n${r.out.slice(-1200)}`);

      // (2) La otra dirección: con las dos páginas cargadas, nada que anotar.
      const limpio = await medir(u("limpia"), u("limpia"), "limpia");
      assert.deepEqual(limpio.inf.sinCargarEnPagina, [], `con todo cargado, sinCargarEnPagina vacío: ${JSON.stringify(limpio.inf.sinCargarEnPagina)}`);
      assert.equal(limpio.r.status, 0, `sale 0 (salió ${limpio.r.status})`);
    });
  } finally { servidor.closeAllConnections(); await new Promise<void>((ok) => servidor.close(() => ok())); }
});
