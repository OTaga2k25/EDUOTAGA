import { ActivityIndicator, FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SectionHeading } from '@/components/section-heading';
import { ExperimentCard } from '@/components/experiment-card';
import { EmptyState } from '@/components/empty-state';
import { useExperiments } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function ExperimentsScreen() {
  const theme = useThemeColors();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { data: experiments, isPending } = useExperiments({ categoryId });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
      <SectionHeading eyebrow="Experiments" title="All experiments" />

      {isPending ? (
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
