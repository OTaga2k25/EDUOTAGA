'use client';

import { useState } from 'react';

/** Static for now — no notifications backend yet (see docs/roadmap.md). */
export function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-border/40"
      >
        <span aria-hidden="true">🔔</span>
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-64 rounded-2xl border border-border bg-surface p-4 text-sm shadow-lg">
          <p className="font-medium text-foreground">Notifications</p>
          <p className="mt-1 text-muted">Coming soon — this will show progress and activity updates.</p>
        </div>
      )}
    </div>
  );
}
