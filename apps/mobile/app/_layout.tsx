import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { QueryProvider } from '@/providers/query-provider';
import { MyLabProvider } from '@/hooks/use-my-lab';

// Always start in light mode, whatever the device theme is.
// The header toggle can still switch to dark for the session.
// Guarded: setColorScheme is unavailable on some runtimes (e.g. Expo Go).
try {
  Appearance.setColorScheme?.('light');
} catch {
  // Fall back to following the device theme.
}

export default function RootLayout() {
  const theme = useThemeColors();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <MyLabProvider>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.foreground,
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="subjects/[subject]" options={{ title: 'Subject' }} />
              <Stack.Screen name="experiments/[slug]/index" options={{ title: 'Experiment' }} />
            </Stack>
            <StatusBar style="auto" />
          </MyLabProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
