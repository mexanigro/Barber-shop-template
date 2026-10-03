// CIERRE-TRAMO-01 · B1 (T, webs) · la medición de punta a punta del tramo de secciones. Sesión A (2026-10-03): test rojo.
//
// o-ter: las dos webs de prueba, cargadas por las casillas (A1, en H), redesplegadas sobre un commit de T que contiene esta orden, y
// `e2e.mjs` en 0 px contra su plantilla en todas las secciones del tramo y en más de un idioma. D-216 fija la interfaz que B agrega a
// `tools/verdad/e2e.mjs`: seis zonas nuevas en `/`, ANCLADAS a su variante v6 (con los dos lados viejos, la v1 de una sección daría 0 px
// contra la v1 de la otra), `--idiomas` (el idioma va por `localStorage.preferred_language` a los dos lados), `idioma` y `selector` en
// cada entrada del informe, y el mapa de Google respondido igual a los dos lados. D-218 (Liam): «he + en, y ar sólo a 375»: dos
// llamadas por web, 180 entradas zona·idioma·vista·corrida por web.
// B1 empieza por una condición del ÁRBOL (inciso l, como D2 de IDIOMAS-01): que el `commitSha` que declara `H tests/e2e-01-webs.json`
// descienda del commit rojo de esta orden en T. Hoy es 2f2cd4a, anterior: cae en milisegundos y el árbol rojo no paga las ~2 h de las
// corridas (D-217). Marcada «, webs» (inciso s): `rojo-verde --todas` no la corre en HEAD; `rojo-verde --orden cierre-tramo-01` sí.
// El mensaje de falla nombra la web, la corrida, el idioma, la zona, la vista y los px de CADA entrada que difiere (inciso s).
// Sólo en T (inciso n: la página es de T). No escribe nada; a la red sólo lee (los GET de `e2e.mjs`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ORDEN, PALETAS, ROOT, correrE2E, desciende, jsonFinal, registro, rojoDe } from "./_comun.ts";

/** Las doce zonas: las seis de E2E-01 (D-97) y las seis del tramo, éstas ancladas a la v6 (D-216). */
const ANCLAS: Record<string, string | null> = {
  navbar: null, hero: null, services: null, gallery: null, "pagina-servicios": null, "pagina-galeria": null,
  team: '#team[data-team="v6"]', testimonials: '#testimonials[data-res="v6"]', instagram: '#instagram[data-ig="v6"]',
  faq: '#faq[data-faq="v6"]', contact: '#contact[data-ct="v6"]', footer: 'footer[data-pie="v6"]',
};
const ZONAS = Object.keys(ANCLAS);
const CORRIDAS = 3;
/** D-218: dos llamadas por web. */
const LLAMADAS = [
  { idiomas: ["he", "en"], vistas: [375, 1280], args: ["--idiomas", "he,en"] },
  { idiomas: ["ar"], vistas: [375], args: ["--idiomas", "ar", "--vistas", "375"] },
];

test("las dos webs de prueba están desplegadas sobre un commit de T que contiene esta orden y `e2e.mjs --web a|c --corridas 3`, con `--idiomas he,en` en 375 y 1280 y con `--idiomas ar --vistas 375`, mide las seis zonas de E2E-01 y además `#team`, `#testimonials`, `#instagram`, `#faq`, `#contact` y el footer, ancladas a su variante v6, y da las 180 entradas zona·idioma·vista·corrida de cada web en 0 px y estables, con los tokens de `:root` iguales, sin zonas faltantes, y sale 0", () => {
  // (1) Condición del árbol (inciso l): el commit desplegado de cada web desciende del rojo de esta orden. Hoy no: aquí está el rojo.
  const webs = registro().webs;
  const rojo = rojoDe(ROOT, ORDEN);
  assert.ok(rojo, `precondición: hay un commit que añade tests/orden/${ORDEN}/HOJA.md en main`);
  for (const p of PALETAS) {
    const w = webs.find((x) => x.paleta === p);
    assert.ok(w?.commitSha, `precondición: el registro declara la web ${p}`);
    assert.ok(desciende(ROOT, rojo, w!.commitSha), `la web ${p} tiene que estar desplegada sobre un commit que contiene ${ORDEN} (registrado ${w!.commitSha.slice(0, 7)}, que no desciende de ${rojo.slice(0, 7)})`);
  }

  // (2) Contra las webs reales: cada entrada, en 0 px y estable; se juntan TODAS las que fallan antes de afirmar (inciso s).
  const malas: string[] = [];
  let entradas = 0;
  for (const p of PALETAS) {
    for (const ll of LLAMADAS) {
      const r = correrE2E(["tools/verdad/e2e.mjs", "--web", p, "--corridas", String(CORRIDAS), ...ll.args, "--json"]);
      if (r.status !== 0) malas.push(`${p} · ${ll.args.join(" ")}: e2e.mjs salió ${r.status}`);
      let inf: { zonas?: any[]; tokens?: any[]; faltantes?: any[] };
      try { inf = jsonFinal(r.stdout) as typeof inf; } catch (e) { malas.push(`${p} · ${ll.args.join(" ")}: sin informe (${(e as Error).message.slice(0, 200)})\n${r.out.slice(-1500)}`); continue; }
      for (const f of inf.faltantes ?? []) malas.push(`${p} · corrida ${f.corrida} · ${f.idioma ?? "?"} · ${f.zona} ${f.vista}: FALTA «${f.selector}» en ${f.donde}`);
      const medidas = new Map((inf.zonas ?? []).map((z) => [`${z.corrida}|${z.idioma}|${z.zona}|${z.vista}`, z]));
      for (let c = 1; c <= CORRIDAS; c++) for (const idioma of ll.idiomas) for (const vista of ll.vistas) {
        for (const zona of ZONAS) {
          const z = medidas.get(`${c}|${idioma}|${zona}|${vista}`);
          const donde = `${p} · corrida ${c} · ${idioma} · ${zona} ${vista}`;
          if (!z) { malas.push(`${donde}: sin medir`); continue; }
          entradas++;
          if (ANCLAS[zona] && z.selector !== ANCLAS[zona]) malas.push(`${donde}: medida sobre «${z.selector}», no sobre la v6 «${ANCLAS[zona]}»`);
          if (z.estable !== true) malas.push(`${donde}: NO ESTABLE`);
          else if (z.size) malas.push(`${donde}: tamaño distinto ${JSON.stringify(z.a)} vs ${JSON.stringify(z.b)}`);
          else if (z.pixels !== 0) malas.push(`${donde}: ${z.pixels} px de ${z.total}`);
        }
        const t = (inf.tokens ?? []).find((x) => x.corrida === c && x.idioma === idioma && x.vista === vista);
        if (t?.iguales !== true) malas.push(`${p} · corrida ${c} · ${idioma} · :root ${vista}: tokens ${t ? `distintos (${(t.distintos ?? []).join(" · ")})` : "sin medir"}`);
      }
    }
  }
  assert.deepEqual(malas, [], `las dos webs contra su plantilla: ${malas.length} entradas mal de ${PALETAS.length * 180} (medidas: ${entradas})\n${malas.join("\n")}`);
  assert.equal(entradas, PALETAS.length * 180, "180 entradas por web (D-218)");
});
