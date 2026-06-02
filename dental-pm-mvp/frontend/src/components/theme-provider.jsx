// ✅ ThemeProvider CSS pur — remplace la version shadcn qui cause insertBefore
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children, defaultTheme = "light", storageKey = "theme" }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const resolvedTheme = theme === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;

    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    document.body.classList.remove("light", "dark");
    document.body.classList.add(resolvedTheme);
    try { localStorage.setItem(storageKey, theme); } catch {}

    return () => {
      document.body.classList.remove("light", "dark");
    };
  }, [theme, storageKey]);

  const setTheme = nextTheme => setThemeState(nextTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
