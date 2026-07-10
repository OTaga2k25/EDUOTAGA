import { ActivityIndicator, FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SectionHeading } from '@/components/section-heading';
import { ExperimentCard } from '@/components/experiment-card';
import { EmptyState } from '@/components/empty-state';
import { useSubject } from '@/hooks/use-subjects';
import { useExperiments } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function SubjectScreen() {
  const theme = useThemeColors();
  const { subject: slug } = useLocalSearchParams<{ subject: string }>();
  const { data: subject, isPending: isSubjectPending } = useSubject(slug);
  const { data: experiments, isPending: areExperimentsPending } = useExperiments({ subjectId: subject?.id });

  if (isSubjectPending) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
      {subject && <SectionHeading eyebrow={subject.name} title="Experiments" description={subject.description} />}

      {areExperimentsPending ? (
        <ActivityIndicator style={{ marginTop: theme.spacing.lg }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={experiments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
          renderItem={({ item }) => <ExperimentCard experiment={item} />}
          ListEmptyComponent={<EmptyState title="No experiments yet" />}
        />
      )}
    </View>
  );
}
