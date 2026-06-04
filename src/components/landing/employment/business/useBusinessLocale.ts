/**
 * useBusinessLocale.ts
 *
 * Tiny accessor that pulls the per-language `business` block from the active
 * employment preset. The block is appended to each preset via a spread (typed
 * as `any` because it's added on top of the strict NichePreset interface).
 * Centralising the cast here keeps the rest of the section files clean.
 */

import { siteConfig } from "../../../../config/site";

export type BusinessSectionData = {
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleHighlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stats: Array<{ value: string; label: string }>;
  };
  benefits: {
    eyebrow: string;
    title: string;
    benefits: Array<{
      iconName: string;
      label: string;
      title: string;
      description: string;
    }>;
  };
  workers: {
    eyebrow: string;
    title: string;
    sub: string;
    categories: Array<{
      id: string;
      label: string;
      iconName: string;
      count: string;
      description: string;
    }>;
  };
  process: {
    eyebrow: string;
    title: string;
    steps: Array<{
      number: string;
      iconName: string;
      title: string;
      description: string;
    }>;
  };
  form: {
    eyebrow: string;
    title: string;
    sub: string;
    fields: {
      companyName: string;
      contactName: string;
      phone: string;
      email: string;
      jobType: string;
      jobTypePlaceholder: string;
      workerCount: string;
      workerCountPlaceholder: string;
      city: string;
      cityPlaceholder: string;
      urgency: string;
      notes: string;
      notesPlaceholder: string;
    };
    urgencyOptions: Array<{ id: string; label: string }>;
    submit: string;
    submitting: string;
    successTitle: string;
    successMessage: string;
    errorMessage: string;
  };
  testimonials: {
    eyebrow: string;
    title: string;
    items: Array<{ quote: string; author: string; role: string }>;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: Array<{ question: string; answer: string }>;
  };
};

export function useBusinessLocale(): BusinessSectionData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (siteConfig.sections as any).business as BusinessSectionData;
}
