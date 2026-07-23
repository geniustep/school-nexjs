import 'server-only';

import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { endpoints } from '@/lib/api/endpoints';
import { getStoredTenantSlug } from '@/lib/api/odoo-backend';
import { odooApiFetch } from '@/lib/api/odoo-server';
import { getCurrentUser } from '@/lib/api/server';
import type { LegalActiveRole } from '@/lib/auth/active-role-transport';
import { getHostFromHeaders } from '@/lib/tenant';
import type { FamilyBatchConvertToStudentsResult } from '@/types/admission';
import type { ApiResponse } from '@/types/api';
import { parseFamilyBatchConvertRequestBody } from '@/features/admin/admissions/utils/family-batch-selective-conversion';
import { normalizeFamilyBatchConvertResult } from '@/features/admin/admissions/utils/family-batch-selective-conversion-errors';

export type ConvertFamilyBatchApplicationsInput = {
  batchId: number;
  body: unknown;
  activeRole?: LegalActiveRole;
  host?: string | null;
  backendBaseUrl?: string;
};

export type ConvertFamilyBatchApplicationsOutput = {
  httpStatus: number;
  body: ApiResponse<FamilyBatchConvertToStudentsResult>;
};

function sanitizeOutboundErrorBody(
  body: ApiResponse<FamilyBatchConvertToStudentsResult>,
): ApiResponse<FamilyBatchConvertToStudentsResult> {
  if (body.success) return body;
  const error = body.error ?? {
    code: 'server_error',
    message: 'Request failed.',
    details: {},
  };
  const details =
    error.details && typeof error.details === 'object'
      ? { ...(error.details as Record<string, unknown>) }
      : {};
  // Never expose internal upstream URLs or stack traces.
  delete details.stack;
  delete details.traceback;
  delete details.url;
  delete details.odoo_url;
  delete details.upstream_url;
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string' && /https?:\/\//i.test(value)) {
      delete details[key];
    }
  }
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details,
    },
    meta: body.meta ?? {},
  };
}

/**
 * Dedicated BFF conversion: forwards only idempotency_key + application_ids.
 * School/tenant/user come from session — never from the browser body.
 */
export async function convertFamilyBatchApplications(
  input: ConvertFamilyBatchApplicationsInput,
): Promise<ConvertFamilyBatchApplicationsOutput> {
  const parsed = parseFamilyBatchConvertRequestBody(input.body);
  if (!parsed.ok) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: { code: parsed.code, message: parsed.message, details: {} },
        meta: {},
      },
    };
  }

  const store = await cookies();
  const sessionId = store.get(config.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return {
      httpStatus: 401,
      body: {
        success: false,
        error: {
          code: 'unauthenticated',
          message: 'No active session.',
          details: {},
        },
        meta: {},
      },
    };
  }

  const user = await getCurrentUser(input.activeRole);
  if (!user) {
    return {
      httpStatus: 401,
      body: {
        success: false,
        error: {
          code: 'unauthenticated',
          message: 'No active session.',
          details: {},
        },
        meta: {},
      },
    };
  }

  const query: Record<string, string> = {};
  if (user.active_school_id) {
    query.active_school_id = String(user.active_school_id);
  }

  const tenant = await getStoredTenantSlug();
  const path = endpoints.admin.admissionFamilyBatchConvertToStudents(input.batchId);

  const result = await odooApiFetch<FamilyBatchConvertToStudentsResult>(path, {
    method: 'POST',
    sessionId,
    tenant: tenant ?? undefined,
    backendBaseUrl: input.backendBaseUrl,
    host: input.host ?? undefined,
    query,
    activeRole: input.activeRole,
    body: {
      idempotency_key: parsed.payload.idempotency_key,
      application_ids: parsed.payload.application_ids,
    },
  });

  if (result.kind === 'file') {
    return {
      httpStatus: 502,
      body: {
        success: false,
        error: {
          code: 'server_error',
          message: 'Unexpected server response.',
          details: {},
        },
        meta: {},
      },
    };
  }

  const httpStatus = result.status;
  if (result.body.success && result.body.data) {
    const normalized = normalizeFamilyBatchConvertResult(result.body.data);
    return {
      httpStatus,
      body: {
        success: true,
        data: normalized ?? result.body.data,
        meta: result.body.meta ?? {},
      },
    };
  }

  // Preserve upstream status for 4xx; sanitize 5xx envelopes without leaking internals.
  if (result.body.success) {
    return {
      httpStatus,
      body: {
        success: false,
        error: {
          code: 'server_error',
          message: 'Unexpected server response.',
          details: { status: httpStatus },
        },
        meta: result.body.meta ?? {},
      },
    };
  }

  const sanitized = sanitizeOutboundErrorBody(result.body);
  if (!sanitized.success) {
    if (httpStatus >= 500) {
      return {
        httpStatus,
        body: {
          success: false,
          error: {
            code: sanitized.error.code ?? 'server_error',
            message:
              sanitized.error.message && !/https?:\/\//i.test(sanitized.error.message)
                ? sanitized.error.message
                : 'The service is temporarily unavailable. Please try again.',
            details: {
              ...(sanitized.error.details ?? {}),
              status: httpStatus,
            },
          },
          meta: sanitized.meta ?? {},
        },
      };
    }

    return {
      httpStatus,
      body: {
        success: false,
        error: {
          ...sanitized.error,
          details: {
            ...(sanitized.error.details ?? {}),
            status: httpStatus,
          },
        },
        meta: sanitized.meta ?? {},
      },
    };
  }

  return {
    httpStatus,
    body: sanitized,
  };
}

export function resolveConvertBatchIdParam(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

export function hostFromRequestHeaders(headers: Headers): string | null {
  return getHostFromHeaders(headers);
}
