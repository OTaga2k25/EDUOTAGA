import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

const ICONS = { index: '🏠', subjects: '🧪', search: '🔍' } as const;

export default function TabsLayout() {
  const theme = useThemeColors();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.foreground,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name as keyof typeof ICONS]}</Text>,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="subjects" options={{ title: 'Subjects' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
    </Tabs>
  );
}
