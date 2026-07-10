import type { ProcedureStep } from '@eduotaga/types';

export function ProcedureList({ steps }: { steps: ProcedureStep[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {[...steps]
        .sort((a, b) => a.order - b.order)
        .map((step) => (
          <li key={step.order} className="flex gap-4 rounded-2xl border border-border p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {step.order}
            </span>
            <div>
              <p className="font-medium text-foreground">{step.title}</p>
              <p className="mt-1 text-sm text-muted">{step.description}</p>
            </div>
          </li>
        ))}
    </ol>
  );
}
