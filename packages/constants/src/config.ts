export const SITE_NAME = 'EDUOTAGA';

export const SITE_DESCRIPTION =
  'An open-source virtual laboratory platform for physics, chemistry, biology, electronics, mechanical, and mathematics experiments.';

export const ANDROID_PACKAGE_NAME = 'com.otagaworks.eduotaga';

/** Live Play Store listing. Keep in sync with `android.package` in apps/mobile/app.json. */
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;

/** Overridden by NEXT_PUBLIC_SITE_URL / EXPO_PUBLIC_API_URL at build time. */
export const DEFAULT_WEB_URL = 'http://localhost:3000';

export const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
} as const;

export const PAGE_SIZE_DEFAULT = 12;
