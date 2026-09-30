// ARREGLOS-03 · E1 (T) · la regresión de los seis en un clon limpio. Sesión A (2026-09-30): test rojo.
//
// Verificadora, hallazgo 5, y D-155 (medido por A el 2026-09-30 en `C:/t/a3`). (1) En un clon limpio (sólo `.env.example` está
// rastreado) `scripts/qa-regresion-seis.mjs --niches barberia` sale 1 en 69 s con «waiting for locator('#hero')»: el server
// responde 503 `{"status":"unavailable"}` porque `registerExpressRoutes` lanza «Missing tenant id…» (`server.ts:1397`) y el
// `catch` de `startServer` se lo traga; con `.env` el id lo pone dotenv. (2) Dos corridas del mismo árbol dan `barberia-hero` 14 px
// y `nails-hero` 31 px con delta ≤ 3, en el borde de la rejilla de cifras del hero (`backdrop-filter: blur(12px)`); el umbral
// `> 30` del diff lo tapa. Alterna por CARGA (no es la primera rasterización de D-115): con la espera fija de 7 s, dos estados en
// seis lanzamientos; con esperas por condición (`asentar` de `e2e.mjs`), seis de seis iguales, y el candidato completo dio 12 de 12
// idénticas en tres corridas. Lo que se pide: que corra en un clon limpio sin `.env` y que dos corridas den las doce capturas
// idénticas byte a byte, sin subir el umbral.
// Cómo se mide: `git clone` del HEAD de este repo (sin `.env`), `node_modules` por junction, y el script dos veces —la segunda con
// `--baseline`— con el entorno sin `VITE_*`, `CLIENT_ID`, `NEXT_PUBLIC_*`, `FIREBASE_*` ni `HIGIENE_*` y el TEMP dentro de la
// carpeta temporal del test. El script usa el puerto 3000: nada más debe escucharlo mientras corre. Hoy la primera corrida sale 1
// a los ~70 s: aquí está el rojo. Techo declarado (D-155): con sólo el arreglo del id dos corridas pueden salir iguales por suerte.
// Sólo en T (inciso n). No escribe fuera de su carpeta temporal; no sale a la red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { clonLimpio, conTemporal, correrNode, entornoLimpio, quitarEnlace, subcarpeta } from "./_comun.ts";

const QA = "scripts/qa-regresion-seis.mjs";
const pngs = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).sort() : []);

test("en un clon limpio de T, sin `.env` y sin ninguna variable `VITE_*`, `CLIENT_ID`, `NEXT_PUBLIC_*` ni `FIREBASE_*` en el entorno, `scripts/qa-regresion-seis.mjs` sale 0 dos veces seguidas y las doce capturas de la segunda son idénticas byte a byte a las de la primera —«IDÉNTICO (bytes)» en las doce líneas de su report.txt—, sin subir de 30 el umbral de su diff", () => {
  conTemporal((base) => {
    const clon = clonLimpio(base);
    try {
      const tmp = subcarpeta(base, "tmp");
      const env = entornoLimpio({ TEMP: tmp, TMP: tmp, TMPDIR: tmp });
      const d1 = join(base, "qa-1"), d2 = join(base, "qa-2");

      // (1) La primera corrida, en el clon limpio. Hoy sale 1 (el server responde 503 sin id de cliente): aquí está el rojo.
      const r1 = correrNode([QA, "--out", d1], { cwd: clon, env, minutos: 15 });
      assert.equal(r1.status, 0, `en un clon limpio sin .env, ${QA} tiene que salir 0 (salió ${r1.status})\n${r1.out.slice(-1500)}`);
      assert.ok(!existsSync(join(clon, ".env")), "el clon es limpio: no trae .env (sólo .env.example está rastreado)");

      // (2) La segunda, contra la primera.
      const r2 = correrNode([QA, "--out", d2, "--baseline", d1], { cwd: clon, env, minutos: 15 });
      assert.equal(r2.status, 0, `la segunda corrida también sale 0 (salió ${r2.status})\n${r2.out.slice(-1500)}`);

      // (3) Doce capturas, las mismas, idénticas byte a byte.
      assert.equal(pngs(d1).length, 12, `la primera corrida deja las doce capturas (seis nichos × hero y services): ${pngs(d1).join(", ")}`);
      assert.deepEqual(pngs(d2), pngs(d1), "la segunda deja las mismas doce");
      const distintas = pngs(d1).filter((f) => !readFileSync(join(d1, f)).equals(readFileSync(join(d2, f))));
      assert.deepEqual(distintas, [], `dos corridas del mismo árbol dan las doce capturas idénticas byte a byte (difieren: ${distintas.join(", ")})`);
      const report = readFileSync(join(d2, "report.txt"), "utf8");
      const identicas = report.split(/\r?\n/).filter((l) => l.includes("IDÉNTICO (bytes)"));
      assert.equal(identicas.length, 12, `report.txt dice «IDÉNTICO (bytes)» en las doce líneas\n${report}`);

      // (4) Sin subir el umbral del diff (hoy `> 30`, :75).
      const umbral = readFileSync(join(clon, QA), "utf8").match(/\)\s*>\s*(\d+)\)\s*n\+\+/);
      assert.ok(umbral, `${QA} conserva su diff por umbral (Math.abs(…) > N) n++)`);
      assert.ok(Number(umbral[1]) <= 30, `el umbral del diff no sube de 30 (es ${umbral[1]})`);
    } finally {
      quitarEnlace(clon);
    }
  });
});
