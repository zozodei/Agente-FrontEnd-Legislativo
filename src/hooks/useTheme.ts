import { useCallback, useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';
const KEY = 'poroteo:tema';

function read(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Tema claro / oscuro / del sistema, persistido por navegador. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      if (theme === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      /* almacenamiento no disponible: el tema igual se aplica */
    }
  }, [theme]);

  const cycle = useCallback(
    () => setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system')),
    [],
  );

  return { theme, setTheme, cycle };
}
