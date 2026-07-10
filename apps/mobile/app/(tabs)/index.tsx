import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { CATEGORY_LIST, SITE_NAME } from '@eduotaga/constants';
import { SectionHeading } from '@/components/section-heading';
import { ExperimentCard } from '@/components/experiment-card';
import { useExperiments } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function HomeScreen() {
  const theme = useThemeColors();
  const { data: experiments, isPending } = useExperiments();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.xl, paddingBottom: theme.spacing['2xl'] }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.sizes['3xl'], fontWeight: '700' }}>
          {SITE_NAME}
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.base }}>
          Learn science by doing it — free, hands-on virtual experiments.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeading eyebrow="Disciplines" title="Six labs, one app" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {CATEGORY_LIST.map((category) => (
            <Link key={category.id} href={{ pathname: '/subjects', params: { categoryId: category.id } }} asChild>
              <Pressable
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}
              >
                <Text style={{ color: theme.colors.foreground, fontWeight: '600' }}>{category.name}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeading eyebrow="Get started" title="Featured experiments" />
        {isPending ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {experiments?.slice(0, 5).map((experiment) => (
              <ExperimentCard key={experiment.id} experiment={experiment} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
