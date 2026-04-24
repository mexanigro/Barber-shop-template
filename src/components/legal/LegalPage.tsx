import React from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import {
  getLegalDocument,
  type LegalDocKind,
} from "../../config/legalContent";

export function LegalPage({
  kind,
  onBackHome,
}: {
  kind: LegalDocKind;
  onBackHome: () => void;
}) {
  const sections = React.useMemo(
    () => getLegalDocument(kind, siteConfig),
    [kind],
  );

  React.useEffect(() => {
    document.title = `${localeConfig.legal.documents[kind]} · ${siteConfig.brand.name}`;
  }, [kind]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-3xl px-6 pb-24 pt-28 md:pb-32 md:pt-32"
    >
      <button
        type="button"
        onClick={onBackHome}
        className="group mb-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-accent-light"
      >
        <ArrowLeft
          size={16}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        {localeConfig.legal.backHome}
      </button>

      <header className="mb-12 border-b border-border pb-10">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-accent-light">
          {interpolate(localeConfig.legal.frameworkEyebrow, {
            legalName: siteConfig.business.legalName,
          })}
        </p>
        <h1 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          {localeConfig.legal.documents[kind]}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {interpolate(localeConfig.legal.intro, { sector: siteConfig.business.type })}
        </p>
      </header>

      <div className="space-y-10">
        {sections.map((block, idx) => (
          <section key={idx} className="space-y-4">
            {block.title ? (
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {block.title}
              </h2>
            ) : null}
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              {block.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-3xl border border-border bg-muted/40 p-6 backdrop-blur-sm md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {localeConfig.legal.controllerContact}
        </p>
        <p className="mt-2 text-sm text-foreground">{siteConfig.business.legalName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {siteConfig.business.address}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="text-foreground">{localeConfig.legal.emailLabel}</span>{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="underline decoration-accent-light/50 underline-offset-4 transition-colors hover:text-accent-light"
          >
            {siteConfig.contact.email}
          </a>
          {" · "}
          <span className="text-foreground">{localeConfig.legal.phoneLabel}</span>{" "}
          <a
            href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
            className="underline decoration-accent-light/50 underline-offset-4 transition-colors hover:text-accent-light"
          >
            {siteConfig.contact.phone}
          </a>
        </p>
      </div>
    </motion.article>
  );
}
