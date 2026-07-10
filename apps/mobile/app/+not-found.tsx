import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function NotFoundScreen() {
  const theme = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.background,
          padding: theme.spacing.lg,
        }}
      >
        <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.sizes.xl, fontWeight: '700' }}>
          This screen doesn't exist.
        </Text>
        <Link href="/" style={{ color: theme.colors.primary, fontWeight: '600' }}>
          Go to home screen
        </Link>
      </View>
    </>
  );
}
