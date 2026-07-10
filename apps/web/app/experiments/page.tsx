import type { Metadata } from 'next';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import type { CategoryId, ExperimentDifficulty } from '@eduotaga/types';
import { ExperimentCard } from '@/components/experiments/experiment-card';
import { listExperiments } from '@/services/experiments-service';

export const metadata: Metadata = {
  title: 'Experiments',
  description: 'Browse every hands-on experiment on EDUOTAGA.',
};

interface ExperimentsPageProps {
  searchParams: Promise<{ categoryId?: string; difficulty?: string }>;
}

export default async function ExperimentsPage({ searchParams }: ExperimentsPageProps) {
  const { categoryId, difficulty } = await searchParams;
  const experiments = await listExperiments({
    categoryId: categoryId as CategoryId | undefined,
    difficulty: difficulty as ExperimentDifficulty | undefined,
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Experiments"
        title="All experiments"
        description="Every interactive lab currently published on the platform."
      />

      {experiments.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No experiments match these filters" />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {experiments.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </div>
      )}
    </section>
  );
}
