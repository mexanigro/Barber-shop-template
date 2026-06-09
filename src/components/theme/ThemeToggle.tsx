import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"
import { localeConfig } from "../../config/locale"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded-xl border border-border bg-card p-2 shadow-sm transition-all duration-300 hover:bg-muted hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-label={localeConfig.a11y.toggleTheme}
    >
      {theme === "dark" ? (
        <Sun size={20} className="text-amber-400 transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon size={20} className="text-foreground/80 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  )
}
