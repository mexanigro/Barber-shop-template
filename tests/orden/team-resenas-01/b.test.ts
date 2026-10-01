// TEAM-RESENAS-01 · B4, C3 (T) · sin navegador. Sesión A (2026-10-01): tests rojos.
//
// B4 · D-130 en las variantes de reseñas que no son la de peluquería. Desde IDIOMAS-01 el overlay entrega cada reseña traducida como
// `{ text: <traducción>, originalText: <original>, originalLang, translated: true }` y sólo reseñas v1 pinta el original (IDIOMAS-01
// B1). Medido por A el 2026-10-01 (leído y montado): `testimonials-v2..v5` (familia base), `aura-testimonials` y `why-choose-us-v5`
// pintan `review.text`, o sea la traducción sin ninguna marca, que es lo que D-130 prohíbe. Liam (2026-10-01, D-177): las cuatro de
// `testimonials/estetica/` quedan fuera (candado de la flota; van a FLOTA-01). Lo que se pide es lo que hace v1: de cada reseña
// marcada `translated`, el `originalText` con su `lang`, nunca la traducción sin marcar; y sin traducción, el texto de siempre.
// C3 · `testimonials[].lang` (D-145) con sus cinco lugares: la fila de `verdad/contratos.json` y `hueco.mjs --id` en verde.
// Caja negra: los componentes con el cargador de `_comun.ts` (`siteConfig` se muta en memoria y se restaura) y `hueco.mjs` como
// proceso. Sólo en T (inciso n). No escribe nada. Fase `test:unit` cuando se promueva (no abre navegador).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, correrNode, entornoLimpio, importarModulo } from "./_comun.ts";

type Cfg = Record<string, any>;
/** Las variantes que pintan el texto de una reseña y entran en esta orden (D-157, D-177), con lo que exportan. */
const VARIANTES: [string, string][] = [
  ["src/components/landing/testimonials/testimonials-v2.tsx", "TestimonialsV2"],
  ["src/components/landing/testimonials/testimonials-v3.tsx", "TestimonialsV3"],
  ["src/components/landing/testimonials/testimonials-v4.tsx", "TestimonialsV4"],
  ["src/components/landing/testimonials/testimonials-v5.tsx", "TestimonialsV5"],
  ["src/components/landing/aura/aura-testimonials.tsx", "AuraTestimonials"],
  ["src/components/landing/why-choose-us/why-choose-us-v5.tsx", "WhyChooseUsV5"],
];
const ORIGINAL = "ORIGINAL-עברית-שווה";
const TRADUCCION = "TRANSLATION-worth-it";
const lectura = (html: string) => html.replace(/<!--.*?-->/g, "");

test("`testimonials-v2..v5` (familia base), `aura-testimonials` y `why-choose-us-v5` pintan, de cada reseña marcada `translated`, su `originalText` con su `lang` y no la traducción —ninguna muestra una traducción sin marcar (D-130)—, y sin traducción pintan el texto de siempre", async () => {
  const SERVIDOR = "react-dom/server";
  const { renderToString } = (await import(SERVIDOR)) as { renderToString: (n: unknown) => string };
  const { createElement } = await import("react");
  const site = await importarModulo("src/config/site.ts");
  const cfg = site.siteConfig as Cfg;
  const antes = cfg.testimonials;
  const resena = (traducida: boolean): Cfg => traducida
    ? { id: "r1", name: "יעל ב.", title: "Client", rating: 5, text: TRADUCCION, originalText: ORIGINAL, originalLang: "he", translated: true }
    : { id: "r1", name: "יעל ב.", title: "Client", rating: 5, text: ORIGINAL, originalLang: "he", translated: false };
  const montar = async (rel: string, exporta: string, r: Cfg) => {
    cfg.testimonials = [r, { ...r, id: "r2", name: "מיכל ר." }];
    const C = (await importarModulo(rel))[exporta];
    assert.equal(typeof C, "function", `${rel} exporta ${exporta}`);
    return lectura(renderToString(createElement(C as never, {} as never)));
  };
  try {
    // (1) Traducida: ninguna variante pinta la traducción; todas pintan el original con su idioma. Hoy pintan la traducción.
    const malas: string[] = [];
    for (const [rel, exporta] of VARIANTES) {
      const html = await montar(rel, exporta, resena(true));
      if (html.includes(TRADUCCION)) malas.push(`${rel}: pinta la traducción sin marcar`);
      else if (!html.includes(ORIGINAL)) malas.push(`${rel}: no pinta el original`);
      else if (!html.includes(`lang="he"`)) malas.push(`${rel}: el original sin lang="he"`);
    }
    assert.deepEqual(malas, [], `D-130: ninguna variante muestra una traducción sin marcar:\n  ${malas.join("\n  ")}`);
    // (2) Sin traducción: el texto de siempre.
    for (const [rel, exporta] of VARIANTES) assert.ok((await montar(rel, exporta, resena(false))).includes(ORIGINAL), `${rel}: sin traducción pinta el texto de la reseña`);
  } finally {
    cfg.testimonials = antes;
  }
});

test("`testimonials[].lang` tiene sus cinco lugares: `verdad/contratos.json` declara la fila `testimonials.lang` (ruta `testimonials[].lang`, validador `validateIdiomaResenas`, casilla de reseñas, material en el fixture A, guard en npm test que nombra «lang»), los fixtures A y C traen `lang` en cada reseña y `hueco.mjs --id testimonials.lang` da verde en los cinco", () => {
  const contratos = JSON.parse(readFileSync(resolve(ROOT, "verdad/contratos.json"), "utf8"));
  const fila = contratos.huecos.find((r: Cfg) => r.id === "testimonials.lang");
  // (1) La fila. Hoy no está: aquí está el rojo.
  assert.ok(fila, `verdad/contratos.json tiene la fila «testimonials.lang» (hoy: ${contratos.huecos.length} filas, ninguna de testimonials[].lang)`);
  assert.equal(fila.ruta, "testimonials[].lang", "la ruta es testimonials[].lang");
  assert.deepEqual([fila.validador?.archivo, fila.validador?.funcion], ["src/lib/config-validator.ts", "validateIdiomaResenas"], "validador validateIdiomaResenas");
  assert.equal(fila.ui?.componente, "src/components/config-editors/testimonials-editor.tsx", "casilla de reseñas");
  assert.equal(fila.material?.vive, "config", "el valor vive en el config");
  assert.ok(fila.guard?.archivo && (fila.guard.clave ?? "lang") === "lang", `guard en T que nombra «lang» (${JSON.stringify(fila.guard)})`);
  // (2) Los fixtures.
  for (const p of ["a", "c"]) {
    const fx = JSON.parse(readFileSync(resolve(ROOT, "dev-fixtures", `peluqueria-paleta-${p}.json`), "utf8"));
    assert.ok(fx.testimonials.every((t: Cfg) => ["he", "en", "ru", "ar"].includes(t.lang)), `fixture ${p.toUpperCase()}: cada reseña trae lang (${fx.testimonials.map((t: Cfg) => t.lang)})`);
  }
  // (3) hueco.mjs.
  const r = correrNode([resolve(ROOT, "tools/verdad/hueco.mjs"), "--id", "testimonials.lang"], { cwd: ROOT, env: entornoLimpio(), minutos: 2 });
  assert.equal(r.status, 0, `hueco.mjs --id testimonials.lang da verde en los cinco lugares:\n${r.out.trim()}`);
});
