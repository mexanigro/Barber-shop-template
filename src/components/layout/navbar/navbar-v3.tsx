/**
 * navbar-v3.tsx — HAMBURGER ALWAYS variant ("editorial menu").
 *
 * Minimal bar (logo + book CTA + hamburger) at every breakpoint. The menu
 * opens as a full-screen overlay with oversized staggered links; language +
 * theme + socials live in the overlay footer. Body scroll is locked while the
 * overlay is open; Escape closes it; focus moves to the first link on open
 * and returns to the hamburger on close (useModalA11y handles trap + restore).
 *
 * Link-building logic copied from Navbar.tsx (v1 stays untouched).
 */
import React from "react";
import { Menu, X, Calendar, ArrowLeftRight, Instagram, Facebook, Twitter, MessageCircle } from "lucide-react";
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
import { useModalA11y } from "../../../hooks/useModalA11y";
import { NICHE_EASING, getNicheFlavor } from "../../../lib/motion";
import { useTheme } from "../../theme/ThemeProvider";
import { resolveVariant } from "../../../lib/section-variants";

type NavId = keyof typeof localeConfig.nav;
type NavItem = { id: NavId; href: string; type: "anchor" | "page" };

// New microcopy only — everything else comes from localeConfig/siteConfig.
const STRINGS: Record<"en" | "he" | "ru" | "ar", { menuLabel: string; followUs: string }> = {
  en: { menuLabel: "Menu", followUs: "Follow us" },
  he: { menuLabel: "תפריט", followUs: "עקבו אחרינו" },
  ru: { menuLabel: "Меню", followUs: "Мы в соцсетях" },
  ar: { menuLabel: "القائمة", followUs: "تابعونا" },
};

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

export function NavbarV3({ onBookClick, onPageChange, currentPage, audienceMode, onSwitchAudience }: {
  onBookClick: () => void;
  onPageChange: (page: PublicShellPage) => void;
  currentPage: string;
  /** Employment niche only — which audience landing is currently active. */
  audienceMode?: EmploymentAudience;
  /** Employment niche only — switch to the other audience landing. */
  onSwitchAudience?: (audience: EmploymentAudience) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const close = React.useCallback(() => setIsOpen(false), []);

  // Focus trap + Escape + focus restore to the hamburger trigger.
  const overlayRef = useModalA11y(isOpen, close);
  const firstLinkRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll while the overlay is open.
  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Focus the first link once the overlay has mounted (after entrance starts).
  React.useEffect(() => {
    if (!isOpen) return;
    const tid = window.setTimeout(() => firstLinkRef.current?.focus({ preventScroll: true }), 90);
    return () => window.clearTimeout(tid);
  }, [isOpen]);

  const niche = siteConfig.business.type;
  const isEstetica = niche === "estetica";
  const ease = NICHE_EASING[getNicheFlavor(niche)];
  const t = STRINGS[localeConfig.lang as keyof typeof STRINGS] ?? STRINGS.en;
  const overlayNav = !scrolled && currentPage === "landing" && siteConfig.features.showHero && !isOpen;
  // White overlay chrome assumes a dark hero. Hero v2/v4 are light editorial
  // surfaces in light theme — use foreground colors there (see navbar-v2).
  const { theme } = useTheme();
  const heroVariant = resolveVariant(siteConfig.hero.variant);
  const overlayDark =
    overlayNav && !(theme === "light" && (heroVariant === "v2" || heroVariant === "v4"));

  const navLinks = buildNavLinks();
  const social = siteConfig.contact.social;
  const socialEntries = [
    { key: "instagram", href: social?.instagram, Icon: Instagram },
    { key: "facebook", href: social?.facebook, Icon: Facebook },
    { key: "twitter", href: social?.twitter, Icon: Twitter },
    { key: "whatsapp", href: social?.whatsapp, Icon: MessageCircle },
  ].filter((s) => !!s.href);

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange("landing");
    if (currentPage === "landing") window.scrollTo({ top: 0, behavior: "smooth" });
    setIsOpen(false);
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

  // Editorial overlay link motion: enter 0.35s with 45 ms stagger, exit faster.
  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
    exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
    exit: { opacity: 0, y: 12, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
  };

  return (
    <>
      {/* ── Minimal bar (all breakpoints) ─────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50">
        <div
          className={cn(
            "border-b transition-[background-color,border-color,box-shadow] duration-300 ease-out",
            overlayNav
              ? "border-transparent bg-transparent"
              : "border-border/60 bg-background/85 shadow-sm backdrop-blur-xl",
          )}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 lg:h-20 lg:px-8">
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

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Theme + language live in the bar (not only in the overlay
                  footer) so both controls stay one tap away at every
                  breakpoint — parity with v1/v2. */}
              <ThemeToggle />
              <LanguageSwitcher variant={overlayDark ? "light" : "dark"} align="end" />
              {/* Book CTA stays in the bar from `sm` up. Below `sm` the bar
                  can't fit logo + theme + language + CTA + hamburger without
                  overlapping the logo (BrandLogo reserves 12rem for the
                  control cluster), so the CTA moves into the overlay menu —
                  same placement v1 uses for its mobile menu. */}
              {siteConfig.features.showBooking && (
                <button
                  onClick={onBookClick}
                  className="group hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-accent/20 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:translate-y-0 active:scale-[0.97] sm:flex lg:px-5"
                >
                  <Calendar size={15} className="transition-transform duration-200 group-hover:rotate-12" />
                  {isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookNow}
                </button>
              )}
              <button
                onClick={() => setIsOpen(true)}
                aria-label={localeConfig.a11y.toggleMenu}
                aria-expanded={isOpen}
                aria-controls="fullscreen-menu-v3"
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-200 sm:h-12 sm:w-12",
                  overlayDark
                    ? "border-white/20 text-white hover:bg-white/10"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Full-screen editorial overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="menu-overlay"
            id="fullscreen-menu-v3"
            role="dialog"
            aria-modal="true"
            aria-label={t.menuLabel}
            ref={overlayRef}
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
            // z above the a11y FAB (z-[99990]) — the menu is aria-modal, so
            // nothing should float over it; the FAB was covering the footer
            // ThemeToggle on mobile (RTL start-3 lands exactly on it).
            className="fixed inset-0 z-[99992] flex flex-col bg-background outline-none"
          >
            {/* Overlay header: brand + close */}
            <div className="mx-auto flex h-16 w-full max-w-7xl shrink-0 items-center justify-between px-4 lg:h-20 lg:px-8">
              <a
                href="/"
                onClick={handleHomeClick}
                className="group flex h-full items-center gap-2.5 overflow-visible rounded-xl py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <BrandLogo
                  variant="auto"
                  {...(siteConfig.branding?.navbarLogoHeight
                    ? { height: siteConfig.branding.navbarLogoHeight }
                    : (siteConfig.brand.logo || siteConfig.brand.logoDark)
                      ? { heightClass: "h-10 lg:h-12" }
                      : { height: 36 })}
                  nameClassName="truncate"
                />
              </a>
              <button
                onClick={close}
                aria-label={localeConfig.a11y.close}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors duration-200 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-12 sm:w-12"
              >
                <X size={18} />
              </button>
            </div>

            {/* Oversized staggered links */}
            <motion.nav
              variants={listVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-label={t.menuLabel}
              className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-1 overflow-y-auto px-6 py-6 lg:px-12"
            >
              {navLinks.map((link, i) => {
                const isActive = isLinkActive(link);
                const itemClass = cn(
                  "group flex w-fit items-baseline gap-4 rounded-lg py-2 text-start font-serif text-4xl font-semibold leading-tight tracking-tight transition-colors duration-200 ease-out sm:text-5xl lg:text-6xl",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isActive
                    ? "text-accent-light underline decoration-accent-light decoration-4 underline-offset-8"
                    : "text-foreground hover:text-accent-light",
                );
                const index = (
                  <span className="text-xs font-sans font-medium tracking-[0.2em] text-muted-foreground" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                );
                const setFirstRef = (el: HTMLElement | null) => { if (i === 0) firstLinkRef.current = el; };

                return (
                  <motion.div key={link.id} variants={itemVariants}>
                    {link.type === "anchor" && currentPage === "landing" ? (
                      <a ref={setFirstRef} href={link.href} onClick={() => setIsOpen(false)} className={itemClass}>
                        {index}
                        <span>{navLabel(link.id)}</span>
                      </a>
                    ) : (
                      <button ref={setFirstRef} onClick={() => handleLinkClick(link)} className={itemClass}>
                        {index}
                        <span>{navLabel(link.id)}</span>
                      </button>
                    )}
                  </motion.div>
                );
              })}

              {/* Mobile Book CTA — the bar hides its CTA below `sm`, so the
                  overlay carries it instead (v1 mobile-menu parity). */}
              {siteConfig.features.showBooking && (
                <motion.div variants={itemVariants} className="mt-8 sm:hidden">
                  <button
                    onClick={() => { onBookClick(); setIsOpen(false); }}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-md shadow-accent/20 transition-[transform,box-shadow] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.97]"
                  >
                    <Calendar size={16} />
                    {isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookNow}
                  </button>
                </motion.div>
              )}

              {/* Audience toggle (employment niche) */}
              {audienceMode && onSwitchAudience && (
                <motion.div variants={itemVariants} className="mt-6 max-w-sm">
                  <AudienceToggle
                    mode={audienceMode}
                    onSwitch={(a) => { onSwitchAudience(a); setIsOpen(false); }}
                  />
                </motion.div>
              )}
            </motion.nav>

            {/* Overlay footer: theme + language + socials */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: 0.2, ease } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="mx-auto flex w-full max-w-7xl shrink-0 flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-12"
            >
              <div className="flex items-center gap-2.5">
                <ThemeToggle />
                <LanguageSwitcher variant="dark" dropUp />
              </div>
              {socialEntries.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="me-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t.followUs}
                  </span>
                  {socialEntries.map(({ key, href, Icon }) => (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={key}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <Icon size={17} />
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Audience toggle (adapted from Navbar.tsx v1, full-width overlay style) ──
function AudienceToggle({ mode, onSwitch }: {
  mode: EmploymentAudience;
  onSwitch: (next: EmploymentAudience) => void;
}) {
  const t = getAudienceToggleLocale();
  const next: EmploymentAudience = mode === "worker" ? "business" : "worker";
  const label = next === "worker" ? t.switchToWorker : t.switchToBusiness;

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
