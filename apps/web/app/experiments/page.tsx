import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, canonical } from '@/lib/seo';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import { CATEGORIES } from '@eduotaga/constants';
import type { ExperimentDifficulty, ExperimentSummary, Subject } from '@eduotaga/types';
import { SubjectModuleCard } from '@/components/experiments/subject-module-card';
import { CategoryCard } from '@/components/experiments/category-card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
  const { categoryId: rawCategoryId, difficulty } = await searchParams;
  const categoryId = rawCategoryId && rawCategoryId in CATEGORIES ? rawCategoryId : undefined;
  const [allExperiments, subjects] = await Promise.all([
    listExperiments({ difficulty: difficulty as ExperimentDifficulty | undefined }),
    getSubjects(),
  ]);
  const experiments = categoryId ? allExperiments.filter((e) => e.categoryId === categoryId) : allExperiments;
  const availableCategories = Array.from(new Set(allExperiments.map((e) => e.categoryId)));

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const grouped = groupByCategoryAndSubject(experiments, subjectMap);
  const ORDER = ['physics', 'chemistry', 'biology'];
  const categoryOrder = (id: string) => (ORDER.indexOf(id) < 0 ? 99 : ORDER.indexOf(id));
  const orderedCategories = Object.entries(grouped).sort(([a], [b]) => categoryOrder(a) - categoryOrder(b));

  // ── Landing: one big card per discipline. Tapping a card opens its labs. ──
  if (!categoryId) {
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
          title="Choose a subject"
          description="Tap a subject to see all its virtual labs."
        />
        {experiments.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="No experiments match these filters" />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {orderedCategories.map(([catId, category]) => {
              const subjectList = Object.values(category.subjects);
              const count = subjectList.reduce((n, s) => n + s.experiments.length, 0);
              return (
                <CategoryCard
                  key={catId}
                  categoryId={catId}
                  name={category.categoryName}
                  description={CATEGORIES[catId as keyof typeof CATEGORIES]?.description}
                  subjectNames={subjectList.map((s) => s.subjectName)}
                  experimentCount={count}
                  hasNew={subjectList.some((s) => s.experiments.some((e) => e.isNew))}
                />
              );
            })}
          </div>
        )}
      </section>
    );
  }

  const current = CATEGORIES[categoryId as keyof typeof CATEGORIES];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <JsonLd
        schema={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Experiments', path: '/experiments' },
        ])}
      />
      <Link
        href="/experiments"
        className="text-foreground mb-6 inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-1.5 text-sm font-black hover:bg-black/5 dark:border-white/40 dark:hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" />
        All subjects
      </Link>
      <SectionHeading
        eyebrow="Experiments"
        title={`${current?.name ?? 'Experiments'} labs`}
        description={current?.description ?? 'Browse interactive labs categorized by subject.'}
      />
      <nav aria-label="Switch subject" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {availableCategories
          .filter((id) => id in CATEGORIES)
          .sort((a, b) => categoryOrder(a) - categoryOrder(b))
          .map((id) => (
            <Link
              key={id}
              href={`/experiments?categoryId=${id}`}
              aria-current={id === categoryId ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full border-2 border-black px-4 py-1.5 text-sm font-black transition-colors dark:border-white/40 ${
                id === categoryId ? 'bg-foreground text-background' : 'text-foreground hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {CATEGORIES[id as keyof typeof CATEGORIES].name}
            </Link>
          ))}
      </nav>

      {experiments.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No experiments match these filters" />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-14">
          {orderedCategories.map(([catId, category]) => {
            const subjectEntries = Object.entries(category.subjects);
            const totalExpCount = subjectEntries.reduce(
              (sum, [, s]) => sum + s.experiments.length,
              0,
            );

            return (
              <div key={catId}>
                {/* ── Count pills for this category ── */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-black/10 pb-4 dark:border-white/10">
                  <h2 className="sr-only">{category.categoryName}</h2>
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
