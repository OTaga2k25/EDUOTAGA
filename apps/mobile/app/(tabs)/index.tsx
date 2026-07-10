import { ActivityIndicator, Pressable, ScrollView, Text, View, Image, useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  CATEGORY_LIST,
  MOCK_CONTINUE_LEARNING,
  MOCK_DASHBOARD_STATS,
} from '@eduotaga/constants';
import { SectionHeading } from '@/components/section-heading';
import { ContinueLearningCard } from '@/components/continue-learning-card';
import { ExperimentListItem } from '@/components/experiment-list-item';
import { DotGridBackground } from '@/components/dot-grid-background';
import { useExperiments } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function HomeScreen() {
  const theme = useThemeColors();
  const isDark = useColorScheme() === 'dark';
  const { data: experiments, isPending } = useExperiments();

  const continueExperiment =
    experiments?.find((experiment) => experiment.slug === MOCK_CONTINUE_LEARNING.experimentSlug) ??
    experiments?.[0];
  const popular = experiments?.slice(0, 4) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {isDark && <DotGridBackground color="#333333" />}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.xl, paddingBottom: theme.spacing['2xl'] }}
      >
      <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, borderWidth: 2, borderColor: theme.colors.foreground, overflow: 'hidden', padding: theme.spacing.lg, minHeight: 160, justifyContent: 'center', shadowColor: theme.colors.foreground, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
        <View style={{ width: '66%', zIndex: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.foreground, marginBottom: 6 }}>
            Welcome to edUOtaga 👋
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: theme.colors.foreground, lineHeight: 28 }}>
            Let's learn something new today!
          </Text>
        </View>
        <Image
          source={require('../../assets/images/boy.png')}
          style={{ position: 'absolute', right: -10, bottom: -10, width: 180, height: 180, resizeMode: 'contain' }}
        />
      </View>

      <Link href="/search" asChild>
        <Pressable style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.foreground, borderRadius: theme.radii.xl, paddingHorizontal: 20, height: 64, shadowColor: theme.colors.foreground, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
          <Ionicons name="search" size={24} color={theme.colors.muted} style={{ marginRight: 14 }} />
          <Text style={{ flex: 1, color: theme.colors.muted, fontSize: 16, fontWeight: '600' }}>Search experiments, topics...</Text>
          <Ionicons name="options" size={24} color={theme.colors.foreground} style={{ marginLeft: 14 }} />
        </Pressable>
      </Link>

      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.foreground }}>Continue Learning</Text>
          <Link href={"/experiments" as any} style={{ color: theme.colors.primary, fontWeight: '700', fontSize: theme.typography.sizes.sm }}>View all</Link>
        </View>
        {isPending ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          continueExperiment && (
            <ContinueLearningCard
              experiment={continueExperiment}
              progressPercent={MOCK_CONTINUE_LEARNING.progressPercent}
            />
          )
        )}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.foreground }}>Subjects</Text>
          <Link href="/subjects" style={{ color: theme.colors.primary, fontWeight: '700', fontSize: theme.typography.sizes.sm }}>View all</Link>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[
            { name: 'Physics', icon: 'planet', bg: '#c4b5fd', categoryId: 'physics' },
            { name: 'Chemistry', icon: 'flask', bg: '#fb923c', categoryId: 'chemistry' },
            { name: 'Electronics', icon: 'hardware-chip', bg: '#86efac', categoryId: 'electronics' },
            { name: 'Mechanical', icon: 'settings', bg: '#fde047', categoryId: 'mechanical' },
          ].map(sub => (
            <Link key={sub.name} href={{ pathname: '/experiments', params: { categoryId: sub.categoryId } }} asChild>
              <Pressable style={{ width: '23%', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: sub.bg, width: '100%', aspectRatio: 1, borderRadius: theme.radii.xl, borderWidth: 2, borderColor: theme.colors.foreground, alignItems: 'center', justifyContent: 'center', shadowColor: theme.colors.foreground, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
                  <Ionicons name={sub.icon as any} size={32} color={theme.colors.foreground} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', textAlign: 'center', color: theme.colors.foreground }}>{sub.name}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.foreground }}>Popular Experiments</Text>
          <Link href={"/experiments" as any} style={{ color: theme.colors.primary, fontWeight: '700', fontSize: theme.typography.sizes.sm }}>View all</Link>
        </View>
        {isPending ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {popular.map((experiment) => (
              <ExperimentListItem key={experiment.id} experiment={experiment} />
            ))}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}
