/**
 * navbar-v5.tsx — TRANSPARENT OVERLAY variant.
 *
 * Fully transparent over the hero (no background, no border) with
 * light-on-dark text (hero imagery is dark-overlaid in every niche), then
 * switches to the existing `glass-panel` utility (backdrop blur + token
 * colors) once the user scrolls past ~80% of the viewport height. Only
 * color/opacity/shadow transition (300ms ease-out) — no layout shift.
 * On non-landing pages (gallery, about, legal…) the bar is solid from the
 * start. Mobile menu behavior mirrors v1.
 *
 * Link-building logic copied from Navbar.tsx (v1 stays untouched).
 */
import React from "react";
import { Menu, X, Calendar, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BrandLogo } from "../../ui/BrandLogo";
import { cn } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import type { PublicShellPage } from "../../../types";
import { getAudienceToggleLocale, type EmploymentAudience } from "../../../lib/employment-audience";
import { landingSectionPresent } from "../../../lib/section-presence";
import { ThemeToggle } from "../../theme/ThemeToggle";
import { LanguageSwitcher } from "../../ui/LanguageSwitcher";
import { useTheme } from "../../theme/ThemeProvider";
import { resolveVariant } from "../../../lib/section-variants";
import { isLightHeroSurface } from "../../../lib/site-theme";

type NavId = keyof typeof localeConfig.nav;
type NavItem = { id: NavId; href: string; type: "anchor" | "page" };

// ─── Copied from Navbar.tsx (v1) — keep in sync manually ─────────────────────
function buildNavLinks(): NavItem[] {
  const candidates: Array<NavItem & { enabled: boolean }> = [
    { id: "services", href: "#services", type: "anchor", enabled: siteConfig.features.showServices && landingSectionPresent("services") },
    { id: "team", href: "#team", type: "anchor", enabled: (siteConfig.features.showTeam || siteConfig.features.showAbout) && landingSectionPresent("team") },
    { id: "whyUs", href: "#why-choose-us", type: "anchor", enabled: siteConfig.features.showWhyChooseUs && landingSectionPresent("whyChooseUs") },
    { id: "gallery", href: "#gallery", type: "page", enabled: siteConfig.features.showGallery },
    { id: "stories", href: "#testimonials", type: "anchor", enabled: siteConfig.features.showTestimonials && landingSectionPresent("testimonials") },
    { id: "contact", href: "#contact", type: "anchor", enabled: siteConfig.features.showInquiry || siteConfig.features.showBusinessHours || siteConfig.features.showLocation },
    { id: "about", href: "/about", type: "page", enabled: siteConfig.features.enableAboutPage === true },
    { id: "howItWorks", href: "#how-it-works", type: "anchor", enabled: siteConfig.features.showHowItWorks === true },
    { id: "jobs", href: "#job-categories", type: "anchor", enabled: siteConfig.features.showJobCategories === true },
    { id: "register", href: "#employment-form", type: "anchor", enabled: siteConfig.features.showEmploymentForm === true },
  ];
  return candidates.filter((l) => l.enabled);
}

function navLabel(id: NavId): string {
  if (
    id === "team" &&
    siteConfig.features.showAbout &&
    !siteConfig.features.showTeam &&
    !siteConfig.features.enableAboutPage
  ) {
    return localeConfig.lang === "he" ? "עליי" : localeConfig.lang === "ru" ? "Обо мне" : localeConfig.lang === "ar" ? "عنّي" : "About";
  }
  return localeConfig.nav[id];
}

export function NavbarV5({ onBookClick, onPageChange, currentPage, audienceMode, onSwitchAudience }: {
  onBookClick: () => void;
  onPageChange: (page: PublicShellPage) => void;
  currentPage: string;
  /** Employment niche only — which audience landing is currently active. */
  audienceMode?: EmploymentAudience;
  /** Employment niche only — switch to the other audience landing. */
  onSwitchAudience?: (audience: EmploymentAudience) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [pastHero, setPastHero] = React.useState(false);

  // Solid once scrolled past ~80% of the viewport height (threshold tracks
  // resizes). transform/opacity/color transitions only — no layout shift.
  React.useEffect(() => {
    let threshold = window.innerHeight * 0.8;
    const onScroll = () => setPastHero(window.scrollY > threshold);
    const onResize = () => {
      threshold = window.innerHeight * 0.8;
      onScroll();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Escape closes mobile menu (same behavior as v1)
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const niche = siteConfig.business.type;
  const isEstetica = niche === "estetica";
  // Transparent only while the dark-overlaid hero is behind the bar.
  const overlayNav = !pastHero && currentPage === "landing" && siteConfig.features.showHero;
  // White overlay text assumes a dark hero. Hero v2/v4 are light editorial
  // surfaces in light theme — use foreground colors there (see navbar-v2).
  const { theme } = useTheme();
  const heroVariant = resolveVariant(siteConfig.hero.variant);
  const overlayDark =
    overlayNav && !(isLightHeroSurface(theme) && (heroVariant === "v2" || heroVariant === "v4"));

  const navLinks = buildNavLinks();

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange("landing");
    if (currentPage === "landing") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLinkClick = (link: NavItem) => {
    if (link.id === "gallery") {
      onPageChange("gallery");
    } else if (link.id === "about") {
      onPageChange("about");
    } else {
      if (link.href.startsWith("#")) window.location.hash = link.href;
      onPageChange("landing");
    }
    setIsOpen(false);
  };

  const isLinkActive = (link: NavItem) =>
    (currentPage === "gallery" && link.id === "gallery") || (currentPage === "about" && link.id === "about");

  return (
    <nav className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out",
          overlayNav
            ? "border-b border-transparent bg-transparent"
            : "glass-panel border-x-0 border-t-0 shadow-sm",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 lg:h-20 lg:gap-4 lg:px-8">

          {/* Brand */}
          <a
            href="/"
            onClick={handleHomeClick}
            className="group flex h-full min-w-0 items-center gap-2.5 overflow-visible rounded-xl py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <BrandLogo
              variant={overlayDark ? "dark" : "auto"}
              {...(siteConfig.branding?.navbarLogoHeight
                ? { height: siteConfig.branding.navbarLogoHeight }
                : (siteConfig.brand.logo || siteConfig.brand.logoDark)
                  ? { heightClass: "h-10 lg:h-12" }
                  : { height: 36 })}
              nameClassName="truncate"
            />
          </a>

          {/* Desktop links */}
          <div className="hidden min-w-0 items-center lg:flex">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link);
              const baseClass = cn(
                "relative whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium tracking-wide transition-colors duration-200 ease-out",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isActive
                  ? "font-semibold text-accent-light underline decoration-accent-light decoration-2 underline-offset-8"
                  : overlayDark
                    ? "text-white/85 hover:bg-white/10 hover:text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
              );
              return link.type === "anchor" && currentPage === "landing" ? (
                <a key={link.id} href={link.href} className={baseClass}>
                  {navLabel(link.id)}
                </a>
              ) : (
                <button key={link.id} onClick={() => handleLinkClick(link)} className={baseClass}>
                  {navLabel(link.id)}
                </button>
              );
            })}
          </div>

          {/* Desktop utilities + CTA */}
          <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
            {audienceMode && onSwitchAudience && (
              <AudienceToggle mode={audienceMode} onSwitch={onSwitchAudience} overlayNav={overlayDark} variant="desktop" />
            )}
            <ThemeToggle />
            <LanguageSwitcher variant={overlayDark ? "light" : "dark"} align="end" />
            {siteConfig.features.showBooking && (
              <button
                onClick={onBookClick}
                className={cn(
                  "group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.97]",
                  overlayDark
                    ? "border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                    : "bg-primary text-primary-foreground shadow-md shadow-accent/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30 active:translate-y-0",
                )}
              >
                <Calendar size={15} className="transition-transform duration-200 group-hover:rotate-12" />
                {isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookNow}
              </button>
            )}
          </div>

          {/* Mobile toggle cluster */}
          <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
            <ThemeToggle />
            <LanguageSwitcher variant={overlayDark ? "light" : "dark"} align="end" />
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={localeConfig.a11y.toggleMenu}
              aria-expanded={isOpen}
              aria-controls="mobile-menu-v5"
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-200",
                overlayDark
                  ? "border-white/20 text-white hover:bg-white/10"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.22, ease: [0.22, 0.68, 0.35, 1] }}
                  >
                    <X size={17} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 90, opacity: 0, scale: 0.8 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.22, ease: [0.22, 0.68, 0.35, 1] }}
                  >
                    <Menu size={17} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu (same behavior as v1; token colors in both bar states) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu-v5"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.22, 0.68, 0.35, 1] } }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            className="mx-3 mt-2 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl lg:hidden dark:shadow-black/30"
          >
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => {
                const isActive = isLinkActive(link);
                const itemClass = cn(
                  "flex w-full items-center rounded-xl px-4 py-3 text-base font-medium transition-colors duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                  isActive ? "bg-accent/10 font-semibold text-accent-light" : "text-foreground hover:bg-muted hover:text-accent-light",
                );
                return link.type === "anchor" && currentPage === "landing" ? (
                  <a key={link.id} href={link.href} onClick={() => setIsOpen(false)} className={itemClass}>
                    {navLabel(link.id)}
                  </a>
                ) : (
                  <button key={link.id} onClick={() => handleLinkClick(link)} className={itemClass}>
                    {navLabel(link.id)}
                  </button>
                );
              })}

              {audienceMode && onSwitchAudience && (
                <>
                  <div className="my-1.5 h-px bg-border" />
                  <AudienceToggle
                    mode={audienceMode}
                    onSwitch={(a) => { onSwitchAudience(a); setIsOpen(false); }}
                    overlayNav={false}
                    variant="mobile"
                  />
                </>
              )}

              {siteConfig.features.showBooking && (
                <>
                  <div className="my-1.5 h-px bg-border" />
                  <button
                    onClick={() => { onBookClick(); setIsOpen(false); }}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-md shadow-accent/20 transition-transform duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
                  >
                    <Calendar size={18} />
                    {isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookAppointment}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ─── Audience toggle (copied from Navbar.tsx v1) ─────────────────────────────
function AudienceToggle({ mode, onSwitch, overlayNav, variant }: {
  mode: EmploymentAudience;
  onSwitch: (next: EmploymentAudience) => void;
  overlayNav: boolean;
  variant: "desktop" | "mobile";
}) {
  const t = getAudienceToggleLocale();
  const next: EmploymentAudience = mode === "worker" ? "business" : "worker";
  const label = next === "worker" ? t.switchToWorker : t.switchToBusiness;

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={() => onSwitch(next)}
        aria-label={t.ariaLabel}
        className="flex w-full min-h-[44px] items-center justify-between rounded-xl border border-[#22D3EE]/35 bg-[rgba(8,145,178,0.10)] px-4 py-3 text-start font-sans text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-[rgba(8,145,178,0.16)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
      >
        <span>{label}</span>
        <ArrowLeftRight size={15} className="text-[#0891B2]" strokeWidth={2.2} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSwitch(next)}
      aria-label={t.ariaLabel}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold tracking-wide transition-colors duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50",
        overlayNav
          ? "border-white/25 bg-white/[0.06] text-white/85 hover:border-[#22D3EE]/55 hover:bg-[rgba(8,145,178,0.18)] hover:text-white"
          : "border-[#22D3EE]/35 bg-[rgba(8,145,178,0.08)] text-foreground hover:border-[#0891B2]/65 hover:bg-[rgba(8,145,178,0.14)]",
      )}
    >
      <ArrowLeftRight size={13} strokeWidth={2.2} aria-hidden />
      <span>{label}</span>
    </button>
  );
}
