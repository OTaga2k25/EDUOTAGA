import Link from 'next/link';
import { SITE_NAME } from '@eduotaga/constants';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. Open-source virtual laboratory platform.
        </p>
        <div className="flex gap-4">
          <Link href="/subjects" className="hover:text-foreground">
            Subjects
          </Link>
          <Link href="/experiments" className="hover:text-foreground">
            Experiments
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
