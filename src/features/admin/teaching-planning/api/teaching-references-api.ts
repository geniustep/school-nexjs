import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  TeachingPlanningResetPayload,
  TeachingReferenceCreatePayload,
  TeachingReferenceDetail,
  TeachingReferenceSummary,
  TeachingReferenceUpdatePayload,
} from '@/types/teaching-planning';
import {
  normalizeTeachingReferences,
  unwrapTeachingReferenceMutationData,
} from '../utils/normalize-teaching-planning';

function withNormalizedDetail(
  res: ApiResponse<unknown>,
): ApiResponse<TeachingReferenceDetail> {
  if (!res.success) return res as ApiResponse<TeachingReferenceDetail>;
  const detail = unwrapTeachingReferenceMutationData(res.data);
  if (!detail) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid teaching reference payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchTeachingReferences(
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingReferences, query);
  if (!res.success) return res as ApiResponse<TeachingReferenceSummary[]>;
  return { ...res, data: normalizeTeachingReferences(res.data) };
}

export async function fetchTeachingReference(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceDetail>> {
  const res = await api.get<unknown>(endpoints.admin.teachingReference(id), query);
  return withNormalizedDetail(res);
}

export async function createTeachingReference(
  payload: TeachingReferenceCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceDetail>> {
  const res = await api.post<unknown>(endpoints.admin.teachingReferences, payload, query);
  return withNormalizedDetail(res);
}

export async function updateTeachingReference(
  id: number | string,
  payload: TeachingReferenceUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceDetail>> {
  const res = await api.patch<unknown>(
    endpoints.admin.teachingReference(id),
    payload,
    query,
  );
  return withNormalizedDetail(res);
}

export async function submitTeachingReferenceForReview(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingReferenceSubmitForReview(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function approveTeachingReference(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingReferenceApprove(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function resetTeachingReferenceToDraft(
  id: number | string,
  payload: TeachingPlanningResetPayload,
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingReferenceResetToDraft(id),
    payload,
    query,
  );
  return withNormalizedDetail(res);
}

export async function archiveTeachingReference(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingReferenceArchive(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function duplicateTeachingReferenceVersion(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingReferenceDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingReferenceDuplicateVersion(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function deleteTeachingReference(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<{ deleted?: boolean; id?: number }>> {
  return api.delete(endpoints.admin.teachingReference(id), query);
}
