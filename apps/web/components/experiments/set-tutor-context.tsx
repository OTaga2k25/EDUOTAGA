'use client';

import { useEffect } from 'react';
import { useTutor } from '@/providers/tutor-provider';

interface SetTutorContextProps {
  experimentSlug: string;
  experimentTitle: string;
  subjectId: string;
  categoryId: string;
}

export function SetTutorContext({ experimentSlug, experimentTitle, subjectId, categoryId }: SetTutorContextProps) {
  const { setPageContext } = useTutor();

  useEffect(() => {
    setPageContext({ experimentSlug, experimentTitle, subjectId, categoryId });
    return () => setPageContext(null);
  }, [experimentSlug, experimentTitle, subjectId, categoryId, setPageContext]);

  return null;
}
