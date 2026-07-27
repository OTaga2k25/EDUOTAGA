import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { TutorChatRequest } from '@eduotaga/types';

export function useTutorChat() {
  return useMutation({
    mutationFn: (body: TutorChatRequest) => api.tutorChat(body),
  });
}
