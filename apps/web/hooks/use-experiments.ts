'use client';

import { useQuery } from '@tanstack/react-query';
import { API_ROUTES } from '@eduotaga/constants';
import { unwrap } from '@eduotaga/utils';
import type { ExperimentDetail, ExperimentDifficulty, ExperimentSummary } from '@eduotaga/types';
import { apiClient } from '@/lib/api-client';

export interface UseExperimentsFilters {
  subjectId?: string;
  categoryId?: string;
  difficulty?: ExperimentDifficulty;
}

export function useExperiments(filters: UseExperimentsFilters = {}) {
  return useQuery({
    queryKey: ['experiments', filters],
    queryFn: () =>
      unwrap<ExperimentSummary[]>(apiClient.get(API_ROUTES.experiments, { params: filters })),
  });
}

export function useExperiment(slug: string) {
  return useQuery({
    queryKey: ['experiment', slug],
    queryFn: () => unwrap<ExperimentDetail>(apiClient.get(API_ROUTES.experiment(slug))),
    enabled: Boolean(slug),
  });
}
