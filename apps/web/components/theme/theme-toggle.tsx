'use client';

import { useTheme } from '@/providers/theme-provider';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-black bg-[#e2e8f0] transition-colors focus:outline-none dark:border-white dark:bg-black"
    >
      <span className="sr-only">Toggle theme</span>
      {/* Track icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5">
        <Sun className="h-4 w-4 text-slate-800 dark:text-white" />
        <Moon className="h-4 w-4 text-slate-800 dark:text-white" />
      </span>
      
      {/* Thumb */}
      <span
        className={`z-10 flex h-6 w-6 transform items-center justify-center rounded-full border-2 border-black bg-white transition-transform duration-300 ease-in-out dark:border-white dark:bg-black ${
          isDark ? 'translate-x-[34px]' : 'translate-x-[2px]'
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-white" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-black" />
        )}
      </span>
    </button>
  );
}
