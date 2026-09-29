// IDIOMAS-01 · B (T) · reseñas v1 hasta que llegue su variante. Sesión A (2026-09-29): test rojo.
//
// D-130 (Liam, 2026-09-29): de Google se toma la facilidad —una reseña traducida se marca y deja ver el original—, no su diseño;
// lo VISIBLE («Translated from Hebrew · See original») entra con la variante de reseñas y esta orden trae sólo los datos. Hasta
// entonces, v1 no tiene con qué marcar una traducción, así que muestra el ORIGINAL.
// D-138 (medido con este arnés): `src/components/landing/Testimonials.tsx:240` pinta `review.text`. Con una reseña como la que el
// overlay nuevo entrega en otro idioma (`text` = traducción, `originalText` = original, `translated: true`), v1 pinta la
// traducción y no el original: una traducción sin marcar, que es lo que D-130 prohíbe.
//
// El componente real, cargado por el mismo servidor de Vite que `site.ts` y pintado con `renderToString`. La reseña se pone en
// `siteConfig` tal como la entrega el overlay: B1 mide v1, no el overlay (eso es A3). Sólo en T (inciso n). No escribe nada.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cerrarSitio, modulo, renderToString, sitio } from "./_comun.ts";

after(cerrarSitio);

const COMPONENTE = "/src/components/landing/Testimonials.tsx";

test("reseñas v1 pinta, de cada reseña marcada `translated`, su `originalText` y no la traducción, así que en en, ru y ar ninguna tarjeta muestra una traducción sin marcar", async () => {
  const site = await sitio();
  const { Testimonials } = (await modulo(COMPONENTE)) as { Testimonials: unknown };
  assert.equal(typeof Testimonials, "function", `precondición: ${COMPONENTE} exporta Testimonials`);
  const { createElement } = (await import("react")) as { createElement: (t: unknown, p?: unknown) => unknown };

  site.switchSiteToNiche("peluqueria", "he");
  site.applyTenantConfigOverride({ business: { type: "peluqueria" }, sections: { testimonials: { variant: "v1" } } });
  // Lo que el overlay nuevo entrega en inglés (D-134): una traducida y una en su idioma de origen.
  site.siteConfig.testimonials = [
    { id: "r1", name: "יעל ב.", rating: 5, text: "TRADUCCION-EN-r1", originalText: "ORIGINAL-HE-r1", originalLang: "he", translated: true, service: "Colour" },
    { id: "r3", name: "דנה", rating: 5, text: "ORIGINAL-HE-r3", originalLang: "he", translated: false },
  ];
  const html = await renderToString(createElement(Testimonials));

  // (1) La traducida muestra su original. HOY no: pinta `review.text` (D-138). Aquí está el rojo.
  assert.ok(html.includes("ORIGINAL-HE-r1"), "v1 tiene que pintar el `originalText` de una reseña marcada `translated`: todavía no tiene con qué marcarla (D-130)");
  // (2) …y la traducción no aparece en ninguna tarjeta.
  assert.ok(!html.includes("TRADUCCION-EN-r1"), "v1 no puede pintar una traducción sin marcar");
  // (3) Control: la que no es traducción se ve igual que siempre (el arreglo no puede esconder las reseñas).
  assert.ok(html.includes("ORIGINAL-HE-r3"), "una reseña en su idioma de origen se sigue viendo");
});
