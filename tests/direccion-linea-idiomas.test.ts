/**
 * CONTACTO-PIE-01 (D-205, inciso v) · guard de las filas `contact.address.idiomas` y `brand.tagline.idiomas` de verdad/contratos.json.
 * Protege lo que la PÁGINA hace con la dirección (`translations.<lang>.contact.address`) y la línea de la marca
 * (`translations.<lang>.brand.tagline`) en otro idioma (D-76), no que se nombren: carga el `src/config/site.ts` real con Vite (como
 * tests/idiomas-cliente.test.ts), aplica los fixtures A y C y mira `siteConfig`, y pinta contacto v6 con `renderToString`:
 *   - en en, ru y ar la dirección es la de la capa de ese idioma (la tarjeta de horarios y el mapa la muestran) y la línea de la marca
 *     es la de la capa; al volver al idioma base, las de la raíz;
 *   - la otra dirección: sin la capa, la dirección es la del idioma base y la línea de la marca la del nicho en ese idioma (nunca la
 *     de la raíz, que es texto en el idioma base).
 *
 * Corre con: npx tsx --test tests/direccion-linea-idiomas.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type ViteDevServer } from "vite";

process.env.VITE_ACTIVE_NICHE = "peluqueria";
process.env.VITE_UI_LANGUAGE = "he";
process.env.VITE_CLIENT_ID = "test-direccion-linea";

type Site = {
  siteConfig: Record<string, any>;
  applyTenantConfigOverride: (o: Record<string, unknown>) => void;
  switchSiteLanguage: (l: string) => void;
  switchSiteToNiche: (n: string, l?: string) => void;
};

let vite: ViteDevServer;
let site: Site;
let pintar: () => Promise<string>;
let pintarAcerca: () => Promise<string>;

before(async () => {
  vite = await createServer({
    configFile: false, root: process.cwd(), logLevel: "silent", appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  site = (await vite.ssrLoadModule("/src/config/site.ts")) as Site;
  const SERVIDOR = "react-dom/server"; // en una variable: T no tiene sus tipos
  // react y react-dom/server por Node (Vite los externaliza en SSR: el componente usa el mismo React)
  const { renderToString } = (await import(SERVIDOR)) as unknown as { renderToString: (n: unknown) => string };
  const { createElement } = (await import("react")) as unknown as { createElement: (c: unknown, p?: Record<string, unknown>) => unknown };
  pintar = async () => renderToString(createElement(((await vite.ssrLoadModule("/src/components/landing/contact/contact-v6.tsx")) as { ContactV6: unknown }).ContactV6));
  // CIERRE-TRAMO-01 (D-219): «sobre nosotros» pinta brand.description (y el SEO la pone en la meta descripción, useSEO.ts).
  const nada = () => {};
  pintarAcerca = async () => renderToString(createElement(((await vite.ssrLoadModule("/src/components/about/AboutPage.tsx")) as { AboutPage: unknown }).AboutPage, { onBack: nada, onBookClick: nada }));
});
after(async () => { await vite.close(); });

const fixture = (p: string) => JSON.parse(readFileSync(`dev-fixtures/peluqueria-paleta-${p}.json`, "utf8")) as Record<string, any>;
const unir = (a: Record<string, string> | undefined) => [a?.street, a?.district, a?.cityStateZip].map((x) => (x || "").trim()).filter(Boolean).join(", ");
const texto = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const dirEnPagina = (html: string) => html.match(/<p class="ubi6-dir">([^<]*)<\/p>/)?.[1]?.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&") ?? null;

for (const p of ["a", "c"]) {
  test(`fixture ${p.toUpperCase()}: en en, ru y ar contact.address y brand.tagline salen de la capa del idioma (translations.<lang>.contact.address, translations.<lang>.brand.tagline) y contacto v6 pinta esa dirección; al volver al idioma base, las de la raíz`, async () => {
    const fx = fixture(p);
    site.switchSiteToNiche("peluqueria", "he");
    site.applyTenantConfigOverride(structuredClone(fx));
    try {
      for (const l of ["en", "ru", "ar"]) {
        site.switchSiteLanguage(l);
        const capa = fx.translations[l];
        assert.ok(capa?.contact?.address?.street && capa?.brand?.tagline, `precondición: el fixture ${p} trae la dirección y la línea en ${l}`);
        assert.deepEqual(site.siteConfig.contact.address, { ...fx.contact.address, ...capa.contact.address }, `${p} ${l}: la dirección (address) de la capa`);
        assert.equal(site.siteConfig.brand.tagline, capa.brand.tagline, `${p} ${l}: la línea de la marca (tagline) de la capa`);
        assert.equal(site.siteConfig.contact.phone, fx.contact.phone, `${p} ${l}: el resto del contacto sigue siendo el de la raíz`);
        assert.equal(dirEnPagina(await pintar()), unir(capa.contact.address), `${p} ${l}: contacto v6 muestra la dirección en ${l}`);
      }
      site.switchSiteLanguage("he");
      assert.deepEqual(site.siteConfig.contact.address, fx.contact.address, `${p} he: la dirección de la raíz`);
      assert.equal(site.siteConfig.brand.tagline, fx.brand.tagline, `${p} he: la línea de la raíz`);
      assert.equal(dirEnPagina(await pintar()), unir(fx.contact.address), `${p} he: contacto v6 muestra la dirección de la raíz`);
    } finally { site.switchSiteLanguage("he"); }
  });

  test(`fixture ${p.toUpperCase()} sin la capa de dirección ni de línea: en en, ru y ar la dirección (address) es la del idioma base y la línea (tagline) la del nicho en ese idioma, nunca la de la raíz`, async () => {
    const fx = fixture(p);
    for (const l of ["en", "ru", "ar"]) { delete fx.translations[l].contact; delete fx.translations[l].brand; }
    site.switchSiteToNiche("peluqueria", "he");
    site.applyTenantConfigOverride(structuredClone(fx));
    try {
      for (const l of ["en", "ru", "ar"]) {
        site.switchSiteToNiche("peluqueria", l);
        const delNicho = site.siteConfig.brand.tagline;
        site.switchSiteToNiche("peluqueria", "he");
        site.applyTenantConfigOverride(structuredClone(fx));
        site.switchSiteLanguage(l);
        assert.deepEqual(site.siteConfig.contact.address, fx.contact.address, `${p} ${l}: sin capa, la dirección del idioma base`);
        assert.equal(dirEnPagina(await pintar()), unir(fx.contact.address), `${p} ${l}: contacto v6 muestra la del idioma base`);
        assert.equal(site.siteConfig.brand.tagline, delNicho, `${p} ${l}: sin capa, la línea del nicho en ${l}`);
        assert.notEqual(site.siteConfig.brand.tagline, fx.brand.tagline, `${p} ${l}: nunca la línea de la raíz (en el idioma base)`);
      }
    } finally { site.switchSiteLanguage("he"); }
  });

  test(`fixture ${p.toUpperCase()}: brand.description en en, ru y ar es la de la capa (translations.<lang>.brand.description) y «sobre nosotros» la pinta; sin la capa, la description del nicho en ese idioma, nunca la de la raíz`, async () => {
    const fx = fixture(p);
    site.switchSiteToNiche("peluqueria", "he");
    site.applyTenantConfigOverride(structuredClone(fx));
    try {
      for (const l of ["en", "ru", "ar"]) {
        site.switchSiteLanguage(l);
        const d = fx.translations[l]?.brand?.description;
        assert.ok(d && fx.brand.description, `precondición: el fixture ${p} trae la descripción en la raíz y en ${l}`);
        assert.equal(site.siteConfig.brand.description, d, `${p} ${l}: la descripción (description) de la capa`);
        assert.ok(texto(await pintarAcerca()).includes(d), `${p} ${l}: «sobre nosotros» pinta la descripción en ${l}`);
      }
      site.switchSiteLanguage("he");
      assert.equal(site.siteConfig.brand.description, fx.brand.description, `${p} he: la descripción de la raíz`);
      assert.ok(texto(await pintarAcerca()).includes(fx.brand.description), `${p} he: «sobre nosotros» pinta la de la raíz`);
    } finally { site.switchSiteLanguage("he"); }
    // La otra dirección: sin la capa, la del nicho en ese idioma (la de la raíz es texto en el idioma base).
    const sin = fixture(p);
    for (const l of ["en", "ru", "ar"]) delete sin.translations[l].brand?.description;
    try {
      for (const l of ["en", "ru", "ar"]) {
        site.switchSiteToNiche("peluqueria", l);
        const delNicho = site.siteConfig.brand.description;
        assert.ok(typeof delNicho === "string" && delNicho.trim(), `precondición: el nicho trae su descripción en ${l}`);
        site.switchSiteToNiche("peluqueria", "he");
        site.applyTenantConfigOverride(structuredClone(sin));
        site.switchSiteLanguage(l);
        assert.equal(site.siteConfig.brand.description, delNicho, `${p} ${l}: sin capa, la descripción del nicho en ${l}`);
        assert.notEqual(site.siteConfig.brand.description, sin.brand.description, `${p} ${l}: nunca la descripción de la raíz`);
      }
    } finally { site.switchSiteLanguage("he"); }
  });
}
