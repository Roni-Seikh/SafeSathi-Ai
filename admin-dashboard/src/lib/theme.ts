import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'safesathi_admin_theme';

function initial(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let current: Theme = initial();
const subs = new Set<(t: Theme) => void>();

function apply(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}
apply(current); // runs once at import, before first paint of the app → no flash

export function setTheme(t: Theme) {
  current = t;
  localStorage.setItem(KEY, t);
  apply(t);
  subs.forEach((s) => s(t));
}

export function useTheme(): [Theme, () => void] {
  const [t, setT] = useState<Theme>(current);
  useEffect(() => { subs.add(setT); return () => { subs.delete(setT); }; }, []);
  return [t, () => setTheme(t === 'dark' ? 'light' : 'dark')];
}
