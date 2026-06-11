/** Public paths for Raqeem brand SVG assets (served from /public/brand). */
export const BRAND_ASSETS = {
  /** Full horizontal wordmark — login, sidebar header, wide areas. */
  full: '/brand/raqeem.svg',
  /** Compact mark — small spaces, favicon, collapsed sidebar. */
  mark: '/brand/logo.svg',
} as const;

/** Intrinsic dimensions from source SVG viewBox (for layout / aspect ratio). */
export const BRAND_DIMENSIONS = {
  full: { width: 710, height: 278 },
  mark: { width: 113, height: 113 },
} as const;
