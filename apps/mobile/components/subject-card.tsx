import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { SubjectWithCount } from '@eduotaga/types';
import { CATEGORIES } from '@eduotaga/constants';
import { Card } from '@/components/card';
import { useThemeColors } from '@/hooks/use-theme-colors';

export function SubjectCard({ subject }: { subject: SubjectWithCount }) {
  const theme = useThemeColors();
  const category = CATEGORIES[subject.categoryId];

  return (
    <Link href={{ pathname: '/subjects/[subject]', params: { subject: subject.slug } }} asChild>
      <Pressable>
        <Card style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.primary, fontSize: theme.typography.sizes.xs, fontWeight: '700' }}>
            {category.name.toUpperCase()}
          </Text>
          <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.sizes.lg, fontWeight: '600' }}>
            {subject.name}
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.sm }} numberOfLines={2}>
            {subject.description}
          </Text>
          <View>
            <Text style={{ color: theme.colors.muted, fontSize: theme.typography.sizes.xs, fontWeight: '600' }}>
              {subject.experimentCount} experiment{subject.experimentCount === 1 ? '' : 's'}
            </Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
