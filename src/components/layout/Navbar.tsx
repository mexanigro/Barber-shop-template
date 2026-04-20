import React from "react";
import { Menu, X, Calendar } from "lucide-react";
import { BrandLogo } from "../ui/BrandLogo";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
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

  const overlayNav = !scrolled && currentPage === "landing" && siteConfig.features.showHero;

  const navLinks = [
    { name: "Services", href: "#services", type: "anchor", enabled: siteConfig.features.showServices },
    { name: "Team", href: "#team", type: "anchor", enabled: siteConfig.features.showTeam },
    { name: "Why Us", href: "#why-choose-us", type: "anchor", enabled: siteConfig.features.showWhyChooseUs },
    { name: "Gallery", href: "#gallery", type: "page", enabled: siteConfig.features.showGallery },
    { name: "Stories", href: "#testimonials", type: "anchor", enabled: siteConfig.features.showTestimonials },
    { name: "Contact", href: "#contact", type: "anchor", enabled: siteConfig.features.showInquiry },
    { name: "Location", href: "#location", type: "anchor", enabled: siteConfig.features.showLocation },
  ].filter((link) => link.enabled);

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange("landing");
    if (currentPage === "landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLinkClick = (link: typeof navLinks[number]) => {
    if (link.name === "Gallery") {
      onPageChange("gallery");
    } else {
      if (link.href.startsWith("#")) window.location.hash = link.href;
      onPageChange("landing");
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed left-0 top-0 z-50 w-full px-4 pt-3">
      {/* Floating container — expands to full-width strip, shrinks to pill on scroll */}
      <div
        className={cn(
          "mx-auto transition-all duration-500 ease-out",
          scrolled
            ? "max-w-5xl rounded-2xl border border-black/[0.08] bg-background/80 px-4 py-2.5 shadow-lg shadow-black/[0.06] backdrop-blur-xl dark:border-white/[0.08] dark:bg-background/75 dark:shadow-black/25"
            : "max-w-7xl px-2 py-2"
        )}
      >
        <div className="flex items-center justify-between gap-4">

          {/* ── Brand ─────────────────────────────────────────────── */}
          <a
            href="/"
            onClick={handleHomeClick}
            className="group flex shrink-0 items-center gap-2.5 outline-none"
          >
            <BrandLogo
              variant={overlayNav ? "dark" : "auto"}
              iconWrapperClassName={cn(
                "group-hover:rotate-0",
                !scrolled && "rotate-3",
              )}
            />
          </a>

          {/* ── Desktop links ──────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const isActive = currentPage === "gallery" && link.name === "Gallery";
              const baseClass = cn(
                "relative px-3.5 py-2 text-sm font-medium tracking-wide rounded-xl transition-all duration-200",
                isActive
                  ? "text-accent-light"
                  : overlayNav
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              );

              return link.type === "anchor" && currentPage === "landing" ? (
                <a key={link.name} href={link.href} className={baseClass}>
                  {link.name}
                </a>
              ) : (
                <button
                  key={link.name}
                  onClick={() => handleLinkClick(link)}
                  className={baseClass}
                >
                  {link.name}
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

          {/* ── Right actions ──────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-2.5">
            <ThemeToggle />
            {siteConfig.features.showBooking && (
              <button
                onClick={onBookClick}
                className="group flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-accent/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light hover:text-zinc-950 hover:shadow-lg hover:shadow-accent/30 active:scale-95 active:translate-y-0"
              >
                <Calendar size={15} className="transition-transform duration-300 group-hover:rotate-12" />
                Book Now
              </button>
            )}
          </div>

          {/* ── Mobile toggle ──────────────────────────────────────── */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
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

      {/* ── Mobile menu ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mx-auto mt-2 max-w-lg rounded-2xl border border-black/[0.06] bg-background/95 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/[0.08] dark:shadow-black/30 md:hidden"
          >
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => {
                const isActive = currentPage === "gallery" && link.name === "Gallery";
                const itemClass = cn(
                  "flex w-full items-center rounded-xl px-4 py-3 text-base font-medium transition-all duration-200",
                  isActive
                    ? "bg-accent/10 text-accent-light"
                    : "text-foreground hover:bg-muted hover:text-accent-light"
                );

                return link.type === "anchor" && currentPage === "landing" ? (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={itemClass}
                  >
                    {link.name}
                  </a>
                ) : (
                  <button
                    key={link.name}
                    onClick={() => handleLinkClick(link)}
                    className={itemClass}
                  >
                    {link.name}
                  </button>
                );
              })}

              {siteConfig.features.showBooking && (
                <>
                  <div className="my-2 h-px bg-border" />
                  <button
                    onClick={() => { onBookClick(); setIsOpen(false); }}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-md shadow-accent/20 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 active:scale-95"
                  >
                    <Calendar size={18} />
                    Book an Appointment
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
