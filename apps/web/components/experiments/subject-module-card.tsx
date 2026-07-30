'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ExperimentSummary } from '@eduotaga/types';
import { ExperimentCard } from './experiment-card';

interface SubjectModuleCardProps {
  subjectName: string;
  experiments: ExperimentSummary[];
}

export function SubjectModuleCard({ subjectName, experiments }: SubjectModuleCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="neo-card overflow-hidden transition-all duration-300">
      {/* ── Clickable header ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 sm:p-6 text-left cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div>
          <h3 className="text-lg font-bold text-foreground">{subjectName}</h3>
          <p className="text-sm text-muted mt-0.5">
            {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ChevronDown
          className={`h-6 w-6 text-foreground transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ── Expandable content ── */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-2 sm:grid-cols-2 sm:px-6 sm:pb-6 lg:grid-cols-3">
            {experiments.map((experiment) => (
              <ExperimentCard key={experiment.id} experiment={experiment} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
