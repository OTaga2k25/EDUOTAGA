import { Suspense } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Menu } from 'lucide-react';
import Image from 'next/image';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b-0 sm:border-b-2 border-black dark:border-white bg-background px-4 sm:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="flex p-2 -ml-2 items-center justify-center text-foreground lg:hidden"
      >
        <Menu className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 lg:hidden">
        <img src="/logo-light.png" alt="edUOtaga Logo" className="block dark:hidden h-12 w-auto object-contain" />
        <img src="/logo-dark.png" alt="edUOtaga Logo" className="hidden dark:block h-12 w-auto object-contain" />
        <div className="flex flex-col mt-1">
          <span className="text-[16px] font-black uppercase leading-none tracking-tight text-foreground">edUOtaga</span>
          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Virtual Labs</span>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-md hidden sm:block px-4">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </div>

      <div className="relative z-10 ml-auto flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
