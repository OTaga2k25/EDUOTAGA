import type { Metadata } from 'next';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import { CATEGORIES } from '@eduotaga/constants';
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

  const groupedExperiments = experiments.reduce((acc, experiment) => {
    if (!acc[experiment.categoryId]) {
      acc[experiment.categoryId] = [];
    }
    acc[experiment.categoryId].push(experiment);
    return acc;
  }, {} as Record<string, typeof experiments>);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Experiments"
        title="All experiments"
        description="Browse interactive labs categorized by subject."
      />

      {experiments.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No experiments match these filters" />
        </div>
      ) : (
        <div className="mt-12 flex flex-col gap-12">
          {Object.entries(groupedExperiments).map(([categoryId, categoryExperiments]) => (
            <div key={categoryId}>
              <h2 className="mb-6 text-2xl font-black text-foreground">
                {CATEGORIES[categoryId as keyof typeof CATEGORIES]?.name || categoryId}
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {categoryExperiments.map((experiment) => (
                  <ExperimentCard key={experiment.id} experiment={experiment} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
