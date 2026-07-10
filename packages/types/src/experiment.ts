import type { CategoryId } from './category';
import type { QuizQuestion } from './quiz';
import type { Video } from './video';

export type ExperimentDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type DownloadType = 'pdf' | 'doc' | 'zip' | 'image' | 'other';

export interface DownloadResource {
  id: string;
  label: string;
  /** Path relative to the experiment's public folder, e.g. "assets/worksheet.pdf". */
  path: string;
  type: DownloadType;
  sizeLabel?: string;
}

export interface ProcedureStep {
  order: number;
  title: string;
  description: string;
  imagePath?: string;
}

/**
 * Raw record as stored in `apps/web/data/experiments.json`.
 * `simulationEntry` is relative to `public/experiments/<categoryId>/<slug>/`
 * and defaults to "index.html" — see docs/adding-experiments.md.
 */
export interface Experiment {
  id: string;
  slug: string;
  title: string;
  subjectId: string;
  categoryId: CategoryId;
  difficulty: ExperimentDifficulty;
  summary: string;
  theory: string;
  procedure: ProcedureStep[];
  observation: string;
  simulationEntry: string;
  videoIds: string[];
  downloads: DownloadResource[];
  quiz: QuizQuestion[];
  tags: string[];
  estimatedDurationMinutes?: number;
  thumbnailPath?: string;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight shape used for listing/search results. */
export interface ExperimentSummary {
  id: string;
  slug: string;
  title: string;
  subjectId: string;
  subjectName: string;
  categoryId: CategoryId;
  difficulty: ExperimentDifficulty;
  summary: string;
  thumbnailUrl?: string;
  tags: string[];
}

/** Fully hydrated shape returned by `GET /api/experiments/[slug]`. */
export interface ExperimentDetail
  extends Omit<Experiment, 'videoIds' | 'simulationEntry'> {
  subject: {
    id: string;
    slug: string;
    name: string;
  };
  /** Fully resolved, ready-to-embed URL for the iframe/WebView. */
  simulationUrl: string;
  /** False until a folder matching the experiment's slug is added under public/experiments/. */
  simulationAvailable: boolean;
  videos: Video[];
}
