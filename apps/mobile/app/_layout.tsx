import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { QueryProvider } from '@/providers/query-provider';

export default function RootLayout() {
  const theme = useThemeColors();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.foreground,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="experiments/index" options={{ title: 'Experiments' }} />
            <Stack.Screen name="subjects/[subject]" options={{ title: 'Subject' }} />
            <Stack.Screen name="experiments/[slug]/index" options={{ title: 'Experiment' }} />
          </Stack>
          <StatusBar style="auto" />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
