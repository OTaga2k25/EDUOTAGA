import { createApiClient } from '@eduotaga/utils';

/** Relative baseURL — resolves against the current origin in both the browser and SSR fetches. */
export const apiClient = createApiClient();
