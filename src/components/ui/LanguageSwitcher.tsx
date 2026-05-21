import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import type { UiLanguage } from "../../config/uiLanguage";

const LANGUAGES: { code: UiLanguage; label: string; flag: string }[] = [
  { code: "he", label: "\u05e2\u05d1\u05e8\u05d9\u05ea", flag: "\ud83c\uddee\ud83c\uddf1" },
  { code: "en", label: "English", flag: "\ud83c\uddfa\ud83c\uddf8" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flag: "\ud83c\uddf7\ud83c\uddfa" },
];

interface Props {
  variant?: "light" | "dark";
  align?: "start" | "end";
}

export function LanguageSwitcher({ variant = "light", align }: Props) {
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

  // In LTR the button usually sits at the left (sidebar / navbar-start), so
  // the dropdown opens RIGHT (left-0) to stay within the viewport.
  // In RTL (Hebrew) the sidebar flips to the right, so the dropdown opens
  // LEFT (right-0) to stay visible.
  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  const resolvedAlign = align ?? (isRtl ? "end" : "start");
  const dropPosition = resolvedAlign === "start" ? "left-0" : "right-0";

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
        <div className={`absolute top-full mt-1 ${dropPosition} ${dropBg} rounded-lg shadow-xl z-50 min-w-[130px] py-1 animate-in fade-in slide-in-from-top-1 duration-150`}>
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
