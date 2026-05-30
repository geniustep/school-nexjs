// Server-only transport to the Odoo backend. This is the single egress point
// from Next.js to Odoo. Browser code must never import this file.
//
// Two responsibilities:
//   1. authenticateOdoo() — performs the initial /web/session/authenticate
//      handshake and extracts the session_id cookie.
//   2. odooApiFetch() — forwards an API v1 request carrying that session id.

import 'server-only';
import { config } from '@/lib/config';
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
  login: string,
  password: string,
): Promise<OdooAuthResult> {
  let res: Response;
  try {
    res = await fetch(`${config.odooBaseUrl}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'call',
        params: { db: config.odooDb, login, password },
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
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

function buildQuery(query?: Record<string, string | number | undefined>): string {
  if (!query) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function errorEnvelope(code: ApiErrorCode, message: string): ApiResponse<never> {
  return { success: false, error: { code, message, details: {} }, meta: {} };
}

/**
 * Forward an API v1 request to Odoo using a previously obtained session id.
 * `path` is relative to the API v1 prefix (e.g. "/admin/students").
 * Always resolves to a parsed ApiResponse plus the HTTP status.
 */
export async function odooApiFetch<T = unknown>(
  path: string,
  opts: OdooFetchOptions,
): Promise<{ status: number; body: ApiResponse<T> }> {
  if (!opts.sessionId) {
    return {
      status: 401,
      body: errorEnvelope('unauthenticated', 'No active session.') as ApiResponse<T>,
    };
  }

  const url = `${config.odooBaseUrl}${config.apiPrefix}${path}${buildQuery(opts.query)}`;
  const method = opts.method ?? 'GET';

  let res: Response;
  try {
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
  } catch {
    return {
      status: 502,
      body: errorEnvelope(
        'network_error',
        'Could not reach the server. Please try again.',
      ) as ApiResponse<T>,
    };
  }

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    // Odoo returned a non-envelope response (e.g. an HTML 404 page). Normalise
    // it to our error contract so the UI only ever deals with one shape.
    const code: ApiErrorCode =
      res.status === 401
        ? 'unauthenticated'
        : res.status === 403
          ? 'permission_denied'
          : res.status === 404
            ? 'not_found'
            : 'server_error';
    body = errorEnvelope(code, `Unexpected response (${res.status}).`) as ApiResponse<T>;
  }

  return { status: res.status, body };
}
