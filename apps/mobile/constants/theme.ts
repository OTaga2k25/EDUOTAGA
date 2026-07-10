import { colors, radii, spacing, typography } from '@eduotaga/ui';

export type ThemeMode = 'light' | 'dark';

export function getTheme(mode: ThemeMode) {
  return {
    colors: colors[mode],
    radii,
    spacing,
    typography,
  };
}

export { colors, radii, spacing, typography };
