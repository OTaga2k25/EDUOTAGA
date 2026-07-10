import type { Metadata } from 'next';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import type { CategoryId } from '@eduotaga/types';
import { SubjectCard } from '@/components/subjects/subject-card';
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
  const subjects = await listSubjects({ categoryId: categoryId as CategoryId | undefined });

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Subjects"
        title="Find your subject"
        description="Each subject groups related hands-on experiments together."
      />

      {subjects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No subjects found"
            description="Try browsing all subjects instead of a single discipline."
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </section>
  );
}
