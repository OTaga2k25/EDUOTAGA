import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SITE_DESCRIPTION, SITE_NAME } from '@eduotaga/constants';
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — Open Virtual Laboratory`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Open Virtual Laboratory`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Open Virtual Laboratory`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
