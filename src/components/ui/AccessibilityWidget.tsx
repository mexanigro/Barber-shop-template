import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const STORAGE_KEY = "a11y-prefs";

type A11yPrefs = {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  focusHighlight: boolean;
  dyslexiaFont: boolean;
  largeCursor: boolean;
};

const DEFAULT_PREFS: A11yPrefs = {
  fontSize: 0,
  highContrast: false,
  reducedMotion: false,
  focusHighlight: false,
  dyslexiaFont: false,
  largeCursor: false,
};

const FONT_STEPS = [-2, -1, 0, 1, 2, 3];
const FONT_SCALE: Record<number, number> = {
  [-2]: 87.5,
  [-1]: 93.75,
  [0]: 100,
  [1]: 112.5,
  [2]: 125,
  [3]: 150,
};

function loadPrefs(): A11yPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: A11yPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // quota exceeded — silent fail
  }
}

function applyToDOM(prefs: A11yPrefs): void {
  const root = document.documentElement;

  const scale = FONT_SCALE[prefs.fontSize] ?? 100;
  root.style.fontSize = scale === 100 ? "" : `${scale}%`;

  root.classList.toggle("a11y-high-contrast", prefs.highContrast);
  root.classList.toggle("a11y-reduced-motion", prefs.reducedMotion);
  root.classList.toggle("a11y-focus-highlight", prefs.focusHighlight);
  root.classList.toggle("a11y-dyslexia-font", prefs.dyslexiaFont);
  root.classList.toggle("a11y-large-cursor", prefs.largeCursor);
}

const LABELS = {
  en: {
    toggle: "Accessibility options",
    title: "Accessibility",
    fontSize: "Text size",
    decrease: "Decrease text",
    increase: "Increase text",
    reset: "Reset",
    highContrast: "High contrast",
    reducedMotion: "Reduce motion",
    focusHighlight: "Highlight focus",
    dyslexiaFont: "Dyslexia font",
    largeCursor: "Large cursor",
    resetAll: "Reset all",
    close: "Close accessibility panel",
  },
  he: {
    toggle: "אפשרויות נגישות",
    title: "נגישות",
    fontSize: "גודל טקסט",
    decrease: "הקטן טקסט",
    increase: "הגדל טקסט",
    reset: "איפוס",
    highContrast: "ניגודיות גבוהה",
    reducedMotion: "הפחת תנועה",
    focusHighlight: "הדגש מיקוד",
    dyslexiaFont: "גופן דיסלקסיה",
    largeCursor: "סמן גדול",
    resetAll: "איפוס הכל",
    close: "סגור חלונית נגישות",
  },
  ru: {
    toggle: "Параметры доступности",
    title: "Доступность",
    fontSize: "Размер текста",
    decrease: "Уменьшить текст",
    increase: "Увеличить текст",
    reset: "Сбросить",
    highContrast: "Высокий контраст",
    reducedMotion: "Без анимаций",
    focusHighlight: "Подсветка фокуса",
    dyslexiaFont: "Шрифт для дислексии",
    largeCursor: "Большой курсор",
    resetAll: "Сбросить все",
    close: "Закрыть панель доступности",
  },
  ar: {
    toggle: "خيارات إمكانية الوصول",
    title: "إمكانية الوصول",
    fontSize: "حجم النص",
    decrease: "تصغير النص",
    increase: "تكبير النص",
    reset: "إعادة تعيين",
    highContrast: "تباين عالٍ",
    reducedMotion: "تقليل الحركة",
    focusHighlight: "إبراز التركيز",
    dyslexiaFont: "خط عسر القراءة",
    largeCursor: "مؤشر كبير",
    resetAll: "إعادة تعيين الكل",
    close: "إغلاق لوحة إمكانية الوصول",
  },
} as const;

type LangKey = keyof typeof LABELS;

function detectLang(): LangKey {
  const html = document.documentElement.lang?.slice(0, 2) as LangKey;
  return LABELS[html] ? html : "en";
}

function ToggleRow({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <span className="text-zinc-200 select-none">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
          active ? "bg-accent" : "bg-zinc-600"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            active ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </span>
    </button>
  );
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_PREFS);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lang = detectLang();
  const t = LABELS[lang];

  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyToDOM(loaded);
  }, []);

  const update = useCallback((patch: Partial<A11yPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      applyToDOM(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    savePrefs(DEFAULT_PREFS);
    applyToDOM(DEFAULT_PREFS);
    setPrefs(DEFAULT_PREFS);
  }, []);

  const hasChanges =
    prefs.fontSize !== 0 ||
    prefs.highContrast ||
    prefs.reducedMotion ||
    prefs.focusHighlight ||
    prefs.dyslexiaFont ||
    prefs.largeCursor;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const canDecrease = prefs.fontSize > FONT_STEPS[0];
  const canIncrease = prefs.fontSize < FONT_STEPS[FONT_STEPS.length - 1];

  return (
    <>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={t.toggle}
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((v) => !v)}
        className="a11y-trigger group fixed bottom-4 start-3 z-[99990] flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-900/90 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-zinc-800/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-accent transition-colors duration-150"
          aria-hidden="true"
        >
          <circle cx="12" cy="4.5" r="2.5" />
          <path d="m4.2 9.5 3.8.6V14l-2.5 6M19.8 9.5l-3.8.6V14l2.5 6" />
          <path d="M12 10v4" />
        </svg>
        {hasChanges && (
          <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-zinc-900/90" />
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            id="a11y-panel"
            role="dialog"
            aria-label={t.title}
            aria-modal="false"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[4.5rem] start-3 z-[99991] w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
                {t.title}
              </h2>
              <button
                type="button"
                aria-label={t.close}
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Font size control */}
            <div className="border-b border-white/[0.06] px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  {t.fontSize}
                </span>
                {prefs.fontSize !== 0 && (
                  <button
                    type="button"
                    onClick={() => update({ fontSize: 0 })}
                    className="text-[10px] font-medium uppercase tracking-wider text-accent transition-colors hover:text-accent-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                  >
                    {t.reset}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t.decrease}
                  disabled={!canDecrease}
                  onClick={() => update({ fontSize: prefs.fontSize - 1 })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-sm font-semibold text-zinc-300 transition-all hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  A<span className="text-[10px]">-</span>
                </button>
                <div className="flex-1 text-center">
                  <span className="text-sm font-medium tabular-nums text-zinc-200">
                    {FONT_SCALE[prefs.fontSize] ?? 100}%
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={t.increase}
                  disabled={!canIncrease}
                  onClick={() => update({ fontSize: prefs.fontSize + 1 })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-sm font-semibold text-zinc-300 transition-all hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  A<span className="text-xs">+</span>
                </button>
              </div>
            </div>

            {/* Toggle options */}
            <div className="space-y-0.5 px-1 py-2">
              <ToggleRow
                label={t.highContrast}
                active={prefs.highContrast}
                onToggle={() => update({ highContrast: !prefs.highContrast })}
              />
              <ToggleRow
                label={t.reducedMotion}
                active={prefs.reducedMotion}
                onToggle={() => update({ reducedMotion: !prefs.reducedMotion })}
              />
              <ToggleRow
                label={t.focusHighlight}
                active={prefs.focusHighlight}
                onToggle={() => update({ focusHighlight: !prefs.focusHighlight })}
              />
              <ToggleRow
                label={t.dyslexiaFont}
                active={prefs.dyslexiaFont}
                onToggle={() => update({ dyslexiaFont: !prefs.dyslexiaFont })}
              />
              <ToggleRow
                label={t.largeCursor}
                active={prefs.largeCursor}
                onToggle={() => update({ largeCursor: !prefs.largeCursor })}
              />
            </div>

            {/* Reset all */}
            {hasChanges && (
              <div className="border-t border-white/[0.06] px-4 py-3">
                <button
                  type="button"
                  onClick={resetAll}
                  className="w-full rounded-lg bg-white/[0.05] px-3 py-2 text-xs font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:bg-white/[0.1] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  {t.resetAll}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
