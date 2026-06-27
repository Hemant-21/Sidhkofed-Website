import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { env } from '@/config/env';
import { AppProviders } from '@/providers/app-providers';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { getMenu } from '@/lib/api/menus';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-hindi',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: 'SIDHKOFED — Jharkhand Cooperative Federation',
    template: '%s · SIDHKOFED',
  },
  description:
    'Official public portal of SIDHKOFED, the Jharkhand cooperative federation — cooperative livelihoods, programmes, public documents, tenders, procurement updates and transparency.',
  applicationName: 'SIDHKOFED',
  openGraph: {
    type: 'website',
    siteName: 'SIDHKOFED',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f5132',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Navigation is fully backend-driven (codex §4.11). Fetched once per request and
  // cached (ISR). Failures degrade to empty menus rather than breaking the page.
  const [headerMenu, footerMenu, utilityMenu] = await Promise.all([
    getMenu('header'),
    getMenu('footer'),
    getMenu('utility'),
  ]);

  return (
    <html lang="en" className={`${inter.variable} ${devanagari.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <AppProviders>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <SiteHeader headerMenu={headerMenu} utilityMenu={utilityMenu} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter footerMenu={footerMenu} />
        </AppProviders>
      </body>
    </html>
  );
}
