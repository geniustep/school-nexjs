'use client';

import { endpoints } from '@/lib/api/endpoints';
import { clientActiveRoleHeaders } from '@/lib/auth/active-role-client';
import { sanitizeClientApiErrorMessage } from '@/lib/utils/user-facing-error';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  CreateFamilyBatchPayload,
  FamilyBatchConvertToStudentsPayload,
  FamilyBatchConvertToStudentsResult,
  FamilyBatchCreateResponse,
  FamilyBatchDetail,
  PatchFamilyBatchGuardiansPayload,
} from '@/types/admission';
import {
  normalizeFamilyBatchCreateData,
  normalizeFamilyBatchDetail,
} from '../utils/family-admission-normalize';
import { normalizeFamilyBatchConvertResult } from '../utils/family-batch-selective-conversion-errors';
import { sortConvertApplicationIds } from '../utils/family-batch-selective-conversion-idempotency';

const PROXY_BASE = '/api/odoo';
const CONVERT_BFF_BASE = '/api/admin/admissions/family-batches';

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

async function parseWithStatus<T>(res: Response): Promise<{
  response: ApiResponse<T>;
  httpStatus: number;
}> {
  const httpStatus = res.status;

  if (httpStatus === 204) {
    return {
      httpStatus,
      response: { success: true, data: null as T, meta: { http_status: httpStatus } },
    };
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    if (res.ok) {
      return {
        httpStatus,
        response: { success: true, data: null as T, meta: { http_status: httpStatus } },
      };
    }
    return {
      httpStatus,
      response: {
        success: false,
        error: {
          code: httpStatus === 409 ? 'conflict' : httpStatus === 422 ? 'validation_error' : 'server_error',
          message: 'Unexpected server response.',
          details: { status: httpStatus },
        },
        meta: { http_status: httpStatus },
      },
    };
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    const meta = { ...(payload.meta ?? {}), http_status: httpStatus };
    if (!payload.success) {
      const error = payload.error ?? {
        code: httpStatus === 409 ? 'conflict' : 'server_error',
        message: 'Request failed.',
      };
      return {
        httpStatus,
        response: {
          success: false,
          error: {
            code: error.code,
            message: sanitizeClientApiErrorMessage(error.message),
            details: {
              ...(error.details ?? {}),
              status: httpStatus,
            },
          },
          meta,
        },
      };
    }
    return {
      httpStatus,
      response: { success: true, data: payload.data, meta },
    };
  }

  if (!res.ok) {
    return {
      httpStatus,
      response: {
        success: false,
        error: {
          code: httpStatus === 409 ? 'conflict' : 'server_error',
          message: 'Unexpected server response.',
          details: { status: httpStatus },
        },
        meta: { http_status: httpStatus },
      },
    };
  }

  return {
    httpStatus,
    response: { success: true, data: null as T, meta: { http_status: httpStatus } },
  };
}

export async function createFamilyBatch(
  payload: CreateFamilyBatchPayload,
  query?: ListParams,
): Promise<{ response: ApiResponse<FamilyBatchCreateResponse>; httpStatus: number }> {
  try {
    const res = await fetch(buildUrl(endpoints.admin.admissionFamilyBatches, query), {
      method: 'POST',
      headers: proxyHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(payload),
    });
    const parsed = await parseWithStatus<FamilyBatchCreateResponse>(res);
    if (parsed.response.success && parsed.response.data) {
      return {
        ...parsed,
        response: {
          ...parsed.response,
          data: normalizeFamilyBatchCreateData(parsed.response.data),
        },
      };
    }
    return parsed;
  } catch {
    return {
      httpStatus: 0,
      response: {
        success: false,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: {},
        },
        meta: {},
      },
    };
  }
}

export async function fetchFamilyBatchDetail(
  batchId: number | string,
  query?: ListParams,
): Promise<ApiResponse<FamilyBatchDetail>> {
  try {
    const res = await fetch(buildUrl(endpoints.admin.admissionFamilyBatch(batchId), query), {
      method: 'GET',
      headers: proxyHeaders(),
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const parsed = await parseWithStatus<FamilyBatchDetail>(res);
    if (parsed.response.success && parsed.response.data) {
      return {
        ...parsed.response,
        data: normalizeFamilyBatchDetail(parsed.response.data),
      };
    }
    return parsed.response;
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
}

/**
 * PATCH /admin/admissions/family-batches/{batch_id}/guardians
 * Full replacement of guardian relationships for the family batch.
 */
export async function patchFamilyBatchGuardians(
  batchId: number | string,
  payload: PatchFamilyBatchGuardiansPayload,
  query?: ListParams,
): Promise<ApiResponse<FamilyBatchDetail>> {
  try {
    const res = await fetch(
      buildUrl(endpoints.admin.admissionFamilyBatchGuardians(batchId), query),
      {
        method: 'PATCH',
        headers: proxyHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify(payload),
      },
    );
    const parsed = await parseWithStatus<FamilyBatchDetail>(res);
    if (parsed.response.success && parsed.response.data) {
      return {
        ...parsed.response,
        data: normalizeFamilyBatchDetail(parsed.response.data),
      };
    }
    return parsed.response;
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
}

/**
 * POST dedicated BFF → Odoo family-batches/{id}/convert-to-students
 * Single collective request — never loops individual convert endpoints.
 */
export async function convertFamilyBatchApplicationsToStudents(
  batchId: number | string,
  payload: FamilyBatchConvertToStudentsPayload,
): Promise<{
  response: ApiResponse<FamilyBatchConvertToStudentsResult>;
  httpStatus: number;
}> {
  const body: FamilyBatchConvertToStudentsPayload = {
    idempotency_key: payload.idempotency_key,
    application_ids: sortConvertApplicationIds(payload.application_ids),
  };

  try {
    const res = await fetch(`${CONVERT_BFF_BASE}/${batchId}/convert-to-students`, {
      method: 'POST',
      headers: proxyHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(body),
    });
    const parsed = await parseWithStatus<FamilyBatchConvertToStudentsResult>(res);
    if (parsed.response.success && parsed.response.data) {
      const normalized = normalizeFamilyBatchConvertResult(parsed.response.data);
      return {
        ...parsed,
        response: {
          ...parsed.response,
          data: normalized ?? parsed.response.data,
        },
      };
    }
    return parsed;
  } catch {
    return {
      httpStatus: 0,
      response: {
        success: false,
        error: {
          code: 'network_error',
          message: 'Could not reach the server. Please check your connection.',
          details: { status: 0 },
        },
        meta: {},
      },
    };
  }
}
