import React from "react";
import * as Icons from "lucide-react";
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from "lucide-react";
import { siteConfig } from "../../config/site";
import { LEGAL_ROUTES, type LegalDocKind } from "../../config/legalContent";
import type { PublicShellPage } from "../../types";
import { useAdminAccess } from "../../hooks/useAdminAccess";

export function Footer({ 
  onAdminClick, 
  onLegalNavigate,
  onPageChange
}: { 
  onAdminClick: () => void, 
  onLegalNavigate: (policy: LegalDocKind) => void,
  onPageChange: (page: PublicShellPage) => void
}) {
  const { contact, hours, brand } = siteConfig;
  const { user, loading: authLoading, isAdmin } = useAdminAccess();
  /** Owner entry: show before login; hide when a non-admin is signed in (bunker stays hidden). */
  const showAdminNavLink = !authLoading && (!user || isAdmin);
  const BrandIcon = (Icons as any)[brand.logoIconName || "Scissors"] || Icons.Scissors;

  return (
    <footer className="border-t border-border bg-muted py-20 px-6 transition-colors duration-300 dark:bg-background">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-light rounded flex items-center justify-center">
              <BrandIcon className="text-zinc-950" size={18} />
            </div>
            <button 
              className="text-xl font-bold uppercase tracking-tighter text-foreground transition-colors duration-300 hover:text-accent-light"
              onClick={() => onPageChange("landing")}
            >
              {brand.name}
            </button>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground transition-colors duration-300">
            {brand.tagline}
          </p>
          <div className="flex gap-4">
            {contact.social.instagram && (
              <a href={contact.social.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors duration-300 hover:text-accent-light">
                <Instagram size={18} />
              </a>
            )}
            {contact.social.facebook && (
              <a href={contact.social.facebook} target="_blank" rel="noopener noreferrer" className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors duration-300 hover:text-accent-light">
                <Facebook size={18} />
              </a>
            )}
            {contact.social.twitter && (
              <a href={contact.social.twitter} target="_blank" rel="noopener noreferrer" className="rounded-full bg-secondary p-2 text-muted-foreground transition-colors duration-300 hover:text-accent-light">
                <Twitter size={18} />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-6 text-sm font-bold uppercase tracking-widest text-foreground">Explore</h4>
          <ul className="space-y-4 text-sm text-muted-foreground transition-colors duration-300">
            {siteConfig.features.showServices && (
              <li><button onClick={() => onPageChange("landing")} className="hover:text-accent-light transition-colors cursor-pointer">Our Services</button></li>
            )}
            {siteConfig.features.showTeam && (
              <li><button onClick={() => onPageChange("landing")} className="hover:text-accent-light transition-colors cursor-pointer">The Team</button></li>
            )}
            {siteConfig.features.showWhyChooseUs && (
              <li><button onClick={() => onPageChange("landing")} className="hover:text-accent-light transition-colors cursor-pointer">Why Choose Us</button></li>
            )}
            {siteConfig.features.showGallery && (
              <li><button onClick={() => onPageChange("gallery")} className="hover:text-accent-light transition-colors cursor-pointer">Portfolio</button></li>
            )}
            {siteConfig.features.showTestimonials && (
              <li><button onClick={() => onPageChange("landing")} className="hover:text-accent-light transition-colors cursor-pointer">Testimonials</button></li>
            )}
            {siteConfig.features.showInquiry && (
              <li><button onClick={() => onPageChange("landing")} className="hover:text-accent-light transition-colors cursor-pointer">Contact</button></li>
            )}
            {siteConfig.features.showLocation && (
              <li><button onClick={() => onPageChange("landing")} className="hover:text-accent-light transition-colors cursor-pointer">Location</button></li>
            )}
          </ul>
        </div>
      </div>
      
      <div className="mx-auto mt-20 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-border pt-8 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-300 md:flex-row">
        <p>© 2026 {brand.name}. All Rights Reserved.</p>
        <div className="flex flex-wrap justify-center gap-6">
          <a
            href={LEGAL_ROUTES.privacy}
            onClick={(e) => {
              e.preventDefault();
              onLegalNavigate("privacy");
            }}
            className="cursor-pointer transition-colors hover:text-accent-light"
          >
            Política de Privacidad
          </a>
          <a
            href={LEGAL_ROUTES.terms}
            onClick={(e) => {
              e.preventDefault();
              onLegalNavigate("terms");
            }}
            className="cursor-pointer transition-colors hover:text-accent-light"
          >
            Términos y Condiciones
          </a>
          <a
            href={LEGAL_ROUTES.cancellation}
            onClick={(e) => {
              e.preventDefault();
              onLegalNavigate("cancellation");
            }}
            className="cursor-pointer transition-colors hover:text-accent-light"
          >
            Política de Cancelación
          </a>
          {showAdminNavLink ? (
            <button
              type="button"
              onClick={onAdminClick}
              className="cursor-pointer hover:text-accent-light transition-colors"
            >
              Admin Panel
            </button>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
