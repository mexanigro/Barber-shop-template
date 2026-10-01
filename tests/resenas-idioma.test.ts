/**
 * TEAM-RESENAS-01 (D-182, D-145) · guard de la fila `testimonials.lang` de verdad/contratos.json. Protege lo que la PÁGINA hace con
 * `testimonials[].lang` —el idioma en que se escribió la reseña— (D-76), no que se nombre: carga el `src/config/site.ts` real con
 * Vite (como tests/idiomas-cliente.test.ts) sobre el fixture A, con la primera reseña escrita en inglés (`lang: "en"`):
 *   - en la página en inglés esa reseña NO es una traducción: se pinta su texto, sin marca (D11-3);
 *   - en la página en ruso es una traducción del inglés (`originalLang` "en"), y las demás del hebreo;
 *   - y lo que pintan las variantes sin nota (D-130, `src/lib/resena-original.ts`): el original con su lang, nunca la traducción.
 *
 * Corre con: npx tsx --test tests/resenas-idioma.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type ViteDevServer } from "vite";
import { langResena, textoResena } from "../src/lib/resena-original";

process.env.VITE_ACTIVE_NICHE = "peluqueria";
process.env.VITE_UI_LANGUAGE = "he";
process.env.VITE_CLIENT_ID = "test-resenas-idioma";

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

test("testimonials[].lang: una reseña escrita en inglés no se marca como traducción en la página en inglés y sí en la rusa (originalLang en), y las variantes sin nota pintan su original con ese lang", () => {
  const fx = JSON.parse(readFileSync("dev-fixtures/peluqueria-paleta-a.json", "utf8")) as Record<string, any>;
  assert.ok(fx.testimonials.every((t: any) => t.lang === "he"), "precondición: el fixture A trae lang en cada reseña");
  fx.testimonials[0] = { ...fx.testimonials[0], lang: "en", text: "Worth every shekel." };
  site.switchSiteToNiche("peluqueria", "he");
  site.applyTenantConfigOverride(structuredClone(fx));
  try {
    site.switchSiteLanguage("en");
    const en = site.siteConfig.testimonials;
    assert.deepEqual([en[0].translated, en[0].text, en[0].originalLang], [false, "Worth every shekel.", "en"], "en: la escrita en inglés se pinta tal cual, sin marca de traducción");
    assert.ok(en.slice(1).every((t: any) => t.translated && t.originalLang === "he"), "en: las demás son traducción del hebreo");

    site.switchSiteLanguage("ru");
    const ru = site.siteConfig.testimonials;
    assert.deepEqual([ru[0].translated, ru[0].originalLang], [true, "en"], "ru: la primera es una traducción del inglés");
    assert.equal(textoResena(ru[0]), "Worth every shekel.", "ru: las variantes sin nota pintan el original inglés");
    assert.equal(langResena(ru[0]), "en", "ru: con lang en");
    assert.ok(ru.slice(1).every((t: any) => !t.translated || (textoResena(t) === t.originalText && langResena(t) === "he")), "ru: las traducidas del hebreo se pintan en hebreo con lang he");
  } finally {
    site.switchSiteLanguage("he");
  }
});
