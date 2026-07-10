'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
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
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search experiments, subjects, videos…"
        className="h-12 w-full rounded-full border border-border bg-surface px-5 pr-12 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <span aria-hidden="true">🔍</span>
      </button>
    </form>
  );
}
