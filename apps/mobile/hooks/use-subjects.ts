import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useSubjects(categoryId?: string) {
  return useQuery({
    queryKey: ['subjects', categoryId ?? 'all'],
    queryFn: () => api.getSubjects(categoryId),
  });
}

export function useSubject(slug: string) {
  return useQuery({
    queryKey: ['subject', slug],
    queryFn: () => api.getSubject(slug),
    enabled: Boolean(slug),
  });
}
