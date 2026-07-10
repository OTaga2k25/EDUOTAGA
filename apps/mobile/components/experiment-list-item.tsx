import { Pressable, Text, View, Image } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_MOCK_RATING, MOCK_RATINGS } from '@eduotaga/constants';
import type { ExperimentSummary } from '@eduotaga/types';
import { useThemeColors } from '@/hooks/use-theme-colors';

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
              backgroundColor: '#A3D2F0',
              borderWidth: 2,
              borderColor: theme.colors.foreground,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <Image source={require('../assets/images/boy.png')} style={{ width: 80, height: 80, opacity: 0.5, resizeMode: 'cover' }} />
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
