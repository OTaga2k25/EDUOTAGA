import Link from 'next/link';
import type { ExperimentSummary } from '@eduotaga/types';
import { ExperimentCard } from '@/components/experiments/experiment-card';

export function PopularExperiments({ experiments }: { experiments: ExperimentSummary[] }) {
  return (
    <div className="flex flex-col gap-4">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {experiments.map((experiment) => (
          <ExperimentCard key={experiment.id} experiment={experiment} />
        ))}
      </div>
    </div>
  );
}
