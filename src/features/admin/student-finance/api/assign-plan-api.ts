'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';
import type { StudentCreateFinanceFormState } from '@/types/student-enrollment-finance';
import type {
  StudentFinanceAssignPlanBody,
  StudentFinancePlanPreviewBody,
} from '@/types/student-finance-assign-plan';
import { buildStudentCreateFinancePayload } from '@/features/admin/students/utils/enrollment-finance-payload';

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

/** Builds the assign-plan body from preview context and optional customization. */
export function buildAssignPlanBody(input: {
  feePlanId: number;
  academicYearId?: number | null;
  financeState?: StudentCreateFinanceFormState | null;
  suggestPeriods?: Array<{ period_key: string; selected?: boolean }>;
}): StudentFinanceAssignPlanBody {
  const customizePlan = input.financeState?.customizePlan === true;
  const body: StudentFinanceAssignPlanBody = {
    fee_plan_id: input.feePlanId,
    activation_mode: 'draft',
    customize_plan: customizePlan,
    discounts: [],
    selected_optional_line_ids: [],
  };

  if (input.academicYearId != null && Number.isFinite(input.academicYearId)) {
    body.academic_year_id = input.academicYearId;
  }

  if (customizePlan && input.financeState && input.suggestPeriods) {
    const customized = buildStudentCreateFinancePayload(
      input.feePlanId,
      input.suggestPeriods,
      input.financeState,
    );
    if (customized.customization_reason) body.customization_reason = customized.customization_reason;
    if (customized.customization_notes) body.customization_notes = customized.customization_notes;
    if (customized.periods) body.periods = customized.periods;
    if (customized.discounts) body.discounts = customized.discounts;
    if (customized.one_time_lines) body.one_time_lines = customized.one_time_lines;
  }

  return body;
}
