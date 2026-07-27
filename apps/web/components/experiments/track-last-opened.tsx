'use client';

import { useEffect } from 'react';

export function TrackLastOpened({ slug }: { slug: string }) {
  useEffect(() => {
    localStorage.setItem('eduotaga-last-opened', slug);
  }, [slug]);

  return null;
}
