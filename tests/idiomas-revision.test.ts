// Revisión de idiomas de la web de Evyatar (Liam, 2026-10-09: «hacé una revisión completa prestando atención principalmente a los
// idiomas» → «todo lo que haga falta») · guard.
//
// Por qué existe. Cuatro revisores nativos (he, en, ru, ar) leyeron todo el texto visible y encontraron, entre otros:
// las páginas legales en inglés en las 4 versiones, con el texto de un salón de uñas, el nombre genérico del preset, huecos vacíos
// («registered address at .») y una nota interna con «(peluqueria)»; «3 отзывов» y «8 عمل» (plural mal); Title Case mezclado en
// inglés; el árabe que le hablaba a veces a una mujer y a veces a un hombre; «Change language» y «5/5» en inglés para el lector de
// pantalla; la fecha de la reserva «אוק׳ 11 @ 09:30»; la semana del horario empezando el lunes en inglés y ruso.
//
// Qué vigila, en las dos direcciones:
//   (1) Peluquería tiene sus páginas legales en los 4 idiomas, sin uñas, sin frases en inglés en he/ru/ar y sin marcadores raros.
//   (2) getLegalDocument resuelve nombre y dirección, no deja huecos y quita el párrafo cuyo dato falta (sin email, sin la línea).
//   (3) Los 4 locales: sin la nota interna, con el aria de idioma traducido, inglés en minúscula de frase, árabe sin trato
//       femenino ni masculino singular en lo que ve la visitante, y sin «@» en la fecha guardada.
//   (4) Los plurales: ruso «3 отзыва», árabe «8 أعمال», hebreo «עבודה אחת».
//   (5) El horario empieza el domingo y las horas en inglés llevan minutos («7:00 PM»).
//   (6) El código usa esas piezas: aria del selector y de las estrellas, «·» en la fecha, espacio tras «desde», coma árabe.
// `src/config/locale` lee `import.meta.env` (sólo Vite): se sustituye por un doble cuyo idioma el test cambia, como en
// tests/reserva-idioma.test.ts. Corre en `test:unit` (D-57): no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { messagesHe } from "../src/config/locales/he";
import { messagesEn } from "../src/config/locales/en";
import { messagesRu } from "../src/config/locales/ru";
import { messagesAr } from "../src/config/locales/ar";
import { LEGAL_PELUQUERIA } from "../src/config/legalPeluqueria";

const LOC = { he: messagesHe, en: messagesEn, ru: messagesRu, ar: messagesAr } as const;
const g = globalThis as unknown as { __locIdiomas: unknown };
g.__locIdiomas = messagesRu;
const hook = `export async function resolve(spec, context, next) {
  if (spec.endsWith("/config/locale")) return { url: "data:text/javascript," + encodeURIComponent("export const localeConfig = new Proxy({}, { get: (_, k) => globalThis.__locIdiomas[k] });"), shortCircuit: true };
  return next(spec, context);
}`;
register("data:text/javascript," + encodeURIComponent(hook));
const imp = async <T>(f: string) => (await import(pathToFileURL(resolve(f)).href)) as T;
const leer = (f: string) => readFileSync(f, "utf8");
const textos = (lang: keyof typeof LEGAL_PELUQUERIA) => Object.values(LEGAL_PELUQUERIA[lang]).flat().flatMap((s) => [s.title ?? "", ...s.paragraphs]);

test("(1) peluquería tiene sus páginas legales en los 4 idiomas, sin uñas y sin inglés en he/ru/ar", () => {
  for (const lang of ["he", "en", "ru", "ar"] as const) {
    const t = textos(lang);
    for (const kind of ["privacy", "terms", "cancellation"] as const) assert.ok(LEGAL_PELUQUERIA[lang][kind].length >= 3, `${lang}/${kind} tiene contenido`);
    const todo = t.join("\n");
    assert.doesNotMatch(todo, /nail|gel|acrylic|pedicure|technician|ציפורנ|ногт|أظافر/i, `${lang}: nada de salón de uñas`);
    for (const m of todo.matchAll(/\[(\w+)\]/g)) assert.ok(["NOMBRE", "MARCA", "DIRECCION", "TELEFONO", "EMAIL", "CANCELACION"].includes(m[1]), `${lang}: marcador conocido ${m[0]}`);
    if (lang !== "en") assert.doesNotMatch(todo.replace(/\[\w+\]/g, ""), /\b[A-Za-z]{2,}\s+[A-Za-z]{2,}\s+[A-Za-z]{2,}\b/, `${lang}: sin frases en inglés`);
  }
});

test("(2) getLegalDocument resuelve nombre y dirección, sin huecos, y sin email quita esa línea", async () => {
  g.__locIdiomas = messagesHe;
  const { getLegalDocument, nombreLegal } = await imp<typeof import("../src/config/legalContent")>("src/config/legalContent.ts");
  const site = {
    business: { type: "peluqueria", legalName: "סטודיו לשיער", address: "", cancellationPolicy: "ביטול חינם עד 24 שעות לפני התור." },
    brand: { name: "Evyatar Shitrit" },
    contact: { phone: "08-673-0483", email: "", address: { street: "שדרות דרום אפריקה 73", cityStateZip: "אשקלון" } },
  } as unknown as Parameters<typeof getLegalDocument>[1];
  assert.equal(nombreLegal(site), "Evyatar Shitrit", "el nombre genérico del preset no es la razón social: va la marca");
  for (const kind of ["privacy", "terms", "cancellation"] as const) {
    const todo = getLegalDocument(kind, site, "he").flatMap((s) => s.paragraphs).join("\n");
    assert.doesNotMatch(todo, /\[\w+\]/, `${kind}: sin marcadores sin resolver`);
    assert.doesNotMatch(todo, /סטודיו לשיער|\s[.,]|:\s*\.|\.\./, `${kind}: sin nombre genérico ni huecos`);
    assert.doesNotMatch(todo, /באימייל:/, `${kind}: sin email, sin la línea de contacto por email`);
  }
  assert.match(getLegalDocument("privacy", site, "he").flatMap((s) => s.paragraphs).join("\n"), /שדרות דרום אפריקה 73, אשקלון/);
  assert.match(getLegalDocument("cancellation", site, "he").flatMap((s) => s.paragraphs).join("\n"), /ביטול חינם עד 24 שעות לפני התור\.$/m);
  const conEmail = { ...site, contact: { ...site.contact, email: "hola@example.com" }, business: { ...site.business, legalName: "א.ש. מספרה בע״מ" } } as typeof site;
  assert.equal(nombreLegal(conEmail), "א.ש. מספרה בע״מ", "una razón social real se usa");
  assert.match(getLegalDocument("privacy", conEmail, "he").flatMap((s) => s.paragraphs).join("\n"), /hola@example\.com/);
});

test("(3) los 4 locales: sin nota interna, aria traducido, inglés en minúscula de frase, árabe neutro, sin «@»", () => {
  for (const [lang, L] of Object.entries(LOC)) {
    assert.equal(L.legal.intro, "", `${lang}: sin la nota interna «(peluqueria)…»`);
    assert.ok(L.a11y.changeLanguage && L.a11y.changeLanguage.length > 2, `${lang}: aria del selector de idioma`);
    assert.doesNotMatch(L.booking.savedFor, /@/, `${lang}: sin «@» en la fecha guardada`);
  }
  assert.notEqual(messagesHe.a11y.changeLanguage, "Change language"); assert.notEqual(messagesRu.a11y.changeLanguage, "Change language"); assert.notEqual(messagesAr.a11y.changeLanguage, "Change language");
  const en = messagesEn;
  for (const s of [en.footer.ctaEyebrow, en.team.viewProfile, en.gallery.explorePortfolio, en.galleryPage.backHome, en.booking.placeholderFullName, en.booking.placeholderEmail, en.booking.placeholderPhone, en.booking.confirmBooking, en.booking.availableTimes, en.booking.appointmentSummary, en.booking.contactDetails, en.footer.rightsReserved, en.businessHours.eyebrow])
    assert.doesNotMatch(s, /^\S+ (?:\S+ )*[A-Z]/, `en en minúscula de frase: «${s}»`);
  const ar = messagesAr;
  const publicos = [ar.footer.ctaEyebrow, ar.footer.ctaTitle, ar.footer.exploreTitle, ar.footer.contactHeading, ar.a11y.skipToContent, ar.services.groupFixed, ar.services.groupQuote, ar.services.bookService, ar.galleryPage.bookThis, ar.hero.trustRow, ar.booking.chooseService, ar.booking.chooseDate, ar.staffProfile.bookWith];
  for (const s of publicos) assert.doesNotMatch(s, /احجزي|اسألي|أرسلي|تثقين|تختارين|^احجز |^اختر |^استكشف$|^تواصل معنا$|جاهز ل/, `ar neutro: «${s}»`);
});

test("(4) los plurales: ruso «3 отзыва», árabe «8 أعمال», hebreo «עבודה אחת»", async () => {
  const { plural } = await imp<typeof import("../src/lib/plural")>("src/lib/plural.ts");
  g.__locIdiomas = messagesRu; assert.equal(plural(messagesRu.testimonials.count as Record<string, string>, 3), "3 отзыва"); assert.equal(plural(messagesRu.testimonials.count as Record<string, string>, 5), "5 отзывов");
  g.__locIdiomas = messagesAr; assert.equal(plural(messagesAr.galleryPage.worksCount as Record<string, string>, 8), "8 أعمال"); assert.equal(plural(messagesAr.testimonials.count as Record<string, string>, 3), "3 مراجعات");
  g.__locIdiomas = messagesHe; assert.equal(plural(messagesHe.galleryPage.worksCount as Record<string, string>, 1), "עבודה אחת"); assert.equal(plural(messagesHe.galleryPage.worksCount as Record<string, string>, 8), "8 עבודות");
  g.__locIdiomas = messagesEn; assert.equal(plural(messagesEn.galleryPage.worksCount as Record<string, string>, 1), "1 look");
});

test("(5) el horario empieza el domingo en los 4 idiomas y las horas en inglés llevan minutos", async () => {
  const H = await imp<typeof import("../src/lib/hours-display")>("src/lib/hours-display.ts");
  for (const L of Object.values(LOC)) { g.__locIdiomas = L; assert.equal(H.orderedDayKeys()[0], "sunday"); assert.equal(L.calendar.weekStartsOn, 0); }
  g.__locIdiomas = messagesEn; assert.equal(H.fmtTime("19:00"), "7:00 PM"); assert.equal(H.fmtTime("09:30"), "9:30 AM");
  g.__locIdiomas = messagesRu; assert.equal(H.fmtTime("19:00"), "19:00");
  assert.equal(messagesEn.calendar.weekdaysShort[0], "Su"); assert.equal(messagesRu.calendar.weekdaysShort[0], "Вс");
});

test("(6) el código usa esas piezas", () => {
  assert.match(leer("src/components/ui/LanguageSwitcher.tsx"), /aria-label=\{localeConfig\.a11y\.changeLanguage\}/);
  assert.doesNotMatch(leer("src/components/ui/LanguageSwitcher.tsx"), /aria-label="Change language"/);
  const res = leer("src/components/landing/testimonials/testimonials-v6.tsx");
  assert.match(res, /todas \? T\.reviewsShowingOriginals/);
  assert.match(leer("src/components/booking/BookingWizard.tsx"), /\} · \{selectedTime\}/); assert.doesNotMatch(leer("src/components/booking/BookingWizard.tsx"), / @ \{selectedTime\}/);
  assert.match(leer("src/components/services/services-page-v6.tsx"), /\{p\.prefix\}<\/span>\{" "\}/);
  assert.match(leer("src/components/landing/hero/hero-v6.tsx"), /plural\(localeConfig\.testimonials\.count/);
  assert.match(leer("src/components/legal/LegalPage.tsx"), /getLegalDocument\(kind, siteConfig, localeConfig\.lang\)/);
});
