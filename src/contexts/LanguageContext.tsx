import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
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

    // ARREGLOS-02 (D-123): acá se inyectaba una tercera hoja con Heebo 300..700 y Frank Ruhl Libre 300;400;500;700 —las dos
    // fuentes de RTL—, que la hoja base de `index.html` ya declara con esos mismos pesos. Era una declaración repetida más: se
    // quitó y no hay nada que cargar al cambiar de idioma. Lo vigila `tests/fuentes-una-vez.test.ts`.

    // Persist preference
    localStorage.setItem("preferred_language", lang);

    // Trigger re-render of entire tree via state change
    setLang(lang);
  }, []);

  // Stable identity so consumers don't re-render when the provider re-renders
  // for reasons unrelated to the language itself.
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
