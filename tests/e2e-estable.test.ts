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
import { createServer } from "node:http";
import net from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

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
