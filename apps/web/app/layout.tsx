import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SITE_DESCRIPTION, SITE_NAME } from '@eduotaga/constants';
import { JsonLd } from '@/components/seo/json-ld';
import { SITE_TITLE, SITE_URL, organizationSchema, websiteSchema } from '@/lib/seo';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider, themeInitScript } from '@/providers/theme-provider';
import { TutorProvider } from '@/providers/tutor-provider';
import { AppShell } from '@/components/layout/app-shell';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'virtual laboratory',
    'online science lab',
    'physics simulation',
    'chemistry simulation',
    'biology experiments',
    'electronics lab',
    'interactive experiments',
    'STEM education',
    'open source education',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // NOTE: no `alternates.canonical` here on purpose. Next.js metadata is
  // merged shallowly, so a canonical set on the root layout is inherited by
  // every page that doesn't override it — pointing the whole site at "/".
  // Each page declares its own via `canonical()` from lib/seo.
  // Explicit defaults: without max-image-preview:large Google will not use
  // the OG image in Discover or image-rich result layouts.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  category: 'education',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Declared once here so every page inherits the publisher and
            site-search entities; page-level graphs reference them by @id. */}
        <JsonLd schema={[organizationSchema(), websiteSchema()]} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          <QueryProvider>
            <TutorProvider>
              <AppShell>{children}</AppShell>
            </TutorProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
