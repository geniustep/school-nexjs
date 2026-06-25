import type { BillingAccountStudentRow } from '@/types/finance-billing-account';

export type CollectionNewParams = {
  studentId: string;
  billingPartnerId: string;
  academicYearId: string;
  returnTo: string | null;
};

/**
 * Reads the navigation params used by the "record collection" page from a
 * URLSearchParams-like object. Accepts both snake_case (used by finance deep
 * links) and camelCase aliases so existing entry points keep working.
 */
export function readCollectionNewParams(
  params: Pick<URLSearchParams, 'get'>,
): CollectionNewParams {
  return {
    studentId: params.get('studentId') ?? params.get('student_id') ?? '',
    billingPartnerId:
      params.get('billing_partner_id') ?? params.get('billingPartnerId') ?? '',
    academicYearId:
      params.get('academic_year_id') ?? params.get('academicYearId') ?? '',
    returnTo: params.get('returnTo'),
  };
}

/**
 * The family/account student selector only applies when we arrive with a
 * billing account context but without a pre-locked student. When a student is
 * already provided (e.g. coming from a student file) the legacy flow stays.
 */
export function shouldUseBillingAccountStudentSelector(
  params: Pick<CollectionNewParams, 'billingPartnerId' | 'studentId'>,
): boolean {
  return !!params.billingPartnerId && !params.studentId;
}

export type BillingCollectionStudentSelection = {
  students: BillingAccountStudentRow[];
  autoSelectedStudentId: number | null;
  requiresChoice: boolean;
  isEmpty: boolean;
};

/**
 * Decides how the student picker should behave for a family/billing account:
 * - 0 students  → empty state, nothing selected.
 * - 1 student   → auto-selected, no choice required.
 * - 2+ students → user must choose, nothing selected by default.
 */
export function resolveBillingCollectionStudentSelection(
  students: BillingAccountStudentRow[] | null | undefined,
): BillingCollectionStudentSelection {
  const validStudents = (students ?? []).filter(
    (s): s is BillingAccountStudentRow => typeof s?.student_id === 'number',
  );
  if (validStudents.length === 0) {
    return {
      students: validStudents,
      autoSelectedStudentId: null,
      requiresChoice: false,
      isEmpty: true,
    };
  }
  if (validStudents.length === 1) {
    return {
      students: validStudents,
      autoSelectedStudentId: validStudents[0].student_id,
      requiresChoice: false,
      isEmpty: false,
    };
  }
  return {
    students: validStudents,
    autoSelectedStudentId: null,
    requiresChoice: true,
    isEmpty: false,
  };
}

/**
 * Resolves which student is effectively active given the auto-selection rule
 * and an optional manual choice. A manual choice only wins when it points to a
 * student that actually belongs to this account, so other families' students
 * can never be treated as selected by default.
 */
export function resolveEffectiveSelectedStudentId(
  selection: BillingCollectionStudentSelection,
  manualSelectedId: number | null,
): number | null {
  if (
    manualSelectedId != null &&
    selection.students.some((s) => s.student_id === manualSelectedId)
  ) {
    return manualSelectedId;
  }
  return selection.autoSelectedStudentId;
}
