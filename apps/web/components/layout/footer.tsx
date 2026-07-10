import Link from 'next/link';
import { SITE_NAME } from '@eduotaga/constants';

export function Footer() {
  return (
    <footer className="mt-12 sm:mt-24 border-t-2 border-black dark:border-white bg-neo-yellow/20 dark:bg-neo-yellow/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1">
          <p className="font-black text-xl text-foreground tracking-tight">{SITE_NAME}</p>
          <p className="text-sm font-bold text-foreground/80">
            © {new Date().getFullYear()} Open-source virtual laboratory platform.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 font-bold text-foreground">
          <Link href="/subjects" className="hover:underline hover:text-neo-blue transition-colors">
            Subjects
          </Link>
          <Link href="/experiments" className="hover:underline hover:text-neo-blue transition-colors">
            Experiments
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:underline hover:text-neo-blue transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
