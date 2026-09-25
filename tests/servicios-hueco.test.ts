// ARREGLOS-01 (2026-09-25, D-109) · guard del hueco `""` en `sections.services.images`.
//
// Desde E2E-01 el hub CONSERVA los huecos de esa lista, porque su índice aparea con `services[i]`; y `src/config/site.ts` ya los
// producía por su cuenta al filtrar por `visibleServices` (`allImages[idx] ?? ""`). Medido el 2026-09-25: once de los dieciséis
// lectores de T pintaban entonces una `<img>` SIN atributo `src` —React descarta `src=""` al serializar, y el navegador resuelve
// una `<img>` sin `src` pidiendo la página entera como imagen—, con el aviso «An empty string ("") was passed to the src
// attribute» por `console.error`.
//
// Qué vigila: lo que cada componente HACE con la lista (D-76), en las dos direcciones. CON el hueco, ninguna `<img>` sin `src` y
// ningún aviso; SIN el hueco, los dieciséis siguen pintando sus fotos — el arreglo no puede ser «no pintar nunca». Y no hay un
// lector diecisiete escondido. Caja negra: los componentes se importan con el cargador de `_comun.ts` (no se lee su fuente) y
// `siteConfig` se muta en memoria y se restaura. No escribe un solo byte. Corre en `test:unit` (D-57): sin navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { format } from "node:util";
import { ROOT, importarModulo } from "./orden/e2e-01/_comun.ts";

/** Los dieciséis componentes de T que pintan la lista, con el nombre que exportan (medido 2026-09-25). */
const LECTORES: [string, string][] = [
  ["src/components/landing/aura/aura-services.tsx", "AuraServices"],
  ["src/components/landing/hero/estetica/hero-v4.tsx", "EsteticaHeroV4"],
  ["src/components/landing/services/estetica/services-v2.tsx", "EsteticaServicesV2"],
  ["src/components/landing/services/estetica/services-v3.tsx", "EsteticaServicesV3"],
  ["src/components/landing/services/estetica/services-v4.tsx", "EsteticaServicesV4"],
  ["src/components/landing/services/estetica/services-v5.tsx", "EsteticaServicesV5"],
  ["src/components/landing/services/services-v2.tsx", "ServicesV2"],
  ["src/components/landing/services/services-v3.tsx", "ServicesV3"],
  ["src/components/landing/services/services-v4.tsx", "ServicesV4"],
  ["src/components/landing/services/services-v5.tsx", "ServicesV5"],
  ["src/components/landing/services/services-v6.tsx", "ServicesV6"],
  ["src/components/landing/services-card-stack-tabs.tsx", "ServicesCardStackTabs"],
  ["src/components/landing/services-treatment-card-grid.tsx", "ServicesTreatmentCardGrid"],
  ["src/components/landing/Services.tsx", "Services"],
  ["src/components/services/services-page-v6.tsx", "ServicesPageV6"],
  ["src/components/services/ServicesPage.tsx", "ServicesPage"],
];
/** Los dos archivos que nombran la lista sin pintarla: `site.ts` es quien PRODUCE el hueco y `types.ts` sólo la declara. */
const SIN_PINTAR = ["src/config/site.ts", "src/types.ts"];
/** Las manijas que la página le pasa a una sección de servicios; ninguna se llama en el render del servidor. */
const PROPS: Record<string, unknown> = { onBookClick: () => {}, onNavigateToServices: undefined, onBack: () => {}, onNavigateHome: () => {} };
const AVISO_REACT = 'An empty string ("") was passed to the src attribute';

const imagenes = (html: string) => [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
const conSrc = (tag: string) => / src="[^"]+"/.test(tag);

/** Todos los `.ts`/`.tsx` de `src/` menos los presets, que son datos. */
function archivosDeSrc(): string[] {
  const out: string[] = [];
  const anda = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) { anda(abs); continue; }
      if (!/\.tsx?$/.test(e.name)) continue;
      const rel = relative(ROOT, abs).replace(/\\/g, "/");
      if (rel.startsWith("src/config/presets/")) continue;
      out.push(rel);
    }
  };
  anda(resolve(ROOT, "src"));
  return out.sort();
}

test("un hueco «\"\"» en sections.services.images no llega a ningún `src`: con el hueco ningún lector pinta una <img> sin src ni avisa, con la lista completa los dieciséis pintan sus fotos, y no hay un lector diecisiete", async () => {
  for (const [rel] of LECTORES) assert.ok(existsSync(resolve(ROOT, rel)), `precondición: existe ${rel}`);
  // El servidor de React no trae @types en T: el especificador va por variable para que el import dinámico no exija su declaración.
  const SERVIDOR = "react-dom/server";
  const { renderToString } = (await import(SERVIDOR)) as { renderToString: (n: unknown) => string };
  const { createElement } = await import("react");
  const site = await importarModulo("src/config/site.ts");
  const cfg = site.siteConfig as { sections: { services: { images: string[] } } };
  const original = cfg.sections.services.images.slice();
  assert.ok(original.length >= 2 && original.every((u) => typeof u === "string" && u), `precondición: el config por defecto trae la lista completa (${original.length} fotos)`);

  /** Monta un componente y devuelve sus `<img>` y los avisos de React que salieron por console.error. */
  const montar = async (rel: string, exporta: string) => {
    const mod = await importarModulo(rel);
    const C = mod[exporta];
    assert.equal(typeof C, "function", `${rel} debe exportar el componente «${exporta}»`);
    const avisos: string[] = [];
    const antes = console.error;
    // `format` de node:util, que es con lo que console.error arma el mensaje: React manda «…passed to the %s attribute» y «src»
    // por separado, así que sin sustituir el %s el literal del aviso no aparecería nunca.
    console.error = (...a: unknown[]) => { avisos.push(format(...(a as [unknown]))); };
    let html = "";
    try { html = renderToString(createElement(C as never, PROPS as never)); }
    finally { console.error = antes; }
    const tags = imagenes(html);
    return { tags, sinSrc: tags.filter((t) => !conSrc(t)), avisos: avisos.filter((a) => a.includes(AVISO_REACT)) };
  };

  try {
    // (1) CON el hueco: ninguna `<img>` sin `src` y ningún aviso de React.
    cfg.sections.services.images = original.slice();
    cfg.sections.services.images[0] = "";
    cfg.sections.services.images[1] = "";
    const rotos: string[] = [];
    for (const [rel, exporta] of LECTORES) {
      const { sinSrc, avisos } = await montar(rel, exporta);
      if (sinSrc.length || avisos.length) rotos.push(`${rel}: ${sinSrc.length} <img> sin src, ${avisos.length} avisos de React`);
    }
    assert.deepEqual(rotos, [], `con el hueco «""» ningún lector puede pintar una <img> sin src:\n  ${rotos.join("\n  ")}`);

    // (2) SIN el hueco: los mismos componentes SÍ pintan la foto — el arreglo no puede ser «no pintar nunca».
    cfg.sections.services.images = original.slice();
    const mudos: string[] = [];
    for (const [rel, exporta] of LECTORES) {
      const { tags, sinSrc, avisos } = await montar(rel, exporta);
      if (!tags.length || sinSrc.length || avisos.length) mudos.push(`${rel}: ${tags.length} <img>, ${sinSrc.length} sin src, ${avisos.length} avisos`);
    }
    assert.deepEqual(mudos, [], `con la lista completa los dieciséis lectores pintan sus fotos:\n  ${mudos.join("\n  ")}`);
  } finally {
    cfg.sections.services.images = original;
  }

  // (3) Y no hay un lector diecisiete escondido.
  const declarados = new Set([...LECTORES.map(([r]) => r), ...SIN_PINTAR]);
  const candidatos = archivosDeSrc().filter((rel) => {
    const src = readFileSync(resolve(ROOT, rel), "utf8");
    return /\.images\b/.test(src) && /services/i.test(src);
  });
  assert.deepEqual(candidatos.filter((r) => !declarados.has(r)), [], "hay un lector de la lista de fotos de servicios que este guard no monta: agregalo a LECTORES (o a SIN_PINTAR si no la pinta)");
});
