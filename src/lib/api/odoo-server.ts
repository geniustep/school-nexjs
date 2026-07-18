// Server-only transport to the Odoo backend. This is the single egress point
// from Next.js to Odoo. Browser code must never import this file.
//
// Two responsibilities:
//   1. authenticateOdoo() — performs the initial /web/session/authenticate
//      handshake and extracts the session_id cookie.
//   2. odooApiFetch() — forwards an API v1 request carrying that session id.

import 'server-only';
import { config } from '@/lib/config';
import {
  getStoredTenantSlug,
  resolveOdooBaseUrlForTenant,
  type BackendBaseUrlResolution,
} from '@/lib/api/odoo-backend';
import { isOdooBinaryResponse } from '@/lib/api/odoo-binary-response';
import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import {
  isApiErrorEnvelope,
  mergeHttpStatusIntoEnvelope,
  normalizeOdooHttpError,
} from '@/lib/api/parse-odoo-error-response';
import { getHostFromHeaders } from '@/lib/tenant';
import type { ApiResponse, ApiErrorCode } from '@/types/api';

/** Host from next/headers when callers omit opts.host (RSC, guards, serverGet). */
async function resolveServerRequestHost(): Promise<string | null> {
  try {
    const { headers } = await import('next/headers');
    const hdrs = await headers();
    return getHostFromHeaders(hdrs);
  } catch {
    return null;
  }
}

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
  backendBaseUrl?: string,
): Promise<OdooAuthResult> {
  let baseUrl: string | null = backendBaseUrl?.trim() ?? null;
  if (!baseUrl) {
    const resolved = resolveOdooBaseUrlForTenant(database);
    if (!resolved.ok) {
      return { ok: false, sessionId: null, uid: null, errorName: 'tenant_backend_not_configured' };
    }
    baseUrl = resolved.baseUrl;
  }
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
  /** Pre-resolved backend URL from tenant runtime config (preferred). */
  backendBaseUrl?: string;
  /** Request host for dev/preview fallback detection. */
  host?: string | null;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** When set, body is forwarded as multipart/form-data (Content-Type with boundary is auto-set). */
  formData?: FormData;
  /**
   * Explicit active-role context for multi-role sessions (Flutter → BFF → Odoo).
   * Callers must pass a legal role; ownership is verified by Odoo only.
   * Never read from request globals here — pass explicitly per call.
   */
  activeRole?: string;
}

async function resolveOdooBaseUrl(opts: OdooFetchOptions): Promise<BackendBaseUrlResolution> {
  if (opts.backendBaseUrl?.trim()) {
    return { ok: true, baseUrl: opts.backendBaseUrl.trim().replace(/\/$/, '') };
  }

  const tenant = opts.tenant?.trim() || (await getStoredTenantSlug());
  const host = opts.host ?? (await resolveServerRequestHost());
  if (tenant) return resolveOdooBaseUrlForTenant(tenant, { host });

  const fallbackUrl = config.odooBaseUrl?.trim();
  if (!fallbackUrl) return { ok: false, code: 'TENANT_BACKEND_NOT_CONFIGURED' };
  return { ok: true, baseUrl: fallbackUrl.replace(/\/$/, '') };
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

  const baseResolved = await resolveOdooBaseUrl(opts);
  if (!baseResolved.ok) {
    return {
      kind: 'json',
      status: 503,
      body: errorEnvelope(
        'tenant_backend_not_configured' as ApiErrorCode,
        'Tenant backend is not configured.',
      ) as ApiResponse<T>,
    };
  }
  const baseUrl = baseResolved.baseUrl;
  const url = buildOdooApiUrl(baseUrl, config.apiPrefix, path, opts.query);
  const method = opts.method ?? 'GET';

  const outboundHeaders: Record<string, string> = {
    Cookie: `session_id=${opts.sessionId}`,
  };
  const role = typeof opts.activeRole === 'string' ? opts.activeRole.trim().toLowerCase() : '';
  if (role) {
    outboundHeaders['X-SSC-Active-Role'] = role;
  }

  let res: Response;
  try {
    if (opts.formData) {
      res = await fetch(url, {
        method,
        headers: outboundHeaders,
        cache: 'no-store',
        body: opts.formData,
      });
    } else {
      res = await fetch(url, {
        method,
        headers: {
          ...outboundHeaders,
          'Content-Type': 'application/json',
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
