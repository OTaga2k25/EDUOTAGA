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
      <div className="neo-card flex h-full flex-col justify-between p-4 min-h-[160px]">
        <div>
          <h3 className="text-sm font-black leading-tight mb-1">{experiment.title}</h3>
          <p className="text-xs font-semibold opacity-70">{experiment.subjectName}</p>
        </div>

         <div className="flex items-end justify-between mt-4">
           <span className="text-xs font-bold">{minRead} min read</span>
           <div aria-hidden="true">
             <Icon className="h-10 w-10 text-black dark:text-white opacity-70" />
           </div>
        </div>
      </div>
    </Link>
  );
}
