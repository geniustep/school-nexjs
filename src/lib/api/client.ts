'use client';

// Browser API client. All calls go to the same-origin BFF proxy (/api/odoo/*)
// which attaches the Odoo session cookie server-side. Components never see the
// session id and never call Odoo directly.

import type { ApiResponse, ListParams } from '@/types/api';
import { sanitizeClientApiErrorMessage } from '@/lib/utils/user-facing-error';

const PROXY_BASE = '/api/odoo';

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

export const api = {
  async get<T>(path: string, query?: ListParams): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'GET',
        headers: { Accept: 'application/json' },
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

  async post<T>(path: string, body?: unknown, query?: ListParams): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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

  async patch<T>(path: string, body?: unknown, query?: ListParams): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
  async uploadForm<T>(path: string, formData: FormData, query?: ListParams): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'POST',
        headers: { Accept: 'application/json' },
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

  async delete<T>(path: string, query?: ListParams): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(buildUrl(path, query), {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
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
    }
  },
};
