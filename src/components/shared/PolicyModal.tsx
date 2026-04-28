import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { getLegalDocument, type LegalDocKind } from "../../config/legalContent";
import { useModalA11y } from "../../hooks/useModalA11y";
import { DUR_OVERLAY, DUR_MODAL_ENTER } from "../../lib/motion";

/**
 * Vista modal del mismo texto legal que las rutas /privacidad, /terminos, /cancelacion.
 * Puede reutilizarse para atajos; el flujo principal del sitio usa las URLs dedicadas.
 */
export function PolicyModal({ type, onClose }: { type: LegalDocKind; onClose: () => void }) {
  const sections = React.useMemo(() => getLegalDocument(type, siteConfig), [type]);
  const modalRef = useModalA11y(true, onClose);

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={localeConfig.legal.documents[type]}
      tabIndex={-1}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 outline-none"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DUR_OVERLAY }}
        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-colors dark:bg-black/75"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: DUR_MODAL_ENTER }}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-border bg-card/95 p-8 text-card-foreground shadow-elevated backdrop-blur-md md:p-12 dark:bg-card/90"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={localeConfig.a11y.close}
          className="absolute right-6 top-6 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={24} />
        </button>
        <div className="no-scrollbar flex-1 overflow-y-auto pr-2">
          <h2 className="mb-6 text-2xl font-black uppercase tracking-tight text-foreground">
            {localeConfig.legal.documents[type]}
          </h2>
          <div className="max-w-prose space-y-6 text-sm leading-relaxed text-muted-foreground">
            {sections.map((block, idx) => (
              <div key={idx} className="space-y-3">
                {block.title ? (
                  <h3 className="text-lg font-bold text-foreground">{block.title}</h3>
                ) : null}
                {block.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
