export interface TutorChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** What the student is currently looking at, injected so replies stay on-topic. */
export interface TutorContext {
  experimentSlug?: string;
  experimentTitle?: string;
  subjectId?: string;
  categoryId?: string;
}

export interface TutorChatRequest {
  messages: TutorChatMessage[];
  context?: TutorContext;
}

export interface TutorChatResponse {
  reply: string;
}
