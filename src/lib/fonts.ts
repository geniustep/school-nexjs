import { Cairo, Plus_Jakarta_Sans } from 'next/font/google';

export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
  fallback: ['Inter', 'Arial', 'sans-serif'],
});

export const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-arabic',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

