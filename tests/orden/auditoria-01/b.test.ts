// AUDITORIA-01 · B1 (T) · `tests/modo-paleta.test.ts` mide el modo sin esperar la red que no usa. Sesión A (2026-10-04): test rojo.
//
// La caída (verificadora de CONEXION-08, 2026-09-23: «page.goto: Timeout 30000ms exceeded» con `waitUntil: "networkidle"` en la suite
// completa; 4 de 4 aislado), medida por A (`C:/t/au01/red.mjs`, línea de tiempo de red de sus tres casos): con los fixtures C y A,
// `networkidle` no llega hasta que termina de bajar de Firebase Storage el vídeo del hero (`hero-v.mp4`, ~6 MB; ese día de 5,3 s a
// 11,2 s), y el caso termina a los 11 s; barbería, a los 4 s. La afirmación del test lee la clase de `<html>`, que no depende del vídeo:
// el tiempo del test es el de la red de ese momento. La red del día de la caída no se puede reconstruir; el mecanismo sí, sin tiempos:
// el test real, SIN TOCARLO, en un clon de HEAD, con la petición del vídeo del hero sin contestar (precarga `instrumentos/sin-video.mjs`).
// Liam (2026-10-04): «Entra así». Las dos direcciones: con el vídeo retenido el test pasa; con el modo de la plantilla C mal puesto en
// el clon, el test sigue cayendo, y por su aserción del modo (no por tiempo).
// Sólo en T (inciso n). No escribe nada en el repo: el clon es temporal; a la red sale lo que pide la propia página del fixture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, clonDe, conTemporal, correrNode, cuenta, entornoLimpio, git, instrumento, quitarEnlace } from "./_comun.ts";

const TEST = "tests/modo-paleta.test.ts";
const PAGINA = "^página real";
const FIXTURE_C = "dev-fixtures/peluqueria-paleta-c.json";

test("`tests/modo-paleta.test.ts` mide el modo de la página sin esperar la red que no usa: corrido sin cambios en un clon de HEAD con la petición del vídeo del hero de Storage sin contestar, su caso de la página real pasa; y en un clon con `branding.mode` de la plantilla C en «light», cae por su aserción del modo", () => {
  conTemporal((base) => {
    const clon = clonDe(base, "clon", git(ROOT, "rev-parse", "HEAD"));
    try {
      const correr = (extra: string[]) => correrNode(["--import", "tsx", ...extra, "--test", "--test-reporter=tap", `--test-name-pattern=${PAGINA}`, TEST], { cwd: clon, env: entornoLimpio(), minutos: 15 });

      // (1) El vídeo del hero, retenido: el modo se mide igual. Hoy: «page.goto: Timeout 30000ms exceeded».
      const retenido = correr(["--import", pathToFileURL(instrumento("sin-video.mjs")).href]);
      const retenidas = (retenido.out.match(/SIN-VIDEO retenida /g) ?? []).length;
      assert.ok(retenidas >= 1, `precondición (ARNÉS): la precarga retuvo la petición del vídeo del hero (retenidas: ${retenidas})\n${retenido.out.slice(-1500)}`);
      const c1 = cuenta(retenido);
      assert.ok(c1.pass === 1 && c1.fail === 0, `con el vídeo del hero sin contestar, «página real» de ${TEST} pasa (pass ${c1.pass}, fail ${c1.fail})\n${retenido.out.match(/error: [^\n]*(\n {4}[^\n]*){0,3}/)?.[0] ?? retenido.out.slice(-1200)}`);

      // (2) La otra dirección: con el modo de C mal puesto, cae por la aserción del modo, no por tiempo.
      const fx = JSON.parse(readFileSync(join(clon, FIXTURE_C), "utf8"));
      assert.equal(fx.branding?.mode, "dark", `precondición: ${FIXTURE_C} declara branding.mode «dark»`);
      fx.branding.mode = "light";
      writeFileSync(join(clon, FIXTURE_C), JSON.stringify(fx, null, 2));
      const mal = correr([]);
      const c2 = cuenta(mal);
      assert.equal(c2.fail, 1, `con branding.mode de C en «light», «página real» de ${TEST} cae (fail ${c2.fail})\n${mal.out.slice(-1200)}`);
      assert.match(mal.out, /html\.dark=false/, `y cae por su aserción del modo («html.dark=false»), no por tiempo\n${mal.out.match(/error: [^\n]*/)?.[0] ?? mal.out.slice(-800)}`);
    } finally { quitarEnlace(clon); }
  });
});
