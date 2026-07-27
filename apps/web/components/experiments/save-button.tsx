'use client';

import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@eduotaga/ui/web';

export function SaveButton({ experimentId }: { experimentId: string }) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedIds = JSON.parse(localStorage.getItem('eduotaga-mylab') || '[]');
    setSaved(savedIds.includes(experimentId));
  }, [experimentId]);

  const toggleSave = () => {
    const savedIds = JSON.parse(localStorage.getItem('eduotaga-mylab') || '[]');
    let newIds;
    if (savedIds.includes(experimentId)) {
      newIds = savedIds.filter((id: string) => id !== experimentId);
      setSaved(false);
    } else {
      newIds = [...savedIds, experimentId];
      setSaved(true);
    }
    localStorage.setItem('eduotaga-mylab', JSON.stringify(newIds));
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleSave}
      aria-label={saved ? 'Remove from My Lab' : 'Save to My Lab'}
      className={cn(
        'flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition-all',
        saved
          ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-white dark:text-black dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none'
          : 'border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-zinc-900 dark:text-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
      )}
    >
      <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
