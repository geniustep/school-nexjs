/**
 * Privacy-safe URL normalization for Vercel Web Analytics page views.
 * Strips record identifiers from path segments and sensitive query parameters.
 */

/** Path segment whose next segment is treated as a record identifier. */
export const SENSITIVE_RECORD_PARENT_SEGMENTS = new Set([
  'students',
  'parents',
  'guardians',
  'admissions',
  'staff',
  'teachers',
  'receipts',
  'collections',
  'agreements',
  'cheques',
  'billing-accounts',
  'fee-plans',
  'fee-types',
  'student-fees',
  'children',
  'sessions',
  'attachments',
]);

const RECORD_ID_PATTERN = /^\d+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REDACTED_PLACEHOLDER = '[id]';

const SENSITIVE_QUERY_PARAM_KEYS = new Set([
  'student_id',
  'studentid',
  'student',
  'guardian_id',
  'guardianid',
  'guardian',
  'parent_id',
  'parentid',
  'parent',
  'admission_id',
  'admissionid',
  'admission',
  'payer_id',
  'payerid',
  'billing_partner_id',
  'billingpartnerid',
  'collection_id',
  'collectionid',
  'receipt_id',
  'receiptid',
  'user_id',
  'userid',
  'staff_id',
  'staffid',
  'cashier_id',
  'cashierid',
  'email',
  'phone',
  'tel',
  'mobile',
  'e_mail',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'external_reference',
  'external_ref',
  'reference',
  'ref',
  'search',
  'q',
  'query',
]);

function normalizeQueryParamKey(key: string): string {
  return key.toLowerCase().replace(/-/g, '_');
}

export function looksLikeRecordId(segment: string): boolean {
  if (!segment) return false;
  return RECORD_ID_PATTERN.test(segment) || UUID_PATTERN.test(segment);
}

export function sanitizeAnalyticsPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  const sanitized: string[] = [];
  let redactNextSegment = false;

  for (const segment of segments) {
    if (redactNextSegment && looksLikeRecordId(segment)) {
      sanitized.push(REDACTED_PLACEHOLDER);
      redactNextSegment = false;
      continue;
    }

    sanitized.push(segment);
    redactNextSegment = SENSITIVE_RECORD_PARENT_SEGMENTS.has(segment);
  }

  return `/${sanitized.join('/')}`;
}

export function sanitizeAnalyticsSearchParams(searchParams: URLSearchParams): URLSearchParams {
  const sanitized = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    const normalizedKey = normalizeQueryParamKey(key);

    if (normalizedKey === 'returnto') {
      sanitized.set(key, sanitizeAnalyticsUrl(value));
      continue;
    }

    if (SENSITIVE_QUERY_PARAM_KEYS.has(normalizedKey)) {
      continue;
    }

    sanitized.set(key, value);
  }

  return sanitized;
}

/** Sanitize a full URL or internal path (with optional query string). */
export function sanitizeAnalyticsUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;

  try {
    const isAbsolute = /^https?:\/\//i.test(trimmed);
    const url = isAbsolute
      ? new URL(trimmed)
      : new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, 'https://analytics.local');

    url.pathname = sanitizeAnalyticsPathname(url.pathname);
    url.search = sanitizeAnalyticsSearchParams(url.searchParams).toString();

    if (isAbsolute) {
      const serialized = url.toString();
      return serialized.endsWith('?') ? serialized.slice(0, -1) : serialized;
    }

    const path = `${url.pathname}${url.search}`;
    return trimmed.startsWith('/') || trimmed.startsWith('?') ? path : path.slice(1);
  } catch {
    const [pathPart, ...queryParts] = trimmed.split('?');
    const pathname = sanitizeAnalyticsPathname(
      pathPart.startsWith('/') ? pathPart : `/${pathPart}`,
    );
    if (queryParts.length === 0) return pathname;

    const params = sanitizeAnalyticsSearchParams(new URLSearchParams(queryParts.join('?')));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }
}
