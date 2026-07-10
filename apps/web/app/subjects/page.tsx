import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import type { CategoryId } from '@eduotaga/types';
import { CATEGORY_LIST } from '@eduotaga/constants';
import { SubjectCard } from '@/components/subjects/subject-card';
import { CategoryCard } from '@/components/subjects/category-card';
import { listSubjects } from '@/services/subjects-service';

export const metadata: Metadata = {
  title: 'Subjects',
  description: 'Browse every subject available on EDUOTAGA, grouped by discipline.',
};

interface SubjectsPageProps {
  searchParams: Promise<{ categoryId?: string }>;
}

export default async function SubjectsPage({ searchParams }: SubjectsPageProps) {
  const { categoryId } = await searchParams;
  const subjects = await listSubjects();

  // No category picked yet — show one card per discipline; picking one
  // drills into just that discipline's subjects below.
  if (!categoryId) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Subjects"
          title="Find your subject"
          description="Pick a discipline to see the subjects and experiments inside it."
        />

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_LIST.map((category) => {
            const inCategory = subjects.filter((subject) => subject.categoryId === category.id);
            const experimentCount = inCategory.reduce((sum, subject) => sum + subject.experimentCount, 0);
            return (
              <CategoryCard
                key={category.id}
                category={category}
                subjectCount={inCategory.length}
                experimentCount={experimentCount}
              />
            );
          })}
        </div>
      </section>
    );
  }

  const category = CATEGORY_LIST.find((entry) => entry.id === categoryId);
  const filtered = subjects.filter((subject) => subject.categoryId === (categoryId as CategoryId));

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/subjects" className="text-sm font-bold text-neo-blue hover:underline">
        ← All subjects
      </Link>
      <div className="mt-4">
        <SectionHeading
          eyebrow="Subjects"
          title={category?.name ?? 'Find your subject'}
          description={category?.description ?? 'Each subject groups related hands-on experiments together.'}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No subjects found"
            description="Try browsing all subjects instead of a single discipline."
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </section>
  );
}
