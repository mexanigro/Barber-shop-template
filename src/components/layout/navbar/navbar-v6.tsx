/**
 * navbar-v6.tsx — peluquería (BLOQUE-04, PATRONES-NAVBAR N-A escritorio + N-B móvil).
 *
 * Sobre el hero (scroll ≤ 20 % del viewport): barra sin fondo con una banda de
 * scrim tonal arriba (Oribe; R11, `--scrim` nunca negro), logo al inicio y, en
 * móvil, sólo la hamburguesa sin caja; en escritorio los seis ítems del brief,
 * idioma y un CTA fantasma (el relleno de esa pantalla es el del hero).
 * Al bajar: píldora `--surface` 85 % + blur, borde `--surface-alt`, radio 12;
 * en escritorio se contrae a `max-w-5xl` (Superpower, Caldera) y el CTA pasa a
 * relleno `--primary`. Nunca se esconde (0/24 webs medidas lo hacen).
 * Sin toggle claro/oscuro (R12). Menú móvil a pantalla completa: seis ítems en
 * serif 24 px / 48 px con escalón de 40 ms, al pie idioma + «לקביעת תור»
 * relleno + WhatsApp fantasma; foco atrapado y Escape con `useModalA11y`.
 *
 * Link-building logic propia (seis anclas del brief), no la de v1.
 */
import React from "react";
import { Menu, X, ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BrandLogo } from "../../ui/BrandLogo";
import { cn } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import type { PublicShellPage } from "../../../types";
import type { EmploymentAudience } from "../../../lib/employment-audience";
import { landingSectionPresent } from "../../../lib/section-presence";
import { LanguageSwitcher } from "../../ui/LanguageSwitcher";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { toWhatsAppNumber } from "../../../lib/whatsapp";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];
/** Sobre el hero mientras el scroll no pasa del 20 % del viewport (el hero es 100 dvh). */
const HERO_THRESHOLD = 0.2;
const MENU_LABEL: Record<string, string> = { en: "Menu", he: "תפריט", ru: "Меню", ar: "القائمة" };
const TRANSITION = "transition-[max-width,background-color,border-color,backdrop-filter,color] duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";

type NavId = "services" | "works" | "team" | "reviews" | "faq" | "contact";
type NavItem = { id: NavId; href: string };

/** Seis anclas del brief, en su orden; cada una sólo si su flag y su sección existen. */
function buildNavLinks(): NavItem[] {
  const f = siteConfig.features;
  const worksHref =
    f.showBeforeAfter && siteConfig.sections.beforeAfter?.cases?.length && landingSectionPresent("beforeAfter")
      ? "#antes-despues"
      : f.showGallery && landingSectionPresent("gallery")
        ? "#gallery"
        : null;
  const candidates: Array<{ id: NavId; href: string | null; enabled: boolean }> = [
    { id: "services", href: "#services", enabled: f.showServices && landingSectionPresent("services") },
    { id: "works", href: worksHref, enabled: !!worksHref },
    { id: "team", href: "#team", enabled: f.showTeam && siteConfig.businessMode !== "solo" && landingSectionPresent("team") },
    { id: "reviews", href: "#testimonials", enabled: f.showTestimonials && landingSectionPresent("testimonials") },
    { id: "faq", href: "#faq", enabled: !!f.showFaq && landingSectionPresent("faq") },
    { id: "contact", href: "#contact", enabled: f.showInquiry || f.showBusinessHours || f.showLocation },
  ];
  return candidates.filter((l): l is { id: NavId; href: string; enabled: true } => l.enabled && !!l.href);
}

function useOverHero(currentPage: string): boolean {
  const [scrolledPastHero, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * HERO_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  return !scrolledPastHero && currentPage === "landing" && siteConfig.features.showHero;
}

/** Logo del cliente a 36/44 px; sin logo, sólo el nombre del negocio en serif: sin «·», subtítulo, icono ni caja (Liam 2026-09-18). */
function Brand({ overHero, onClick }: { overHero: boolean; onClick: (e: React.MouseEvent) => void }) {
  const { brand, branding } = siteConfig;
  const hasLogo = !!brand.logo || !!brand.logoDark;
  const shortName = brand.name.split(/\s*[·|]\s*/)[0].trim() || brand.name;
  // Sin versión clara del logo se invierte el oscuro sobre el hero (vale sólo si es monocromo: aviso).
  const invert = overHero && !!brand.logo && !brand.logoDark && !brand.logoSvg;
  React.useEffect(() => {
    if (import.meta.env.DEV && brand.logo && !brand.logoDark && !brand.logoSvg) {
      console.warn("[navbar-v6] brand.logo sin brand.logoDark: sobre el hero se invierte el logo; si tiene color, subí logoDark.");
    }
  }, [brand.logo, brand.logoDark, brand.logoSvg]);
  return (
    <a
      href="/"
      onClick={onClick}
      className="group flex h-full min-w-0 shrink-0 items-center rounded-md py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
    >
      {hasLogo ? (
        <span className={cn("flex items-center", invert && "[filter:brightness(0)_invert(1)]")}>
          <BrandLogo
            variant={overHero ? "dark" : "auto"}
            {...(branding?.navbarLogoHeight
              ? { height: Math.min(branding.navbarLogoHeight, 56) }
              : { heightClass: "h-9 lg:h-11" })}
          />
        </span>
      ) : (
        <span
          className={cn("truncate font-serif text-xl font-medium tracking-wide lg:text-[22px]", overHero && "text-on-media")}
          style={overHero ? { textShadow: "0 1px 2px rgba(0,0,0,0.28), 0 6px 28px rgba(0,0,0,0.28)" } : undefined}
        >
          {shortName}
        </span>
      )}
    </a>
  );
}

export function NavbarV6({ onBookClick, onPageChange, currentPage }: {
  onBookClick: () => void;
  onPageChange: (page: PublicShellPage) => void;
  currentPage: string;
  audienceMode?: EmploymentAudience;
  onSwitchAudience?: (audience: EmploymentAudience) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const close = React.useCallback(() => setIsOpen(false), []);
  const overHero = useOverHero(currentPage) && !isOpen;
  const overlayRef = useModalA11y(isOpen, close);
  const rtl = localeConfig.dir === "rtl";
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const navLinks = buildNavLinks();
  const bookLabel = siteConfig.hero.ctaPrimary || localeConfig.buttons.bookAppointment;
  const whatsapp = toWhatsAppNumber(siteConfig.contact.phone);
  const showBooking = siteConfig.features.showBooking;

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange("landing");
    if (currentPage === "landing") window.scrollTo({ top: 0, behavior: "smooth" });
    setIsOpen(false);
  };
  const handleLinkClick = (link: NavItem) => {
    if (currentPage !== "landing") onPageChange("landing");
    window.location.hash = link.href;
    setIsOpen(false);
  };

  const shadow = overHero ? { textShadow: "0 1px 2px rgba(0,0,0,0.28), 0 6px 28px rgba(0,0,0,0.28)" } : undefined;
  const scrimBand = "linear-gradient(to bottom, color-mix(in srgb, var(--scrim, #000) 40%, transparent) 0%, color-mix(in srgb, var(--scrim, #000) 0%, transparent) 100%)";

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50" data-nav-v6={overHero ? "hero" : "page"}>
        {/* Banda de scrim tonal: sólo mientras la barra está sobre el hero (R11) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 transition-opacity duration-[240ms] ease-out motion-reduce:transition-none"
          style={{ backgroundImage: scrimBand, opacity: overHero ? 1 : 0 }}
        />
        <div
          className={cn(
            "relative mx-3 mt-3 flex h-14 items-center justify-between gap-3 rounded-xl border px-3 lg:mx-auto lg:h-16 lg:px-5",
            TRANSITION,
            overHero
              ? "max-w-7xl border-transparent bg-transparent text-on-media"
              : "max-w-[calc(100%-1.5rem)] border-[color:var(--surface-alt,var(--border))] bg-[color:color-mix(in_srgb,var(--background)_85%,transparent)] text-foreground backdrop-blur-[16px] lg:max-w-5xl",
          )}
        >
          <Brand overHero={overHero} onClick={handleHomeClick} />

          {/* Escritorio: seis ítems */}
          <div className="hidden min-w-0 items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleLinkClick(link); }}
                style={shadow}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-[15px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-current",
                  overHero ? "text-on-media/85 hover:text-on-media" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {localeConfig.nav[link.id]}
              </a>
            ))}
          </div>

          {/* Escritorio: idioma + CTA (fantasma sobre el hero, relleno al bajar) */}
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <LanguageSwitcher variant={overHero ? "light" : "dark"} align="end" />
            {showBooking && (
              <button
                type="button"
                onClick={onBookClick}
                className={cn(
                  "inline-flex h-10 items-center gap-2 whitespace-nowrap px-5 text-[15px] font-semibold transition-[background-color,border-color,color,transform] duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-current motion-reduce:transition-none",
                  overHero
                    ? "border border-on-media/70 bg-transparent text-on-media hover:bg-on-media/10"
                    : "border border-primary bg-primary text-primary-foreground hover:opacity-90",
                )}
              >
                {bookLabel}
              </button>
            )}
          </div>

          {/* Móvil: sólo la hamburguesa, sin caja */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={localeConfig.a11y.toggleMenu}
            aria-expanded={isOpen}
            aria-controls="menu-v6"
            style={overHero ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" } : undefined}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-current lg:hidden",
              overHero ? "text-on-media" : "text-foreground hover:bg-muted",
            )}
          >
            <Menu size={24} strokeWidth={1.75} />
          </button>
        </div>
      </nav>

      {/* Menú móvil a pantalla completa */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="menu-v6"
            id="menu-v6"
            role="dialog"
            aria-modal="true"
            aria-label={MENU_LABEL[localeConfig.lang] ?? MENU_LABEL.en}
            ref={overlayRef}
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.24, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            // Por encima del FAB de accesibilidad (z-[99990]): el menú es modal.
            className="fixed inset-0 z-[99992] flex flex-col bg-background text-foreground outline-none lg:hidden"
          >
            <div className="mx-3 mt-3 flex h-14 shrink-0 items-center justify-between px-3">
              <Brand overHero={false} onClick={handleHomeClick} />
              <button
                type="button"
                onClick={close}
                aria-label={localeConfig.a11y.close}
                className="flex h-11 w-11 items-center justify-center rounded-md text-foreground transition-colors duration-150 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                <X size={24} strokeWidth={1.75} />
              </button>
            </div>

            <motion.nav
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
                exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
              }}
              className="flex flex-1 flex-col justify-center overflow-y-auto px-6 py-4"
            >
              {navLinks.map((link) => (
                <motion.a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); handleLinkClick(link); }}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
                    exit: { opacity: 0, transition: { duration: 0.12 } },
                  }}
                  className="flex h-12 w-fit items-center rounded-md font-serif text-2xl font-medium leading-none tracking-wide text-foreground transition-colors duration-150 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {localeConfig.nav[link.id]}
                </motion.a>
              ))}
            </motion.nav>

            <div className="flex shrink-0 flex-col gap-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-center justify-between">
                <LanguageSwitcher variant="dark" align="start" dropUp />
              </div>
              {showBooking && (
                <button
                  type="button"
                  onClick={() => { close(); onBookClick(); }}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {bookLabel}
                  <Arrow size={16} aria-hidden="true" />
                </button>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center border border-foreground/30 px-6 text-[15px] font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {localeConfig.inquiry.whatsapp}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
