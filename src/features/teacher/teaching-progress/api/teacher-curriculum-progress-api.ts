/**
 * Teacher curriculum progress / remaining / next-item API client.
 * Progress math stays on Backend — this layer only fetches and normalizes.
 */

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  TeachingExecutionDecisionPayload,
  TeachingProgressSummary,
  TeachingRemainingItem,
  TeachingTeacherNextItemPayload,
} from '@/types/teaching-delivery';
import {
  normalizeTeachingProgressSummary,
  normalizeTeachingRemainingItems,
  normalizeTeachingTeacherNextItemPayload,
} from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';

export type CurriculumProgressContextQuery = {
  class_id: number;
  offering_id?: number;
  teaching_offering_id?: number;
  academic_year_id?: number;
};

function contextParams(ctx: CurriculumProgressContextQuery): ListParams {
  return {
    class_id: ctx.class_id,
    offering_id: ctx.offering_id ?? ctx.teaching_offering_id,
    teaching_offering_id: ctx.teaching_offering_id ?? ctx.offering_id,
    academic_year_id: ctx.academic_year_id,
  };
}

/** Official class-scoped summary (requires class_id on Backend 219+). */
export async function fetchTeacherCurriculumProgressSummary(
  ctx: CurriculumProgressContextQuery,
): Promise<ApiResponse<TeachingProgressSummary>> {
  const res = await api.get<unknown>(
    endpoints.teacher.teachingProgressSummary,
    contextParams(ctx),
  );
  if (!res.success) return res as ApiResponse<TeachingProgressSummary>;
  return { ...res, data: normalizeTeachingProgressSummary(res.data) };
}

export async function fetchTeacherCurriculumRemaining(
  ctx: CurriculumProgressContextQuery,
): Promise<ApiResponse<TeachingRemainingItem[]>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingRemaining, contextParams(ctx));
  if (!res.success) return res as ApiResponse<TeachingRemainingItem[]>;
  return { ...res, data: normalizeTeachingRemainingItems(res.data) };
}

export async function fetchTeacherSuggestedNextItem(
  ctx: CurriculumProgressContextQuery,
): Promise<ApiResponse<TeachingTeacherNextItemPayload>> {
  if (!ctx.offering_id && !ctx.teaching_offering_id) {
    return {
      success: false,
      error: {
        code: 'validation_error',
        message: 'offering_id is required.',
        details: {},
      },
      meta: {},
    };
  }
  const res = await api.get<unknown>(
    endpoints.teacher.teachingSuggestedNextItem,
    contextParams(ctx),
  );
  if (!res.success) return res as ApiResponse<TeachingTeacherNextItemPayload>;
  return { ...res, data: normalizeTeachingTeacherNextItemPayload(res.data) };
}

export async function submitTeacherExecutionDecision(
  payload: TeachingExecutionDecisionPayload,
): Promise<ApiResponse<TeachingTeacherNextItemPayload>> {
  const res = await api.post<unknown>(endpoints.teacher.teachingExecutionDecision, payload);
  if (!res.success) return res as ApiResponse<TeachingTeacherNextItemPayload>;
  return { ...res, data: normalizeTeachingTeacherNextItemPayload(res.data) };
}
