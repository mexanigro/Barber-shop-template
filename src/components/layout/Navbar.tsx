import React from "react";
import { Menu, X, Calendar } from "lucide-react";
import { BrandLogo } from "../ui/BrandLogo";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import type { PublicShellPage } from "../../types";
import { ThemeToggle } from "../theme/ThemeToggle";

export function Navbar({ onBookClick, onPageChange, currentPage }: {
  onBookClick: () => void;
  onPageChange: (page: PublicShellPage) => void;
  currentPage: string;
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

  const isEstetica = siteConfig.business.type === "estetica";
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
        enabled: siteConfig.features.showTeam,
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
        enabled: siteConfig.features.showInquiry,
      },
      {
        id: "location" as const,
        href: "#location",
        type: "anchor" as const,
        enabled: siteConfig.features.showLocation,
      },
    ] as const
  ).filter((link) => link.enabled);

  const navLabel = (id: NavId) => localeConfig.nav[id];

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
    } else {
      if (link.href.startsWith("#")) window.location.hash = link.href;
      onPageChange("landing");
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed left-0 top-0 z-50 w-full px-3 pt-3 md:px-4">
      {/* Floating container */}
      <div
        className={cn(
          "mx-auto transition-all duration-500 ease-out",
          scrolled
            ? cn(
                "max-w-5xl rounded-2xl border border-black/[0.08] bg-background/80 px-4 py-2.5 shadow-lg shadow-black/[0.06] backdrop-blur-xl dark:border-white/[0.08] dark:bg-background/75 dark:shadow-black/25",
                isEstetica && "border-border/50 bg-background/95 shadow-sm backdrop-blur-sm dark:border-border/30 dark:bg-background/90",
              )
            : cn(
                "max-w-7xl px-2 py-2",
                /* Estetica mobile: show a subtle container so the navbar frames properly.
                   Over hero (overlayNav): dark glass. Over content pages: light glass. */
                isEstetica && overlayNav && "max-md:rounded-2xl max-md:border max-md:border-white/15 max-md:bg-black/20 max-md:px-3 max-md:py-2 max-md:backdrop-blur-md",
                isEstetica && !overlayNav && "max-md:rounded-2xl max-md:border max-md:border-border/50 max-md:bg-background/90 max-md:px-3 max-md:py-2 max-md:backdrop-blur-sm max-md:shadow-sm",
              ),
        )}
      >
        <div className="flex items-center justify-between gap-4">

          {/* Brand */}
          <a
            href="/"
            onClick={handleHomeClick}
            className="group flex shrink-0 items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <BrandLogo
              variant={overlayNav ? "dark" : "auto"}
              iconWrapperClassName={cn(
                "group-hover:rotate-0",
                !scrolled && "rotate-3",
              )}
              nameClassName={isEstetica ? "text-lg font-normal tracking-wider md:text-2xl md:tracking-widest" : undefined}
            />
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isActive = currentPage === "gallery" && link.id === "gallery";
              const baseClass = cn(
                "relative px-3.5 py-2 text-sm font-medium tracking-wide rounded-xl transition-all duration-200",
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
          <div className="hidden md:flex items-center gap-2.5">
            {siteConfig.features.showBooking && (
              <button
                onClick={onBookClick}
                className={cn(
                  "group flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isEstetica
                    ? "font-medium hover:bg-accent-light hover:text-zinc-950"
                    : "font-semibold shadow-md shadow-accent/20 hover:-translate-y-0.5 hover:bg-accent-light hover:text-zinc-950 hover:shadow-lg hover:shadow-accent/30 active:scale-95 active:translate-y-0",
                )}
              >
                <Calendar size={15} className="transition-transform duration-300 group-hover:rotate-12" />
                {isEstetica ? siteConfig.hero.ctaPrimary : localeConfig.buttons.bookNow}
              </button>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={localeConfig.a11y.toggleMenu}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200",
                overlayNav
                  ? "border-white/20 text-white hover:bg-white/10"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={17} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
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
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "mx-auto mt-2 max-w-lg rounded-2xl border p-3 shadow-2xl backdrop-blur-xl md:hidden",
              isEstetica
                ? "border-border/60 bg-background/98 shadow-black/5"
                : "border-black/[0.06] bg-background/95 shadow-black/10 dark:border-white/[0.08] dark:shadow-black/30",
            )}
          >
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => {
                const isActive = currentPage === "gallery" && link.id === "gallery";
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

              {siteConfig.features.showBooking && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <button
                    onClick={() => { onBookClick(); setIsOpen(false); }}
                    className={cn(
                      "flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-primary-foreground transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      isEstetica
                        ? "text-sm font-medium"
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
