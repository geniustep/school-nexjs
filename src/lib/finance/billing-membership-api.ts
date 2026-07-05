'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';
import {
  buildTransferPreviewQueryParams,
  normalizeTransferApplyResult,
  normalizeTransferPreviewPayload,
} from '@/lib/utils/normalize-billing-membership';
import type {
  AddBillingMemberRequest,
  EndBillingMemberRequest,
  TransferApplyRequest,
  TransferApplyResult,
  TransferPreviewPayload,
  TransferPreviewQuery,
} from '@/types/finance-billing-membership';

export { buildTransferPreviewQueryParams };

export function buildTransferApplyBody(payload: TransferApplyRequest): TransferApplyRequest {
  const body: TransferApplyRequest = {
    fee_transfer_mode: payload.fee_transfer_mode,
    reason: payload.reason.trim(),
    start_date: payload.start_date?.trim() || null,
    academic_year_id: payload.academic_year_id ?? null,
  };
  if (payload.preview_token) body.preview_token = payload.preview_token;
  if (payload.fee_transfer_mode === 'selected_items' && payload.fee_ids?.length) {
    body.fee_ids = [...payload.fee_ids].sort((a, b) => a - b);
  }
  return body;
}

export async function getTransferInPreview(
  billingPartnerId: number | string,
  studentId: number | string,
  query: TransferPreviewQuery = {},
): Promise<ApiResponse<TransferPreviewPayload>> {
  const res = await api.get<unknown>(
    endpoints.admin.financeBillingAccountMemberTransferInPreview(billingPartnerId, studentId),
    buildTransferPreviewQueryParams(query),
  );
  if (!res.success) return res as ApiResponse<TransferPreviewPayload>;
  const normalized = normalizeTransferPreviewPayload(res.data);
  if (!normalized) {
    return {
      success: false,
      error: {
        code: 'validation_error',
        message: 'Unexpected preview response.',
        details: { status: 422 },
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: normalized };
}

export async function addBillingAccountMember(
  billingPartnerId: number | string,
  payload: AddBillingMemberRequest,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(endpoints.admin.financeBillingAccountMembers(billingPartnerId), payload);
}

export async function applyTransferInPreview(
  billingPartnerId: number | string,
  studentId: number | string,
  payload: TransferApplyRequest,
): Promise<ApiResponse<TransferApplyResult>> {
  const body = buildTransferApplyBody(payload);
  const res = await api.post<unknown>(
    endpoints.admin.financeBillingAccountMemberTransferIn(billingPartnerId, studentId),
    body,
  );
  if (!res.success) return res as ApiResponse<TransferApplyResult>;
  const normalized = normalizeTransferApplyResult(res.data);
  if (!normalized) {
    return {
      success: false,
      error: {
        code: 'validation_error',
        message: 'Unexpected apply response.',
        details: { status: 422 },
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: normalized };
}

export async function endBillingAccountMember(
  billingPartnerId: number | string,
  studentId: number | string,
  payload: EndBillingMemberRequest,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(
    endpoints.admin.financeBillingAccountMemberEnd(billingPartnerId, studentId),
    payload,
  );
}
