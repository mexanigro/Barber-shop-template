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
import { GalleryPage } from "./components/gallery/GalleryPage";
import { PolicyModal } from "./components/shared/PolicyModal";
import { Chatbot } from "./components/chat/Chatbot";

type PolicyType = "privacy" | "terms" | "cancellation";

import { siteConfig } from "./config/site";
import { useSEO } from "./hooks/useSEO";

export default function App() {
  useSEO();

  const [showBooking, setShowBooking] = React.useState(false);
  const [page, setPage] = React.useState<"landing" | "admin" | "gallery">("landing");
  const [activePolicy, setActivePolicy] = React.useState<PolicyType | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking_status")) {
      setShowBooking(true);
    }
  }, []);

  React.useEffect(() => {
    const hash = window.location.hash;
    if (page === "landing" && hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
    document.title = siteConfig.brand.name;
  }, [page]);

  const handleBookNow = () => {
    if (siteConfig.features.showBooking) {
      setShowBooking(true);
    }
  };

  if (page === "admin") {
    return <AdminDashboard onExit={() => setPage("landing")} />;
  }

  if (page === "gallery" && siteConfig.features.showGallery) {
    return (
      <div className="min-h-screen transition-colors duration-300">
        <Navbar onBookClick={handleBookNow} onPageChange={setPage} currentPage={page} />
        <GalleryPage onBack={() => setPage("landing")} />
        <Footer onAdminClick={() => setPage("admin")} onPolicyClick={setActivePolicy} onPageChange={setPage} />
        <ScrollToTop />
        <Chatbot />
        <AnimatePresence>
          {showBooking && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md transition-colors"
                 onClick={() => setShowBooking(false)}
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="relative bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] p-6 md:p-10 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white shadow-2xl transition-colors"
               >
                  <BookingWizard onClose={() => setShowBooking(false)} />
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-accent-light selection:text-zinc-950 font-sans transition-colors duration-300">
      <Navbar onBookClick={handleBookNow} onPageChange={setPage} currentPage={page} />
      
      <main>
        <Hero onBookClick={handleBookNow} />
        {siteConfig.features.showServices && <Services onBookClick={handleBookNow} />}
        {siteConfig.features.showWhyChooseUs && <WhyChooseUs />}
        {siteConfig.features.showTeam && <Team onBookClick={handleBookNow} />}
        {siteConfig.features.showGallery && <Gallery onViewFull={() => setPage("gallery")} />}
        {siteConfig.features.showTestimonials && <Testimonials />}
        {siteConfig.features.showInquiry && <QuickInquiry />}
        {siteConfig.features.showLocation && <Location />}
      </main>

      <Footer onAdminClick={() => setPage("admin")} onPolicyClick={setActivePolicy} onPageChange={setPage} />
      <ScrollToTop />
      <Chatbot />

      {/* Booking Modal */}
      <AnimatePresence>
        {siteConfig.features.showBooking && showBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md transition-colors"
               onClick={() => setShowBooking(false)}
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] p-6 md:p-10 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-white shadow-2xl transition-colors"
             >
                <BookingWizard onClose={() => setShowBooking(false)} />
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Policy Modal */}
      <AnimatePresence>
        {activePolicy && (
          <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}


