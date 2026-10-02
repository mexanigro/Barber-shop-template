// INSTAGRAM-FAQ-01 · E2 (T) · sin navegador. Sesión A (2026-10-02): test rojo.
//
// E2 · team v6 sin foto. Lo dejó la verificadora de TEAM-RESENAS-01: `team-v6.tsx` pinta `src={m.photoUrl || ""}` en las dos imágenes de
// cada tarjeta (la extensión desenfocada y el retrato); React descarta `src=""` al serializar y el navegador resuelve una <img> sin
// `src` pidiendo la página entera como imagen —el defecto que ARREGLOS-01 (D-109) arregló en los once lectores de services—. Medido por
// A el 2026-10-02 con el componente real: con una persona sin `photoUrl`, la tarjeta pinta dos <img> sin `src`. En las dos direcciones:
// sin foto, ninguna <img> sin `src`; con foto, sus dos imágenes con esa foto.
// Caja negra: el componente con el cargador de `_comun.ts` (`siteConfig` se muta en memoria y se restaura). Sólo en T (inciso n). No
// escribe nada. Fase `test:unit` cuando se promueva (no abre navegador).
import { test } from "node:test";
import assert from "node:assert/strict";
import { importarModulo } from "./_comun.ts";

type Cfg = Record<string, any>;
const FOTO = "https://example.com/retrato-prueba.jpg";
/** Las etiquetas <img> del HTML y cuáles no tienen el atributo `src`. */
const imgs = (html: string) => [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
const sinSrc = (html: string) => imgs(html).filter((t) => !/\ssrc="[^"]+"/.test(t));

test("team v6 no pinta ninguna imagen sin `src`: una persona sin foto (`photoUrl` vacío o ausente) no deja ninguna <img> sin `src` en su tarjeta, y una persona con foto pinta sus dos imágenes (la extensión y el retrato) con esa foto", async () => {
  const SERVIDOR = "react-dom/server";
  const { renderToString } = (await import(SERVIDOR)) as { renderToString: (n: unknown) => string };
  const { createElement } = await import("react");
  const site = await importarModulo("src/config/site.ts");
  const cfg = site.siteConfig as Cfg;
  const antes = { staff: cfg.staff, team: cfg.sections?.team };
  const persona = (id: string, foto?: string): Cfg => ({ id, slug: id, name: `נ ${id}`, specialty: "צבע", bio: "משפט ראשון קצר. ועוד אחד.", ...(foto === undefined ? {} : { photoUrl: foto }) });
  const montar = async (staff: Cfg[]) => {
    cfg.staff = staff;
    cfg.sections.team = { ...(antes.team ?? {}), variant: "v6" };
    const C = (await importarModulo("src/components/landing/team/team-v6.tsx")).TeamV6;
    assert.equal(typeof C, "function", "src/components/landing/team/team-v6.tsx exporta TeamV6");
    return renderToString(createElement(C as never, { onBookClick: () => {} } as never));
  };
  try {
    // (1) Sin foto: hoy cada tarjeta sin foto pinta dos <img> sin src. Aquí está el rojo.
    const html = await montar([persona("p1", FOTO), persona("p2", ""), persona("p3")]);
    assert.deepEqual(sinSrc(html), [], `ninguna <img> sin src en team v6 (hoy: ${sinSrc(html).length} — ${sinSrc(html).slice(0, 2).join(" ")})`);
    // (2) Con foto: sus dos imágenes, con esa foto.
    const conFoto = await montar([persona("p1", FOTO), persona("p2", FOTO), persona("p3", FOTO)]);
    const conLaFoto = imgs(conFoto).filter((t) => t.includes(`src="${FOTO}"`)).length;
    assert.equal(conLaFoto, 6, `con foto, cada tarjeta pinta sus dos imágenes con la foto (${conLaFoto} de 6)`);
    assert.deepEqual(sinSrc(conFoto), [], "con foto, ninguna <img> sin src");
  } finally {
    cfg.staff = antes.staff;
    cfg.sections.team = antes.team;
  }
});
