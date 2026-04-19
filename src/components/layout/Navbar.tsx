import React from "react";
import * as Icons from "lucide-react";
import { Menu, X, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { siteConfig } from "../../config/site";
import { ThemeToggle } from "../theme/ThemeToggle";

export function Navbar({ onBookClick, onPageChange, currentPage }: { 
  onBookClick: () => void, 
  onPageChange: (page: "landing" | "gallery") => void,
  currentPage: string 
}) {
  const BrandIcon = (Icons as any)[siteConfig.brand.logoIconName || "Scissors"] || Icons.Scissors;
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /** Light nav copy on transparent bar over the dark Hero overlay */
  const overlayNav =
    !scrolled && currentPage === "landing" && siteConfig.features.showHero;

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

  return (
    <nav
      className={cn(
        "fixed left-0 top-0 z-50 w-full px-6 py-4 transition-all duration-300",
        scrolled
          ? "border-b border-black/[0.06] bg-background/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-background/70 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a 
          href="/"
          onClick={handleHomeClick} 
          className="flex items-center gap-2 group outline-none"
        >
          <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
            <BrandIcon className="text-zinc-950" size={24} />
          </div>
          <span
            className={cn(
              "text-xl font-bold tracking-tighter uppercase transition-colors duration-300",
              overlayNav ? "text-white drop-shadow-sm" : "text-foreground"
            )}
          >
             {siteConfig.brand.name}
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            link.type === "anchor" && currentPage === "landing" ? (
              <a
                key={link.name}
                href={link.href}
                className={cn(
                  "text-sm font-semibold uppercase tracking-widest transition-colors duration-300 hover:text-accent-light",
                  overlayNav ? "text-white/85 hover:text-accent-light" : "text-muted-foreground hover:text-accent-light"
                )}
              >
                {link.name}
              </a>
            ) : (
              <button
                key={link.name}
                onClick={() => {
                  if (link.name === "Gallery") {
                    onPageChange("gallery");
                  } else {
                    if (link.href.startsWith('#')) {
                      window.location.hash = link.href;
                    }
                    onPageChange("landing");
                  }
                  setIsOpen(false);
                }}
                className={cn(
                  "text-sm font-semibold uppercase tracking-widest transition-colors duration-300 hover:text-accent-light",
                  currentPage === "gallery" && link.name === "Gallery"
                    ? "text-accent-light"
                    : overlayNav ? "text-white/85" : "text-muted-foreground"
                )}
              >
                {link.name}
              </button>
            )
          ))}
          {siteConfig.features.showBooking && (
            <button
              onClick={onBookClick}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-accent/25 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 hover:shadow-xl hover:shadow-accent/35 active:scale-95"
            >
              <Calendar size={18} />
              <span>BOOK NOW</span>
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />
          <button
            className={cn(
              "p-2 transition-colors duration-300",
              overlayNav ? "text-white" : "text-foreground"
            )}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-0 top-full w-full border-b border-black/[0.06] bg-background/95 p-6 backdrop-blur-xl md:hidden dark:border-white/10"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                link.type === "anchor" && currentPage === "landing" ? (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-bold uppercase tracking-widest text-foreground transition-colors duration-300 hover:text-accent-light"
                  >
                    {link.name}
                  </a>
                ) : (
                  <button
                    key={link.name}
                    onClick={() => {
                      if (link.name === "Gallery") {
                        onPageChange("gallery");
                      } else {
                        if (link.href.startsWith('#')) {
                          window.location.hash = link.href;
                        }
                        onPageChange("landing");
                      }
                      setIsOpen(false);
                    }}
                    className={cn(
                      "text-lg font-bold uppercase tracking-widest text-left transition-colors",
                      currentPage === "gallery" && link.name === "Gallery"
                        ? "text-accent-light"
                        : "text-foreground transition-colors duration-300 hover:text-accent-light"
                    )}
                  >
                    {link.name}
                  </button>
                )
              ))}
              {siteConfig.features.showBooking && (
                <button
                  onClick={() => {
                    onBookClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground transition-colors duration-300 hover:bg-accent-light hover:text-zinc-950"
                >
                  <Calendar size={20} />
                  <span>BOOK APPOINTMENT</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
