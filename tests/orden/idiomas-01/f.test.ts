// IDIOMAS-01 · A (T) · los datos de la clienta en los cuatro idiomas (D11). Sesión A (2026-09-29): tests rojos.
//
// D-133 (medido con este mismo arnés, T 19ba544): con el fixture A, en en/ru/ar salen 3 diferencias frente a he —servicios
// (`cut:120-350/60`, del preset, en vez de `cut:180-420/90`), equipo y reseñas (3 del preset en vez de 8)—; con el C, 2
// (servicios: 12 del preset en vez de 6; y equipo). La causa: `overlayForLanguage` (`src/config/site.ts:246`) en otro idioma
// aplica sólo `pickLanguageSafeOverride` + `translations[lang]`, y `LANGUAGE_SAFE_KEYS` (`:291`) no incluye services, staff ni
// testimonials.
// D-143 (medido): HOY una capa `translations.en.services` escrita como OBJETO POR ID —la forma de D11-1— convierte el array
// `services` de la página en un objeto (`mergeDeep` pone el objeto donde estaba el array). Por eso A2 y A3 empiezan afirmando que
// siguen siendo arrays: es su primera aserción y es donde caen hoy, nunca con un TypeError.
//
// Referencia exacta: `diseno/services/prototipo/overlay-idiomas.js`. Los tests miden por el camino real —`applyTenantConfigOverride`
// + `switchSiteLanguage`, lo que la página hace— y no por una función nueva (D-134). Clientes sintéticos en A1–A3, para controlar
// cada caso; los fixtures reales en A4, que es el instrumento de aceptación (`igualdad.mjs`, D-139). Los ids de los clientes
// sintéticos existen en el preset de peluquería (cut, blowdry, highlights; noa), con OTROS precios y OTRAS fotos: si la página
// cayera al preset, se vería. Sólo en T (inciso n). No escribe nada.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { OTROS, PALETAS, canonico, cerrarSitio, diferencias, enIdiomas, fixture, huella, sitio } from "./_comun.ts";

after(cerrarSitio);

const FOTO = (n: string) => `https://firebasestorage.googleapis.com/v0/b/x/o/clients%2Fidiomas%2Fmedia%2F${n}?alt=media&token=0`;

/** Estructura de las tres secciones del cliente: todo lo que NO es texto (D-134). */
function estructura(c: Record<string, any>) {
  return {
    servicios: (c.services ?? []).map((s: any) => ({ id: s.id, price: s.price, priceMax: s.priceMax ?? null, duration: s.duration, mode: s.mode ?? null })),
    fotosServicios: c.sections?.services?.images ?? null,
    equipo: (c.staff ?? []).map((s: any) => ({ id: s.id, photoUrl: s.photoUrl })),
    resenas: (c.testimonials ?? []).map((t: any) => ({ id: t.id, rating: t.rating })),
  };
}

test("en en, ru y ar, `services[]`, `staff[]` y `testimonials[]` salen del cliente y nunca del preset: los mismos ids, precios, `priceMax`, duración, `mode`, fotos, orden y cantidad que en el idioma base", async () => {
  // Dos servicios en otro orden que el preset (12, `cut` primero), con otros precios, un `priceMax` y un `mode` de consulta; una
  // persona con otra foto; dos reseñas. Nada de esto está en el preset, así que cualquier caída al preset cambia la estructura.
  const CLIENTE = {
    business: { type: "peluqueria" },
    services: [
      { id: "highlights", name: "גוונים של הלקוחה", description: "גוונים עדינים שנבנים לאט לפי הבקשה.", price: 777, priceMax: 999, duration: 135, mode: "consulta" },
      { id: "cut", name: "תספורת של הלקוחה", description: "תספורת מדויקת עם ייעוץ ופן בסיום.", price: 111, duration: 25, mode: "reserva" },
    ],
    sections: { services: { images: [FOTO("s1.jpg"), FOTO("s2.jpg")] } },
    staff: [{ id: "noa", name: "נועה", specialty: "צבע", bio: "צובעת עשר שנים.", photoUrl: FOTO("noa.jpg") }],
    testimonials: [
      { id: "r1", name: "יעל ב.", rating: 4, text: "שירות מעולה ותוצאה מדויקת." },
      { id: "r2", name: "דנה", rating: 3, text: "טוב, אבל חיכיתי קצת." },
    ],
  };
  const c = await enIdiomas(CLIENTE);
  const base = estructura(c.he);
  // Precondición del idioma base: la estructura del cliente llega entera en hebreo (lo que ya funciona hoy).
  assert.deepEqual(base.servicios.map((s: any) => s.id), ["highlights", "cut"], "precondición: en he los servicios son los del cliente, en su orden");

  for (const l of OTROS) {
    assert.deepEqual(canonico(estructura(c[l])), canonico(base), `${l}: servicios, fotos, equipo y reseñas tienen que ser los del cliente —ids, precios, priceMax, duración, mode, fotos, orden y cantidad—, nunca los del preset`);
  }
});

test("en en, ru y ar el texto de cada servicio, persona y reseña sale de `translations.<lang>.services|staff|testimonials.<id>` —objeto por id o array con `id`—; si falta, queda el del idioma base y nunca el del preset; y un campo que el cliente no tiene en su idioma base no aparece en los otros", async () => {
  const CLIENTE = {
    business: { type: "peluqueria" },
    services: [
      { id: "cut", name: "HE-cut", description: "HE-cut-frase", price: 111, duration: 25 },
      { id: "blowdry", name: "HE-blowdry", description: "", price: 55, duration: 30 }, // sin frase en el idioma base
      { id: "highlights", name: "HE-highlights", description: "HE-highlights-frase", price: 777, duration: 135 }, // sin texto en en
    ],
    staff: [{ id: "noa", name: "HE-noa", specialty: "HE-noa-especialidad", bio: "HE-noa-bio", photoUrl: FOTO("noa.jpg") }],
    testimonials: [{ id: "r1", name: "יעל", rating: 5, text: "HE-r1" }],
    translations: {
      // en: objeto por id (la forma de D11-1).
      en: {
        services: { cut: { name: "EN-cut", description: "EN-cut-frase" }, blowdry: { name: "EN-blowdry", description: "NO-DEBE-APARECER" } },
        staff: { noa: { specialty: "EN-noa-especialidad" } },
      },
      // ru: array con `id` (la forma de las reseñas de C).
      ru: { services: [{ id: "cut", name: "RU-cut" }] },
    },
  };
  const c = await enIdiomas(CLIENTE, ["he", "en", "ru", "ar"]);
  const de = (l: string, sec: string, id: string) => (c[l][sec] as any[]).find((x: any) => x.id === id);

  // (1) Siguen siendo arrays. HOY no: la capa por id convierte `services` en un objeto (D-143). Aquí está el rojo.
  for (const l of ["en", "ru"]) {
    assert.ok(Array.isArray(c[l].services), `${l}: \`services\` tiene que seguir siendo el array del cliente aunque translations.${l}.services venga por id (hoy es ${typeof c[l].services}, D-143)`);
    assert.ok(Array.isArray(c[l].staff), `${l}: \`staff\` sigue siendo un array`);
  }

  // (2) El texto del idioma, por id: objeto (en) o array con `id` (ru).
  assert.equal(de("en", "services", "cut").name, "EN-cut", "en: el nombre sale de translations.en.services.cut");
  assert.equal(de("en", "services", "cut").description, "EN-cut-frase", "en: la frase sale de translations.en.services.cut");
  assert.equal(de("ru", "services", "cut").name, "RU-cut", "ru: el nombre sale del array translations.ru.services por su `id`");
  assert.equal(de("en", "staff", "noa").specialty, "EN-noa-especialidad", "en: la especialidad sale de translations.en.staff.noa");

  // (3) Si falta, el del idioma base, NUNCA el del preset (los ids existen en el preset con otro texto).
  assert.equal(de("en", "services", "highlights").name, "HE-highlights", "en: sin texto propio, el nombre de highlights es el hebreo de la clienta, no el del preset");
  assert.equal(de("ru", "services", "cut").description, "HE-cut-frase", "ru: sin frase propia, queda la hebrea de la clienta");
  assert.equal(de("en", "staff", "noa").name, "HE-noa", "en: el nombre de la persona, sin texto propio, es el de la clienta");
  assert.equal(de("en", "staff", "noa").bio, "HE-noa-bio", "en: la bio, sin texto propio, es la de la clienta");
  for (const l of OTROS) assert.equal(de(l, "services", "cut").price, 111, `${l}: el precio es el de la clienta (el preset pone 120)`);
  assert.equal(de("ar", "services", "cut").name, "HE-cut", "ar, sin capa: el nombre es el hebreo de la clienta, nunca el del preset árabe");

  // (4) Presencia: la clienta no tiene frase para blowdry en su idioma base, así que tampoco aparece en los otros.
  for (const l of OTROS) {
    const d = de(l, "services", "blowdry").description;
    assert.ok(d === "" || d == null, `${l}: blowdry no tiene frase en el idioma base, así que tampoco en ${l} (dio «${d}»)`);
  }
});

test("en en, ru y ar cada reseña lleva `originalLang` y `translated`: con texto propio en ese idioma, `text` es la traducción, `originalText` el original y `translated` verdadero; en su idioma de origen o sin traducción, `text` es el original y `translated` falso; y el nombre de quien la escribió no se traduce", async () => {
  const CLIENTE = {
    business: { type: "peluqueria" },
    testimonials: [
      { id: "r1", name: "יעל ב.", rating: 5, text: "HE-r1", service: "צבע" }, // en hebreo, con traducción en en y ru
      { id: "r2", name: "Anna K.", rating: 4, text: "EN-r2", lang: "en" }, // escrita en inglés
      { id: "r3", name: "דנה", rating: 5, text: "HE-r3" }, // en hebreo, sin traducción
    ],
    translations: {
      en: { testimonials: { r1: { text: "EN-r1", service: "Colour" }, r2: { text: "NO-DEBE-APARECER" } } },
      ru: { testimonials: [{ id: "r1", text: "RU-r1" }] },
    },
  };
  const c = await enIdiomas(CLIENTE);
  const r = (l: string, id: string) => (c[l].testimonials as any[]).find((x: any) => x.id === id);

  // (1) Siguen siendo un array (D-143). HOY no: aquí está el rojo.
  for (const l of OTROS) assert.ok(Array.isArray(c[l].testimonials), `${l}: \`testimonials\` tiene que seguir siendo el array del cliente (hoy es ${typeof c[l].testimonials}, D-143)`);

  // (2) Traducida: el texto del idioma, el original conservado, marcada.
  assert.equal(r("en", "r1").text, "EN-r1", "en: r1 muestra su traducción");
  assert.equal(r("en", "r1").originalText, "HE-r1", "en: r1 conserva su original");
  assert.equal(r("en", "r1").originalLang, "he", "en: r1 se escribió en hebreo");
  assert.equal(r("en", "r1").translated, true, "en: r1 va marcada como traducción");
  assert.equal(r("ru", "r1").text, "RU-r1", "ru: r1 muestra su traducción (array con id)");
  assert.equal(r("ru", "r1").translated, true, "ru: r1 va marcada como traducción");

  // (3) En su idioma de origen: el original, sin marca, aunque haya una «traducción» a ese mismo idioma.
  assert.equal(r("en", "r2").text, "EN-r2", "en: r2 se escribió en inglés, así que en inglés se ve su original");
  assert.equal(r("en", "r2").translated, false, "en: r2 no es una traducción");
  assert.equal(r("en", "r2").originalLang, "en", "en: r2 dice en qué idioma se escribió");

  // (4) Sin traducción: el original, sin marca.
  for (const l of OTROS) {
    assert.equal(r(l, "r3").text, "HE-r3", `${l}: r3 no tiene traducción, así que se ve su original`);
    assert.equal(r(l, "r3").translated, false, `${l}: r3 no es una traducción`);
    assert.equal(r(l, "r3").originalLang, "he", `${l}: r3 dice en qué idioma se escribió`);
  }

  // (5) El nombre de quien la escribió no se traduce, en ningún idioma.
  for (const l of OTROS) assert.equal(r(l, "r1").name, "יעל ב.", `${l}: el nombre de quien escribió r1 no se traduce`);
});

test("con los fixtures A y C, la huella de `igualdad.mjs` —servicios, fotos de servicios, destacados, equipo, reseñas, galería, faq, instagram, horario y teléfono— da IGUAL en en, ru y ar frente a he", async () => {
  // D-139: la huella es la de `diseno/capturas/03-igualdad-idiomas/igualdad.mjs:8–19`, calculada sobre el mismo `siteConfig` que
  // la página, sin navegador. Hoy A da 3 diferencias por idioma y C 2 (D-133).
  const malas: string[] = [];
  for (const p of PALETAS) {
    const c = await enIdiomas(fixture(p));
    const base = huella(c.he);
    for (const l of OTROS) for (const d of diferencias(base, huella(c[l]))) malas.push(`${p} · ${l} · ${d}`);
  }
  assert.deepEqual(malas, [], `con los fixtures A y C, cada idioma tiene que dar IGUAL frente a he (lo que difiere hoy es lo del preset):\n  ${malas.join("\n  ")}`);
});
