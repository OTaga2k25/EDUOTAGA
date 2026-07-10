/**
 * Design tokens shared by the web (Tailwind `@theme` in globals.css) and
 * mobile (React Native `StyleSheet`) apps. Change a value here, then
 * mirror it in `apps/web/app/globals.css` and `apps/mobile/constants/theme.ts`
 * — there is no build step that syncs these automatically (see
 * docs/architecture.md § Shared UI).
 */

export const colors = {
  light: {
    background: '#fbfaf8',
    surface: '#ffffff',
    foreground: '#1c1917',
    muted: '#78716c',
    border: '#e7e5e4',
    primary: '#4f46e5',
    primaryForeground: '#ffffff',
    accent: '#0d9488',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
  },
  dark: {
    background: '#111113',
    surface: '#18181b',
    foreground: '#f4f4f5',
    muted: '#a1a1aa',
    border: '#27272a',
    primary: '#818cf8',
    primaryForeground: '#111113',
    accent: '#2dd4bf',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
  },
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const typography = {
  fontFamily: 'Inter',
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
} as const;

export const difficultyColor: Record<'beginner' | 'intermediate' | 'advanced', keyof typeof colors.light> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};
