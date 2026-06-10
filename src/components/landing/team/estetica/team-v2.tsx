/**
 * team/estetica/team-v2.tsx — PRACTITIONER SPOTLIGHT (estética).
 *
 * The lead specialist takes an editorial spread: arch portrait facing serif
 * name, specialty, bio, qualification hairlines and the booking CTA. The
 * rest of the team follows as a quiet row of circular cameos. Communicates
 * "you are in expert hands" before anything else.
 *
 * Selected when `sections.team.variant === "v2"` and niche is estética.
 */
import React from "react";
import { ArrowRight, Calendar, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { handleImgError } from "../../../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../../lib/motion";

export function EsteticaTeamV2({
  onBookClick,
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

  const [lead, ...others] = staff;
  if (!lead) return null;

  const qualifications = (lead.qualifications ?? []).slice(0, 3);

  return (
    <section id="team" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 max-w-2xl sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 shrink-0 bg-accent/50" aria-hidden />
            {sectionConfig.subtitle}
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
        </div>

        {/* ── Lead specialist spread ─────────────────────────────────── */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 1.2, ease }}
            className="relative mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-none"
          >
            <div className="absolute -inset-x-3 -top-5 bottom-5 rounded-t-[11rem] border border-accent/25 sm:rounded-t-[14rem]" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[11rem] rounded-b-[0.5rem] sm:rounded-t-[14rem]">
              <img
                src={lead.photoUrl}
                alt={lead.name}
                loading="lazy"
                decoding="async"
                onError={handleImgError}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>

          <div className="min-w-0 lg:col-span-7">
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.1 }}
              className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-accent-light"
            >
              <ShieldCheck size={14} aria-hidden />
              {localeConfig.team.verifiedBadge}
            </motion.p>
            <motion.h3
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.15 }}
              className="font-serif text-3xl font-light leading-tight text-foreground sm:text-4xl"
            >
              {lead.name}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.2 }}
              className="mt-1.5 font-serif text-lg italic text-accent"
            >
              {lead.specialty}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.25 }}
              className="mt-5 max-w-xl text-[15px] font-light leading-relaxed text-muted-foreground"
            >
              {lead.bio}
            </motion.p>

            {qualifications.length > 0 && (
              <motion.ul
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: 0.3 }}
                className="mt-6 divide-y divide-border border-y border-border"
              >
                {qualifications.map((q, i) => (
                  <li key={i} className="flex items-center gap-3 py-3 text-sm font-light text-foreground/85">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    {q}
                  </li>
                ))}
              </motion.ul>
            )}

            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.35 }}
              className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7"
            >
              <motion.button
                type="button"
                onClick={onBookClick}
                whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-elevated hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.35s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <Calendar size={16} aria-hidden />
                {siteConfig.hero.ctaPrimary}
              </motion.button>
              {onNavigateToStaffProfile && (
                <motion.button
                  type="button"
                  onClick={() => onNavigateToStaffProfile(lead.slug)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                  className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent underline-offset-8 hover:text-accent-light hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  {localeConfig.team.viewProfile}
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
                </motion.button>
              )}
            </motion.div>
          </div>
        </div>

        {/* ── Supporting team cameos ─────────────────────────────────── */}
        {others.length > 0 && (
          <div className="mt-14 border-t border-border pt-10 sm:mt-20 sm:pt-12">
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-8 sm:gap-x-14">
              {others.map((member, i) => {
                const interactive = Boolean(onNavigateToStaffProfile);
                const Cameo = interactive ? motion.button : motion.div;
                return (
                  <Cameo
                    key={member.id}
                    {...(interactive ? { type: "button" as const, onClick: () => onNavigateToStaffProfile?.(member.slug) } : {})}
                    initial={{ opacity: 0, y: Y_SM }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: dur, ease, delay: Math.min(i * 0.08, 0.32) }}
                    className="group flex w-32 flex-col items-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:w-36"
                  >
                    <span className="relative block h-24 w-24 overflow-hidden rounded-full ring-1 ring-border transition-shadow duration-300 group-hover:ring-accent/50 sm:h-28 sm:w-28">
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        loading="lazy"
                        decoding="async"
                        onError={handleImgError}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.06]"
                      />
                    </span>
                    <span className="mt-3 font-serif text-base leading-tight text-foreground transition-colors duration-300 group-hover:text-accent">
                      {member.name}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {member.specialty}
                    </span>
                  </Cameo>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
