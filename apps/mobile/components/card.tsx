import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useThemeColors();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
