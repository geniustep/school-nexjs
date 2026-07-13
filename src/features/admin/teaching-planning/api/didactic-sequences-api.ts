import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  DidacticSequenceCreatePayload,
  DidacticSequenceDetail,
  DidacticSequenceSummary,
  DidacticSequenceUpdatePayload,
  TeachingPlanningResetPayload,
} from '@/types/teaching-planning';
import {
  normalizeDidacticSequenceDetail,
  normalizeDidacticSequences,
  unwrapDidacticSequenceMutationData,
} from '../utils/normalize-didactic-distribution';

function withNormalizedDetail(
  res: ApiResponse<unknown>,
): ApiResponse<DidacticSequenceDetail> {
  if (!res.success) return res as ApiResponse<DidacticSequenceDetail>;
  const detail = unwrapDidacticSequenceMutationData(res.data);
  if (!detail) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid didactic sequence payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchDidacticSequences(
  query?: ListParams,
): Promise<ApiResponse<DidacticSequenceSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.didacticSequences, query);
  if (!res.success) return res as ApiResponse<DidacticSequenceSummary[]>;
  return { ...res, data: normalizeDidacticSequences(res.data) };
}

export async function fetchDidacticSequence(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.get<unknown>(endpoints.admin.didacticSequence(id), query);
  return withNormalizedDetail(res);
}

export async function createDidacticSequence(
  payload: DidacticSequenceCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.post<unknown>(endpoints.admin.didacticSequences, payload, query);
  return withNormalizedDetail(res);
}

export async function updateDidacticSequence(
  id: number | string,
  payload: DidacticSequenceUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.patch<unknown>(endpoints.admin.didacticSequence(id), payload, query);
  return withNormalizedDetail(res);
}

export async function submitDidacticSequenceForReview(
  id: number | string,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.didacticSequenceSubmitForReview(id),
    undefined,
  );
  return withNormalizedDetail(res);
}

export async function approveDidacticSequence(
  id: number | string,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.post<unknown>(endpoints.admin.didacticSequenceApprove(id), undefined);
  return withNormalizedDetail(res);
}

export async function resetDidacticSequenceToDraft(
  id: number | string,
  payload: TeachingPlanningResetPayload,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.didacticSequenceResetToDraft(id),
    payload,
  );
  return withNormalizedDetail(res);
}

export async function archiveDidacticSequence(
  id: number | string,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.post<unknown>(endpoints.admin.didacticSequenceArchive(id), undefined);
  return withNormalizedDetail(res);
}

export async function duplicateDidacticSequenceVersion(
  id: number | string,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.didacticSequenceDuplicateVersion(id),
    undefined,
  );
  return withNormalizedDetail(res);
}

export async function deleteDidacticSequence(
  id: number | string,
): Promise<ApiResponse<{ deleted?: boolean; id?: number }>> {
  return api.delete(endpoints.admin.didacticSequence(id));
}

/* --------------------------- Teacher read-only --------------------------- */

export async function fetchTeacherDidacticSequence(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DidacticSequenceDetail>> {
  const res = await api.get<unknown>(endpoints.teacher.didacticSequence(id), query);
  if (!res.success) return res as ApiResponse<DidacticSequenceDetail>;
  const detail = normalizeDidacticSequenceDetail(res.data);
  if (!detail) {
    return {
      success: false,
      error: { code: 'invalid_payload', message: 'Invalid payload.', details: {} },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}
