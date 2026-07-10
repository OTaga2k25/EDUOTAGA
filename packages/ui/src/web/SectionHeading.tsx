import type { ReactNode } from 'react';
import { cn } from './cn';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, action, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
