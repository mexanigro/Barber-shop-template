// CIERRE-TRAMO-01 · copia promovida (AUDITORIA-01, 2026-10-05, D-232) de tests/orden/cierre-tramo-01/c.test.ts: C2 y C5 (T), en
// `test:browser` (C5 corre `tests/conexion-08-a.test.ts`, que abre Chromium, en un clon). La orden quedó aprobada por Liam el 2026-10-04
// (T 6503410 · H 7e41eae) y su carpeta está congelada; esto es la copia editable que corre `npm test`.
// Recorte: entera (no sale a la red: `hueco.mjs` y el clon son locales).
// CIERRE-TRAMO-01 · C2, C5 (T) · los cinco lugares de la dirección del idioma base y de la descripción de la marca por idioma, el
// material de los fixtures, y la copia de CONEXION-08 que excluía de más. Sesión A (2026-10-03): tests rojos.
//
// C2 (inciso v; c2 de la verificadora; D-215, D-219): la dirección de la raíz (`contact.address`) ya tenía casilla (Config y Contenido
// en el idioma base) y material (los fixtures), y no tenía contrato ni validador: `recrear` la lista «sin contrato». La descripción de
// la marca por idioma (`translations.<lang>.brand.description`) la lee la página (SEO y «sobre nosotros») y el hub no tenía casilla
// para escribirla en otro idioma. Liam (2026-10-03): las dos con sus cinco lugares; los fixtures ganan el email genérico (lo que su
// pie ya muestra) y A su descripción en los cuatro idiomas. Medido por A el 2026-10-03: `verdad/contratos.json` 42 filas, ninguna de
// las dos; `hueco.mjs` «35/42»; ningún fixture trae `contact.email`; el fixture A no trae `brand.description`.
// C5 (c4 de la verificadora): `tests/conexion-08-a.test.ts:83` quita el prefijo `translations.<lang>.` y después excluye `brand.tagline`,
// así que deja sin vigilar también la línea de la RAÍZ de los fixtures, que CONTACTO-PIE-01 no cambió. Se prueba por lo que hace: en un
// clon de HEAD (nunca en el repo) se cambia un fixture y se corre sólo la comparación con la línea base de esa copia.
// Sólo en T (inciso n). No escribe en el repo; el clon vive en la carpeta temporal de la orden y se borra en `finally`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NODE, ROOT, clonDe, conTemporal, correrNode, entornoLimpio, fuente, git, quitarEnlace } from "./orden/cierre-tramo-01/_comun.ts";

const ESCRITURA: Record<string, RegExp> = { en: /[A-Za-z]/, ru: /[Ѐ-ӿ]/, ar: /[؀-ۿ]/ };

test("la dirección del idioma base y la descripción de la marca en cada idioma tienen sus cinco lugares y su material: `verdad/contratos.json` declara las filas `contact.address` (ruta `contact.address.street`, clave «address») y `brand.description.idiomas` (ruta `translations.en.brand.description`, clave «description»), y `hueco.mjs --id` da verde en los cinco para las dos; los fixtures A y C traen `contact.email` «hello@example.com»; y el fixture A trae `brand.description` en la raíz y en en, ru y ar", () => {
  type Fila = { id: string; ruta: string; clave: string; validador?: { archivo: string; funcion: string }; ui?: { componente: string; campo: string } | null; material?: { vive: string }; guard?: { archivo: string; clave?: string } };
  const filas = (JSON.parse(fuente("verdad/contratos.json")).huecos ?? []) as Fila[];
  const ESPERADAS = [
    { id: "contact.address", ruta: "contact.address.street", clave: "address" },
    { id: "brand.description.idiomas", ruta: "translations.en.brand.description", clave: "description" },
  ];
  // (1) Las filas. Hoy no están: aquí está el rojo.
  for (const e of ESPERADAS) {
    const f = filas.find((x) => x.id === e.id);
    assert.ok(f, `verdad/contratos.json declara la fila ${e.id} (hoy: ${filas.length} filas, ninguna ${e.id})`);
    assert.deepEqual([f!.ruta, f!.clave, f!.material?.vive], [e.ruta, e.clave, "config"], `${e.id}: ruta, clave y material en config`);
    assert.ok(f!.validador?.funcion && f!.ui?.componente && f!.guard?.archivo, `${e.id}: validador, casilla y guard declarados`);
  }
  // (2) Los fixtures: el email genérico en las dos plantillas (D-215) y la descripción de A en los cuatro idiomas (D-219).
  for (const p of ["a", "c"] as const) {
    const fx = JSON.parse(fuente(`dev-fixtures/peluqueria-paleta-${p}.json`));
    assert.equal(fx.contact?.email, "hello@example.com", `${p}: contact.email es el genérico (hay ${JSON.stringify(fx.contact?.email)})`);
  }
  const a = JSON.parse(fuente("dev-fixtures/peluqueria-paleta-a.json"));
  assert.ok(typeof a.brand?.description === "string" && /[א-ת]/.test(a.brand.description), `a: brand.description en la raíz, en hebreo («${a.brand?.description}»)`);
  for (const lang of ["en", "ru", "ar"] as const) {
    const d = a.translations?.[lang]?.brand?.description;
    assert.ok(typeof d === "string" && ESCRITURA[lang].test(d), `a: brand.description en ${lang}, escrita en ese idioma («${d}»)`);
  }
  // (3) hueco.mjs: los cinco lugares de las dos.
  for (const e of ESPERADAS) {
    const r = spawnSync(NODE, ["tools/verdad/hueco.mjs", "--id", e.id], { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000, env: entornoLimpio() });
    assert.equal(r.status, 0, `hueco.mjs --id ${e.id}: verde en los cinco (exit ${r.status})\n${r.stdout}${r.stderr}`);
  }
});

/** La copia y el test que compara los fixtures con su línea base (el segundo de ese archivo). */
const COPIA = "tests/conexion-08-a.test.ts";
const PATRON = "nada más cambia en los fixtures";

test("`tests/conexion-08-a.test.ts` vigila `brand.tagline` de la raíz de los fixtures: en un clon de HEAD, con la línea de la raíz de un fixture cambiada, su comparación con la línea base cae; con `translations.en.brand.tagline` cambiada (lo de CONTACTO-PIE-01) y sin cambios, pasa", () => {
  conTemporal((base) => {
    const clon = clonDe(base, "clon", git(ROOT, "rev-parse", "HEAD"));
    try {
      const rel = "dev-fixtures/peluqueria-paleta-a.json";
      const original = readFileSync(join(clon, rel), "utf8");
      /** Corre en el clon sólo el test de la línea base de la copia, con el fixture A cambiado por `cambio` (o sin cambios). */
      const correr = (cambio?: (fx: any) => void) => {
        const fx = JSON.parse(original);
        if (cambio) { cambio(fx); writeFileSync(join(clon, rel), JSON.stringify(fx, null, 2) + "\n"); }
        else writeFileSync(join(clon, rel), original);
        const r = correrNode(["--import", "tsx", "--test", "--test-reporter=tap", `--test-name-pattern=${PATRON}`, COPIA], { cwd: clon, env: entornoLimpio(), minutos: 5 });
        const pasa = Number(r.stdout.match(/^# pass (\d+)/m)?.[1] ?? NaN), cae = Number(r.stdout.match(/^# fail (\d+)/m)?.[1] ?? NaN);
        return { pasa, cae, out: r.out };
      };
      // (1) La línea de la raíz cambiada: la copia tiene que caer. Hoy la excluye y pasa: aquí está el rojo.
      const raiz = correr((fx) => { fx.brand.tagline = `${fx.brand.tagline} (cambiada)`; });
      assert.equal(raiz.cae, 1, `${COPIA} vigila brand.tagline de la raíz: con la del fixture A cambiada su comparación con la línea base cae (pasa ${raiz.pasa}, cae ${raiz.cae})\n${raiz.out.slice(-1500)}`);
      // (2) Las otras dos direcciones: la capa de CONTACTO-PIE-01 sigue excluida, y sin cambios pasa.
      const capa = correr((fx) => { fx.translations.en.brand.tagline = `${fx.translations.en.brand.tagline} (changed)`; });
      assert.deepEqual([capa.pasa, capa.cae], [1, 0], `con translations.en.brand.tagline cambiada (CONTACTO-PIE-01) la copia sigue pasando\n${capa.out.slice(-1500)}`);
      const igual = correr();
      assert.deepEqual([igual.pasa, igual.cae], [1, 0], `sin cambios la copia pasa\n${igual.out.slice(-1500)}`);
    } finally { quitarEnlace(clon); }
  });
});
