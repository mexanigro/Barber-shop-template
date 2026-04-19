import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Instagram, Twitter } from "lucide-react";
import { siteConfig } from "../../config/site";
import { resolveStaffMember } from "../../lib/staff";

export function StaffProfilePage({
  slug,
  onBackHome,
}: {
  slug: string;
  onBackHome: () => void;
}) {
  const enabled = siteConfig.features.enableStaffPages;
  const member = resolveStaffMember(slug);

  React.useEffect(() => {
    if (enabled && member) {
      document.title = `${member.name} · ${siteConfig.brand.name}`;
    } else {
      document.title = `Perfil · ${siteConfig.brand.name}`;
    }
  }, [enabled, member]);

  // ── Fallback screens ────────────────────────────────────────────────────────
  if (!enabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg px-6 pb-24 pt-28 text-center md:pt-32"
      >
        <div className="rounded-3xl border border-border bg-card/95 p-10 shadow-elevated backdrop-blur-md dark:bg-card/90">
          <p className="text-lg font-semibold text-foreground">
            Los perfiles individuales no están activados.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Esta función puede habilitarse desde la configuración del sitio.
          </p>
          <button
            type="button"
            onClick={onBackHome}
            className="mt-8 rounded-2xl bg-primary px-8 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-md transition-colors hover:bg-accent-light hover:text-zinc-950"
          >
            Volver al inicio
          </button>
        </div>
      </motion.div>
    );
  }

  if (!member) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg px-6 pb-24 pt-28 text-center md:pt-32"
      >
        <div className="rounded-3xl border border-border bg-card/95 p-10 shadow-elevated backdrop-blur-md dark:bg-card/90">
          <p className="text-lg font-semibold text-foreground">Perfil no encontrado</p>
          <p className="mt-3 text-sm text-muted-foreground">
            No hay ningún profesional con esta ruta. Comprueba el enlace o vuelve al equipo.
          </p>
          <button
            type="button"
            onClick={onBackHome}
            className="mt-8 rounded-2xl bg-primary px-8 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-md transition-colors hover:bg-accent-light hover:text-zinc-950"
          >
            Volver al inicio
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
      {/*
       * Container: tighter horizontal padding on mobile so images breathe,
       * without feeling like a desktop page crammed into a phone.
       */}
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-24 md:pb-32 md:pt-28">

        {/* Back button */}
        <button
          type="button"
          onClick={onBackHome}
          className="group mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-accent-light sm:mb-8"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          Volver
        </button>

        {/*
         * HERO GRID
         * Mobile:  single column — photo first, info below (tight spacing)
         * Desktop: sidebar photo (fixed 340px) + main content side-by-side
         *
         * Photo card: on mobile the heavy card border/shadow is stripped away
         * so the image sits flush and app-like. On sm+ the card styling returns.
         */}
        <div className="grid gap-5 sm:gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-14">

          {/* ── Photo ──────────────────────────────────────────────────────── */}
          <div className="relative">
            <div
              className={[
                "overflow-hidden",
                // Mobile: no border/card — clean, flush image
                "rounded-2xl",
                // sm+: restore the premium card treatment
                "sm:rounded-3xl sm:border sm:border-border sm:bg-card sm:shadow-elevated sm:backdrop-blur-md dark:sm:bg-card/95",
              ].join(" ")}
            >
              <div className="aspect-[4/5] overflow-hidden sm:aspect-[4/5]">
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="h-full w-full object-cover contrast-[1.02] saturate-[1.03]"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          {/* ── Bio content ────────────────────────────────────────────────── */}
          <div className="flex flex-col justify-center space-y-4 sm:space-y-5 lg:space-y-6">
            {/* Name + specialty */}
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.35em] text-accent-light sm:mb-2">
                {siteConfig.sections.team.subtitle}
              </p>
              <h1 className="font-serif text-3xl font-light tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                {member.name}
              </h1>
              <p className="mt-3 inline-block rounded-full border border-border bg-muted/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground backdrop-blur-sm sm:px-4 sm:py-1.5 dark:bg-muted/40">
                {member.specialty}
              </p>
            </div>

            {/* Bio card
                Mobile: no heavy card — just clean text with a left-border accent.
                sm+:    full glass card with border/bg/shadow. */}
            <div
              className={[
                "rounded-2xl",
                // Mobile: minimal — just a subtle left border accent
                "border-l-2 border-accent-light/40 pl-4",
                // sm+: full card treatment
                "sm:border-l-0 sm:pl-0 sm:rounded-3xl sm:border sm:border-border sm:bg-card/90 sm:p-6 sm:shadow-sm sm:backdrop-blur-md dark:sm:bg-card/80",
              ].join(" ")}
            >
              <h2 className="mb-2 hidden text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground sm:block">
                Biografía
              </h2>
              <p className="text-sm leading-relaxed text-foreground md:text-base">
                {member.bio}
              </p>
            </div>

            {/* Social links */}
            {(member.social?.instagram || member.social?.twitter) && (
              <div className="flex flex-wrap gap-3 border-t border-border pt-4 sm:gap-4 sm:pt-5">
                {member.social.instagram && (
                  <a
                    href={member.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-all hover:-translate-y-1 hover:border-accent-light/40 hover:shadow-md sm:px-5 sm:py-3"
                  >
                    <Instagram size={16} className="text-accent-light sm:size-[18px]" />
                    Instagram
                  </a>
                )}
                {member.social.twitter && (
                  <a
                    href={member.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-all hover:-translate-y-1 hover:border-accent-light/40 hover:shadow-md sm:px-5 sm:py-3"
                  >
                    <Twitter size={16} className="text-accent-light sm:size-[18px]" />
                    Twitter
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Portfolio ─────────────────────────────────────────────────────── */}
        {portfolio.length > 0 && (
          <section className="mt-12 border-t border-border pt-8 sm:mt-16 sm:pt-12 md:mt-20 md:pt-16">
            <h2 className="mb-6 text-center font-serif text-2xl font-light tracking-tight text-foreground sm:mb-8 sm:text-3xl md:mb-10 md:text-4xl">
              Portafolio
            </h2>

            {/*
             * Portfolio grid:
             * Mobile: 2 columns, tight 8px gap — clean, scroll-driven like a
             *         native photo app. Square aspect ratio for consistency.
             * Desktop: 3 or 4 columns with normal gap.
             */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
              {portfolio.map((src, idx) => (
                <motion.div
                  key={`${member.id}-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(idx * 0.05, 0.35) }}
                  className="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated sm:rounded-2xl lg:rounded-3xl dark:bg-card/90 dark:border-border"
                >
                  {/* Always-square crop — consistent, app-like grid */}
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={src}
                      alt={member.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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
