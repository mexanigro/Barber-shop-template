// ARREGLOS-03 · C1 (T) · `e2e.mjs` guarda lo que difiere. Sesión A (2026-09-30): test rojo.
//
// Hoy, sin `--out`, `tools/verdad/e2e.mjs:497–499` borra en `finally` toda su carpeta: la zona que difiere se pierde (la caída de
// D2 dentro del push de B de IDIOMAS-01 no dejó zona, vista ni px; 4.3.md, «Cierre de B2»). D-153: sin `--out`, si una zona mide
// píxeles distintos, no es estable o falta, `e2e.mjs` deja `informe.json` y los PNG de los dos lados de esa zona en una carpeta
// NUEVA dentro de `$E2E_CONSERVAR` (por defecto `C:/Users/liama/Desktop/Nichos/e2e-diferencias`), FUERA del directorio temporal
// —que `rojo-verde` borra y cuenta como resto (D-53)—, e imprime «diferencias guardadas en <ruta>»; una corrida limpia no deja nada.
// Cómo se mide, sin las webs: el modo `--desplegada <url> --referencia <url>` (sin `--web`) compara dos páginas con la misma
// medición, sin el registro ni el build. Cuatro páginas servidas por este proceso en 127.0.0.1 (puerto 0), como
// `tests/e2e-estable.test.ts`: igual, distinta, inestable (un color que cambia cada 16 ms) y sin `#hero`. Este test NUNCA pasa
// `--web`: el `e2e.mjs` de hoy sale 2 con el uso, sin tocar la red — aquí está el rojo. `e2e.mjs` corre ASÍNCRONO (un `spawnSync`
// bloquearía a los servidores de este proceso), con `E2E_CONSERVAR` y `TEMP` dentro de la carpeta temporal del test. Sólo en T.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { isAbsolute, join, relative } from "node:path";
import { conTemporalAsync, correrNodeAsync, entornoLimpio, entradas, subcarpeta } from "./_comun.ts";

const E2E = "tools/verdad/e2e.mjs";
/** Una página con lo que `e2e.mjs` necesita: `:root` con los tokens (la referencia «levantó», D-125) y `#hero` dentro de `main`. */
const pagina = (hero: string, script = "") => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>arreglos-03</title><style>
:root { --surface: #ffffff; --text: #111111; --accent: #aa3300; --accent-strong: #882200; --font-sans: sans-serif; --font-serif: serif; }
body { margin: 0; background: #ffffff; }
#hero { width: 300px; height: 200px; background: #eeeeee; position: relative; }
#hero b { position: absolute; left: 20px; top: 20px; width: 60px; height: 60px; background: #1144aa; }
</style></head><body><main id="main-content">${hero}</main>${script}</body></html>`;
const PAGINAS: Record<string, string> = {
  igual: pagina(`<section id="hero"><b></b></section>`),
  distinta: pagina(`<section id="hero"><b style="background:#aa1144"></b></section>`),
  inestable: pagina(`<section id="hero"><b></b></section>`, `<script>const b = document.querySelector("#hero b"); setInterval(() => { b.style.background = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"); }, 16);</script>`),
  "sin-hero": pagina(`<p>sin hero</p>`),
};

/** Sirve cada página en /<nombre>/ en 127.0.0.1 con el puerto que dé el sistema; devuelve la url base de cada una y cómo cerrar. */
async function servir(): Promise<{ url: (nombre: string) => string; cerrar: () => Promise<void> }> {
  const s = createServer((req, res) => {
    const nombre = decodeURIComponent((req.url ?? "/").split("?")[0]).split("/").filter(Boolean)[0] ?? "";
    const html = PAGINAS[nombre];
    if (!html || !(req.url ?? "").split("?")[0].endsWith("/")) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise<void>((ok) => s.listen(0, "127.0.0.1", ok));
  const puerto = (s.address() as AddressInfo).port;
  return { url: (n) => `http://127.0.0.1:${puerto}/${n}`, cerrar: () => new Promise((ok) => s.close(() => ok())) };
}

/** La ruta que `e2e.mjs` imprime tras «diferencias guardadas en », o null. */
const guardadaEn = (out: string) => out.match(/diferencias guardadas en (.+?)\s*$/m)?.[1]?.trim() ?? null;
/** ¿`hija` está dentro de `padre`? */
const dentro = (padre: string, hija: string) => { const r = relative(padre, hija); return r !== "" && !r.startsWith("..") && !isAbsolute(r); };

test("`e2e.mjs --desplegada <url> --referencia <url>` compara esas dos páginas sin el registro ni el build; sin `--out`, cuando una zona mide píxeles distintos, no es estable o falta, deja `informe.json` y los PNG de los dos lados de esa zona en una carpeta nueva dentro de `$E2E_CONSERVAR`, fuera del directorio temporal, e imprime «diferencias guardadas en <ruta>», con el exit de siempre; y una corrida sin diferencias no deja nada, ni ahí ni en el directorio temporal", async () => {
  const web = await servir();
  try {
    await conTemporalAsync(async (base) => {
      let n = 0;
      /** Una corrida de `e2e.mjs` con su propio `E2E_CONSERVAR` y su propio `TEMP`, ambos vacíos al empezar. */
      const correr = async (desplegada: string, referencia: string) => {
        n++;
        const conservar = subcarpeta(base, `conservar-${n}`), tmp = subcarpeta(base, `tmp-${n}`);
        const r = await correrNodeAsync([E2E, "--desplegada", web.url(desplegada), "--referencia", web.url(referencia), "--zonas", "hero", "--vistas", "375"], {
          env: entornoLimpio({ E2E_CONSERVAR: conservar, TEMP: tmp, TMP: tmp, TMPDIR: tmp }), minutos: 5,
        });
        return { r, conservar, tmp, nombre: `${desplegada} vs ${referencia}` };
      };
      /** Lo que la corrida dejó guardado: la carpeta impresa, dentro de `conservar`, fuera de `tmp`, con su informe. */
      const guardado = (c: Awaited<ReturnType<typeof correr>>) => {
        const ruta = guardadaEn(c.r.out);
        assert.ok(ruta, `${c.nombre}: imprime «diferencias guardadas en <ruta>»\n${c.r.out.slice(-2000)}`);
        assert.ok(existsSync(ruta) && dentro(c.conservar, ruta), `${c.nombre}: la carpeta (${ruta}) existe al terminar y está dentro de $E2E_CONSERVAR (${c.conservar})`);
        assert.ok(!dentro(c.tmp, ruta), `${c.nombre}: la carpeta no está en el directorio temporal`);
        assert.deepEqual(entradas(c.tmp), [], `${c.nombre}: el directorio temporal queda vacío`);
        const inf = join(ruta, "informe.json");
        assert.ok(existsSync(inf), `${c.nombre}: la carpeta trae informe.json (tiene: ${readdirSync(ruta).join(", ")})`);
        return { ruta, informe: JSON.parse(readFileSync(inf, "utf8")) as { zonas?: any[]; faltantes?: any[] } };
      };
      const pngsDeHero = (ruta: string) => readdirSync(ruta).filter((f) => f.endsWith(".png") && f.includes("hero"));

      // (1) Igual contra igual: sale 0 y no deja nada. Hoy `e2e.mjs` no conoce --desplegada/--referencia y sale 2 con el uso, sin
      //     tocar la red: aquí está el rojo.
      const limpia = await correr("igual", "igual");
      assert.equal(limpia.r.status, 0, `${limpia.nombre}: dos páginas iguales tienen que salir 0 (salió ${limpia.r.status})\n${limpia.r.out.slice(-2000)}`);
      assert.equal(guardadaEn(limpia.r.out), null, `${limpia.nombre}: sin diferencias no guarda nada`);
      assert.deepEqual(entradas(limpia.conservar), [], `${limpia.nombre}: $E2E_CONSERVAR queda vacío`);
      assert.deepEqual(entradas(limpia.tmp), [], `${limpia.nombre}: el directorio temporal queda vacío`);

      // (2) Una diferencia medida (estable): exit 0 como siempre, y queda guardada con los PNG de los dos lados.
      const dist = await correr("distinta", "igual");
      assert.equal(dist.r.status, 0, `${dist.nombre}: una diferencia medida con la zona estable sigue saliendo 0 (salió ${dist.r.status})\n${dist.r.out.slice(-2000)}`);
      const g2 = guardado(dist);
      const hero2 = (g2.informe.zonas ?? []).find((z) => z.zona === "hero");
      assert.ok(hero2 && hero2.pixels > 0 && hero2.estable === true, `${dist.nombre}: el informe guardado trae la zona hero con píxeles distintos y estable (${JSON.stringify(hero2)})`);
      assert.ok(pngsDeHero(g2.ruta).length >= 2, `${dist.nombre}: los PNG de los dos lados de hero (hay: ${readdirSync(g2.ruta).join(", ")})`);

      // (3) Una zona que no es estable: exit 2 como siempre, y queda guardada.
      const ines = await correr("inestable", "igual");
      assert.equal(ines.r.status, 2, `${ines.nombre}: una zona que no se repite a sí misma sale 2 (salió ${ines.r.status})\n${ines.r.out.slice(-2000)}`);
      const g3 = guardado(ines);
      const hero3 = (g3.informe.zonas ?? []).find((z) => z.zona === "hero");
      assert.ok(hero3 && hero3.estable === false, `${ines.nombre}: el informe guardado trae hero no estable (${JSON.stringify(hero3)})`);
      assert.ok(pngsDeHero(g3.ruta).length >= 2, `${ines.nombre}: los PNG de los dos lados de hero (hay: ${readdirSync(g3.ruta).join(", ")})`);

      // (4) Una zona que falta: exit 2 como siempre, y el informe guardado la nombra.
      const falta = await correr("sin-hero", "igual");
      assert.equal(falta.r.status, 2, `${falta.nombre}: una zona faltante sale 2 (salió ${falta.r.status})\n${falta.r.out.slice(-2000)}`);
      const g4 = guardado(falta);
      assert.ok((g4.informe.faltantes ?? []).some((f) => f.zona === "hero"), `${falta.nombre}: el informe guardado nombra la zona hero como faltante (${JSON.stringify(g4.informe.faltantes)})`);
    });
  } finally {
    await web.cerrar();
  }
});
