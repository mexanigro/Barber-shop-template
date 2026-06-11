import { useEffect } from "react";
import { siteConfig } from "../config/site";
import { env } from "../config/env";
import { resolveOgImageUrl } from "./useSEO";
import type { BusinessNiche } from "../types";

const SCHEMA_TYPE: Record<BusinessNiche, string> = {
  barberia: "BarberShop",
  nails: "NailSalon",
  tattoo: "TattooParlor",
  estetica: "BeautySalon",
  cafeteria: "CafeOrCoffeeShop",
  remodelaciones: "HomeAndConstructionBusiness",
  employment: "EmploymentAgency",
};

const DAY_OF_WEEK: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/** Upserts a <script type="application/ld+json"> tag by id (update path handles Vite HMR). */
function upsertJsonLd(id: string, data: Record<string, unknown> | null) {
  let el = document.head.querySelector(`#${id}`) as HTMLScriptElement | null;
  if (data === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Injects (or updates on hot reload) JSON-LD structured data in <head>:
 *   - #ld-json-local — LocalBusiness subtype per niche, with address, hours,
 *     social profiles (sameAs), and the visible services as an OfferCatalog.
 *   - #ld-json-faq — FAQPage, only when the FAQ section is enabled and has items.
 * Must be called after bootstrap so siteConfig reflects any Firestore overrides.
 */
export function useSchema() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const { business, brand, contact, hours, services, features } = siteConfig;
    const origin = window.location.origin;
    const currency = env.uiLanguage === "he" ? "ILS" : "USD";

    // PostalAddress — omit fields that are empty
    const addressParts = [contact.address.street, contact.address.district].filter(Boolean);
    const address: Record<string, string> = { "@type": "PostalAddress" };
    if (addressParts.length > 0) address.streetAddress = addressParts.join(", ");
    if (contact.address.cityStateZip) address.addressLocality = contact.address.cityStateZip;

    // OpeningHoursSpecification — skip closed days (null)
    const openingHoursSpecification = (
      Object.entries(hours) as [string, { start: string; end: string } | null][]
    )
      .filter(([, v]) => v !== null)
      .map(([day, v]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY_OF_WEEK[day] ?? day,
        opens: v!.start,
        closes: v!.end,
      }));

    // sameAs — social profile URLs (skip non-URL values like raw phone numbers)
    const sameAs = [
      contact.social?.instagram,
      contact.social?.facebook,
      contact.social?.twitter,
    ].filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u));

    // OfferCatalog — visible services (post visibleServices/serviceOverrides)
    const offerCatalog =
      services.length > 0
        ? {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: services.map((s) => ({
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: s.name,
                ...(s.description && { description: s.description }),
              },
              ...(s.price > 0 && { price: s.price, priceCurrency: currency }),
            })),
          }
        : undefined;

    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": SCHEMA_TYPE[business.type] ?? "LocalBusiness",
      "@id": `${origin}/#business`,
      name: brand.name,
      url: origin,
      image: resolveOgImageUrl(origin),
      priceRange: "$$",
      currenciesAccepted: currency,
      inLanguage: env.uiLanguage === "he" ? "he-IL" : "en-US",
      ...(brand.description && { description: brand.description }),
      ...(contact.phone && { telephone: contact.phone }),
      ...(contact.email && { email: contact.email }),
      address,
      ...(openingHoursSpecification.length > 0 && { openingHoursSpecification }),
      ...(sameAs.length > 0 && { sameAs }),
      ...(offerCatalog && { hasOfferCatalog: offerCatalog }),
    };

    upsertJsonLd("ld-json-local", schema);

    // FAQPage — mirrors the visible FAQ section so answers can surface as
    // rich results. Removed when the section is disabled (keeps schema honest).
    const faqItems = siteConfig.sections?.faq?.items ?? [];
    // Same truthy gate App.tsx uses to render the section (undefined = hidden)
    const showFaq = Boolean(features.showFaq) && faqItems.length > 0;
    upsertJsonLd(
      "ld-json-faq",
      showFaq
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }
        : null,
    );
  }, []);
}
