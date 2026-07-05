'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  ArrearsFamilyFollowupDetail,
  ArrearsFollowupCreatePayload,
} from '@/types/finance-arrears';
import { normalizeArrearsFamilyFollowupDetail } from '@/lib/utils/normalize-arrears';

export async function getFamilyArrearsFollowupDetail(
  familyId: number | string,
  query?: ListParams,
): Promise<ApiResponse<ArrearsFamilyFollowupDetail>> {
  const res = await api.get<unknown>(
    endpoints.admin.financeFamilyArrearsFollowup(familyId),
    query,
  );
  if (!res.success) return res as ApiResponse<ArrearsFamilyFollowupDetail>;
  const normalized = normalizeArrearsFamilyFollowupDetail(res.data);
  if (!normalized) {
    return {
      success: false,
      error: { code: 'invalid_response', message: 'Invalid arrears followup detail.' },
      meta: res.meta ?? {},
    };
  }
  return {
    ...res,
    data: normalized,
  };
}

export async function submitArrearsFollowup(
  payload: ArrearsFollowupCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(endpoints.admin.financeArrearsFollowups, payload, query);
}
