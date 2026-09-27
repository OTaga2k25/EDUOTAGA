'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { EmptyState } from '@eduotaga/ui/web';

/**
 * `inline`  — sized to the simulation, in the page flow.
 * `native`  — the browser's real fullscreen (Fullscreen API).
 * `overlay` — a fixed, viewport-filling panel. The fallback for browsers with
 *             no element-level Fullscreen API, most notably Safari on iPhone,
 *             where `requestFullscreen` does not exist at all.
 */
type ViewMode = 'inline' | 'native' | 'overlay';

/** Vendor-prefixed Fullscreen API, still needed for older WebKit. */
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export function SimulationFrame({
  simulationUrl,
  available,
  title,
  fullHeight,
}: {
  simulationUrl: string;
  available: boolean;
  title: string;
  fullHeight?: boolean;
}) {
  const [frameHeight, setFrameHeight] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<ViewMode>('inline');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const isFullscreen = mode !== 'inline';

  const handleLoad = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const doc = iframeRef.current.contentWindow.document;
        if (!doc.body) return;

        const win = doc.defaultView;
        const bodyStyle = win ? win.getComputedStyle(doc.body) : null;
        const htmlStyle = win ? win.getComputedStyle(doc.documentElement) : null;

        const isImmersiveCSS =
          bodyStyle?.overflowY === 'hidden' ||
          bodyStyle?.overflow === 'hidden' ||
          htmlStyle?.overflowY === 'hidden' ||
          htmlStyle?.overflow === 'hidden' ||
          doc.body.style.height === '100%' ||
          doc.documentElement.style.height === '100%';

        if (fullHeight && isImmersiveCSS) {
          // It's a 100%-height immersive canvas / workbench app
          observerRef.current?.disconnect();
          setFrameHeight(undefined);
          return;
        }

        const getDocHeight = () => {
          return (
            Math.max(
              doc.body.scrollHeight || 0,
              doc.documentElement.scrollHeight || 0,
              doc.body.offsetHeight || 0,
              doc.documentElement.offsetHeight || 0,
              doc.body.clientHeight || 0,
              doc.documentElement.clientHeight || 0,
            ) + 16
          );
        };

        let lastHeight = getDocHeight();
        let consecutiveExpansions = 0;
        setFrameHeight(lastHeight);

        // Track dynamic height changes (e.g. from web fonts or mobile wrapping)
        observerRef.current?.disconnect();
        const observer = new ResizeObserver(() => {
          const newHeight = getDocHeight();
          if (newHeight === lastHeight) return;

          // Prevent runaway feedback loop where iframe container expansion triggers doc expansion
          if (newHeight > lastHeight && newHeight - lastHeight <= 48) {
            consecutiveExpansions++;
            if (consecutiveExpansions > 2) {
              observer.disconnect();
              return;
            }
          } else {
            consecutiveExpansions = 0;
          }

          lastHeight = newHeight;
          setFrameHeight(newHeight);
        });

        observer.observe(doc.body);
        if (doc.documentElement) observer.observe(doc.documentElement);
        observerRef.current = observer;
      }
    } catch (e) {
      console.warn('SimulationFrame height calculation failed:', e);
      // Ignore cross-origin errors if any
    }
  };

  // The observer lives on the iframe's document, which outlives a re-render —
  // without this it keeps firing setState after the frame is gone.
  useEffect(() => () => observerRef.current?.disconnect(), []);

  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current as FullscreenElement | null;
    if (!el) return;

    const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
    if (!request) {
      // No element-level Fullscreen API (iPhone Safari) — use the overlay.
      setMode('overlay');
      return;
    }

    try {
      await request.call(el);
      setMode('native');
    } catch {
      // Also rejected when the gesture isn't trusted or permissions deny it.
      setMode('overlay');
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      try {
        await (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
      } catch {
        // Ignore — the state sync below still returns us to inline.
      }
    }
    setMode('inline');
  }, []);

  // Keep React in sync when the user leaves fullscreen by other means
  // (Esc, F11, or the browser's own chrome).
  useEffect(() => {
    const onChange = () => {
      const doc = document as FullscreenDocument;
      if (!(doc.fullscreenElement ?? doc.webkitFullscreenElement)) {
        setMode((current) => (current === 'native' ? 'inline' : current));
      }
    };

    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // Native fullscreen handles Esc itself; the overlay has to do it by hand.
  useEffect(() => {
    if (mode !== 'overlay') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('inline');
    };

    // Stop the page behind the overlay from scrolling under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mode]);

  if (!available) {
    return (
      <EmptyState
        title="Simulation coming soon"
        description="This experiment's interactive simulation hasn't been added yet. Check back soon, or contribute one — see docs/adding-experiments.md."
      />
    );
  }

  const isImmersive = fullHeight && !frameHeight;

  return (
    <div
      ref={containerRef}
      className={[
        'group bg-surface relative w-full',
        isFullscreen
          ? 'h-screen'
          : `overflow-hidden rounded-2xl border-2 border-black dark:border-white ${
              isImmersive
                ? 'h-[80svh] min-h-[520px] max-h-[760px] sm:h-[80vh] sm:min-h-[640px] sm:max-h-none'
                : ''
            }`,
        mode === 'overlay' ? 'fixed inset-0 z-[100]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      // A measured height would fight the viewport while fullscreen.
      style={!isFullscreen && frameHeight ? { height: frameHeight } : undefined}
    >
      <iframe
        ref={iframeRef}
        src={`${simulationUrl}?v=2`}
        title={`${title} simulation`}
        loading="lazy"
        onLoad={handleLoad}
        className="h-full w-full"
        style={{ border: 'none' }}
        scrolling={isImmersive ? 'no' : 'auto'}
        // Lets the simulation itself go fullscreen from inside the frame.
        allow="fullscreen"
        allowFullScreen
      />

      <button
        type="button"
        onClick={isFullscreen ? exitFullscreen : enterFullscreen}
        // Always visible rather than hover-only: on touch there is no hover,
        // and this is the control that makes a small simulation usable.
        className="focus-visible:ring-primary/50 absolute top-2 right-2 sm:top-3 sm:right-3 z-30 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border-2 border-black bg-white/95 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-black text-black shadow-md backdrop-blur transition-all active:scale-95 hover:bg-white focus-visible:ring-2 focus-visible:outline-none dark:border-white dark:bg-zinc-900/95 dark:text-white dark:hover:bg-zinc-900"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'View simulation fullscreen'}
      >
        {isFullscreen ? (
          <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
        )}
        <span className="text-xs sm:text-sm font-bold">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
      </button>

      {mode === 'overlay' && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
          Press Esc to exit
        </p>
      )}
    </div>
  );
}
