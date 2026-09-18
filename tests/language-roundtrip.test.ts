/**
 * BLOQUE-04 · 4.2 — ida y vuelta de idioma con config de cliente (decisión B2-a).
 *
 * Carga el `src/config/site.ts` real con Vite (ssrLoadModule resuelve
 * `import.meta.env`), simula un `config/{id}` de un cliente peluquería en
 * hebreo y comprueba he→en→he y he→ar→he, con y sin capa `translations`:
 *   - idioma base (he): config completa del cliente;
 *   - otro idioma: estructura + translations[lang]; texto faltante del preset;
 *   - al volver a he nada del cliente se pierde;
 *   - `translations` nunca queda en la raíz de siteConfig.
 *
 * Corre con: npx tsx --test tests/language-roundtrip.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type ViteDevServer } from "vite";

process.env.VITE_ACTIVE_NICHE = "peluqueria";
process.env.VITE_UI_LANGUAGE = "he";
process.env.VITE_CLIENT_ID = "test-roundtrip";

type Site = {
  siteConfig: Record<string, any>;
  applyTenantConfigOverride: (o: Record<string, unknown>) => void;
  switchSiteLanguage: (l: "en" | "he" | "ru" | "ar") => void;
  switchSiteToNiche: (n: string, l?: string) => void;
};

let vite: ViteDevServer;
let site: Site;
let preset: Record<"en" | "he" | "ru" | "ar", Record<string, any>>;

const CLIENT_HE = {
  business: { type: "peluqueria" },
  brand: { name: "סטודיו בדיקה", tagline: "טאגליין של הלקוח" },
  hero: { titlePrefix: "הסטודיו", titleHighlight: "של הלקוח", titleSuffix: "ברמת גן", subtitle: "כותרת משנה של הלקוח" },
  services: [
    { id: "cut", name: "תספורת של הלקוח", description: "תיאור לקוח", duration: 50, price: 200 },
    { id: "blowdry", name: "פן של הלקוח", description: "תיאור לקוח", duration: 40, price: 90 },
  ],
  sections: { services: { title: "מה עושים", subtitle: "מחירון הלקוח", variant: "v3" }, faq: { title: "שאלות של הלקוח", subtitle: "", items: [{ question: "ש?", answer: "ת." }] } },
};

const LAYER_EN = {
  brand: { tagline: "Client tagline in English" },
  hero: { titleHighlight: "of the client", subtitle: "Client subtitle in English" },
  sections: { services: { subtitle: "Client price list" } },
};

function snapshot(s: Record<string, any>) {
  return {
    brandName: s.brand.name,
    tagline: s.brand.tagline,
    heroHighlight: s.hero.titleHighlight,
    heroSubtitle: s.hero.subtitle,
    services: s.services.map((x: any) => x.name),
    servicesSubtitle: s.sections.services.subtitle,
    servicesVariant: s.sections.services.variant,
    faqTitle: s.sections.faq.title,
  };
}

/** Preset limpio en `lang` sin override, para comparar. */
function presetSnapshot(lang: "en" | "he" | "ru" | "ar") {
  return snapshot(preset[lang]);
}

function fresh(override: Record<string, unknown>, firstLang: "en" | "he" | "ru" | "ar" = "he") {
  site.switchSiteToNiche("peluqueria", "he"); // limpia _tenantOverride y vuelve al preset he
  if (firstLang !== "he") site.switchSiteLanguage(firstLang); // main.tsx puede cambiar idioma antes del bootstrap
  site.applyTenantConfigOverride(structuredClone(override));
}

before(async () => {
  vite = await createServer({
    configFile: false, root: process.cwd(), logLevel: "silent", appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  site = (await vite.ssrLoadModule("/src/config/site.ts")) as Site;
  preset = {} as typeof preset;
  for (const l of ["en", "he", "ru", "ar"] as const) {
    site.switchSiteToNiche("peluqueria", l);
    preset[l] = structuredClone(site.siteConfig);
  }
});
after(async () => { await vite.close(); });

test("sin capa: he→en→he — en muestra preset en (estructura del cliente se conserva), he recupera todo el texto del cliente", () => {
  fresh(CLIENT_HE);
  const he0 = snapshot(site.siteConfig);
  assert.equal(he0.heroHighlight, "של הלקוח");
  assert.deepEqual(he0.services, ["תספורת של הלקוח", "פן של הלקוח"]);

  site.switchSiteLanguage("en");
  const en = snapshot(site.siteConfig);
  assert.equal(en.brandName, "סטודיו בדיקה", "brand.name es estructura: se conserva en todos los idiomas");
  assert.equal(en.servicesVariant, "v3", "la variante de sección es estructura: se conserva");
  assert.equal(en.heroHighlight, presetSnapshot("en").heroHighlight);
  assert.equal(en.tagline, presetSnapshot("en").tagline);
  assert.deepEqual(en.services, presetSnapshot("en").services);
  assert.equal(en.faqTitle, presetSnapshot("en").faqTitle);
  assert.equal(site.siteConfig.translations, undefined);

  site.switchSiteLanguage("he");
  assert.deepEqual(snapshot(site.siteConfig), he0, "al volver a he no se pierde texto del cliente");
});

test("sin capa: he→ar→he", () => {
  fresh(CLIENT_HE);
  const he0 = snapshot(site.siteConfig);
  site.switchSiteLanguage("ar");
  const ar = snapshot(site.siteConfig);
  assert.equal(ar.heroHighlight, presetSnapshot("ar").heroHighlight);
  assert.deepEqual(ar.services, presetSnapshot("ar").services);
  assert.equal(ar.brandName, "סטודיו בדיקה");
  site.switchSiteLanguage("he");
  assert.deepEqual(snapshot(site.siteConfig), he0);
});

test("con capa translations.en: en muestra la capa, ar el preset, he el cliente; translations nunca en la raíz", () => {
  fresh({ ...CLIENT_HE, translations: { en: LAYER_EN } });
  const he0 = snapshot(site.siteConfig);
  assert.equal(site.siteConfig.translations, undefined, "la raíz no lleva translations en el idioma base");
  assert.equal(he0.heroHighlight, "של הלקוח");

  site.switchSiteLanguage("en");
  const en = snapshot(site.siteConfig);
  assert.equal(en.heroHighlight, "of the client");
  assert.equal(en.heroSubtitle, "Client subtitle in English");
  assert.equal(en.tagline, "Client tagline in English");
  assert.equal(en.servicesSubtitle, "Client price list");
  assert.equal(en.heroHighlight !== presetSnapshot("en").heroHighlight, true);
  // lo que la capa no cubre viene del preset en, no del hebreo
  assert.deepEqual(en.services, presetSnapshot("en").services);
  assert.equal(en.faqTitle, presetSnapshot("en").faqTitle);
  assert.equal(site.siteConfig.translations, undefined);

  site.switchSiteLanguage("ar");
  const ar = snapshot(site.siteConfig);
  assert.equal(ar.heroHighlight, presetSnapshot("ar").heroHighlight, "sin capa ar → preset ar");
  assert.equal(ar.servicesSubtitle, presetSnapshot("ar").servicesSubtitle);
  assert.equal(site.siteConfig.translations, undefined);

  site.switchSiteLanguage("he");
  assert.deepEqual(snapshot(site.siteConfig), he0, "he→en→ar→he: el hebreo del cliente vuelve intacto");

  site.switchSiteLanguage("en");
  assert.equal(snapshot(site.siteConfig).heroHighlight, "of the client", "la capa en también vuelve intacta");
});

test("idioma cambiado antes del bootstrap (main.tsx con preferred_language=en): se aplica la capa en, no la raíz hebrea", () => {
  fresh({ ...CLIENT_HE, translations: { en: LAYER_EN } }, "en");
  const en = snapshot(site.siteConfig);
  assert.equal(en.heroHighlight, "of the client");
  assert.deepEqual(en.services, presetSnapshot("en").services, "los servicios en hebreo del cliente no se cuelan en la web inglesa");
  assert.equal(en.brandName, "סטודיו בדיקה");
  site.switchSiteLanguage("he");
  assert.equal(snapshot(site.siteConfig).heroHighlight, "של הלקוח");
  assert.deepEqual(snapshot(site.siteConfig).services, ["תספורת של הלקוח", "פן של הלקוח"]);
});

test("ningún idioma queda con texto vacío en hero/brand/servicios (cliente + capa)", () => {
  fresh({ ...CLIENT_HE, translations: { en: LAYER_EN } });
  for (const l of ["he", "en", "ru", "ar"] as const) {
    site.switchSiteLanguage(l);
    const s = snapshot(site.siteConfig);
    for (const [k, v] of Object.entries(s)) {
      if (Array.isArray(v)) { assert.ok(v.length > 0 && v.every((x) => typeof x === "string" && x.trim()), `${l}.${k}`); continue; }
      assert.ok(typeof v === "string" && v.trim(), `${l}.${k} vacío`);
    }
  }
});
