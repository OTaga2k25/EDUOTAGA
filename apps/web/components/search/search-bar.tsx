'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@eduotaga/ui/web';

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn('relative w-full', className)}>
      <label htmlFor="site-search" className="sr-only">
        Search experiments, subjects, and videos
      </label>
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
        <input
          id="site-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search experiments, topics..."
          className="h-12 w-full rounded-xl border-2 border-black bg-white dark:border-white dark:bg-zinc-900 px-12 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
        />
        <button
          type="button"
          aria-label="Filter"
          className="absolute right-4 text-foreground hover:opacity-70"
        >
          <SlidersHorizontal className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </form>
  );
}
