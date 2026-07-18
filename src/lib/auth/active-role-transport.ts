/**
 * Canonical active-role transport — request context only.
 * Odoo remains the authority for ownership and permissions.
 * Does not persist role to session/cookie/database.
 */

export const LEGAL_ACTIVE_ROLES = ['admin', 'teacher', 'parent', 'student'] as const;

export type LegalActiveRole = (typeof LEGAL_ACTIVE_ROLES)[number];

export const ACTIVE_ROLE_HEADER = 'X-SSC-Active-Role';

export type ActiveRoleResolveErrorCode = 'invalid_active_role' | 'active_role_conflict';

export type ActiveRoleResolveResult =
  | { ok: true; role: LegalActiveRole | undefined }
  | { ok: false; code: ActiveRoleResolveErrorCode; message: string };

const LEGAL_SET = new Set<string>(LEGAL_ACTIVE_ROLES);

function normalizeRoleCandidate(raw: string | null | undefined): {
  present: boolean;
  value: string | undefined;
  legal: boolean;
} {
  if (raw == null) return { present: false, value: undefined, legal: false };
  const trimmed = raw.trim();
  if (!trimmed) return { present: false, value: undefined, legal: false };
  const value = trimmed.toLowerCase();
  return { present: true, value, legal: LEGAL_SET.has(value) };
}

/** Read active-role header case-insensitively from a Headers-like object. */
export function readActiveRoleHeader(
  headers: Headers | { get(name: string): string | null },
): string | null {
  // Headers.get is case-insensitive per Fetch spec.
  return headers.get(ACTIVE_ROLE_HEADER) ?? headers.get('x-ssc-active-role');
}

/**
 * Resolve a single canonical active role from optional header + query values.
 * - Missing both → undefined (Odoo default)
 * - Illegal non-empty → invalid_active_role
 * - Both present and different → active_role_conflict
 * - Ownership is never decided here
 */
export function resolveActiveRoleTransport(input: {
  headerValue?: string | null;
  queryValue?: string | null;
}): ActiveRoleResolveResult {
  const header = normalizeRoleCandidate(input.headerValue);
  const query = normalizeRoleCandidate(input.queryValue);

  if (header.present && !header.legal) {
    return {
      ok: false,
      code: 'invalid_active_role',
      message: 'Invalid active role.',
    };
  }
  if (query.present && !query.legal) {
    return {
      ok: false,
      code: 'invalid_active_role',
      message: 'Invalid active role.',
    };
  }

  if (header.present && query.present && header.value !== query.value) {
    return {
      ok: false,
      code: 'active_role_conflict',
      message: 'Conflicting active role values.',
    };
  }

  const value = (header.value ?? query.value) as LegalActiveRole | undefined;
  if (!value) return { ok: true, role: undefined };
  return { ok: true, role: value };
}

/** Resolve from a Request / NextRequest. */
export function resolveActiveRoleFromRequest(request: {
  headers: Headers;
  nextUrl?: { searchParams: URLSearchParams };
  url?: string;
}): ActiveRoleResolveResult {
  const headerValue = readActiveRoleHeader(request.headers);
  let queryValue: string | null = null;
  if (request.nextUrl?.searchParams) {
    queryValue = request.nextUrl.searchParams.get('active_role');
  } else if (request.url) {
    try {
      queryValue = new URL(request.url).searchParams.get('active_role');
    } catch {
      queryValue = null;
    }
  }
  return resolveActiveRoleTransport({ headerValue, queryValue });
}

export function activeRoleErrorBody(code: ActiveRoleResolveErrorCode, message: string) {
  return {
    success: false as const,
    error: { code, message, details: {} },
    meta: {},
  };
}

/** Stable cache-key segment for React cache(getCurrentUser). */
export function activeRoleCacheKey(role: LegalActiveRole | undefined): string {
  return role ?? '';
}
