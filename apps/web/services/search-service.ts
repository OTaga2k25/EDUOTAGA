import { scoreTextMatch } from '@eduotaga/utils';
import type { SearchResultItem } from '@eduotaga/types';
import { getExperiments, getSubjects, getVideos } from '@/lib/data';

const MAX_RESULTS = 20;

export async function search(query: string): Promise<SearchResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [experiments, subjects, videos] = await Promise.all([
    getExperiments(),
    getSubjects(),
    getVideos(),
  ]);
  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));

  const scored: Array<{ item: SearchResultItem; score: number }> = [];

  for (const experiment of experiments) {
    const score = scoreTextMatch(trimmed, {
      title: experiment.title,
      body: [
        experiment.summary,
        experiment.theory,
        ...experiment.tags,
        experiment.categoryId,
        subjectNameById.get(experiment.subjectId) ?? '',
      ],
    });
    if (score > 0) {
      scored.push({
        score,
        item: {
          type: 'experiment',
          id: experiment.id,
          slug: experiment.slug,
          title: experiment.title,
          description: experiment.summary,
          url: `/experiments/${experiment.slug}`,
          subjectName: subjectNameById.get(experiment.subjectId),
        },
      });
    }
  }

  for (const subject of subjects) {
    const score = scoreTextMatch(trimmed, { title: subject.name, body: [subject.description] });
    if (score > 0) {
      scored.push({
        score,
        item: {
          type: 'subject',
          id: subject.id,
          slug: subject.slug,
          title: subject.name,
          description: subject.description,
          url: `/subjects/${subject.slug}`,
        },
      });
    }
  }

  for (const video of videos) {
    const score = scoreTextMatch(trimmed, { title: video.title, body: [video.description ?? ''] });
    if (score > 0) {
      const experiment = experiments.find((e) => e.id === video.experimentId);
      scored.push({
        score,
        item: {
          type: 'video',
          id: video.id,
          slug: experiment?.slug ?? video.id,
          title: video.title,
          description: video.description ?? '',
          url: experiment ? `/experiments/${experiment.slug}` : '#',
          subjectName: experiment ? subjectNameById.get(experiment.subjectId) : undefined,
        },
      });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((entry) => entry.item);
}
