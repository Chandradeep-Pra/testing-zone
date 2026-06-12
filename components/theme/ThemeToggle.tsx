"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "urologics-testing-zone-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => getInitialTheme() as "light" | "dark");

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    document.body.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--accent-strong)] shadow-[0_10px_28px_var(--shadow-soft)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
