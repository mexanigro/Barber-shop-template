/**
 * team/estetica/team-v5.tsx — INTIMATE CAROUSEL (estética).
 *
 * One specialist at a time: centered arch portrait, serif name, italic
 * specialty and a personal philosophy/bio excerpt set like a pull-quote.
 * Arrows and dots advance the roster with a calm crossfade. The slowest,
 * most personal of the estética team variants — a meeting, not a roster.
 *
 * Selected when `sections.team.variant === "v5"` and niche is estética.
 */
import React from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { cn, handleImgError } from "../../../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { prev: string; next: string; goTo: string }> = {
  en: { prev: "Previous specialist", next: "Next specialist", goTo: "Show specialist {n}" },
  he: { prev: "מומחית קודמת", next: "מומחית הבאה", goTo: "הצג מומחית {n}" },
  ru: { prev: "Предыдущий специалист", next: "Следующий специалист", goTo: "Показать специалиста {n}" },
  ar: { prev: "الأخصائية السابقة", next: "الأخصائية التالية", goTo: "عرض الأخصائية {n}" },
};

export function EsteticaTeamV5({
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
  const S = STRINGS[localeConfig.lang] ?? STRINGS.en;

  const [active, setActive] = React.useState(0);
  const go = (delta: 1 | -1) => setActive((p) => (p + delta + staff.length) % staff.length);
  const current = staff[active];
  if (!current) return null;

  const excerpt = current.philosophy || current.bio;

  const arrowClass = cn(
    "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground",
    "transition-colors duration-200 hover:border-accent/50 hover:text-accent",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
  );

  return (
    <section id="team" className="overflow-hidden bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">

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
        </div>

        {/* ── Stage ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_LG }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur * 1.1, ease }}
          className="relative"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
              className="grid grid-cols-1 items-center gap-9 md:grid-cols-2 md:gap-14"
            >
              <div className="relative mx-auto w-full max-w-xs md:max-w-sm">
                <div className="absolute -inset-x-2.5 -top-4 bottom-4 rounded-t-[10rem] border border-accent/25" aria-hidden />
                <div className="relative aspect-[4/5] overflow-hidden rounded-t-[10rem] rounded-b-[0.5rem]">
                  <img
                    src={current.photoUrl}
                    alt={current.name}
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="min-w-0 text-center md:text-start">
                <p className="font-serif text-sm tabular-nums text-accent-light" aria-live="polite">
                  {String(active + 1).padStart(2, "0")} / {String(staff.length).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-serif text-3xl font-light leading-tight text-foreground sm:text-4xl">
                  {current.name}
                </h3>
                <p className="mt-1.5 font-serif text-lg italic text-accent">{current.specialty}</p>
                <p className="mx-auto mt-5 max-w-md text-pretty font-serif text-lg font-light italic leading-relaxed text-foreground/75 md:mx-0">
                  “{excerpt}”
                </p>
                {onNavigateToStaffProfile && (
                  <motion.button
                    type="button"
                    onClick={() => onNavigateToStaffProfile(current.slug)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                    className="group mt-7 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent underline-offset-8 hover:text-accent-light hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                  >
                    {localeConfig.team.viewProfile}
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Controls ─────────────────────────────────────────────── */}
          {staff.length > 1 && (
            <div className="mt-10 flex items-center justify-center gap-6">
              <motion.button type="button" onClick={() => go(-1)} aria-label={S.prev} whileTap={{ scale: 0.95 }} className={arrowClass}>
                <ChevronLeft size={18} className="rtl:rotate-180" aria-hidden />
              </motion.button>
              <div className="flex items-center gap-2.5" role="tablist">
                {staff.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-label={S.goTo.replace("{n}", String(i + 1))}
                    onClick={() => setActive(i)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      i === active ? "w-7 bg-accent" : "w-2 bg-border hover:bg-accent/40",
                    )}
                  />
                ))}
              </div>
              <motion.button type="button" onClick={() => go(1)} aria-label={S.next} whileTap={{ scale: 0.95 }} className={arrowClass}>
                <ChevronRight size={18} className="rtl:rotate-180" aria-hidden />
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
