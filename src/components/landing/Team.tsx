import React from "react";
import { motion } from "motion/react";
import { Instagram, Twitter, ArrowUpRight, ShieldCheck, Calendar } from "lucide-react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { cn } from "../../lib/utils";
import { Y_SM, Y_MD, Y_LG, X_IN, staggerTeam, VIEWPORT_ONCE } from "../../lib/motion";

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
    <section id="team" className="relative overflow-hidden bg-background px-6 py-28 transition-colors duration-300">

      {/* Subtle structural lines */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border/40 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl">

        {/* -- Section header -- */}
        <div className="mb-20 flex flex-col justify-between gap-10 md:flex-row md:items-end">
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
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.1 }}
              className={cn(
                "leading-[0.9] text-foreground",
                isEstetica
                  ? "text-4xl font-normal tracking-wide md:text-5xl"
                  : "text-5xl font-black uppercase tracking-tighter md:text-7xl",
              )}
            >
              {sectionConfig.subtitle}
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
            <p className={cn(
              "text-sm leading-relaxed text-muted-foreground",
              !isEstetica && "border-s-2 border-accent-light/30 ps-5",
            )}>
              {sectionConfig.description}
            </p>
          </motion.div>
        </div>

        {/* -- Cards grid -- */}
        <div className={cn(
          "grid grid-cols-1 gap-6",
          gridColsClass
        )}>
          {siteConfig.staff.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: staggerTeam(index) }}
              className={cn(
                "group relative overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300",
                isEstetica
                  ? "hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-lg"
                  : "hover:-translate-y-1.5 hover:border-accent/30 hover:shadow-xl dark:hover:border-accent/20",
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
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />

                {/* Specialty badge -- overlays bottom of photo (hidden for estetica) */}
                {!isEstetica && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/85 backdrop-blur-sm">
                      {member.specialty}
                    </span>
                  </div>
                )}
              </div>

              {/* Card body */}
              <div className="p-6">
                {/* Specialty as subtle text (estetica only — badge is hidden above) */}
                {isEstetica && (
                  <p className="mb-2 text-xs text-muted-foreground">{member.specialty}</p>
                )}

                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className={cn(
                    "transition-colors duration-200 group-hover:text-accent-light",
                    isEstetica
                      ? "font-serif text-xl font-normal tracking-wide text-card-foreground"
                      : "text-xl font-black uppercase tracking-tight text-card-foreground",
                  )}>
                    {member.name}
                  </h3>
                  <ArrowUpRight
                    size={18}
                    className="mt-0.5 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:text-accent-light group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>

                <p className="mb-5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {member.bio}
                </p>

                {/* Footer */}
                <div className="relative z-20 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex gap-3">
                    {member.social?.instagram && (
                      <a
                        href={member.social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground transition-colors hover:text-accent-light"
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
                        className="text-muted-foreground transition-colors hover:text-accent-light"
                        aria-label="Twitter"
                      >
                        <Twitter size={15} />
                      </a>
                    )}
                  </div>

                  {siteConfig.features.showBooking && !linkToProfiles && (
                    <div className="flex items-center gap-1.5 text-accent-light opacity-0 transition-all duration-300 group-hover:opacity-100">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {localeConfig.buttons.bookNow}
                      </span>
                    </div>
                  )}

                  {linkToProfiles && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-light opacity-0 transition-all duration-300 group-hover:opacity-100">
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
