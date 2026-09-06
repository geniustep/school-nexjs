'use client';

// Browser API client. All calls go to the same-origin BFF proxy (/api/odoo/*)
// which attaches the Odoo session cookie server-side. Components never see the
// session id and never call Odoo directly.

import type { ApiResponse, ApiSuccess, ListParams } from '@/types/api';
import { clientActiveRoleHeaders } from '@/lib/auth/active-role-client';
import { sanitizeClientApiErrorMessage } from '@/lib/utils/user-facing-error';

const PROXY_BASE = '/api/odoo';

type ApiGetOptions = {
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: ListParams): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const url = `${PROXY_BASE}${clean}`;
  if (!query) return url;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${url}?${qs}` : url;
}

function proxyHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Accept: 'application/json',
    ...clientActiveRoleHeaders(),
    ...extra,
  };
}

async function parse<T>(res: Response): Promise<ApiResponse<T>> {
  const status = res.status;
  if (status === 204) {
    return { success: true, data: null as T, meta: {} };
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    if (res.ok) {
      return { success: true, data: null as T, meta: {} };
    }
    return {
      success: false,
      error: {
        code: status === 403 ? 'forbidden' : status === 409 ? 'conflict' : status === 422 ? 'validation_error' : 'server_error',
        message: 'Unexpected server response.',
        details: { status },
      },
      meta: {},
    };
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (!payload.success) {
      const error = payload.error ?? {
        code: status === 403 ? 'forbidden' : status === 409 ? 'conflict' : status === 422 ? 'validation_error' : 'server_error',
        message: 'Request failed.',
      };
      // Preserve any extra top-level error fields (e.g. diagnostics, candidate_plans,
      // selectable_candidate_plans) that the BFF returns at the error root. The typed
      // ApiErrorBody only carries code/message/details, so fold extras into details
      // instead of dropping them.
      const { code: _code, message: _message, details: errorDetails, ...extraErrorFields } =
        error as Record<string, unknown> & {
          code: string;
          message?: string;
          details?: Record<string, unknown>;
        };
      return {
        success: false,
        error: {
          code: error.code,
          message: sanitizeClientApiErrorMessage(error.message),
          details: {
            ...extraErrorFields,
            ...(errorDetails ?? {}),
            status: typeof errorDetails?.status === 'number' ? errorDetails.status : status,
          },
        },
        meta: payload.meta ?? {},
      };
    }
    // Fold Odoo top-level list extras (e.g. unread_count on announcements) into meta.
    const successPayload = payload as ApiSuccess<T> & Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(successPayload, 'unread_count')) {
      const raw = Number(successPayload.unread_count);
      return {
        success: true,
        data: successPayload.data,
        meta: {
          ...(successPayload.meta ?? {}),
          unread_count: Number.isFinite(raw) ? raw : 0,
        },
      };
    }
    return payload;
  }

  if (!res.ok) {
    return {
      success: false,
      error: {
        code: status === 403 ? 'forbidden' : status === 409 ? 'conflict' : status === 422 ? 'validation_error' : 'server_error',
        message: 'Unexpected server response.',
        details: { status },
      },
      meta: {},
    };
  }

  return { success: true, data: null as T, meta: {} };
}

function normalizeGuardianLinkPartnerResponse<T>(path: string, response: ApiResponse<T>): ApiResponse<T> {
  if (path !== '/admin/guardians/link-partner' || !response.success) return response;
  if (!response.data || typeof response.data !== 'object') return response;

  const data = response.data as Record<string, unknown>;
  const existingId = Number(data.id);
  if (Number.isFinite(existingId) && existingId > 0) return response;

  const guardian = data.guardian;
  if (!guardian || typeof guardian !== 'object') return response;
  const guardianId = Number((guardian as Record<string, unknown>).id);
  if (!Number.isFinite(guardianId) || guardianId <= 0) return response;

  return {
    ...response,
    data: { ...data, id: guardianId } as T,
  };
}

export const api = {
  async get<T>(path: string, query?: ListParams, options?: ApiGetOptions): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'GET',
        headers: proxyHeaders(),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
      });
      return parse<T>(res);
    } catch (error) {
      if (options?.signal?.aborted) throw error;
      return {
        success: false,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: {},
        },
        meta: {},
      };
    }
  },

  async post<T>(path: string, body?: unknown, query?: ListParams, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'POST',
        headers: proxyHeaders({ 'Content-Type': 'application/json', ...headers }),
        credentials: 'same-origin',
        cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const parsed = await parse<T>(res);
      return normalizeGuardianLinkPartnerResponse(path, parsed);
    } catch {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: {},
        },
        meta: {},
      };
    }
  },

  async patch<T>(path: string, body?: unknown, query?: ListParams): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'PATCH',
        headers: proxyHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return parse<T>(res);
    } catch {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: {},
        },
        meta: {},
      };
    }
  },

  async put<T>(path: string, body?: unknown, query?: ListParams): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'PUT',
        headers: proxyHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return parse<T>(res);
    } catch {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: {},
        },
        meta: {},
      };
    }
  },

  /** Multipart upload — do not set Content-Type; the browser adds the boundary. */
  async uploadForm<T>(path: string, formData: FormData, query?: ListParams, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'POST',
        headers: proxyHeaders(headers),
        credentials: 'same-origin',
        cache: 'no-store',
        body: formData,
      });
      return parse<T>(res);
    } catch {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: {},
        },
        meta: {},
      };
    }
  },

  async delete<T>(path: string, query?: ListParams, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'DELETE',
        headers: proxyHeaders(headers),
        credentials: 'same-origin',
        cache: 'no-store',
      });
      return parse<T>(res);
    } catch {
      return {
        success: false,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: {},
        },
        meta: {},
      };
    }
  },
};

// Auth helpers (talk to the dedicated BFF auth routes, not the proxy).
export const authApi = {
  async login(login: string, password: string) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      return parse<import('@/types/user').MeResponse>(res);
    } catch {
      return {
        success: false as const,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: {},
        },
        meta: {},
      };
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    } finally {
      const { setClientActiveRole } = await import('@/lib/auth/active-role-client');
      setClientActiveRole(null);
    }
  },
};
