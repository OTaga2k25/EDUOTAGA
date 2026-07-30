import type { Metadata } from 'next';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import { CATEGORIES } from '@eduotaga/constants';
import type { ExperimentDifficulty, ExperimentSummary } from '@eduotaga/types';
import { SubjectModuleCard } from '@/components/experiments/subject-module-card';
import { listExperiments } from '@/services/experiments-service';

export const metadata: Metadata = {
  title: 'Experiments',
  description: 'Browse every hands-on experiment on EDUOTAGA.',
};

interface ExperimentsPageProps {
  searchParams: Promise<{ categoryId?: string; difficulty?: string }>;
}

/** Group experiments into Category → Subject → Experiments */
function groupByCategoryAndSubject(experiments: ExperimentSummary[]) {
  const result: Record<string, {
    categoryName: string;
    subjects: Record<string, { subjectName: string; experiments: ExperimentSummary[] }>;
  }> = {};

  for (const exp of experiments) {
    if (!result[exp.categoryId]) {
      const cat = CATEGORIES[exp.categoryId as keyof typeof CATEGORIES];
      result[exp.categoryId] = {
        categoryName: cat?.name ?? exp.categoryId,
        subjects: {},
      };
    }
    const category = result[exp.categoryId];
    if (!category.subjects[exp.subjectId]) {
      category.subjects[exp.subjectId] = { subjectName: exp.subjectName, experiments: [] };
    }
    category.subjects[exp.subjectId].experiments.push(exp);
  }

  return result;
}

export default async function ExperimentsPage({ searchParams }: ExperimentsPageProps) {
  const { categoryId, difficulty } = await searchParams;
  const experiments = await listExperiments({
    categoryId,
    difficulty: difficulty as ExperimentDifficulty | undefined,
  });

  const grouped = groupByCategoryAndSubject(experiments);

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
        <div className="mt-12 flex flex-col gap-14">
          {Object.entries(grouped).map(([catId, category]) => (
            <div key={catId}>
              {/* ── Category heading ── */}
              <h2 className="mb-6 text-2xl font-black text-foreground">
                {category.categoryName}
              </h2>

              <div className="flex flex-col gap-5">
                {Object.entries(category.subjects).map(([subId, subject]) => (
                  <SubjectModuleCard
                    key={subId}
                    subjectName={subject.subjectName}
                    experiments={subject.experiments}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
