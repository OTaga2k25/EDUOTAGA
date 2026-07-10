import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { DIFFICULTY_LABELS } from '@eduotaga/constants';
import { formatDuration } from '@eduotaga/utils';
import { Badge } from '@/components/badge';
import { RichText } from '@/components/rich-text';
import { ProcedureList } from '@/components/procedure-list';
import { VideoList } from '@/components/video-list';
import { QuizView } from '@/components/quiz-view';
import { EmptyState } from '@/components/empty-state';
import { SegmentedTabs } from '@/components/segmented-tabs';
import { useExperiment } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

const DIFFICULTY_TONE = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
} as const;

export default function ExperimentScreen() {
  const theme = useThemeColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: experiment, isPending } = useExperiment(slug);

  if (isPending || !experiment) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: theme.spacing['2xl'] }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Badge label={experiment.subject.name} tone="primary" />
        <Badge label={DIFFICULTY_LABELS[experiment.difficulty]} tone={DIFFICULTY_TONE[experiment.difficulty]} />
        {experiment.estimatedDurationMinutes && (
          <Badge label={formatDuration(experiment.estimatedDurationMinutes)} />
        )}
      </View>

      <Text
        style={{
          color: theme.colors.foreground,
          fontSize: theme.typography.sizes['2xl'],
          fontWeight: '700',
          marginTop: theme.spacing.sm,
        }}
      >
        {experiment.title}
      </Text>
      <Text style={{ color: theme.colors.muted, marginTop: 4 }}>{experiment.summary}</Text>

      <Link
        href={{ pathname: '/experiments/[slug]/simulation', params: { slug: experiment.slug } }}
        asChild
      >
        <Text
          style={{
            marginTop: theme.spacing.md,
            backgroundColor: experiment.simulationAvailable ? theme.colors.primary : theme.colors.border,
            color: experiment.simulationAvailable ? theme.colors.primaryForeground : theme.colors.muted,
            textAlign: 'center',
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radii.full,
            fontWeight: '700',
            overflow: 'hidden',
          }}
        >
          {experiment.simulationAvailable ? 'Open simulation' : 'Simulation coming soon'}
        </Text>
      </Link>

      <View style={{ marginTop: theme.spacing.lg }}>
        <SegmentedTabs
          tabs={[
            { id: 'theory', label: 'Theory', content: <RichText content={experiment.theory} /> },
            { id: 'procedure', label: 'Procedure', content: <ProcedureList steps={experiment.procedure} /> },
            { id: 'observation', label: 'Observation', content: <RichText content={experiment.observation} /> },
            { id: 'videos', label: 'Videos', content: <VideoList videos={experiment.videos} /> },
            {
              id: 'downloads',
              label: 'Downloads',
              content:
                experiment.downloads.length === 0 ? (
                  <EmptyState title="No downloads yet" />
                ) : (
                  <View style={{ gap: theme.spacing.xs }}>
                    {experiment.downloads.map((download) => (
                      <Text key={download.id} style={{ color: theme.colors.foreground }}>
                        {download.label}
                      </Text>
                    ))}
                  </View>
                ),
            },
            { id: 'quiz', label: 'Quiz', content: <QuizView questions={experiment.quiz} /> },
          ]}
        />
      </View>
    </ScrollView>
  );
}
