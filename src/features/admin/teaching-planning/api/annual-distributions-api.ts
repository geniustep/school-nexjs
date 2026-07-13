import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AnnualDistributionCreatePayload,
  AnnualDistributionDetail,
  AnnualDistributionLinePayload,
  AnnualDistributionSummary,
  AnnualDistributionTimeline,
  AnnualDistributionUpdatePayload,
  DistributionBatchApplyMode,
  DistributionBatchApplySummary,
  DistributionBatchValidationResponse,
  TeachingPlanningResetPayload,
} from '@/types/teaching-planning';
import {
  normalizeAnnualDistributionDetail,
  normalizeAnnualDistributions,
  normalizeBatchApplySummary,
  normalizeBatchValidation,
  normalizeTimeline,
  unwrapAnnualDistributionMutationData,
} from '../utils/normalize-didactic-distribution';

function withNormalizedDetail(
  res: ApiResponse<unknown>,
): ApiResponse<AnnualDistributionDetail> {
  if (!res.success) return res as ApiResponse<AnnualDistributionDetail>;
  const detail = unwrapAnnualDistributionMutationData(res.data);
  if (!detail) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid annual distribution payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchAnnualDistributions(
  query?: ListParams,
): Promise<ApiResponse<AnnualDistributionSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.annualDistributions, query);
  if (!res.success) return res as ApiResponse<AnnualDistributionSummary[]>;
  return { ...res, data: normalizeAnnualDistributions(res.data) };
}

export async function fetchAnnualDistribution(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.get<unknown>(endpoints.admin.annualDistribution(id), query);
  return withNormalizedDetail(res);
}

export async function createAnnualDistribution(
  payload: AnnualDistributionCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.post<unknown>(endpoints.admin.annualDistributions, payload, query);
  return withNormalizedDetail(res);
}

export async function updateAnnualDistribution(
  id: number | string,
  payload: AnnualDistributionUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.patch<unknown>(endpoints.admin.annualDistribution(id), payload, query);
  return withNormalizedDetail(res);
}

export async function submitAnnualDistributionForReview(
  id: number | string,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.annualDistributionSubmitForReview(id),
    undefined,
  );
  return withNormalizedDetail(res);
}

export async function approveAnnualDistribution(
  id: number | string,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.post<unknown>(endpoints.admin.annualDistributionApprove(id), undefined);
  return withNormalizedDetail(res);
}

export async function resetAnnualDistributionToDraft(
  id: number | string,
  payload: TeachingPlanningResetPayload,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.annualDistributionResetToDraft(id),
    payload,
  );
  return withNormalizedDetail(res);
}

export async function archiveAnnualDistribution(
  id: number | string,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.post<unknown>(endpoints.admin.annualDistributionArchive(id), undefined);
  return withNormalizedDetail(res);
}

export async function duplicateAnnualDistributionVersion(
  id: number | string,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.annualDistributionDuplicateVersion(id),
    undefined,
  );
  return withNormalizedDetail(res);
}

export async function activateAnnualDistribution(
  id: number | string,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.post<unknown>(endpoints.admin.annualDistributionActivate(id), undefined);
  return withNormalizedDetail(res);
}

export async function deleteAnnualDistribution(
  id: number | string,
): Promise<ApiResponse<{ deleted?: boolean; id?: number }>> {
  return api.delete(endpoints.admin.annualDistribution(id));
}

export async function fetchAnnualDistributionTimeline(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AnnualDistributionTimeline>> {
  const res = await api.get<unknown>(endpoints.admin.annualDistributionTimeline(id), query);
  if (!res.success) return res as ApiResponse<AnnualDistributionTimeline>;
  return { ...res, data: normalizeTimeline(res.data) };
}

export async function validateDistributionLinesBatch(
  id: number | string,
  rows: AnnualDistributionLinePayload[],
  mode: DistributionBatchApplyMode,
): Promise<ApiResponse<DistributionBatchValidationResponse>> {
  const res = await api.post<unknown>(endpoints.admin.annualDistributionLinesValidateBatch(id), {
    rows,
    mode,
  });
  if (!res.success) return res as ApiResponse<DistributionBatchValidationResponse>;
  return { ...res, data: normalizeBatchValidation(res.data) };
}

export async function applyDistributionLinesBatch(
  id: number | string,
  rows: AnnualDistributionLinePayload[],
  mode: DistributionBatchApplyMode,
): Promise<ApiResponse<DistributionBatchApplySummary>> {
  const res = await api.post<unknown>(endpoints.admin.annualDistributionLinesApplyBatch(id), {
    rows,
    mode,
  });
  if (!res.success) return res as ApiResponse<DistributionBatchApplySummary>;
  return { ...res, data: normalizeBatchApplySummary(res.data) };
}

/* --------------------------- Teacher read-only --------------------------- */

export async function fetchTeacherAnnualDistributions(
  query?: ListParams,
): Promise<ApiResponse<AnnualDistributionSummary[]>> {
  const res = await api.get<unknown>(endpoints.teacher.annualDistributions, query);
  if (!res.success) return res as ApiResponse<AnnualDistributionSummary[]>;
  return { ...res, data: normalizeAnnualDistributions(res.data) };
}

export async function fetchTeacherAnnualDistribution(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AnnualDistributionDetail>> {
  const res = await api.get<unknown>(endpoints.teacher.annualDistribution(id), query);
  if (!res.success) return res as ApiResponse<AnnualDistributionDetail>;
  const detail = normalizeAnnualDistributionDetail(res.data);
  if (!detail) {
    return {
      success: false,
      error: { code: 'invalid_payload', message: 'Invalid payload.', details: {} },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchTeacherAnnualDistributionTimeline(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AnnualDistributionTimeline>> {
  const res = await api.get<unknown>(endpoints.teacher.annualDistributionTimeline(id), query);
  if (!res.success) return res as ApiResponse<AnnualDistributionTimeline>;
  return { ...res, data: normalizeTimeline(res.data) };
}
