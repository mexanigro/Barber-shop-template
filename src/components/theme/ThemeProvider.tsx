import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

/** Tailwind `md` — escritorio mantiene siempre modo oscuro (navbar desktop sin toggle). */
export const DESKTOP_THEME_MEDIA = "(min-width: 768px)";

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

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

function isDesktopViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_THEME_MEDIA).matches;
}

function initialTheme(storageKey: string, defaultTheme: Theme): Theme {
  if (typeof window === "undefined") return defaultTheme;
  if (isDesktopViewport()) return "dark";
  return readStoredTheme(storageKey, defaultTheme);
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    initialTheme(storageKey, defaultTheme),
  );

  /** Sincroniza `html` con el estado (y fuerza dark en escritorio). */
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (isDesktopViewport()) {
      root.classList.add("dark");
      setThemeState((t) => (t !== "dark" ? "dark" : t));
      return;
    }

    root.classList.add(theme === "dark" ? "dark" : "light");
  }, [theme]);

  /** Al cruzar el breakpoint, restaurar preferencia móvil o forzar dark en desktop. */
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_THEME_MEDIA);

    const onBreakpointChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");

      if (mq.matches) {
        root.classList.add("dark");
        setThemeState("dark");
        return;
      }

      const restored = readStoredTheme(storageKey, defaultTheme);
      setThemeState(restored);
      root.classList.add(restored === "dark" ? "dark" : "light");
    };

    mq.addEventListener("change", onBreakpointChange);
    return () => mq.removeEventListener("change", onBreakpointChange);
  }, [storageKey, defaultTheme]);

  const value = {
    theme,
    setTheme: (next: Theme) => {
      if (isDesktopViewport()) {
        return;
      }
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
      setThemeState(next);
    },
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
