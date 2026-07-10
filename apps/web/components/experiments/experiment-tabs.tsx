'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@eduotaga/ui/web';

export interface ExperimentTab {
  id: string;
  label: string;
  content: ReactNode;
}

export function ExperimentTabs({ tabs }: { tabs: ExperimentTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      <div role="tablist" aria-label="Experiment sections" className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:bg-border/40 hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="pt-6">
        {tabs.find((tab) => tab.id === active)?.content}
      </div>
    </div>
  );
}
