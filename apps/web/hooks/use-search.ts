'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrap } from '@eduotaga/utils';
import type { SearchResultItem } from '@eduotaga/types';
import { apiClient } from '@/lib/api-client';

export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => unwrap<SearchResultItem[]>(apiClient.get('/api/search', { params: { q: trimmed } })),
    enabled: trimmed.length > 1,
  });
}
