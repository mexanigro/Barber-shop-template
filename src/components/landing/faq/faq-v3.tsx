/**
 * faq-v3.tsx — SEARCHABLE FAQ variant.
 *
 * A search input (debounced 150 ms) live-filters questions + answers with a
 * case-insensitive substring match. Matches are highlighted with <mark>, a
 * result count line announces matches (aria-live), and an empty state offers
 * a clear button. Below the input: a refined classic accordion of the
 * filtered set. All microcopy inlined in 4 languages (en/he/ru/ar).
 *
 * Selected via `sections.faq.variant === "v3"` (see FAQ.tsx dispatcher).
 */
import React, { useState, useId, useRef, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

function ruResults(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} результат`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} результата`;
  return `${n} результатов`;
}

function arResults(n: number): string {
  if (n === 1) return "نتيجة واحدة";
  if (n === 2) return "نتيجتان";
  if (n >= 3 && n <= 10) return `${n} نتائج`;
  return `${n} نتيجة`;
}

const STRINGS: Record<"en" | "he" | "ru" | "ar", {
  searchLabel: string;
  placeholder: string;
  results: (n: number) => string;
  noResults: string;
  clear: string;
}> = {
  en: {
    searchLabel: "Search questions",
    placeholder: "Search questions…",
    results: (n) => (n === 1 ? "1 result" : `${n} results`),
    noResults: "No results found",
    clear: "Clear search",
  },
  he: {
    searchLabel: "חיפוש שאלות",
    placeholder: "חיפוש שאלות…",
    results: (n) => (n === 1 ? "תוצאה אחת" : `${n} תוצאות`),
    noResults: "לא נמצאו תוצאות",
    clear: "ניקוי חיפוש",
  },
  ru: {
    searchLabel: "Поиск по вопросам",
    placeholder: "Поиск по вопросам…",
    results: ruResults,
    noResults: "Ничего не найдено",
    clear: "Очистить поиск",
  },
  ar: {
    searchLabel: "البحث في الأسئلة",
    placeholder: "البحث في الأسئلة…",
    results: arResults,
    noResults: "لا توجد نتائج",
    clear: "مسح البحث",
  },
};

/** Wrap every case-insensitive occurrence of `query` in a <mark>. */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match = lower.indexOf(q, cursor);
  while (match !== -1) {
    if (match > cursor) parts.push(text.slice(cursor, match));
    parts.push(
      <mark key={`m-${match}`} className="rounded-[2px] bg-accent/20 text-foreground">
        {text.slice(match, match + q.length)}
      </mark>,
    );
    cursor = match + q.length;
    match = lower.indexOf(q, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
    >
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

function AccordionItem({ question, answer, query }: { question: string; answer: string; query: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-accent/30 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full min-h-[48px] touch-manipulation items-center justify-between gap-4 rounded-xl px-6 py-5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <span className="text-pretty font-serif text-base font-medium leading-snug text-foreground">
          {highlightMatches(question, query)}
        </span>
        <ChevronIcon open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.22, ease: EASE_OUT_STRONG } }}
            transition={{ duration: 0.32, ease: EASE_OUT_STRONG }}
            className="overflow-hidden"
          >
            <p className="text-pretty px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
              {highlightMatches(answer, query)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqV3() {
  const data = siteConfig.sections.faq;
  const items = data?.items ?? [];
  const t = STRINGS[localeConfig.lang];

  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the live filter by 150 ms so typing stays smooth.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(rawQuery.trim()), 150);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q),
    );
  }, [items, query]);

  if (!data || items.length === 0) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);

  const clearSearch = () => {
    setRawQuery("");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <section id="faq" className="relative flex flex-col justify-center py-8 sm:py-20 md:py-28 lg:block">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          viewport={VIEWPORT_ONCE}
          className="mb-10 text-center md:mb-12"
        >
          <h2 className="text-balance font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="mx-auto mt-3 max-w-xl text-pretty text-base text-muted-foreground">
              {data.subtitle}
            </p>
          )}
        </motion.div>

        {/* ── Search input ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: 0.08 }}
          viewport={VIEWPORT_ONCE}
          className="mb-8"
        >
          <label htmlFor={inputId} className="sr-only">{t.searchLabel}</label>
          <div className="relative">
            <Search
              size={18}
              aria-hidden="true"
              // z-10: the input paints after the icon and its backdrop-blur
              // smears the glyph into a gray blob unless the icon sits above.
              className="pointer-events-none absolute start-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder={t.placeholder}
              autoComplete="off"
              className="h-12 w-full touch-manipulation rounded-xl border border-border/60 bg-card/50 ps-11 pe-12 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1)] [&::-webkit-search-cancel-button]:hidden"
            />
            {rawQuery && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={t.clear}
                className="absolute end-1 top-1/2 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <p aria-live="polite" className="mt-3 min-h-[1rem] text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
            {query ? t.results(filtered.length) : ""}
          </p>
        </motion.div>

        {/* ── Filtered accordion / empty state ───────────────────────── */}
        {filtered.length > 0 ? (
          <div className="space-y-3" role="region" aria-label={data.title}>
            {filtered.map((item) => (
              <motion.div
                key={`faq-${item.question}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT_STRONG }}
              >
                <AccordionItem question={item.question} answer={item.answer} query={query} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_STRONG }}
            className="rounded-xl border border-dashed border-border/60 px-6 py-12 text-center"
          >
            <p className="text-sm text-muted-foreground">{t.noResults}</p>
            <button
              type="button"
              onClick={clearSearch}
              className="mt-4 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-full border border-border px-6 text-sm font-semibold text-foreground hover:border-accent/50 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-[0.98] [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1),border-color_0.3s_cubic-bezier(0.23,1,0.32,1),transform_0.12s_cubic-bezier(0.23,1,0.32,1)]"
            >
              {t.clear}
            </button>
          </motion.div>
        )}
      </div>

      {/* FAQPage JSON-LD structured data for SEO — full item set, not the filtered view */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }).replace(/<\/script>/gi, "<\\/script>"),
        }}
      />
    </section>
  );
}
