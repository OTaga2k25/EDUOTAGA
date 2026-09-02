import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmptyState, SectionHeading } from '@eduotaga/ui/web';
import { ExperimentCard } from '@/components/experiments/experiment-card';
import { getSubjectBySlug, listSubjects } from '@/services/subjects-service';
import { listExperiments } from '@/services/experiments-service';
import { JsonLd } from '@/components/seo/json-ld';
import { breadcrumbSchema, canonical, composeTitle, subjectSchema } from '@/lib/seo';

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
  if (!subject) return { title: 'Subject not found', robots: { index: false, follow: false } };

  const title = composeTitle(subject.name, 'Virtual Lab Experiments');

  return {
    title,
    description: subject.description,
    keywords: [subject.name, `${subject.name} experiments`, 'virtual lab', 'online simulation'],
    ...canonical(`/subjects/${slug}`),
    openGraph: { type: 'website', title, description: subject.description },
  };
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { subject: slug } = await params;
  const subject = await getSubjectBySlug(slug);
  if (!subject) notFound();

  const experiments = await listExperiments({ subjectId: subject.id });

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <JsonLd
        schema={[
          subjectSchema(subject, experiments),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Subjects', path: '/subjects' },
            { name: subject.name, path: `/subjects/${slug}` },
          ]),
        ]}
      />
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
