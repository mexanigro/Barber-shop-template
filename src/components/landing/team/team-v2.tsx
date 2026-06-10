/**
 * team-v2.tsx — HORIZONTAL CAROUSEL team variant.
 *
 * A scroll-snap rail of elegant portrait cards (3/4 photo, serif name,
 * specialty kicker). Edge-bleeds on mobile for a gallery feel; prev/next
 * arrows appear at lg+ (RTL-aware, disabled at the ends). Native drag /
 * swipe via overflow scrolling — no JS gesture layer.
 *
 * Selected via `sections.team.variant === "v2"` (see Team.tsx dispatcher).
 */
import React from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Calendar, ArrowUpRight } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { handleImgError } from "../../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE, staggerTeam,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../lib/motion";

type Lang = "en" | "he" | "ru" | "ar";

const STRINGS: Record<Lang, { prev: string; next: string; bookWith: string }> = {
  en: { prev: "Previous team members", next: "Next team members", bookWith: "Book with" },
  he: { prev: "חברי צוות קודמים", next: "חברי הצוות הבאים", bookWith: "לקביעת תור אצל" },
  ru: { prev: "Предыдущие сотрудники", next: "Следующие сотрудники", bookWith: "Записаться к" },
  ar: { prev: "أعضاء الفريق السابقون", next: "أعضاء الفريق التالون", bookWith: "احجز مع" },
};

export function TeamV2({
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
  const t = STRINGS[localeConfig.lang as Lang] ?? STRINGS.en;

  const linkToProfiles =
    siteConfig.features.enableStaffPages === true && !!onNavigateToStaffProfile;

  const railRef = React.useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);
  const [canScroll, setCanScroll] = React.useState(false);

  React.useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      // |scrollLeft| works for both LTR (0..max) and RTL (0..-max).
      const pos = Math.abs(el.scrollLeft);
      setCanScroll(max > 4);
      setAtStart(pos < 4);
      setAtEnd(pos >= max - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollByCard = (forward: boolean) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-team-card]");
    const gap = parseFloat(getComputedStyle(el).columnGap) || 24;
    const amount = (card?.offsetWidth ?? el.clientWidth * 0.8) + gap;
    const isRtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({
      left: (forward ? 1 : -1) * (isRtl ? -1 : 1) * amount,
      behavior: "smooth",
    });
  };

  const arrowClass =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-300 hover:border-accent/40 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-30";

  return (
    <section id="team" className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28">
      <div className="mx-auto w-full max-w-7xl">

        {/* ── Section header + arrows ─────────────────────────────────── */}
        <div className="mb-10 flex items-end justify-between gap-6 sm:mb-14">
          <div className="min-w-0">
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
                className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground"
              >
                {sectionConfig.description}
              </motion.p>
            )}
          </div>

          {/* Arrows — lg+ only; chevrons mirror under RTL */}
          {canScroll && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.2 }}
              className="hidden shrink-0 items-center gap-3 lg:flex"
            >
              <button
                type="button"
                onClick={() => scrollByCard(false)}
                disabled={atStart}
                aria-label={t.prev}
                className={arrowClass}
              >
                <ChevronLeft size={20} className="rtl:-scale-x-100" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(true)}
                disabled={atEnd}
                aria-label={t.next}
                className={arrowClass}
              >
                <ChevronRight size={20} className="rtl:-scale-x-100" />
              </button>
            </motion.div>
          )}
        </div>

        {/* ── Scroll-snap rail (edge-bleed below lg) ──────────────────── */}
        <div
          ref={railRef}
          className="-mx-5 flex snap-x snap-mandatory gap-[var(--gs-gap)] overflow-x-auto px-5 pb-3 scroll-ps-5 sm:-mx-6 sm:px-6 sm:scroll-ps-6 lg:mx-0 lg:px-0 lg:scroll-ps-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {staff.map((member, index) => (
            <motion.article
              key={member.id}
              data-team-card
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: staggerTeam(index), duration: dur, ease }}
              className="group relative w-[72vw] max-w-[300px] shrink-0 snap-start sm:w-[300px]"
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

              {/* Portrait */}
              <div className="gs-image relative aspect-[3/4] overflow-hidden bg-muted">
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                />
              </div>

              {/* Caption */}
              <div className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-xl font-medium leading-snug text-foreground transition-colors duration-300 group-hover:text-accent-light">
                    {member.name}
                  </h3>
                  {linkToProfiles && (
                    <ArrowUpRight
                      size={16}
                      className="mt-1 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-light rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                  )}
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {member.specialty}
                </p>

                {/* Quiet booking affordance */}
                {features.showBooking && (
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookClick();
                    }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                    className="relative z-20 mt-3 inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-muted-foreground underline-offset-4 transition-colors duration-300 hover:text-accent-light hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <Calendar size={13} className="shrink-0" />
                    <span>{t.bookWith} {member.name.split(" ")[0]}</span>
                  </motion.button>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
