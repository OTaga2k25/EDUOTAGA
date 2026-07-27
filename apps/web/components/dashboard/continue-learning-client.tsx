'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ExperimentSummary } from '@eduotaga/types';
import { ContinueLearningCard } from './continue-learning-card';

export function ContinueLearningClient({ experiments }: { experiments: ExperimentSummary[] }) {
  const [continueExperiment, setContinueExperiment] = useState<ExperimentSummary | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const lastOpenedSlug = localStorage.getItem('eduotaga-last-opened');
    
    if (lastOpenedSlug) {
      const found = experiments.find(e => e.slug === lastOpenedSlug);
      if (found) {
        setContinueExperiment(found);
        return;
      }
    }
    
    // Fallback to the first experiment if none tracked
    if (experiments.length > 0) {
      setContinueExperiment(experiments[0]);
    }
  }, [experiments]);

  if (!mounted || !continueExperiment) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-end sm:hidden px-1">
        <h2 className="font-black text-[18px] text-foreground tracking-tight">Continue Learning</h2>
        <Link href="/experiments" className="text-sm font-bold text-neo-blue hover:underline mb-0.5">
          View all
        </Link>
      </div>
      <ContinueLearningCard experiment={continueExperiment} />
    </div>
  );
}
