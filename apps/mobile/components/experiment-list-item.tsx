import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_MOCK_RATING, MOCK_RATINGS } from '@eduotaga/constants';
import type { ExperimentSummary } from '@eduotaga/types';
import { useThemeColors } from '@/hooks/use-theme-colors';

const CATEGORY_ICONS = {
  physics: 'planet',
  chemistry: 'flask',
  biology: 'leaf',
  electronics: 'hardware-chip',
  mechanical: 'settings',
  mathematics: 'calculator',
} as const;

const CATEGORY_COLORS = {
  physics: '#c4b5fd',
  chemistry: '#fb923c',
  biology: '#86efac',
  electronics: '#86efac',
  mechanical: '#fde047',
  mathematics: '#93c5fd',
} as const;

export function ExperimentListItem({ experiment }: { experiment: ExperimentSummary }) {
  const theme = useThemeColors();
  const rating = MOCK_RATINGS[experiment.slug] ?? DEFAULT_MOCK_RATING;

  return (
    <Link href={{ pathname: '/experiments/[slug]', params: { slug: experiment.slug } }} asChild>
      <Pressable>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, borderWidth: 2, borderColor: theme.colors.foreground, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: theme.colors.foreground, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radii.lg,
              backgroundColor: CATEGORY_COLORS[experiment.categoryId],
              borderWidth: 2,
              borderColor: theme.colors.foreground,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <Ionicons name={CATEGORY_ICONS[experiment.categoryId] as any} size={32} color={theme.colors.foreground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.foreground, fontWeight: '900', fontSize: 16, marginBottom: 2 }} numberOfLines={1}>
              {experiment.title}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '700' }}>
              {experiment.subjectName}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="star" size={14} color="#eab308" />
            <Text style={{ color: theme.colors.foreground, fontWeight: '900', fontSize: 14 }}>
              {rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
