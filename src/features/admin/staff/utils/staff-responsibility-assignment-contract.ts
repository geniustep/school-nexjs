import type {
  StaffResponsibilityAssignment,
  StaffResponsibilityAssignmentScopeType,
  StaffResponsibilityAssignmentWritePayload,
  StaffResponsibilityAssignmentYearPolicy,
} from '@/features/admin/staff/api/staff-responsibility-assignments-api';

export type StaffResponsibilityFormState = {
  scopeType: StaffResponsibilityAssignmentScopeType;
  cycleIds: number[];
  levelIds: number[];
  classIds: number[];
  capabilityCodes: string[];
  yearPolicy: StaffResponsibilityAssignmentYearPolicy;
  academicYearId: number | null;
  effectiveFrom: string;
  effectiveTo: string;
};

export type StaffResponsibilityFormValidationCode =
  | 'capability_required'
  | 'scope_target_required'
  | 'academic_year_required'
  | 'effective_period_invalid';

export function emptyStaffResponsibilityForm(): StaffResponsibilityFormState {
  return {
    scopeType: 'school',
    cycleIds: [],
    levelIds: [],
    classIds: [],
    capabilityCodes: [],
    yearPolicy: 'follows_request_context',
    academicYearId: null,
    effectiveFrom: '',
    effectiveTo: '',
  };
}

export function staffResponsibilityFormFromAssignment(
  item: StaffResponsibilityAssignment,
): StaffResponsibilityFormState {
  return {
    scopeType: item.scope_type,
    cycleIds: [...(item.cycle_ids ?? [])],
    levelIds: [...(item.level_ids ?? [])],
    classIds: [...(item.class_ids ?? [])],
    capabilityCodes: [...(item.capability_codes ?? [])],
    yearPolicy: item.year_policy,
    academicYearId: item.academic_year_id,
    effectiveFrom: item.effective_from ?? '',
    effectiveTo: item.effective_to ?? '',
  };
}

export function validateStaffResponsibilityForm(
  form: StaffResponsibilityFormState,
): StaffResponsibilityFormValidationCode | null {
  if (!form.capabilityCodes.length) return 'capability_required';
  if (
    (form.scopeType === 'cycle' && !form.cycleIds.length) ||
    (form.scopeType === 'levels' && !form.levelIds.length) ||
    (form.scopeType === 'classes' && !form.classIds.length)
  ) {
    return 'scope_target_required';
  }
  if (form.yearPolicy === 'bound' && !form.academicYearId) {
    return 'academic_year_required';
  }
  if (form.effectiveFrom && form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
    return 'effective_period_invalid';
  }
  return null;
}

/**
 * Construct only the backend writable contract. All non-selected scope arrays are
 * explicitly emptied so PATCH cannot accidentally preserve a previous scope shape.
 */
export function buildStaffResponsibilityWritePayload(
  form: StaffResponsibilityFormState,
): StaffResponsibilityAssignmentWritePayload {
  return {
    scope_type: form.scopeType,
    cycle_ids: form.scopeType === 'cycle' ? [...form.cycleIds] : [],
    level_ids: form.scopeType === 'levels' ? [...form.levelIds] : [],
    class_ids: form.scopeType === 'classes' ? [...form.classIds] : [],
    capability_codes: [...form.capabilityCodes],
    year_policy: form.yearPolicy,
    academic_year_id: form.yearPolicy === 'bound' ? form.academicYearId : null,
    effective_from: form.effectiveFrom || null,
    effective_to: form.effectiveTo || null,
  };
}

export function toggleStaffResponsibilityNumber(values: number[], value: number): number[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function toggleStaffResponsibilityString(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export type StaffResponsibilityErrorKind =
  | 'legacy_read_only'
  | 'outside_school'
  | 'scope_required'
  | 'capability_required'
  | 'year_required'
  | 'year_conflict'
  | 'period_invalid'
  | 'already_ended'
  | 'not_found'
  | 'forbidden'
  | 'generic';

export function classifyStaffResponsibilityError(code: string | undefined): StaffResponsibilityErrorKind {
  switch (code) {
    case 'responsibility_assignment_legacy_read_only':
      return 'legacy_read_only';
    case 'responsibility_assignment_outside_school':
    case 'school_out_of_scope':
      return 'outside_school';
    case 'responsibility_assignment_scope_required':
    case 'responsibility_assignment_scope_conflict':
      return 'scope_required';
    case 'responsibility_assignment_capability_required':
    case 'capability_not_grantable':
      return 'capability_required';
    case 'responsibility_assignment_year_required':
      return 'year_required';
    case 'responsibility_assignment_year_conflict':
      return 'year_conflict';
    case 'responsibility_assignment_effective_period_invalid':
      return 'period_invalid';
    case 'responsibility_assignment_already_ended':
      return 'already_ended';
    case 'responsibility_assignment_not_found':
    case 'not_found':
      return 'not_found';
    case 'forbidden':
    case 'privilege_escalation':
      return 'forbidden';
    default:
      return 'generic';
  }
}
