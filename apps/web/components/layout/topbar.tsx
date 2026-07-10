import { Suspense } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Menu, FlaskConical } from 'lucide-react';

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
        <FlaskConical className="h-7 w-7 text-primary fill-primary" />
        <div className="flex flex-col mt-1">
          <span className="text-[16px] font-black uppercase leading-none tracking-tight text-foreground">edUOtaga</span>
          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Virtual Labs</span>
        </div>
      </div>

      <div className="max-w-md flex-1">
        <Suspense fallback={null}>
          <div className="hidden sm:block">
            <SearchBar />
          </div>
        </Suspense>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
