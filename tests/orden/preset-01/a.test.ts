// PRESET-01 · A (T) · el preset de peluquería sin los datos de un negocio concreto (A1) y las dos plantillas sin las cuentas de sus
// empleadas ni las reseñas «de Google» (A2). Sesión A (2026-09-23): tests rojos — no existe `tests/preset-generico.test.ts` (A1) y el
// `staff` del fixture A trae `https://instagram.com/noa.color` (A2).
// D-76: un guard protege lo que la página SIRVE, no lo que un grep encuentra en una línea. Por eso A1 no se conforma con leer el
// guard: lo CORRE anidado (`NODE_TEST_CONTEXT` borrado, lección de CONEXION-06-A2: heredarlo hace que el runner avise «skipping
// running files» y salga 0 sin cargar nada) y además MIDE POR SU CUENTA los cuatro presets CARGADOS —con el cargador de `_comun.ts`,
// porque `peluqueria.<lang>.ts` importa `./themes` sin extensión— recorriendo TODOS sus strings, no las líneas que un grep conoce.
// A2 lee los dos fixtures en disco y los compara hoja por hoja con `git show 621bfe5:…`. Ningún test escribe en T, en H, en Storage
// ni en Firestore. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CIUDAD, CLAVES, CONEXION_08, DOMINIO_EMAIL, FIXTURES, GOOGLE, GUARD_PRESET, IDENTIDAD, IDIOMAS, INSTAGRAM, NICHO, ROOT, TELEFONO,
  cadenas, correrLargo, emailsDe, fixture, fuente, get, git, nombresTap, presetsDeT, rutaPreset, titulos, tokensDeScript,
} from "./_comun.ts";

/** Las tres claves que esta orden toca en los fixtures, y nada más (A2). `contact.address` entra entera (hoy no existe). */
const CAMBIA = (ruta: string) =>
  /^staff\.\d+\.social(\.|$)/.test(ruta) ||
  /(^|\.)testimonials\.\d+\.title$/.test(ruta) ||
  /^contact\.address(\.|$)/.test(ruta);
/** Hojas de un objeto como mapa `ruta con puntos` → valor (para comparar dos versiones de un fixture sin depender del orden). */
function hojas(o: unknown, prefijo = "", acc: Map<string, unknown> = new Map()): Map<string, unknown> {
  if (o === null || typeof o !== "object") { acc.set(prefijo, o); return acc; }
  if (Array.isArray(o)) { o.forEach((v, i) => hojas(v, `${prefijo}.${i}`, acc)); if (!o.length) acc.set(prefijo, "[]"); return acc; }
  const e = Object.entries(o as Record<string, unknown>);
  if (!e.length) acc.set(prefijo, "{}");
  for (const [k, v] of e) hojas(v, prefijo ? `${prefijo}.${k}` : k, acc);
  return acc;
}
/** Rutas cuyo valor cambia (o aparece o desaparece) entre dos objetos. */
function cambios(antes: unknown, ahora: unknown): string[] {
  const a = hojas(antes), b = hojas(ahora);
  const rutas = new Set([...a.keys(), ...b.keys()]);
  return [...rutas].filter((r) => JSON.stringify(a.get(r)) !== JSON.stringify(b.get(r))).sort();
}

test("tests/preset-generico.test.ts existe, está en `test:unit` de package.json y nombra literalmente «phone», «email», «instagram» y «Google»; afirma, sobre los cuatro presets `src/config/presets/peluqueria.{he,en,ru,ar}.ts` (cargados, no leídos como texto): que `contact.phone` es `+972 3-000-0000`; que todo email que aparece en el preset termina en `@example.com`; que ningún string del preset contiene `instagram.com/` y que `sections.instagram.handle` está vacío o ausente; que ningún `testimonials[].title` contiene «גוגל», «Google», «Гугл» ni «غوغل» (sin distinguir mayúsculas); y que ningún string del preset contiene «Studio Noa», «studionoa», «נועה לשיער», «نوعا للشعر», «5245204», «ביאליק», «Bialik», «Бялик», «بياليك», «רמת גן», «Ramat Gan», «Рамат-Ган» ni «رمات غان»", async () => {
  // (1) El guard nuevo: existe, lo corre la fase concurrente y nombra las cuatro claves. Hoy no existe: aquí está el rojo.
  assert.ok(existsSync(resolve(ROOT, GUARD_PRESET)), `no existe ${GUARD_PRESET}`);
  assert.ok(tokensDeScript("test:unit").includes(GUARD_PRESET), `${GUARD_PRESET} debe estar en el script test:unit (D-57)`);
  const guard = fuente(GUARD_PRESET);
  const faltan = CLAVES.filter((c) => !guard.includes(c));
  assert.deepEqual([...faltan], [], `${GUARD_PRESET} debe nombrar literalmente ${CLAVES.map((c) => `«${c}»`).join(", ")} (no nombra: ${faltan.join(", ")})`);

  // (2) El guard CORRE y pasa de verdad, con al menos un test por clave.
  const r = correrLargo(["--experimental-strip-types", "--test", GUARD_PRESET], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `${GUARD_PRESET} debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, /^# fail 0$/m, `${GUARD_PRESET} sin fallos:\n${r.stdout.slice(-2000)}`);
  assert.doesNotMatch(r.out, /skipping running files/, "el runner anidado corrió de verdad (NODE_TEST_CONTEXT borrado)");
  const nombres = nombresTap(r.stdout);
  assert.ok(nombres.length >= CLAVES.length, `al menos un test por clave en el TAP (hay ${nombres.length}: ${nombres.join(" · ")})`);

  // (3) Lo que el guard afirma, medido aquí sobre los cuatro presets CARGADOS: todos sus strings, no los que un grep conoce.
  const presets = await presetsDeT();
  assert.equal(presets.length, 4, "los cuatro idiomas del preset de peluquería");
  for (const [lang, preset] of presets) {
    const quien = `${rutaPreset(lang)}`;
    assert.equal(get(preset, "business.type"), NICHO, `precondición: ${quien} es el preset de ${NICHO}`);
    const todas = cadenas(preset);
    assert.ok(todas.length > 100, `precondición: ${quien} se cargó entero (${todas.length} strings)`);

    // teléfono genérico (D-80)
    assert.equal(get(preset, "contact.phone"), TELEFONO, `${quien}: contact.phone = «${TELEFONO}» (hay ${JSON.stringify(get(preset, "contact.phone"))})`);
    // todo email, de un dominio que no es de nadie (D-86, RFC 2606)
    for (const [ruta, s] of todas) {
      for (const mail of emailsDe(s)) {
        assert.ok(mail.toLowerCase().endsWith(DOMINIO_EMAIL), `${quien} · ${ruta}: el email «${mail}» debe terminar en «${DOMINIO_EMAIL}»`);
      }
    }
    // ninguna cuenta de Instagram, ni en una url ni en el handle de la sección
    const conIg = todas.filter(([, s]) => s.includes(INSTAGRAM));
    assert.deepEqual(conIg.map(([ruta]) => ruta), [], `${quien}: ningún string con «${INSTAGRAM}» (hay ${conIg.map(([r, s]) => `${r} = ${s}`).join(" · ")})`);
    const handle = get(preset, "sections.instagram.handle");
    assert.ok(handle === undefined || handle === null || handle === "", `${quien}: sections.instagram.handle vacío o ausente (hay ${JSON.stringify(handle)})`);
    // ninguna reseña firmada como «de Google»
    for (const [ruta, s] of titulos(preset)) {
      for (const g of GOOGLE) assert.ok(!s.toLowerCase().includes(g.toLowerCase()), `${quien} · ${ruta}: un testimonio no dice «${g}» (hay «${s}»)`);
    }
    // nada que identifique al negocio, el lugar exacto o la razón social
    for (const [ruta, s] of todas) {
      for (const marca of IDENTIDAD) assert.ok(!s.includes(marca), `${quien} · ${ruta}: el preset no nombra «${marca}» (hay «${s.slice(0, 90)}»)`);
    }
  }
});

test("dev-fixtures/peluqueria-paleta-a.json y -c.json no tienen ninguna url `instagram.com/` en `staff[]`, ningún `testimonials[].title` con «גוגל» o «Google», y tienen `contact.address` con sólo la ciudad o el barrio de su hero (A contiene «הרצליה פיתוח», C contiene «פלורנטין») y ningún dígito; nada más cambia en los fixtures (`git diff 621bfe5 HEAD -- dev-fixtures/*.json`, comparado hoja por hoja, sólo toca `staff[].social`, `testimonials[].title` y `contact.address`)", () => {
  for (const p of ["a", "c"] as const) {
    const f = fixture(p);
    const quien = `${FIXTURES}/${NICHO}-paleta-${p}.json`;
    // (1) Ninguna cuenta de empleada. Hoy las tres están: aquí es donde esta orden está en rojo.
    const staff = (f.staff ?? []) as Record<string, unknown>[];
    assert.ok(staff.length > 0, `precondición: ${quien} tiene staff`);
    const conIg = cadenas(staff, "staff").filter(([, s]) => s.includes(INSTAGRAM));
    assert.deepEqual(conIg.map(([ruta]) => ruta), [], `${quien}: ningún miembro con «${INSTAGRAM}» (hay ${conIg.map(([r, s]) => `${r} = ${s}`).join(" · ")})`);
    // (2) Ninguna reseña firmada como «de Google», en la raíz y en cada translations.<lang> (D-86: «en los cuatro idiomas»).
    for (const [ruta, s] of titulos(f)) {
      for (const g of GOOGLE) assert.ok(!s.toLowerCase().includes(g.toLowerCase()), `${quien} · ${ruta}: un testimonio no dice «${g}» (hay «${s}»)`);
    }
    // (3) `contact.address` con la ciudad o el barrio de su hero y ningún dígito (D-85: A y C conservan su ciudad; D-86: sin número).
    const address = get(f, "contact.address");
    assert.ok(address !== undefined && address !== null, `${quien}: contact.address existe (hay ${JSON.stringify(address)})`);
    const texto = cadenas(address, "contact.address");
    assert.ok(texto.length > 0, `${quien}: contact.address tiene texto (hay ${JSON.stringify(address)})`);
    const junto = texto.map(([, s]) => s).join(" ");
    assert.ok(junto.includes(CIUDAD[p]), `${quien}: contact.address nombra «${CIUDAD[p]}», la ciudad de su hero (hay «${junto}»)`);
    assert.doesNotMatch(junto, /\d/, `${quien}: contact.address sin dígitos, ni calle ni código postal (hay «${junto}»)`);
    // (4) Nada más cambia: contra el commit aprobado de CONEXION-08, cada hoja distinta es una de las tres claves de esta orden.
    const antes = JSON.parse(git(ROOT, "show", `${CONEXION_08.aprobado.T}:${FIXTURES}/${NICHO}-paleta-${p}.json`));
    const ahora = JSON.parse(readFileSync(resolve(ROOT, FIXTURES, `${NICHO}-paleta-${p}.json`), "utf8"));
    const otras = cambios(antes, ahora).filter((ruta) => !CAMBIA(ruta.replace(/^translations\.[a-z]{2}\./, "")));
    assert.deepEqual(otras, [], `${quien}: fuera de staff[].social, testimonials[].title y contact.address, nada cambia desde ${CONEXION_08.aprobado.T}`);
  }
});
