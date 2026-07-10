'use client';

import { useState } from 'react';
import { Badge, EmptyState } from '@eduotaga/ui/web';
import type { QuizQuestion } from '@eduotaga/types';

export function QuizBlock({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (questions.length === 0) {
    return <EmptyState title="No quiz yet" description="A knowledge check will appear here soon." />;
  }

  return (
    <div className="flex flex-col gap-6">
      {questions.map((question) => {
        const selected = answers[question.id];
        const isCorrect = selected === question.correctOptionId;

        return (
          <div key={question.id} className="rounded-2xl border border-border p-5">
            <p className="font-medium text-foreground">{question.question}</p>
            <div className="mt-4 flex flex-col gap-2">
              {question.options.map((option) => {
                const isSelected = selected === option.id;
                const showCorrect = selected && option.id === question.correctOptionId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                      showCorrect
                        ? 'border-success bg-success/10'
                        : isSelected
                          ? 'border-danger bg-danger/10'
                          : 'border-border hover:bg-border/30'
                    }`}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>
            {selected && (
              <div className="mt-3 flex items-center gap-2">
                <Badge tone={isCorrect ? 'success' : 'danger'}>
                  {isCorrect ? 'Correct' : 'Not quite'}
                </Badge>
                {question.explanation && <p className="text-sm text-muted">{question.explanation}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
