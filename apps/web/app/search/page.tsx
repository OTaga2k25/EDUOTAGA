import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, SectionHeading } from '@eduotaga/ui/web';
import { search } from '@/services/search-service';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search experiments, subjects, and videos on EDUOTAGA.',
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const TYPE_LABEL = { experiment: 'Experiment', subject: 'Subject', video: 'Video' } as const;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams;
  const results = q.trim() ? await search(q) : [];

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Search"
        title={q ? `Results for “${q}”` : 'Search EDUOTAGA'}
        description="Find experiments, subjects, and videos across the whole platform."
      />

      <div className="mt-8 flex flex-col gap-3">
        {q.trim() && results.length === 0 && (
          <EmptyState title="No results" description="Try a different search term." />
        )}

        {results.map((result) => (
          <Link
            key={`${result.type}-${result.id}`}
            href={result.url}
            className="flex flex-col gap-1 rounded-2xl border border-border p-4 hover:bg-border/20"
          >
            <div className="flex items-center gap-2">
              <Badge tone="primary">{TYPE_LABEL[result.type]}</Badge>
              {result.subjectName && <span className="text-xs text-muted">{result.subjectName}</span>}
            </div>
            <p className="font-medium text-foreground">{result.title}</p>
            <p className="line-clamp-2 text-sm text-muted">{result.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
