import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { env } from "../config/env";
import { setLocale } from "../config/locale";
import { switchSiteLanguage } from "../config/site";
import type { UiLanguage } from "../config/uiLanguage";

interface LanguageContextValue {
  language: UiLanguage;
  setLanguage: (lang: UiLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Read the persisted language or fall back to the build-time default. */
function getInitialLanguage(): UiLanguage {
  if (typeof window === "undefined") return env.uiLanguage;
  const stored = localStorage.getItem("preferred_language") as UiLanguage | null;
  if (stored === "he" || stored === "en" || stored === "ru" || stored === "ar") return stored;
  return env.uiLanguage;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<UiLanguage>(getInitialLanguage);

  const setLanguage = useCallback((lang: UiLanguage) => {
    // Mutate module-level singletons so every import picks up new values on re-render
    setLocale(lang);
    switchSiteLanguage(lang);

    // Update document direction and lang attribute
    const isRtl = lang === "he" || lang === "ar";
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;

    // Load RTL-optimized fonts (Heebo for sans, Frank Ruhl Libre for serif)
    if (isRtl && !document.querySelector('link[data-theme-fonts="rtl-fonts"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&family=Frank+Ruhl+Libre:wght@300;400;500;700&display=swap";
      link.setAttribute("data-theme-fonts", "rtl-fonts");
      document.head.appendChild(link);
    }

    // Persist preference
    localStorage.setItem("preferred_language", lang);

    // Trigger re-render of entire tree via state change
    setLang(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
