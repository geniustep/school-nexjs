'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  BatchUpdateDiagnosticLinesPayload,
  BatchUpdateDiagnosticLinesResponse,
  CreateDiagnosticAssessmentPayload,
  DiagnosticAssessmentDetail,
  DiagnosticAssessmentSummary,
  DiagnosticAssessmentSummaryPayload,
  DiagnosticPrintPayload,
  DiagnosticRosterActionResponse,
  DiagnosticScoreScaleItem,
} from '@/types/diagnostic-assessment';
import {
  normalizeBatchUpdateLinesResponse,
  normalizeDiagnosticDetail,
  normalizeDiagnosticListItem,
  normalizePrintPayload,
} from '../utils/diagnostic-normalize';

export type DiagnosticWorkspaceApiRole = 'admin' | 'teacher';

export async function fetchAdminDiagnosticAssessments(
  query?: ListParams,
): Promise<ApiResponse<DiagnosticAssessmentSummary[]>> {
  const res = await api.get<DiagnosticAssessmentSummary[]>(
    endpoints.admin.diagnosticAssessments,
    query,
  );
  if (res.success && Array.isArray(res.data)) {
    return { ...res, data: res.data.map(normalizeDiagnosticListItem) };
  }
  return res;
}

export async function fetchAdminDiagnosticAssessment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DiagnosticAssessmentDetail>> {
  const res = await api.get<DiagnosticAssessmentDetail>(
    endpoints.admin.diagnosticAssessment(id),
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeDiagnosticDetail(res.data) };
  }
  return res;
}

export async function createAdminDiagnosticAssessment(
  payload: CreateDiagnosticAssessmentPayload,
  query?: ListParams,
): Promise<ApiResponse<DiagnosticAssessmentDetail>> {
  const res = await api.post<DiagnosticAssessmentDetail>(
    endpoints.admin.diagnosticAssessments,
    payload,
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeDiagnosticDetail(res.data) };
  }
  return res;
}

export async function patchAdminDiagnosticLines(
  id: number | string,
  payload: BatchUpdateDiagnosticLinesPayload,
  query?: ListParams,
): Promise<ApiResponse<BatchUpdateDiagnosticLinesResponse>> {
  const res = await api.patch<BatchUpdateDiagnosticLinesResponse>(
    endpoints.admin.diagnosticAssessmentLines(id),
    payload,
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeBatchUpdateLinesResponse(res.data) };
  }
  return res;
}

export async function postAdminDiagnosticRoster(
  id: number | string,
  action: 'build_roster' | 'sync_roster',
  query?: ListParams,
): Promise<ApiResponse<DiagnosticRosterActionResponse>> {
  const path =
    action === 'build_roster'
      ? endpoints.admin.diagnosticAssessmentBuildRoster(id)
      : endpoints.admin.diagnosticAssessmentSyncRoster(id);
  return api.post<DiagnosticRosterActionResponse>(path, undefined, query);
}

export async function confirmAdminDiagnosticAssessment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DiagnosticAssessmentDetail>> {
  const res = await api.post<DiagnosticAssessmentDetail>(
    endpoints.admin.diagnosticAssessmentConfirm(id),
    undefined,
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeDiagnosticDetail(res.data) };
  }
  return res;
}

export async function resetAdminDiagnosticAssessment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DiagnosticAssessmentDetail>> {
  const res = await api.post<DiagnosticAssessmentDetail>(
    endpoints.admin.diagnosticAssessmentResetToDraft(id),
    undefined,
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeDiagnosticDetail(res.data) };
  }
  return res;
}

export async function fetchAdminDiagnosticPrint(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DiagnosticPrintPayload>> {
  const res = await api.get<DiagnosticPrintPayload>(
    endpoints.admin.diagnosticAssessmentPrint(id),
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizePrintPayload(res.data) };
  }
  return res;
}

export async function fetchAdminDiagnosticScoreScale(
  query?: ListParams,
): Promise<ApiResponse<{ score_scale: DiagnosticScoreScaleItem[] }>> {
  return api.get<{ score_scale: DiagnosticScoreScaleItem[] }>(
    endpoints.admin.diagnosticAssessmentScoreScale,
    query,
  );
}

export async function fetchTeacherDiagnosticAssessments(
  query?: ListParams,
): Promise<ApiResponse<DiagnosticAssessmentSummary[]>> {
  const res = await api.get<DiagnosticAssessmentSummary[]>(
    endpoints.teacher.diagnosticAssessments,
    query,
  );
  if (res.success && Array.isArray(res.data)) {
    return { ...res, data: res.data.map(normalizeDiagnosticListItem) };
  }
  return res;
}

export async function fetchTeacherDiagnosticAssessment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DiagnosticAssessmentDetail>> {
  const res = await api.get<DiagnosticAssessmentDetail>(
    endpoints.teacher.diagnosticAssessment(id),
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeDiagnosticDetail(res.data) };
  }
  return res;
}

export async function patchTeacherDiagnosticLines(
  id: number | string,
  payload: BatchUpdateDiagnosticLinesPayload,
  query?: ListParams,
): Promise<ApiResponse<BatchUpdateDiagnosticLinesResponse>> {
  const res = await api.patch<BatchUpdateDiagnosticLinesResponse>(
    endpoints.teacher.diagnosticAssessmentLines(id),
    payload,
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeBatchUpdateLinesResponse(res.data) };
  }
  return res;
}

export async function confirmTeacherDiagnosticAssessment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DiagnosticAssessmentDetail>> {
  const res = await api.post<DiagnosticAssessmentDetail>(
    endpoints.teacher.diagnosticAssessmentConfirm(id),
    undefined,
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeDiagnosticDetail(res.data) };
  }
  return res;
}

export async function fetchTeacherDiagnosticPrint(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DiagnosticPrintPayload>> {
  const res = await api.get<DiagnosticPrintPayload>(
    endpoints.teacher.diagnosticAssessmentPrint(id),
    query,
  );
  if (res.success && res.data) {
    return { ...res, data: normalizePrintPayload(res.data) };
  }
  return res;
}

export async function fetchDiagnosticAssessmentDetail(params: {
  role: DiagnosticWorkspaceApiRole;
  id: number | string;
  query?: ListParams;
}): Promise<ApiResponse<DiagnosticAssessmentDetail>> {
  return params.role === 'teacher'
    ? fetchTeacherDiagnosticAssessment(params.id, params.query)
    : fetchAdminDiagnosticAssessment(params.id, params.query);
}

export async function patchDiagnosticLines(params: {
  role: DiagnosticWorkspaceApiRole;
  id: number | string;
  payload: BatchUpdateDiagnosticLinesPayload;
  query?: ListParams;
}): Promise<ApiResponse<BatchUpdateDiagnosticLinesResponse>> {
  return params.role === 'teacher'
    ? patchTeacherDiagnosticLines(params.id, params.payload, params.query)
    : patchAdminDiagnosticLines(params.id, params.payload, params.query);
}

export async function confirmDiagnosticAssessment(params: {
  role: DiagnosticWorkspaceApiRole;
  id: number | string;
  query?: ListParams;
}): Promise<ApiResponse<DiagnosticAssessmentDetail>> {
  return params.role === 'teacher'
    ? confirmTeacherDiagnosticAssessment(params.id, params.query)
    : confirmAdminDiagnosticAssessment(params.id, params.query);
}

export async function fetchDiagnosticPrint(params: {
  role: DiagnosticWorkspaceApiRole;
  id: number | string;
  query?: ListParams;
}): Promise<ApiResponse<DiagnosticPrintPayload>> {
  return params.role === 'teacher'
    ? fetchTeacherDiagnosticPrint(params.id, params.query)
    : fetchAdminDiagnosticPrint(params.id, params.query);
}

export async function fetchDiagnosticSummary(params: {
  role: DiagnosticWorkspaceApiRole;
  id: number | string;
  query?: ListParams;
}): Promise<ApiResponse<DiagnosticAssessmentSummaryPayload>> {
  const path =
    params.role === 'teacher'
      ? endpoints.teacher.diagnosticAssessmentSummary(params.id)
      : endpoints.admin.diagnosticAssessmentSummary(params.id);
  return api.get<DiagnosticAssessmentSummaryPayload>(path, params.query);
}
