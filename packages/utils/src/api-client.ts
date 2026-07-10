import axios, { type AxiosInstance } from 'axios';
import type { ApiResponse } from '@eduotaga/types';

export class ApiRequestError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Creates an axios instance for talking to the EDUOTAGA Next.js API.
 * - Web passes no `baseURL` (relative `/api/...` on the same origin).
 * - Mobile passes the deployed site URL, e.g. `EXPO_PUBLIC_API_URL`.
 */
export function createApiClient(baseURL?: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 15_000,
    headers: { Accept: 'application/json' },
  });
}

/** Unwraps the `{ success, data }` / `{ success, error }` envelope used by every route handler. */
export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: payload } = await promise;
  if (!payload.success) {
    throw new ApiRequestError(payload.error.message, payload.error.code);
  }
  return payload.data;
}
