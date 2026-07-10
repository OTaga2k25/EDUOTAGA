import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

export interface SegmentedTab {
  id: string;
  label: string;
  content: ReactNode;
}

export function SegmentedTabs({ tabs }: { tabs: SegmentedTab[] }) {
  const theme = useThemeColors();
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.xs, paddingBottom: theme.spacing.sm }}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActive(tab.id)}
              style={{
                borderRadius: theme.radii.full,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                backgroundColor: isActive ? theme.colors.primary : 'transparent',
                borderWidth: isActive ? 0 : 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: isActive ? theme.colors.primaryForeground : theme.colors.muted,
                  fontWeight: '600',
                  fontSize: theme.typography.sizes.sm,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingTop: theme.spacing.sm }}>{tabs.find((tab) => tab.id === active)?.content}</View>
    </View>
  );
}
