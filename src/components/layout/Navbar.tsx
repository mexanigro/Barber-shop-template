import React from "react";
import { Menu, X, Calendar, ArrowLeftRight } from "lucide-react";
import { BrandLogo } from "../ui/BrandLogo";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import type { PublicShellPage } from "../../types";
import type { EmploymentAudience } from "../../lib/employment-audience";
import { ThemeToggle } from "../theme/ThemeToggle";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";

export function Navbar({ onBookClick, onPageChange, currentPage, audienceMode, onSwitchAudience }: {
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

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Escape closes mobile menu
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
  const isCafeteria = niche === "cafeteria";
  const isRemodelaciones = niche === "remodelaciones";
  const isTattoo = niche === "tattoo";
  const isEmployment = niche === "employment";
  const overlayNav = !scrolled && currentPage === "landing" && siteConfig.features.showHero;

  type NavId = keyof typeof localeConfig.nav;

  const navLinks = (
    [
      {
        id: "services" as const,
        href: "#services",
        type: "anchor" as const,
        enabled: siteConfig.features.showServices,
      },
      {
        id: "team" as const,
        href: "#team",
        type: "anchor" as const,
        enabled: siteConfig.features.showTeam || siteConfig.features.showAbout,
      },
      {
        id: "whyUs" as const,
        href: "#why-choose-us",
        type: "anchor" as const,
        enabled: siteConfig.features.showWhyChooseUs,
      },
      {
        id: "gallery" as const,
        href: "#gallery",
        type: "page" as const,
        enabled: siteConfig.features.showGallery,
      },
      {
        id: "stories" as const,
        href: "#testimonials",
        type: "anchor" as const,
        enabled: siteConfig.features.showTestimonials,
      },
      {
        id: "contact" as const,
        href: "#contact",
        type: "anchor" as const,
        enabled: siteConfig.features.showInquiry || siteConfig.features.showBusinessHours || siteConfig.features.showLocation,
      },
      {
        id: "about" as const,
        href: "/about",
        type: "page" as const,
        enabled: siteConfig.features.enableAboutPage === true,
      },
      {
        id: "howItWorks" as const,
        href: "#how-it-works",
        type: "anchor" as const,
        enabled: siteConfig.features.showHowItWorks === true,
      },
      {
        id: "jobs" as const,
        href: "#job-categories",
        type: "anchor" as const,
        enabled: siteConfig.features.showJobCategories === true,
      },
      {
        id: "register" as const,
        href: "#employment-form",
        type: "anchor" as const,
        enabled: siteConfig.features.showEmploymentForm === true,
      },
    ] as const
  ).filter((link) => link.enabled);

  const navLabel = (id: NavId) => {
    // Solo mode: rename "Team" anchor to a personal label — but only when
    // there is no separate About page, otherwise the labels would collide.
    if (
      id === "team" &&
      siteConfig.features.showAbout &&
      !siteConfig.features.showTeam &&
      !siteConfig.features.enableAboutPage
    ) {
      return localeConfig.lang === "he" ? "עליי" : localeConfig.lang === "ru" ? "Обо мне" : localeConfig.lang === "ar" ? "عنّي" : "About";
    }
    return localeConfig.nav[id];
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange("landing");
    if (currentPage === "landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLinkClick = (link: (typeof navLinks)[number]) => {
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

  return (
    <nav className={cn("fixed left-0 top-0 z-50 w-full px-3 md:px-4", isRemodelaciones ? "pt-1.5" : "pt-3")}>
      {/* Floating container */}
      <div
        style={{
          transition: "max-width 0.5s cubic-bezier(0.23,1,0.32,1), padding 0.5s cubic-bezier(0.23,1,0.32,1), background-color 0.5s cubic-bezier(0.23,1,0.32,1), border-color 0.5s cubic-bezier(0.23,1,0.32,1), box-shadow 0.5s cubic-bezier(0.23,1,0.32,1), backdrop-filter 0.5s cubic-bezier(0.23,1,0.32,1), border-radius 0.5s cubic-bezier(0.23,1,0.32,1)",
        }}
        className={cn(
          "mx-auto",
          scrolled
            ? cn(
                "max-w-6xl rounded-2xl border border-black/[0.08] bg-background/80 px-4 py-2.5 shadow-lg shadow-black/[0.06] backdrop-blur-xl dark:border-white/[0.08] dark:bg-background/75 dark:shadow-black/25",
                isEstetica && "border-border/50 bg-background/95 shadow-sm backdrop-blur-sm dark:border-border/30 dark:bg-background/90",
                isCafeteria && "border-border/40 bg-background/92 shadow-sm backdrop-blur-sm dark:border-border/25 dark:bg-background/88",
                isEmployment && "border-[#E8820C]/12 bg-background/65 dark:border-[#F5A623]/10 dark:bg-background/55",
              )
            : cn(
                "max-w-7xl px-2 py-2",
                /* Mobile: show a subtle container so the navbar frames properly on all niches.
                   Over hero (overlayNav): dark glass. Over content pages: light glass.
                   Remodelaciones opts out of the dark-glass pill at rest: the
                   before/after hero on this niche reads cleanly when nothing
                   floats above it. The pill (and its backdrop blur) re-appears
                   the moment the user scrolls — the scrolled branch handles it. */
                overlayNav && !isRemodelaciones && "max-lg:rounded-2xl max-lg:border max-lg:border-white/15 max-lg:bg-black/20 max-lg:px-3 max-lg:py-2 max-lg:backdrop-blur-md",
                !overlayNav && "max-lg:rounded-2xl max-lg:border max-lg:border-border/50 max-lg:bg-background/90 max-lg:px-3 max-lg:py-2 max-lg:backdrop-blur-sm max-lg:shadow-sm",
              ),
        )}
      >
        <div className="flex h-16 lg:h-20 items-center justify-between gap-2 lg:gap-4">

          {/* Brand */}
          {/* shrink-0 prevents the brand link from collapsing in the outer flex
              row when the inner content is an <img> with `width: auto`; the
              browser resolves intrinsic width lazily and the row would otherwise
              squeeze the brand to 0 before the image decode finishes. */}
          <a
            href="/"
            onClick={handleHomeClick}
            className={cn(
              "group flex h-full shrink-0 items-center gap-2.5 py-0.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              (isTattoo || isEstetica || isRemodelaciones) ? "overflow-visible" : "overflow-hidden",
            )}
          >
            <BrandLogo
              variant={overlayNav ? "dark" : "auto"}
              {...(siteConfig.branding?.navbarLogoHeight
                ? { height: siteConfig.branding.navbarLogoHeight }
                : (siteConfig.brand.logo || siteConfig.brand.logoDark)
                  ? { heightClass: isTattoo ? "h-30" : isRemodelaciones ? "h-[96px] lg:h-[128px]" : isEstetica ? "h-[90px] lg:h-[114px]" : "h-full" }
                  : { height: 36 })}
              iconWrapperClassName={cn(
                "group-hover:rotate-0",
                !scrolled && "rotate-3",
              )}
              nameClassName={cn(
                "truncate",
                isEstetica && "text-lg font-normal tracking-wider md:text-2xl md:tracking-widest",
                isCafeteria && "font-serif text-lg font-normal tracking-wide md:text-xl",
                isRemodelaciones && "text-lg font-bold tracking-tight md:text-xl",
              )}
            />
          </a>

          {/* Desktop links */}
          <div className="hidden min-w-0 lg:flex items-center">
            {navLinks.map((link) => {
              const isActive = (currentPage === "gallery" && link.id === "gallery") || (currentPage === "about" && link.id === "about");
              const baseClass = cn(
                "relative whitespace-nowrap px-2.5 py-2 text-sm font-medium tracking-wide rounded-xl [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),background-color_0.2s_cubic-bezier(0.23,1,0.32,1)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isActive
                  ? "text-accent-light"
                  : overlayNav
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              );

              return link.type === "anchor" && currentPage === "landing" ? (
                <a key={link.id} href={link.href} className={baseClass}>
                  {navLabel(link.id)}
                </a>
              ) : (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link)}
                  className={baseClass}
                >
                  {navLabel(link.id)}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-dot"
                      className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-light"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="hidden shrink-0 lg:flex items-center gap-2.5">
            {audienceMode && onSwitchAudience && (
              <AudienceToggle
                mode={audienceMode}
                onSwitch={onSwitchAudience}
                overlayNav={overlayNav}
                variant="desktop"
              />
            )}
            <ThemeToggle />
            <LanguageSwitcher variant={overlayNav ? "light" : "dark"} align="end" />
            {siteConfig.features.showBooking && (
              <button
                onClick={onBookClick}
                className={cn(
                  "group flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),color_0.3s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]",
                  isEstetica
                    ? "font-medium hover:bg-accent-light hover:text-zinc-950 active:scale-[0.97]"
                    : isCafeteria
                      ? "font-serif font-medium tracking-wide hover:bg-accent-light hover:text-zinc-950 active:scale-[0.97]"
                      : "font-semibold shadow-md shadow-accent/20 hover:-translate-y-0.5 hover:bg-accent-light hover:text-zinc-950 hover:shadow-lg hover:shadow-accent/30 active:scale-[0.97] active:translate-y-0",
                )}
              >
                <Calendar size={15} className="transition-transform duration-300 group-hover:rotate-12" />
                {isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookNow}
              </button>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
            <LanguageSwitcher variant={overlayNav ? "light" : "dark"} align="end" />
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={localeConfig.a11y.toggleMenu}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200",
                overlayNav
                  ? "border-white/20 text-white hover:bg-white/10"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <X size={17} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 90, opacity: 0, scale: 0.8 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <Menu size={17} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{
              opacity: 1, y: 0, scale: 1,
              transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] },
            }}
            exit={{
              opacity: 0, y: -6, scale: 0.97,
              transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
            }}
            className={cn(
              "mx-auto mt-2 max-w-[calc(100vw-1.5rem)] rounded-2xl border p-3 shadow-2xl backdrop-blur-xl lg:hidden",
              isEstetica
                ? "border-border/60 bg-background/98 shadow-black/5"
                : "border-black/[0.06] bg-background/95 shadow-black/10 dark:border-white/[0.08] dark:shadow-black/30",
            )}
          >
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => {
                const isActive = (currentPage === "gallery" && link.id === "gallery") || (currentPage === "about" && link.id === "about");
                const itemClass = cn(
                  "flex w-full items-center rounded-xl px-4 py-3 text-base font-medium transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                  isActive
                    ? "bg-accent/10 text-accent-light"
                    : "text-foreground hover:bg-muted hover:text-accent-light"
                );

                return link.type === "anchor" && currentPage === "landing" ? (
                  <a
                    key={link.id}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={itemClass}
                  >
                    {navLabel(link.id)}
                  </a>
                ) : (
                  <button
                    key={link.id}
                    onClick={() => handleLinkClick(link)}
                    className={itemClass}
                  >
                    {navLabel(link.id)}
                  </button>
                );
              })}

              {/* Audience toggle (employment niche only, mobile) */}
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

              {/* Theme toggle — inside mobile menu */}
              <div className="my-1.5 flex items-center gap-3 rounded-xl px-4 py-2">
                <ThemeToggle />
                <span className="text-sm text-muted-foreground">{localeConfig.lang === "he" ? "מצב תצוגה" : localeConfig.lang === "ru" ? "Тема" : localeConfig.lang === "ar" ? "المظهر" : "Appearance"}</span>
              </div>

              {siteConfig.features.showBooking && (
                <>
                  <div className="my-1.5 h-px bg-border" />
                  <button
                    onClick={() => { onBookClick(); setIsOpen(false); }}
                    className={cn(
                      "flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-primary-foreground transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      isEstetica
                        ? "text-sm font-medium"
                        : isCafeteria
                          ? "font-serif text-sm font-medium tracking-wide"
                          : "text-base font-semibold shadow-md shadow-accent/20 active:scale-95",
                    )}
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

// ─── Audience toggle (employment niche dual-audience) ────────────────────────
// Lives at the bottom of this file because it's only consumed from the Navbar
// and is too small to deserve its own module. Both desktop and mobile renders
// route through the same component so the audience labels stay in sync.

function getAudienceToggleLocale() {
  return (localeConfig as unknown as {
    employment?: {
      audienceToggle?: {
        switchToWorker: string;
        switchToBusiness: string;
        ariaLabel: string;
      };
    };
  }).employment?.audienceToggle ?? {
    switchToWorker: "Find work",
    switchToBusiness: "Hire workers",
    ariaLabel: "Switch audience",
  };
}

function AudienceToggle({
  mode,
  onSwitch,
  overlayNav,
  variant,
}: {
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
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold tracking-wide [transition:background-color_0.2s_cubic-bezier(0.23,1,0.32,1),border-color_0.2s_cubic-bezier(0.23,1,0.32,1),color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.15s_cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50",
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
