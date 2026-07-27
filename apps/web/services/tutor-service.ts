import type { TutorChatRequest, TutorChatResponse } from '@eduotaga/types';

/**
 * Single integration point for the trained AI backend. Until AI_TUTOR_API_URL
 * is set, returns a stubbed reply so the chat UI is fully testable without a
 * live backend. Once the AI team hands off a real endpoint, replace the stub
 * branch below with a fetch() to their API — no other file needs to change.
 */
export async function sendTutorMessage(req: TutorChatRequest): Promise<TutorChatResponse> {
  const apiUrl = process.env.AI_TUTOR_API_URL;

  if (!apiUrl) {
    const lastMessage = req.messages.at(-1)?.content ?? '';
    const topic = req.context?.experimentTitle ? ` about "${req.context.experimentTitle}"` : '';
    return {
      reply: `(stub reply — set AI_TUTOR_API_URL to connect the real tutor) I heard: "${lastMessage}"${topic}.`,
    };
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.AI_TUTOR_API_KEY ? { Authorization: `Bearer ${process.env.AI_TUTOR_API_KEY}` } : {}),
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    throw new Error(`Tutor backend responded with ${response.status}`);
  }

  return response.json() as Promise<TutorChatResponse>;
}
