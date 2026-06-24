// Server-only transport to the Odoo backend. This is the single egress point
// from Next.js to Odoo. Browser code must never import this file.
//
// Two responsibilities:
//   1. authenticateOdoo() — performs the initial /web/session/authenticate
//      handshake and extracts the session_id cookie.
//   2. odooApiFetch() — forwards an API v1 request carrying that session id.

import 'server-only';
import { config } from '@/lib/config';
import { getStoredTenantSlug, resolveOdooBaseUrlForTenant } from '@/lib/api/odoo-backend';
import { isOdooBinaryResponse } from '@/lib/api/odoo-binary-response';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import {
  isApiErrorEnvelope,
  mergeHttpStatusIntoEnvelope,
  normalizeOdooHttpError,
} from '@/lib/api/parse-odoo-error-response';
import type { ApiResponse, ApiErrorCode } from '@/types/api';

export interface OdooAuthResult {
  ok: boolean;
  sessionId: string | null;
  uid: number | null;
  /** Odoo error name when ok=false, e.g. for invalid credentials. */
  errorName?: string;
}

/** Extract the Odoo `session_id` value from a Set-Cookie header list. */
function extractSessionId(setCookie: string | null): string | null {
  if (!setCookie) return null;
  // Set-Cookie may contain multiple cookies separated by commas; match the one
  // we care about.
  const match = setCookie.match(/session_id=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Step 1 of the documented auth flow (API_REPORT.md §8): authenticate against
 * Odoo's standard endpoint to obtain a session cookie.
 */
export async function authenticateOdoo(
  database: string,
  login: string,
  password: string,
): Promise<OdooAuthResult> {
  const baseUrl = resolveOdooBaseUrlForTenant(database);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'call',
        params: { db: database, login, password },
      }),
    });
  } catch {
    return { ok: false, sessionId: null, uid: null, errorName: 'network_error' };
  }

  let json: { result?: { uid?: number }; error?: { data?: { name?: string } } } = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON body — treated as failure below */
  }

  const uid = json.result?.uid ?? null;
  if (!uid) {
    return {
      ok: false,
      sessionId: null,
      uid: null,
      errorName: json.error?.data?.name ?? 'invalid_credentials',
    };
  }

  const sessionId = extractSessionId(res.headers.get('set-cookie'));
  return { ok: true, sessionId, uid };
}

export interface OdooFetchOptions {
  method?: string;
  sessionId: string | null;
  /** Tenant slug (Odoo db) — selects per-tenant backend; falls back to session cookie. */
  tenant?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** When set, body is forwarded as multipart/form-data (Content-Type with boundary is auto-set). */
  formData?: FormData;
}

async function resolveOdooBaseUrl(opts: OdooFetchOptions): Promise<string> {
  const tenant = opts.tenant?.trim() || (await getStoredTenantSlug());
  if (tenant) return resolveOdooBaseUrlForTenant(tenant);
  return config.odooBaseUrl;
}

function errorEnvelope(code: ApiErrorCode, message: string): ApiResponse<never> {
  return { success: false, error: { code, message, details: {} }, meta: {} };
}

export interface OdooFileHeaders {
  contentType: string | null;
  contentDisposition: string | null;
  cacheControl: string | null;
}

export type OdooApiResult<T> =
  | { kind: 'json'; status: number; body: ApiResponse<T> }
  | { kind: 'file'; status: number; data: ArrayBuffer; headers: OdooFileHeaders };

function isFileResponse(res: Response): boolean {
  return isOdooBinaryResponse(
    res.headers.get('content-type'),
    res.headers.get('content-disposition'),
  );
}

function fileHeadersFrom(res: Response): OdooFileHeaders {
  return {
    contentType: res.headers.get('content-type'),
    contentDisposition: res.headers.get('content-disposition'),
    cacheControl: res.headers.get('cache-control'),
  };
}

/**
 * Forward an API v1 request to Odoo using a previously obtained session id.
 * `path` is relative to the API v1 prefix (e.g. "/admin/students").
 * JSON endpoints return a parsed ApiResponse; CSV/binary exports return raw bytes.
 */
export async function odooApiFetch<T = unknown>(
  path: string,
  opts: OdooFetchOptions,
): Promise<OdooApiResult<T>> {
  if (!opts.sessionId) {
    return {
      kind: 'json',
      status: 401,
      body: errorEnvelope('unauthenticated', 'No active session.') as ApiResponse<T>,
    };
  }

  const baseUrl = await resolveOdooBaseUrl(opts);
  const url = buildOdooApiUrl(baseUrl, config.apiPrefix, path, opts.query);
  const method = opts.method ?? 'GET';

  let res: Response;
  try {
    if (opts.formData) {
      res = await fetch(url, {
        method,
        headers: { Cookie: `session_id=${opts.sessionId}` },
        cache: 'no-store',
        body: opts.formData,
      });
    } else {
      res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Cookie: `session_id=${opts.sessionId}`,
        },
        cache: 'no-store',
        body:
          method === 'GET' || method === 'HEAD' || opts.body === undefined
            ? undefined
            : JSON.stringify(opts.body),
      });
    }
  } catch {
    return {
      kind: 'json',
      status: 502,
      body: errorEnvelope(
        'network_error',
        'Could not reach the server. Please try again.',
      ) as ApiResponse<T>,
    };
  }

  if (isFileResponse(res)) {
    return {
      kind: 'file',
      status: res.status,
      data: await res.arrayBuffer(),
      headers: fileHeadersFrom(res),
    };
  }

  if (res.status === 204) {
    return {
      kind: 'json',
      status: 204,
      body: { success: true, data: null as T, meta: {} },
    };
  }

  const rawText = await res.text();
  let body: ApiResponse<T>;
  try {
    body = JSON.parse(rawText) as ApiResponse<T>;
  } catch {
    body = normalizeOdooHttpError<T>(res.status, rawText);
  }

  if (!body.success && res.status >= 400) {
    if (!isApiErrorEnvelope(body) || !body.error?.message) {
      body = normalizeOdooHttpError<T>(res.status, rawText);
    } else {
      body = mergeHttpStatusIntoEnvelope(res.status, body);
    }
  }

  return { kind: 'json', status: res.status, body };
}
