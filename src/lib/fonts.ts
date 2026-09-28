/**
 * Build-safe font class tokens.
 *
 * Do not use next/font/google here: production builds must not depend on
 * outbound access to Google Fonts. The global stylesheet owns the resilient
 * local/system font stacks for RTL and LTR documents.
 */
export const plusJakarta = {
  variable: 'font-latin-system',
} as const;

export const cairo = {
  variable: 'font-arabic-system',
} as const;
