import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  ReferenceJathathaCreatePayload,
  ReferenceJathathaDetail,
  ReferenceJathathaSummary,
  ReferenceJathathaUpdatePayload,
} from '@/types/jathatha';
import type { TeachingPlanningResetPayload } from '@/types/teaching-planning';
import {
  normalizeReferenceJathathas,
  unwrapReferenceJathathaMutationData,
} from '../utils/normalize-jathatha';

function withNormalizedDetail(res: ApiResponse<unknown>): ApiResponse<ReferenceJathathaDetail> {
  if (!res.success) return res as ApiResponse<ReferenceJathathaDetail>;
  const detail = unwrapReferenceJathathaMutationData(res.data);
  if (!detail) {
    return {
      success: false,
      error: { code: 'invalid_payload', message: 'Invalid reference Jathatha payload.', details: {} },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchReferenceJathathas(
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.referenceJathathas, query);
  if (!res.success) return res as ApiResponse<ReferenceJathathaSummary[]>;
  return { ...res, data: normalizeReferenceJathathas(res.data) };
}

export async function fetchReferenceJathatha(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaDetail>> {
  return withNormalizedDetail(await api.get<unknown>(endpoints.admin.referenceJathatha(id), query));
}

export async function createReferenceJathatha(
  payload: ReferenceJathathaCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.admin.referenceJathathas, payload, query));
}

export async function updateReferenceJathatha(
  id: number | string,
  payload: ReferenceJathathaUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaDetail>> {
  return withNormalizedDetail(
    await api.patch<unknown>(endpoints.admin.referenceJathatha(id), payload, query),
  );
}

export async function submitReferenceJathathaForReview(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.referenceJathathaSubmitForReview(id), undefined, query),
  );
}

export async function approveReferenceJathatha(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.referenceJathathaApprove(id), undefined, query),
  );
}

export async function resetReferenceJathathaToDraft(
  id: number | string,
  payload: TeachingPlanningResetPayload,
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.referenceJathathaResetToDraft(id), payload, query),
  );
}

export async function archiveReferenceJathatha(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.referenceJathathaArchive(id), undefined, query),
  );
}

export async function duplicateReferenceJathathaVersion(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ReferenceJathathaDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.referenceJathathaDuplicateVersion(id), undefined, query),
  );
}

export async function deleteReferenceJathatha(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<{ deleted?: boolean; id?: number }>> {
  return api.delete(endpoints.admin.referenceJathatha(id), query);
}
