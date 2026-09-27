'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Bot, Lightbulb, HelpCircle, Mic } from 'lucide-react';
import { useTutor } from '@/providers/tutor-provider';

export function TutorPanel() {
  const { isOpen, close } = useTutor();
  const panelRef = useRef<HTMLDivElement>(null);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="shadow-neo dark:bg-surface fixed right-4 bottom-24 z-50 flex h-[30rem] max-h-[75vh] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border-2 border-black bg-white dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
        >
          {/* ── Header ── */}
          <div className="bg-primary text-primary-foreground flex items-center justify-between border-b-2 border-black px-4 py-3 dark:border-white">
            <div className="flex items-center gap-2 text-base font-black">
              <Sparkles className="h-5 w-5" />
              AI Tutor
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-neo-yellow rounded-full border border-black px-2 py-0.5 text-[10px] font-black text-black uppercase">
                Coming Soon
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close tutor"
                className="rounded-lg p-1 transition-opacity hover:opacity-70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ── Body: Coming Soon State ── */}
          <div className="flex flex-1 flex-col items-center justify-between overflow-y-auto p-6 text-center">
            <div className="flex flex-col items-center">
              {/* Icon badge */}
              <div className="bg-neo-yellow shadow-neo flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black dark:border-white">
                <Bot className="h-9 w-9 text-black" />
              </div>

              <h3 className="text-foreground mt-4 text-xl font-black">AI Tutor is Coming Soon!</h3>

              <p className="text-muted mt-2 max-w-[280px] text-xs leading-relaxed font-semibold">
                We&apos;re building a personalized AI lab assistant to guide you through
                simulations, answer questions, and explain science concepts in real time.
              </p>

              {/* Feature teaser pills */}
              <div className="mt-5 flex w-full flex-col gap-2.5 text-left">
                <div className="text-foreground flex items-center gap-3 rounded-xl border-2 border-black/15 bg-black/[0.02] p-2.5 text-xs font-bold dark:border-white/20 dark:bg-white/[0.04]">
                  <span className="bg-neo-green/40 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black text-black dark:border-white/30">
                    <Lightbulb className="h-4 w-4" />
                  </span>
                  <span>Interactive lab hints & step walkthroughs</span>
                </div>

                <div className="text-foreground flex items-center gap-3 rounded-xl border-2 border-black/15 bg-black/[0.02] p-2.5 text-xs font-bold dark:border-white/20 dark:bg-white/[0.04]">
                  <span className="bg-neo-purple/40 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black text-black dark:border-white/30">
                    <HelpCircle className="h-4 w-4" />
                  </span>
                  <span>Instant theory, formula & concept explanations</span>
                </div>

                <div className="text-foreground flex items-center gap-3 rounded-xl border-2 border-black/15 bg-black/[0.02] p-2.5 text-xs font-bold dark:border-white/20 dark:bg-white/[0.04]">
                  <span className="bg-neo-blue/30 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black text-black dark:border-white/30">
                    <Mic className="h-4 w-4" />
                  </span>
                  <span>Voice and text conversational guidance</span>
                </div>
              </div>
            </div>

            {/* Close / Action button */}
            <div className="mt-6 w-full border-t border-black/10 pt-3 dark:border-white/10">
              <button
                type="button"
                onClick={close}
                className="neo-btn w-full py-2.5 text-sm font-black"
              >
                Got it, take me back to labs
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
