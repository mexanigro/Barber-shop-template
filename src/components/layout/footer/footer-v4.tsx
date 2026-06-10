/**
 * footer-v4.tsx — CENTERED STACK footer variant.
 *
 * Everything centered on one vertical axis: logo, one-line tagline,
 * a wrapping horizontal nav row, social icons row, a hairline, then the
 * legal row (+ admin) and the copyright. Generous breathing room,
 * symmetric, timeless.
 *
 * Link-building + legal/admin logic intentionally COPIED from Footer.tsx (v1
 * must stay untouched — that is the dispatcher contract in section-variants.ts).
 */
import React from "react";
import { Instagram, Facebook, Twitter } from "lucide-react";
import { BrandLogo } from "../../ui/BrandLogo";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { LEGAL_ROUTES, type LegalDocKind } from "../../../config/legalContent";
import type { PublicShellPage } from "../../../types";
import { useAdminAccess } from "../../../hooks/useAdminAccess";

export function FooterV4({
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

  const legalLinkClass =
    "inline-flex min-h-11 items-center rounded px-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:min-h-0 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]";

  const socialIconClass =
    "flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:border-accent/30 hover:text-accent-light hover:-translate-y-0.5 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [transition:border-color_0.25s_cubic-bezier(0.23,1,0.32,1),color_0.25s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]";

  return (
    <footer className="border-t border-border bg-muted transition-colors duration-300 dark:bg-background">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center md:py-20">

        {/* Logo */}
        <button
          onClick={() => onPageChange("landing")}
          className="group flex items-center justify-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <BrandLogo
            variant="auto"
            heightClass={(siteConfig.brand.logo || siteConfig.brand.logoDark) ? "h-16 md:h-20" : undefined}
          />
        </button>

        {/* Tagline */}
        <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {brand.tagline}
        </p>

        {/* Nav row — wraps */}
        {navLinks.length > 0 && (
          <nav className="mt-9 flex flex-wrap items-center justify-center gap-x-1 gap-y-0">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onPageChange(link.page)}
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]"
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}

        {/* Socials row */}
        {(contact.social.instagram || contact.social.facebook || contact.social.twitter) && (
          <div className="mt-9 flex justify-center gap-2">
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

        {/* Hairline */}
        <div className="mt-12 h-px w-full max-w-sm bg-border" aria-hidden="true" />

        {/* Legal row + admin */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
          {[
            { label: localeConfig.footer.privacyPolicy, kind: "privacy" as LegalDocKind },
            { label: localeConfig.footer.termsConditions, kind: "terms" as LegalDocKind },
            { label: localeConfig.footer.cancellationPolicy, kind: "cancellation" as LegalDocKind },
          ].map(({ label, kind }) => (
            <a
              key={kind}
              href={LEGAL_ROUTES[kind]}
              onClick={(e) => { e.preventDefault(); onLegalNavigate(kind); }}
              className={legalLinkClass}
            >
              {label}
            </a>
          ))}
          {showAdminNavLink && (
            <button type="button" onClick={onAdminClick} className={legalLinkClass}>
              {localeConfig.footer.admin}
            </button>
          )}
        </div>

        {/* Copyright */}
        <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <bdi>© {new Date().getFullYear()} {brand.name}.</bdi> {localeConfig.footer.rightsReserved}
        </p>

      </div>
    </footer>
  );
}
