import Link from 'next/link';
import { Suspense } from 'react';
import { SITE_NAME } from '@eduotaga/constants';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { SearchBar } from '@/components/search/search-bar';

const NAV_LINKS = [
  { href: '/subjects', label: 'Subjects' },
  { href: '/experiments', label: 'Experiments' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            E
          </span>
          {SITE_NAME}
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted sm:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden w-64 md:block">
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
