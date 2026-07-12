// Canonical BFF path safety — reject traversal / encoded separators before upstream URL build.
// Untrusted segments are rejected (never silently rewritten).

export type SafeBffPathFailureReason =
  | 'empty_segments'
  | 'empty_segment'
  | 'dot_segment'
  | 'separator_in_segment'
  | 'encoded_separator'
  | 'encoded_dot_segment'
  | 'control_or_null'
  | 'absolute_or_protocol'
  | 'invalid_encoding'
  | 'unsafe_charset'
  | 'prefix_escape'
  | 'origin_mismatch';

export type SafeBffPathResult =
  | { ok: true; segments: string[]; path: string }
  | { ok: false; reason: SafeBffPathFailureReason };

/** Single path segment after one decode — letters, digits, and limited punctuation used by School API. */
const SAFE_SEGMENT_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._@-]{0,199})?$/;

const ENCODED_SEPARATOR_RE = /%(?:0{0,2}2f|0{0,2}5c)/i;
const ENCODED_DOT_ONLY_RE = /^(?:%2e)+$/i;

function containsControlOrNull(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0 || code < 32 || code === 127) return true;
  }
  return false;
}

function looksLikeAbsoluteOrProtocol(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower.startsWith('//') || lower.includes('://')) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return true;
  return false;
}

/**
 * Decode a single segment once. Rejects invalid encoding and any decode that
 * introduces separators, controls, or dot-segments.
 */
export function decodeBffPathSegmentOnce(
  raw: string,
): { ok: true; value: string } | { ok: false; reason: SafeBffPathFailureReason } {
  if (raw === '') return { ok: false, reason: 'empty_segment' };
  if (containsControlOrNull(raw)) return { ok: false, reason: 'control_or_null' };
  if (raw.includes('/') || raw.includes('\\')) return { ok: false, reason: 'separator_in_segment' };
  if (looksLikeAbsoluteOrProtocol(raw)) return { ok: false, reason: 'absolute_or_protocol' };

  if (ENCODED_SEPARATOR_RE.test(raw)) return { ok: false, reason: 'encoded_separator' };

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return { ok: false, reason: 'invalid_encoding' };
  }

  if (decoded !== raw) {
    if (containsControlOrNull(decoded)) return { ok: false, reason: 'control_or_null' };
    if (decoded.includes('/') || decoded.includes('\\')) {
      return { ok: false, reason: 'encoded_separator' };
    }
    if (decoded === '.' || decoded === '..') return { ok: false, reason: 'encoded_dot_segment' };
    if (looksLikeAbsoluteOrProtocol(decoded)) return { ok: false, reason: 'absolute_or_protocol' };
    // Reject residual encoding that would become `.` / `..` / separators on a second pass.
    if (ENCODED_SEPARATOR_RE.test(decoded) || ENCODED_DOT_ONLY_RE.test(decoded)) {
      return { ok: false, reason: 'encoded_dot_segment' };
    }
    if (decoded.includes('%')) {
      try {
        const second = decodeURIComponent(decoded);
        if (second === '.' || second === '..') return { ok: false, reason: 'encoded_dot_segment' };
        if (second.includes('/') || second.includes('\\')) {
          return { ok: false, reason: 'encoded_separator' };
        }
      } catch {
        return { ok: false, reason: 'invalid_encoding' };
      }
    }
  }

  if (decoded === '.' || decoded === '..') return { ok: false, reason: 'dot_segment' };
  if (!SAFE_SEGMENT_RE.test(decoded)) return { ok: false, reason: 'unsafe_charset' };

  return { ok: true, value: decoded };
}

/** Validate and canonicalize catch-all route segments into a safe relative API path. */
export function canonicalizeBffPathSegments(rawSegments: string[]): SafeBffPathResult {
  if (!rawSegments.length) return { ok: false, reason: 'empty_segments' };

  const segments: string[] = [];
  for (const raw of rawSegments) {
    const decoded = decodeBffPathSegmentOnce(raw);
    if (!decoded.ok) return decoded;
    segments.push(decoded.value);
  }

  const path = '/' + segments.map((s) => encodeURIComponent(s)).join('/');
  return { ok: true, segments, path };
}

/**
 * Ensure a constructed upstream URL stays on the same origin and under a pathname prefix.
 * `requiredPathPrefix` is absolute on the host (e.g. `/api/v1` or `/web/image`).
 */
export function assertUrlStaysUnderPathPrefix(
  finalUrl: string,
  backendBaseUrl: string,
  requiredPathPrefix: string,
): { ok: true } | { ok: false; reason: SafeBffPathFailureReason } {
  let finalParsed: URL;
  let baseParsed: URL;
  try {
    baseParsed = new URL(backendBaseUrl);
    finalParsed = new URL(finalUrl);
  } catch {
    return { ok: false, reason: 'invalid_encoding' };
  }

  if (finalParsed.origin !== baseParsed.origin) {
    return { ok: false, reason: 'origin_mismatch' };
  }

  const basePath = (baseParsed.pathname.replace(/\/$/, '') || '').replace(/\/{2,}/g, '/');
  const prefix = requiredPathPrefix.startsWith('/')
    ? requiredPathPrefix
    : `/${requiredPathPrefix}`;
  let expectedPrefix = `${basePath}${prefix}`.replace(/\/{2,}/g, '/');
  if (!expectedPrefix.startsWith('/')) expectedPrefix = `/${expectedPrefix}`;

  const pathname = finalParsed.pathname;
  const prefixDir = expectedPrefix.endsWith('/') ? expectedPrefix : `${expectedPrefix}/`;
  const exact = expectedPrefix.replace(/\/$/, '') || '/';

  if (pathname !== exact && pathname !== expectedPrefix && !pathname.startsWith(prefixDir)) {
    return { ok: false, reason: 'prefix_escape' };
  }

  const parts = pathname.split('/').filter(Boolean);
  if (parts.some((p) => p === '.' || p === '..')) {
    return { ok: false, reason: 'prefix_escape' };
  }

  return { ok: true };
}

/** JSON body for rejected BFF path / policy violations (no upstream details). */
export function unsafeBffPathErrorBody(code = 'invalid_path') {
  return {
    success: false as const,
    error: {
      code,
      message: 'Invalid or unsupported path.',
      details: {},
    },
    meta: {},
  };
}
