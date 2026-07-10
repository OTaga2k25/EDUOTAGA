import { useColorScheme } from 'react-native';
import { getTheme } from '@/constants/theme';

export function useThemeColors() {
  const scheme = useColorScheme();
  return getTheme(scheme === 'dark' ? 'dark' : 'light');
}
