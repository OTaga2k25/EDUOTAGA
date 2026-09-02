import { ImageResponse } from 'next/og';
import { SITE_DESCRIPTION, SITE_NAME } from '@eduotaga/constants';

export const alt = `${SITE_NAME} - Open Virtual Laboratory`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Default social card, inherited by every route that doesn't define its own.
 * Rendered at build time by Satori, so it must stay on system-safe fonts and
 * plain flexbox layout — no external assets, no CSS grid.
 */
export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0B1120',
          color: '#FFFFFF',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#60A5FA',
            fontWeight: 700,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: 24,
          }}
        >
          Open Virtual Laboratory
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            lineHeight: 1.4,
            marginTop: 28,
            color: '#94A3B8',
            maxWidth: 900,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 'auto',
            fontSize: 26,
            color: '#60A5FA',
            fontWeight: 600,
          }}
        >
          edu.otaga.in
        </div>
      </div>
    ),
    size,
  );
}
