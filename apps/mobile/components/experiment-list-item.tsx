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
  marine: 'boat',
  computer: 'desktop',
} as const;

const CATEGORY_COLORS = {
  physics: '#c4b5fd',
  chemistry: '#fb923c',
  biology: '#86efac',
  electronics: '#86efac',
  mechanical: '#fde047',
  mathematics: '#93c5fd',
  marine: '#67e8f9',
  computer: '#d8b4fe',
} as const;

import { useMyLab } from '@/hooks/use-my-lab';

export function ExperimentListItem({ experiment }: { experiment: ExperimentSummary }) {
  const theme = useThemeColors();
  const { isSaved, toggleSave } = useMyLab();
  const saved = isSaved(experiment.id);

  return (
    <Link href={{ pathname: '/experiments/[slug]', params: { slug: experiment.slug } }} asChild>
      <Pressable>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, borderWidth: 2, borderColor: theme.colors.foreground, padding: 16, minHeight: 160, flexDirection: 'column', justifyContent: 'space-between', shadowColor: theme.colors.foreground, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ flex: 1, color: theme.colors.foreground, fontWeight: '900', fontSize: 16, marginBottom: 4 }} numberOfLines={2}>
                {experiment.title}
              </Text>
              <Pressable onPress={() => toggleSave(experiment.id)} hitSlop={8} style={{ marginLeft: 8 }}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? theme.colors.primary : theme.colors.foreground} />
              </Pressable>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: 16 }}>
            <Ionicons name={CATEGORY_ICONS[experiment.categoryId] as any} size={40} color={theme.colors.foreground} style={{ opacity: 0.7 }} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
