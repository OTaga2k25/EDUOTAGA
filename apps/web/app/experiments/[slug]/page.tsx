import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Badge } from '@eduotaga/ui/web';
import { DIFFICULTY_LABELS } from '@eduotaga/constants';
import { formatDuration } from '@eduotaga/utils';
import { RichText } from '@/components/experiments/rich-text';
import { ProcedureList } from '@/components/experiments/procedure-list';
import { SimulationFrame } from '@/components/experiments/simulation-frame';
import { VideoList } from '@/components/experiments/video-list';
import { DownloadList } from '@/components/experiments/download-list';
import { QuizBlock } from '@/components/experiments/quiz-block';
import { ExperimentTabs } from '@/components/experiments/experiment-tabs';
import { getExperimentDetail } from '@/services/experiments-service';
import { getExperiments } from '@/lib/data';

const DIFFICULTY_TONE = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
} as const;

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
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{experiment.subject.name}</Badge>
        <Badge tone={DIFFICULTY_TONE[experiment.difficulty]}>
          {DIFFICULTY_LABELS[experiment.difficulty]}
        </Badge>
        {experiment.estimatedDurationMinutes && (
          <Badge tone="neutral">{formatDuration(experiment.estimatedDurationMinutes)}</Badge>
        )}
      </div>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {experiment.title}
      </h1>
      <p className="mt-3 text-lg text-muted">{experiment.summary}</p>

      <div className="mt-8">
        <ExperimentTabs
          tabs={[
            { id: 'theory', label: 'Theory', content: <RichText content={experiment.theory} /> },
            { id: 'procedure', label: 'Procedure', content: <ProcedureList steps={experiment.procedure} /> },
            {
              id: 'simulation',
              label: 'Simulation',
              content: (
                <SimulationFrame
                  simulationUrl={experiment.simulationUrl}
                  available={experiment.simulationAvailable}
                  title={experiment.title}
                />
              ),
            },
            {
              id: 'observation',
              label: 'Observation',
              content: <RichText content={experiment.observation} />,
            },
            { id: 'videos', label: 'Videos', content: <VideoList videos={experiment.videos} /> },
            {
              id: 'downloads',
              label: 'Downloads',
              content: (
                <DownloadList
                  downloads={experiment.downloads}
                  categoryId={experiment.categoryId}
                  slug={experiment.slug}
                />
              ),
            },
            { id: 'quiz', label: 'Quiz', content: <QuizBlock questions={experiment.quiz} /> },
          ]}
        />
      </div>
    </article>
  );
}
