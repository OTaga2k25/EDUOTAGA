import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => api.search(trimmed),
    enabled: trimmed.length > 1,
  });
}
