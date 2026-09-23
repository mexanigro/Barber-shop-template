// CONEXION-07 (B1, D-76, D-77): guard de las tres filas que la página de peluquería sólo PINTA — `staff[].photoUrl`,
// `testimonials[].rating` y `navbar.variant` —, que hasta esta orden estaban «sin guard» en hueco.mjs. Lo que protege no es que la
// clave aparezca en algún lado: es lo que el componente que la página monta HACE con ella (la foto de cada miembro en el camino por
// defecto de Team, una estrella por punto de rating en Testimonials, el módulo navbar-v6 elegido por el despachador) más el dato real
// del fixture A, que es lo que producción sirve. Rompiendo cualquiera de las dos mitades este archivo se pone rojo.
// Corre en `test:unit` (D-57): sin navegador, sólo lectura de fuentes, el fixture y las dos funciones puras del despachador.
//
// `section-variants.ts` importa `siteConfig` para sus helpers de estilo global; `resolveVariant` y `pickVariantModule` no lo tocan,
// pero el import se evalúa igual y `src/config/site.ts` lee `import.meta.env`, que define Vite y no Node. Por eso el único artificio
// de este guard: un hook de resolución que sustituye `../config/site` por un doble vacío. El módulo bajo prueba es el real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const TEAM = "src/components/landing/Team.tsx";
const TESTIMONIALS = "src/components/landing/Testimonials.tsx";
const NAVBAR = "src/components/layout/Navbar.tsx";
const VARIANTES = "src/lib/section-variants.ts";
/** El fixture de la paleta A: el mismo que `recrear.mjs` escribe como tenant y sirve el server de T. */
const FIXTURE = "dev-fixtures/peluqueria-paleta-a.json";

const fuente = (rel: string) => readFileSync(rel, "utf8");
const fixtureA = () => JSON.parse(readFileSync(FIXTURE, "utf8"));

type Variantes = {
  resolveVariant: (...c: Array<string | number | undefined | null>) => string;
  pickVariantModule: <T>(mapa: Record<string, T>, code: string) => T | undefined;
};
let registrado = false;
/** El despachador de variantes real, con `../config/site` sustituido por un doble vacío (ver cabecera). */
async function variantes(): Promise<Variantes> {
  if (!registrado) {
    const hook = `export async function resolve(spec, context, next) {
  if (spec.endsWith("/config/site")) return { url: "data:text/javascript," + encodeURIComponent("export const siteConfig = {};"), shortCircuit: true };
  return next(spec, context);
}
`;
    register("data:text/javascript," + encodeURIComponent(hook));
    registrado = true;
  }
  return (await import(pathToFileURL(resolve(VARIANTES)).href)) as unknown as Variantes;
}

test("Team.tsx pinta la foto de cada miembro con src={member.photoUrl} en el camino que monta peluquería, y el fixture A trae las tres en Storage", () => {
  assert.match(
    fuente(TEAM),
    /src=\{member\.photoUrl\}/,
    `${TEAM} debe pintar la foto de cada miembro con src={member.photoUrl} (el camino por defecto, que es el que monta peluquería)`,
  );
  const a = fixtureA();
  // El camino por defecto es el que se vigila: si el fixture pidiera una variante de equipo, el guard estaría mirando otra pantalla.
  assert.equal(a.business?.type, "peluqueria", "precondición: el fixture A es de peluquería");
  assert.equal(a.sections?.team?.variant, undefined, "el fixture A no pide variante de equipo: monta el camino por defecto");
  assert.equal(a.sections?.team?.teamVariant, undefined, "el fixture A no pide `teamVariant` (aura)");
  const staff = a.staff as Array<{ photoUrl?: string }>;
  assert.equal(staff.length, 3, `el fixture A tiene tres miembros (hay ${staff.length})`);
  for (const [i, m] of staff.entries()) {
    assert.match(String(m.photoUrl), /^https:\/\//, `staff[${i}].photoUrl es una url de Storage (hay «${m.photoUrl}»)`);
  }
});

test("Testimonials.tsx pinta tantas estrellas como review.rating, y las ocho reseñas del fixture A tienen rating entre 1 y 5", () => {
  assert.match(
    fuente(TESTIMONIALS),
    /\[\.\.\.Array\(review\.rating\)\]/,
    `${TESTIMONIALS} debe pintar tantas estrellas como review.rating (un array de ese largo), no un número fijo`,
  );
  const reseñas = fixtureA().testimonials as Array<{ rating?: number }>;
  assert.equal(reseñas.length, 8, `el fixture A tiene ocho reseñas (hay ${reseñas.length})`);
  for (const [i, t] of reseñas.entries()) {
    assert.equal(typeof t.rating, "number", `testimonials[${i}].rating es un número (hay ${JSON.stringify(t.rating)})`);
    assert.ok(
      Number.isInteger(t.rating) && t.rating! >= 1 && t.rating! <= 5,
      `testimonials[${i}].rating está entre 1 y 5, que es lo que la estrella sabe pintar (hay ${t.rating})`,
    );
  }
});

test("Navbar.tsx resuelve navbar.variant \"v6\" al módulo navbar-v6 por pickVariantModule, y el fixture A lo pide", async () => {
  const navbar = fuente(NAVBAR);
  assert.match(navbar, /const NavbarV6Lazy = React\.lazy\(\(\) => import\("\.\/navbar\/navbar-v6"\)/, `${NAVBAR} carga ./navbar/navbar-v6 como NavbarV6Lazy`);
  assert.match(navbar, /resolveVariant\(siteConfig\.navbar\?\.variant\)/, `${NAVBAR} resuelve la variante desde siteConfig.navbar?.variant`);
  assert.match(navbar, /pickVariantModule\(\{[^}]*\bv6:\s*NavbarV6Lazy\b[^}]*\},\s*variantCode\)/, `${NAVBAR} elige el módulo con pickVariantModule({ … v6: NavbarV6Lazy }, variantCode)`);
  assert.equal(fixtureA().navbar?.variant, "v6", "el fixture A declara navbar.variant: \"v6\"");
  // Las dos funciones puras que hacen cierta esa lectura, y el otro lado: sin variante se cae a v1, y un mapa sin v6 no inventa módulo.
  const { resolveVariant, pickVariantModule } = await variantes();
  assert.equal(resolveVariant("v6"), "v6", `${VARIANTES}: resolveVariant("v6") = "v6"`);
  assert.equal(pickVariantModule({ v6: "navbar-v6" }, resolveVariant("v6")), "navbar-v6", `${VARIANTES}: pickVariantModule elige el módulo v6`);
  assert.equal(resolveVariant(undefined), "v1", `${VARIANTES}: sin variante se cae a v1 (v6 no sale por casualidad)`);
  assert.equal(pickVariantModule({ v2: "navbar-v2" }, "v6"), undefined, `${VARIANTES}: una sección sin v6 no recibe módulo (sigue por su camino v1)`);
});
