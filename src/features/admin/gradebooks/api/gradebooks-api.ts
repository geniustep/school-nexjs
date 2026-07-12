'use client';

// Admin + teacher gradebook API adapters.
// Teacher UI routes deferred: teacher shell exists but no dedicated gradebook nav yet;
// teacher endpoints are wired here for a later phase without duplicating types.

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  BatchEntryUpdatePayload,
  BatchEntryUpdateResponse,
  CreateGradebookPayload,
  GradebookDetail,
  GradebookResults,
  GradebookSummary,
} from '@/types/gradebook';
import {
  normalizeBatchEntryUpdateResponse,
  normalizeGradebookDetailPayload,
} from '../utils/gradebook-normalize';
import { normalizeGradebookResultsPayload } from '../utils/gradebook-results-present';

export type GradebookWorkspaceApiRole = 'admin' | 'teacher';

export async function fetchAdminGradebooks(
  query?: ListParams,
): Promise<ApiResponse<GradebookSummary[]>> {
  return api.get<GradebookSummary[]>(endpoints.admin.gradebooks, query);
}

export async function fetchAdminGradebook(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<GradebookDetail>> {
  const res = await api.get<GradebookDetail>(endpoints.admin.gradebook(id), query);
  if (res.success && res.data) {
    return { ...res, data: normalizeGradebookDetailPayload(res.data) };
  }
  return res;
}

export async function createAdminGradebook(
  payload: CreateGradebookPayload,
  query?: ListParams,
): Promise<ApiResponse<GradebookDetail>> {
  const res = await api.post<GradebookDetail>(endpoints.admin.gradebooks, payload, query);
  if (res.success && res.data) {
    return { ...res, data: normalizeGradebookDetailPayload(res.data) };
  }
  return res;
}

export async function patchAdminGradebookEntries(
  id: number | string,
  payload: BatchEntryUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<BatchEntryUpdateResponse>> {
  const res = await api.patch<BatchEntryUpdateResponse>(
    endpoints.admin.gradebookEntries(id),
    payload,
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeBatchEntryUpdateResponse(res.data) };
  }
  return res;
}

export async function postAdminGradebookLifecycle(
  id: number | string,
  action: 'build_roster' | 'sync_roster' | 'open' | 'submit' | 'validate' | 'publish' | 'lock',
  query?: ListParams,
): Promise<ApiResponse<GradebookDetail>> {
  const pathByAction = {
    build_roster: endpoints.admin.gradebookBuildRoster(id),
    sync_roster: endpoints.admin.gradebookSyncRoster(id),
    open: endpoints.admin.gradebookOpen(id),
    submit: endpoints.admin.gradebookSubmit(id),
    validate: endpoints.admin.gradebookValidate(id),
    publish: endpoints.admin.gradebookPublish(id),
    lock: endpoints.admin.gradebookLock(id),
  } as const;
  const res = await api.post<GradebookDetail>(pathByAction[action], undefined, query);
  if (res.success && res.data) {
    return { ...res, data: normalizeGradebookDetailPayload(res.data) };
  }
  return res;
}

export async function fetchTeacherGradebooks(
  query?: ListParams,
): Promise<ApiResponse<GradebookSummary[]>> {
  return api.get<GradebookSummary[]>(endpoints.teacher.gradebooks, query);
}

export async function fetchTeacherGradebook(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<GradebookDetail>> {
  const res = await api.get<GradebookDetail>(endpoints.teacher.gradebook(id), query);
  if (res.success && res.data) {
    return { ...res, data: normalizeGradebookDetailPayload(res.data) };
  }
  return res;
}

export async function patchTeacherGradebookEntries(
  id: number | string,
  payload: BatchEntryUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<BatchEntryUpdateResponse>> {
  const res = await api.patch<BatchEntryUpdateResponse>(
    endpoints.teacher.gradebookEntries(id),
    payload,
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeBatchEntryUpdateResponse(res.data) };
  }
  return res;
}

export async function submitTeacherGradebook(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<GradebookDetail>> {
  const res = await api.post<GradebookDetail>(endpoints.teacher.gradebookSubmit(id), undefined, query);
  if (res.success && res.data) {
    return { ...res, data: normalizeGradebookDetailPayload(res.data) };
  }
  return res;
}

/** Role-aware Results adapter — selects admin or teacher endpoint only. */
export async function getGradebookResults(params: {
  role: GradebookWorkspaceApiRole;
  gradebookId: number | string;
  query?: ListParams;
}): Promise<ApiResponse<GradebookResults>> {
  const path =
    params.role === 'teacher'
      ? endpoints.teacher.gradebookResults(params.gradebookId)
      : endpoints.admin.gradebookResults(params.gradebookId);
  const res = await api.get<GradebookResults>(path, params.query);
  if (res.success && res.data) {
    return { ...res, data: normalizeGradebookResultsPayload(res.data) };
  }
  return res;
}
