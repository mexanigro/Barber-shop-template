// CONEXION-07 · B (T) · guards de equipo, testimonios y navbar. B1: el guard nuevo `tests/secciones-datos.test.ts` (D-77) cubre las
// tres filas que sólo se PINTAN — `staff.photoUrl`, `testimonials.rating` y `navbar.variant` —, que hoy están «sin guard».
// Sesión A (2026-09-23): test rojo — el archivo no existe.
// D-76: cuando la clave sólo se pinta, lo que se prueba es la lectura del componente que la página monta (`Team.tsx` en su camino por
// defecto, `Testimonials.tsx`, `Navbar.tsx`) más el dato real del fixture A; del navbar, además, las dos funciones puras que resuelven
// la variante (`resolveVariant`, `pickVariantModule`), importadas con `import()` dinámico y extensión por el cargador de `_comun.ts`.
// Como en A1, el guard se CORRE anidado (NODE_TEST_CONTEXT borrado, lección de CONEXION-06-A2) y este test mide por su cuenta lo que
// el guard afirma. Caja negra: sólo `src/lib/section-variants.ts` por import dinámico; los componentes se leen como fuente. Sólo en T.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  CLAVES_SECCIONES, GUARD_SECCIONES, NAVBAR, NICHO, ROOT, TEAM, TESTIMONIALS, VARIANTES,
  correr, fixture, fuente, get, importarModulo, tokensDeScript,
} from "./_comun.ts";

/** Nombres de los tests que el TAP de una corrida declara (`ok N - <nombre>` / `not ok N - <nombre>`), sin los subtests. */
const nombresTap = (stdout: string) => stdout.split(/\r?\n/).map((l) => l.match(/^(?:not )?ok \d+ - (.+?)\s*$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => m[1]);

test("tests/secciones-datos.test.ts existe, está en `test:unit` de package.json y nombra literalmente «photoUrl», «rating» y «navbar»; afirma que `src/components/landing/Team.tsx`, en el camino que monta la página de peluquería (sin `teamVariant` ni variante de estética), pinta la foto de cada miembro con `src={…photoUrl}`, y que el fixture A tiene tres miembros con `photoUrl` https; que `src/components/landing/Testimonials.tsx`, en su camino por defecto, pinta tantas estrellas como `review.rating` (`[...Array(review.rating)]`) y que las ocho reseñas del fixture A tienen `rating` entre 1 y 5; y que `src/components/layout/Navbar.tsx` resuelve `navbar.variant: \"v6\"` a `navbar-v6` por `pickVariantModule` y que el fixture A declara `navbar.variant: \"v6\"`", async () => {
  // (1) El guard nuevo: existe, lo corre la fase concurrente y nombra las tres claves. Hoy no existe: aquí está el rojo.
  assert.ok(existsSync(resolve(ROOT, GUARD_SECCIONES)), `no existe ${GUARD_SECCIONES}`);
  assert.ok(tokensDeScript("test:unit").includes(GUARD_SECCIONES), `${GUARD_SECCIONES} debe estar en el script test:unit (D-57)`);
  const guard = fuente(GUARD_SECCIONES);
  const faltan = CLAVES_SECCIONES.filter((c) => !guard.includes(c));
  assert.deepEqual([...faltan], [], `${GUARD_SECCIONES} debe nombrar literalmente ${CLAVES_SECCIONES.map((c) => `«${c}»`).join(", ")} (no nombra: ${faltan.join(", ")})`);

  // (2) El guard CORRE y pasa, con un test por clave como mínimo.
  const r = correr(["--experimental-strip-types", "--test", GUARD_SECCIONES], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `${GUARD_SECCIONES} debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, /^# fail 0$/m, `${GUARD_SECCIONES} sin fallos:\n${r.stdout.slice(-2000)}`);
  const nombres = nombresTap(r.stdout);
  assert.ok(nombres.length >= 3, `al menos un test por clave en el TAP (hay ${nombres.length}: ${nombres.join(" · ")})`);
  assert.doesNotMatch(r.out, /skipping running files/, "el runner anidado corrió de verdad (NODE_TEST_CONTEXT borrado)");

  const a = fixture("a");
  assert.equal(get(a, "business.type"), NICHO, `precondición: el fixture A es de ${NICHO}`);

  // (3) staff[].photoUrl: el camino por defecto de Team.tsx pinta la foto de CADA miembro, y el fixture trae las tres.
  const team = fuente(TEAM);
  assert.match(team, /src=\{member\.photoUrl\}/, `${TEAM} pinta la foto de cada miembro con src={member.photoUrl} (camino por defecto)`);
  assert.equal(get(a, "sections.team.variant"), undefined, "el fixture A no pide variante de equipo: la página monta el camino por defecto");
  assert.equal(get(a, "sections.team.teamVariant"), undefined, "el fixture A no pide `teamVariant` (aura)");
  assert.notEqual(get(a, "business.type"), "estetica", "el fixture A no es estética: no entra el mapa de variantes de estética");
  const staff = a.staff as Array<{ photoUrl?: string }>;
  assert.equal(staff.length, 3, `el fixture A tiene tres miembros (hay ${staff.length})`);
  for (const [i, m] of staff.entries()) assert.match(String(m.photoUrl), /^https:\/\//, `staff[${i}].photoUrl es https (hay «${m.photoUrl}»)`);

  // (4) testimonials[].rating: tantas estrellas como rating, y las ocho reseñas del fixture dentro de 1–5.
  assert.match(fuente(TESTIMONIALS), /\[\.\.\.Array\(review\.rating\)\]/, `${TESTIMONIALS} pinta tantas estrellas como review.rating`);
  const reseñas = a.testimonials as Array<{ rating?: number }>;
  assert.equal(reseñas.length, 8, `el fixture A tiene ocho reseñas (hay ${reseñas.length})`);
  for (const [i, t] of reseñas.entries()) {
    assert.equal(typeof t.rating, "number", `testimonials[${i}].rating es un número (hay ${JSON.stringify(t.rating)})`);
    assert.ok(Number.isInteger(t.rating) && t.rating! >= 1 && t.rating! <= 5, `testimonials[${i}].rating está entre 1 y 5 (hay ${t.rating})`);
  }

  // (5) navbar.variant: el fixture pide v6 y el despachador lo resuelve al módulo navbar-v6 por pickVariantModule.
  assert.equal(get(a, "navbar.variant"), "v6", `el fixture A declara navbar.variant: "v6" (hay ${JSON.stringify(get(a, "navbar.variant"))})`);
  const navbar = fuente(NAVBAR);
  assert.match(navbar, /const NavbarV6Lazy = React\.lazy\(\(\) => import\("\.\/navbar\/navbar-v6"\)/, `${NAVBAR} carga ./navbar/navbar-v6 como NavbarV6Lazy`);
  assert.match(navbar, /resolveVariant\(siteConfig\.navbar\?\.variant\)/, `${NAVBAR} resuelve la variante desde siteConfig.navbar?.variant`);
  assert.match(navbar, /pickVariantModule\(\{[^}]*\bv6:\s*NavbarV6Lazy\b[^}]*\},\s*variantCode\)/, `${NAVBAR} elige el módulo con pickVariantModule({ … v6: NavbarV6Lazy }, variantCode)`);
  const v = (await importarModulo(VARIANTES)) as {
    resolveVariant: (...c: Array<string | number | undefined | null>) => string;
    pickVariantModule: <T>(mapa: Record<string, T>, code: string) => T | undefined;
  };
  assert.equal(v.resolveVariant("v6"), "v6", `${VARIANTES}: resolveVariant("v6") = "v6"`);
  assert.equal(v.pickVariantModule({ v6: "navbar-v6" }, v.resolveVariant("v6")), "navbar-v6", `${VARIANTES}: pickVariantModule elige el módulo v6`);
  assert.equal(v.resolveVariant(undefined), "v1", `${VARIANTES}: sin variante se cae a v1 (el otro lado: v6 no sale por casualidad)`);
});
