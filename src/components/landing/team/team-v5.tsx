/**
 * team-v5.tsx — MINIMAL AVATARS team variant.
 *
 * Ultra-restrained: centered section header above a single wrapping row of
 * circular avatars. Avatars sit grayscale and bloom to color on hover/focus
 * (300 ms filter + transform); the name + specialty caption fades in under
 * the hovered avatar. On touch devices (no hover) captions are always
 * visible. Clicking an avatar navigates to the staff profile when enabled.
 *
 * Avatars stay perfect circles by design — `.gs-image` is intentionally not
 * applied here.
 *
 * Selected via `sections.team.variant === "v5"` (see Team.tsx dispatcher).
 */
import React from "react";
import { motion } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { cn, handleImgError } from "../../../lib/utils";
import {
  Y_SM, VIEWPORT_ONCE, staggerTeam,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../lib/motion";

export function TeamV5({
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

  // object-top: a center crop on full-body staff photos puts the torso in
  // the small circle and cuts the head off — bias the crop to the top.
  const avatarImgClass =
    "h-full w-full object-cover object-top grayscale transition-[filter,scale] duration-300 ease-out group-hover:scale-[1.06] group-hover:grayscale-0 group-focus-within:scale-[1.06] group-focus-within:grayscale-0";

  const avatarFrameClass =
    "relative block h-24 w-24 overflow-hidden rounded-full bg-muted ring-1 ring-border transition-shadow duration-300 group-hover:ring-accent/40 group-focus-within:ring-accent/40 sm:h-28 sm:w-28";

  return (
    <section id="team" className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28">
      <div className="mx-auto w-full max-w-5xl">

        {/* ── Centered section header ─────────────────────────────────── */}
        <div className="mx-auto mb-12 max-w-xl text-center sm:mb-16">
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

        {/* ── Wrapping avatar row ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-center gap-x-[var(--gs-gap)] gap-y-10 sm:gap-x-10">
          {staff.map((member, index) => {
            const avatar = (
              <img
                src={member.photoUrl}
                alt={member.name}
                className={avatarImgClass}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={handleImgError}
              />
            );
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: staggerTeam(index), duration: dur, ease }}
                className="group flex w-28 flex-col items-center sm:w-32"
              >
                {linkToProfiles ? (
                  <motion.a
                    href={`/equipo/${encodeURIComponent(member.slug)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateToStaffProfile!(member.slug);
                    }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className={cn(
                      avatarFrameClass,
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                    )}
                    aria-label={`${localeConfig.team.viewProfile} — ${member.name}`}
                  >
                    {avatar}
                  </motion.a>
                ) : (
                  <span className={avatarFrameClass}>{avatar}</span>
                )}

                {/* Caption — fades in on hover/focus; always on for touch */}
                <div
                  className={cn(
                    "mt-3 translate-y-1 text-center opacity-0",
                    "transition-[translate,opacity] duration-300 ease-out",
                    "group-hover:translate-y-0 group-hover:opacity-100",
                    "group-focus-within:translate-y-0 group-focus-within:opacity-100",
                    "[@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
                  )}
                >
                  <p className="font-serif text-sm font-medium leading-snug text-foreground">
                    {member.name}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {member.specialty}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
