import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded-xl border border-border bg-secondary p-2 text-muted-foreground shadow-sm transition-all duration-300 hover:text-foreground hover:shadow-md dark:bg-card"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun size={20} className="hover:rotate-12 transition-transform" />
      ) : (
        <Moon size={20} className="hover:-rotate-12 transition-transform" />
      )}
    </button>
  )
}
