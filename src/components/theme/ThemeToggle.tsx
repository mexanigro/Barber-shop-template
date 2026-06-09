import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"
import { localeConfig } from "../../config/locale"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary shadow-sm transition-all duration-300 hover:bg-primary/20 hover:text-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      aria-label={localeConfig.a11y.toggleTheme}
    >
      {theme === "dark" ? (
        <Sun size={20} className="hover:rotate-12 transition-transform" />
      ) : (
        <Moon size={20} className="hover:-rotate-12 transition-transform" />
      )}
    </button>
  )
}
