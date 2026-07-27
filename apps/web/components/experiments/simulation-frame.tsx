'use client';

import { useState, useRef } from 'react';
import { EmptyState } from '@eduotaga/ui/web';

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleLoad = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const doc = iframeRef.current.contentWindow.document;
        if (!doc.body) return;

        const getDocHeight = () => {
          return Math.max(
            doc.body.scrollHeight || 0, doc.documentElement.scrollHeight || 0,
            doc.body.offsetHeight || 0, doc.documentElement.offsetHeight || 0,
            doc.body.clientHeight || 0, doc.documentElement.clientHeight || 0
          ) + 32; // 32px buffer for safety against mobile rendering quirks
        };

        const isImmersiveCSS = doc.defaultView 
          ? doc.defaultView.getComputedStyle(doc.body).overflowY === 'hidden'
          : false;

        if (fullHeight && isImmersiveCSS) {
          // It's a 100%-height immersive canvas app
          return;
        }

        setFrameHeight(getDocHeight());

        // Track dynamic height changes (e.g. from web fonts or mobile wrapping)
        const observer = new ResizeObserver(() => {
          setFrameHeight(getDocHeight());
        });
        observer.observe(doc.body);
        if (doc.documentElement) observer.observe(doc.documentElement);
      }
    } catch (e) {
      console.warn('SimulationFrame height calculation failed:', e);
      // Ignore cross-origin errors if any
    }
  };
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
      className={`overflow-hidden w-full rounded-2xl border-2 border-black dark:border-white bg-surface ${isImmersive ? 'h-[75vh] min-h-[600px]' : ''}`}
      style={frameHeight ? { height: frameHeight } : undefined}
    >
      <iframe
        ref={iframeRef}
        src={`${simulationUrl}?v=2`}
        title={`${title} simulation`}
        loading="lazy"
        onLoad={handleLoad}
        className="w-full h-full"
        style={{ border: 'none' }}
        scrolling="auto"
      />
    </div>
  );
}
