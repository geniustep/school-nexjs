/**
 * Teacher Assessment Support API — Odoo 221 routes only.
 */

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  DifficultyRecord,
  LearningObjectiveDetail,
  LearningObjectiveSummary,
  MasteryBatchPayload,
  MasteryBatchResult,
  MasteryMatrixPayload,
  MasteryObservation,
  MasteryScale,
  ReassessmentRecord,
  SupportDecision,
  SupportGroup,
  SupportPlan,
} from '@/types/teaching-assessment-support';
import {
  normalizeDifficulties,
  normalizeDifficulty,
  normalizeLearningObjective,
  normalizeLearningObjectives,
  normalizeMasteryBatchResult,
  normalizeMasteryMatrix,
  normalizeMasteryObservation,
  normalizeMasteryScale,
  normalizeReassessment,
  normalizeReassessments,
  normalizeSupportDecision,
  normalizeSupportDecisions,
  normalizeSupportGroup,
  normalizeSupportGroups,
  normalizeSupportPlan,
  normalizeSupportPlans,
} from '@/features/teaching-assessment-support/normalize-assessment-support';

export type AssessmentContextQuery = {
  academic_year_id: number;
  class_id: number;
  subject_id: number;
};

export async function fetchTeacherLearningObjectives(
  params?: ListParams,
): Promise<ApiResponse<LearningObjectiveSummary[]>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingLearningObjectives, params);
  if (!res.success) return res as ApiResponse<LearningObjectiveSummary[]>;
  return { ...res, data: normalizeLearningObjectives(res.data) };
}

export async function fetchTeacherLearningObjective(
  id: number,
): Promise<ApiResponse<LearningObjectiveDetail>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingLearningObjective(id));
  if (!res.success) return res as ApiResponse<LearningObjectiveDetail>;
  const data = normalizeLearningObjective(res.data, true) as LearningObjectiveDetail | null;
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Learning objective not found.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function fetchTeacherMasteryScale(): Promise<ApiResponse<MasteryScale>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingMasteryScale);
  if (!res.success) return res as ApiResponse<MasteryScale>;
  const data = normalizeMasteryScale(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'No active mastery scale.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function fetchTeacherMasteryMatrix(
  ctx: AssessmentContextQuery & { learning_objective_ids?: string },
): Promise<ApiResponse<MasteryMatrixPayload>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingMasteryMatrix, ctx);
  if (!res.success) return res as ApiResponse<MasteryMatrixPayload>;
  return { ...res, data: normalizeMasteryMatrix(res.data) };
}

export async function saveTeacherMasteryBatch(
  payload: MasteryBatchPayload,
): Promise<ApiResponse<MasteryBatchResult>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingMasteryMatrixBatch, payload);
  if (!res.success) return res as ApiResponse<MasteryBatchResult>;
  return { ...res, data: normalizeMasteryBatchResult(res.data) };
}

export async function confirmTeacherMasteryObservation(
  id: number,
): Promise<ApiResponse<MasteryObservation>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingMasteryObservationConfirm(id), {});
  if (!res.success) return res as ApiResponse<MasteryObservation>;
  const data = normalizeMasteryObservation(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Observation not found.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function correctTeacherMasteryObservation(
  id: number,
  body: Record<string, unknown>,
): Promise<ApiResponse<MasteryObservation>> {
  const res = await api.post<unknown>(
    endpoints.teacher.teachingMasteryObservationCorrect(id),
    body,
  );
  if (!res.success) return res as ApiResponse<MasteryObservation>;
  const data = normalizeMasteryObservation(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Observation not found.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function fetchTeacherDifficulties(
  params?: ListParams,
): Promise<ApiResponse<DifficultyRecord[]>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingDifficulties, params);
  if (!res.success) return res as ApiResponse<DifficultyRecord[]>;
  return { ...res, data: normalizeDifficulties(res.data) };
}

export async function createTeacherDifficulty(
  body: Record<string, unknown>,
): Promise<ApiResponse<DifficultyRecord>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingDifficulties, body);
  if (!res.success) return res as ApiResponse<DifficultyRecord>;
  const data = normalizeDifficulty(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid difficulty response.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function teacherDifficultyAction(
  id: number,
  action: 'confirm' | 'resolve' | 'correct',
  body: Record<string, unknown> = {},
): Promise<ApiResponse<DifficultyRecord>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingDifficultyAction(id, action), body);
  if (!res.success) return res as ApiResponse<DifficultyRecord>;
  const data = normalizeDifficulty(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Difficulty not found.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function fetchTeacherSupportDecisions(
  params?: ListParams,
): Promise<ApiResponse<SupportDecision[]>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingSupportDecisions, params);
  if (!res.success) return res as ApiResponse<SupportDecision[]>;
  return { ...res, data: normalizeSupportDecisions(res.data) };
}

export async function createTeacherSupportDecision(
  body: Record<string, unknown>,
): Promise<ApiResponse<SupportDecision>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingSupportDecisions, body);
  if (!res.success) return res as ApiResponse<SupportDecision>;
  const data = normalizeSupportDecision(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid support decision response.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function teacherSupportDecisionAction(
  id: number,
  action: 'confirm' | 'correct',
  body: Record<string, unknown> = {},
): Promise<ApiResponse<SupportDecision>> {
  const res = await api.post<unknown>(
    endpoints.teacher.teachingSupportDecisionAction(id, action),
    body,
  );
  if (!res.success) return res as ApiResponse<SupportDecision>;
  const data = normalizeSupportDecision(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Support decision not found.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function fetchTeacherSupportGroups(
  params?: ListParams,
): Promise<ApiResponse<SupportGroup[]>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingSupportGroups, params);
  if (!res.success) return res as ApiResponse<SupportGroup[]>;
  return { ...res, data: normalizeSupportGroups(res.data) };
}

export async function fetchTeacherSupportGroup(
  id: number,
): Promise<ApiResponse<SupportGroup>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingSupportGroup(id));
  if (!res.success) return res as ApiResponse<SupportGroup>;
  const data = normalizeSupportGroup(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Support group not found.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function createTeacherSupportGroup(
  body: Record<string, unknown>,
): Promise<ApiResponse<SupportGroup>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingSupportGroups, body);
  if (!res.success) return res as ApiResponse<SupportGroup>;
  const data = normalizeSupportGroup(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid support group response.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function teacherSupportGroupAction(
  id: number,
  action: 'activate' | 'close' | 'add-member' | 'remove-member',
  body: Record<string, unknown> = {},
): Promise<ApiResponse<SupportGroup | Record<string, unknown>>> {
  return api.post(endpoints.teacher.teachingSupportGroupAction(id, action), body);
}

export async function fetchTeacherSupportPlans(
  params?: ListParams,
): Promise<ApiResponse<SupportPlan[]>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingSupportPlans, params);
  if (!res.success) return res as ApiResponse<SupportPlan[]>;
  return { ...res, data: normalizeSupportPlans(res.data) };
}

export async function createTeacherSupportPlan(
  body: Record<string, unknown>,
): Promise<ApiResponse<SupportPlan>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingSupportPlans, body);
  if (!res.success) return res as ApiResponse<SupportPlan>;
  const data = normalizeSupportPlan(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid support plan response.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function teacherSupportPlanAction(
  id: number,
  action: 'plan' | 'activate' | 'cancel' | 'sync-delivery',
): Promise<ApiResponse<SupportPlan>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingSupportPlanAction(id, action), {});
  if (!res.success) return res as ApiResponse<SupportPlan>;
  const data = normalizeSupportPlan(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Support plan not found.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function fetchTeacherReassessments(
  params?: ListParams,
): Promise<ApiResponse<ReassessmentRecord[]>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingReassessments, params);
  if (!res.success) return res as ApiResponse<ReassessmentRecord[]>;
  return { ...res, data: normalizeReassessments(res.data) };
}

export async function createTeacherReassessment(
  body: Record<string, unknown>,
): Promise<ApiResponse<ReassessmentRecord>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingReassessments, body);
  if (!res.success) return res as ApiResponse<ReassessmentRecord>;
  const data = normalizeReassessment(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid reassessment response.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}

export async function teacherReassessmentAction(
  id: number,
  action: 'confirm' | 'correct',
  body: Record<string, unknown> = {},
): Promise<ApiResponse<ReassessmentRecord>> {
  const res = await api.post<unknown>(
    endpoints.teacher.teachingReassessmentAction(id, action),
    body,
  );
  if (!res.success) return res as ApiResponse<ReassessmentRecord>;
  const data = normalizeReassessment(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Reassessment not found.', details: {} },
      meta: {},
    };
  }
  return { ...res, data };
}
