/**
 * team/estetica/team-v3.tsx — ARCH PORTRAIT GRID (estética).
 *
 * Gallery-of-specialists: arch-cropped portraits in a centered grid, serif
 * name and italic specialty beneath, a soft veil with "view profile" rising
 * on hover. The arch repetition gives the team a chapel-like rhythm — calm,
 * feminine, reverent toward the practitioners.
 *
 * Selected when `sections.team.variant === "v3"` and niche is estética.
 */
import React from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { cn, handleImgError } from "../../../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";

export function EsteticaTeamV3({
  onBookClick: _onBookClick,
  onNavigateToStaffProfile,
}: {
  onBookClick: () => void;
  onNavigateToStaffProfile?: (slug: string) => void;
}) {
  const sectionConfig = siteConfig.sections.team;
  const staff = siteConfig.staff;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const cols = staff.length >= 4 ? "lg:grid-cols-4" : staff.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <section id="team" className="bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-32 dark:bg-secondary/20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Centered header ────────────────────────────────────────── */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 bg-accent/50" aria-hidden />
            {sectionConfig.subtitle}
            <span className="h-px w-7 bg-accent/50" aria-hidden />
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.title}
          </motion.h2>
          {sectionConfig.description && (
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.15 }}
              className="mx-auto mt-4 max-w-xl text-pretty text-sm font-light leading-relaxed text-muted-foreground sm:text-[15px]"
            >
              {sectionConfig.description}
            </motion.p>
          )}
        </div>

        {/* ── Arch portrait grid ─────────────────────────────────────── */}
        <div className={cn("mx-auto grid max-w-5xl grid-cols-2 gap-x-[var(--gs-gap)] gap-y-10", cols)}>
          {staff.map((member, index) => {
            const interactive = Boolean(onNavigateToStaffProfile);
            const Tile = interactive ? motion.button : motion.div;
            return (
              <Tile
                key={member.id}
                {...(interactive ? { type: "button" as const, onClick: () => onNavigateToStaffProfile?.(member.slug) } : {})}
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: Math.min(index * 0.08, 0.32) }}
                className="group flex min-w-0 flex-col items-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <span className="relative block w-full overflow-hidden rounded-t-[7rem] rounded-b-[0.5rem] sm:rounded-t-[9rem]">
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.045]"
                  />
                  {interactive && (
                    <span
                      className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-center gap-1.5 bg-gradient-to-t from-black/55 to-transparent pb-4 pt-10 text-[11px] font-medium uppercase tracking-[0.18em] text-white opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                      aria-hidden
                    >
                      {localeConfig.team.viewProfile}
                      <ArrowUpRight size={12} className="rtl:-scale-x-100" />
                    </span>
                  )}
                </span>
                <span className="mt-4 font-serif text-lg leading-tight text-foreground transition-colors duration-300 group-hover:text-accent sm:text-xl">
                  {member.name}
                </span>
                <span className="mt-1 font-serif text-sm italic text-accent-light">
                  {member.specialty}
                </span>
              </Tile>
            );
          })}
        </div>
      </div>
    </section>
  );
}
