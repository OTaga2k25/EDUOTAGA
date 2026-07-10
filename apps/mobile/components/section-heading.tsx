import { Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  const theme = useThemeColors();

  return (
    <View style={{ gap: 4 }}>
      {eyebrow && (
        <Text style={{ color: theme.colors.primary, fontSize: theme.typography.sizes.sm, fontWeight: '700' }}>
          {eyebrow.toUpperCase()}
        </Text>
      )}
      <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.sizes['2xl'], fontWeight: '700' }}>
        {title}
      </Text>
      {description && (
        <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.base }}>{description}</Text>
      )}
    </View>
  );
}
