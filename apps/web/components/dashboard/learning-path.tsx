import type { LearningPathStep } from '@eduotaga/constants';
import { cn } from '@eduotaga/ui/web';

const STEP_COLORS = [
  'bg-neo-purple dark:bg-neo-purple',
  'bg-neo-green dark:bg-neo-green',
  'bg-neo-orange dark:bg-neo-orange',
  'bg-neo-yellow dark:bg-neo-yellow',
];

export function LearningPath({ steps }: { steps: LearningPathStep[] }) {
  return (
    <div>
      <h2 className="text-xl font-black text-foreground mb-3">Your Learning Path</h2>
      <div className="neo-card-no-hover p-4 px-6 flex items-center justify-between overflow-x-auto">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center shrink-0">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-black text-xl font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]", STEP_COLORS[index % STEP_COLORS.length])}>
                {step.order}
              </span>
              <div>
                <p className="text-sm font-bold">{step.label}</p>
                <p className="text-xs font-medium opacity-70">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="mx-6 text-xl font-black">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
