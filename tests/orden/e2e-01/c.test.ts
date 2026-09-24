// E2E-01 · C (T) · la página desplegada es la plantilla: la herramienta que compara (C1) y el 0 píxeles en lo juzgado (C2).
// Sesión A (2026-09-24): tests rojos — no existe `tools/verdad/e2e.mjs`.
// D-100 (medido): el camino del fixture (`VITE_TENANT_FIXTURE`) SÓLO existe en `import.meta.env.DEV` (T:src/services/tenant.ts:173–174,
// :214) y `recrear.mjs:90` levanta `server.ts` con `tsx`, que es dev. Comparar una web desplegada (build de producción servido por
// Vercel) contra un render de dev no sería justo. La referencia es un `vite build` de T en el MISMO commit que Vercel desplegó,
// servido en local con `VITE_CLIENT_ID=test-b4-peluqueria-<paleta>`: mismo código, mismo camino de datos, y la única diferencia es
// qué `config/{id}` se lee.
// D-101 (medido): el alta del hub pone `showWhyChooseUs: false` y `showInquiry: false`, y los fixtures toman el `true` del template,
// así que la PÁGINA ENTERA nunca va a medir lo mismo. Por eso cada zona se captura POR SU ELEMENTO: una sección no juzgada no
// desplaza nada. Ningún test escribe en Firestore, en Storage ni en Vercel. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { E2E, PALETAS, ROOT, TOKENS, VISTAS, ZONAS, correrLargo, fuente, jsonFinal, registro, tenantDe, web } from "./_comun.ts";

type Zona = { zona: string; vista: number; pixels: number; size: boolean; total?: number };
type Informe = { web: string; paleta: string; commitSha: string; zonas: Zona[]; tokens: { vista: number; iguales: boolean; distintos?: string[] }[] };
/** Lo que la herramienta NO puede hacer: esta orden mira, no escribe. */
const ESCRITURAS = [/--escribir/, /\bmethod:\s*["'](POST|PATCH|PUT|DELETE)["']/, /\.set\(/, /\.update\(/];
/** Lo que la referencia NO puede usar (D-100): el camino de dev del fixture. */
const DE_DEV = ["VITE_TENANT_FIXTURE", "server.ts"];

test("tools/verdad/e2e.mjs existe, corre con `--web a|c [--puerto <n>] [--zonas …] [--vistas …]` y escribe un informe JSON con una entrada por zona y vista, cada una con `zona`, `vista`, `pixels` y `size`; levanta la referencia con un **build de producción** de T en el commit que declara `tests/e2e-01-webs.json` y `VITE_CLIENT_ID=test-b4-peluqueria-<paleta>`, nunca con `server.ts` en dev; y nunca escribe en Firestore, en Storage ni en Vercel", () => {
  // (1) La herramienta existe. Hoy no: aquí es donde esta orden está en rojo.
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E}`);
  const src = fuente(E2E);

  // (2) Su CLI, tal como la hoja lo fija.
  for (const bandera of ["--web", "--puerto", "--zonas", "--vistas", "--json"]) {
    assert.ok(src.includes(bandera), `${E2E} debe aceptar «${bandera}»`);
  }
  // (3) La referencia es un build de producción con el tenant de la plantilla, no el server de dev con el fixture (D-100).
  assert.ok(src.includes("VITE_CLIENT_ID"), `${E2E} levanta la referencia con VITE_CLIENT_ID (D-100)`);
  assert.ok(src.includes("vite build") || src.includes("build"), `${E2E} construye la referencia (vite build), no la sirve en dev`);
  for (const dev of DE_DEV) {
    assert.ok(!src.includes(dev), `${E2E} no usa «${dev}»: el camino del fixture sólo existe en DEV y la comparación no sería justa (D-100)`);
  }
  // (4) Y no escribe en ningún lado.
  for (const re of ESCRITURAS) {
    assert.doesNotMatch(src, re, `${E2E} no escribe (${re}): esta orden lee Vercel, Firestore y Storage, no los toca`);
  }
});

test("el informe de `e2e.mjs` para las dos webs da **0 píxeles de diferencia y ningún cambio de tamaño** en las seis zonas juzgadas —`nav[data-nav-v6]`, `#hero`, `#services` y `#gallery` en `/`, y `#main-content` en `/servicios` y en `/galeria`— a 375 y a 1280, con el vídeo del hero congelado en el mismo cuadro y las fuentes cargadas; y los tokens computados de `:root` (`--surface`, `--text`, `--accent`, `--accent-strong`, `--font-sans`, `--font-serif`) son iguales en la web desplegada y en la referencia, en las dos vistas", () => {
  // (1) El registro del árbol (D-99) y la herramienta. Hoy no hay ninguno de los dos: aquí está el rojo.
  const reg = registro();
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E}`);

  for (const p of PALETAS) {
    const w = web(reg, p);
    const r = correrLargo([E2E, "--web", p, "--json"]);
    assert.equal(r.status, 0, `${E2E} --web ${p} --json debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    const informe = jsonFinal(r.stdout) as unknown as Informe;

    // (2) Compara lo que la hoja dice que compara: esta web, esta paleta, el commit desplegado.
    assert.equal(informe.paleta, p, `${p}: el informe es de la paleta ${p}`);
    assert.equal(informe.commitSha, w.commitSha, `${p}: la referencia se construyó con el commit desplegado (${w.commitSha.slice(0, 7)})`);

    // (3) Las seis zonas por las dos vistas, todas presentes y todas a cero.
    const esperadas = ZONAS.flatMap((z) => VISTAS.map((v) => `${z.zona} ${v}`));
    const hay = (informe.zonas ?? []).map((z) => `${z.zona} ${z.vista}`);
    assert.deepEqual([...hay].sort(), [...esperadas].sort(), `${p}: el informe cubre las seis zonas juzgadas en las dos vistas`);
    const malas = (informe.zonas ?? []).filter((z) => z.pixels !== 0 || z.size === true);
    assert.deepEqual(malas.map((z) => `${z.zona} ${z.vista}: ${z.size ? "tamaño distinto" : `${z.pixels} px`}`), [], `${p}: ninguna zona juzgada difiere de la plantilla (${tenantDe(p)})`);

    // (4) Y la paleta en su modo y la tipografía, por los tokens computados de `:root`.
    for (const v of VISTAS) {
      const t = (informe.tokens ?? []).find((x) => x.vista === v);
      assert.ok(t, `${p}: el informe trae los tokens de :root a ${v}`);
      assert.equal(t.iguales, true, `${p} · ${v}: los tokens de :root son iguales (distintos: ${(t.distintos ?? []).join(", ")})`);
    }
    assert.ok(TOKENS.length >= 6, "precondición: los seis tokens de D-97");
  }
});
