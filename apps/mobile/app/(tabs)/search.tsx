import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { useSearch } from '@/hooks/use-search';
import { useThemeColors } from '@/hooks/use-theme-colors';

const TYPE_LABEL = { experiment: 'Experiment', subject: 'Subject', video: 'Video' } as const;

export default function SearchScreen() {
  const theme = useThemeColors();
  const [query, setQuery] = useState('');
  const { data: results, isFetching } = useSearch(query);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
      <SectionHeading eyebrow="Search" title="Search EDUOTAGA" />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search experiments, subjects, videos…"
        placeholderTextColor={theme.colors.muted}
        style={{
          marginTop: theme.spacing.md,
          height: 48,
          borderRadius: theme.radii.full,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.spacing.md,
          color: theme.colors.foreground,
          backgroundColor: theme.colors.surface,
        }}
      />

      {isFetching && <ActivityIndicator style={{ marginTop: theme.spacing.md }} color={theme.colors.primary} />}

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        renderItem={({ item }) => (
          <Link
            href={
              item.type === 'subject'
                ? { pathname: '/subjects/[subject]', params: { subject: item.slug } }
                : { pathname: '/experiments/[slug]', params: { slug: item.slug } }
            }
            asChild
          >
            <Pressable
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.md,
                padding: theme.spacing.sm,
                gap: 4,
              }}
            >
              <Badge label={TYPE_LABEL[item.type]} tone="primary" />
              <Text style={{ color: theme.colors.foreground, fontWeight: '600' }}>{item.title}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.sm }} numberOfLines={2}>
                {item.description}
              </Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          query.trim().length > 1 && !isFetching ? (
            <EmptyState title="No results" description="Try a different search term." />
          ) : null
        }
      />
    </View>
  );
}
