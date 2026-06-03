import React from "react";
import { motion } from "motion/react";
import { Instagram, Twitter, ArrowUpRight, ShieldCheck, Calendar } from "lucide-react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { cn, handleImgError } from "../../lib/utils";
import {
  Y_SM, Y_MD, Y_LG, X_IN, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING, NICHE_CARD_HOVER,
  sectionTitleContainerVariants, textWordVariants,
  nicheScaleIn, nicheFadeLeft, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../lib/motion";

const AuraTeamModule = React.lazy(() => import("./aura/aura-team").then(m => ({ default: m.AuraTeam })));

export function Team({
  onBookClick,
  onNavigateToStaffProfile,
}: {
  onBookClick: () => void;
  onNavigateToStaffProfile?: (slug: string) => void;
}) {
  const { sections } = siteConfig;
  const { team: sectionConfig } = sections;
  const isEstetica = siteConfig.business.type === "estetica";
  const isSolo = siteConfig.features.showAbout && !siteConfig.features.showTeam;

  if (sectionConfig.teamVariant === "aura" && siteConfig.staff.length > 0) {
    return (
      <React.Suspense fallback={null}>
        <AuraTeamModule onBookClick={onBookClick} onNavigateToStaffProfile={onNavigateToStaffProfile} />
      </React.Suspense>
    );
  }

  /* ── Solo mode: personal "About Me" section ──────────────────────── */
  if (isSolo && siteConfig.staff.length > 0) {
    const me = siteConfig.staff[0];
    return (
      <section id="team" className="flex flex-col justify-center bg-background px-5 py-8 transition-colors duration-300 sm:px-6 sm:py-24 lg:block">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 items-center gap-6 sm:gap-12 lg:grid-cols-2 lg:gap-20">

            {/* Photo */}
            <motion.div
              {...nicheScaleIn(siteConfig.business.type)}
            >
              <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted">
                <img
                  src={me.photoUrl}
                  alt={me.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                />
              </div>
            </motion.div>

            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.15 }}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
                {sectionConfig.title}
              </p>
              <h2 className={cn(
                "mb-2 text-3xl text-foreground md:text-4xl",
                isEstetica
                  ? "font-normal tracking-wide"
                  : siteConfig.business.type === "nails"
                    ? "font-bold tracking-wide"
                    : "font-bold tracking-tight",
              )}>
                {me.name}
              </h2>
              <p className="mb-6 text-sm font-medium text-accent-light">
                {me.specialty}
              </p>
              <div className="mb-8 h-px w-16 bg-gradient-to-r from-accent-light to-transparent" />
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                {sectionConfig.description}
              </p>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {me.bio}
              </p>

              {/* Social + CTA */}
              <div className="mt-8 flex items-center gap-4">
                {me.social?.instagram && (
                  <a
                    href={me.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-accent-light hover:-translate-y-0.5 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.2s_cubic-bezier(0.23,1,0.32,1)]"
                    aria-label="Instagram"
                  >
                    <Instagram size={18} />
                  </a>
                )}
                {me.social?.twitter && (
                  <a
                    href={me.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-accent-light hover:-translate-y-0.5 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.2s_cubic-bezier(0.23,1,0.32,1)]"
                    aria-label="Twitter"
                  >
                    <Twitter size={18} />
                  </a>
                )}
                {siteConfig.features.showBooking && (
                  <motion.button
                    type="button"
                    onClick={onBookClick}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:border-accent/40 hover:text-accent-light"
                  >
                    <Calendar size={14} />
                    {siteConfig.hero.ctaPrimary}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Team mode (default) ─────────────────────────────────────────── */
  const staffPagesEnabled = siteConfig.features.enableStaffPages === true;
  const linkToProfiles = staffPagesEnabled && !!onNavigateToStaffProfile;
  const cardOpensBooking = siteConfig.features.showBooking && !linkToProfiles;

  // --- TEMPLATE LAYOUT RULE: Odd-count grid fill ---
  // The team grid selects its column count based on how many staff members are
  // defined in the active niche preset. When the last row has fewer cards than
  // the column count (an "orphan" row), the helpers below centre single orphans
  // automatically so there is never a blank cell. This logic is intentional,
  // preset-agnostic, and must be preserved across all niche clones.
  //   * 1 orphan in a 3-col grid -> centred in the middle column (col-start-2)
  //   * 2 orphans in a 3-col grid -> left-aligned naturally (acceptable visually)
  //   * 1 orphan in a 2-col grid -> spans both columns (full-width card)
  // -------------------------------------------------------------------------
  const niche = siteConfig.business.type;
  const isCafeteria = niche === "cafeteria";
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const staffCount = siteConfig.staff.length;
  const teamCols   = staffCount <= 1 ? 1 : (staffCount === 2 || staffCount === 4 ? 2 : 3);
  const remainder  = staffCount % teamCols;

  /** Returns the extra Tailwind classes needed to fill the last grid row. */
  const getOrphanClass = (index: number): string => {
    if (remainder === 0) return "";
    if (index < staffCount - remainder) return "";
    if (teamCols === 3 && remainder === 1) return "md:col-start-2";
    if (teamCols === 2 && remainder === 1) return "md:col-span-2";
    return "";
  };

  const gridColsClass =
    teamCols === 1 ? "" :
    teamCols === 2 ? "md:grid-cols-2" :
    "md:grid-cols-3";

  return (
    <section id="team" className="relative flex flex-col justify-center overflow-hidden bg-background px-5 py-8 transition-colors duration-300 sm:px-6 sm:py-28 lg:block">

      {/* Subtle structural lines */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border/40 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">

        {/* -- Section header -- */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-20 sm:gap-10 md:flex-row md:items-end">
          <div>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "40px" }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: 0.45 }}
              className="mb-5 h-0.5 bg-accent-light"
            />
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className={cn(
                "leading-[0.9] text-foreground",
                isCafeteria
                  ? "font-serif text-2xl font-normal tracking-wide sm:text-4xl md:text-5xl"
                  : isEstetica
                    ? "text-2xl font-normal tracking-wide sm:text-4xl md:text-5xl"
                    : siteConfig.business.type === "nails"
                      ? "text-2xl font-black uppercase tracking-wide sm:text-5xl md:text-7xl"
                      : "text-2xl font-black uppercase tracking-tighter sm:text-5xl md:text-7xl",
              )}
            >
              {sectionConfig.subtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, x: X_IN }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2 }}
            className="max-w-sm"
          >
            {!isEstetica && (
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent-light" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {localeConfig.team.verifiedBadge}
                </span>
              </div>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {sectionConfig.description}
            </p>
          </motion.div>
        </div>

        {/* -- Cards: horizontal scroll on mobile, grid on desktop -- */}
        <div className={cn(
          "-mx-5 flex gap-4 overflow-x-auto px-5 pb-4 scroll-pl-5 snap-x snap-mandatory [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]",
          "sm:mx-0 sm:grid sm:grid-cols-1 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 sm:scroll-pl-0 sm:snap-none",
          gridColsClass
        )}>
          {siteConfig.staff.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{
                opacity: 0,
                ...(index % 2 === 0 ? { x: -X_IN } : { y: Y_LG }),
              }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: stagger(index), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              whileHover={{
                y: NICHE_CARD_HOVER[flavor].y,
                scale: NICHE_CARD_HOVER[flavor].scale,
                boxShadow: NICHE_CARD_HOVER[flavor].shadow,
              }}
              className={cn(
                "group relative shrink-0 snap-start overflow-hidden border border-border bg-card [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease]",
                "w-[65vw] sm:w-auto sm:shrink",
                "hover:border-accent/30 dark:hover:border-accent/20",
                niche === "tattoo" ? "rounded-xl" : isCafeteria ? "rounded-2xl" : "rounded-3xl",
                linkToProfiles && "cursor-pointer",
                cardOpensBooking && "cursor-pointer",
                getOrphanClass(index),
              )}
              onClick={cardOpensBooking ? onBookClick : undefined}
              {...(cardOpensBooking && {
                role: "button",
                tabIndex: 0,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onBookClick();
                  }
                },
              })}
            >
              {/* Invisible full-card link for profile navigation */}
              {linkToProfiles && (
                <a
                  href={`/equipo/${encodeURIComponent(member.slug)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigateToStaffProfile!(member.slug);
                  }}
                  className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                  aria-label={`View ${member.name}'s profile`}
                />
              )}

              {/* Photo */}
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />

                {/* Specialty badge -- overlays bottom of photo (hidden for estetica) */}
                {!isEstetica && !isCafeteria && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className={cn(
                      "inline-block border border-white/15 bg-black/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/85 backdrop-blur-sm",
                      niche === "tattoo" ? "rounded-md" : "rounded-xl",
                    )}>
                      {member.specialty}
                    </span>
                  </div>
                )}
              </div>

              {/* Card body */}
              <div className="p-3 sm:p-6">
                {/* Specialty as subtle text (estetica only — badge is hidden above) */}
                {(isEstetica || isCafeteria) && (
                  <p className="mb-1 text-[11px] text-muted-foreground sm:mb-2 sm:text-xs">{member.specialty}</p>
                )}

                <div className="mb-1 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
                  <h3 className={cn(
                    "transition-colors duration-200 group-hover:text-accent-light",
                    isCafeteria
                      ? "font-serif text-sm font-normal tracking-wide text-card-foreground sm:text-xl"
                      : isEstetica
                        ? "font-serif text-sm font-normal tracking-wide text-card-foreground sm:text-xl"
                        : siteConfig.business.type === "nails"
                          ? "text-sm font-black uppercase tracking-wide text-card-foreground sm:text-xl"
                          : "text-sm font-black uppercase tracking-tight text-card-foreground sm:text-xl",
                  )}>
                    {member.name}
                  </h3>
                  <ArrowUpRight
                    size={14}
                    className="mt-0.5 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:text-accent-light group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:h-[18px] sm:w-[18px]"
                  />
                </div>

                <p className="mb-2 hidden text-xs leading-relaxed text-muted-foreground line-clamp-3 sm:mb-5 sm:block">
                  {member.bio}
                </p>

                {/* Footer */}
                <div className="relative z-20 hidden items-center justify-between border-t border-border pt-4 sm:flex">
                  <div className="flex gap-3">
                    {member.social?.instagram && (
                      <a
                        href={member.social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-accent-light hover:-translate-y-0.5 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.2s_cubic-bezier(0.23,1,0.32,1)]"
                        aria-label="Instagram"
                      >
                        <Instagram size={15} />
                      </a>
                    )}
                    {member.social?.twitter && (
                      <a
                        href={member.social.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-accent-light hover:-translate-y-0.5 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.2s_cubic-bezier(0.23,1,0.32,1)]"
                        aria-label="Twitter"
                      >
                        <Twitter size={15} />
                      </a>
                    )}
                  </div>

                  {siteConfig.features.showBooking && !linkToProfiles && (
                    <div className="flex items-center gap-1.5 text-accent-light opacity-0 transition-all duration-300 group-hover:opacity-100">
                      <Calendar size={12} />
                      <span className="text-[11px] font-bold uppercase tracking-widest">
                        {localeConfig.buttons.bookNow}
                      </span>
                    </div>
                  )}

                  {linkToProfiles && (
                    <span className="text-[11px] font-bold uppercase tracking-widest text-accent-light opacity-0 transition-all duration-300 group-hover:opacity-100">
                      {localeConfig.team.viewProfile}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
