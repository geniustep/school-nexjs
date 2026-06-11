import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { ibmPlexArabic, plusJakarta } from '@/lib/fonts';

export const metadata: Metadata = {
  title: {
    default: 'رَقِيم — Raqeem',
    template: '%s | رَقِيم',
  },
  description:
    'منصة رَقِيم للإدارة المدرسية · Raqeem School Management Platform',
  icons: {
    icon: [{ url: '/brand/logo.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/brand/logo.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${ibmPlexArabic.variable}`}>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
