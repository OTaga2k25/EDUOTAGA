import { useState } from 'react';
import { ScrollView, Text, View, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { CATEGORIES } from '@eduotaga/constants';
import type { ExperimentSummary } from '@eduotaga/types';
import { SectionHeading } from '@/components/section-heading';
import { SubjectAccordion } from '@/components/subject-accordion';
import { EmptyState } from '@/components/empty-state';
import { useExperiments } from '@/hooks/use-experiments';
import { useThemeColors } from '@/hooks/use-theme-colors';

function groupByCategoryAndSubject(experiments: ExperimentSummary[]) {
  const result: Record<string, {
    categoryName: string;
    subjects: Record<string, { subjectName: string; experiments: ExperimentSummary[] }>;
  }> = {};

  for (const exp of experiments) {
    if (!result[exp.categoryId]) {
      const cat = CATEGORIES[exp.categoryId as keyof typeof CATEGORIES];
      result[exp.categoryId] = {
        categoryName: cat?.name ?? exp.categoryId,
        subjects: {},
      };
    }
    const category = result[exp.categoryId];
    if (!category.subjects[exp.subjectId]) {
      category.subjects[exp.subjectId] = { subjectName: exp.subjectName, experiments: [] };
    }
    category.subjects[exp.subjectId].experiments.push(exp);
  }

  return result;
}

const ORDER = ['physics', 'chemistry', 'biology'];
const orderOf = (id: string) => (ORDER.indexOf(id) < 0 ? 99 : ORDER.indexOf(id));
const CAT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  physics: 'planet', chemistry: 'flask', biology: 'leaf', electronics: 'hardware-chip',
  mechanical: 'cog', mathematics: 'calculator', marine: 'boat', computer: 'code-slash',
};
const CAT_BG: Record<string, string> = {
  physics: '#d8b4fe', chemistry: '#fdba74', biology: '#f9a8d4', electronics: '#6ee7b7',
  mechanical: '#fde047', mathematics: '#93c5fd', marine: '#67e8f9', computer: '#a5b4fc',
};

function CategoryCard({ id, name, description, topics, labs, hasNew, onPress }: {
  id: string; name: string; description?: string; topics: string[]; labs: number; hasNew: boolean; onPress: () => void;
}) {
  const theme = useThemeColors();
  const shown = topics.slice(0, 4);
  const pill = { borderWidth: 2, borderColor: theme.colors.foreground, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 };
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}: ${labs} labs`}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface, borderColor: theme.colors.foreground, borderWidth: 2, borderRadius: theme.radii.xl,
        padding: theme.spacing.lg, shadowColor: theme.colors.foreground, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5,
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ width: 60, height: 60, borderRadius: 16, borderWidth: 2, borderColor: '#000', backgroundColor: CAT_BG[id] ?? '#ffde59', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={CAT_ICON[id] ?? 'sparkles'} size={30} color="#000" />
        </View>
        {hasNew && (
          <View style={{ ...pill, backgroundColor: '#ffde59', borderColor: '#000' }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#000' }}>★ NEW LABS</Text>
          </View>
        )}
      </View>
      <Text style={{ marginTop: theme.spacing.md, fontSize: 28, fontWeight: '900', color: theme.colors.foreground }}>{name}</Text>
      {description ? <Text style={{ marginTop: 4, color: theme.colors.muted, fontSize: theme.typography.sizes.sm, fontWeight: '600' }}>{description}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.md }}>
        <View style={pill}><Text style={{ fontSize: 12, fontWeight: '900', color: theme.colors.foreground }}>{labs} {labs === 1 ? 'lab' : 'labs'}</Text></View>
        <View style={{ ...pill, backgroundColor: 'rgba(255,222,89,0.35)' }}><Text style={{ fontSize: 12, fontWeight: '900', color: theme.colors.foreground }}>{topics.length} {topics.length === 1 ? 'topic' : 'topics'}</Text></View>
      </View>
      <View style={{ marginTop: theme.spacing.md, gap: 4 }}>
        {shown.map((t) => (
          <Text key={t} numberOfLines={1} style={{ color: theme.colors.foreground, fontSize: theme.typography.sizes.sm, fontWeight: '700' }}>•  {t}</Text>
        ))}
        {topics.length > shown.length && <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '700', paddingLeft: 14 }}>+{topics.length - shown.length} more</Text>}
      </View>
      <View style={{ marginTop: theme.spacing.lg, backgroundColor: theme.colors.foreground, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: theme.colors.background, fontWeight: '900', fontSize: 15 }}>Open {name} labs</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.background} />
      </View>
    </Pressable>
  );
}

export default function ExperimentsScreen() {
  const theme = useThemeColors();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const [selected, setSelected] = useState<string | null>(params.categoryId && params.categoryId in CATEGORIES ? params.categoryId : null);
  const { data: experiments = [], isPending, refetch, isRefetching } = useExperiments({});
  const insets = useSafeAreaInsets();

  const grouped = groupByCategoryAndSubject(experiments);
  const ordered = Object.entries(grouped).sort(([a], [b]) => orderOf(a) - orderOf(b));
  const current = selected ? grouped[selected] : undefined;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ maxWidth: 800, width: '100%', alignSelf: 'center', padding: theme.spacing.md, paddingTop: Math.max(insets.top, theme.spacing.md), paddingBottom: theme.spacing['2xl'] }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
    >
      {isPending ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : experiments.length === 0 ? (
        <View style={{ marginTop: theme.spacing.xl }}>
          <EmptyState title="No experiments found" />
        </View>
      ) : !selected || !current ? (
        <View>
          <SectionHeading eyebrow="Experiments" title="Choose a subject" description="Tap a subject to see all its virtual labs." />
          <View style={{ gap: theme.spacing.lg }}>
            {ordered.map(([catId, category]) => {
              const subs = Object.values(category.subjects);
              return (
                <CategoryCard key={catId} id={catId} name={category.categoryName}
                  description={CATEGORIES[catId as keyof typeof CATEGORIES]?.description}
                  topics={subs.map((s) => s.subjectName)}
                  labs={subs.reduce((n, s) => n + s.experiments.length, 0)}
                  hasNew={subs.some((s) => s.experiments.some((e) => e.isNew))}
                  onPress={() => setSelected(catId)} />
              );
            })}
          </View>
        </View>
      ) : (
        <View>
          <Pressable onPress={() => setSelected(null)} accessibilityRole="button"
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: theme.colors.foreground, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginBottom: theme.spacing.md }}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.foreground} />
            <Text style={{ color: theme.colors.foreground, fontWeight: '900' }}>All subjects</Text>
          </Pressable>
          <SectionHeading eyebrow="Experiments" title={`${current.categoryName} labs`} description={CATEGORIES[selected as keyof typeof CATEGORIES]?.description} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: theme.spacing.md }}>
            {ordered.map(([catId, category]) => {
              const on = catId === selected;
              return (
                <Pressable key={catId} onPress={() => setSelected(catId)} accessibilityState={{ selected: on }}
                  style={{ borderWidth: 2, borderColor: theme.colors.foreground, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: on ? theme.colors.foreground : 'transparent' }}>
                  <Text style={{ fontWeight: '900', color: on ? theme.colors.background : theme.colors.foreground }}>{category.categoryName}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ gap: theme.spacing.md }}>
            {Object.entries(current.subjects).map(([subId, subject]) => (
              <SubjectAccordion key={subId} subjectName={subject.subjectName} experiments={subject.experiments} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
