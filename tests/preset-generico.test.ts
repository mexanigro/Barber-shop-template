// PRESET-01 (D-85, D-86): guard del preset de peluquería sin los datos de un negocio concreto. Lo que el nicho sirve por defecto no
// identifica un negocio, un lugar exacto ni una persona alcanzable desde afuera: teléfono genérico, email de un dominio reservado
// (RFC 2606), ninguna cuenta de Instagram —ni del salón ni de las empleadas—, ninguna reseña firmada como «de Google» y ningún
// nombre, razón social, calle, código postal ni ciudad del negocio del que salió el preset. Los nombres de pila de las empleadas,
// las fotos, el catálogo, los horarios y las políticas sí quedan: son el oficio, no la identidad.
// D-76: no se prueba por grep de una línea. Los cuatro presets se CARGAN y se recorren TODOS sus strings, que es lo que la página
// sirve. `peluqueria.<lang>.ts` importa `./themes` sin extensión, así que hace falta un hook de resolución (el mismo artificio de
// `tests/secciones-datos.test.ts`): sin él el módulo no carga con `node --experimental-strip-types`, sólo con tsx.
// Corre en `test:unit` (D-57): sin navegador, sólo carga de módulos y recorrido de objetos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/** Los cuatro idiomas del preset y el nombre que exporta cada uno. */
const IDIOMAS = [["he", "peluqueriaPresetHe"], ["en", "peluqueriaPresetEn"], ["ru", "peluqueriaPresetRu"], ["ar", "peluqueriaPresetAr"]] as const;
const ruta = (lang: string) => `src/config/presets/peluqueria.${lang}.ts`;

/** Los valores genéricos de D-86. */
const TELEFONO = "+972 3-000-0000";
const DOMINIO_EMAIL = "@example.com";
/** Marca de una cuenta de Instagram en cualquier string. */
const INSTAGRAM = "instagram.com/";
/** «reseña de Google» en los cuatro idiomas (la atribución que nadie escribió en Google). */
const GOOGLE = ["גוגל", "Google", "Гугл", "غوغل"] as const;
/** Razón social, marca, código postal, calle y ciudad del negocio concreto del que salió el preset (D-85). */
const IDENTIDAD = [
  "Studio Noa", "studionoa", "נועה לשיער", "نوعا للشعر",
  "5245204", "ביאליק", "Bialik", "Бялик", "بياليك",
  "רמת גן", "Ramat Gan", "Рамат-Ган", "رمات غان",
] as const;

let registrado = false;
/** Los cuatro presets CARGADOS. El hook resuelve los imports relativos sin extensión (`./themes`), que Node no resuelve solo. */
async function presets(): Promise<[string, Record<string, unknown>][]> {
  if (!registrado) {
    const hook = `import { statSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as res, dirname } from "node:path";
export async function resolve(spec, context, next) {
  if (spec.startsWith(".") && context.parentURL && context.parentURL.startsWith("file:")) {
    const base = res(dirname(fileURLToPath(context.parentURL)), spec);
    for (const e of [".ts", ".tsx", "/index.ts"]) {
      try { if (statSync(base + e).isFile()) return { url: pathToFileURL(base + e).href, shortCircuit: true }; } catch {}
    }
  }
  return next(spec, context);
}
`;
    register("data:text/javascript," + encodeURIComponent(hook));
    registrado = true;
  }
  const salida: [string, Record<string, unknown>][] = [];
  for (const [lang, nombre] of IDIOMAS) {
    const mod = (await import(pathToFileURL(resolve(ruta(lang))).href)) as Record<string, unknown>;
    const preset = mod[nombre];
    assert.ok(preset && typeof preset === "object", `${ruta(lang)} exporta ${nombre}`);
    salida.push([lang, preset as Record<string, unknown>]);
  }
  assert.equal(salida.length, 4, "los cuatro idiomas del preset de peluquería");
  return salida;
}

/** Todos los strings de un objeto, con su ruta: `[["contact.phone", "+972 …"], ["staff.0.bio", "…"], …]`. */
function cadenas(o: unknown, r = "", acc: [string, string][] = []): [string, string][] {
  if (typeof o === "string") { acc.push([r, o]); return acc; }
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Record<string, unknown>)) cadenas(v, r ? `${r}.${k}` : k, acc);
  return acc;
}
const get = (o: unknown, r: string): unknown => r.split(".").reduce<unknown>((a, k) => (a != null && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);

test("los cuatro presets de peluquería traen el `contact.phone` genérico y ningún otro teléfono del negocio del que salieron", async () => {
  for (const [lang, preset] of await presets()) {
    assert.equal(get(preset, "business.type"), "peluqueria", `precondición: ${ruta(lang)} es el preset de peluquería`);
    assert.ok(cadenas(preset).length > 100, `precondición: ${ruta(lang)} se cargó entero`);
    assert.equal(get(preset, "contact.phone"), TELEFONO, `${ruta(lang)}: contact.phone = «${TELEFONO}»`);
    for (const [r, s] of cadenas(preset)) {
      assert.ok(!s.includes("03-612-4477"), `${ruta(lang)} · ${r}: ningún teléfono del negocio concreto (hay «${s}»)`);
    }
  }
});

test("todo email que aparece en los cuatro presets es de example.com, el dominio reservado que no es de nadie (RFC 2606)", async () => {
  for (const [lang, preset] of await presets()) {
    let vistos = 0;
    for (const [r, s] of cadenas(preset)) {
      for (const mail of s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []) {
        vistos += 1;
        assert.ok(mail.toLowerCase().endsWith(DOMINIO_EMAIL), `${ruta(lang)} · ${r}: el email «${mail}» debe terminar en «${DOMINIO_EMAIL}»`);
      }
    }
    assert.ok(vistos > 0, `precondición: ${ruta(lang)} trae al menos un email (contact.email)`);
  }
});

test("ningún string de los cuatro presets es una cuenta de instagram, y `sections.instagram.handle` queda vacío o ausente", async () => {
  for (const [lang, preset] of await presets()) {
    const conIg = cadenas(preset).filter(([, s]) => s.includes(INSTAGRAM));
    assert.deepEqual(conIg.map(([r]) => r), [], `${ruta(lang)}: ningún string con «${INSTAGRAM}» (hay ${conIg.map(([r, s]) => `${r} = ${s}`).join(" · ")})`);
    const handle = get(preset, "sections.instagram.handle");
    assert.ok(handle === undefined || handle === null || handle === "", `${ruta(lang)}: sections.instagram.handle vacío o ausente (hay ${JSON.stringify(handle)})`);
  }
});

test("ninguna reseña de los cuatro presets se firma como «Google», que nadie escribió en Google", async () => {
  for (const [lang, preset] of await presets()) {
    const titulos = cadenas(preset).filter(([r]) => /(^|\.)testimonials\.\d+\.title$/.test(r));
    assert.ok(titulos.length > 0, `precondición: ${ruta(lang)} trae reseñas con título`);
    for (const [r, s] of titulos) {
      for (const g of GOOGLE) assert.ok(!s.toLowerCase().includes(g.toLowerCase()), `${ruta(lang)} · ${r}: un testimonio no dice «${g}» (hay «${s}»)`);
    }
  }
});

test("ningún string de los cuatro presets nombra el negocio, la razón social, la calle, el código postal ni la ciudad de los que salió el preset", async () => {
  for (const [lang, preset] of await presets()) {
    for (const [r, s] of cadenas(preset)) {
      for (const marca of IDENTIDAD) assert.ok(!s.includes(marca), `${ruta(lang)} · ${r}: el preset no nombra «${marca}» (hay «${s.slice(0, 90)}»)`);
    }
  }
});
