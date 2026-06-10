/**
 * faq-v4.tsx — TABBED-BY-CATEGORY FAQ variant.
 *
 * The config has no category field, so categories are derived with keyword
 * heuristics on the question text (booking/price/payment → "Booking &
 * payments", service/treatment-ish → "Services", everything else →
 * "General") across all 4 content languages. With fewer than 6 items — or
 * when the heuristics produce a single group — it renders one elegant
 * hairline accordion without tabs. Tab switching crossfades
 * (AnimatePresence mode="wait"), the active underline glides via layoutId,
 * and the tablist implements roving-tabindex arrow-key semantics.
 *
 * Selected via `sections.faq.variant === "v4"` (see FAQ.tsx dispatcher).
 */
import { useState, useId, useRef, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

type CategoryKey = "general" | "booking" | "services";

const STRINGS: Record<"en" | "he" | "ru" | "ar", Record<CategoryKey, string>> = {
  en: { general: "General", booking: "Booking & payments", services: "Services" },
  he: { general: "כללי", booking: "הזמנות ותשלומים", services: "שירותים" },
  ru: { general: "Общее", booking: "Запись и оплата", services: "Услуги" },
  ar: { general: "عام", booking: "الحجز والدفع", services: "الخدمات" },
};

/* Keyword heuristics — matched against lowercased question text in any of the
   4 supported content languages. Booking wins over Services on overlap. */
const BOOKING_KEYWORDS = [
  // en
  "book", "appointment", "schedul", "reschedul", "price", "pricing", "pay",
  "cost", "cancel", "deposit", "refund", "fee", "card", "cash",
  // he
  "תור", "הזמנ", "לקבוע", "מחיר", "תשלום", "לשלם", "עלות", "ביטול", "לבטל",
  "מקדמה", "החזר", "אשראי", "מזומן",
  // ru
  "запис", "брон", "цен", "оплат", "плат", "стоимост", "отмен", "перенос",
  "депозит", "возврат", "карт", "наличн",
  // ar
  "حجز", "موعد", "سعر", "أسعار", "دفع", "تكلف", "إلغاء", "الغاء", "عربون",
  "استرداد", "بطاقة", "نقد",
];

const SERVICES_KEYWORDS = [
  // en
  "service", "treatment", "haircut", "cut", "shave", "beard", "color",
  "style", "procedure", "tattoo", "design", "session", "manicure", "pedicure",
  // he
  "שירות", "טיפול", "תספורת", "גילוח", "זקן", "צבע", "עיצוב", "קעקוע",
  "מניקור", "פדיקור", "פגישה",
  // ru
  "услуг", "процедур", "стрижк", "брить", "бород", "окраш", "тату", "сеанс",
  "дизайн", "маникюр", "педикюр",
  // ar
  "خدم", "علاج", "قص", "حلاق", "لحية", "صبغ", "وشم", "جلسة", "تصميم",
  "مانيكير", "باديكير",
];

function categorize(question: string): CategoryKey {
  const q = question.toLowerCase();
  if (BOOKING_KEYWORDS.some((k) => q.includes(k))) return "booking";
  if (SERVICES_KEYWORDS.some((k) => q.includes(k))) return "services";
  return "general";
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-muted-foreground"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
    >
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

function HairlineRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-b border-border/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full min-h-[44px] items-center justify-between gap-4 rounded-sm py-5 text-start hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
      >
        <span className="font-serif text-base font-medium leading-snug text-foreground md:text-lg">
          {question}
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
            transition={{ duration: 0.35, ease: EASE_OUT_STRONG }}
            className="overflow-hidden"
          >
            <p className="pb-5 pe-8 text-sm leading-relaxed text-muted-foreground">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqV4() {
  const data = siteConfig.sections.faq;
  const items = data?.items ?? [];
  const t = STRINGS[localeConfig.lang];

  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (!data || items.length === 0) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  // Derive category groups. Tabs render only when there are >= 6 items and
  // the heuristics actually split them into more than one populated group.
  const groups: Record<CategoryKey, { question: string; answer: string }[]> = {
    general: [], booking: [], services: [],
  };
  for (const item of items) groups[categorize(item.question)].push(item);

  const tabs = (["general", "booking", "services"] as const)
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ key, label: t[key], items: groups[key] }));

  const useTabs = items.length >= 6 && tabs.length > 1;
  const active = tabs[Math.min(activeIndex, tabs.length - 1)];

  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (activeIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (activeIndex - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next !== null) {
      e.preventDefault();
      setActiveIndex(next);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <section id="faq" className="relative flex flex-col justify-center py-8 sm:py-20 md:py-28 lg:block">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          viewport={VIEWPORT_ONCE}
          className="mb-10 text-center md:mb-14"
        >
          <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              {data.subtitle}
            </p>
          )}
        </motion.div>

        {useTabs ? (
          <>
            {/* ── Tablist ────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: 0.08 }}
              viewport={VIEWPORT_ONCE}
              role="tablist"
              aria-label={data.title}
              onKeyDown={onTablistKeyDown}
              className="mb-8 flex flex-wrap justify-center gap-1 border-b border-border/60"
            >
              {tabs.map((tab, i) => {
                const isActive = i === Math.min(activeIndex, tabs.length - 1);
                return (
                  <button
                    key={tab.key}
                    ref={(el) => { tabRefs.current[i] = el; }}
                    type="button"
                    role="tab"
                    id={`${baseId}-tab-${tab.key}`}
                    aria-selected={isActive}
                    aria-controls={`${baseId}-panel-${tab.key}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveIndex(i)}
                    className={`relative min-h-[44px] rounded-t-sm px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:px-5 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)] ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.span
                        layoutId={`${baseId}-underline`}
                        className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                        transition={{ duration: 0.3, ease: EASE_OUT_STRONG }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>

            {/* ── Active panel (crossfade) ───────────────────────────── */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.key}
                role="tabpanel"
                id={`${baseId}-panel-${active.key}`}
                aria-labelledby={`${baseId}-tab-${active.key}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.15, ease: EASE_OUT_STRONG } }}
                transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
                className="border-t border-border/60"
              >
                {active.items.map((item, i) => (
                  <HairlineRow key={`faq-${item.question.slice(0, 30)}-${i}`} question={item.question} answer={item.answer} />
                ))}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          /* ── Fewer than 6 items / single group: elegant accordion ──── */
          <div className="border-t border-border/60" role="region" aria-label={data.title}>
            {items.map((item, i) => (
              <motion.div
                key={`faq-${item.question.slice(0, 30)}-${i}`}
                initial={{ opacity: 0, y: Y_MD }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: stagger(i) }}
                viewport={VIEWPORT_ONCE}
              >
                <HairlineRow question={item.question} answer={item.answer} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* FAQPage JSON-LD structured data for SEO */}
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
