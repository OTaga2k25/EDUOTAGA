import Link from 'next/link';
import { DEFAULT_MOCK_RATING, MOCK_RATINGS } from '@eduotaga/constants';
import type { ExperimentSummary } from '@eduotaga/types';
import { cn } from '@eduotaga/ui/web';
import { Star, FlaskConical, MoreHorizontal } from 'lucide-react';

const CARD_COLORS = [
  '!bg-neo-green dark:!bg-neo-green',
  '!bg-neo-purple dark:!bg-neo-purple',
  '!bg-slate-200 dark:!bg-slate-200',
];

export function RecommendedList({ experiments }: { experiments: ExperimentSummary[] }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-black text-foreground">Recommended for you</h2>
        <Link href="/experiments" className="text-sm font-bold text-neo-blue hover:underline">
          View all
        </Link>
      </div>
      <ul className="flex flex-col gap-4">
        {experiments.map((experiment, index) => (
          <li key={experiment.id}>
            <Link
              href={`/experiments/${experiment.slug}`}
              className={cn("neo-card p-3 flex flex-row items-center gap-4 cursor-pointer dark:text-black", CARD_COLORS[index % CARD_COLORS.length])}
            >
              <div
                aria-hidden="true"
                className="flex h-12 w-16 shrink-0 items-center justify-center"
              >
                <FlaskConical className="h-8 w-8 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-bold truncate">{experiment.title}</span>
                <span className="block text-xs font-semibold opacity-70">{experiment.subjectName}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                 <MoreHorizontal className="h-6 w-6 text-black/70 mb-1" />
                 <span className="flex items-center gap-1 text-sm font-bold">
                   <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                   {(MOCK_RATINGS[experiment.slug] ?? DEFAULT_MOCK_RATING).toFixed(1)}
                 </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
