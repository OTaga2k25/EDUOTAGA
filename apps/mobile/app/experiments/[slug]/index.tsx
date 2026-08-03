import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { DIFFICULTY_LABELS } from '@eduotaga/constants';
import { formatDuration } from '@eduotaga/utils';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { useExperiment } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTrackLastOpened } from '@/hooks/use-last-opened';

const DIFFICULTY_TONE = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
} as const;

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
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: experiment, isPending } = useExperiment(slug);

  useTrackLastOpened(experiment?.slug);

  if (isPending || !experiment) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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

      <View style={{ flex: 1 }}>
        {experiment.simulationAvailable ? (
          <WebView
            source={{ uri: resolveSimulationUrl(experiment.simulationUrl) }}
            startInLoadingState
            allowsInlineMediaPlayback
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
    </View>
  );
}
