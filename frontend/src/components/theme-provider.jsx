// ✅ ThemeProvider CSS pur — remplace la version shadcn qui cause insertBefore
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children, defaultTheme = "light", storageKey = "theme" }) {
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem(storageKey) || defaultTheme; }
    catch { return defaultTheme; }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try { localStorage.setItem(storageKey, theme); } catch {}
  }, [theme, storageKey]);

  const setTheme = (newTheme) => setThemeState(newTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
