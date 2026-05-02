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
  abogado: "LegalService",
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

/**
 * Injects (or updates on hot reload) a <script id="ld-json-local" type="application/ld+json">
 * tag in <head> with LocalBusiness schema data derived from siteConfig.
 * Must be called after bootstrap so siteConfig reflects any Firestore overrides.
 */
export function useSchema() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const { business, brand, contact, hours } = siteConfig;
    const origin = window.location.origin;

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

    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": SCHEMA_TYPE[business.type] ?? "LocalBusiness",
      name: brand.name,
      url: origin,
      image: resolveOgImageUrl(origin),
      priceRange: "$$",
      currenciesAccepted: env.uiLanguage === "he" ? "ILS" : "USD",
      inLanguage: env.uiLanguage === "he" ? "he-IL" : "en-US",
      ...(brand.description && { description: brand.description }),
      ...(contact.phone && { telephone: contact.phone }),
      ...(contact.email && { email: contact.email }),
      address,
      ...(openingHoursSpecification.length > 0 && { openingHoursSpecification }),
    };

    // Inject or update the tag (update path handles Vite HMR)
    let el = document.head.querySelector("#ld-json-local") as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = "ld-json-local";
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
  }, []);
}
