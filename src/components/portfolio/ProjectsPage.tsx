import { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Clock, Maximize, Layers } from "lucide-react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
} from "../../lib/motion";
import type { GalleryPair } from "../../types";

function BeforeAfterPair({ pair, index }: { pair: GalleryPair; index: number }) {
  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: Y_SM }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      {pair.caption && (
        <p className="text-sm font-medium text-muted-foreground">{pair.caption}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={pair.before}
            alt={`Before${pair.caption ? `: ${pair.caption}` : ""}`}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-foreground/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-background backdrop-blur-sm">
            Before
          </span>
        </div>
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={pair.after}
            alt={`After${pair.caption ? `: ${pair.caption}` : ""}`}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            After
          </span>
        </div>
      </div>
    </motion.div>
  );
}

type ProjectData = NonNullable<typeof siteConfig.sections.portfolio>["projects"][number];

function ProjectSection({ project }: { project: ProjectData }) {
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);

  return (
    <article id={`project-${project.title.toLowerCase().replace(/\s+/g, "-")}`} className="scroll-mt-24">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
        >
          <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent ring-1 ring-accent/20">
            {project.type}
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {project.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {project.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            {project.duration && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-muted-foreground/60" />
                {project.duration}
              </div>
            )}
            {project.size && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Maximize className="h-4 w-4 text-muted-foreground/60" />
                {project.size}
              </div>
            )}
          </div>
        </motion.div>

        <div className="space-y-6 lg:col-span-3">
          {project.gallery && project.gallery.length > 0 ? (
            project.gallery.map((pair, i) => (
              <BeforeAfterPair key={i} pair={pair} index={i} />
            ))
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {project.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${project.title} photo ${i + 1}`}
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProjectsPage({ onBack }: { onBack: () => void }) {
  const data = siteConfig.sections.portfolio;
  if (!data) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 md:px-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <ArrowLeft className="h-4 w-4" />
            {localeConfig.lang === "he" ? "חזרה" : localeConfig.lang === "ru" ? "Назад" : localeConfig.lang === "ar" ? "رجوع" : "Back"}
          </button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-sm font-bold text-foreground">{data.title}</h1>
        </div>
      </nav>

      {/* Page header */}
      <header className="pb-8 pt-24 md:pb-12 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: Y_MD }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {data.subtitle}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {localeConfig.lang === "he"
                ? "כל פרויקט כולל צילומי לפני ואחרי כדי שתוכלו לראות את התוצאות שאנו מספקים."
                : localeConfig.lang === "ru"
                  ? "Каждый проект включает фото до и после, чтобы вы видели результаты."
                  : localeConfig.lang === "ar"
                    ? "كل مشروع يتضمن صور قبل وبعد لتشاهدوا النتائج التي نقدّمها."
                    : "Every project includes before and after photos so you can see the results we deliver."}
            </p>
          </motion.div>
        </div>
      </header>

      {/* Projects */}
      <main className="pb-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="divide-y divide-border">
            {data.projects.map((project) => (
              <div key={project.title} className="py-12 first:pt-0 md:py-16">
                <ProjectSection project={project} />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer link */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-accent transition-colors hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            {localeConfig.lang === "he" ? "חזרה לדף הבית" : localeConfig.lang === "ru" ? "На главную" : localeConfig.lang === "ar" ? "العودة للرئيسية" : "Back to home"}
          </button>
        </div>
      </footer>
    </div>
  );
}
