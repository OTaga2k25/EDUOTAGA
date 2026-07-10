import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
      {...props}
    />
  );
}
