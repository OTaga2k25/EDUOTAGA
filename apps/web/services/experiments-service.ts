import { buildSimulationUrl } from '@eduotaga/constants';
import type { ExperimentDetail, ExperimentDifficulty, ExperimentSummary } from '@eduotaga/types';
import {
  findExperimentBySlug,
  findVideosByExperimentId,
  getExperiments,
  getSubjects,
  simulationExists,
} from '@/lib/data';

export interface ListExperimentsFilters {
  subjectId?: string;
  categoryId?: string;
  difficulty?: ExperimentDifficulty;
}

function toSummary(
  experiment: Awaited<ReturnType<typeof getExperiments>>[number],
  subjectName: string,
): ExperimentSummary {
  return {
    id: experiment.id,
    slug: experiment.slug,
    title: experiment.title,
    subjectId: experiment.subjectId,
    subjectName,
    categoryId: experiment.categoryId,
    difficulty: experiment.difficulty,
    summary: experiment.summary,
    thumbnailUrl: experiment.thumbnailPath
      ? buildSimulationUrl(experiment.categoryId, experiment.slug, experiment.thumbnailPath)
      : undefined,
    tags: experiment.tags,
  };
}

export async function listExperiments(filters: ListExperimentsFilters = {}): Promise<ExperimentSummary[]> {
  const [experiments, subjects] = await Promise.all([getExperiments(), getSubjects()]);
  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));

  return experiments
    .filter((experiment) => !filters.subjectId || experiment.subjectId === filters.subjectId)
    .filter((experiment) => !filters.categoryId || experiment.categoryId === filters.categoryId)
    .filter((experiment) => !filters.difficulty || experiment.difficulty === filters.difficulty)
    .map((experiment) => toSummary(experiment, subjectNameById.get(experiment.subjectId) ?? 'Unknown'));
}

export async function getExperimentDetail(slug: string): Promise<ExperimentDetail | null> {
  const experiment = await findExperimentBySlug(slug);
  if (!experiment) return null;

  const [subjects, videos] = await Promise.all([
    getSubjects(),
    findVideosByExperimentId(experiment.id),
  ]);
  const subject = subjects.find((s) => s.id === experiment.subjectId);
  if (!subject) return null;

  const { videoIds: _videoIds, simulationEntry, ...rest } = experiment;
  void _videoIds;

  return {
    ...rest,
    subject: { id: subject.id, slug: subject.slug, name: subject.name },
    simulationUrl: buildSimulationUrl(experiment.categoryId, experiment.slug, simulationEntry),
    simulationAvailable: simulationExists(experiment.categoryId, experiment.slug, simulationEntry),
    videos,
  };
}

export async function getTheoryBySlug(slug: string) {
  const experiment = await findExperimentBySlug(slug);
  if (!experiment) return null;

  return {
    slug: experiment.slug,
    title: experiment.title,
    theory: experiment.theory,
    procedure: experiment.procedure,
    observation: experiment.observation,
  };
}
