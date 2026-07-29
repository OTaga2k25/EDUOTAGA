import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_OPENED_KEY = 'eduotaga-last-opened';

export function useTrackLastOpened(slug: string | undefined) {
  useEffect(() => {
    if (!slug) return;
    AsyncStorage.setItem(LAST_OPENED_KEY, slug).catch(() => {});
  }, [slug]);
}

export function useLastOpenedSlug() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LAST_OPENED_KEY)
      .then((value) => {
        if (!cancelled) setSlug(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return slug;
}
