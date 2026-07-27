'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, BookOpen, FlaskConical, Video } from 'lucide-react';
import { cn } from '@eduotaga/ui/web';
import type { SearchResultItem } from '@eduotaga/types';

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch search suggestions', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setShowSuggestions(false);
    const trimmed = value.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  }

  const getIcon = (type: string) => {
    if (type === 'experiment') return <FlaskConical className="h-4 w-4" />;
    if (type === 'subject') return <BookOpen className="h-4 w-4" />;
    if (type === 'video') return <Video className="h-4 w-4" />;
    return <Search className="h-4 w-4" />;
  };

  return (
    <form ref={containerRef} onSubmit={handleSubmit} role="search" className={cn('relative w-full', className)}>
      <label htmlFor="site-search" className="sr-only">
        Search experiments, subjects, and videos
      </label>
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
        <input
          id="site-search"
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search experiments, topics..."
          className="appearance-none h-12 w-full rounded-xl border-2 border-black bg-white dark:border-white dark:bg-zinc-900 pl-11 pr-12 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] focus:-translate-y-0.5 focus:-translate-x-0.5 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all"
        />
        <button
          type="button"
          aria-label="Filter"
          className="absolute right-4 text-foreground hover:opacity-70 transition-opacity"
        >
          <SlidersHorizontal className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-2 w-full rounded-xl border-2 border-black bg-white dark:border-white dark:bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
          <ul className="max-h-80 overflow-y-auto p-2">
            {suggestions.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href={item.url}
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-start gap-3 rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="mt-0.5 shrink-0 text-muted-foreground">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-bold text-foreground">
                      {item.title}
                    </span>
                    {item.subjectName && (
                      <span className="truncate text-xs font-medium text-muted-foreground">
                        {item.subjectName}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
