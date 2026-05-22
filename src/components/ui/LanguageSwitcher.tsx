import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import type { UiLanguage } from "../../config/uiLanguage";

const LANGUAGES: { code: UiLanguage; label: string; flag: string }[] = [
  { code: "he", label: "\u05e2\u05d1\u05e8\u05d9\u05ea", flag: "\ud83c\uddee\ud83c\uddf1" },
  { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", flag: "\ud83c\uddf8\ud83c\udde6" },
  { code: "en", label: "English", flag: "\ud83c\uddfa\ud83c\uddf8" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flag: "\ud83c\uddf7\ud83c\uddfa" },
];

interface Props {
  variant?: "light" | "dark";
  /** Horizontal alignment: "start" = left-0 (extends right), "end" = right-0 (extends left). */
  align?: "start" | "end";
  /** Open the dropdown upward instead of downward (for bottom-of-sidebar placement). */
  dropUp?: boolean;
}

export function LanguageSwitcher({ variant = "light", align, dropUp = false }: Props) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[1];
  const textColor = variant === "light" ? "text-white/80 hover:text-white" : "text-neutral-400 hover:text-white";
  const dropBg = "bg-neutral-900 border border-neutral-700";

  // Horizontal: LTR → left-0 (extends right), RTL → right-0 (extends left).
  // Callers can override with the `align` prop.
  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const resolvedAlign = align ?? (isRtl ? "end" : "start");
  const dropPosition = resolvedAlign === "start" ? "left-0" : "right-0";

  // Vertical: default opens downward; dropUp opens above the button.
  const dropVertical = dropUp ? "bottom-full mb-1" : "top-full mt-1";
  const slideAnim = dropUp ? "slide-in-from-bottom-1" : "slide-in-from-top-1";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${textColor}`}
        aria-label="Change language"
      >
        <Globe size={14} />
        <span>{current.flag}</span>
      </button>

      {open && (
        <div className={`absolute ${dropVertical} ${dropPosition} ${dropBg} rounded-lg shadow-xl z-50 min-w-[130px] py-1 animate-in fade-in ${slideAnim} duration-150`}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                lang.code === language
                  ? "text-amber-400 bg-neutral-800"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
