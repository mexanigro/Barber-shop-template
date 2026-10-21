import React, { createContext, useContext, useEffect, useState } from "react";
import { syncBrandingToTheme } from "../../lib/site-theme";
import { siteConfig } from "../../config/site";

type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** CRM-04 (D-345): el panel entra (true) o sale (false); con él, el tema se lee y se guarda en su clave propia. */
  usarTemaDelPanel: (activo: boolean) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  usarTemaDelPanel: () => null,
};

/**
 * CRM-04 (D-345): el tema del panel vive en su propia clave y no depende de `features.themeToggle`: con el toggle en false (R12,
 * peluquería) la web pública sigue en el modo del nicho, pero el oscuro que la dueña elige en /admin sobrevive a recargar.
 */
export const TEMA_PANEL = "crm-panel-theme";
export const esRutaDelPanel = () => typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/admin";
/** El tema guardado del panel, o null. */
export function temaGuardadoDelPanel(): Theme | null {
  try {
    const raw = localStorage.getItem(TEMA_PANEL);
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null;
  }
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

function initialTheme(storageKey: string, defaultTheme: Theme): Theme {
  if (typeof window === "undefined") return defaultTheme;
  // R12 (peluquería): sin toggle, el tema guardado por el navegador no manda.
  if (siteConfig.features.themeToggle === false) return defaultTheme;
  return readStoredTheme(storageKey, defaultTheme);
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [panel, setPanel] = useState(esRutaDelPanel);
  const [theme, setThemeState] = useState<Theme>(() =>
    esRutaDelPanel() ? temaGuardadoDelPanel() ?? defaultTheme : initialTheme(storageKey, defaultTheme),
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    syncBrandingToTheme(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (next: Theme) => {
      try {
        localStorage.setItem(panel ? TEMA_PANEL : storageKey, next);
      } catch {
        /* ignore */
      }
      setThemeState(next);
    },
    usarTemaDelPanel: React.useCallback((activo: boolean) => {
      setPanel(activo);
      setThemeState(activo ? temaGuardadoDelPanel() ?? defaultTheme : initialTheme(storageKey, defaultTheme));
    }, [defaultTheme, storageKey]),
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
