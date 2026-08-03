import { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle, StyleProp } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useThemeColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: theme.colors.foreground,
          opacity,
          borderRadius: theme.radii.md,
        },
        style,
      ]}
    />
  );
}
