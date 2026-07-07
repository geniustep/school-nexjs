'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';
import type {
  BillingAuthorityChangeApplyRequest,
  BillingAuthorityChangeBootstrap,
  BillingAuthorityChangePreviewRequest,
  NormalizedBillingAuthorityChangePreview,
} from '@/types/finance-billing-authority-change';
import {
  normalizeBillingAuthorityChangeBootstrap,
  normalizeBillingAuthorityChangePreview,
} from '../utils/normalize-billing-authority-change-preview';

export async function fetchBillingAuthorityChangeBootstrap(
  studentId: number | string,
): Promise<ApiResponse<BillingAuthorityChangeBootstrap>> {
  const res = await api.get<unknown>(
    endpoints.admin.financeStudentBillingAuthorityChangePreview(studentId),
  );
  if (!res.success) return res as ApiResponse<BillingAuthorityChangeBootstrap>;
  return { ...res, data: normalizeBillingAuthorityChangeBootstrap(res.data) };
}

export async function previewBillingAuthorityChange(
  studentId: number | string,
  payload: BillingAuthorityChangePreviewRequest,
): Promise<ApiResponse<NormalizedBillingAuthorityChangePreview>> {
  const res = await api.post<unknown>(
    endpoints.admin.financeStudentBillingAuthorityChangePreview(studentId),
    payload,
  );
  if (!res.success) return res as ApiResponse<NormalizedBillingAuthorityChangePreview>;
  return { ...res, data: normalizeBillingAuthorityChangePreview(res.data) };
}

export async function applyBillingAuthorityChange(
  studentId: number | string,
  payload: BillingAuthorityChangeApplyRequest,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(endpoints.admin.financeStudentBillingAuthorityChange(studentId), payload);
}
