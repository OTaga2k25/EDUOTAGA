import Link from 'next/link';
import { Badge, Card } from '@eduotaga/ui/web';
import { DIFFICULTY_LABELS } from '@eduotaga/constants';
import type { ExperimentSummary } from '@eduotaga/types';

const DIFFICULTY_TONE = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
} as const;

export function ExperimentCard({ experiment }: { experiment: ExperimentSummary }) {
  return (
    <Link href={`/experiments/${experiment.slug}`}>
      <Card className="flex h-full flex-col gap-3 p-6">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="primary">{experiment.subjectName}</Badge>
          <Badge tone={DIFFICULTY_TONE[experiment.difficulty]}>
            {DIFFICULTY_LABELS[experiment.difficulty]}
          </Badge>
        </div>
        <h3 className="text-lg font-semibold text-foreground">{experiment.title}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted">{experiment.summary}</p>
        {experiment.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {experiment.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-border/50 px-2 py-0.5 text-xs text-muted">
                {tag}
              </span>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
