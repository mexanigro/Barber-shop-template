/**
 * footer-v3.tsx — MEGA FOOTER variant.
 *
 * Wide book-CTA strip on top, then 4 columns at lg+ — brand (logo, tagline,
 * socials), navigation (section links), services (top names → #services),
 * contact (address / phone / email / hours summary) — and a bottom bar with
 * copyright + legal links + the discreet admin affordance.
 *
 * Below lg the nav/services/contact columns collapse into accordions
 * (button headers, aria-expanded); the brand block stays always visible.
 *
 * Link-building + legal/admin logic intentionally COPIED from Footer.tsx (v1
 * must stay untouched — that is the dispatcher contract in section-variants.ts).
 */
import React from "react";
import {
  MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter,
  Calendar, ArrowRight, ChevronDown,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { BrandLogo } from "../../ui/BrandLogo";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { LEGAL_ROUTES, type LegalDocKind } from "../../../config/legalContent";
import type { PublicShellPage } from "../../../types";
import { useAdminAccess } from "../../../hooks/useAdminAccess";

const DAY_KEYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;
type DayKey = (typeof DAY_KEYS)[number];

/** Collapse the 7-day BusinessHours map into consecutive same-hours ranges. */
function buildHoursSummary(): Array<{ days: string; value: string }> {
  const hours = siteConfig.hours;
  if (!hours) return [];
  const t = localeConfig.businessHours;
  const valueOf = (k: DayKey) => {
    const h = hours[k];
    return h ? `${h.start}–${h.end}` : t.closed;
  };
  const groups: Array<{ from: DayKey; to: DayKey; value: string }> = [];
  for (const key of DAY_KEYS) {
    const value = valueOf(key);
    const last = groups[groups.length - 1];
    if (last && last.value === value) last.to = key;
    else groups.push({ from: key, to: key, value });
  }
  return groups.map((g) => ({
    days:
      g.from === g.to
        ? t.days[g.from].label
        : `${t.days[g.from].label} – ${t.days[g.to].label}`,
    value: g.value,
  }));
}

/** Mobile accordion column; always expanded (plain heading) at lg+. */
function FooterColumn({
  id, title, open, onToggle, children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border lg:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`footer-col-${id}`}
        className={cn(
          "flex min-h-12 w-full items-center justify-between gap-3 rounded py-3 text-start text-xs font-bold uppercase tracking-[0.25em] text-foreground",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          "lg:pointer-events-none lg:mb-6 lg:min-h-0 lg:py-0",
        )}
      >
        {title}
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-300 ease-out lg:hidden",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id={`footer-col-${id}`}
        className={cn("pb-5 lg:block lg:pb-0", open ? "block" : "hidden")}
      >
        {children}
      </div>
    </div>
  );
}

export function FooterV3({
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
  const isEstetica = siteConfig.business.type === "estetica";
  const [openColumn, setOpenColumn] = React.useState<string | null>(null);
  const toggleColumn = (id: string) =>
    setOpenColumn((current) => (current === id ? null : id));

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

  const topServices = siteConfig.services.slice(0, 5);
  const hoursRows = siteConfig.features.showBusinessHours ? buildHoursSummary() : [];

  /** Anchor semantics shared with the navbar: hash first, then landing. */
  const goToServices = () => {
    window.location.hash = "#services";
    onPageChange("landing");
  };

  const columnLinkClass =
    "inline-flex min-h-11 items-center rounded text-start text-sm text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:min-h-0 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]";

  const socialIconClass =
    "flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:border-accent/30 hover:text-accent-light hover:-translate-y-0.5 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [transition:border-color_0.25s_cubic-bezier(0.23,1,0.32,1),color_0.25s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]";

  return (
    <footer className="border-t border-border bg-muted transition-colors duration-300 dark:bg-background">

      {/* ── Book CTA strip ──────────────────────────────────────────── */}
      {siteConfig.features.showBooking && onBookClick && (
        <div className="border-b border-border bg-card px-6 py-10 transition-colors duration-300 md:py-12">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
                {isEstetica
                  ? (localeConfig.lang === "he" ? "הצעד הראשון עלינו" : localeConfig.lang === "ar" ? "الخطوة الأولى علينا" : "Your First Step Is on Us")
                  : localeConfig.footer.ctaEyebrow}
              </p>
              <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                {isEstetica
                  ? (localeConfig.lang === "he" ? "בואו להכיר אותנו פנים אל פנים" : localeConfig.lang === "ar" ? "تعالوا تعرّفوا علينا وجهاً لوجه" : "Come meet us face to face")
                  : localeConfig.footer.ctaTitle}
              </h2>
            </div>
            <button
              onClick={onBookClick}
              className="group flex shrink-0 items-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-md shadow-accent/20 hover:bg-accent-light hover:text-zinc-950 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.97] active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),color_0.3s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]"
            >
              <Calendar size={16} />
              <span>{isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookAppointment}</span>
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* ── Columns ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-y-[var(--gs-gap)] lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-16">

          {/* Brand column — always visible, never collapsed */}
          <div className="space-y-6 pb-6 lg:pb-0">
            <button
              onClick={() => onPageChange("landing")}
              className="group flex items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <BrandLogo
                variant="auto"
                heightClass={(siteConfig.brand.logo || siteConfig.brand.logoDark) ? "h-16 lg:h-20" : undefined}
              />
            </button>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {brand.tagline}
            </p>
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
          </div>

          {/* Navigation column */}
          <FooterColumn
            id="nav"
            title={localeConfig.footer.exploreTitle}
            open={openColumn === "nav"}
            onToggle={() => toggleColumn("nav")}
          >
            <ul className="space-y-1 lg:space-y-3">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <button onClick={() => onPageChange(link.page)} className={columnLinkClass}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </FooterColumn>

          {/* Services column */}
          {topServices.length > 0 && (
            <FooterColumn
              id="services"
              title={localeConfig.footer.linkServices}
              open={openColumn === "services"}
              onToggle={() => toggleColumn("services")}
            >
              <ul className="space-y-1 lg:space-y-3">
                {topServices.map((service) => (
                  <li key={service.id}>
                    <button onClick={goToServices} className={columnLinkClass}>
                      {service.name}
                    </button>
                  </li>
                ))}
              </ul>
            </FooterColumn>
          )}

          {/* Contact column */}
          <FooterColumn
            id="contact"
            title={localeConfig.footer.contactHeading}
            open={openColumn === "contact"}
            onToggle={() => toggleColumn("contact")}
          >
            <ul className="space-y-3.5 text-sm text-muted-foreground lg:space-y-4">
              <li className="flex items-start gap-2.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-accent-light" />
                {/* dir=auto: Latin addresses ("123 Precision Way") get bidi-
                    shuffled in RTL pages; auto isolates by first strong char
                    so Hebrew addresses still flow RTL. */}
                <span dir="auto" className="leading-relaxed">
                  {contact.address.street}, {contact.address.district},{" "}
                  {contact.address.cityStateZip}
                </span>
              </li>
              <li>
                <a
                  href={`tel:${contact.phone}`}
                  className="flex min-h-11 items-center gap-2.5 rounded transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:min-h-0"
                >
                  <Phone size={14} className="shrink-0 text-accent-light" />
                  <span dir="ltr">{contact.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex min-h-11 items-center gap-2.5 rounded transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:min-h-0"
                >
                  <Mail size={14} className="shrink-0 text-accent-light" />
                  <span dir="ltr" className="break-all">{contact.email}</span>
                </a>
              </li>
              {hoursRows.length > 0 && (
                <li className="flex items-start gap-2.5 pt-1">
                  <Clock size={14} className="mt-0.5 shrink-0 text-accent-light" />
                  <dl className="space-y-1">
                    {hoursRows.map((row) => (
                      <div key={row.days} className="flex flex-wrap gap-x-2 text-[13px] leading-relaxed">
                        <dt className="text-foreground/80">{row.days}</dt>
                        {/* dir=ltr: "09:00–20:00" reverses into "20:00–09:00"
                            under RTL otherwise. Closed label stays as-is. */}
                        <dd dir="ltr">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              )}
            </ul>
          </FooterColumn>

        </div>
      </div>

      {/* ── Bottom bar: copyright + legal + admin ───────────────────── */}
      {/* pb keeps the legal row clear of the floating chat / a11y buttons at scroll end */}
      <div className="border-t border-border px-6 pt-6 pb-24 transition-colors duration-300 md:pb-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <bdi>© {new Date().getFullYear()} {brand.name}.</bdi> {localeConfig.footer.rightsReserved}
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
                className="rounded text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]"
              >
                {label}
              </a>
            ))}
            {showAdminNavLink && (
              <button
                type="button"
                onClick={onAdminClick}
                className="rounded text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]"
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
