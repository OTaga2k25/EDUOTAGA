import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { EmptyState } from '@/components/empty-state';
import { useExperiment } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

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

export default function SimulationScreen() {
  const theme = useThemeColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: experiment, isPending } = useExperiment(slug);

  if (isPending || !experiment) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!experiment.simulationAvailable) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md, justifyContent: 'center' }}>
        <EmptyState
          title="Simulation coming soon"
          description="This experiment's interactive simulation hasn't been added yet."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <WebView source={{ uri: resolveSimulationUrl(experiment.simulationUrl) }} startInLoadingState allowsInlineMediaPlayback />
    </View>
  );
}
