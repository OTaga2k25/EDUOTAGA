import { ScrollView, Text, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { CATEGORIES } from '@eduotaga/constants';
import type { ExperimentSummary } from '@eduotaga/types';
import { SectionHeading } from '@/components/section-heading';
import { SubjectAccordion } from '@/components/subject-accordion';
import { EmptyState } from '@/components/empty-state';
import { useExperiments } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

function groupByCategoryAndSubject(experiments: ExperimentSummary[]) {
  const result: Record<string, {
    categoryName: string;
    subjects: Record<string, { subjectName: string; experiments: ExperimentSummary[] }>;
  }> = {};

  for (const exp of experiments) {
    if (!result[exp.categoryId]) {
      const cat = CATEGORIES[exp.categoryId as keyof typeof CATEGORIES];
      result[exp.categoryId] = {
        categoryName: cat?.name ?? exp.categoryId,
        subjects: {},
      };
    }
    const category = result[exp.categoryId];
    if (!category.subjects[exp.subjectId]) {
      category.subjects[exp.subjectId] = { subjectName: exp.subjectName, experiments: [] };
    }
    category.subjects[exp.subjectId].experiments.push(exp);
  }

  return result;
}

export default function ExperimentsScreen() {
  const theme = useThemeColors();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { data: experiments = [], isPending, refetch, isRefetching } = useExperiments({ categoryId });
  const insets = useSafeAreaInsets();

  const grouped = groupByCategoryAndSubject(experiments);

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
        {isPending ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : experiments.length === 0 ? (
          <View style={{ marginTop: theme.spacing.xl }}>
            <EmptyState title="No experiments found" />
        </View>
      ) : (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.xl }}>
          {Object.entries(grouped).map(([catId, category]) => (
            <View key={catId}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.foreground, marginBottom: theme.spacing.md }}>
                {category.categoryName}
              </Text>
              <View style={{ gap: theme.spacing.md }}>
                {Object.entries(category.subjects).map(([subId, subject]) => (
                  <SubjectAccordion
                    key={subId}
                    subjectName={subject.subjectName}
                    experiments={subject.experiments}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      </ScrollView>
  );
}
