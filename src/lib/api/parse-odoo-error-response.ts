import type { ApiErrorCode, ApiResponse } from '@/types/api';

/** Extract human-readable text from Odoo HTML error pages (e.g. 400 with `<p>…</p>`). */
export function extractHtmlErrorMessage(html: string): string | null {
  const trimmed = html.trim();
  if (!trimmed.startsWith('<')) return null;
  const pMatch = trimmed.match(/<p[^>]*>([^<]+)<\/p>/i);
  if (pMatch?.[1]) return decodeHtmlEntities(pMatch[1].trim());
  const titleMatch = trimmed.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1] && !/^4\d\d/i.test(titleMatch[1])) {
    return decodeHtmlEntities(titleMatch[1].trim());
  }
  return null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function errorCodeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'permission_denied';
  if (status === 404) return 'not_found';
  if (status === 422) return 'validation_error';
  return 'server_error';
}

function inferErrorCode(message: string, status: number): string {
  const lower = message.toLowerCase();
  if (lower.includes('billing_partner') || lower.includes('جهة الفوترة') || lower.includes('factur')) {
    return 'billing_partner_required';
  }
  if (lower.includes('duplicate') || lower.includes('تكرار') || lower.includes('idempot')) {
    return 'duplicate_reference';
  }
  if (
    lower.includes('المرجع مطلوب') ||
    lower.includes('reference') && lower.includes('required') ||
    lower.includes('payment_reference')
  ) {
    return 'payment_reference_required';
  }
  if (lower.includes('maturity') || lower.includes('استحقاق')) {
    return 'cheque_due_date_required';
  }
  if (lower.includes('received_date') || lower.includes('تاريخ الاستلام')) {
    return 'cheque_date_required';
  }
  if (lower.includes('journal')) return 'invalid_journal';
  if (lower.includes('allocation') || lower.includes('توزيع')) {
    return 'allocation_total_mismatch';
  }
  if (lower.includes('cheque') || lower.includes('شيك')) {
    return 'missing_cheque_number';
  }
  if (status === 422) return 'validation_error';
  return 'server_error';
}

/**
 * Normalise a non-JSON or partial Odoo HTTP error into the standard ApiResponse envelope.
 */
export function normalizeOdooHttpError<T>(
  status: number,
  rawBody: string,
): ApiResponse<T> {
  const htmlMessage = extractHtmlErrorMessage(rawBody);
  const message = htmlMessage ?? `Unexpected response (${status}).`;
  const code = inferErrorCode(message, status);
  return {
    success: false,
    error: {
      code,
      message,
      details: htmlMessage ? { source: 'html' } : { raw_preview: rawBody.slice(0, 200) },
    },
    meta: {},
  };
}

/** True when the parsed body is already a valid error envelope with a message. */
export function isApiErrorEnvelope(body: unknown): body is ApiResponse<never> {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  return record.success === false && !!record.error && typeof record.error === 'object';
}

export function mergeHttpStatusIntoEnvelope<T>(
  status: number,
  body: ApiResponse<T>,
): ApiResponse<T> {
  if (body.success || status < 400) return body;
  const err = body.error ?? { code: 'server_error', message: '', details: {} };
  if (err.message && !err.message.startsWith('Unexpected response')) return body;
  return {
    ...body,
    error: {
      ...err,
      code: err.code && err.code !== 'server_error' ? err.code : errorCodeFromStatus(status),
    },
  };
}
