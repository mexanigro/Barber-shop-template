/**
 * navbar-v4.tsx — BOTTOM BAR MOBILE variant ("app-like").
 *
 * lg+: slim clean top bar (logo / links / utilities + CTA).
 * Below lg: a minimal top logo strip + a fixed bottom navigation bar with at
 * most 5 items — Home, Services, Gallery (or Team), Book (primary, elevated
 * center) and Contact — lucide icons + tiny labels, safe-area padding and
 * 48px+ touch targets. Active state derives from currentPage + scroll
 * position on the landing.
 *
 * KNOWN TRADEOFFS (documented by design):
 * - Secondary links (Why Us, Stories, About…) are not reachable from the
 *   bottom bar on mobile; the niche presets keep their primary sections in
 *   the 5 slots. Desktop shows the full link set.
 * - The chatbot launcher sits at bottom-20 (80px) on mobile; the bar is 64px
 *   + safe-area inset. On devices with a large home-indicator inset the
 *   launcher can sit close above the bar but never under it on inset-free
 *   devices; accepted overlap risk documented here rather than patching
 *   Chatbot.tsx from a navbar variant.
 *
 * Link-building logic copied from Navbar.tsx (v1 stays untouched).
 */
import React from "react";
import { Calendar, Home, LayoutGrid, Images, Users, Phone, ArrowLeftRight } from "lucide-react";
import { motion } from "motion/react";
import { BrandLogo } from "../../ui/BrandLogo";
import { cn } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import type { PublicShellPage } from "../../../types";
import type { EmploymentAudience } from "../../../lib/employment-audience";
import { ThemeToggle } from "../../theme/ThemeToggle";
import { LanguageSwitcher } from "../../ui/LanguageSwitcher";
import { useTheme } from "../../theme/ThemeProvider";
import { resolveVariant } from "../../../lib/section-variants";

type NavId = keyof typeof localeConfig.nav;
type NavItem = { id: NavId; href: string; type: "anchor" | "page" };

// New microcopy only — nav has no "home" key and the tiny bottom-bar label
// needs a shorter book word than buttons.bookNow in some languages.
const STRINGS: Record<"en" | "he" | "ru" | "ar", { home: string; book: string }> = {
  en: { home: "Home", book: "Book" },
  he: { home: "בית", book: "הזמנה" },
  ru: { home: "Главная", book: "Запись" },
  ar: { home: "الرئيسية", book: "احجز" },
};

// ─── Copied from Navbar.tsx (v1) — keep in sync manually ─────────────────────
function buildNavLinks(): NavItem[] {
  const candidates: Array<NavItem & { enabled: boolean }> = [
    { id: "services", href: "#services", type: "anchor", enabled: siteConfig.features.showServices },
    { id: "team", href: "#team", type: "anchor", enabled: siteConfig.features.showTeam || siteConfig.features.showAbout },
    { id: "whyUs", href: "#why-choose-us", type: "anchor", enabled: siteConfig.features.showWhyChooseUs },
    { id: "gallery", href: "#gallery", type: "page", enabled: siteConfig.features.showGallery },
    { id: "stories", href: "#testimonials", type: "anchor", enabled: siteConfig.features.showTestimonials },
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

type BottomItem =
  | { kind: "home"; label: string }
  | { kind: "book"; label: string }
  | { kind: "link"; label: string; link: NavItem; Icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }> };

export function NavbarV4({ onBookClick, onPageChange, currentPage, audienceMode, onSwitchAudience }: {
  onBookClick: () => void;
  onPageChange: (page: PublicShellPage) => void;
  currentPage: string;
  /** Employment niche only — which audience landing is currently active. */
  audienceMode?: EmploymentAudience;
  /** Employment niche only — switch to the other audience landing. */
  onSwitchAudience?: (audience: EmploymentAudience) => void;
}) {
  const [scrolled, setScrolled] = React.useState(false);
  const [activeAnchor, setActiveAnchor] = React.useState<string>("home");

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track which landing section is in view for the bottom-bar active state.
  React.useEffect(() => {
    if (currentPage !== "landing") return;
    const ids = ["services", "team", "contact"];
    const onScroll = () => {
      const probe = window.scrollY + window.innerHeight * 0.4;
      let current = "home";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= probe) current = id;
      }
      setActiveAnchor(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [currentPage]);

  const niche = siteConfig.business.type;
  const isEstetica = niche === "estetica";
  const overlayNav = !scrolled && currentPage === "landing" && siteConfig.features.showHero;
  // White overlay text assumes a dark hero. Hero v2/v4 are light editorial
  // surfaces in light theme — use foreground colors there (see navbar-v2).
  const { theme } = useTheme();
  const heroVariant = resolveVariant(siteConfig.hero.variant);
  const overlayDark =
    overlayNav && !(theme === "light" && (heroVariant === "v2" || heroVariant === "v4"));

  const navLinks = buildNavLinks();
  const t = STRINGS[localeConfig.lang as keyof typeof STRINGS] ?? STRINGS.en;

  const handleHomeClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
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
  };

  const isLinkActive = (link: NavItem) =>
    (currentPage === "gallery" && link.id === "gallery") || (currentPage === "about" && link.id === "about");

  // ── Bottom-bar item set (max 5, Book elevated in the center) ──────────────
  const findLink = (id: NavId) => navLinks.find((l) => l.id === id);
  const servicesLink = findLink("services");
  const galleryLink = findLink("gallery");
  const teamLink = findLink("team");
  const contactLink = findLink("contact");
  const mediaLink = galleryLink ?? teamLink;

  const bottomItems: BottomItem[] = [{ kind: "home", label: t.home }];
  if (servicesLink) bottomItems.push({ kind: "link", label: navLabel("services"), link: servicesLink, Icon: LayoutGrid });
  if (mediaLink) bottomItems.push({ kind: "link", label: navLabel(mediaLink.id), link: mediaLink, Icon: galleryLink ? Images : Users });
  if (siteConfig.features.showBooking) bottomItems.push({ kind: "book", label: t.book });
  if (contactLink) bottomItems.push({ kind: "link", label: navLabel("contact"), link: contactLink, Icon: Phone });

  const isBottomItemActive = (item: BottomItem): boolean => {
    if (item.kind === "home") return currentPage === "landing" && activeAnchor === "home";
    if (item.kind === "book") return false;
    if (item.link.id === "gallery" || item.link.id === "about") return isLinkActive(item.link);
    return currentPage === "landing" && item.link.href === `#${activeAnchor}`;
  };

  return (
    <>
      {/* ══ lg+: slim top bar ════════════════════════════════════════════════ */}
      <nav className="fixed inset-x-0 top-0 z-50 hidden lg:block">
        <div
          className={cn(
            "border-b transition-[background-color,border-color,box-shadow] duration-300 ease-out",
            overlayNav
              ? "border-transparent bg-transparent"
              : "border-border/60 bg-background/85 shadow-sm backdrop-blur-xl",
          )}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
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
                    ? { heightClass: "h-10" }
                    : { height: 32 })}
                nameClassName="truncate"
              />
            </a>

            <div className="flex min-w-0 items-center">
              {navLinks.map((link) => {
                const isActive = isLinkActive(link);
                const baseClass = cn(
                  "relative whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium tracking-wide transition-colors duration-200 ease-out",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isActive
                    ? "font-semibold text-accent-light underline decoration-accent-light decoration-2 underline-offset-8"
                    : overlayDark
                      ? "text-white/80 hover:text-white hover:bg-white/10"
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

            <div className="flex shrink-0 items-center gap-2.5">
              {audienceMode && onSwitchAudience && (
                <AudienceToggle mode={audienceMode} onSwitch={onSwitchAudience} overlayNav={overlayDark} />
              )}
              <ThemeToggle />
              <LanguageSwitcher variant={overlayDark ? "light" : "dark"} align="end" />
              {siteConfig.features.showBooking && (
                <button
                  onClick={onBookClick}
                  className="group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-accent/20 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:translate-y-0 active:scale-[0.97]"
                >
                  <Calendar size={15} className="transition-transform duration-200 group-hover:rotate-12" />
                  {isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookNow}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ══ below lg: minimal top logo strip ═════════════════════════════════ */}
      <header className="fixed inset-x-0 top-0 z-50 lg:hidden">
        <div className="flex h-14 items-center justify-between border-b border-border/50 bg-background/90 px-4 backdrop-blur-md">
          <a
            href="/"
            onClick={handleHomeClick}
            className="group flex h-full min-w-0 items-center gap-2 overflow-visible rounded-xl py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <BrandLogo
              variant="auto"
              {...(siteConfig.branding?.navbarLogoHeight
                ? { height: Math.min(siteConfig.branding.navbarLogoHeight, 40) }
                : (siteConfig.brand.logo || siteConfig.brand.logoDark)
                  ? { heightClass: "h-9" }
                  : { height: 30 })}
              nameClassName="truncate text-lg"
            />
          </a>
          <div className="flex shrink-0 items-center gap-1.5">
            {audienceMode && onSwitchAudience && (
              <AudienceToggle mode={audienceMode} onSwitch={onSwitchAudience} overlayNav={false} />
            )}
            <ThemeToggle />
            <LanguageSwitcher variant="dark" align="end" />
          </div>
        </div>
      </header>

      {/* ══ below lg: fixed bottom navigation bar ════════════════════════════ */}
      <nav
        aria-label={localeConfig.a11y.toggleMenu}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-8px_rgb(0_0_0/0.12)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-1">
          {bottomItems.map((item) => {
            const active = isBottomItemActive(item);

            if (item.kind === "book") {
              return (
                <button
                  key="book"
                  onClick={onBookClick}
                  aria-label={isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookNow}
                  className="relative -mt-5 flex min-h-12 min-w-[64px] flex-col items-center justify-start gap-1 px-1 focus:outline-none"
                >
                  <motion.span
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-accent/30 ring-4 ring-background transition-shadow duration-200 ease-out"
                  >
                    <Calendar size={22} strokeWidth={2.2} />
                  </motion.span>
                  <span className="text-[10px] font-semibold leading-none text-foreground">{item.label}</span>
                </button>
              );
            }

            const Icon = item.kind === "home" ? Home : item.Icon;
            const onClick = item.kind === "home" ? () => handleHomeClick() : () => handleLinkClick(item.link);

            return (
              <button
                key={item.kind === "home" ? "home" : item.link.id}
                onClick={onClick}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 min-w-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors duration-200 ease-out",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                  active ? "text-accent-light" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* Active marker: shape, not color-only */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0.5 h-1 w-6 rounded-full bg-accent-light transition-opacity duration-200",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                <span className={cn("max-w-[64px] truncate text-[10px] leading-none", active ? "font-bold" : "font-medium")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// ─── Audience toggle (compact pill, copied from Navbar.tsx v1 desktop) ───────
function getAudienceToggleLocale() {
  return (localeConfig as unknown as {
    employment?: {
      audienceToggle?: { switchToWorker: string; switchToBusiness: string; ariaLabel: string };
    };
  }).employment?.audienceToggle ?? {
    switchToWorker: "Find work",
    switchToBusiness: "Hire workers",
    ariaLabel: "Switch audience",
  };
}

function AudienceToggle({ mode, onSwitch, overlayNav }: {
  mode: EmploymentAudience;
  onSwitch: (next: EmploymentAudience) => void;
  overlayNav: boolean;
}) {
  const t = getAudienceToggleLocale();
  const next: EmploymentAudience = mode === "worker" ? "business" : "worker";
  const label = next === "worker" ? t.switchToWorker : t.switchToBusiness;

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
      <span className="max-w-[96px] truncate">{label}</span>
    </button>
  );
}
