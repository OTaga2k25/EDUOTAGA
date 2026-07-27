/** Route paths for the Next.js Route Handlers, shared so the web app,
 * the mobile app, and the API client all agree on the contract. */
export const API_ROUTES = {
  subjects: '/api/subjects',
  subject: (slug: string) => `/api/subjects/${slug}`,
  experiments: '/api/experiments',
  experiment: (slug: string) => `/api/experiments/${slug}`,
  theory: (slug: string) => `/api/theory/${slug}`,
  videos: '/api/videos',
  videosByExperiment: (experimentId: string) => `/api/videos?experimentId=${experimentId}`,
  search: (query: string) => `/api/search?q=${encodeURIComponent(query)}`,
  tutorChat: '/api/tutor/chat',
} as const;

/**
 * Builds the public URL for an experiment's simulation entry point.
 * Mirrors `apps/web/public/experiments/<categoryId>/<slug>/<entry>`.
 */
export function buildSimulationUrl(
  categoryId: string,
  slug: string,
  entry: string,
  baseUrl = '',
): string {
  return `${baseUrl}/experiments/${categoryId}/${slug}/${entry}`;
}
