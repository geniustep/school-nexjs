'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';
import type {
  StudentFinanceAssignPlanBody,
  StudentFinancePlanPreviewBody,
} from '@/types/student-finance-assign-plan';

/**
 * Previews assigning a finance plan to an existing student. The backend derives
 * the plan/amounts from the student's enrollment; the client only passes context
 * it actually has (academic year, or a manually chosen fee plan).
 */
export async function previewStudentFinancePlan(
  studentId: number | string,
  body: StudentFinancePlanPreviewBody = {},
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(endpoints.admin.studentFinancePlanPreview(studentId), body);
}

/** Creates the financial agreement by assigning the previewed plan. */
export async function assignStudentFinancePlan(
  studentId: number | string,
  body: StudentFinanceAssignPlanBody,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(endpoints.admin.studentFinanceAssignPlan(studentId), body);
}

/** Builds the minimal assign-plan body for this phase (no discounts/customization). */
export function buildAssignPlanBody(input: {
  feePlanId: number;
  academicYearId?: number | null;
}): StudentFinanceAssignPlanBody {
  const body: StudentFinanceAssignPlanBody = {
    fee_plan_id: input.feePlanId,
    activation_mode: 'draft',
    customize_plan: false,
    discounts: [],
    selected_optional_line_ids: [],
  };
  if (input.academicYearId != null && Number.isFinite(input.academicYearId)) {
    body.academic_year_id = input.academicYearId;
  }
  return body;
}
