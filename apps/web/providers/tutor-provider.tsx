'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { TutorChatMessage, TutorContext as TutorPageContext } from '@eduotaga/types';

interface TutorContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: TutorChatMessage[];
  addMessage: (message: TutorChatMessage) => void;
  pageContext: TutorPageContext | null;
  setPageContext: (context: TutorPageContext | null) => void;
}

const TutorContext = createContext<TutorContextValue | null>(null);

export function TutorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [pageContext, setPageContext] = useState<TutorPageContext | null>(null);

  const addMessage = useCallback((message: TutorChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((prev) => !prev),
      messages,
      addMessage,
      pageContext,
      setPageContext,
    }),
    [isOpen, messages, addMessage, pageContext],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error('useTutor must be used within a TutorProvider');
  return ctx;
}
