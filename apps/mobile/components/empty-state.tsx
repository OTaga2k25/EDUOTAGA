import { Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  const theme = useThemeColors();

  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.colors.border,
        borderRadius: theme.radii.lg,
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text style={{ color: theme.colors.foreground, fontWeight: '600', fontSize: theme.typography.sizes.base }}>
        {title}
      </Text>
      {description && (
        <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.sm, textAlign: 'center' }}>
          {description}
        </Text>
      )}
    </View>
  );
}
