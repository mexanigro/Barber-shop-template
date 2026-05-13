import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import type { UiLanguage } from "../../config/uiLanguage";

const LANGUAGES: { code: UiLanguage; label: string; flag: string }[] = [
  { code: "he", label: "עברית", flag: "🇮🇱" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

interface Props {
  /** "light" for dark backgrounds (landing), "dark" for light backgrounds */
  variant?: "light" | "dark";
}

export function LanguageSwitcher({ variant = "light" }: Props) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
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
        <div className={`absolute top-full mt-1 end-0 ${dropBg} rounded-lg shadow-xl z-50 min-w-[130px] py-1 animate-in fade-in slide-in-from-top-1 duration-150`}>
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
