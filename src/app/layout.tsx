import type { Metadata } from 'next';
import './globals.css';
import { VercelWebAnalytics } from '@/components/analytics/vercel-web-analytics';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { cairo, plusJakarta } from '@/lib/fonts';
import { OPERATIONAL_ROBOTS_METADATA } from '@/lib/seo/operational-indexing';

export const metadata: Metadata = {
  title: {
    default: 'رَقِيم — Raqeem',
    template: '%s | رَقِيم',
  },
  description:
    'منصة رَقِيم للإدارة المدرسية · Raqeem School Management Platform',
  robots: OPERATIONAL_ROBOTS_METADATA,
  icons: {
    icon: [{ url: '/brand/logo.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/brand/logo.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${cairo.variable}`}>
        <LocaleProvider>{children}</LocaleProvider>
        <VercelWebAnalytics />
      </body>
    </html>
  );
}

