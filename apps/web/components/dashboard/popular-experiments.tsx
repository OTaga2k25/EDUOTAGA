import Link from 'next/link';
import type { ExperimentSummary } from '@eduotaga/types';
import { ExperimentCard } from '@/components/experiments/experiment-card';

export function PopularExperiments({ experiments }: { experiments: ExperimentSummary[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="hidden sm:flex justify-between items-end border-b-2 border-black dark:border-white pb-2">
        <div className="flex gap-6">
          <button className="text-sm font-black text-neo-blue border-b-2 border-neo-blue pb-2 -mb-[10px]">Theory</button>
          <button className="text-sm font-bold text-foreground/70 hover:text-foreground">Simulations</button>
          <button className="text-sm font-bold text-foreground/70 hover:text-foreground">Videos</button>
        </div>
        <Link href="/experiments" className="text-sm font-bold text-neo-blue hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {experiments.map((experiment) => (
          <ExperimentCard key={experiment.id} experiment={experiment} />
        ))}
      </div>
    </div>
  );
}
