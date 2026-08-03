import { ScrollView, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeading } from '@/components/section-heading';
import { ExperimentListItem } from '@/components/experiment-list-item';
import { EmptyState } from '@/components/empty-state';
import { useExperiments } from '@/hooks/use-experiments';
import { useMyLab } from '@/hooks/use-my-lab';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function MyLabScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { savedIds } = useMyLab();
  
  // We can fetch all experiments or just the saved ones if the backend supported it.
  // For now we just filter the cached list.
  const { data: experiments = [], isPending, refetch, isRefetching } = useExperiments();
  
  const savedExperiments = experiments.filter(exp => savedIds.includes(exp.id));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ maxWidth: 800, width: '100%', alignSelf: 'center', padding: theme.spacing.md, paddingTop: Math.max(insets.top, theme.spacing.md), paddingBottom: theme.spacing['2xl'] }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >

      
      {!isPending && savedExperiments.length === 0 ? (
        <View style={{ marginTop: theme.spacing.xl }}>
          <EmptyState 
            title="Your Lab is Empty" 
            description="You haven't saved any experiments yet. Explore the library and tap 'Save' to add them here."
          />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          {savedExperiments.map((experiment) => (
            <View key={experiment.id} style={{ width: '48%' }}>
              <ExperimentListItem experiment={experiment} />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
