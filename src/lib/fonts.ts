import '@fontsource-variable/cairo/wght.css';
import '@fontsource-variable/plus-jakarta-sans/wght.css';

/**
 * Fontsource bundles the actual WOFF2 assets with the application.
 * This keeps Raqeem's Cairo / Plus Jakarta Sans identity while avoiding
 * build-time network requests to Google Fonts.
 */
export const plusJakarta = {
  variable: 'font-latin-self-hosted',
} as const;

export const cairo = {
  variable: 'font-arabic-self-hosted',
} as const;
