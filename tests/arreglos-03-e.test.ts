// ARREGLOS-03 · copia promovida (SERVICIOS-GALERIA-01, 2026-10-01, D-165). La orden quedó aprobada por Liam el 2026-10-01
// (T d27ebf3 · H 064acb5) y su carpeta está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte (D-165): E1 no es determinista (con las banderas de D-158, 14 de 15 pares idénticos, medido por la verificadora), así
// que esta copia NO compara capturas, ni byte a byte ni por umbral, y no alarga cada pre-commit en minutos: corre el script UNA vez,
// en un clon limpio sin `.env`, con UN nicho, y vigila lo que E1 arregló (D-155): que en un clon limpio, sin las variables del
// `.env`, el server levanta con su propio id de tenant y el script sale 0 y deja sus dos capturas (hero y services del nicho).
// La comparación de los seis antes/después (inciso d) la corre la sesión B al cierre de cada orden, con su control.
// Va en `test:browser` (D-57, D-121): abre Chromium como proceso hijo. El script usa el puerto 3000: nada más debe escucharlo.
// ARREGLOS-03 · E1 (T) · la regresión de los seis en un clon limpio. Sesión A (2026-09-30).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { clonLimpio, conTemporal, correrNode, entornoLimpio, quitarEnlace, subcarpeta } from "./orden/arreglos-03/_comun.ts";

const QA = "scripts/qa-regresion-seis.mjs";
const NICHO = "barberia";
const pngs = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).sort() : []);

test("en un clon limpio de T, sin `.env` y sin ninguna variable `VITE_*`, `CLIENT_ID`, `NEXT_PUBLIC_*` ni `FIREBASE_*` en el entorno, `scripts/qa-regresion-seis.mjs` con un solo nicho sale 0 y deja sus dos capturas", () => {
  conTemporal((base) => {
    const clon = clonLimpio(base);
    try {
      const tmp = subcarpeta(base, "tmp");
      const env = entornoLimpio({ TEMP: tmp, TMP: tmp, TMPDIR: tmp });
      const dir = join(base, "qa");
      assert.ok(!existsSync(join(clon, ".env")), "el clon es limpio: no trae .env (sólo .env.example está rastreado)");
      const r = correrNode([QA, "--niches", "barberia", "--out", dir], { cwd: clon, env, minutos: 5 });
      assert.equal(r.status, 0, `en un clon limpio sin .env, ${QA} --niches ${NICHO} tiene que salir 0 (salió ${r.status})\n${r.out.slice(-1500)}`);
      assert.deepEqual(pngs(dir), [`${NICHO}-hero.png`, `${NICHO}-services.png`], `deja las dos capturas del nicho (hero y services): ${pngs(dir).join(", ")}`);
    } finally {
      quitarEnlace(clon);
    }
  });
});
