import { Pressable, Text, View, Image } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ExperimentSummary } from '@eduotaga/types';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function ContinueLearningCard({
  experiment,
  progressPercent,
}: {
  experiment: ExperimentSummary;
  progressPercent: number;
}) {
  const theme = useThemeColors();

  return (
    <Link href={{ pathname: '/experiments/[slug]', params: { slug: experiment.slug } }} asChild>
      <Pressable>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, borderWidth: 2, borderColor: theme.colors.foreground, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: theme.colors.foreground, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }}>
          
          {/* Image Box */}
          <View style={{ width: 80, height: 80, backgroundColor: '#c4b5fd', borderRadius: theme.radii.lg, borderWidth: 2, borderColor: theme.colors.foreground, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            <Image source={require('../assets/images/boy.png')} style={{ width: 100, height: 100, opacity: 0.5, resizeMode: 'cover' }} />
          </View>
          
          {/* Content */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.foreground, marginBottom: 2 }}>{experiment.title}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.muted, marginBottom: 8 }}>{experiment.subjectName}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
               <View style={{ flex: 1, height: 8, backgroundColor: theme.colors.surface, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.foreground, overflow: 'hidden' }}>
                 <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: theme.colors.primary, borderRightWidth: 1, borderColor: theme.colors.foreground }} />
               </View>
               <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.foreground, width: 32 }}>{progressPercent}%</Text>
            </View>
          </View>
          
          {/* Arrow Button */}
          <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.foreground, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }}>
             <Ionicons name="arrow-forward" size={16} color={theme.colors.foreground} />
          </View>

        </View>
      </Pressable>
    </Link>
  );
}
