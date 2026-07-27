import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SimulationFrame } from '@/components/experiments/simulation-frame';
import { SaveButton } from '@/components/experiments/save-button';
import { TrackLastOpened } from '@/components/experiments/track-last-opened';
import { SetTutorContext } from '@/components/experiments/set-tutor-context';
import { getExperimentDetail } from '@/services/experiments-service';
import { getExperiments } from '@/lib/data';

interface ExperimentPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const experiments = await getExperiments();
  return experiments.map((experiment) => ({ slug: experiment.slug }));
}

export async function generateMetadata({ params }: ExperimentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const experiment = await getExperimentDetail(slug);
  if (!experiment) return {};
  return {
    title: experiment.title,
    description: experiment.summary,
    openGraph: { title: experiment.title, description: experiment.summary },
  };
}

export default async function ExperimentPage({ params }: ExperimentPageProps) {
  const { slug } = await params;
  const experiment = await getExperimentDetail(slug);
  if (!experiment) notFound();

  return (
    <article className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <TrackLastOpened slug={slug} />
      <SetTutorContext
        experimentSlug={slug}
        experimentTitle={experiment.title}
        subjectId={experiment.subject.id}
        categoryId={experiment.categoryId}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {experiment.title}
        </h1>
        <SaveButton experimentId={experiment.id} />
      </div>
      <p className="mt-3 text-lg text-muted">{experiment.summary}</p>

      <div className="mt-8 w-full">
        <SimulationFrame
          simulationUrl={experiment.simulationUrl}
          available={experiment.simulationAvailable}
          title={experiment.title}
          fullHeight
        />
      </div>
    </article>
  );
}
