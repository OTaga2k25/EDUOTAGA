import { Card } from '@eduotaga/ui/web';

const STEPS = [
  { icon: '📖', title: '1. Learn theory', description: 'Detailed notes and concepts with examples.' },
  { icon: '🖥️', title: '2. Practice simulation', description: 'Interactive virtual labs to apply what you learn.' },
  { icon: '▶️', title: '3. Watch videos', description: 'Curated videos to understand better.' },
  { icon: '📝', title: '4. Test & improve', description: 'Quizzes and reports to track your progress.' },
];

export function HowItWorksBanner() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step) => (
        <Card key={step.title} className="flex flex-col gap-2 p-5">
          <span className="text-2xl" aria-hidden="true">
            {step.icon}
          </span>
          <p className="font-semibold text-foreground">{step.title}</p>
          <p className="text-sm text-muted">{step.description}</p>
        </Card>
      ))}
    </div>
  );
}
