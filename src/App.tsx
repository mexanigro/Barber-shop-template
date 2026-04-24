/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
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

  // initialRoute must be declared FIRST — used by showSplash initialiser below.
  const initialRoute =
    typeof window !== "undefined"
      ? parsePublicRoute(window.location.pathname)
      : { page: "landing" as PublicShellPage };

  // ── Splash ────────────────────────────────────────────────────────────────
  // Shown once per hard load, only when the initial URL is the landing page.
  // splashSession.dismissed is false on first load and becomes true after the
  // exit animation completes, so SPA navigation back to home never replays it.
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
      <Suspense fallback={null}>
        <ProtectedRoute onExit={() => setPage("landing")}>
          <AdminDashboard onExit={() => setPage("landing")} />
        </ProtectedRoute>
      </Suspense>
    );
  }

  const shellCommon = (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
        <Chatbot />
      </Suspense>
      <AnimatePresence>
        {siteConfig.features.showBooking && showBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:bg-black/80"
              onClick={() => setShowBooking(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl rounded-3xl border border-border bg-card/95 p-6 text-card-foreground shadow-elevated backdrop-blur-md transition-colors duration-300 md:p-8 dark:bg-card/90"
            >
              <Suspense fallback={null}>
                <BookingWizard onClose={() => setShowBooking(false)} />
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
        <main>
          <Suspense fallback={null}>
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
        <Suspense fallback={null}>
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
        <main>
          <Suspense fallback={null}>
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

  // ── Determine whether we use the shared sticky backdrop ──────────────────
  // Both Hero and Services must be enabled for the backdrop to activate.
  const useLandingBackdrop =
    siteConfig.features.showHero && siteConfig.features.showServices;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-accent-light selection:text-zinc-950 transition-colors duration-300">

      {/* ── Splash screen ─────────────────────────────────────────────────── */}
      <AnimatePresence onExitComplete={() => splashSession.dismiss()}>
        {showSplash && <SplashScreen />}
      </AnimatePresence>

      <Navbar
        onBookClick={handleBookNow}
        onPageChange={navigatePublic}
        currentPage={page}
      />

      <main>
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
