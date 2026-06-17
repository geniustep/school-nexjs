import type { FeePlan } from '@/types/finance';

export type FeePlanEligibilityTabStatus = 'eligible' | 'already_assigned' | 'ineligible';

export type FeePlanEligibilityStatus =
  | 'eligible'
  | 'already_assigned'
  | 'level_out_of_scope'
  | 'no_active_enrollment'
  | 'wrong_academic_year'
  | 'billing_review_required'
  | string;

export interface FeePlanEligibleStudentLevel {
  id: number;
  code?: string;
  name?: string;
  display_alias?: string;
}

export interface FeePlanEligibleStudentClass {
  id: number;
  code?: string;
  name?: string;
  display_name?: string;
  level?: FeePlanEligibleStudentLevel | null;
}

export interface FeePlanEligibleStudent {
  id: number;
  name: string;
  registration_number?: string | null;
  academic_year_id?: number | null;
  level?: FeePlanEligibleStudentLevel | null;
  class?: FeePlanEligibleStudentClass | null;
  enrollment_status?: string | null;
  eligibility_status: FeePlanEligibilityStatus;
  eligibility_reason?: string | null;
  selectable: boolean;
  already_assigned: boolean;
  billing_ready: boolean;
  billing_will_be_created_automatically: boolean;
}

export interface FeePlanEligibilitySummary {
  eligible_count: number;
  already_assigned_count: number;
  ineligible_count: number;
}

export interface FeePlanEligibilityPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface FeePlanEligibleStudentsResponse {
  plan?: Partial<FeePlan> | null;
  summary: FeePlanEligibilitySummary;
  students: FeePlanEligibleStudent[];
  pagination: FeePlanEligibilityPagination;
}

export interface FeePlanEligibleStudentsQuery {
  eligibility_status?: FeePlanEligibilityTabStatus | 'all';
  search?: string;
  level_id?: number | string;
  class_id?: number | string;
  page?: number;
  page_size?: number;
}
