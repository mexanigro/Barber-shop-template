// IDIOMAS-01 · D (T) · los fixtures y la prueba de punta a punta. Sesión A (2026-09-29): tests rojos.
//
// D-141: de `diseno/services/prototipo/idiomas-{a,c}.json` entra lo de servicios (`serviciosBase` sobre `services[]`), equipo,
// reseñas (`resenasBase` EN LUGAR de `testimonials[]`, y `translations.<lang>.testimonials` como objeto por id) y el encabezado de
// services (`translations.<lang>.sections.services`); NADA de las otras secciones (`ordenSecciones`, `contactoBase`,
// `seccionesBase`, `faqBase`, `translations.<lang>.contact`), que van con su orden (D-129). Cómo los aplica el prototipo:
// `diseno/proxy-prototipo.mjs:30–38`. «Nada más» se mide contra el fixture del commit aprobado de ARREGLOS-02 (T 19ba544).
// Corrección A2 (D-144): antes el «nada más» miraba sólo sectionOrder, contact, sections.faq, sections.contact y
// translations.<lang>.contact, y la capa del diseño trae además translations.ar.sections.team y .faq en A (y faq y contact en C):
// copiada entera, D1 quedaba verde con la frase falsa. Ahora compara el fixture ENTERO contra `fixtureEsperado()` (el aprobado de
// ARREGLOS-02 más SÓLO las claves de D-141), por valor y con las claves ordenadas. La capa se lee de la copia de esta carpeta.
// D-142 (o-ter): los tenants se cargan desde la ficha, las dos webs se redespliegan sobre un commit que contiene esta orden, y
// `e2e.mjs --corridas 3` da 0 px en las 72 entradas. D2 empieza por una condición del ÁRBOL (inciso l): que el `commitSha` que
// declara `H tests/e2e-01-webs.json` descienda del commit rojo de esta orden en T. Hoy es `e00a816`, anterior: cae en
// milisegundos y el árbol rojo no paga los ~30 minutos de las corridas. Sólo en T (inciso n). No escribe nada; a la red sólo lee.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ORDEN, OTROS, PALETAS, RAIZ_H, ROOT, canonico, capaDiseno, correrE2E, fixture, fixtureEsperado, iguales, json, jsonFinal, rojoDe } from "./_comun.ts";

/** Las zonas y vistas de e2e.mjs, y las corridas de o-ter (ARREGLOS-02, A1). */
const ZONAS = ["navbar", "hero", "services", "gallery", "pagina-servicios", "pagina-galeria"];
const VISTAS = [375, 1280];
const CORRIDAS = 3;
const get = (o: unknown, ruta: string): unknown => ruta.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);

test("los fixtures A y C traen de `idiomas-{a,c}.json` lo de servicios, equipo, reseñas y el encabezado de services —`serviciosBase` sobre `services[]`, `resenasBase` en lugar de `testimonials[]`, y `translations.<lang>.services`, `.staff`, `.testimonials` y `.sections.services`— y nada de las otras secciones", () => {
  for (const p of PALETAS) {
    const fx = fixture(p), capa = capaDiseno(p);

    // (1) El texto por idioma de las tres secciones y el encabezado de services. Hoy el fixture no lo trae: aquí está el rojo.
    for (const l of OTROS) {
      for (const sec of ["services", "staff", "testimonials"]) {
        assert.ok(iguales(get(fx, `translations.${l}.${sec}`), capa.translations[l][sec]), `${p}: translations.${l}.${sec} tiene que ser el de idiomas-${p}.json (D-141)`);
      }
      assert.ok(iguales(get(fx, `translations.${l}.sections.services`), capa.translations[l].sections.services), `${p}: translations.${l}.sections.services (el encabezado de services) es el de idiomas-${p}.json`);
    }

    // (2) serviciosBase aplicado sobre services[]: cada campo que trae, en su servicio.
    for (const [id, campos] of Object.entries(capa.serviciosBase as Record<string, Record<string, unknown>>)) {
      const s = (fx.services as any[]).find((x) => x.id === id);
      assert.ok(s, `${p}: el servicio «${id}» de serviciosBase existe en el fixture`);
      for (const [k, v] of Object.entries(campos)) assert.equal(s[k], v, `${p}: services.${id}.${k} es el de serviciosBase`);
    }

    // (3) resenasBase EN LUGAR de testimonials[]: los mismos ids, en el mismo orden, y cada campo que trae.
    const resenas = capa.resenasBase as Record<string, unknown>[];
    assert.deepEqual((fx.testimonials as any[]).map((t) => t.id), resenas.map((t) => t.id), `${p}: testimonials[] son las de resenasBase, en su orden`);
    for (const r of resenas) {
      const t = (fx.testimonials as any[]).find((x) => x.id === r.id);
      for (const [k, v] of Object.entries(r)) assert.equal(t[k], v, `${p}: testimonials.${r.id}.${k} es el de resenasBase`);
    }

    // (4) Y NADA MÁS (D-144): el fixture entero es el aprobado de ARREGLOS-02 con sólo las claves de D-141, por valor. Una capa de
    //     otra sección que se colara —translations.ar.sections.team, .faq, .contact— lo pone en rojo, y dice cuál.
    const esperado = fixtureEsperado(p);
    if (!iguales(fx, esperado)) {
      const hojas = (o: unknown, pre = "", acc: Map<string, string> = new Map()): Map<string, string> => {
        if (o && typeof o === "object") { for (const [k, v] of Object.entries(o)) hojas(v, pre ? `${pre}.${k}` : k, acc); if (!Object.keys(o).length) acc.set(pre, JSON.stringify(o)); }
        else acc.set(pre, JSON.stringify(o));
        return acc;
      };
      const a = hojas(fx), b = hojas(esperado);
      const dif = [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k)).sort();
      assert.fail(`${p}: el fixture tiene que ser el de ARREGLOS-02 (19ba544) más SÓLO lo de D-141; difiere en ${dif.length} hojas: ${dif.slice(0, 12).join(", ")}${dif.length > 12 ? ", …" : ""}`);
    }
  }
});

test("las dos webs de prueba están desplegadas sobre un commit de T que contiene esta orden y `e2e.mjs --web a --corridas 3` y `--web c --corridas 3` dan las 72 entradas zona·vista·corrida en 0 px y estables, con los tokens de `:root` iguales, y salen 0", () => {
  // (1) Condición del árbol (inciso l): el commit desplegado de cada web desciende del rojo de esta orden. Hoy no: aquí está el rojo.
  const registro = resolve(RAIZ_H, "tests/e2e-01-webs.json");
  assert.ok(existsSync(registro), `precondición: existe ${registro} (E2E-01)`);
  const webs = (json(registro).webs ?? []) as { paleta: string; commitSha: string }[];
  const rojo = rojoDe(ROOT, ORDEN);
  assert.ok(rojo, `precondición: hay un commit que añade tests/orden/${ORDEN}/HOJA.md en main`);
  for (const p of PALETAS) {
    const w = webs.find((x) => x.paleta === p);
    assert.ok(w?.commitSha, `precondición: el registro declara la web ${p}`);
    const desciende = spawnSync("git", ["-C", ROOT, "merge-base", "--is-ancestor", rojo, w.commitSha], { windowsHide: true }).status === 0;
    assert.ok(desciende, `la web ${p} tiene que estar desplegada sobre un commit que contiene ${ORDEN} (registrado ${w.commitSha.slice(0, 7)}, que no desciende de ${rojo.slice(0, 7)})`);
  }

  // (2) Y entonces, contra las webs reales, las 72 entradas a cero y estables (o-ter, D-142).
  const esperadas = ZONAS.flatMap((z) => VISTAS.flatMap((v) => Array.from({ length: CORRIDAS }, (_, i) => `${i + 1}|${z}|${v}`))).sort();
  for (const p of PALETAS) {
    const r = correrE2E(["tools/verdad/e2e.mjs", "--web", p, "--corridas", String(CORRIDAS), "--json"]);
    assert.equal(r.status, 0, `e2e.mjs --web ${p} --corridas ${CORRIDAS} debe salir 0 (salió ${r.status})\n${r.out.slice(-4000)}`);
    const inf = jsonFinal(r.stdout) as { zonas: any[]; tokens: any[]; faltantes: any[] };
    assert.deepEqual(inf.faltantes ?? [], [], `${p}: ninguna zona quedó sin medir`);
    assert.deepEqual(canonico((inf.zonas ?? []).map((z) => `${z.corrida}|${z.zona}|${z.vista}`).sort()), canonico(esperadas), `${p}: seis zonas × dos vistas × ${CORRIDAS} corridas`);
    const malas = (inf.zonas ?? []).filter((z) => z.estable !== true || z.pixels !== 0 || z.size === true).map((z) => `corrida ${z.corrida} · ${z.zona} ${z.vista}: ${z.estable !== true ? "NO ESTABLE" : z.size ? "tamaño distinto" : `${z.pixels} px`}`);
    assert.deepEqual(malas, [], `${p}: ninguna zona difiere de su plantilla ni queda sin poder afirmarse`);
    for (let c = 1; c <= CORRIDAS; c++) for (const v of VISTAS) {
      const t = (inf.tokens ?? []).find((x) => x.corrida === c && x.vista === v);
      assert.ok(t?.iguales === true, `${p} · corrida ${c} · ${v}: los tokens de :root son iguales`);
    }
  }
});
