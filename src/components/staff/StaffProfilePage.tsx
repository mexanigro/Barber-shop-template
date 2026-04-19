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
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-24 md:pb-32 md:pt-28">
        <button
          type="button"
          onClick={onBackHome}
          className="group mb-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-accent-light"
        >
          <ArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          Volver
        </button>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-14">
          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevated backdrop-blur-md dark:bg-card/95">
              <div className="aspect-[4/5] overflow-hidden">
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

          <div className="flex flex-col justify-center space-y-6">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-accent-light">
                {siteConfig.sections.team.subtitle}
              </p>
              <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl lg:text-6xl">
                {member.name}
              </h1>
              <p className="mt-4 inline-block rounded-full border border-border bg-muted/60 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground backdrop-blur-sm dark:bg-muted/40">
                {member.specialty}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card/90 p-6 shadow-sm backdrop-blur-md dark:bg-card/80">
              <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                Biografía
              </h2>
              <p className="text-sm leading-relaxed text-foreground md:text-base">
                {member.bio}
              </p>
            </div>

            {(member.social?.instagram || member.social?.twitter) && (
              <div className="flex flex-wrap gap-4 border-t border-border pt-6">
                {member.social.instagram && (
                  <a
                    href={member.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition-all hover:-translate-y-1 hover:border-accent-light/40 hover:shadow-md"
                  >
                    <Instagram size={18} className="text-accent-light" />
                    Instagram
                  </a>
                )}
                {member.social.twitter && (
                  <a
                    href={member.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition-all hover:-translate-y-1 hover:border-accent-light/40 hover:shadow-md"
                  >
                    <Twitter size={18} className="text-accent-light" />
                    Twitter
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {portfolio.length > 0 && (
          <section className="mt-20 border-t border-border pt-16">
            <h2 className="mb-10 text-center font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl">
              Portafolio
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {portfolio.map((src, idx) => (
                <motion.div
                  key={`${member.id}-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(idx * 0.05, 0.35) }}
                  className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated dark:bg-card/90"
                >
                  <div className="aspect-[4/5] overflow-hidden sm:aspect-square">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
