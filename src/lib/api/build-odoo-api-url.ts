// Single source of truth for Odoo API v1 URLs.
//
// Rule (do not duplicate elsewhere):
//   final URL = {odooBaseUrl}{apiPrefix}{path}{queryString}
//   - apiPrefix is exactly "/api/v1" (once)
//   - path is relative to apiPrefix, starts with "/", e.g. "/admin/finance/students/1/financial-overview"
//   - never embed /api/v1 inside path; never use financial_overview (underscore)
//   - BFF proxy receives path without /api/v1; odooApiFetch adds it here

import {
  assertUrlStaysUnderPathPrefix,
  canonicalizeBffPathSegments,
  type SafeBffPathResult,
} from '@/lib/api/safe-bff-path';

export function normalizeOdooApiPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  if (trimmed.startsWith('/api/v1/')) {
    return trimmed.slice('/api/v1'.length);
  }
  if (trimmed === '/api/v1') return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function buildOdooQueryString(
  query?: Record<string, string | number | undefined>,
): string {
  if (!query) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function buildOdooApiUrl(
  baseUrl: string,
  apiPrefix: string,
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const base = baseUrl.replace(/\/$/, '');
  const prefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  const normalizedPath = normalizeOdooApiPath(path);
  return `${base}${prefix}${normalizedPath}${buildOdooQueryString(query)}`;
}

/**
 * Browser → BFF proxy path from catch-all segments.
 * Rejects traversal / encoded separators; encodes each safe segment.
 */
export function buildBffProxyPath(segments: string[]): string {
  const result = canonicalizeBffPathSegments(segments);
  if (!result.ok) {
    throw new Error(`Unsafe BFF path segments: ${result.reason}`);
  }
  return result.path;
}

/** Validate catch-all segments without throwing (route handlers). */
export function tryBuildBffProxyPath(segments: string[]): SafeBffPathResult {
  return canonicalizeBffPathSegments(segments);
}

/** Confirm a built School API URL remains under `{base}/api/v1`. */
export function assertOdooApiUrlUnderV1Prefix(
  finalUrl: string,
  backendBaseUrl: string,
  apiPrefix: string = '/api/v1',
): { ok: true } | { ok: false; reason: string } {
  const prefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  return assertUrlStaysUnderPathPrefix(finalUrl, backendBaseUrl, prefix);
}
