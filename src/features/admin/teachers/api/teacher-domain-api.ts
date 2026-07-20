/**
 * Typed Teacher Domain client — SSC-API-2026.07.001.
 * Uses the shared BFF `api` transport (session cookie + active school via useAdminResource /
 * BFF injection). Does not store cookies or hardcode Backend URLs in client components.
 */

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  ApiContractMetadata,
  AssignmentCancelPayload,
  AssignmentEndPayload,
  TeacherAcademicProfile,
  TeacherAcademicProfileWritePayload,
  TeacherArchivePayload,
  TeacherAssignmentDetail,
  TeacherAssignmentSummary,
  TeacherDetail,
  TeacherSummary,
  TeacherTerminatePayload,
  TeachingOfferingDetail,
  TeachingOfferingSummary,
} from '@/types/teacher-domain';
import {
  checkTeacherDomainContract,
  normalizeAssignmentSummaries,
  normalizeOfferingDetail,
  normalizeOfferingSummaries,
  normalizeTeacherSummaries,
  parseTeacherDomainContract,
  stripForbiddenAcademicWriteKeys,
  withNormalizedAcademicProfile,
  withNormalizedAssignmentDetail,
  withNormalizedTeacherDetail,
} from '../utils/teacher-domain-normalize';

export async function fetchTeacherDomainContract(
  query?: ListParams,
): Promise<ApiResponse<ApiContractMetadata>> {
  const res = await api.get<unknown>(endpoints.admin.teacherDomainContract, query);
  if (!res.success) return res as ApiResponse<ApiContractMetadata>;
  const contract = parseTeacherDomainContract(res.data);
  if (!contract) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid teacher domain contract payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  const check = checkTeacherDomainContract(contract);
  return {
    ...res,
    data: contract,
    meta: {
      ...(res.meta ?? {}),
      teacher_domain_contract_check: check,
    },
  };
}

export async function fetchTeachers(
  query?: ListParams,
): Promise<ApiResponse<TeacherSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachers, query);
  if (!res.success) return res as ApiResponse<TeacherSummary[]>;
  return { ...res, data: normalizeTeacherSummaries(res.data) };
}

export async function fetchTeacher(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherDetail>> {
  const res = await api.get<unknown>(endpoints.admin.teacher(id), query);
  return withNormalizedTeacherDetail(res);
}

export async function updateTeacher(
  id: number | string,
  payload: Record<string, unknown>,
  query?: ListParams,
): Promise<ApiResponse<TeacherDetail>> {
  const res = await api.post<unknown>(endpoints.admin.teacherUpdate(id), payload, query);
  return withNormalizedTeacherDetail(res);
}

export async function terminateTeacher(
  id: number | string,
  payload: TeacherTerminatePayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherDetail>> {
  const res = await api.post<unknown>(endpoints.admin.teacherTerminate(id), payload, query);
  if (!res.success) return res as ApiResponse<TeacherDetail>;
  const item = (res.data as { item?: unknown } | null)?.item ?? res.data;
  return withNormalizedTeacherDetail({ ...res, data: item });
}

export async function archiveTeacher(
  id: number | string,
  payload: TeacherArchivePayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherDetail>> {
  const res = await api.post<unknown>(endpoints.admin.teacherArchive(id), payload, query);
  if (!res.success) return res as ApiResponse<TeacherDetail>;
  const item = (res.data as { item?: unknown } | null)?.item ?? res.data;
  return withNormalizedTeacherDetail({ ...res, data: item });
}

export async function reactivateTeacher(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherDetail>> {
  const res = await api.post<unknown>(endpoints.admin.teacherReactivate(id), undefined, query);
  if (!res.success) return res as ApiResponse<TeacherDetail>;
  const item = (res.data as { item?: unknown } | null)?.item ?? res.data;
  return withNormalizedTeacherDetail({ ...res, data: item });
}

export async function fetchTeacherAcademicProfile(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherAcademicProfile>> {
  const res = await api.get<unknown>(endpoints.admin.teacherAcademicProfile(id), query);
  return withNormalizedAcademicProfile(res);
}

export async function updateTeacherAcademicProfile(
  id: number | string,
  payload: TeacherAcademicProfileWritePayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherAcademicProfile>> {
  const safe = stripForbiddenAcademicWriteKeys(
    payload as unknown as Record<string, unknown>,
  );
  const res = await api.patch<unknown>(
    endpoints.admin.teacherAcademicProfile(id),
    safe,
    query,
  );
  return withNormalizedAcademicProfile(res);
}

export async function fetchTeachingAssignments(
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingAssignments, query);
  if (!res.success) return res as ApiResponse<TeacherAssignmentSummary[]>;
  return { ...res, data: normalizeAssignmentSummaries(res.data) };
}

export async function fetchTeachingAssignment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentDetail>> {
  const res = await api.get<unknown>(endpoints.admin.teachingAssignment(id), query);
  return withNormalizedAssignmentDetail(res);
}

export async function updateTeachingAssignmentDomain(
  id: number | string,
  payload: Record<string, unknown>,
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingAssignmentUpdate(id),
    payload,
    query,
  );
  return withNormalizedAssignmentDetail(res);
}

async function postAssignmentAction(
  path: string,
  payload?: Record<string, unknown>,
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentDetail>> {
  const res = await api.post<unknown>(path, payload, query);
  return withNormalizedAssignmentDetail(res);
}

export async function activateTeachingAssignment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentDetail>> {
  return postAssignmentAction(endpoints.admin.teachingAssignmentActivate(id), undefined, query);
}

export async function suspendTeachingAssignment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentDetail>> {
  return postAssignmentAction(endpoints.admin.teachingAssignmentSuspend(id), undefined, query);
}

export async function resumeTeachingAssignment(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentDetail>> {
  return postAssignmentAction(endpoints.admin.teachingAssignmentResume(id), undefined, query);
}

export async function endTeachingAssignment(
  id: number | string,
  payload: AssignmentEndPayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentDetail>> {
  return postAssignmentAction(
    endpoints.admin.teachingAssignmentEnd(id),
    payload as unknown as Record<string, unknown>,
    query,
  );
}

export async function cancelTeachingAssignment(
  id: number | string,
  payload: AssignmentCancelPayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherAssignmentDetail>> {
  return postAssignmentAction(
    endpoints.admin.teachingAssignmentCancel(id),
    payload as unknown as Record<string, unknown>,
    query,
  );
}

export async function fetchTeachingOfferingsDomain(
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingOfferings, query);
  if (!res.success) return res as ApiResponse<TeachingOfferingSummary[]>;
  return { ...res, data: normalizeOfferingSummaries(res.data) };
}

export async function fetchTeachingOfferingDomain(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingOfferingDetail>> {
  const res = await api.get<unknown>(endpoints.admin.teachingOffering(id), query);
  if (!res.success) return res as ApiResponse<TeachingOfferingDetail>;
  const detail = normalizeOfferingDetail(res.data);
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
