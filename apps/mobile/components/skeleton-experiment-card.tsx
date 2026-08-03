import { View } from 'react-native';
import { Skeleton } from './skeleton';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function SkeletonExperimentCard() {
  const theme = useThemeColors();
  
  return (
    <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, borderWidth: 2, borderColor: theme.colors.foreground, padding: 16, minHeight: 160, flexDirection: 'column', justifyContent: 'space-between', opacity: 0.7 }}>
      <View>
        <Skeleton style={{ width: '80%', height: 20, marginBottom: 8 }} />
        <Skeleton style={{ width: '50%', height: 16 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
        <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
      </View>
    </View>
  );
}
