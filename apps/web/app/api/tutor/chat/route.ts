import type { NextRequest } from 'next/server';
import { apiOk, apiError } from '@/lib/api-response';
import { sendTutorMessage } from '@/services/tutor-service';
import type { TutorChatRequest } from '@eduotaga/types';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as TutorChatRequest;

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return apiError('messages is required', 'invalid_request', 400);
  }

  try {
    const result = await sendTutorMessage(body);
    return apiOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tutor request failed';
    return apiError(message, 'tutor_error', 502);
  }
}
