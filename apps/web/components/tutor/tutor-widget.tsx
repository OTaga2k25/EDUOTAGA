'use client';

import { MessageCircle, X } from 'lucide-react';
import { useTutor } from '@/providers/tutor-provider';
import { TutorPanel } from '@/components/tutor/tutor-panel';

export function TutorWidget() {
  const { isOpen, toggle } = useTutor();

  return (
    <>
      <TutorPanel />
      <button
        type="button"
        onClick={toggle}
        aria-label={isOpen ? 'Close AI tutor' : 'Open AI tutor'}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-black bg-primary text-primary-foreground shadow-neo transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
