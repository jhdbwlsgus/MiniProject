'use client';

import useDarkMode from '@/hooks/useDarkMode';

export default function DarkModeToggle() {
  const { isDark, mounted, toggleDarkMode } = useDarkMode();

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="다크모드"
        className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-700"
        disabled
      />
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="다크모드"
      onClick={toggleDarkMode}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isDark ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-[#121212] ${
          isDark ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
