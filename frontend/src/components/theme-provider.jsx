// ✅ ThemeProvider CSS pur — remplace la version shadcn qui cause insertBefore
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children, defaultTheme = "light", storageKey = "theme" }) {
  const [theme, setThemeState] = useState(() => {
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add("light");
    try { localStorage.setItem(storageKey, "light"); } catch {}
  }, [theme, storageKey]);

  const setTheme = () => setThemeState("light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
