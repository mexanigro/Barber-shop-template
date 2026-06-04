/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { localeConfig } from "./config/locale";
import { useLanguage } from "./contexts/LanguageContext";
import { NICHE_DEFAULT_SECTION_ORDER, DEFAULT_SECTION_ORDER } from "./config/presets/themes";
import type { LandingSectionId } from "./types";
import { useModalA11y } from "./hooks/useModalA11y";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { Hero } from "./components/landing/Hero";
import { Services } from "./components/landing/Services";
import { Team } from "./components/landing/Team";
import { WhyChooseUs } from "./components/landing/WhyChooseUs";
import { Testimonials } from "./components/landing/Testimonials";
import { Location } from "./components/landing/Location";
import { BusinessHours } from "./components/landing/BusinessHours";
import { ContactHub } from "./components/landing/ContactHub";
import { Gallery } from "./components/landing/Gallery";
import { GalleryTeaser } from "./components/landing/GalleryTeaser";
import { InstagramFeed } from "./components/landing/InstagramFeed";
import { InstagramTeaser } from "./components/landing/InstagramTeaser";
import { QuickInquiry } from "./components/landing/QuickInquiry";
import { QuoteRequestModal } from "./components/QuoteRequestModal";
import { Philosophy } from "./components/landing/Philosophy";
import { Process } from "./components/landing/Process";
import { Ambience } from "./components/landing/Ambience";
import { Portfolio } from "./components/landing/Portfolio";
import { FAQ } from "./components/landing/FAQ";
import { Menu } from "./components/landing/Menu";
import { SectionDivider } from "./components/landing/SectionDivider";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { TOUR_CONFIG } from "./config/tour.config";

import { LandingBackdrop } from "./components/landing/LandingBackdrop";
import { SplashScreen } from "./components/layout/SplashScreen";
import { splashSession } from "./lib/splash-session";
import { siteConfig } from "./config/site";
import { getAudience, setAudience as persistAudience, clearAudience, pathForAudience, type EmploymentAudience } from "./lib/employment-audience";
import { ToastProvider } from "./components/ui/Toast";
import { useSEO } from "./hooks/useSEO";
import { useSchema } from "./hooks/useSchema";
import { DUR_OVERLAY, DUR_MODAL_ENTER } from "./lib/motion";
import type { LegalDocKind } from "./config/legalContent";
import type { PublicShellPage } from "./types";

const BookingWizard = React.lazy(async () => {
  const m = await import("./components/booking/BookingWizard");
  return { default: m.BookingWizard };
});
const AdminDashboard = React.lazy(async () => {
  const m = await import("./components/admin/AdminDashboard");
  return { default: m.AdminDashboard };
});
const ProtectedRoute = React.lazy(async () => {
  const m = await import("./components/admin/ProtectedRoute");
  return { default: m.ProtectedRoute };
});
const GalleryPage = React.lazy(async () => {
  const m = await import("./components/gallery/GalleryPage");
  return { default: m.GalleryPage };
});
const Chatbot = React.lazy(async () => {
  const m = await import("./components/chat/Chatbot");
  return { default: m.Chatbot };
});
const LegalPage = React.lazy(async () => {
  const m = await import("./components/legal/LegalPage");
  return { default: m.LegalPage };
});
const StaffProfilePage = React.lazy(async () => {
  const m = await import("./components/staff/StaffProfilePage");
  return { default: m.StaffProfilePage };
});
const ServicesPage = React.lazy(async () => {
  const m = await import("./components/services/ServicesPage");
  return { default: m.ServicesPage };
});
const AboutPage = React.lazy(async () => {
  const m = await import("./components/about/AboutPage");
  return { default: m.AboutPage };
});
const ProjectsPage = React.lazy(async () => {
  const m = await import("./components/portfolio/ProjectsPage");
  return { default: m.ProjectsPage };
});
const BeforeAfterSection = React.lazy(async () => {
  const m = await import("./components/landing/BeforeAfter");
  return { default: m.BeforeAfterSection };
});
const EmploymentHero = React.lazy(async () => {
  const m = await import("./components/landing/employment/EmploymentHero");
  return { default: m.EmploymentHero };
});
const HowItWorks = React.lazy(async () => {
  const m = await import("./components/landing/employment/HowItWorks");
  return { default: m.HowItWorks };
});
const JobCategories = React.lazy(async () => {
  const m = await import("./components/landing/employment/JobCategories");
  return { default: m.JobCategories };
});
const RegistrationWizard = React.lazy(async () => {
  const m = await import("./components/landing/employment/RegistrationWizard");
  return { default: m.RegistrationWizard };
});
const AudienceChoice = React.lazy(async () => {
  const m = await import("./components/landing/employment/AudienceChoice");
  return { default: m.AudienceChoice };
});
const BusinessHero = React.lazy(async () => {
  const m = await import("./components/landing/employment/business/BusinessHero");
  return { default: m.BusinessHero };
});
const BusinessBenefits = React.lazy(async () => {
  const m = await import("./components/landing/employment/business/BusinessBenefits");
  return { default: m.BusinessBenefits };
});
const WorkerCategories = React.lazy(async () => {
  const m = await import("./components/landing/employment/business/WorkerCategories");
  return { default: m.WorkerCategories };
});
const BusinessProcess = React.lazy(async () => {
  const m = await import("./components/landing/employment/business/BusinessProcess");
  return { default: m.BusinessProcess };
});
const BusinessRegistrationForm = React.lazy(async () => {
  const m = await import("./components/landing/employment/business/BusinessRegistrationForm");
  return { default: m.BusinessRegistrationForm };
});
const BusinessTestimonials = React.lazy(async () => {
  const m = await import("./components/landing/employment/business/BusinessTestimonials");
  return { default: m.BusinessTestimonials };
});
const BusinessFAQ = React.lazy(async () => {
  const m = await import("./components/landing/employment/business/BusinessFAQ");
  return { default: m.BusinessFAQ };
});
const ProductTour = React.lazy(async () => {
  const m = await import("./components/ProductTour");
  return { default: m.ProductTour };
});
// Internal-only demo route. Gated by `import.meta.env.DEV` so Vite tree-shakes
// the dynamic import (and the WhyChooseUsPreview-style demo wrappers it pulls
// in) out of production bundles. The route handler below is gated the same way.
const Impact3DDemoPage: React.LazyExoticComponent<React.ComponentType> | null =
  import.meta.env.DEV
    ? React.lazy(() => import("./components/3d-impact/DemoPage"))
    : null;
// Dev-only wizard-refs preview route — used by Nichos-hub's capture script to
// screenshot landing sections per niche. Gated by `import.meta.env.DEV` so the
// chunk is tree-shaken out of production builds.
const WizardRefsPreviewPage: React.LazyExoticComponent<React.ComponentType> | null =
  import.meta.env.DEV
    ? React.lazy(async () => {
        const m = await import("./components/dev/WizardRefsPreview");
        return { default: m.WizardRefsPreview };
      })
    : null;
const TourButton = React.lazy(async () => {
  const m = await import("./components/TourButton");
  return { default: m.TourButton };
});

/** Lightweight spinner shown while lazy routes load (replaces fallback={null}). */
function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent-light border-t-transparent" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{localeConfig.a11y.loadingRoute}</p>
    </div>
  );
}

function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/$/, "") || "/";
  return p;
}

type ParsedPublicRoute = {
  page: PublicShellPage;
  staffSlug?: string;
};

function parsePublicRoute(pathname: string): ParsedPublicRoute {
  const p = normalizePath(pathname);
  const equipo = /^\/equipo\/([^/]+)$/.exec(p);
  if (equipo) {
    return {
      page: "staff-profile",
      staffSlug: decodeURIComponent(equipo[1]),
    };
  }
  if (p === "/privacidad" || p === "/privacy") return { page: "privacy" };
  if (p === "/terminos" || p === "/terms") return { page: "terms" };
  if (p === "/cancelacion" || p === "/cancellation") return { page: "cancellation" };
  if (p === "/tratamientos" || p === "/treatments") return { page: "services" };
  if (p === "/nosotros" || p === "/about") return { page: "about" };
  if (p === "/proyectos" || p === "/projects") return { page: "projects" };
  // Employment dual-audience routes. They share the path namespace with the
  // generic landing — when the active niche is not "employment", these paths
  // simply fall back to the landing branch below.
  if (siteConfig.business.type === "employment") {
    if (p === "/choose" || p === "/elige") return { page: "audience-choice" };
    if (p === "/trabajo" || p === "/workers" || p === "/jobs") return { page: "workers-landing" };
    if (p === "/empresas" || p === "/business" || p === "/hire") return { page: "business-landing" };
  }
  return { page: "landing" };
}

function legalKindToPath(kind: LegalDocKind): string {
  switch (kind) {
    case "privacy":
      return "/privacidad";
    case "terms":
      return "/terminos";
    case "cancellation":
      return "/cancelacion";
    default:
      return "/";
  }
}

export default function App() {
  // Subscribe to language changes — triggers full re-render when user switches language
  const { language } = useLanguage();
  void language; // consumed implicitly via re-render
  useSEO();
  useSchema();

  // Disable automatic browser scroll restoration so the page always starts at
  // the top after a hard reload. Without this, the browser restores the last
  // scroll position AFTER React's own scrollTo(0,0), overriding it.
  React.useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  // initialRoute must be declared FIRST - used by showSplash initialiser below.
  const isAdminRoute =
    typeof window !== "undefined" &&
    normalizePath(window.location.pathname) === "/admin";
  let initialRoute: ParsedPublicRoute | { page: "admin" } = isAdminRoute
    ? { page: "admin" as const }
    : typeof window !== "undefined"
      ? parsePublicRoute(window.location.pathname)
      : { page: "landing" as PublicShellPage };

  // Employment dual-audience entry rule:
  //   • `/` always shows the choice screen so returning visitors still see
  //     the brand split. AudienceChoice reads localStorage internally and
  //     auto-resumes after a brief delay (cancellable by interacting with
  //     the other panel).
  //   • `/choose` also shows the choice screen (navbar toggle calls
  //     clearAudience() first, so no auto-resume fires there).
  if (
    siteConfig.business.type === "employment" &&
    typeof window !== "undefined" &&
    initialRoute.page === "landing"
  ) {
    window.history.replaceState({}, "", "/choose");
    initialRoute = { page: "audience-choice" };
  }

  // Splash: shown once per hard load, only when the initial URL is the landing
  // page (or the workers-landing alias for the employment niche). The audience
  // choice screen and the business landing skip the splash because they have
  // their own deliberate entrance animations.
  const [showSplash, setShowSplash] = React.useState(
    siteConfig.splash.enabled &&
    (initialRoute.page === "landing" || initialRoute.page === "workers-landing") &&
    !splashSession.dismissed,
  );

  React.useEffect(() => {
    if (!showSplash) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setShowSplash(false), siteConfig.splash.durationMs);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [showSplash]);

  const [showBooking, setShowBooking] = React.useState(false);
  const [bookingServiceId, setBookingServiceId] = React.useState<string | undefined>();
  const [showQuoteModal, setShowQuoteModal] = React.useState(false);
  const [quoteServiceId, setQuoteServiceId] = React.useState<string | undefined>();
  const [page, setPage] = React.useState<PublicShellPage | "admin">(initialRoute.page);
  const [staffSlug, setStaffSlug] = React.useState<string | undefined>(
    initialRoute.page === "staff-profile" ? initialRoute.staffSlug : undefined,
  );

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking_status") && siteConfig.features.showBooking) {
      setShowBooking(true);
    }
  }, []);

  React.useEffect(() => {
    if (page === "gallery" && !siteConfig.features.showGallery) {
      window.history.replaceState({}, "", "/");
      setPage("landing");
    }
  }, [page]);

  React.useEffect(() => {
    if (!siteConfig.features.showBooking) {
      setShowBooking(false);
    }
  }, []);

  React.useEffect(() => {
    const onPopState = () => {
      if (normalizePath(window.location.pathname) === "/admin") {
        setPage("admin");
        return;
      }
      const r = parsePublicRoute(window.location.pathname);
      setPage(r.page);
      setStaffSlug(r.page === "staff-profile" ? r.staffSlug : undefined);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Track whether this is the first render (initial page load).
  // On the first load the splash handles scroll position, so we should NOT
  // honour a stale hash (#services, etc.) that the browser left in the URL
  // from a previous session — that would scroll past the hero.
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    window.scrollTo(0, 0);

    const isLegal =
      page === "privacy" || page === "terms" || page === "cancellation";
    const isStaffProfile = page === "staff-profile";
    if (!isLegal && !isStaffProfile) {
      document.title = siteConfig.brand.name;
    }

    // Only honour in-page hash navigation on subsequent SPA navigations,
    // never on the initial hard load (where the hash is likely stale).
    if (!isFirstRender.current) {
      const hash = window.location.hash;
      const isHashable =
        page === "landing" || page === "workers-landing" || page === "business-landing";
      if (isHashable && hash) {
        const element = document.getElementById(hash.substring(1));
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    isFirstRender.current = false;
  }, [page]);

  const handleBookNow = useCallback((serviceId?: string) => {
    if (siteConfig.features.showBooking) {
      setBookingServiceId(serviceId);
      setShowBooking(true);
    } else if (siteConfig.features.showInquiry) {
      setQuoteServiceId(serviceId);
      setShowQuoteModal(true);
    }
  }, []);

  const closeBooking = useCallback(() => {
    setShowBooking(false);
    setBookingServiceId(undefined);
  }, []);
  const bookingRef = useModalA11y(showBooking, closeBooking);

  const closeQuoteModal = useCallback(() => {
    setShowQuoteModal(false);
    setQuoteServiceId(undefined);
  }, []);

  const navigatePublic = React.useCallback((target: PublicShellPage) => {
    if (target === "privacy" || target === "terms" || target === "cancellation") {
      window.history.pushState({}, "", legalKindToPath(target));
      setPage(target);
      setStaffSlug(undefined);
      return;
    }
    if (target === "services") {
      window.history.pushState({}, "", "/treatments");
      setPage("services");
      setStaffSlug(undefined);
      return;
    }
    if (target === "about") {
      window.history.pushState({}, "", "/about");
      setPage("about");
      setStaffSlug(undefined);
      return;
    }
    if (target === "projects") {
      window.history.pushState({}, "", "/projects");
      setPage("projects");
      setStaffSlug(undefined);
      return;
    }
    // Employment dual-audience: when a sub-page calls navigatePublic("landing")
    // (e.g. via the Navbar brand link or anchor clicks) we route back to the
    // saved audience's landing instead of the generic "/" — that way users
    // never accidentally land back on the choice screen mid-session.
    if (target === "landing" && siteConfig.business.type === "employment") {
      const saved = getAudience();
      const path = saved ? pathForAudience(saved) : "/choose";
      window.history.pushState({}, "", path);
      setPage(
        saved
          ? saved === "worker"
            ? "workers-landing"
            : "business-landing"
          : "audience-choice",
      );
      setStaffSlug(undefined);
      return;
    }
    window.history.pushState({}, "", "/");
    setPage(target);
    setStaffSlug(undefined);
  }, []);

  const navigateToLegal = React.useCallback((kind: LegalDocKind) => {
    window.history.pushState({}, "", legalKindToPath(kind));
    setPage(kind);
    setStaffSlug(undefined);
  }, []);

  const handleHomeFromLegal = React.useCallback(() => {
    window.history.pushState({}, "", "/");
    setPage("landing");
    setStaffSlug(undefined);
  }, []);

  const navigateToStaffProfile = React.useCallback((slug: string) => {
    window.history.pushState({}, "", `/equipo/${encodeURIComponent(slug)}`);
    setPage("staff-profile");
    setStaffSlug(slug);
  }, []);

  const handleHomeFromStaffProfile = React.useCallback(() => {
    window.history.pushState({}, "", "/");
    setPage("landing");
    setStaffSlug(undefined);
  }, []);

  const navigateToServicesPage = React.useCallback(() => {
    navigatePublic("services");
  }, [navigatePublic]);

  const navigateToAboutPage = React.useCallback(() => {
    navigatePublic("about");
  }, [navigatePublic]);

  const navigateToProjectsPage = React.useCallback(() => {
    navigatePublic("projects");
  }, [navigatePublic]);

  const navigateToAdmin = useCallback(() => {
    window.history.pushState({}, "", "/admin");
    setPage("admin");
  }, []);
  const navigateToLanding = useCallback(() => {
    window.history.pushState({}, "", "/");
    setPage("landing");
  }, []);

  // Employment dual-audience navigation helpers. They live next to the other
  // navigators so the whole routing surface is in one place.
  const handleAudiencePick = useCallback((audience: EmploymentAudience) => {
    const target = pathForAudience(audience);
    window.history.pushState({}, "", target);
    setPage(audience === "worker" ? "workers-landing" : "business-landing");
    setStaffSlug(undefined);
  }, []);

  const navigateToAudienceChoice = useCallback(() => {
    clearAudience();
    window.history.pushState({}, "", "/choose");
    setPage("audience-choice");
    setStaffSlug(undefined);
  }, []);

  const switchAudience = useCallback((audience: EmploymentAudience) => {
    persistAudience(audience);
    const target = pathForAudience(audience);
    window.history.pushState({}, "", target);
    setPage(audience === "worker" ? "workers-landing" : "business-landing");
    setStaffSlug(undefined);
  }, []);

  const tourElement = TOUR_CONFIG.isDemoMode ? (
    <Suspense fallback={null}>
      <ProductTour
        onRequestBooking={handleBookNow}
        onCloseBooking={closeBooking}
        onNavigateAdmin={navigateToAdmin}
        onNavigateLanding={navigateToLanding}
      />
      <TourButton onClick={() => window.location.reload()} />
    </Suspense>
  ) : null;

  // Internal demo route — visible at /3d-impact-demo, not linked from nav.
  // Detected directly from window.location so it bypasses the normal
  // route table and never appears in `parsePublicRoute`. The DEV gate
  // matches the lazy import above so the chunk is fully tree-shaken in prod.
  if (
    import.meta.env.DEV &&
    Impact3DDemoPage &&
    typeof window !== "undefined" &&
    normalizePath(window.location.pathname) === "/3d-impact-demo"
  ) {
    const Page = Impact3DDemoPage;
    return (
      <Suspense fallback={<RouteLoader />}>
        <Page />
      </Suspense>
    );
  }

  if (
    import.meta.env.DEV &&
    WizardRefsPreviewPage &&
    typeof window !== "undefined" &&
    normalizePath(window.location.pathname) === "/dev/wizard-refs-preview"
  ) {
    const Page = WizardRefsPreviewPage;
    return (
      <Suspense fallback={<RouteLoader />}>
        <Page />
      </Suspense>
    );
  }

  if (page === "admin") {
    return (
      <>
        <Suspense fallback={<RouteLoader />}>
          <ProtectedRoute onExit={navigateToLanding}>
            <ToastProvider>
              <AdminDashboard onExit={navigateToLanding} />
            </ToastProvider>
          </ProtectedRoute>
        </Suspense>
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
        {tourElement}
      </>
    );
  }

  /* ── Employment: dual-audience choice screen ─────────────────────────────
   * Full viewport. No navbar, no footer — the choice IS the page. */
  if (page === "audience-choice") {
    return (
      <Suspense fallback={<RouteLoader />}>
        <AudienceChoice onSelect={handleAudiencePick} />
      </Suspense>
    );
  }

  /* ── Employment: business landing ────────────────────────────────────────
   * Companies-facing view. Shares the navbar/footer chrome with the workers
   * landing but renders a dedicated section stack. */
  if (page === "business-landing") {
    // shellCommon (declared further below for the standard landing branch) is
    // intentionally inlined here so this block stays self-contained — moving
    // its declaration up here would force every fall-through branch to
    // re-declare it as a `let`. The chatbot, scroll-to-top and booking modal
    // are shared chrome that every site shell needs.
    const businessShell = (
      <>
        <ScrollToTop />
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
        {tourElement}
        <QuoteRequestModal
          isOpen={showQuoteModal}
          onClose={closeQuoteModal}
          preselectedServiceId={quoteServiceId}
        />
      </>
    );
    return (
      <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
        <Navbar
          onBookClick={handleBookNow}
          onPageChange={navigatePublic}
          currentPage={page}
          audienceMode="business"
          onSwitchAudience={switchAudience}
        />
        <main id="main-content">
          <Suspense fallback={<RouteLoader />}>
            <BusinessHero />
          </Suspense>
          <Suspense fallback={null}>
            <BusinessBenefits />
          </Suspense>
          <Suspense fallback={null}>
            <WorkerCategories />
          </Suspense>
          <Suspense fallback={null}>
            <BusinessProcess />
          </Suspense>
          <Suspense fallback={null}>
            <BusinessRegistrationForm />
          </Suspense>
          <Suspense fallback={null}>
            <BusinessTestimonials />
          </Suspense>
          <Suspense fallback={null}>
            <BusinessFAQ />
          </Suspense>
          <Suspense fallback={null}>
            <ContactHub />
          </Suspense>
        </main>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
          onBookClick={handleBookNow}
        />
        {businessShell}
      </div>
    );
  }

  const shellCommon = (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteLoader />}>
        <Chatbot />
      </Suspense>
      {tourElement}
      <AnimatePresence>
        {siteConfig.features.showBooking && showBooking && (
          <div
            ref={bookingRef}
            role="dialog"
            aria-modal="true"
            aria-label={localeConfig.buttons.bookAppointment}
            data-testid="booking-wizard"
            tabIndex={-1}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 outline-none"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR_OVERLAY }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md transition-colors duration-300"
              onClick={closeBooking}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: DUR_MODAL_ENTER }}
              className="relative w-full max-w-2xl rounded-2xl border border-border bg-card/95 px-4 py-5 text-card-foreground shadow-elevated backdrop-blur-md transition-colors duration-300 sm:rounded-3xl sm:p-6 md:p-8 dark:bg-card/90"
            >
              {/* fallback={null} intencional: el backdrop del overlay ya provee feedback visual
                  mientras el chunk de BookingWizard carga. Un RouteLoader aqui causaria doble spinner. */}
              <Suspense fallback={null}>
                <BookingWizard onClose={closeBooking} initialServiceId={bookingServiceId} />
              </Suspense>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <QuoteRequestModal
        isOpen={showQuoteModal}
        onClose={closeQuoteModal}
        preselectedServiceId={quoteServiceId}
      />
    </>
  );

  const isLegalPage =
    page === "privacy" || page === "terms" || page === "cancellation";

  if (page === "services") {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
        <Navbar
          onBookClick={handleBookNow}
          onPageChange={navigatePublic}
          currentPage={page}
        />
        <main id="main-content">
          <Suspense fallback={<RouteLoader />}>
            <ServicesPage
              onBack={() => navigatePublic("landing")}
              onBookClick={handleBookNow}
            />
          </Suspense>
        </main>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
          onBookClick={handleBookNow}
        />
        {shellCommon}
      </div>
    );
  }

  if (page === "about") {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
        <Navbar
          onBookClick={handleBookNow}
          onPageChange={navigatePublic}
          currentPage={page}
        />
        <main id="main-content">
          <Suspense fallback={<RouteLoader />}>
            <AboutPage
              onBack={() => navigatePublic("landing")}
              onBookClick={handleBookNow}
              onNavigateToStaffProfile={
                siteConfig.features.enableStaffPages
                  ? navigateToStaffProfile
                  : undefined
              }
            />
          </Suspense>
        </main>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
          onBookClick={handleBookNow}
        />
        {shellCommon}
      </div>
    );
  }

  if (page === "projects") {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
        <main id="main-content">
          <Suspense fallback={<RouteLoader />}>
            <ProjectsPage onBack={() => navigatePublic("landing")} />
          </Suspense>
        </main>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
          onBookClick={handleBookNow}
        />
        {shellCommon}
      </div>
    );
  }

  if (page === "staff-profile") {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
        <Navbar
          onBookClick={handleBookNow}
          onPageChange={navigatePublic}
          currentPage={page}
        />
        <main id="main-content">
          <Suspense fallback={<RouteLoader />}>
            <StaffProfilePage
              slug={staffSlug ?? ""}
              onBackHome={handleHomeFromStaffProfile}
              onBookClick={handleBookNow}
            />
          </Suspense>
        </main>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
          onBookClick={handleBookNow}
        />
        {shellCommon}
      </div>
    );
  }

  if (page === "gallery" && siteConfig.features.showGallery) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Navbar
          onBookClick={handleBookNow}
          onPageChange={navigatePublic}
          currentPage={page}
        />
        <Suspense fallback={<RouteLoader />}>
          <GalleryPage onBack={() => navigatePublic("landing")} />
        </Suspense>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
          onBookClick={handleBookNow}
        />
        {shellCommon}
      </div>
    );
  }

  if (isLegalPage) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
        <Navbar
          onBookClick={handleBookNow}
          onPageChange={navigatePublic}
          currentPage={page}
        />
        <main id="main-content">
          <Suspense fallback={<RouteLoader />}>
            <LegalPage kind={page} onBackHome={handleHomeFromLegal} />
          </Suspense>
        </main>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
          onBookClick={handleBookNow}
        />
        {shellCommon}
      </div>
    );
  }

  // ── Section ordering (Firestore > niche default > global default) ──
  const sectionOrder: LandingSectionId[] =
    siteConfig.sectionOrder
    ?? NICHE_DEFAULT_SECTION_ORDER[siteConfig.business.type]
    ?? DEFAULT_SECTION_ORDER;

  // LandingBackdrop wraps Hero + Services with a shared sticky background
  // only when they are the first two sections and both are enabled.
  const heroServicesAdjacent =
    sectionOrder[0] === "hero" && sectionOrder[1] === "services";
  const useLandingBackdrop =
    heroServicesAdjacent &&
    siteConfig.features.showHero &&
    siteConfig.features.showServices;

  /** Render a single landing section by ID. */
  const renderSection = (id: LandingSectionId): React.ReactNode => {
    switch (id) {
      case "hero":
        // When wrapped in LandingBackdrop, hero is rendered there — skip standalone.
        if (useLandingBackdrop) return null;
        if (!siteConfig.features.showHero) return null;
        if (siteConfig.business.type === "employment") {
          return <React.Suspense fallback={null} key="hero"><EmploymentHero onBookClick={handleBookNow} /></React.Suspense>;
        }
        return <Hero key="hero" onBookClick={handleBookNow} />;

      case "services":
        // When wrapped in LandingBackdrop, services is rendered there — skip standalone.
        if (useLandingBackdrop) return null;
        return siteConfig.features.showServices
          ? <Services key="services" onBookClick={handleBookNow} onNavigateToServices={navigateToServicesPage} />
          : null;

      case "menu":
        return siteConfig.features.showMenu
          ? <Menu key="menu" />
          : null;

      case "whyChooseUs":
        return siteConfig.features.showWhyChooseUs
          ? <WhyChooseUs key="whyChooseUs" onNavigateToAbout={siteConfig.business.type === "estetica" ? navigateToAboutPage : undefined} />
          : null;

      case "team": {
        const visible = siteConfig.features.showTeam || siteConfig.features.showAbout;
        return visible
          ? <Team key="team" onBookClick={handleBookNow} onNavigateToStaffProfile={siteConfig.features.enableStaffPages ? navigateToStaffProfile : undefined} />
          : null;
      }

      case "gallery":
        return siteConfig.features.showGallery
          ? siteConfig.business.type === "estetica"
            ? <GalleryTeaser key="gallery" onViewFull={() => navigatePublic("gallery")} />
            : <Gallery key="gallery" onViewFull={() => navigatePublic("gallery")} />
          : null;

      case "testimonials":
        return siteConfig.features.showTestimonials
          ? <Testimonials key="testimonials" />
          : null;

      case "instagram":
        return siteConfig.features.showInstagram
          ? siteConfig.sections.instagram
            ? <InstagramTeaser key="instagram" />
            : siteConfig.contact.social.instagram
              ? <InstagramFeed key="instagram" />
              : null
          : null;

      case "contactHub":
        return (siteConfig.features.showInquiry || siteConfig.features.showBusinessHours || siteConfig.features.showLocation)
          ? <ContactHub key="contactHub" />
          : null;

      // Legacy individual sections (kept for backward compat with custom section orders)
      case "inquiry":
        return siteConfig.features.showInquiry
          ? <QuickInquiry key="inquiry" />
          : null;

      case "businessHours":
        return siteConfig.features.showBusinessHours
          ? <BusinessHours key="businessHours" />
          : null;

      case "location":
        return siteConfig.features.showLocation
          ? <Location key="location" />
          : null;

      case "philosophy":
        return siteConfig.features.showPhilosophy
          ? <Philosophy key="philosophy" />
          : null;

      case "process":
        return siteConfig.features.showProcess
          ? <Process key="process" />
          : null;

      case "ambience":
        return siteConfig.features.showAmbience
          ? <Ambience key="ambience" />
          : null;

      case "portfolio":
        return siteConfig.features.showPortfolio
          ? <Portfolio key="portfolio" onNavigateToProjects={siteConfig.business.type === "remodelaciones" ? navigateToProjectsPage : undefined} />
          : null;

      case "faq":
        return siteConfig.features.showFaq
          ? <FAQ key="faq" />
          : null;

      case "beforeAfter":
        return siteConfig.features.showBeforeAfter &&
          siteConfig.sections.beforeAfter?.cases?.length
          ? <React.Suspense fallback={null} key="beforeAfter">
              <BeforeAfterSection />
            </React.Suspense>
          : null;

      case "howItWorks":
        return siteConfig.features.showHowItWorks
          ? <React.Suspense fallback={null} key="howItWorks"><HowItWorks /></React.Suspense>
          : null;

      case "jobCategories":
        return siteConfig.features.showJobCategories
          ? <React.Suspense fallback={null} key="jobCategories"><JobCategories /></React.Suspense>
          : null;

      case "employmentForm":
        return siteConfig.features.showEmploymentForm
          ? <React.Suspense fallback={null} key="employmentForm"><RegistrationWizard /></React.Suspense>
          : null;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-accent-light selection:text-zinc-950 transition-colors duration-300">

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {localeConfig.a11y.skipToContent}
      </a>

      {/*
       * LayoutGroup gives the splash and the hero a shared layout context
       * so a `<motion.img layoutId="hero-3d-object-primary">` inside the
       * splash and one inside the hero section connect: on splash exit,
       * the hero element animates *from* the splash's last rect — one
       * continuous travel instead of a splash fade plus a hero pop-in.
       *
       * This is opt-in at the variant level: only `impact-reveal-3d`
       * + a hero variant that mounts `<HeroObject3D layoutId=...>` will
       * actually trigger the transition. Everything else renders as
       * before — LayoutGroup is inert when no shared layoutIds exist.
       */}
      <LayoutGroup>
        {/* Splash screen */}
        <AnimatePresence onExitComplete={() => {
          splashSession.dismiss();
          // After the splash overlay finishes its exit animation and body overflow
          // is restored, force scroll to top. This prevents the browser from
          // restoring a stale scroll position once overflow: hidden is lifted.
          window.scrollTo(0, 0);
        }}>
          {showSplash && <SplashScreen />}
        </AnimatePresence>

        <Navbar
          onBookClick={handleBookNow}
          onPageChange={navigatePublic}
          currentPage={page}
          audienceMode={siteConfig.business.type === "employment" ? "worker" : undefined}
          onSwitchAudience={siteConfig.business.type === "employment" ? switchAudience : undefined}
        />

        <main id="main-content">
          {/* LandingBackdrop: hero + services share a sticky background */}
          {useLandingBackdrop && (
            <LandingBackdrop>
              <Hero onBookClick={handleBookNow} omitBackground />
              <Services onBookClick={handleBookNow} overFixedBackdrop onNavigateToServices={navigateToServicesPage} />
            </LandingBackdrop>
          )}

          {/* Remaining sections in theme-defined order */}
          {sectionOrder.map((id) => renderSection(id)).filter(Boolean).flatMap((node, i, arr) =>
            i < arr.length - 1
              ? [node, <SectionDivider key={`divider-${i}`} />]
              : [node]
          )}
        </main>

        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
          onBookClick={handleBookNow}
        />
        {shellCommon}
      </LayoutGroup>
    </div>
  );
}
