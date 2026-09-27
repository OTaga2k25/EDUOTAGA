import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { SimulationFrame } from '@/components/experiments/simulation-frame';
import { SaveButton } from '@/components/experiments/save-button';
import { TrackLastOpened } from '@/components/experiments/track-last-opened';
import { SetTutorContext } from '@/components/experiments/set-tutor-context';
import { getExperimentDetail } from '@/services/experiments-service';
import { getExperiments } from '@/lib/data';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, breadcrumbSchema, canonical, experimentSchema, experimentTitle } from '@/lib/seo';

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

  // An unresolved slug renders notFound(); tell crawlers not to index the
  // 404 body they receive in the meantime.
  if (!experiment) return { title: 'Experiment not found', robots: { index: false, follow: false } };

  const url = absoluteUrl(`/experiments/${slug}`);
  const title = experimentTitle(experiment.title, experiment.subject.name);

  return {
    title,
    description: experiment.summary,
    keywords: [...experiment.tags, experiment.subject.name, 'virtual lab', 'simulation'],
    ...canonical(`/experiments/${slug}`),
    openGraph: {
      type: 'article',
      url,
      title,
      description: experiment.summary,
      publishedTime: experiment.createdAt,
      modifiedTime: experiment.updatedAt,
      tags: experiment.tags,
    },
    twitter: { card: 'summary_large_image', title, description: experiment.summary },
  };
}

export default async function ExperimentPage({ params }: ExperimentPageProps) {
  const { slug } = await params;
  const experiment = await getExperimentDetail(slug);
  if (!experiment) notFound();

  return (
    <article className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <JsonLd
        schema={[
          experimentSchema(experiment),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Experiments', path: '/experiments' },
            { name: experiment.subject.name, path: `/subjects/${experiment.subject.slug}` },
            { name: experiment.title, path: `/experiments/${slug}` },
          ]),
        ]}
      />
      <TrackLastOpened slug={slug} />
      <SetTutorContext
        experimentSlug={slug}
        experimentTitle={experiment.title}
        subjectId={experiment.subject.id}
        categoryId={experiment.categoryId}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {experiment.title}
          </h1>
          {((experiment as any).isNew || experiment.slug === 'ESP_Prototyping') && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-[#ffde59] px-3 py-1 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <Sparkles className="h-3.5 w-3.5 fill-black text-black" />
              New Experiment
            </span>
          )}
        </div>
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
