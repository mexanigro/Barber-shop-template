import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Instagram, Twitter, Calendar } from "lucide-react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import { resolveStaffMember } from "../../lib/staff";

export function StaffProfilePage({
  slug,
  onBackHome,
  onBookClick,
}: {
  slug: string;
  onBackHome: () => void;
  onBookClick?: () => void;
}) {
  const enabled = siteConfig.features.enableStaffPages;
  const member = resolveStaffMember(slug);

  React.useEffect(() => {
    if (enabled && member) {
      document.title = `${member.name} · ${siteConfig.brand.name}`;
    } else {
      document.title = `${localeConfig.staffProfile.docTitleProfile} · ${siteConfig.brand.name}`;
    }
  }, [enabled, member]);

  // ── Fallback: feature disabled ───────────────────────────────────────────────
  if (!enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg px-6 pb-24 pt-28 text-center md:pt-32"
      >
        <div className="rounded-3xl border border-border bg-card/95 p-10 shadow-elevated backdrop-blur-md dark:bg-card/90">
          <p className="text-lg font-semibold text-foreground">
            {localeConfig.staffProfile.featureDisabledTitle}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {localeConfig.staffProfile.featureDisabledBody}
          </p>
          <button
            type="button"
            onClick={onBackHome}
            className="mt-8 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-accent-light hover:text-zinc-950 active:scale-95"
          >
            {localeConfig.staffProfile.backHome}
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Fallback: member not found ───────────────────────────────────────────────
  if (!member) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg px-6 pb-24 pt-28 text-center md:pt-32"
      >
        <div className="rounded-3xl border border-border bg-card/95 p-10 shadow-elevated backdrop-blur-md dark:bg-card/90">
          <p className="text-lg font-semibold text-foreground">
            {localeConfig.staffProfile.notFoundTitle}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {localeConfig.staffProfile.notFoundBody}
          </p>
          <button
            type="button"
            onClick={onBackHome}
            className="mt-8 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-accent-light hover:text-zinc-950 active:scale-95"
          >
            {localeConfig.staffProfile.backHome}
          </button>
        </div>
      </motion.div>
    );
  }

  const portfolio = member.portfolio?.length ? member.portfolio : [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-background"
    >
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-24 md:pb-32 md:pt-28">

        {/* Back button */}
        <button
          type="button"
          onClick={onBackHome}
          className="group mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground sm:mb-10"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          {localeConfig.staffProfile.back}
        </button>

        {/* ── Hero grid ────────────────────────────────────────────────── */}
        <div className="grid gap-6 sm:gap-10 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-16">

          {/* Photo */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl sm:rounded-3xl sm:border sm:border-border sm:shadow-elevated dark:sm:bg-card/95">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="h-full w-full object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          {/* Bio content */}
          <div className="flex flex-col justify-center space-y-5 lg:space-y-7">

            {/* Name + specialty */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
                {siteConfig.sections.team.subtitle}
              </p>
              <h1 className="font-serif text-3xl font-light tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                {member.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-muted/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground backdrop-blur-sm dark:bg-muted/40">
                  {member.specialty}
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-accent-light/25 bg-accent-light/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-light">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-light" />
                  {localeConfig.staffProfile.available}
                </span>
              </div>
            </div>

            {/* Bio card */}
            <div className="border-l-2 border-accent-light/30 pl-4 sm:border-l-0 sm:pl-0 sm:rounded-3xl sm:border sm:border-border sm:bg-card/90 sm:p-6 sm:shadow-sm sm:backdrop-blur-md dark:sm:bg-card/80">
              <p className="mb-2 hidden text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground sm:block">
                {localeConfig.staffProfile.about}
              </p>
              <p className="text-sm leading-relaxed text-foreground md:text-base">
                {member.bio}
              </p>
            </div>

            {/* Book CTA */}
            {siteConfig.features.showBooking && onBookClick && (
              <button
                type="button"
                onClick={onBookClick}
                className="group flex items-center justify-center gap-2.5 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md shadow-accent/20 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:scale-95 active:translate-y-0"
              >
                <Calendar size={16} className="transition-transform duration-300 group-hover:rotate-12" />
                {interpolate(localeConfig.staffProfile.bookWith, {
                  firstName: member.name.split(" ")[0] ?? member.name,
                })}
              </button>
            )}

            {/* Social links */}
            {(member.social?.instagram || member.social?.twitter) && (
              <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                {member.social.instagram && (
                  <a
                    href={member.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
                  >
                    <Instagram size={15} className="text-accent-light" />
                    Instagram
                  </a>
                )}
                {member.social.twitter && (
                  <a
                    href={member.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
                  >
                    <Twitter size={15} className="text-accent-light" />
                    Twitter
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Portfolio ─────────────────────────────────────────────────── */}
        {portfolio.length > 0 && (
          <section className="mt-14 border-t border-border pt-10 sm:mt-20 sm:pt-14">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:mb-10">
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
                  {localeConfig.staffProfile.workEyebrow}
                </p>
                <h2 className="font-serif text-3xl font-light tracking-tight text-foreground sm:text-4xl">
                  {localeConfig.staffProfile.portfolioTitle}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {interpolate(localeConfig.staffProfile.piecesCount, { count: portfolio.length })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
              {portfolio.map((src, idx) => (
                <motion.div
                  key={`${member.id}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(idx * 0.06, 0.3) }}
                  className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated sm:rounded-2xl lg:rounded-3xl"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={src}
                      alt={interpolate(localeConfig.staffProfile.portfolioImageAlt, {
                        name: member.name,
                        index: idx + 1,
                      })}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

      </div>
    </motion.article>
  );
}
