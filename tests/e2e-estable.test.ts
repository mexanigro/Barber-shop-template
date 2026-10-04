// ARREGLOS-01 (2026-09-25, D-107/D-108) · guard de la medición de `tools/verdad/e2e.mjs`.
//
// Por qué existe. El revisor corrió tres veces la misma comparación sobre las mismas dos webs: la primera dio «pagina-servicios
// 1280: 1166 px»; las otras dos, 0 px en las doce zonas. Las webs no habían cambiado. Lo que faltaba en `asentar` eran cuatro
// esperas: las imágenes cargadas Y DECODIFICADAS, el `loading="lazy"` forzado a `eager`, las animaciones de la Web Animations API
// —que una regla CSS `animation:none` no apaga— y la caja quieta. Y no alcanza con congelar: la herramienta compara DOS páginas,
// así que una animación pausada en un instante cualquiera sale igual a sí misma y distinta de la del otro lado; hay que
// terminarla en un punto determinista (`cancel()` la infinita, `finish()` la finita).
//
// Cómo se mide: una página local en 127.0.0.1 que trae las cuatro fuentes de azar a propósito (nunca producción: el guard no puede
// depender del azar ni de la red). Las dos direcciones: SIN `asentar` las capturas difieren —si salieran iguales, la página dejó
// de reproducir el defecto y este guard no mide nada—; CON `asentar` son idénticas entre sí y entre dos cargas distintas.
// Fase `test:browser` (D-57): levanta Chromium.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { png as pngColor } from "./helpers/png.ts";

const ROOT = resolve(import.meta.dirname, "..");
const E2E = "tools/verdad/e2e.mjs";

/** PNG 1×1 opaco: lo que importa no es el color, sino si la imagen está o no cuando se captura. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==", "base64");
/** Las cuatro fuentes de azar de D-107 en una sola página. */
const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>e2e-estable</title><style>
  body { margin: 0; background: #fff; }
  #zona { width: 320px; }
  img { display: block; width: 300px; height: 60px; background: #fff; }
  #waapi { width: 300px; height: 60px; background: #ddd; }
  #waapi b { display: block; width: 40px; height: 60px; background: #111; }
  #trans { width: 40px; height: 40px; background: #333; transition: transform 4s linear; }
  #trans.va { transform: translateX(240px); }
  #pliegue { height: 1200px; background: #fafafa; }
</style></head><body>
  <div id="zona">
    <img id="tarde" src="/color.png?ms=400&amp;c=1" alt="">
    <div id="waapi"><b></b></div>
    <div id="trans"></div>
    <div id="pliegue"></div>
    <img id="perezosa" loading="lazy" src="/color.png?ms=250&amp;c=2" alt="">
  </div>
  <script>
    document.querySelector("#waapi b").animate(
      [{ transform: "translateX(0px)" }, { transform: "translateX(260px)" }],
      { duration: 900, iterations: Infinity },
    );
    requestAnimationFrame(function () { document.getElementById("trans").classList.add("va"); });
  </script>
</body></html>`;

/** Un puerto libre del sistema (se pide y se suelta; el servidor lo toma enseguida). */
function puertoLibre(): Promise<number> {
  return new Promise((ok, ko) => {
    const s = net.createServer();
    s.on("error", ko);
    s.listen(0, "127.0.0.1", () => { const p = (s.address() as net.AddressInfo).port; s.close(() => ok(p)); });
  });
}

/** Sirve la página en 127.0.0.1 y cierra siempre. `/color.png?ms=N` responde N ms después: la imagen llega tarde a propósito. */
async function conPagina<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const puerto = await puertoLibre();
  const servidor = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/color.png") {
      const ms = Math.min(2000, parseInt(url.searchParams.get("ms") ?? "0", 10) || 0);
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "image/png", "Content-Length": PNG.length, "Cache-Control": "no-store" });
        res.end(PNG);
      }, ms);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(PAGINA);
  });
  await new Promise<void>((ok, ko) => { servidor.on("error", ko); servidor.listen(puerto, "127.0.0.1", ok); });
  try { return await fn(`http://127.0.0.1:${puerto}`); }
  finally { await new Promise<void>((ok) => servidor.close(() => ok())); }
}

const importarE2E = () => import(pathToFileURL(resolve(ROOT, E2E)).href) as Promise<Record<string, unknown>>;

test("`asentar` deja la página quieta: tres capturas seguidas de la misma zona —y la de una segunda carga— son byte a byte idénticas, y sin `asentar` no lo son", async () => {
  const mod = await importarE2E();
  assert.equal(typeof mod.asentar, "function", `${E2E} debe exportar \`asentar(page)\` (exporta: ${Object.keys(mod).join(", ") || "nada"})`);
  const asentar = mod.asentar as (p: unknown) => Promise<void>;

  const navegador = await chromium.launch();
  try {
    await conPagina(async (base) => {
      const capturas = async (conAsentar: boolean, veces: number): Promise<Buffer[]> => {
        const ctx = await navegador.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
        try {
          const p = await ctx.newPage();
          await p.goto(base + "/", { waitUntil: "load", timeout: 60000 });
          if (conAsentar) await asentar(p);
          const el = await p.$("#zona");
          assert.ok(el, "precondición: la página local trae #zona");
          const out: Buffer[] = [];
          for (let i = 0; i < veces; i++) { out.push(await el.screenshot()); if (i + 1 < veces) await p.waitForTimeout(150); }
          return out;
        } finally { await ctx.close(); }
      };

      const crudas = await capturas(false, 3);
      assert.equal(crudas.every((b) => b.equals(crudas[0])), false, "ARNÉS: sin `asentar` las tres capturas tienen que diferir; si salen iguales, la página local dejó de reproducir las fuentes de D-107 y este guard no mide nada");

      const quietas = await capturas(true, 3);
      const distintas = quietas.map((b, i) => (b.equals(quietas[0]) ? null : i)).filter((i): i is number => i !== null);
      assert.deepEqual(distintas, [], `tras \`asentar\` las tres capturas tienen que ser idénticas (difieren las ${distintas.join(", ")})`);

      const otra = await capturas(true, 1);
      assert.ok(otra[0].equals(quietas[0]), `tras \`asentar\`, la captura de una SEGUNDA CARGA tiene que ser idéntica a la primera (${otra[0].length} bytes contra ${quietas[0].length}): e2e.mjs compara dos páginas, no dos capturas de la misma`);
    });
  } finally { await navegador.close(); }
});

test("`codigoDeSalida` da 2 cuando una zona no es estable aunque su `pixels` sea 0, 2 cuando falta una zona, y 0 cuando todas son estables", async () => {
  const mod = await importarE2E();
  assert.equal(typeof mod.codigoDeSalida, "function", `${E2E} debe exportar \`codigoDeSalida(informe)\` (exporta: ${Object.keys(mod).join(", ") || "nada"})`);
  const codigoDeSalida = mod.codigoDeSalida as (i: unknown) => number;

  const zona = (extra: Record<string, unknown>) => ({ zona: "hero", vista: 375, pixels: 0, size: false, total: 1000, repeticiones: 2, estable: true, ...extra });
  const informe = (zonas: unknown[], faltantes: unknown[] = []) => ({ web: "x", paleta: "a", zonas, tokens: [] as unknown[], faltantes });

  assert.equal(codigoDeSalida(informe([zona({}), zona({ vista: 1280 })])), 0, "todas estables y sin faltantes: 0");
  assert.equal(codigoDeSalida(informe([zona({ pixels: 1166, total: 100000 })])), 0, "una diferencia MEDIDA con la zona estable sigue siendo 0: es un resultado, no un error de la herramienta");
  assert.equal(codigoDeSalida(informe([zona({}), zona({ vista: 1280, estable: false })])), 2, "una zona que no es estable da 2 aunque su `pixels` sea 0");
  assert.equal(codigoDeSalida(informe([zona({})], [{ zona: "gallery", vista: 375, donde: "las dos", selector: "#gallery" }])), 2, "una zona faltante sigue dando 2 (E2E-01)");
});

// ─── CIERRE-TRAMO-01-B2 (2026-10-04) · las imágenes que la página pide DESPUÉS de `asentar` ───────────────────────────────────────
// Medido contra la web A: `en · gallery 1280` salió «NO ESTABLE» (611 px) con la captura de la desplegada SIN el logo de la pastilla.
// Al traer la zona a la vista, navbar-v6 deja el hero y `BrandLogo` monta OTRA `<img>`, que se pide en ese momento; `asentar` sólo
// espera las que existen cuando corre y `quieto` compara cajas (un `<img>` de alto fijo no se mueve mientras carga). Arreglo:
// `esperarImagenes`, UNA función que usan `asentar` y el paso posterior al scroll, en vueltas hasta que no aparezcan imágenes
// nuevas; una imagen que no carga sobre la zona la deja NO estable, nombrada, y sale 2. Se mide con `e2e.mjs` de verdad (modo
// `--desplegada/--referencia`, ARREGLOS-03) contra páginas servidas aquí, en 127.0.0.1: nunca la red ni las webs.
const CLARO = pngColor("#e8c547", "#e8c547", 0), OSCURO = pngColor("#1d3557", "#1d3557", 0);
/** La zona `#hero` está bajo el pliegue; al traerla a la vista (scrollY > 300) se monta otra `<img>` —como `BrandLogo`— que el
 *  servidor entrega `ms` milisegundos después. `extra` se monta con ella dentro de la zona y `fuera` lejos debajo (una imagen
 *  que nunca carga no puede estar desde el principio: `load` la esperaría y la página no terminaría de cargar). */
const paginaScroll = (ms: number, extra = "", fuera = "") => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>e2e-estable-scroll</title><style>
:root { --surface: #ffffff; --text: #111111; --accent: #aa3300; --accent-strong: #882200; --font-sans: sans-serif; --font-serif: serif; }
body { margin: 0; background: #ffffff; }
#arriba { height: 900px; background: #f4f4f4; }
#hero { width: 340px; height: 300px; background: #eeeeee; padding: 20px; box-sizing: border-box; }
#hero img { display: block; width: 300px; height: 120px; }
#abajo { height: 1600px; background: #fafafa; }
</style></head><body><main id="main-content"><div id="arriba"></div><section id="hero"><div id="logo"></div><div id="extra"></div></section><div id="abajo"></div><div id="fuera"></div></main>
<script>
  var modo = null;
  function poner() {
    var m = scrollY > 300 ? "claro" : "oscuro";
    if (m === modo) return;
    modo = m;
    document.getElementById("logo").innerHTML = '<img alt="" src="/img/' + m + '.png?ms=' + (m === "claro" ? ${ms} : 0) + '&t=' + Date.now() + '">';
    if (m === "claro") { document.getElementById("extra").innerHTML = ${JSON.stringify(extra)}; document.getElementById("fuera").innerHTML = ${JSON.stringify(fuera)}; }
  }
  addEventListener("scroll", poner, { passive: true });
  poner();
</script></body></html>`;
const NUNCA = `<img alt="" src="/img/nunca.png" style="width:300px;height:40px;display:block">`;
const PAGINAS_SCROLL: Record<string, string> = {
  lenta: paginaScroll(4500),
  rapida: paginaScroll(0),
  "nunca-dentro": paginaScroll(0, NUNCA),
  "nunca-fuera": paginaScroll(0, "", NUNCA),
};

/** Sirve /<página>/ y /img/<claro|oscuro|nunca>.png (`nunca` no contesta: retiene la conexión hasta que se cierra el servidor). */
async function conPaginasScroll<T>(fn: (url: (nombre: string) => string) => Promise<T>): Promise<T> {
  const servidor = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const img = url.pathname.match(/^\/img\/(claro|oscuro|nunca)\.png$/);
    if (img) {
      if (img[1] === "nunca") return;
      const ms = Math.min(6000, parseInt(url.searchParams.get("ms") ?? "0", 10) || 0);
      setTimeout(() => { res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" }); res.end(img[1] === "claro" ? CLARO : OSCURO); }, ms);
      return;
    }
    const nombre = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!PAGINAS_SCROLL[nombre] || !url.pathname.endsWith("/")) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(PAGINAS_SCROLL[nombre]);
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const puerto = (servidor.address() as net.AddressInfo).port;
  try { return await fn((n) => `http://127.0.0.1:${puerto}/${n}`); }
  finally { servidor.closeAllConnections(); await new Promise<void>((ok) => servidor.close(() => ok())); }
}

/** `e2e.mjs --desplegada … --referencia …` sobre `#hero` a 375, una corrida, ASÍNCRONO (el servidor vive en este proceso), con su
 *  TEMP y su `--out` en una carpeta temporal propia que se borra siempre. */
async function correrE2E(desplegada: string, referencia: string): Promise<{ status: number | null; out: string; informe: any }> {
  const tmp = mkdtempSync(join(tmpdir(), "e2e-estable-"));
  try {
    const hijo = spawn(process.execPath, [E2E, "--desplegada", desplegada, "--referencia", referencia, "--zonas", "hero", "--vistas", "375", "--json", "--out", join(tmp, "capturas")], {
      cwd: ROOT, env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: tmp, TMP: tmp, TMPDIR: tmp, E2E_CONSERVAR: join(tmp, "conservar") }, windowsHide: true,
    });
    let out = "";
    hijo.stdout.on("data", (d) => (out += d));
    hijo.stderr.on("data", (d) => (out += d));
    const status = await new Promise<number | null>((ok) => hijo.on("close", ok));
    const linea = out.split(/\r?\n/).reverse().find((l) => l.trim().startsWith("{") && l.trim().endsWith("}"));
    return { status, out, informe: linea ? JSON.parse(linea) : null };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

test("`e2e.mjs` espera las imágenes que la página pide al traer la zona a la vista: con un `<img>` que se monta al hacer scroll y llega 4,5 s tarde en la desplegada, capturar sin esperarla da otra imagen, y `e2e.mjs` mide la zona en 0 px y estable", async () => {
  const mod = await importarE2E();
  assert.equal(typeof mod.esperarImagenes, "function", `${E2E} debe exportar \`esperarImagenes(page, { selector })\` (exporta: ${Object.keys(mod).join(", ")})`);
  const asentar = mod.asentar as (p: unknown) => Promise<unknown>;
  const esperarImagenes = mod.esperarImagenes as (p: unknown, o?: unknown) => Promise<unknown[]>;
  await conPaginasScroll(async (url) => {
    // ARNÉS: la página reproduce el defecto. Tras `asentar`, el scroll monta la imagen lenta: capturar enseguida no es lo mismo que
    // capturar después de `esperarImagenes`. Si salieran iguales, este guard no mediría nada.
    const navegador = await chromium.launch();
    try {
      const ctx = await navegador.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      await p.goto(url("lenta") + "/", { waitUntil: "load" });
      await asentar(p);
      const el = await p.$("#hero");
      assert.ok(el, "precondición: la página local trae #hero");
      await el.scrollIntoViewIfNeeded();
      const sinEsperar = await el.screenshot();
      const malas = await esperarImagenes(p, { selector: "#hero" });
      assert.deepEqual(malas, [], "la imagen lenta carga dentro del tope");
      const trasEsperar = await el.screenshot();
      assert.equal(sinEsperar.equals(trasEsperar), false, "ARNÉS: sin esperar, la captura tiene que salir sin la imagen montada al hacer scroll; si sale igual, la página dejó de reproducir el defecto");
      await ctx.close();
    } finally { await navegador.close(); }

    // La herramienta entera: la desplegada lenta contra la referencia rápida da 0 px y estable, exit 0.
    const r = await correrE2E(url("lenta"), url("rapida"));
    const z = r.informe?.zonas?.find((x: any) => x.zona === "hero");
    assert.ok(z, `el informe trae la zona hero\n${r.out.slice(-2000)}`);
    assert.equal(z.pixels, 0, `con la imagen montada al hacer scroll esperada a los dos lados, hero mide 0 px (midió ${z.pixels}: se capturó sin esperarla)`);
    assert.equal(z.estable, true, `hero es estable (${JSON.stringify(z)})`);
    assert.equal(r.status, 0, `exit 0 (salió ${r.status})\n${r.out.slice(-1500)}`);
  });
});

test("una imagen que no carga sobre la zona no pasa en silencio: `e2e.mjs` deja la zona NO estable, nombra su `src` y sale 2; una que no carga fuera de la zona no la toca", async () => {
  await conPaginasScroll(async (url) => {
    const dentro = await correrE2E(url("nunca-dentro"), url("rapida"));
    const z = dentro.informe?.zonas?.find((x: any) => x.zona === "hero");
    assert.ok(z, `el informe trae la zona hero\n${dentro.out.slice(-2000)}`);
    assert.equal(z.estable, false, `una imagen sin cargar sobre la zona la deja no estable (${JSON.stringify(z)})`);
    const nombradas = JSON.stringify(z.imagenesSinCargar ?? null);
    assert.match(nombradas, /\/img\/nunca\.png/, `el informe nombra el src de la imagen que no cargó (imagenesSinCargar: ${nombradas})`);
    assert.equal(dentro.status, 2, `sale 2 (salió ${dentro.status})`);

    const fuera = await correrE2E(url("nunca-fuera"), url("rapida"));
    const zf = fuera.informe?.zonas?.find((x: any) => x.zona === "hero");
    assert.ok(zf && zf.estable === true && zf.pixels === 0 && !zf.imagenesSinCargar, `una imagen sin cargar FUERA de la zona no la toca (${JSON.stringify(zf)})\n${fuera.out.slice(-1500)}`);
    assert.equal(fuera.status, 0, `sale 0 (salió ${fuera.status})`);
  });
});
