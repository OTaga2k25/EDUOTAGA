import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { EmptyState } from '@/components/empty-state';
import { useExperiment } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTrackLastOpened } from '@/hooks/use-last-opened';

/**
 * simulationUrl comes back from the API as a root-relative path
 * (e.g. "/experiments/physics/bendinglight/index.html") — correct for a
 * same-origin <iframe> on the website, but a bare WebView has no origin
 * to resolve it against and falls back to file://, which is blocked.
 * Resolve it against the same host the app already fetches the API from.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

function resolveSimulationUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_BASE_URL}${url}`;
}

export default function ExperimentScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: experiment, isPending } = useExperiment(slug);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useTrackLastOpened(experiment?.slug);

  const exitFullscreen = useCallback(() => setIsFullscreen(false), []);

  // Android hardware back should leave fullscreen first, not the screen —
  // otherwise the only way out is a button the user just hid the chrome around.
  useEffect(() => {
    if (!isFullscreen) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      exitFullscreen();
      return true; // handled; don't pop the navigation stack
    });

    return () => subscription.remove();
  }, [isFullscreen, exitFullscreen]);

  if (isPending || !experiment) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const showSimulation = experiment.simulationAvailable;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Hiding the navigation header is what actually buys the vertical space. */}
      <Stack.Screen options={{ headerShown: !isFullscreen }} />
      <StatusBar style="auto" hidden={isFullscreen} />

      {!isFullscreen && (
        <View style={{ padding: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
          <Text
            style={{
              color: theme.colors.foreground,
              fontSize: theme.typography.sizes.xl,
              fontWeight: '700',
              marginTop: theme.spacing.sm,
            }}
          >
            {experiment.title}
          </Text>
          <Text style={{ color: theme.colors.muted, marginTop: 4 }}>{experiment.summary}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {showSimulation ? (
          <WebView
            source={{ uri: resolveSimulationUrl(experiment.simulationUrl) }}
            startInLoadingState
            allowsInlineMediaPlayback
            // Lets a simulation that requests fullscreen from inside get it.
            allowsFullscreenVideo
          />
        ) : (
          <View style={{ padding: theme.spacing.md }}>
            <EmptyState
              title="Simulation coming soon"
              description="This experiment's interactive simulation hasn't been added yet."
            />
          </View>
        )}
      </View>

      {showSimulation && (
        <Pressable
          onPress={() => setIsFullscreen((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={isFullscreen ? 'Exit fullscreen' : 'View simulation fullscreen'}
          hitSlop={8}
          style={{
            position: 'absolute',
            right: theme.spacing.md,
            // With the header hidden there is nothing keeping the button clear
            // of the notch, so inset it manually.
            top: (isFullscreen ? insets.top : 0) + theme.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingHorizontal: theme.spacing.sm + 2,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radii.full,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            // Keep it legible over whatever the simulation draws underneath.
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <Ionicons
            name={isFullscreen ? 'contract-outline' : 'expand-outline'}
            size={18}
            color={theme.colors.foreground}
          />
          <Text
            style={{
              color: theme.colors.foreground,
              fontSize: theme.typography.sizes.sm,
              fontWeight: '600',
            }}
          >
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
