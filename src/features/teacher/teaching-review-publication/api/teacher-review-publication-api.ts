/**
 * Teacher Teaching Stage 9 API — review status, publications, print, closure status.
 */

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  normalizeArchiveList,
  normalizeOfficialPublication,
  normalizeReviewStatus,
  normalizeTeacherClosureStatus,
} from '@/features/teaching-review-publication/normalize-review-publication';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  TeacherClosureStatus,
  TeachingArchiveListPayload,
  TeachingOfficialPublication,
  TeachingReviewStatus,
} from '@/types/teaching-review-publication';

export async function fetchTeacherReviewStatus(
  documentType: string,
  documentId: number,
): Promise<ApiResponse<TeachingReviewStatus>> {
  const res = await api.get<unknown>(
    endpoints.teacher.teachingDocumentReviewStatus(documentType, documentId),
  );
  if (!res.success) return res as ApiResponse<TeachingReviewStatus>;
  const data = normalizeReviewStatus(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid review status response.' },
    } as ApiResponse<TeachingReviewStatus>;
  }
  return { ...res, data };
}

export async function fetchTeacherDocumentPublications(
  documentType: string,
  documentId: number,
): Promise<ApiResponse<TeachingOfficialPublication[]>> {
  const res = await api.get<unknown>(
    endpoints.teacher.teachingDocumentPublications(documentType, documentId),
  );
  if (!res.success) return res as ApiResponse<TeachingOfficialPublication[]>;
  const payload = res.data as { items?: unknown[] } | unknown[];
  const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
  return {
    ...res,
    data: items
      .map((item) => normalizeOfficialPublication(item))
      .filter((item): item is TeachingOfficialPublication => item != null),
  };
}

export async function fetchTeacherPublications(filters: {
  academic_year_id?: number;
  document_type?: string;
  status?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<ApiResponse<TeachingArchiveListPayload>> {
  const res = await api.get<unknown>(
    endpoints.teacher.teachingPublications,
    filters as ListParams,
  );
  if (!res.success) return res as ApiResponse<TeachingArchiveListPayload>;
  return { ...res, data: normalizeArchiveList(res.data) };
}

export async function fetchTeacherClosureStatus(params: {
  academic_year_id?: number;
  term_id?: number;
} = {}): Promise<ApiResponse<TeacherClosureStatus>> {
  const res = await api.get<unknown>(
    endpoints.teacher.teachingClosureStatus,
    params as ListParams,
  );
  if (!res.success) return res as ApiResponse<TeacherClosureStatus>;
  return { ...res, data: normalizeTeacherClosureStatus(res.data) };
}

export async function createTeacherHomeworkCorrection(
  homeworkId: number,
  body: { reason: string } & Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> {
  return api.post(endpoints.teacher.homeworkCreateCorrection(homeworkId), body);
}
