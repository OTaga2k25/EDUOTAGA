'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/providers/theme-provider';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Switch theme"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors"
      >
        <span aria-hidden="true" className="opacity-0">☀️</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-border/40"
    >
      <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
    </button>
  );
}
