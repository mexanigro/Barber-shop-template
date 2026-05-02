/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { localeConfig } from "./config/locale";
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
import { Gallery } from "./components/landing/Gallery";
import { QuickInquiry } from "./components/landing/QuickInquiry";
import { ScrollToTop } from "./components/layout/ScrollToTop";

import { LandingBackdrop } from "./components/landing/LandingBackdrop";
import { SplashScreen } from "./components/layout/SplashScreen";
import { splashSession } from "./lib/splash-session";
import { siteConfig } from "./config/site";
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
  useSEO();
  useSchema();

  // initialRoute must be declared FIRST - used by showSplash initialiser below.
  const initialRoute =
    typeof window !== "undefined"
      ? parsePublicRoute(window.location.pathname)
      : { page: "landing" as PublicShellPage };

  // Splash: shown once per hard load, only when the initial URL is the landing page.
  const [showSplash, setShowSplash] = React.useState(
    siteConfig.splash.enabled &&
    initialRoute.page === "landing" &&
    !splashSession.dismissed,
  );

  React.useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => setShowSplash(false), siteConfig.splash.durationMs);
    return () => clearTimeout(t);
  }, [showSplash]);

  const [showBooking, setShowBooking] = React.useState(false);
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
      const r = parsePublicRoute(window.location.pathname);
      setPage(r.page);
      setStaffSlug(r.page === "staff-profile" ? r.staffSlug : undefined);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  React.useEffect(() => {
    window.scrollTo(0, 0);

    const isLegal =
      page === "privacy" || page === "terms" || page === "cancellation";
    const isStaffProfile = page === "staff-profile";
    if (!isLegal && !isStaffProfile) {
      document.title = siteConfig.brand.name;
    }

    const hash = window.location.hash;
    if (page === "landing" && hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [page]);

  const handleBookNow = () => {
    if (siteConfig.features.showBooking) {
      setShowBooking(true);
    }
  };

  const closeBooking = useCallback(() => setShowBooking(false), []);
  const bookingRef = useModalA11y(showBooking, closeBooking);

  const navigatePublic = React.useCallback((target: PublicShellPage) => {
    if (target === "privacy" || target === "terms" || target === "cancellation") {
      window.history.pushState({}, "", legalKindToPath(target));
      setPage(target);
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

  if (page === "admin") {
    return (
      <Suspense fallback={<RouteLoader />}>
        <ProtectedRoute onExit={() => setPage("landing")}>
          <AdminDashboard onExit={() => setPage("landing")} />
        </ProtectedRoute>
      </Suspense>
    );
  }

  const shellCommon = (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteLoader />}>
        <Chatbot />
      </Suspense>
      <AnimatePresence>
        {siteConfig.features.showBooking && showBooking && (
          <div
            ref={bookingRef}
            role="dialog"
            aria-modal="true"
            aria-label={localeConfig.buttons.bookAppointment}
            tabIndex={-1}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 outline-none"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR_OVERLAY }}
              className="absolute inset-0 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:bg-black/80"
              onClick={closeBooking}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: DUR_MODAL_ENTER }}
              className="relative w-full max-w-2xl rounded-3xl border border-border bg-card/95 p-6 text-card-foreground shadow-elevated backdrop-blur-md transition-colors duration-300 md:p-8 dark:bg-card/90"
            >
              {/* fallback={null} intencional: el backdrop del overlay ya provee feedback visual
                  mientras el chunk de BookingWizard carga. Un RouteLoader aqui causaria doble spinner. */}
              <Suspense fallback={null}>
                <BookingWizard onClose={closeBooking} />
              </Suspense>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  const isLegalPage =
    page === "privacy" || page === "terms" || page === "cancellation";

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

  // Determine whether we use the shared sticky backdrop.
  // Both Hero and Services must be enabled for the backdrop to activate.
  const useLandingBackdrop =
    siteConfig.features.showHero && siteConfig.features.showServices;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-accent-light selection:text-zinc-950 transition-colors duration-300">

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {localeConfig.a11y.skipToContent}
      </a>

      {/* Splash screen */}
      <AnimatePresence onExitComplete={() => splashSession.dismiss()}>
        {showSplash && <SplashScreen />}
      </AnimatePresence>

      <Navbar
        onBookClick={handleBookNow}
        onPageChange={navigatePublic}
        currentPage={page}
      />

      <main id="main-content">
        {/* Hero + Services wrapped in a shared sticky backdrop when both enabled */}
        {useLandingBackdrop ? (
          <LandingBackdrop>
            <Hero onBookClick={handleBookNow} omitBackground />
            <Services onBookClick={handleBookNow} overFixedBackdrop />
          </LandingBackdrop>
        ) : (
          <>
            {siteConfig.features.showHero && <Hero onBookClick={handleBookNow} />}
            {siteConfig.features.showServices && <Services onBookClick={handleBookNow} />}
          </>
        )}
        {siteConfig.features.showWhyChooseUs && <WhyChooseUs />}
        {siteConfig.features.showTeam && (
          <Team
            onBookClick={handleBookNow}
            onNavigateToStaffProfile={
              siteConfig.features.enableStaffPages
                ? navigateToStaffProfile
                : undefined
            }
          />
        )}
        {siteConfig.features.showGallery && (
          <Gallery onViewFull={() => navigatePublic("gallery")} />
        )}
        {siteConfig.features.showTestimonials && <Testimonials />}
        {siteConfig.features.showInquiry && <QuickInquiry />}
        {siteConfig.features.showLocation && <BusinessHours />}
        {siteConfig.features.showLocation && <Location />}
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
