import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  TeachingOfferingCreatePayload,
  TeachingOfferingDetail,
  TeachingOfferingSummary,
  TeachingOfferingUpdatePayload,
  TeachingPlanningResetPayload,
} from '@/types/teaching-planning';
import {
  normalizeTeachingOfferings,
  unwrapTeachingOfferingMutationData,
} from '../utils/normalize-teaching-planning';

function withNormalizedDetail(
  res: ApiResponse<unknown>,
): ApiResponse<TeachingOfferingDetail> {
  if (!res.success) return res as ApiResponse<TeachingOfferingDetail>;
  const detail = unwrapTeachingOfferingMutationData(res.data);
  if (!detail) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid teaching offering payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchTeachingOfferings(
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingOfferings, query);
  if (!res.success) return res as ApiResponse<TeachingOfferingSummary[]>;
  return { ...res, data: normalizeTeachingOfferings(res.data) };
}

export async function fetchTeachingOffering(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.get<unknown>(endpoints.admin.teachingOffering(id), query);
  return withNormalizedDetail(res);
}

export async function createTeachingOffering(
  payload: TeachingOfferingCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.post<unknown>(endpoints.admin.teachingOfferings, payload, query);
  return withNormalizedDetail(res);
}

export async function updateTeachingOffering(
  id: number | string,
  payload: TeachingOfferingUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.patch<unknown>(
    endpoints.admin.teachingOffering(id),
    payload,
    query,
  );
  return withNormalizedDetail(res);
}

export async function submitTeachingOfferingForReview(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingOfferingSubmitForReview(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function approveTeachingOffering(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingOfferingApprove(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function resetTeachingOfferingToDraft(
  id: number | string,
  payload: TeachingPlanningResetPayload,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingOfferingResetToDraft(id),
    payload,
    query,
  );
  return withNormalizedDetail(res);
}

export async function archiveTeachingOffering(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingOfferingArchive(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function duplicateTeachingOffering(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingOfferingDuplicate(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function activateTeachingOffering(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingOfferingActivate(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function deleteTeachingOffering(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<{ deleted?: boolean; id?: number }>> {
  return api.delete(endpoints.admin.teachingOffering(id), query);
}
