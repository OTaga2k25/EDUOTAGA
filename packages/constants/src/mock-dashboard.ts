/**
 * DEMO DATA ONLY — everything in this file is a placeholder for the
 * dashboard UI until real authentication and progress tracking ship
 * (see docs/roadmap.md and packages/types/src/future.ts). Nothing here
 * is read from or written to any user's real activity.
 *
 * Once auth + `ExperimentProgress` are wired up, delete this file and
 * replace its call sites with real queries.
 */

export const MOCK_CURRENT_USER = {
  name: 'Ada',
  initials: 'A',
};

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  delta: string;
  icon: string;
}

export const MOCK_DASHBOARD_STATS: DashboardStat[] = [
  { id: 'completed', label: 'Experiments completed', value: '24', delta: '+12%', icon: '🧪' },
  { id: 'hours', label: 'Hours learned', value: '48.5', delta: '+8%', icon: '⏱️' },
  { id: 'badges', label: 'Badges earned', value: '12', delta: '+4%', icon: '🏅' },
  { id: 'streak', label: 'Current streak', value: '7 days', delta: 'Keep it up!', icon: '🔥' },
];

export interface LearningPathStep {
  id: string;
  order: number;
  label: string;
  description: string;
}

export const LEARNING_PATH_STEPS: LearningPathStep[] = [
  { id: 'theory', order: 1, label: 'Theory', description: 'Learn the concepts' },
  { id: 'simulation', order: 2, label: 'Simulation', description: 'Practice virtually' },
  { id: 'videos', order: 3, label: 'Videos', description: 'Watch & understand' },
  { id: 'quiz', order: 4, label: 'Quiz', description: 'Test your knowledge' },
];

/** Which real experiment the "Continue learning" card points at, plus a fake progress value. */
export const MOCK_CONTINUE_LEARNING = {
  experimentSlug: 'ohms-law',
  progressPercent: 75,
};

/** Placeholder star ratings keyed by experiment slug, until real reviews/ratings ship. */
export const MOCK_RATINGS: Record<string, number> = {
  'ohms-law': 4.8,
  'series-parallel-circuits': 4.6,
  'acid-base-titration': 4.8,
  'cell-structure-observation': 4.5,
  'logic-gates-basics': 4.7,
  'lever-mechanical-advantage': 4.4,
  'inclined-plane-friction': 4.3,
  'graphing-linear-equations': 4.6,
};

export const DEFAULT_MOCK_RATING = 4.5;
