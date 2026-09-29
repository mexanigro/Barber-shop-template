/**
 * IDIOMAS-01 (D11-1..D11-3) · guard de las filas `services.idiomas`, `staff.idiomas` y `testimonials.idiomas` de
 * verdad/contratos.json. Protege lo que la PÁGINA hace con el texto por idioma (D-76), no que se nombre: carga el
 * `src/config/site.ts` real con Vite (como tests/language-roundtrip.test.ts), aplica los fixtures A y C y mira `siteConfig`
 * en en, ru y ar:
 *   - la estructura (ids, precios, duración, modo, fotos, orden y cantidad) es la del idioma base, nunca la del preset;
 *   - el nombre y la frase de cada servicio salen de translations.en.services (y ru, ar) por id;
 *   - la especialidad de cada persona sale de translations.en.staff por id;
 *   - cada reseña con texto en translations.en.testimonials muestra esa traducción marcada (`translated`), conserva el
 *     original en `originalText` y no traduce el nombre de quien la escribió.
 *
 * Corre con: npx tsx --test tests/idiomas-cliente.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type ViteDevServer } from "vite";

process.env.VITE_ACTIVE_NICHE = "peluqueria";
process.env.VITE_UI_LANGUAGE = "he";
process.env.VITE_CLIENT_ID = "test-idiomas-cliente";

type Site = {
  siteConfig: Record<string, any>;
  applyTenantConfigOverride: (o: Record<string, unknown>) => void;
  switchSiteLanguage: (l: string) => void;
  switchSiteToNiche: (n: string, l?: string) => void;
};

let vite: ViteDevServer;
let site: Site;

before(async () => {
  vite = await createServer({
    configFile: false, root: process.cwd(), logLevel: "silent", appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  site = (await vite.ssrLoadModule("/src/config/site.ts")) as Site;
});
after(async () => { await vite.close(); });

const fixture = (p: string) => JSON.parse(readFileSync(`dev-fixtures/peluqueria-paleta-${p}.json`, "utf8")) as Record<string, any>;
const estructura = (c: Record<string, any>) => ({
  servicios: c.services.map((s: any) => [s.id, s.price, s.priceMax ?? null, s.duration, s.mode ?? null]),
  fotos: c.sections?.services?.images ?? null,
  equipo: c.staff.map((s: any) => [s.id, s.photoUrl]),
  resenas: c.testimonials.map((t: any) => [t.id, t.rating, t.name]),
});

for (const p of ["a", "c"]) {
  test(`fixture ${p.toUpperCase()}: en en, ru y ar la estructura es la del cliente y el texto sale de translations.en.services, translations.en.staff y translations.en.testimonials (y ru, ar) por id`, () => {
    const fx = fixture(p);
    site.switchSiteToNiche("peluqueria", "he");
    site.applyTenantConfigOverride(structuredClone(fx));
    const he = structuredClone(site.siteConfig);
    try {
      for (const l of ["en", "ru", "ar"]) {
        site.switchSiteLanguage(l);
        const c = site.siteConfig;
        const capa = fx.translations[l];
        assert.deepEqual(estructura(c), estructura(he), `${p}/${l}: estructura del cliente, nunca la del preset`);
        for (const s of c.services) {
          assert.equal(s.name, capa.services[s.id]?.name ?? he.services.find((x: any) => x.id === s.id).name, `${p}/${l}: services.${s.id}.name`);
          const base = fx.services.find((x: any) => x.id === s.id).description;
          if (base) assert.equal(s.description, capa.services[s.id]?.description ?? base, `${p}/${l}: services.${s.id}.description`);
          else assert.ok(!s.description, `${p}/${l}: services.${s.id} sin frase en el idioma base, tampoco en ${l}`);
        }
        for (const m of c.staff) assert.equal(m.specialty, capa.staff[m.id]?.specialty ?? he.staff.find((x: any) => x.id === m.id).specialty, `${p}/${l}: staff.${m.id}.specialty`);
        for (const t of c.testimonials) {
          const original = fx.testimonials.find((x: any) => x.id === t.id);
          const tr = capa.testimonials[t.id]?.text;
          assert.equal(t.text, tr ?? original.text, `${p}/${l}: testimonials.${t.id}.text`);
          assert.equal(t.translated, !!tr, `${p}/${l}: testimonials.${t.id} marcada como traducción sólo si la hay`);
          if (tr) assert.equal(t.originalText, original.text, `${p}/${l}: testimonials.${t.id} conserva el original`);
          assert.equal(t.name, original.name, `${p}/${l}: el nombre de quien escribió ${t.id} no se traduce`);
        }
      }
    } finally {
      site.switchSiteLanguage("he");
    }
  });
}
