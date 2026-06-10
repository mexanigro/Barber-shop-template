/**
 * footer-v5.tsx — DARK CONTRAST footer variant.
 *
 * A deliberately high-contrast block that diverges from the page background
 * in BOTH modes: the surface is always `var(--brand-surface-dark)` with
 * explicit light foreground (text-white/NN, borders white/10). In light mode
 * this inversion is the point — the footer anchors the page like a plinth.
 *
 * Accent top hairline, oversized serif brand wordmark, link columns
 * (navigation / contact / legal+admin), socials + copyright strip.
 *
 * Link-building + legal/admin logic intentionally COPIED from Footer.tsx (v1
 * must stay untouched — that is the dispatcher contract in section-variants.ts).
 */
import React from "react";
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from "lucide-react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { LEGAL_ROUTES, type LegalDocKind } from "../../../config/legalContent";
import type { PublicShellPage } from "../../../types";
import { useAdminAccess } from "../../../hooks/useAdminAccess";

/** Microcopy that has no existing localeConfig key (per the variant contract). */
const STRINGS: Record<"en" | "he" | "ru" | "ar", { legal: string }> = {
  en: { legal: "Legal" },
  he: { legal: "מידע משפטי" },
  ru: { legal: "Правовая информация" },
  ar: { legal: "معلومات قانونية" },
};

export function FooterV5({
  onAdminClick,
  onLegalNavigate,
  onPageChange,
}: {
  onAdminClick: () => void;
  onLegalNavigate: (policy: LegalDocKind) => void;
  onPageChange: (page: PublicShellPage) => void;
  onBookClick?: () => void;
}) {
  const { contact, brand } = siteConfig;
  const { user, loading: authLoading, isAdmin } = useAdminAccess();
  const showAdminNavLink = !authLoading && (!user || isAdmin);

  // ─── Copied from Footer.tsx (v1) — keep in sync manually ──────────────────
  const navLinks = (
    [
      { id: "services" as const, label: localeConfig.footer.linkServices, page: "landing" as PublicShellPage, enabled: siteConfig.features.showServices },
      { id: "team" as const, label: localeConfig.footer.linkTeam, page: "landing" as PublicShellPage, enabled: siteConfig.features.showTeam },
      { id: "whyUs" as const, label: localeConfig.footer.linkWhyUs, page: "landing" as PublicShellPage, enabled: siteConfig.features.showWhyChooseUs },
      { id: "portfolio" as const, label: localeConfig.footer.linkPortfolio, page: "gallery" as PublicShellPage, enabled: siteConfig.features.showGallery },
      { id: "testimonials" as const, label: localeConfig.footer.linkTestimonials, page: "landing" as PublicShellPage, enabled: siteConfig.features.showTestimonials },
      { id: "contact" as const, label: localeConfig.footer.linkContact, page: "landing" as PublicShellPage, enabled: siteConfig.features.showInquiry || siteConfig.features.showBusinessHours || siteConfig.features.showLocation },
      { id: "about" as const, label: localeConfig.footer.linkAbout, page: "about" as PublicShellPage, enabled: siteConfig.features.enableAboutPage === true },
    ] as const
  ).filter((l) => l.enabled);

  const linkClass =
    "inline-flex min-h-11 items-center rounded text-start text-sm text-white/75 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:min-h-0 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]";

  const legalLinkClass =
    "inline-flex min-h-11 items-center rounded px-1 text-[11px] uppercase tracking-[0.15em] text-white/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:min-h-0 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]";

  const headingClass =
    "mb-6 text-xs font-bold uppercase tracking-[0.25em] text-white/50";

  const socialIconClass =
    "flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white/70 hover:border-white/40 hover:text-white hover:-translate-y-0.5 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 [transition:border-color_0.25s_cubic-bezier(0.23,1,0.32,1),color_0.25s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]";

  return (
    <footer
      className="text-white/90"
      style={{ backgroundColor: "var(--brand-surface-dark)" }}
    >
      {/* Accent top hairline */}
      <div className="h-px w-full bg-accent" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-6 pb-10 pt-14 md:pt-20">

        {/* Display wordmark */}
        <button
          onClick={() => onPageChange("landing")}
          className="block max-w-full rounded text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span className="block break-words font-serif text-[clamp(2.75rem,9vw,6.5rem)] font-bold leading-[0.95] tracking-tight text-white/[0.92]">
            {brand.name}
          </span>
        </button>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/55">
          {brand.tagline}
        </p>

        {/* Link columns */}
        <div className="mt-14 grid grid-cols-1 gap-[var(--gs-gap)] sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">

          {/* Navigation */}
          <div>
            <h4 className={headingClass}>{localeConfig.footer.exploreTitle}</h4>
            <ul className="space-y-1 lg:space-y-3">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <button onClick={() => onPageChange(link.page)} className={linkClass}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className={headingClass}>{localeConfig.footer.contactHeading}</h4>
            <ul className="space-y-3.5 text-sm text-white/75 lg:space-y-4">
              <li className="flex items-start gap-2.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-white/45" />
                <span className="leading-relaxed">
                  {contact.address.street}, {contact.address.district},{" "}
                  {contact.address.cityStateZip}
                </span>
              </li>
              <li>
                <a
                  href={`tel:${contact.phone}`}
                  className="flex min-h-11 items-center gap-2.5 rounded transition-colors duration-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:min-h-0"
                >
                  <Phone size={14} className="shrink-0 text-white/45" />
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex min-h-11 items-center gap-2.5 rounded transition-colors duration-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:min-h-0"
                >
                  <Mail size={14} className="shrink-0 text-white/45" />
                  {contact.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal + admin */}
          <div>
            <h4 className={headingClass}>{(STRINGS[localeConfig.lang] ?? STRINGS.en).legal}</h4>
            <ul className="space-y-1 lg:space-y-3">
              {[
                { label: localeConfig.footer.privacyPolicy, kind: "privacy" as LegalDocKind },
                { label: localeConfig.footer.termsConditions, kind: "terms" as LegalDocKind },
                { label: localeConfig.footer.cancellationPolicy, kind: "cancellation" as LegalDocKind },
              ].map(({ label, kind }) => (
                <li key={kind}>
                  <a
                    href={LEGAL_ROUTES[kind]}
                    onClick={(e) => { e.preventDefault(); onLegalNavigate(kind); }}
                    className={linkClass}
                  >
                    {label}
                  </a>
                </li>
              ))}
              {showAdminNavLink && (
                <li>
                  <button type="button" onClick={onAdminClick} className={linkClass}>
                    {localeConfig.footer.admin}
                  </button>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* Copyright strip */}
        <div className="mt-14 flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-6 md:flex-row md:items-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">
            © {new Date().getFullYear()} {brand.name}. {localeConfig.footer.rightsReserved}
          </p>
          {(contact.social.instagram || contact.social.facebook || contact.social.twitter) && (
            <div className="flex gap-2">
              {contact.social.instagram && (
                <a href={contact.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={socialIconClass}>
                  <Instagram size={15} />
                </a>
              )}
              {contact.social.facebook && (
                <a href={contact.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={socialIconClass}>
                  <Facebook size={15} />
                </a>
              )}
              {contact.social.twitter && (
                <a href={contact.social.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" className={socialIconClass}>
                  <Twitter size={15} />
                </a>
              )}
            </div>
          )}
        </div>

      </div>
    </footer>
  );
}
