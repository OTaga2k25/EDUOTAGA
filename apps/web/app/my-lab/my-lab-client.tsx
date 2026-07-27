'use client';

import { useState, useEffect } from 'react';
import { ExperimentCard } from '@/components/experiments/experiment-card';
import type { ExperimentSummary } from '@eduotaga/types';
import { EmptyState } from '@eduotaga/ui/web';

export function MyLabClient({ allExperiments }: { allExperiments: ExperimentSummary[] }) {
  const [savedExperiments, setSavedExperiments] = useState<ExperimentSummary[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedIds = JSON.parse(localStorage.getItem('eduotaga-mylab') || '[]');
    setSavedExperiments(allExperiments.filter((exp) => savedIds.includes(exp.id)));
  }, [allExperiments]);

  if (!mounted) return null;

  if (savedExperiments.length === 0) {
    return (
      <EmptyState
        title="Your Lab is Empty"
        description="You haven't saved any experiments yet. Explore the experiments library and click 'Save' to add them here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {savedExperiments.map((experiment) => (
        <ExperimentCard key={experiment.id} experiment={experiment} />
      ))}
    </div>
  );
}
