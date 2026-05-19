'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function useDarkMode() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const isDark = mounted && resolvedTheme === 'dark';
  const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark');

  return { isDark, mounted, toggleDarkMode, setTheme };
}
