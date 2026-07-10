import { View } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function ProgressBar({ percent }: { percent: number }) {
  const theme = useThemeColors();

  return (
    <View style={{ height: 8, borderRadius: theme.radii.full, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
      <View
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, percent))}%`,
          borderRadius: theme.radii.full,
          backgroundColor: theme.colors.primary,
        }}
      />
    </View>
  );
}
