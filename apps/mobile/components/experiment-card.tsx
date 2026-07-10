import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { ExperimentSummary } from '@eduotaga/types';
import { DIFFICULTY_LABELS } from '@eduotaga/constants';
import { Card } from '@/components/card';
import { Badge } from '@/components/badge';
import { useThemeColors } from '@/hooks/use-theme-colors';

const DIFFICULTY_TONE = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
} as const;

export function ExperimentCard({ experiment }: { experiment: ExperimentSummary }) {
  const theme = useThemeColors();

  return (
    <Link href={{ pathname: '/experiments/[slug]', params: { slug: experiment.slug } }} asChild>
      <Pressable>
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge label={experiment.subjectName} tone="primary" />
            <Badge label={DIFFICULTY_LABELS[experiment.difficulty]} tone={DIFFICULTY_TONE[experiment.difficulty]} />
          </View>
          <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.sizes.lg, fontWeight: '600' }}>
            {experiment.title}
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.sm }} numberOfLines={2}>
            {experiment.summary}
          </Text>
        </Card>
      </Pressable>
    </Link>
  );
}
