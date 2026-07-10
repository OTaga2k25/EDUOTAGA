import { Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const theme = useThemeColors();
  const toneColor = tone === 'neutral' ? theme.colors.muted : theme.colors[tone];

  return (
    <View
      style={{
        backgroundColor: `${toneColor}1A`,
        borderRadius: theme.radii.full,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: toneColor, fontSize: theme.typography.sizes.xs, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}
