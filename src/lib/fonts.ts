import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';

export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
  fallback: ['Inter', 'Arial', 'sans-serif'],
});

export const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
  fallback: ['Cairo', 'Arial', 'sans-serif'],
});
