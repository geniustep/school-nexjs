'use client';

/**
 * Group administrative submit — Create/PATCH then Submit with HTTP status awareness.
 * Individual uses the 256 compatibility endpoint.
 */

import {
  createAdminCommunicationContent,
  submitIndividualCommunication,
  updateAdminCommunicationContent,
} from '@/features/communication/api/admin-communication-api';
import { normalizeCommunicationSubmitResult } from '@/features/communication/utils/normalize-recipient-summary';
import { sanitizeClientApiErrorMessage } from '@/lib/utils/user-facing-error';
import { endpoints } from '@/lib/api/endpoints';
import { clientActiveRoleHeaders } from '@/lib/auth/active-role-client';
import type { ApiErrorBody, ApiResponse } from '@/types/api';
import type { CommunicationSubmitResult } from '@/types/communication';
import type { IndividualRecipientScope, RecipientScope } from '@/types/recipient-scope';

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

export type GeneralCommunicationSubmitOutcome =
  | {
      kind: 'pending_review';
      httpStatus: number;
      contentId: number | null;
      result: CommunicationSubmitResult | null;
      data: unknown;
    }
  | {
      kind: 'accepted';
      httpStatus: number;
      contentId: number | null;
      result: CommunicationSubmitResult | null;
      data: unknown;
    };

export type GeneralCommunicationSubmitResult =
  | { ok: true; outcome: GeneralCommunicationSubmitOutcome; draftId: number | null }
  | { ok: false; error: ApiErrorBody; draftId: number | null };

function contentIdFrom(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const raw = row.id ?? row.communication_content_id;
  if (typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0) return raw;
  return null;
}

async function postContentSubmit(
  contentId: number,
): Promise<{ response: ApiResponse<unknown>; httpStatus: number }> {
  const res = await fetch(buildUrl(endpoints.admin.communicationContentSubmit(contentId)), {
    method: 'POST',
    headers: {
      ...clientActiveRoleHeaders(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({}),
  });
  return parseWithHttpStatus<unknown>(res);
}

function classifyOutcome(
  data: unknown,
  httpStatus: number,
): GeneralCommunicationSubmitOutcome {
  const result = normalizeCommunicationSubmitResult(data);
  const contentId = contentIdFrom(data) ?? result?.communication_content_id ?? null;
  if (httpStatus === 202) {
    return { kind: 'pending_review', httpStatus, contentId, result, data };
  }
  return { kind: 'accepted', httpStatus, contentId, result, data };
}

/**
 * Ensure draft exists (create or PATCH), then Submit.
 * Does not invent Published messages on 202.
 */
export async function submitGroupGeneralCommunication(input: {
  draftId: number | null;
  subject: string;
  body: string;
  recipient_scope: Exclude<RecipientScope, IndividualRecipientScope>;
}): Promise<GeneralCommunicationSubmitResult> {
  let draftId = input.draftId;
  try {
    if (draftId == null) {
      const created = await createAdminCommunicationContent({
        subject: input.subject,
        body: input.body,
        recipient_scope: input.recipient_scope,
        content_type: 'message',
      });
      if (!created.success) {
        return { ok: false, error: created.error, draftId: null };
      }
      draftId = contentIdFrom(created.data);
      if (draftId == null) {
        return {
          ok: false,
          error: {
            code: 'server_error',
            message: 'Unexpected server response.',
            details: {},
          },
          draftId: null,
        };
      }
    } else {
      const patched = await updateAdminCommunicationContent(draftId, {
        subject: input.subject,
        body: input.body,
        recipient_scope: input.recipient_scope,
      });
      if (!patched.success) {
        return { ok: false, error: patched.error, draftId };
      }
    }

    const { response, httpStatus } = await postContentSubmit(draftId);
    if (!response.success) {
      return { ok: false, error: response.error, draftId };
    }
    return {
      ok: true,
      draftId,
      outcome: classifyOutcome(response.data, httpStatus),
    };
  } catch {
    return {
      ok: false,
      draftId,
      error: {
        code: 'network_error',
        message: 'Could not reach the server. Please check your connection.',
        details: {},
      },
    };
  }
}

/**
 * Individual submit via 256 endpoint — classify by HTTP status when available.
 */
export async function submitIndividualGeneralCommunication(input: {
  scope: IndividualRecipientScope;
  subject: string;
  body: string;
}): Promise<GeneralCommunicationSubmitResult> {
  try {
    const res = await fetch(buildUrl(endpoints.admin.communicationIndividual), {
      method: 'POST',
      headers: {
        ...clientActiveRoleHeaders(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify({
        recipient_type: input.scope.recipient_type,
        recipient_id: input.scope.recipient_id,
        subject: input.subject,
        body: input.body,
      }),
    });
    const { response, httpStatus } = await parseWithHttpStatus<unknown>(res);
    if (!response.success) {
      return { ok: false, error: response.error, draftId: null };
    }
    return {
      ok: true,
      draftId: null,
      outcome: classifyOutcome(response.data, httpStatus),
    };
  } catch {
    return {
      ok: false,
      draftId: null,
      error: {
        code: 'network_error',
        message: 'Could not reach the server. Please check your connection.',
        details: {},
      },
    };
  }
}

/** @deprecated Prefer submitIndividualGeneralCommunication for status-aware flow. */
export async function submitIndividualCommunicationLegacy(
  input: Parameters<typeof submitIndividualCommunication>[0],
): Promise<ApiResponse<unknown>> {
  return submitIndividualCommunication(input);
}
