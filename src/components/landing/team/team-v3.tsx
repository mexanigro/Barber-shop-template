/**
 * team-v3.tsx — GRID WITH HOVER BIO team variant.
 *
 * Photo grid (2-col mobile, 3–4 at lg+). Hovering or keyboard-focusing a
 * card slides up a translucent panel with a bio excerpt, social icons and a
 * profile affordance (300 ms ease-out, transform/opacity only). Names and
 * specialties stay permanently visible under each photo.
 *
 * Touch devices (no hover): the overlay panel is suppressed and a condensed
 * bio strip + socials render in the static caption instead — a "first tap
 * reveals, second activates" pattern would swallow the profile navigation
 * tap and feel broken, so always-visible condensed copy is the cleaner path.
 *
 * Selected via `sections.team.variant === "v3"` (see Team.tsx dispatcher).
 */
import React from "react";
import { motion } from "motion/react";
import { Instagram, Facebook, ArrowUpRight } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { cn, handleImgError } from "../../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE, staggerTeam,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../lib/motion";

function SocialIcons({
  member,
  className,
  iconSize = 16,
}: {
  member: { name: string; social?: { instagram?: string; facebook?: string } };
  className?: string;
  iconSize?: number;
}) {
  if (!member.social?.instagram && !member.social?.facebook) return null;
  const linkClass =
    "inline-flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-full";
  return (
    <div className={cn("flex items-center", className)}>
      {member.social.instagram && (
        <a
          href={member.social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={linkClass}
          aria-label={`Instagram — ${member.name}`}
        >
          <Instagram size={iconSize} />
        </a>
      )}
      {member.social.facebook && (
        <a
          href={member.social.facebook}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={linkClass}
          aria-label={`Facebook — ${member.name}`}
        >
          <Facebook size={iconSize} />
        </a>
      )}
    </div>
  );
}

export function TeamV3({
  onBookClick: _onBookClick,
  onNavigateToStaffProfile,
}: {
  onBookClick: (serviceId?: string) => void;
  onNavigateToStaffProfile?: (slug: string) => void;
}) {
  const { sections, staff } = siteConfig;
  const sectionConfig = sections.team;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const linkToProfiles =
    siteConfig.features.enableStaffPages === true && !!onNavigateToStaffProfile;

  const fourCols = staff.length >= 4;

  return (
    <section id="team" className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28">
      <div className="mx-auto w-full max-w-7xl">

        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="mb-10 max-w-2xl sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
          >
            {sectionConfig.title}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-medium leading-tight tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.subtitle}
          </motion.h2>
          {sectionConfig.description && (
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.16 }}
              className="mt-4 text-sm leading-relaxed text-pretty text-muted-foreground"
            >
              {sectionConfig.description}
            </motion.p>
          )}
        </div>

        {/* ── Photo grid ──────────────────────────────────────────────── */}
        <div
          className={cn(
            "grid grid-cols-2 gap-[var(--gs-gap)] lg:grid-cols-3",
            fourCols && "xl:grid-cols-4",
          )}
        >
          {staff.map((member, index) => (
            <motion.article
              key={member.id}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: staggerTeam(index), duration: dur, ease }}
              className="group relative"
            >
              {/* Invisible full-card link for profile navigation */}
              {linkToProfiles && (
                <a
                  href={`/equipo/${encodeURIComponent(member.slug)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateToStaffProfile!(member.slug);
                  }}
                  className="absolute inset-0 z-10 rounded-[var(--gs-image-radius)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
                  aria-label={`${localeConfig.team.viewProfile} — ${member.name}`}
                />
              )}

              {/* Portrait + slide-up panel (hover-capable devices) — pulse underlay
                  reads as a skeleton until the lazy image paints over it */}
              <div className="gs-image relative aspect-[3/4] overflow-hidden bg-muted">
                <div className="absolute inset-0 animate-pulse bg-foreground/5" aria-hidden />
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="relative h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                  draggable={false}
                />

                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden translate-y-full bg-card/95 p-4 opacity-0 backdrop-blur-sm",
                    "transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    "group-hover:translate-y-0 group-hover:opacity-100",
                    "group-focus-within:translate-y-0 group-focus-within:opacity-100",
                    "[@media(hover:hover)]:block",
                  )}
                >
                  <p className="text-xs leading-relaxed text-pretty text-muted-foreground line-clamp-3">
                    {member.bio}
                  </p>
                  <div className="mt-2 flex min-h-6 items-center justify-between gap-2">
                    <SocialIcons member={member} className="pointer-events-auto -ms-2.5 gap-0.5" />
                    {linkToProfiles && (
                      <span className="ms-auto inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-accent-light">
                        {localeConfig.team.viewProfile}
                        <ArrowUpRight size={12} className="rtl:-scale-x-100" aria-hidden />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Caption — always visible */}
              <div className="pt-3">
                <h3 className="font-serif text-base font-medium leading-snug text-foreground transition-colors duration-300 group-hover:text-accent-light sm:text-lg">
                  {member.name}
                </h3>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {member.specialty}
                </p>

                {/* Touch devices: condensed bio strip + socials, always visible */}
                <div className="[@media(hover:hover)]:hidden">
                  <p className="mt-2 text-xs leading-relaxed text-pretty text-muted-foreground line-clamp-2">
                    {member.bio}
                  </p>
                  <SocialIcons
                    member={member}
                    className="relative z-20 -ms-2.5 mt-1 gap-1 [&>a]:h-11 [&>a]:w-11"
                    iconSize={17}
                  />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
