import React from "react";
import { motion } from "motion/react";
import { Award, CheckCircle2, Bookmark, Calendar } from "lucide-react";
import { siteConfig } from "../../../config/site";
import type { StaffMember } from "../../../types";
import { VIEWPORT_ONCE, Y_MD } from "../../../lib/motion";
import { handleImgError } from "../../../lib/utils";

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface Props {
  onBookClick: () => void;
  onNavigateToStaffProfile?: (slug: string) => void;
}

function SpecialistCard({
  member,
  index,
  onBookClick,
  onNavigateToStaffProfile,
}: {
  member: StaffMember;
  index: number;
  onBookClick: () => void;
  onNavigateToStaffProfile?: (slug: string) => void;
}) {
  const isEven = index % 2 === 0;
  const staffPagesEnabled = siteConfig.features.enableStaffPages === true;
  const linkToProfile = staffPagesEnabled && !!onNavigateToStaffProfile;

  return (
    <motion.div
      initial={{ opacity: 0, y: Y_MD }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12 ${
        isEven ? "" : "lg:flex-row-reverse"
      }`}
    >
      {/* Photo */}
      <div className={`relative lg:col-span-4 ${isEven ? "lg:order-1" : "lg:order-2"}`}>
        {/* Decorative offset border */}
        <div className="pointer-events-none absolute inset-4 -translate-x-2 -translate-y-3 rounded-2xl border border-border" />
        <div className="relative overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-lg aspect-[4/5]">
          <img
            src={member.photoUrl}
            alt={member.name}
            className="h-full w-full select-none object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImgError}
          />
          {/* Award badge */}
          <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
            <Award size={16} />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className={`space-y-6 lg:col-span-8 ${isEven ? "lg:order-2" : "lg:order-1"}`}>
        {/* Role + Name */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-widest text-accent">
            {member.specialty}
          </span>
          <h3 className="font-serif text-2xl font-medium text-foreground sm:text-3xl">
            {member.name}
          </h3>
        </div>

        {/* Bio text */}
        <p className="text-sm font-normal leading-relaxed text-muted-foreground">
          {member.bio}
        </p>

        {/* Philosophy quote */}
        {member.philosophy && (
          <div className="rounded-2xl border border-border/50 bg-muted/60 px-5 py-4 text-xs font-medium italic text-foreground">
            "{member.philosophy}"
          </div>
        )}

        {/* Qualifications */}
        {member.qualifications && member.qualifications.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center text-[10px] font-bold uppercase tracking-wider text-foreground">
              <Bookmark size={11} className="mr-1.5 text-accent" />
              Acreditaciones y Formacion Destacada:
            </h4>
            <div className="grid grid-cols-1 gap-3 pl-1 sm:grid-cols-2">
              {member.qualifications.map((qual, i) => (
                <div key={i} className="flex items-start text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="mr-2 mt-0.5 shrink-0 text-accent/70" />
                  <span>{qual}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center gap-4 border-t border-border pt-4">
          {siteConfig.features.showBooking && (
            <motion.button
              type="button"
              onClick={onBookClick}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-foreground transition-colors duration-300 hover:border-accent/40 hover:text-accent"
            >
              <Calendar size={14} />
              {siteConfig.hero.ctaPrimary}
            </motion.button>
          )}

          {linkToProfile && (
            <button
              type="button"
              onClick={() => onNavigateToStaffProfile!(member.slug)}
              className="text-xs font-semibold uppercase tracking-widest text-accent transition-opacity duration-200 hover:opacity-70"
            >
              Ver perfil
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AuraTeam({ onBookClick, onNavigateToStaffProfile }: Props) {
  const { sections, staff } = siteConfig;
  const { team: section } = sections;

  if (!staff || staff.length === 0) return null;

  return (
    <section
      id="team"
      className="scroll-mt-6 border-b border-border/50 bg-background py-20 md:py-28"
    >
      <div className="container mx-auto max-w-7xl px-6">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="mx-auto mb-16 max-w-2xl space-y-4 text-center"
        >
          <div className="inline-flex items-center justify-center space-x-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
            <Award size={14} />
            <span>{section.title}</span>
          </div>

          <h2 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl">
            {section.subtitle}
          </h2>

          <div className="mx-auto h-0.5 w-12 bg-accent/60" />

          <p className="text-sm text-muted-foreground">
            {section.description}
          </p>
        </motion.div>

        {/* Specialists — alternating layout */}
        <div className="space-y-16">
          {staff.map((member, index) => (
            <SpecialistCard
              key={member.id}
              member={member}
              index={index}
              onBookClick={onBookClick}
              onNavigateToStaffProfile={onNavigateToStaffProfile}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
