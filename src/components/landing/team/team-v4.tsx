/**
 * team-v4.tsx — FEATURED + LIST team variant.
 *
 * The first staff member (`staff[0]`) becomes a large editorial feature:
 * big portrait, display-serif name, specialty kicker, full bio, socials and
 * both CTAs. Remaining members render as a refined compact list beside it
 * (small round avatar, name, specialty, chevron to profile). With a single
 * member only the feature renders, centered.
 *
 * Selected via `sections.team.variant === "v4"` (see Team.tsx dispatcher).
 */
import React from "react";
import { motion } from "motion/react";
import { Instagram, Facebook, Calendar, ChevronRight, ArrowUpRight } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { cn, handleImgError } from "../../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE, staggerTeam,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  nicheScaleIn, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../lib/motion";

export function TeamV4({
  onBookClick,
  onNavigateToStaffProfile,
}: {
  onBookClick: (serviceId?: string) => void;
  onNavigateToStaffProfile?: (slug: string) => void;
}) {
  const { sections, staff, features } = siteConfig;
  const sectionConfig = sections.team;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const linkToProfiles =
    siteConfig.features.enableStaffPages === true && !!onNavigateToStaffProfile;

  const featured = staff[0];
  const rest = staff.slice(1);
  const hasList = rest.length > 0;

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
            className="font-serif text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.subtitle}
          </motion.h2>
          {sectionConfig.description && (
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.16 }}
              className="mt-4 text-sm leading-relaxed text-muted-foreground"
            >
              {sectionConfig.description}
            </motion.p>
          )}
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-[var(--gs-gap)] lg:items-start lg:gap-12",
            hasList ? "lg:grid-cols-12" : "lg:mx-auto lg:max-w-5xl lg:grid-cols-2",
          )}
        >
          {/* ── Editorial feature: staff[0] ────────────────────────────── */}
          <motion.div
            {...nicheScaleIn(niche)}
            className={cn(hasList && "lg:col-span-5")}
          >
            <div className="gs-image relative aspect-[3/4] overflow-hidden bg-muted">
              <img
                src={featured.photoUrl}
                alt={featured.name}
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={handleImgError}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.12 }}
            className={cn(hasList && "lg:col-span-4")}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-light">
              {featured.specialty}
            </p>
            <h3 className="font-serif text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
              {featured.name}
            </h3>
            <div className="mt-5 h-px w-12 bg-border" aria-hidden />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {featured.bio}
            </p>

            {/* Socials */}
            {(featured.social?.instagram || featured.social?.facebook) && (
              <div className="-ms-2.5 mt-5 flex items-center gap-1">
                {featured.social.instagram && (
                  <a
                    href={featured.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-300 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    aria-label={`Instagram — ${featured.name}`}
                  >
                    <Instagram size={18} />
                  </a>
                )}
                {featured.social.facebook && (
                  <a
                    href={featured.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-300 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    aria-label={`Facebook — ${featured.name}`}
                  >
                    <Facebook size={18} />
                  </a>
                )}
              </div>
            )}

            {/* CTA pair */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {features.showBooking && (
                <motion.button
                  type="button"
                  onClick={() => onBookClick()}
                  whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                  whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                  transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--gs-btn-radius)] bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground transition-colors duration-300 hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <Calendar size={14} className="shrink-0" />
                  {localeConfig.buttons.bookNow}
                </motion.button>
              )}
              {linkToProfiles && (
                <a
                  href={`/equipo/${encodeURIComponent(featured.slug)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateToStaffProfile!(featured.slug);
                  }}
                  className="group inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-foreground transition-colors duration-300 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {localeConfig.team.viewProfile}
                  <ArrowUpRight
                    size={14}
                    className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </a>
              )}
            </div>
          </motion.div>

          {/* ── Compact list: remaining members ────────────────────────── */}
          {hasList && (
            <div className="lg:col-span-3">
              <ul className="divide-y divide-border border-y border-border">
                {rest.map((member, index) => {
                  const rowInner = (
                    <>
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={handleImgError}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-base font-medium text-foreground transition-colors duration-300 group-hover:text-accent-light">
                          {member.name}
                        </span>
                        {/* line-clamp-2 (not truncate): the side list column is
                            narrow and a single-line cut like "BEARD ARTISTRY &
                            GROOMI…" reads as a bug when space exists below. */}
                        <span className="block text-[11px] font-semibold uppercase leading-snug tracking-[0.16em] text-muted-foreground line-clamp-2">
                          {member.specialty}
                        </span>
                      </span>
                      {linkToProfiles && (
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-accent-light rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                          aria-hidden
                        />
                      )}
                    </>
                  );
                  return (
                    <motion.li
                      key={member.id}
                      initial={{ opacity: 0, y: Y_SM }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={VIEWPORT_ONCE}
                      transition={{ delay: staggerTeam(index), duration: dur, ease }}
                    >
                      {linkToProfiles ? (
                        <a
                          href={`/equipo/${encodeURIComponent(member.slug)}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigateToStaffProfile!(member.slug);
                          }}
                          className="group flex min-h-[60px] items-center gap-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
                          aria-label={`${localeConfig.team.viewProfile} — ${member.name}`}
                        >
                          {rowInner}
                        </a>
                      ) : (
                        <div className="group flex min-h-[60px] items-center gap-4 py-3">
                          {rowInner}
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
