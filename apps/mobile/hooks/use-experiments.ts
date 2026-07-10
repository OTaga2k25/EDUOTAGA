import { useQuery } from '@tanstack/react-query';
import type { ExperimentDifficulty } from '@eduotaga/types';
import { api } from '@/services/api';

export interface UseExperimentsFilters {
  subjectId?: string;
  categoryId?: string;
  difficulty?: ExperimentDifficulty;
}

export function useExperiments(filters: UseExperimentsFilters = {}) {
  return useQuery({
    queryKey: ['experiments', filters],
    queryFn: () => api.getExperiments(filters),
  });
}

export function useExperiment(slug: string) {
  return useQuery({
    queryKey: ['experiment', slug],
    queryFn: () => api.getExperiment(slug),
    enabled: Boolean(slug),
  });
}
