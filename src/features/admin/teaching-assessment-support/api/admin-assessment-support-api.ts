/**
 * Admin Assessment Support API — Odoo 221 aggregate summary + gated individual detail.
 */

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AdminAssessmentSupportSummary,
  AdminStudentAssessmentDetail,
  DifficultyCategory,
  LearningObjectiveSummary,
  MasteryScale,
} from '@/types/teaching-assessment-support';
import {
  normalizeAdminAssessmentSupportSummary,
  normalizeAdminStudentDetail,
  normalizeDifficultyCategory,
  normalizeLearningObjectives,
  normalizeMasteryScale,
} from '@/features/teaching-assessment-support/normalize-assessment-support';

export type AdminAssessmentSupportFilters = {
  academic_year_id?: number;
  class_id?: number;
  subject_id?: number;
  school_id?: number;
};

export async function fetchAdminAssessmentSupportSummary(
  filters: AdminAssessmentSupportFilters = {},
): Promise<ApiResponse<AdminAssessmentSupportSummary>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingAssessmentSupportSummary,
    filters as ListParams,
  );
  if (!res.success) return res as ApiResponse<AdminAssessmentSupportSummary>;
  return { ...res, data: normalizeAdminAssessmentSupportSummary(res.data) };
}

export async function fetchAdminStudentAssessmentDetail(
  studentId: number,
  filters: AdminAssessmentSupportFilters = {},
): Promise<ApiResponse<AdminStudentAssessmentDetail>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingAssessmentSupportStudent(studentId),
    filters as ListParams,
  );
  if (!res.success) return res as ApiResponse<AdminStudentAssessmentDetail>;
  return { ...res, data: normalizeAdminStudentDetail(res.data) };
}

export async function fetchAdminLearningObjectives(
  params?: ListParams,
): Promise<ApiResponse<LearningObjectiveSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingLearningObjectivesAdmin, params);
  if (!res.success) return res as ApiResponse<LearningObjectiveSummary[]>;
  return { ...res, data: normalizeLearningObjectives(res.data) };
}

export async function fetchAdminMasteryScales(
  params?: ListParams,
): Promise<ApiResponse<MasteryScale[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingMasteryScalesAdmin, params);
  if (!res.success) return res as ApiResponse<MasteryScale[]>;
  const items = Array.isArray(res.data)
    ? res.data
    : ((res.data as { items?: unknown[] } | null)?.items ?? []);
  return {
    ...res,
    data: items
      .map((item) => normalizeMasteryScale(item))
      .filter((item): item is MasteryScale => item != null),
  };
}

export async function fetchAdminDifficultyCategories(
  params?: ListParams,
): Promise<ApiResponse<DifficultyCategory[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingDifficultyCategoriesAdmin, params);
  if (!res.success) return res as ApiResponse<DifficultyCategory[]>;
  const items = Array.isArray(res.data)
    ? res.data
    : ((res.data as { items?: unknown[] } | null)?.items ?? []);
  return {
    ...res,
    data: items
      .map((item) => normalizeDifficultyCategory(item))
      .filter((item): item is DifficultyCategory => item != null),
  };
}
