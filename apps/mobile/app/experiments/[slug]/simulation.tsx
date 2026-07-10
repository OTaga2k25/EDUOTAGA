import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { EmptyState } from '@/components/empty-state';
import { useExperiment } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

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
      <WebView source={{ uri: experiment.simulationUrl }} startInLoadingState allowsInlineMediaPlayback />
    </View>
  );
}
