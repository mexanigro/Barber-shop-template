// CONEXION-09 (D-94 a): guard de lo que PRESET-01 D-87 arregló y nadie vigilaba. El preset genérico de peluquería no trae cuenta de
// instagram (`sections.instagram.handle` y `.url` vacíos, D-86), y la sección tiene que seguir mostrando sus fotos sin pintar ningún
// enlace: antes pintaba ocho `<a href="">` —el «@» vacío, uno por foto y el botón de seguir—, que es un enlace roto en la web de
// cada cliente nuevo. La otra dirección también se mide: un nicho de la flota que SÍ trae cuenta sigue pintando su enlace.
// Fase `test:browser` (D-57): monta la página real con Vite en proceso y Chromium, como galeria-03 y modo-paleta.
import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
/** El nicho de la flota que se usa como «con cuenta»: su preset trae `sections.instagram.url` (barberia: @onyxandsteel). */
const CON_CUENTA = { niche: "barberia", url: "https://instagram.com/onyxandsteel" };

/** Lo que la sección de instagram de la página real pinta: sus fotos y sus enlaces. */
type Seccion = { hallada: boolean; imagenes: number; enlaces: { href: string; texto: string }[] };

/** Levanta Vite en proceso con el nicho y el fixture pedidos, abre la home y devuelve lo que pinta la sección de instagram. */
async function seccionInstagram(env: Record<string, string>): Promise<Seccion> {
  for (const [k, v] of Object.entries({ VITE_UI_LANGUAGE: "he", VITE_DEMO_MODE: "false", VITE_FIREBASE_API_KEY: "", VITE_HERO_CLIP: "", VITE_TENANT_FIXTURE: "", ...env })) process.env[k] = v;
  const { createServer } = await import("vite");
  const vite = await createServer({ configFile: resolve(ROOT, "vite.config.ts"), root: ROOT, server: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
  await vite.listen();
  const navegador = await chromium.launch();
  try {
    const page = await navegador.newPage();
    await page.goto(vite.resolvedUrls!.local[0], { waitUntil: "load" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);
    return await page.evaluate(() => {
      // La sección de instagram es la única con una rejilla de seis fotos cuadradas y el icono de la marca: se localiza por el
      // `alt` que el componente pone en cada foto («Instagram post N»), que no depende de que haya cuenta ni de la traducción.
      const fotos = [...document.querySelectorAll('img[alt^="Instagram post"]')];
      const seccion = fotos[0]?.closest("section") ?? null;
      if (!seccion) return { hallada: false, imagenes: 0, enlaces: [] as { href: string; texto: string }[] };
      return {
        hallada: true,
        imagenes: seccion.querySelectorAll('img[alt^="Instagram post"]').length,
        enlaces: [...seccion.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href") ?? "", texto: (a as HTMLElement).innerText.trim().slice(0, 40) })),
      };
    });
  } finally { await navegador.close(); await vite.close(); }
}

test("sin cuenta (el preset genérico de peluquería, fixture A) la sección de instagram pinta sus seis fotos y ningún enlace", async () => {
  const s = await seccionInstagram({ VITE_ACTIVE_NICHE: "peluqueria", VITE_TENANT_FIXTURE: "peluqueria-paleta-a" });
  assert.equal(s.hallada, true, "la sección de instagram se monta (sus fotos están en la página)");
  assert.equal(s.imagenes, 6, `pinta sus seis fotos (pinta ${s.imagenes})`);
  assert.deepEqual(s.enlaces, [], `y ningún <a>: ni el «@» vacío, ni uno por foto, ni el botón de seguir (hay ${JSON.stringify(s.enlaces)})`);
  for (const a of s.enlaces) {
    assert.notEqual(a.href, "", "ningún href vacío");
    assert.ok(!a.href.includes("instagram.com/"), "ningún enlace a una cuenta que el cliente no tiene");
  }
});

test(`con cuenta (${CON_CUENTA.niche}, un nicho de la flota cuyo preset trae sections.instagram.url) la misma sección sí pinta el enlace a esa cuenta de instagram`, async () => {
  const s = await seccionInstagram({ VITE_ACTIVE_NICHE: CON_CUENTA.niche });
  assert.equal(s.hallada, true, `la sección de instagram se monta en ${CON_CUENTA.niche}`);
  assert.ok(s.imagenes > 0, `pinta sus fotos (pinta ${s.imagenes})`);
  const aCuenta = s.enlaces.filter((a) => a.href === CON_CUENTA.url);
  assert.ok(aCuenta.length > 0, `pinta el enlace a ${CON_CUENTA.url} (hay ${JSON.stringify(s.enlaces.map((a) => a.href))})`);
  assert.deepEqual(s.enlaces.filter((a) => a.href === "").length, 0, "y ningún href vacío");
});
