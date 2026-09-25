// ARREGLOS-01 · A (T) · la medición de `e2e.mjs` es estable. Sesión A (2026-09-25): tests rojos — `tools/verdad/e2e.mjs` no exporta
// nada (medido: `Object.keys(await import(…))` da `[]`), así que ni `asentar` ni `codigoDeSalida` existen.
//
// D-107 (medido). El revisor corrió `tests/orden/e2e-01/c.test.ts` TRES veces sobre las mismas dos webs: la primera dio
// «pagina-servicios 1280: 1166 px» en la web A; las otras dos, 0 px en las doce zonas. Las webs no cambiaron. Lo que hoy espera
// `asentar` (`e2e.mjs:159–174`): `networkidle`, una regla CSS que apaga animaciones y transiciones, scroll de la página, pausa de
// los vídeos, `document.fonts.ready` y 700 ms de reloj. Lo que NO espera: imágenes cargadas y DECODIFICADAS, el `loading="lazy"`
// forzado, las animaciones de la Web Animations API (`element.animate()`, que una regla `animation:none` no apaga) y que la caja
// del elemento haya dejado de moverse.
//
// Por qué una página local y no producción: el rojo no puede depender del azar (inciso l). Esta página trae las cuatro fuentes a
// propósito, se sirve en 127.0.0.1 y no sale a la red. Las dos direcciones: sin `asentar` las capturas DIFIEREN (si no, la página
// no prueba nada y el mensaje lo dice); con `asentar` son idénticas entre sí y entre DOS CARGAS distintas — que es lo que e2e.mjs
// necesita de verdad, porque compara dos páginas, no dos capturas de la misma.
// Sólo en T (inciso n). Ninguna carpeta temporal: la página vive en memoria.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { E2E, ROOT, fuente, importarModulo, puertoLibre } from "./_comun.ts";

/** PNG 1×1 opaco (el color da igual: lo que importa es que la imagen esté o no esté cuando se captura). */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==", "base64");
/** Las cuatro fuentes de azar de D-107, en una sola página: (1) una imagen que llega tarde, (2) una animación de la Web Animations
 *  API que no para, (3) una transición CSS larga que arranca en el primer cuadro, (4) una imagen `loading="lazy"` bajo el pliegue. */
const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>arreglos-01</title><style>
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

test("tools/verdad/e2e.mjs exporta `asentar(page)` y, sobre una página local que trae las cuatro fuentes de azar de D-107 —una imagen que llega tarde, una imagen `loading=\"lazy\"` bajo el pliegue, una animación de la Web Animations API y una transición CSS—, tres capturas seguidas del mismo elemento tras `asentar` —y la de una segunda carga de la misma página— son byte a byte idénticas, y sin `asentar` no lo son", async () => {
  // (1) La herramienta exporta lo que la hoja fija. Hoy no exporta nada: aquí es donde esta orden está en rojo.
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E} (E2E-01)`);
  const mod = await importarModulo(E2E);
  assert.equal(typeof mod.asentar, "function", `${E2E} debe exportar \`asentar(page)\` para que su guard la pueda correr (exporta: ${Object.keys(mod).join(", ") || "nada"})`);
  const asentar = mod.asentar as (p: unknown) => Promise<void>;

  const { chromium } = await import("playwright");
  const navegador = await chromium.launch();
  try {
    await conPagina(async (base) => {
      /** Abre la página, opcionalmente la asienta, y devuelve `veces` capturas de `#zona`. */
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

      // (2) Sin asentar, las capturas TIENEN que diferir: si no, la página no reproduce el azar y lo que falla es el arnés.
      const crudas = await capturas(false, 3);
      const igualesCrudas = crudas.every((b) => b.equals(crudas[0]));
      assert.equal(igualesCrudas, false, "ARNÉS: sin `asentar`, tres capturas seguidas de #zona tienen que diferir (la animación de la Web Animations API, la transición y las dos imágenes que llegan tarde). Si salen iguales, la página local dejó de reproducir las fuentes de D-107 y este test no mide nada");

      // (3) Con asentar, idénticas entre sí…
      const quietas = await capturas(true, 3);
      const distintas = quietas.map((b, i) => (b.equals(quietas[0]) ? null : i)).filter((i): i is number => i !== null);
      assert.deepEqual(distintas, [], `tras \`asentar\` las tres capturas de #zona tienen que ser byte a byte idénticas (difieren las ${distintas.join(", ")}); tamaños: ${quietas.map((b) => b.length).join(", ")}`);

      // (4) …y idénticas a las de OTRA carga: e2e.mjs compara dos páginas distintas, no dos capturas de la misma. Una animación
      //     pausada en un instante cualquiera pasa (3) y falla aquí, que es el caso que dejó 1166 px una vez de cada tres.
      const otra = await capturas(true, 1);
      assert.ok(otra[0].equals(quietas[0]), `tras \`asentar\`, la captura de una segunda carga de la misma página tiene que ser byte a byte idéntica a la primera (${otra[0].length} bytes contra ${quietas[0].length})`);
    });
  } finally { await navegador.close(); }
});

test("tools/verdad/e2e.mjs captura cada zona `--repeticiones <n>` veces (2 por defecto), cada entrada de `zonas` del informe lleva `repeticiones` y `estable`, y la función exportada `codigoDeSalida(informe)` da 2 cuando una zona no es estable aunque su `pixels` sea 0, 2 cuando falta una zona, y 0 cuando todas las zonas son estables", async () => {
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E} (E2E-01)`);
  const mod = await importarModulo(E2E);
  assert.equal(typeof mod.codigoDeSalida, "function", `${E2E} debe exportar \`codigoDeSalida(informe)\` (exporta: ${Object.keys(mod).join(", ") || "nada"})`);
  const codigoDeSalida = mod.codigoDeSalida as (i: unknown) => number;

  // (1) La bandera y los dos campos nuevos del informe, en el fuente de la herramienta.
  const src = fuente(E2E);
  assert.ok(src.includes("--repeticiones"), `${E2E} debe aceptar «--repeticiones <n>» (D-108)`);
  for (const campo of ["repeticiones", "estable"]) {
    assert.ok(new RegExp(`\\b${campo}\\b`).test(src), `${E2E} debe poner «${campo}» en cada entrada de \`zonas\` del informe`);
  }

  // (2) La decisión de salida, en las dos direcciones. Una zona estable con diferencia medida NO es un error de la herramienta
  //     (e2e.mjs:263, E2E-01): sigue saliendo 0. Una zona que no es estable sí, aunque haya medido 0 px.
  const zona = (extra: Record<string, unknown>) => ({ zona: "hero", vista: 375, pixels: 0, size: false, total: 1000, repeticiones: 2, estable: true, ...extra });
  const informe = (zonas: unknown[], faltantes: unknown[] = []) => ({ web: "x", paleta: "a", commitSha: "0".repeat(40), zonas, tokens: [] as unknown[], faltantes });

  assert.equal(codigoDeSalida(informe([zona({}), zona({ vista: 1280 })])), 0, "todas las zonas estables y sin faltantes: exit 0");
  assert.equal(codigoDeSalida(informe([zona({ pixels: 1166, total: 100000 })])), 0, "una diferencia MEDIDA con la zona estable sigue siendo 0: es un resultado, no un error de la herramienta");
  assert.equal(codigoDeSalida(informe([zona({}), zona({ vista: 1280, estable: false })])), 2, "una zona que no es estable da 2 aunque su `pixels` sea 0: una medición que no se repite no se puede afirmar");
  assert.equal(codigoDeSalida(informe([zona({})], [{ zona: "gallery", vista: 375, donde: "las dos", selector: "#gallery" }])), 2, "una zona faltante sigue dando 2 (E2E-01)");
});
