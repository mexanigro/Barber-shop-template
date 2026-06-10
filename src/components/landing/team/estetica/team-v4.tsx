/**
 * team/estetica/team-v4.tsx — CREDENTIAL INDEX (estética).
 *
 * Editorial directory: hairline-divided rows (oversized serif name, italic
 * specialty, circular cameo at the row end) beside a sticky portrait that
 * crossfades with the hovered/focused row. Reads like the masthead of a
 * medical journal — authority through typography, not cards.
 *
 * Selected when `sections.team.variant === "v4"` and niche is estética.
 */
import React from "react";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { cn, handleImgError } from "../../../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

export function EsteticaTeamV4({
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

  const [active, setActive] = React.useState(0);
  const current = staff[active] ?? staff[0];

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

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">

          {/* ── Index rows ───────────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-7">
            <ul className="divide-y divide-border border-y border-border">
              {staff.map((member, index) => {
                const interactive = Boolean(onNavigateToStaffProfile);
                const Row = interactive ? "button" : "div";
                return (
                  <motion.li
                    key={member.id}
                    initial={{ opacity: 0, y: Y_SM }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: dur, ease, delay: Math.min(index * 0.07, 0.3) }}
                  >
                    <Row
                      {...(interactive ? { type: "button" as const, onClick: () => onNavigateToStaffProfile?.(member.slug) } : {})}
                      onMouseEnter={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      className={cn(
                        "group flex w-full min-h-[88px] items-center gap-5 py-5 text-start sm:gap-7 sm:py-6",
                        interactive && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                      )}
                    >
                      <span className="hidden font-serif text-sm tabular-nums text-accent-light sm:block" aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-full ring-1 ring-border lg:hidden">
                        <img
                          src={member.photoUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={handleImgError}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn(
                          "block truncate font-serif text-2xl font-light leading-tight transition-colors duration-300 sm:text-3xl",
                          index === active ? "text-accent" : "text-foreground group-hover:text-accent",
                        )}>
                          {member.name}
                        </span>
                        <span className="mt-1 block truncate font-serif text-sm italic text-muted-foreground sm:text-base">
                          {member.specialty}
                        </span>
                      </span>
                      {interactive && (
                        <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-300 group-hover:text-accent sm:flex" aria-hidden>
                          {localeConfig.team.viewProfile}
                          <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                        </span>
                      )}
                    </Row>
                  </motion.li>
                );
              })}
            </ul>
          </div>

          {/* ── Sticky crossfading portrait (lg+) ────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 1.2, ease }}
            className="sticky top-28 hidden min-w-0 lg:col-span-5 lg:block"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[10rem] rounded-b-[0.5rem]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.img
                  key={current?.id ?? active}
                  src={current?.photoUrl}
                  alt={current?.name ?? ""}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_STRONG }}
                  onError={handleImgError}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="line-clamp-3 max-w-sm text-[13px] font-light leading-relaxed text-white/90">
                  {current?.bio}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
