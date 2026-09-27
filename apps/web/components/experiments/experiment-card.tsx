import Link from 'next/link';
import type { ExperimentSummary } from '@eduotaga/types';
import { CATEGORIES } from '@eduotaga/constants';
import { Atom, FlaskConical, Leaf, Cpu, Settings, Sigma, Anchor, Terminal } from 'lucide-react';

const CATEGORY_ICONS = {
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  electronics: Cpu,
  mechanical: Settings,
  mathematics: Sigma,
  marine: Anchor,
  computer: Terminal,
} as const;

export function ExperimentCard({ experiment }: { experiment: ExperimentSummary }) {
  // Stable random-ish number based on title length
  const minRead = (experiment.title.length % 15) + 5;
  const category = CATEGORIES[experiment.categoryId];
  const Icon = CATEGORY_ICONS[experiment.categoryId];

  return (
    <Link href={`/experiments/${experiment.slug}`} className="block h-full outline-none">
      <div className="neo-card flex h-full min-h-[160px] flex-col justify-between p-4">
        <div>
          <h3 className="mb-1 text-sm leading-tight font-black">{experiment.title}</h3>
        </div>

        <div className="mt-4 flex items-end justify-end">
          <div aria-hidden="true">
            <Icon className="h-10 w-10 text-black opacity-70 dark:text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}
