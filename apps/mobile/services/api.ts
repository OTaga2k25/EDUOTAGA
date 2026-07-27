import { API_ROUTES } from '@eduotaga/constants';
import { createApiClient, unwrap } from '@eduotaga/utils';
import type {
  ExperimentDetail,
  ExperimentDifficulty,
  ExperimentSummary,
  SearchResultItem,
  SubjectWithCount,
  TutorChatRequest,
  TutorChatResponse,
} from '@eduotaga/types';

/**
 * Points at the deployed EDUOTAGA website — the mobile app has no backend
 * of its own, it consumes the same Next.js Route Handlers as the browser.
 * Set EXPO_PUBLIC_API_URL in `.env` (see apps/mobile/.env.example).
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const client = createApiClient(API_BASE_URL);

export const api = {
  getSubjects: (categoryId?: string) =>
    unwrap<SubjectWithCount[]>(
      client.get(API_ROUTES.subjects, { params: categoryId ? { categoryId } : undefined }),
    ),

  getSubject: (slug: string) => unwrap<SubjectWithCount>(client.get(API_ROUTES.subject(slug))),

  getExperiments: (filters: { subjectId?: string; categoryId?: string; difficulty?: ExperimentDifficulty } = {}) =>
    unwrap<ExperimentSummary[]>(client.get(API_ROUTES.experiments, { params: filters })),

  getExperiment: (slug: string) => unwrap<ExperimentDetail>(client.get(API_ROUTES.experiment(slug))),

  search: (query: string) => unwrap<SearchResultItem[]>(client.get(API_ROUTES.search(query))),

  tutorChat: (body: TutorChatRequest) =>
    unwrap<TutorChatResponse>(client.post(API_ROUTES.tutorChat, body)),
};
