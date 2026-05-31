import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/features/i18n/locale-context';

export const metadata: Metadata = {
  title: 'Smart School Connect',
  description: 'School communication and daily operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
