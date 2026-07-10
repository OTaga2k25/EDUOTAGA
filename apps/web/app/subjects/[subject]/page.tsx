import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import { ExperimentCard } from '@/components/experiments/experiment-card';
import { getSubjectBySlug, listSubjects } from '@/services/subjects-service';
import { listExperiments } from '@/services/experiments-service';

interface SubjectPageProps {
  params: Promise<{ subject: string }>;
}

export async function generateStaticParams() {
  const subjects = await listSubjects();
  return subjects.map((subject) => ({ subject: subject.slug }));
}

export async function generateMetadata({ params }: SubjectPageProps): Promise<Metadata> {
  const { subject: slug } = await params;
  const subject = await getSubjectBySlug(slug);
  if (!subject) return {};
  return { title: subject.name, description: subject.description };
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { subject: slug } = await params;
  const subject = await getSubjectBySlug(slug);
  if (!subject) notFound();

  const experiments = await listExperiments({ subjectId: subject.id });

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading eyebrow={subject.name} title="Experiments" description={subject.description} />

      {experiments.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No experiments yet"
            description="This subject doesn't have any experiments published yet — check back soon."
          />
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
