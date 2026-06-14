const ALLOWED_RETURN_PREFIXES = ['/admin/finance', '/admin/students/'] as const;

/** Accept only known internal admin paths — blocks open redirects. */
export function isSafeInternalReturnPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (path.includes('://') || path.includes('\\')) return false;
  return ALLOWED_RETURN_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function sanitizeReturnTo(
  path: string | null | undefined,
  fallback = '/admin/finance',
): string {
  return isSafeInternalReturnPath(path) ? path! : fallback;
}

export function appendReturnTo(href: string, returnTo?: string | null): string {
  const safe = returnTo && isSafeInternalReturnPath(returnTo) ? returnTo : null;
  if (!safe) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}returnTo=${encodeURIComponent(safe)}`;
}
