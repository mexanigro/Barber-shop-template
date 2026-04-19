/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { Hero } from "./components/landing/Hero";
import { Services } from "./components/landing/Services";
import { Team } from "./components/landing/Team";
import { WhyChooseUs } from "./components/landing/WhyChooseUs";
import { Testimonials } from "./components/landing/Testimonials";
import { Location } from "./components/landing/Location";
import { Gallery } from "./components/landing/Gallery";
import { QuickInquiry } from "./components/landing/QuickInquiry";
import { ScrollToTop } from "./components/layout/ScrollToTop";

import { BookingWizard } from "./components/booking/BookingWizard";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import { GalleryPage } from "./components/gallery/GalleryPage";
import { Chatbot } from "./components/chat/Chatbot";
import { LegalPage } from "./components/legal/LegalPage";
import { StaffProfilePage } from "./components/staff/StaffProfilePage";

import { siteConfig } from "./config/site";
import { useSEO } from "./hooks/useSEO";
import type { LegalDocKind } from "./config/legalContent";
import type { PublicShellPage } from "./types";

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

  const [showBooking, setShowBooking] = React.useState(false);
  const initialRoute =
    typeof window !== "undefined"
      ? parsePublicRoute(window.location.pathname)
      : { page: "landing" as PublicShellPage };
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
      <ProtectedRoute onExit={() => setPage("landing")}>
        <AdminDashboard onExit={() => setPage("landing")} />
      </ProtectedRoute>
    );
  }

  const shellCommon = (
    <>
      <ScrollToTop />
      <Chatbot />
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
              className="relative w-full max-w-lg rounded-3xl border border-border bg-card/95 p-6 text-card-foreground shadow-elevated backdrop-blur-md transition-colors duration-300 md:p-10 dark:bg-card/90"
            >
              <BookingWizard onClose={() => setShowBooking(false)} />
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
          <StaffProfilePage
            slug={staffSlug ?? ""}
            onBackHome={handleHomeFromStaffProfile}
          />
        </main>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
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
        <GalleryPage onBack={() => navigatePublic("landing")} />
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
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
          <LegalPage kind={page} onBackHome={handleHomeFromLegal} />
        </main>
        <Footer
          onAdminClick={() => setPage("admin")}
          onLegalNavigate={navigateToLegal}
          onPageChange={navigatePublic}
        />
        {shellCommon}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-accent-light selection:text-zinc-950 transition-colors duration-300">
      <Navbar
        onBookClick={handleBookNow}
        onPageChange={navigatePublic}
        currentPage={page}
      />

      <main>
        {siteConfig.features.showHero && <Hero onBookClick={handleBookNow} />}
        {siteConfig.features.showServices && (
          <Services onBookClick={handleBookNow} />
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
        {siteConfig.features.showLocation && <Location />}
      </main>

      <Footer
        onAdminClick={() => setPage("admin")}
        onLegalNavigate={navigateToLegal}
        onPageChange={navigatePublic}
      />
      {shellCommon}
    </div>
  );
}
