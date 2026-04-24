import React from "react";
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter, Calendar, ArrowRight } from "lucide-react";
import { BrandLogo } from "../ui/BrandLogo";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { LEGAL_ROUTES, type LegalDocKind } from "../../config/legalContent";
import type { PublicShellPage } from "../../types";
import { useAdminAccess } from "../../hooks/useAdminAccess";

export function Footer({
  onAdminClick,
  onLegalNavigate,
  onPageChange,
  onBookClick,
}: {
  onAdminClick: () => void;
  onLegalNavigate: (policy: LegalDocKind) => void;
  onPageChange: (page: PublicShellPage) => void;
  onBookClick?: () => void;
}) {
  const { contact, brand } = siteConfig;
  const { user, loading: authLoading, isAdmin } = useAdminAccess();
  const showAdminNavLink = !authLoading && (!user || isAdmin);

  const navLinks = (
    [
      {
        id: "services" as const,
        label: localeConfig.footer.linkServices,
        page: "landing" as PublicShellPage,
        enabled: siteConfig.features.showServices,
      },
      {
        id: "team" as const,
        label: localeConfig.footer.linkTeam,
        page: "landing" as PublicShellPage,
        enabled: siteConfig.features.showTeam,
      },
      {
        id: "whyUs" as const,
        label: localeConfig.footer.linkWhyUs,
        page: "landing" as PublicShellPage,
        enabled: siteConfig.features.showWhyChooseUs,
      },
      {
        id: "portfolio" as const,
        label: localeConfig.footer.linkPortfolio,
        page: "gallery" as PublicShellPage,
        enabled: siteConfig.features.showGallery,
      },
      {
        id: "testimonials" as const,
        label: localeConfig.footer.linkTestimonials,
        page: "landing" as PublicShellPage,
        enabled: siteConfig.features.showTestimonials,
      },
      {
        id: "contact" as const,
        label: localeConfig.footer.linkContact,
        page: "landing" as PublicShellPage,
        enabled: siteConfig.features.showInquiry,
      },
      {
        id: "location" as const,
        label: localeConfig.footer.linkLocation,
        page: "landing" as PublicShellPage,
        enabled: siteConfig.features.showLocation,
      },
    ] as const
  ).filter((l) => l.enabled);

  return (
    <footer className="border-t border-border bg-muted transition-colors duration-300 dark:bg-background">

      {/* ── CTA Strip ───────────────────────────────────────────────── */}
      {siteConfig.features.showBooking && onBookClick && (
        <div className="border-b border-border bg-card px-6 py-12 transition-colors duration-300">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
                {localeConfig.footer.ctaEyebrow}
              </p>
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                {localeConfig.footer.ctaTitle}
              </h2>
            </div>
            <button
              onClick={onBookClick}
              className="group flex shrink-0 items-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-md shadow-accent/20 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:scale-95"
            >
              <Calendar size={16} />
              <span>{localeConfig.buttons.bookAppointment}</span>
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main footer body ────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-16">

          {/* Brand column */}
          <div className="space-y-6">
            <button
              onClick={() => onPageChange("landing")}
              className="group flex items-center gap-2.5 outline-none"
            >
              <BrandLogo variant="auto" />
            </button>

            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {brand.tagline}
            </p>

            <div className="flex gap-2">
              {contact.social.instagram && (
                <a
                  href={contact.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-all duration-300 hover:border-accent/30 hover:text-accent-light"
                >
                  <Instagram size={15} />
                </a>
              )}
              {contact.social.facebook && (
                <a
                  href={contact.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-all duration-300 hover:border-accent/30 hover:text-accent-light"
                >
                  <Facebook size={15} />
                </a>
              )}
              {contact.social.twitter && (
                <a
                  href={contact.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-all duration-300 hover:border-accent/30 hover:text-accent-light"
                >
                  <Twitter size={15} />
                </a>
              )}
            </div>
          </div>

          {/* Explore column */}
          <div>
            <h4 className="mb-6 text-xs font-bold uppercase tracking-[0.25em] text-foreground">
              {localeConfig.footer.exploreTitle}
            </h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => onPageChange(link.page)}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-accent-light"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h4 className="mb-6 text-xs font-bold uppercase tracking-[0.25em] text-foreground">
              {localeConfig.footer.contactHeading}
            </h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-accent-light" />
                <span className="leading-relaxed">
                  {contact.address.street}, {contact.address.district},{" "}
                  {contact.address.cityStateZip}
                </span>
              </li>
              <li>
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2.5 transition-colors duration-200 hover:text-accent-light"
                >
                  <Phone size={14} className="shrink-0 text-accent-light" />
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2.5 transition-colors duration-200 hover:text-accent-light"
                >
                  <Mail size={14} className="shrink-0 text-accent-light" />
                  {contact.email}
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="border-t border-border px-6 py-6 transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} {brand.name}. {localeConfig.footer.rightsReserved}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5">
            {[
              { label: localeConfig.footer.privacyPolicy, kind: "privacy" as LegalDocKind },
              { label: localeConfig.footer.termsConditions, kind: "terms" as LegalDocKind },
              { label: localeConfig.footer.cancellationPolicy, kind: "cancellation" as LegalDocKind },
            ].map(({ label, kind }) => (
              <a
                key={kind}
                href={LEGAL_ROUTES[kind]}
                onClick={(e) => { e.preventDefault(); onLegalNavigate(kind); }}
                className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent-light"
              >
                {label}
              </a>
            ))}
            {showAdminNavLink && (
              <button
                type="button"
                onClick={onAdminClick}
                className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-accent-light"
              >
                {localeConfig.footer.admin}
              </button>
            )}
          </div>
        </div>
      </div>

    </footer>
  );
}
