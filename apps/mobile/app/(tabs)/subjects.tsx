import { ActivityIndicator, FlatList, View, useColorScheme } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SectionHeading } from '@/components/section-heading';
import { SubjectCard } from '@/components/subject-card';
import { EmptyState } from '@/components/empty-state';
import { DotGridBackground } from '@/components/dot-grid-background';
import { useSubjects } from '@/hooks/use-subjects';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function SubjectsScreen() {
  const theme = useThemeColors();
  const isDark = useColorScheme() === 'dark';
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { data: subjects, isPending } = useSubjects(categoryId);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {isDark && <DotGridBackground color="#333333" />}
      <View style={{ flex: 1, padding: theme.spacing.md, gap: theme.spacing.md }}>
        <SectionHeading eyebrow="Subjects" title="Find your subject" description="Grouped by discipline." />

        {isPending ? (
          <ActivityIndicator style={{ marginTop: theme.spacing.lg }} color={theme.colors.primary} />
        ) : (
          <FlatList
            data={subjects}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}
            renderItem={({ item }) => <SubjectCard subject={item} />}
            ListEmptyComponent={<EmptyState title="No subjects found" description="Try a different category." />}
          />
        )}
      </View>
    </View>
  );
}
