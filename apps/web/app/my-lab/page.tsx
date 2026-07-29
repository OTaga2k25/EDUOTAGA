import type { Metadata } from 'next';
import { getExperiments, getSubjects } from '@/lib/data';
import { MyLabClient } from './my-lab-client';
import type { ExperimentSummary } from '@eduotaga/types';

export const metadata: Metadata = {
  title: 'My Lab | edUOtaga',
  description: 'Your saved experiments and simulations.',
};

export default async function MyLabPage() {
  const allExperiments = await getExperiments();
  const subjects = await getSubjects();

  const summaries: ExperimentSummary[] = allExperiments.map((exp) => ({
    id: exp.id,
    slug: exp.slug,
    title: exp.title,
    subjectId: exp.subjectId,
    subjectName: subjects.find((s) => s.id === exp.subjectId)?.name || 'Unknown',
    categoryId: exp.categoryId,
    difficulty: exp.difficulty,
    summary: exp.summary,
    thumbnailUrl: exp.thumbnailPath,
    tags: exp.tags,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
          My Lab
        </h1>
        <p className="mt-2 text-lg text-muted">
          Your personal collection of saved experiments.
        </p>
      </div>

      <MyLabClient allExperiments={summaries} />
    </div>
  );
}
