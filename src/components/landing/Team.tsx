import React from "react";
import { motion } from "motion/react";
import { Instagram, Twitter, ExternalLink, ShieldCheck, Database, Fingerprint } from "lucide-react";
import { siteConfig } from "../../config/site";
import { cn } from "../../lib/utils";

export function Team({
  onBookClick,
  onNavigateToStaffProfile,
}: {
  onBookClick: () => void;
  onNavigateToStaffProfile?: (slug: string) => void;
}) {
  const { sections } = siteConfig;
  const { team: sectionConfig } = sections;

  const staffPagesEnabled = siteConfig.features.enableStaffPages === true;
  const linkToProfiles = staffPagesEnabled && !!onNavigateToStaffProfile;
  /** Reserva desde la tarjeta solo cuando no hay páginas de equipo (comportamiento histórico). */
  const cardOpensBooking =
    siteConfig.features.showBooking && !linkToProfiles;

  return (
    <section id="team" className="relative overflow-hidden bg-background px-6 py-32 transition-colors duration-300">
      {/* Structural Background Accents */}
      <div className="absolute left-1/2 top-0 z-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-zinc-900 via-transparent to-transparent opacity-30 dark:from-zinc-100/20" />
      <div className="absolute left-0 top-1/4 z-0 h-px w-full bg-gradient-to-r from-transparent via-muted-foreground/25 to-transparent" />
      
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-24 flex flex-col justify-between gap-12 md:flex-row md:items-start">
          <div className="relative">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "40px" }}
              viewport={{ once: true }}
              className="mb-6 h-1 bg-accent-light"
            />
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-2 text-[10px] font-black uppercase tracking-[0.4em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.h2>
            <motion.h3 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-black uppercase leading-[0.85] tracking-tighter text-foreground md:text-8xl"
            >
              {sectionConfig.subtitle.split(' ').map((word, i) => (
                <React.Fragment key={i}>
                  {word === "Legends" ? <span className="text-accent-light">{word}</span> : word}
                  {i === 1 && <br />}
                  {i !== sectionConfig.subtitle.split(' ').length - 1 && " "}
                </React.Fragment>
              ))}
            </motion.h3>
          </div>
          
          <div className="max-w-sm md:pt-16">
             <div className="mb-4 flex items-center gap-3">
                <ShieldCheck size={16} className="text-accent-light/50" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verified Mastery</span>
             </div>
             <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="border-l border-border pl-6 text-sm leading-relaxed text-muted-foreground transition-colors duration-300"
              >
                {sectionConfig.description}
              </motion.p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border bg-border shadow-elevated md:grid-cols-3">
          {siteConfig.staff.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className={cn(
                "group relative bg-background p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-muted/40 hover:shadow-lg dark:hover:bg-card/80",
                linkToProfiles && "cursor-pointer",
                cardOpensBooking && "cursor-pointer",
              )}
              onClick={
                cardOpensBooking
                  ? onBookClick
                  : undefined
              }
            >
              {linkToProfiles && (
                <a
                  href={`/equipo/${encodeURIComponent(member.slug)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigateToStaffProfile!(member.slug);
                  }}
                  className="absolute inset-0 z-10 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                  aria-label={`Ver perfil de ${member.name}`}
                />
              )}

              {/* Card Decoration */}
              <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-30">
                 <Fingerprint size={40} className="text-accent-light" />
              </div>
              
              <div className="relative mb-8">
                <div className="absolute -left-4 -top-4 h-8 w-8 border-l border-t border-accent-light/30 transition-colors group-hover:border-accent-light" />
                <div className="relative z-0 aspect-[4/5] overflow-hidden rounded-2xl transition-all duration-700">
                  <img
                    src={member.photoUrl}
                    className="h-full w-full object-cover contrast-[1.02] saturate-[1.03] transition-transform duration-700 group-hover:scale-[1.02]"
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-30 dark:from-black/55" />
                </div>
                
                {/* ID Tag overlay */}
                <div className="pointer-events-none absolute -bottom-4 -right-4 z-20 border border-border bg-card p-3 shadow-elevated transition-colors duration-300 group-hover:border-accent-light/50">
                   <p className="mb-1 text-[8px] font-black uppercase text-muted-foreground">Index ID</p>
                   <p className="font-mono text-[10px] font-bold text-accent-light">LEGEND_{member.id.toUpperCase()}_0{index + 1}</p>
                </div>
              </div>

              <div className="relative z-0 space-y-4">
                <div className="flex items-center justify-between">
                   <h4 className="text-2xl font-black uppercase tracking-tight text-foreground transition-colors group-hover:text-accent-light">
                     {member.name}
                   </h4>
                   <ExternalLink size={14} className="text-muted-foreground transition-colors group-hover:text-accent-light" />
                </div>
                
                <div className="flex flex-wrap gap-2">
                   <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-secondary-foreground transition-colors duration-300">
                      {member.specialty}
                   </span>
                   <span className="rounded-md border border-accent-light/25 bg-accent-light/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-accent-light/90">
                      Active Deployment
                   </span>
                </div>

                <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground transition-colors duration-300">
                  {member.bio}
                </p>

                <div className="relative z-20 flex items-center justify-between border-t border-border pt-6 transition-colors duration-300 group-hover:border-border">
                   <div className="flex gap-4">
                      {member.social?.instagram && (
                        <a href={member.social.instagram} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground transition-colors hover:text-accent-light">
                          <Instagram size={16} />
                        </a>
                      )}
                      {member.social?.twitter && (
                        <a href={member.social.twitter} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground transition-colors hover:text-accent-light">
                          <Twitter size={16} />
                        </a>
                      )}
                   </div>
                   {siteConfig.features.showBooking && !linkToProfiles && (
                     <div className="flex items-center gap-2 text-accent-light">
                        <Database size={12} className="animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Request Access</span>
                     </div>
                   )}
                   {linkToProfiles && (
                     <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-light/90">
                       Ver perfil
                     </span>
                   )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        .outline-text {
          -webkit-text-stroke: 1px rgba(255,255,255,0.1);
        }
        .group:hover .outline-text {
          -webkit-text-stroke: 1px rgba(245, 158, 11, 0.3);
        }
      `}</style>
    </section>
  );
}
