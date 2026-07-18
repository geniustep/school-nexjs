'use client';

import { channelsEndpointsForRole } from '@/lib/api/channel-endpoints';
import { sanitizeClientApiErrorMessage } from '@/lib/utils/user-facing-error';
import type { ApiErrorBody, ApiResponse } from '@/types/api';
import type { SendChannelMessageOutcome } from '@/types/communication';
import type { Role } from '@/types/user';
import { classifySendChannelMessageResult } from '@/features/channels/utils/normalize-send-message-result';

const PROXY_BASE = '/api/odoo';

function buildUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${PROXY_BASE}${clean}`;
}

async function parseWithHttpStatus<T>(
  res: Response,
): Promise<{ response: ApiResponse<T>; httpStatus: number }> {
  const httpStatus = res.status;
  if (httpStatus === 204) {
    return {
      response: { success: true, data: null as T, meta: { http_status: httpStatus } },
      httpStatus,
    };
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    if (res.ok || httpStatus === 202) {
      return {
        response: { success: true, data: null as T, meta: { http_status: httpStatus } },
        httpStatus,
      };
    }
    return {
      response: {
        success: false,
        error: {
          code:
            httpStatus === 403
              ? 'forbidden'
              : httpStatus === 409
                ? 'conflict'
                : httpStatus === 422
                  ? 'validation_error'
                  : 'server_error',
          message: 'Unexpected server response.',
          details: { status: httpStatus },
        },
        meta: { http_status: httpStatus },
      },
      httpStatus,
    };
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (!payload.success) {
      const error = (payload.error ?? {
        code: 'server_error',
        message: 'Request failed.',
      }) as ApiErrorBody;
      return {
        response: {
          success: false,
          error: {
            code: error.code,
            message: sanitizeClientApiErrorMessage(error.message),
            details: { ...(error.details ?? {}), status: httpStatus },
          },
          meta: { ...(payload.meta ?? {}), http_status: httpStatus },
        },
        httpStatus,
      };
    }
    return {
      response: {
        success: true,
        data: payload.data,
        meta: { ...(payload.meta ?? {}), http_status: httpStatus },
      },
      httpStatus,
    };
  }

  if (!(res.ok || httpStatus === 202)) {
    return {
      response: {
        success: false,
        error: {
          code: 'server_error',
          message: 'Unexpected server response.',
          details: { status: httpStatus },
        },
        meta: { http_status: httpStatus },
      },
      httpStatus,
    };
  }

  return {
    response: { success: true, data: null as T, meta: { http_status: httpStatus } },
    httpStatus,
  };
}

export type SendChannelMessageResult =
  | { ok: true; outcome: SendChannelMessageOutcome }
  | { ok: false; error: ApiErrorBody };

/**
 * POST channel message. Treats HTTP 202 + pending_review as functional success
 * without inserting a published message.
 */
export async function sendChannelMessage(params: {
  role: Role;
  channelId: number;
  body: string;
  replyToMessageId?: number;
}): Promise<SendChannelMessageResult> {
  const endpoints = channelsEndpointsForRole(params.role);
  const payload: Record<string, unknown> = { body: params.body };
  if (params.replyToMessageId != null) {
    payload.reply_to_message_id = params.replyToMessageId;
  }

  try {
    const res = await fetch(buildUrl(endpoints.messages(params.channelId)), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const { response, httpStatus } = await parseWithHttpStatus<unknown>(res);
    if (!response.success) {
      return { ok: false, error: response.error };
    }
    const outcome = classifySendChannelMessageResult(response.data, httpStatus);
    if (!outcome) {
      return {
        ok: false,
        error: {
          code: 'server_error',
          message: 'Unexpected server response.',
          details: { status: httpStatus },
        },
      };
    }
    return { ok: true, outcome };
  } catch {
    return {
      ok: false,
      error: {
        code: 'network_error',
        message: 'Could not reach the server. Please check your connection.',
        details: {},
      },
    };
  }
}
