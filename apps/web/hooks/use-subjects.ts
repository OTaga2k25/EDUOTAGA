'use client';

import { useQuery } from '@tanstack/react-query';
import { API_ROUTES } from '@eduotaga/constants';
import { unwrap } from '@eduotaga/utils';
import type { SubjectWithCount } from '@eduotaga/types';
import { apiClient } from '@/lib/api-client';

export function useSubjects(categoryId?: string) {
  return useQuery({
    queryKey: ['subjects', categoryId ?? 'all'],
    queryFn: () =>
      unwrap<SubjectWithCount[]>(
        apiClient.get(API_ROUTES.subjects, { params: categoryId ? { categoryId } : undefined }),
      ),
  });
}

export function useSubject(slug: string) {
  return useQuery({
    queryKey: ['subject', slug],
    queryFn: () => unwrap<SubjectWithCount>(apiClient.get(API_ROUTES.subject(slug))),
    enabled: Boolean(slug),
  });
}
