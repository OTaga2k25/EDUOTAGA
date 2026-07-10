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
          borderColor: theme.colors.foreground,
          borderWidth: 2,
          borderRadius: theme.radii.xl,
          padding: theme.spacing.md,
          shadowColor: theme.colors.foreground,
          shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
