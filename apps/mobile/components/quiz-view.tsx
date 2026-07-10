import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { QuizQuestion } from '@eduotaga/types';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function QuizView({ questions }: { questions: QuizQuestion[] }) {
  const theme = useThemeColors();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (questions.length === 0) {
    return <EmptyState title="No quiz yet" description="A knowledge check will appear here soon." />;
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      {questions.map((question) => {
        const selected = answers[question.id];
        const isCorrect = selected === question.correctOptionId;

        return (
          <View
            key={question.id}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              padding: theme.spacing.md,
              gap: theme.spacing.sm,
            }}
          >
            <Text style={{ color: theme.colors.foreground, fontWeight: '600' }}>{question.question}</Text>

            <View style={{ gap: theme.spacing.xs }}>
              {question.options.map((option) => {
                const isSelected = selected === option.id;
                const showCorrect = Boolean(selected) && option.id === question.correctOptionId;
                const borderColor = showCorrect
                  ? theme.colors.success
                  : isSelected
                    ? theme.colors.danger
                    : theme.colors.border;

                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                    style={{
                      borderWidth: 1,
                      borderColor,
                      borderRadius: theme.radii.md,
                      paddingVertical: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.md,
                    }}
                  >
                    <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.sizes.sm }}>
                      {option.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selected && (
              <View style={{ gap: 4 }}>
                <Badge label={isCorrect ? 'Correct' : 'Not quite'} tone={isCorrect ? 'success' : 'danger'} />
                {question.explanation && (
                  <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.sm }}>
                    {question.explanation}
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
