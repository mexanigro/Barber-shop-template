// CONEXION-08 · guard de `contact.phone`, `brand.logo` y `brand.logoDark` (D-76: protege lo que la página HACE con la clave, no que
// la nombre). Las tres tenían contrato, validador y casilla en el hub, y ningún test que las vigilara.
//   phone     → `toWhatsAppNumber` convierte el teléfono del config en el número de wa.me, y services-v6, navbar-v6 y hero-v6 arman
//               su enlace con él: si alguno dejara de llamarlo, el teléfono del cliente no llegaría a ningún enlace.
//   logo      → navbar-v6 pinta el logo en vez del nombre cuando lo hay, y sin `logoDark` invierte el oscuro sobre el hero.
//   logoDark  → con la versión clara NO se invierte; es la regla que decide qué logo se ve sobre el vídeo.
// La regla de `invert` se evalúa tal como está escrita en navbar-v6 (no una copia): si alguien la cambia, el guard se entera.
// Fase `test:unit`: nada de navegador (D-57).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toWhatsAppNumber } from "../src/lib/whatsapp.ts";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const fuente = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
const fixtureA = () => JSON.parse(fuente("dev-fixtures/peluqueria-paleta-a.json")) as Record<string, any>;

test("contact.phone: toWhatsAppNumber lo convierte en el número de wa.me y los tres componentes arman su enlace con él", () => {
  assert.equal(toWhatsAppNumber("+972 3-000-0000"), "97230000000", "el teléfono genérico de las plantillas");
  assert.equal(toWhatsAppNumber("03-612-4477"), "97236124477", "un número israelí con 0 inicial cambia el 0 por el país");
  assert.equal(toWhatsAppNumber("+972521234567"), "972521234567", "un número ya con «+» se respeta");
  assert.equal(toWhatsAppNumber(""), "", "sin teléfono no hay número");
  assert.equal(toWhatsAppNumber(undefined), "", "sin teléfono no hay número");

  for (const [archivo, re] of [
    ["src/components/landing/services/services-v6.tsx", /toWhatsAppNumber\(\s*contact\.phone\s*\)/],
    ["src/components/layout/navbar/navbar-v6.tsx", /toWhatsAppNumber\(\s*siteConfig\.contact\.phone\s*\)/],
    ["src/components/landing/hero/hero-v6.tsx", /toWhatsAppNumber\(\s*contact\.phone\s*\)/],
  ] as const) {
    assert.match(fuente(archivo), re, `${archivo} arma su enlace de WhatsApp con el teléfono del config`);
  }

  const phone = fixtureA().contact?.phone;
  assert.equal(typeof phone, "string", "el fixture A declara contact.phone");
  assert.ok(toWhatsAppNumber(phone), `el teléfono del fixture A da un número de wa.me (hay «${phone}»)`);
});

/** La regla de navbar-v6, evaluada tal como está escrita allí. */
function reglaInvert(): (overHero: boolean, brand: Record<string, unknown>) => boolean {
  const m = fuente("src/components/layout/navbar/navbar-v6.tsx").match(/const invert = ([^;]+);/);
  assert.ok(m, "navbar-v6 declara la regla del logo sobre el hero como «const invert = …;»");
  const f = new Function("overHero", "brand", `return !!(${m[1]});`) as (o: boolean, b: Record<string, unknown>) => boolean;
  return f;
}

test("brand.logo: navbar-v6 pinta el logo en vez del nombre y, sin versión clara, lo invierte sobre el hero", () => {
  const navbar = fuente("src/components/layout/navbar/navbar-v6.tsx");
  assert.match(navbar, /const hasLogo = !!brand\.logo \|\| !!brand\.logoDark;/, "navbar-v6 decide entre logo y nombre con brand.logo");
  assert.match(navbar, /hasLogo \? \(/, "…y pinta el logo cuando lo hay");
  const invert = reglaInvert();
  assert.equal(invert(true, { logo: "l.png" }), true, "con logo solo, sobre el hero se invierte");
  assert.equal(invert(false, { logo: "l.png" }), false, "fuera del hero nunca se invierte");
  assert.equal(invert(true, {}), false, "sin logo no hay nada que invertir");

  const logo = fixtureA().brand?.logo;
  assert.equal(typeof logo, "string", "el fixture A declara brand.logo");
  assert.ok(String(logo).startsWith("https://"), `brand.logo del fixture A es una url servida (hay «${logo}»)`);
});

test("brand.logoDark: con la versión clara, navbar-v6 no invierte el logo sobre el hero", () => {
  const invert = reglaInvert();
  assert.equal(invert(true, { logo: "l.png", logoDark: "d.png" }), false, "con logoDark se usa la versión clara, sin filtro");
  assert.equal(invert(true, { logoDark: "d.png" }), false, "sólo con logoDark tampoco se invierte");
  assert.match(fuente("src/components/layout/navbar/navbar-v6.tsx"), /variant=\{overHero \? "dark" : "auto"\}/, "navbar-v6 le pide a BrandLogo la variante «dark» sobre el hero");

  const logoDark = fixtureA().brand?.logoDark;
  assert.equal(typeof logoDark, "string", "el fixture A declara brand.logoDark");
  assert.ok(String(logoDark).startsWith("https://"), `brand.logoDark del fixture A es una url servida (hay «${logoDark}»)`);
});
