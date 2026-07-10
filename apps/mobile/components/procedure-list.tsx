import { Text, View } from 'react-native';
import type { ProcedureStep } from '@eduotaga/types';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function ProcedureList({ steps }: { steps: ProcedureStep[] }) {
  const theme = useThemeColors();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {[...steps]
        .sort((a, b) => a.order - b.order)
        .map((step) => (
          <View
            key={step.order}
            style={{
              flexDirection: 'row',
              gap: theme.spacing.sm,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              padding: theme.spacing.sm,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                backgroundColor: `${theme.colors.primary}1A`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: theme.typography.sizes.sm }}>
                {step.order}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: theme.colors.foreground, fontWeight: '600' }}>{step.title}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.sm }}>
                {step.description}
              </Text>
            </View>
          </View>
        ))}
    </View>
  );
}
