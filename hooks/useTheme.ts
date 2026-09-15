import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sistema-cobrancas-theme';
const THEME_EVENT = 'sistema-cobrancas:theme-change';

function isTheme(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : 'system';
}

function resolveTheme(theme: ThemePreference): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => readTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readTheme()));

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncResolved = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };

    syncResolved();
    if (theme === 'system') media.addEventListener('change', syncResolved);
    return () => media.removeEventListener('change', syncResolved);
  }, [theme]);

  useEffect(() => {
    const handleThemeEvent = (event: Event) => {
      const next = (event as CustomEvent<ThemePreference>).detail;
      if (isTheme(next)) setThemeState(next);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isTheme(event.newValue)) setThemeState(event.newValue);
    };

    window.addEventListener(THEME_EVENT, handleThemeEvent);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    window.dispatchEvent(new CustomEvent<ThemePreference>(THEME_EVENT, { detail: next }));
  }, []);

  return { theme, resolvedTheme, setTheme };
}
