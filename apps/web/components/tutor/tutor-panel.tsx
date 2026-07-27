'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, X, Sparkles } from 'lucide-react';
import { cn } from '@eduotaga/ui/web';
import { useTutor } from '@/providers/tutor-provider';
import { useTutorChat } from '@/hooks/use-tutor-chat';
import { VoiceInputButton } from '@/components/tutor/voice-input-button';

export function TutorPanel() {
  const { isOpen, close, messages, addMessage, pageContext } = useTutor();
  const { mutateAsync, isPending } = useTutorChat();
  const [input, setInput] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    const userMessage = { role: 'user' as const, content: trimmed };
    addMessage(userMessage);
    setInput('');

    try {
      const result = await mutateAsync({
        messages: [...messages, userMessage],
        context: pageContext ?? undefined,
      });
      addMessage({ role: 'assistant', content: result.reply });
    } catch {
      addMessage({ role: 'assistant', content: "Sorry, I couldn't reach the tutor. Please try again." });
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-24 right-4 z-50 flex h-[32rem] max-h-[70vh] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-surface dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        >
          <div className="flex items-center justify-between border-b-2 border-black bg-primary px-4 py-3 text-primary-foreground dark:border-white">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="h-5 w-5" />
              AI Tutor
            </div>
            <button type="button" onClick={close} aria-label="Close tutor" className="hover:opacity-70">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask me anything about the experiment you&apos;re working on.
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'max-w-[85%] rounded-xl border-2 border-black px-3 py-2 text-sm font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-white text-black dark:bg-zinc-900 dark:text-white',
                )}
              >
                {message.content}
              </div>
            ))}
            {isPending && <div className="text-sm text-muted-foreground">Thinking…</div>}
            <div ref={listEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t-2 border-black p-3 dark:border-white">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask the tutor..."
              className="h-10 flex-1 rounded-xl border-2 border-black bg-white px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none dark:border-white dark:bg-zinc-900"
            />
            <VoiceInputButton onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))} />
            <button
              type="submit"
              disabled={isPending || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
