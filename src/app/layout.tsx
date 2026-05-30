import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart School Connect',
  description: 'School communication and daily operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // dir is fixed to ltr for v1; the stylesheet uses logical properties so
  // switching to rtl (Arabic) later only requires changing this attribute.
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
