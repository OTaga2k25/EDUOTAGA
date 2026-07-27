'use client';

import { useMutation } from '@tanstack/react-query';
import { unwrap } from '@eduotaga/utils';
import type { TutorChatRequest, TutorChatResponse } from '@eduotaga/types';
import { apiClient } from '@/lib/api-client';

export function useTutorChat() {
  return useMutation({
    mutationFn: (body: TutorChatRequest) =>
      unwrap<TutorChatResponse>(apiClient.post('/api/tutor/chat', body)),
  });
}
