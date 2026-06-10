/**
 * footer-v2.tsx — MINIMAL ONE-LINE footer variant.
 *
 * A single slim bar: small brand name, inline nav of the essential links
 * (legal + admin) separated by middots, social icons end-aligned, copyright.
 * Everything sits in one row at lg+; below lg it stacks into two rows
 * (brand + socials / links + copyright). Hairline top border.
 *
 * Functionality contract (same as Footer v1, which must stay untouched):
 * legal navigation via onLegalNavigate, the discreet admin affordance via
 * useAdminAccess, socials from siteConfig.contact.social, copyright.
 */
import React from "react";
import { Instagram, Facebook, Twitter } from "lucide-react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { LEGAL_ROUTES, type LegalDocKind } from "../../../config/legalContent";
import type { PublicShellPage } from "../../../types";
import { useAdminAccess } from "../../../hooks/useAdminAccess";

export function FooterV2({
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

  const legalLinks = [
    { label: localeConfig.footer.privacyPolicy, kind: "privacy" as LegalDocKind },
    { label: localeConfig.footer.termsConditions, kind: "terms" as LegalDocKind },
    { label: localeConfig.footer.cancellationPolicy, kind: "cancellation" as LegalDocKind },
  ];

  const linkClass =
    "inline-flex min-h-11 items-center rounded px-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:min-h-0 lg:py-1 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]";

  const middot = (
    <span aria-hidden="true" className="select-none text-muted-foreground/40">
      ·
    </span>
  );

  const socials = (
    <div className="flex items-center gap-1">
      {contact.social.instagram && (
        <a
          href={contact.social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:h-9 lg:w-9 [transition:color_0.25s_cubic-bezier(0.23,1,0.32,1)]"
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
          className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:h-9 lg:w-9 [transition:color_0.25s_cubic-bezier(0.23,1,0.32,1)]"
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
          className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:h-9 lg:w-9 [transition:color_0.25s_cubic-bezier(0.23,1,0.32,1)]"
        >
          <Twitter size={15} />
        </a>
      )}
    </div>
  );

  return (
    <footer className="border-t border-border bg-background transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:py-4">

        {/* Row 1 on mobile: brand + socials. At lg+ the brand stays start-aligned. */}
        <div className="flex items-center justify-between gap-4 lg:justify-start">
          <button
            type="button"
            onClick={() => onPageChange("landing")}
            className="rounded text-sm font-bold tracking-tight text-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]"
          >
            {brand.name}
          </button>
          <div className="lg:hidden">{socials}</div>
        </div>

        {/* Row 2 on mobile: essential links + copyright. One inline run at lg+. */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0 lg:gap-x-3">
          {legalLinks.map(({ label, kind }, i) => (
            <React.Fragment key={kind}>
              {i > 0 && middot}
              <a
                href={LEGAL_ROUTES[kind]}
                onClick={(e) => { e.preventDefault(); onLegalNavigate(kind); }}
                className={linkClass}
              >
                {label}
              </a>
            </React.Fragment>
          ))}
          {showAdminNavLink && (
            <>
              {middot}
              <button type="button" onClick={onAdminClick} className={linkClass}>
                {localeConfig.footer.admin}
              </button>
            </>
          )}
        </div>

        {/* End group at lg+: copyright + socials */}
        <div className="flex items-center gap-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} {brand.name}
          </p>
          <div className="hidden lg:block">{socials}</div>
        </div>

      </div>
    </footer>
  );
}
