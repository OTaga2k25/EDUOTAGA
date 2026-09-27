import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, canonical } from '@/lib/seo';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import { CATEGORIES } from '@eduotaga/constants';
import type { ExperimentDifficulty, ExperimentSummary, Subject } from '@eduotaga/types';
import { SubjectModuleCard } from '@/components/experiments/subject-module-card';
import { listExperiments } from '@/services/experiments-service';
import { getSubjects } from '@/lib/data';

export const metadata: Metadata = {
  title: 'All Virtual Lab Experiments',
  description:
    'Browse every hands-on virtual experiment on EDUOTAGA across physics, chemistry, biology, electronics, mechanical, mathematics, marine and computer science.',
  ...canonical('/experiments'),
};

interface ExperimentsPageProps {
  searchParams: Promise<{ categoryId?: string; difficulty?: string }>;
}

/** Group experiments into Category → Subject → Experiments */
function groupByCategoryAndSubject(
  experiments: ExperimentSummary[],
  subjectMap: Map<string, Subject>,
) {
  const result: Record<
    string,
    {
      categoryName: string;
      subjects: Record<
        string,
        {
          subjectName: string;
          slug?: string;
          description?: string;
          icon?: string;
          color?: string;
          experiments: ExperimentSummary[];
        }
      >;
    }
  > = {};

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
      const subjectInfo = subjectMap.get(exp.subjectId);
      category.subjects[exp.subjectId] = {
        subjectName: exp.subjectName,
        slug: subjectInfo?.slug,
        description: subjectInfo?.description,
        icon: subjectInfo?.icon,
        color: subjectInfo?.color,
        experiments: [],
      };
    }
    category.subjects[exp.subjectId].experiments.push(exp);
  }

  return result;
}

export default async function ExperimentsPage({ searchParams }: ExperimentsPageProps) {
  const { categoryId, difficulty } = await searchParams;
  const [experiments, subjects] = await Promise.all([
    listExperiments({
      categoryId,
      difficulty: difficulty as ExperimentDifficulty | undefined,
    }),
    getSubjects(),
  ]);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const grouped = groupByCategoryAndSubject(experiments, subjectMap);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <JsonLd
        schema={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Experiments', path: '/experiments' },
        ])}
      />
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
          {Object.entries(grouped).map(([catId, category]) => {
            const subjectEntries = Object.entries(category.subjects);
            const totalExpCount = subjectEntries.reduce(
              (sum, [, s]) => sum + s.experiments.length,
              0,
            );

            return (
              <div key={catId}>
                {/* ── Category heading with count pills ── */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black/10 pb-4 dark:border-white/10">
                  <h2 className="text-foreground text-2xl font-black">{category.categoryName}</h2>
                  <div className="flex items-center gap-2">
                    <span className="bg-neo-yellow/30 text-foreground rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-black dark:border-white/30">
                      {subjectEntries.length} {subjectEntries.length === 1 ? 'subject' : 'subjects'}
                    </span>
                    <span className="text-foreground rounded-full border-2 border-black bg-black/5 px-2.5 py-0.5 text-xs font-black dark:border-white/30 dark:bg-white/10">
                      {totalExpCount} {totalExpCount === 1 ? 'experiment' : 'experiments'}
                    </span>
                  </div>
                </div>

                {/* ── Responsive Card Grid ── */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {subjectEntries.map(([subId, subject]) => (
                    <SubjectModuleCard
                      key={subId}
                      subjectId={subId}
                      subjectName={subject.subjectName}
                      subjectSlug={subject.slug}
                      subjectDescription={subject.description}
                      iconName={subject.icon}
                      subjectColor={subject.color}
                      categoryId={catId}
                      experiments={subject.experiments}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
