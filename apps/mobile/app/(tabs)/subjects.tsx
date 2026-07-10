import { ActivityIndicator, FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SectionHeading } from '@/components/section-heading';
import { SubjectCard } from '@/components/subject-card';
import { EmptyState } from '@/components/empty-state';
import { useSubjects } from '@/hooks/use-subjects';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function SubjectsScreen() {
  const theme = useThemeColors();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { data: subjects, isPending } = useSubjects(categoryId);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
      <SectionHeading eyebrow="Subjects" title="Find your subject" description="Grouped by discipline." />

      {isPending ? (
        <ActivityIndicator style={{ marginTop: theme.spacing.lg }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
          renderItem={({ item }) => <SubjectCard subject={item} />}
          ListEmptyComponent={<EmptyState title="No subjects found" />}
        />
      )}
    </View>
  );
}
